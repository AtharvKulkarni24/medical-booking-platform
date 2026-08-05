const cron = require("node-cron");
const pool = require("../config/db");
const { executeLabTransfer } = require("./razorpayService");

/**
 * Process midnight payouts for all eligible completed or passed appointments.
 */
async function processMidnightPayouts() {
  console.log("⏰ [MIDNIGHT PAYOUT ENGINE] Starting daily batch payout processing...");
  const client = await pool.connect();

  try {
    // 1. Fetch all pending payments where the appointment is COMPLETED or past slot end time
    const query = `
      SELECT 
        p.payment_id,
        p.appointment_id,
        p.amount,
        p.gateway_payment_id,
        p.gateway_order_id,
        p.platform_fee,
        p.lab_payout_amount,
        l.lab_id,
        l.name AS lab_name,
        l.razorpay_account_id,
        l.razorpay_account_status,
        l.platform_commission_percentage
      FROM payments p
      JOIN appointments a ON p.appointment_id = a.appointment_id
      JOIN labs l ON a.lab_id = l.lab_id
      LEFT JOIN time_slots ts ON a.slot_id = ts.slot_id
      WHERE p.payout_status = 'PENDING'
        AND p.status = 'Success'
        AND (
          a.status = 'COMPLETED'
          OR (
            a.status = 'CONFIRMED'
            AND (a.appointment_date + COALESCE(ts.end_time, '23:59:59'::time)) < CURRENT_TIMESTAMP
          )
        );
    `;

    const pendingPayouts = await client.query(query);
    console.log(`📋 Found ${pendingPayouts.rowCount} eligible payments pending payout.`);

    let successCount = 0;
    let failureCount = 0;

    for (const row of pendingPayouts.rows) {
      const {
        payment_id,
        appointment_id,
        amount,
        gateway_payment_id,
        gateway_order_id,
        lab_id,
        lab_name,
        razorpay_account_id,
        razorpay_account_status,
        platform_commission_percentage,
      } = row;

      const targetPaymentId = gateway_payment_id || gateway_order_id;
      const targetAccountId = razorpay_account_id || `acc_mock_lab_${lab_id}`;
      const commissionPercent = parseFloat(platform_commission_percentage || 10.0);

      // Verify lab account eligibility in production
      if (process.env.NODE_ENV === "production" && (!razorpay_account_id || razorpay_account_status !== "ACTIVATED")) {
        console.warn(`⚠️ Lab "${lab_name}" (ID: ${lab_id}) does not have an active Razorpay account. Holding payout.`);
        await client.query(
          `UPDATE payments SET payout_status = 'HELD', payout_error = 'Lab Razorpay account is not activated' WHERE payment_id = $1`,
          [payment_id]
        );
        failureCount++;
        continue;
      }

      console.log(`💸 Processing payout of ₹${row.lab_payout_amount} for appointment ${appointment_id} to Lab ${lab_name}...`);

      const transferResult = await executeLabTransfer({
        paymentId: targetPaymentId,
        labAccountId: targetAccountId,
        amount: parseFloat(amount),
        commissionPercentage: commissionPercent,
      });

      if (transferResult.success) {
        await client.query(
          `UPDATE payments 
           SET payout_status = 'COMPLETED', 
               razorpay_transfer_id = $1, 
               payout_date = NOW(),
               payout_error = NULL
           WHERE payment_id = $2`,
          [transferResult.transfer_id, payment_id]
        );
        // Automatically mark appointment COMPLETED if it was CONFIRMED and slot passed
        await client.query(
          `UPDATE appointments SET status = 'COMPLETED' WHERE appointment_id = $1 AND status = 'CONFIRMED'`,
          [appointment_id]
        );
        successCount++;
        console.log(`✅ Payout completed successfully for appointment ${appointment_id}. Transfer ID: ${transferResult.transfer_id}`);
      } else {
        await client.query(
          `UPDATE payments 
           SET payout_status = 'FAILED', 
               payout_error = $1
           WHERE payment_id = $2`,
          [transferResult.error || "Transfer failed", payment_id]
        );
        failureCount++;
        console.error(`❌ Payout failed for appointment ${appointment_id}: ${transferResult.error}`);
      }
    }

    console.log(`🏁 [MIDNIGHT PAYOUT ENGINE] Batch processing complete. Success: ${successCount}, Failures/Held: ${failureCount}`);
    return { success: true, processed: pendingPayouts.rowCount, successCount, failureCount };
  } catch (error) {
    console.error("🔴 [MIDNIGHT PAYOUT ENGINE] Error during batch payout processing:", error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

/**
 * Initialize Midnight Cron Job (Runs every night at 00:00)
 */
function initPayoutCron() {
  console.log("⏰ Midnight Payout Cron Scheduler initialized (Schedule: 0 0 * * *).");

  // Cron schedule: 0 0 * * * -> Midnight daily
  cron.schedule("0 0 * * *", async () => {
    console.log("🌙 Midnight cron triggered automatically.");
    await processMidnightPayouts();
  });
}

module.exports = {
  initPayoutCron,
  processMidnightPayoutsManually: processMidnightPayouts,
};
