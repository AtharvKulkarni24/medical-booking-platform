const db = require("../config/db");
const crypto = require("crypto");
const {
  createSplitOrder,
  executePostPaymentTransfer,
  fetchCheckoutPayment,
  processRefund,
} = require("../services/razorpayService");

const isValidRazorpaySignature = (orderId, paymentId, signature) => {
  const secret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
  if (!secret || typeof signature !== "string" || !/^[a-f\d]{64}$/i.test(signature)) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest();
  const received = Buffer.from(signature, "hex");
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
};

// ==========================================
// STEP 1: CREATE PAYMENT ORDER
// ==========================================
exports.createAppointmentOrder = async (req, res) => {
  try {
    const { lab_id, test_id, slot_id, appointment_date } = req.body;

    if (!appointment_date) {
      return res.status(400).json({ success: false, error: "Appointment date is required." });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 7); 
    const requestedDateObj = new Date(appointment_date);
    requestedDateObj.setHours(0, 0, 0, 0); 

    if (requestedDateObj < today) {
      return res.status(400).json({ success: false, error: "Cannot book appointments in the past." });
    }
    if (requestedDateObj > maxDate) {
      return res.status(400).json({ success: false, error: "Appointments can only be booked up to 7 days in advance." });
    }

    // UPDATED: Now we also fetch day_of_week to enforce strictly matching schedules
    const capacityCheck = await db.query(
      `SELECT
         s.day_of_week,
         s.start_time,
         s.max_capacity,
         (SELECT COUNT(*)
          FROM appointments a
          JOIN lab_test_slots booked ON booked.lab_test_slot_id = a.lab_test_slot_id
          WHERE booked.slot_id = s.slot_id
            AND a.appointment_date = $4
            AND a.status = 'CONFIRMED') AS current_booked
       FROM lab_test_slots selected
       JOIN time_slots s ON s.slot_id = selected.slot_id AND s.lab_id = selected.lab_id
       WHERE selected.lab_id = $1 AND selected.test_id = $2 AND selected.slot_id = $3`,
      [lab_id, test_id, slot_id, appointment_date],
    );

    if (capacityCheck.rowCount === 0) {
      return res.status(404).json({ success: false, error: "Time slot not found." });
    }

    const slot = capacityCheck.rows[0];
    const maxCap = parseInt(slot.max_capacity);
    const currentBooked = parseInt(slot.current_booked);

    // ==========================================
    // NEW: DAY OF WEEK VALIDATION (The Loophole Fix)
    // ==========================================
    const requestedDayOfWeek = requestedDateObj.getDay();
    if (slot.day_of_week !== requestedDayOfWeek) {
        return res.status(400).json({ 
            success: false, 
            error: "The selected date does not match the day of the week for this specific time slot." 
        });
    }

    if (currentBooked >= maxCap) {
      return res.status(400).json({ success: false, error: "This time slot is fully booked for the selected date." });
    }

    const isToday = requestedDateObj.getTime() === today.getTime();
    if (isToday) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const [slotHour, slotMinute] = slot.start_time.split(":").map(Number);

      if (currentHour > slotHour || (currentHour === slotHour && currentMinute >= slotMinute)) {
        return res.status(400).json({ success: false, error: "This time slot has already started or passed." });
      }
    }

    const testCheck = await db.query(
      `SELECT t.price
       FROM lab_test_slots lts
       JOIN tests t ON t.test_id = lts.test_id AND t.lab_id = lts.lab_id
       WHERE lts.test_id = $1 AND lts.lab_id = $2 AND lts.slot_id = $3`,
      [test_id, lab_id, slot_id],
    );

    if (testCheck.rowCount === 0) {
      return res.status(404).json({ success: false, error: "Test not found in this lab." });
    }

    // Fetch Lab's Razorpay Account status & commission rate
    const labCheck = await db.query(
      `SELECT razorpay_account_id, razorpay_account_status, platform_commission_percentage FROM labs WHERE lab_id = $1`,
      [lab_id]
    );

    const labInfo = labCheck.rows[0] || {};
    const labAccountId = labInfo.razorpay_account_id;
    const commissionPercent = parseFloat(labInfo.platform_commission_percentage || 10.0);

    // If lab hasn't linked account yet
    if (!labAccountId || labInfo.razorpay_account_status !== 'ACTIVATED') {
      if (process.env.NODE_ENV === "production") {
        return res.status(400).json({
          success: false,
          error: "This diagnostic center has not activated payouts yet. Booking is currently unavailable.",
        });
      }
    }

    const testPrice = parseFloat(testCheck.rows[0].price);

    const splitResult = await createSplitOrder({
      amount: testPrice,
      labAccountId: labAccountId || `acc_mock_lab_${lab_id}`,
      commissionPercentage: commissionPercent,
    });

    const savedOrder = await db.query(
      `INSERT INTO appointment_payment_orders
        (razorpay_order_id, patient_id, lab_test_slot_id, appointment_date, amount,
         currency, platform_fee, lab_payout_amount, is_mock)
       SELECT $1, $2, lts.lab_test_slot_id, $3, $4, $5, $6, $7, $8
       FROM lab_test_slots lts
       WHERE lts.lab_id = $9 AND lts.test_id = $10 AND lts.slot_id = $11`,
      [
        splitResult.order.id,
        req.user.id,
        appointment_date,
        testPrice,
        splitResult.order.currency || "INR",
        splitResult.platformFee,
        splitResult.labPayout,
        splitResult.is_mock === true,
        lab_id,
        test_id,
        slot_id,
      ],
    );
    if (savedOrder.rowCount !== 1) {
      throw new Error("The booking order could not be associated with the selected slot.");
    }

    const keyId = (process.env.RAZORPAY_KEY_ID || "").trim();

    res.status(200).json({
      success: true,
      order: {
        id: splitResult.order.id,
        amount: splitResult.order.amount,
        currency: splitResult.order.currency || "INR",
        key_id: keyId,
        platform_fee: splitResult.platformFee,
        lab_payout: splitResult.labPayout,
        is_mock: splitResult.is_mock === true,
      },
    });
  } catch (error) {
    console.error("Create Order Error:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message || "Failed to initialize payment." 
    });
  }
};

// ==========================================
// STEP 2: VERIFY PAYMENT & SAVE APPOINTMENT
// ==========================================
const attemptCapacityRefund = async ({ orderId, paymentId, amount }) => {
  try {
    const refund = await processRefund({
      paymentId,
      amount,
      idempotencyKey: orderId,
    });
    const refundStatus = refund.status === "processed" ? "PROCESSED" : "PENDING";
    await db.query(
      `UPDATE appointment_payment_orders
       SET refund_id = $2, refund_status = $3, refund_error = NULL,
           updated_at = NOW()
       WHERE razorpay_order_id = $1`,
      [orderId, refund.refund_id, refundStatus],
    );
    return { status: refundStatus, refund_id: refund.refund_id };
  } catch (error) {
    console.error("Capacity-conflict refund failed:", error);
    await db.query(
      `UPDATE appointment_payment_orders
       SET refund_status = 'FAILED', refund_error = $2, updated_at = NOW()
       WHERE razorpay_order_id = $1`,
      [orderId, error.message || "Refund request failed"],
    );
    return { status: "FAILED" };
  }
};

exports.verifyAndBookAppointment = async (req, res) => {
  let client;
  let transactionStarted = false;
  try {
    const patientId = req.user.id;
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ success: false, error: "Payment verification details are required." });
    }

    const orderResult = await db.query(
      `SELECT razorpay_order_id, patient_id, lab_test_slot_id,
              appointment_date::text AS appointment_date, amount, currency,
              platform_fee, lab_payout_amount, is_mock, status,
              razorpay_payment_id, appointment_id, refund_id, refund_status,
              refund_error, created_at, updated_at
       FROM appointment_payment_orders
       WHERE razorpay_order_id = $1 AND patient_id = $2`,
      [orderId, patientId],
    );
    if (orderResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: "Booking order not found." });
    }

    const order = orderResult.rows[0];
    if (order.status === "BOOKED") {
      if (order.razorpay_payment_id !== paymentId) {
        return res.status(409).json({ success: false, error: "This order was finalized with a different payment." });
      }
      return res.status(200).json({
        success: true,
        message: "Payment verified and appointment booked successfully!",
        appointment: {
          appointment_id: order.appointment_id,
          status: "CONFIRMED",
        },
      });
    }

    const isMockOrder = order.is_mock === true;
    if (isMockOrder) {
      if (process.env.NODE_ENV === "production" || !/^(pay_mock_|pay_sim_)/.test(paymentId)) {
        return res.status(400).json({ success: false, error: "Invalid mock payment." });
      }
    } else if (!isValidRazorpaySignature(orderId, paymentId, signature)) {
      return res.status(400).json({ success: false, error: "Invalid payment signature." });
    }

    if (!isMockOrder) {
      let paymentDetails;
      try {
        paymentDetails = await fetchCheckoutPayment({ orderId, paymentId });
      } catch (error) {
        console.error("Razorpay payment verification request failed:", error);
        return res.status(502).json({ success: false, error: "Could not verify payment with Razorpay. Retry shortly." });
      }

      const expectedAmount = Math.round(Number(order.amount) * 100);
      if (
        paymentDetails.order.id !== orderId ||
        paymentDetails.order.amount !== expectedAmount ||
        paymentDetails.order.currency !== order.currency ||
        paymentDetails.payment.order_id !== orderId ||
        paymentDetails.payment.amount !== expectedAmount ||
        paymentDetails.payment.currency !== order.currency
      ) {
        return res.status(400).json({ success: false, error: "Razorpay payment does not match this booking order." });
      }
      if (paymentDetails.order.status !== "paid" || paymentDetails.payment.status !== "captured") {
        return res.status(409).json({ success: false, error: "Payment is not captured yet. Retry verification after capture." });
      }
    }

    client = await db.connect();
    await client.query("BEGIN");
    transactionStarted = true;

    const lockedOrderResult = await client.query(
      `SELECT razorpay_order_id, patient_id, lab_test_slot_id,
              appointment_date::text AS appointment_date, amount, currency,
              platform_fee, lab_payout_amount, is_mock, status,
              razorpay_payment_id, appointment_id, refund_id, refund_status,
              refund_error, created_at, updated_at
       FROM appointment_payment_orders
       WHERE razorpay_order_id = $1 AND patient_id = $2
       FOR UPDATE`,
      [orderId, patientId],
    );
    if (lockedOrderResult.rowCount === 0) {
      throw new Error("Booking order disappeared during finalization.");
    }
    const lockedOrder = lockedOrderResult.rows[0];

    if (lockedOrder.status === "BOOKED") {
      if (lockedOrder.razorpay_payment_id !== paymentId) {
        await client.query("ROLLBACK");
        transactionStarted = false;
        return res.status(409).json({ success: false, error: "This order was finalized with a different payment." });
      }
      await client.query("COMMIT");
      transactionStarted = false;
      return res.status(200).json({
        success: true,
        message: "Payment verified and appointment booked successfully!",
        appointment: { appointment_id: lockedOrder.appointment_id, status: "CONFIRMED" },
      });
    }

    if (lockedOrder.razorpay_payment_id && lockedOrder.razorpay_payment_id !== paymentId) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return res.status(409).json({ success: false, error: "This order is already associated with a different payment." });
    }

    if (lockedOrder.status === "REFUND_REQUIRED") {
      if (lockedOrder.refund_status === "PROCESSED") {
        await client.query("COMMIT");
        transactionStarted = false;
        return res.status(409).json({
          success: false,
          error: "The slot could not be booked and the payment has been refunded.",
          refund: { status: "PROCESSED", refund_id: lockedOrder.refund_id },
        });
      }
      if (
        lockedOrder.refund_status === "PROCESSING" &&
        new Date(lockedOrder.updated_at).getTime() > Date.now() - 2 * 60 * 1000
      ) {
        await client.query("COMMIT");
        transactionStarted = false;
        return res.status(202).json({
          success: false,
          error: "The booking could not be completed; refund processing is underway.",
          refund: { status: "PROCESSING" },
        });
      }
      await client.query(
        `UPDATE appointment_payment_orders
         SET refund_status = 'PROCESSING', updated_at = NOW()
         WHERE razorpay_order_id = $1`,
        [orderId],
      );
      await client.query("COMMIT");
      transactionStarted = false;
      const refund = await attemptCapacityRefund({
        orderId,
        paymentId,
        amount: Number(lockedOrder.amount),
      });
      return res.status(refund.status === "FAILED" ? 502 : 409).json({
        success: false,
        error: refund.status === "FAILED"
          ? "The slot could not be booked and the refund failed. Support must review this payment."
          : refund.status === "PENDING"
            ? "The slot could not be booked; the refund is pending with Razorpay."
            : "The slot could not be booked and the payment has been refunded.",
        refund,
      });
    }

    const slotResult = await client.query(
      `SELECT s.slot_id, s.day_of_week, s.start_time::text AS start_time, s.max_capacity,
              lts.lab_test_slot_id, CURRENT_DATE::text AS today, LOCALTIME::text AS current_time
       FROM lab_test_slots lts
       JOIN time_slots s ON s.slot_id = lts.slot_id AND s.lab_id = lts.lab_id
       WHERE lts.lab_test_slot_id = $1
       FOR UPDATE OF s`,
      [lockedOrder.lab_test_slot_id],
    );
    const slot = slotResult.rows[0];
    const dayIsValid = slot &&
      new Date(`${lockedOrder.appointment_date}T00:00:00Z`).getUTCDay() === slot.day_of_week;
    const dateHasPassed = slot && lockedOrder.appointment_date < slot.today;
    const timeHasPassed = slot &&
      lockedOrder.appointment_date === slot.today &&
      slot.current_time >= slot.start_time;
    const bookedResult = slot
      ? await client.query(
          `SELECT COUNT(*)::int AS booked
           FROM appointments a
           JOIN lab_test_slots booked_slot ON booked_slot.lab_test_slot_id = a.lab_test_slot_id
           WHERE booked_slot.slot_id = $1
             AND a.appointment_date = $2
             AND a.status = 'CONFIRMED'`,
          [slot.slot_id, lockedOrder.appointment_date],
        )
      : { rows: [{ booked: 0 }] };
    const slotFull = slot && bookedResult.rows[0].booked >= slot.max_capacity;

    if (!slot || !dayIsValid || dateHasPassed || timeHasPassed || slotFull) {
      await client.query(
        `UPDATE appointment_payment_orders
         SET status = 'REFUND_REQUIRED', razorpay_payment_id = $2,
             refund_status = 'PROCESSING', refund_error = NULL, updated_at = NOW()
         WHERE razorpay_order_id = $1`,
        [orderId, paymentId],
      );
      await client.query("COMMIT");
      transactionStarted = false;
      const refund = await attemptCapacityRefund({
        orderId,
        paymentId,
        amount: Number(lockedOrder.amount),
      });
      return res.status(refund.status === "FAILED" ? 502 : 409).json({
        success: false,
        error: refund.status === "FAILED"
          ? "Payment succeeded but the booking could not be completed and the refund failed. Support must review this payment."
          : refund.status === "PENDING"
            ? "Payment succeeded but the booking could not be completed; the refund is pending with Razorpay."
            : "Payment succeeded but the slot is no longer bookable. The payment has been refunded.",
        refund,
      });
    }

    const appointmentResult = await client.query(
      `INSERT INTO appointments (patient_id, lab_test_slot_id, appointment_date, status)
       VALUES ($1, $2, $3, 'CONFIRMED')
       RETURNING appointment_id, status, created_at`,
      [patientId, lockedOrder.lab_test_slot_id, lockedOrder.appointment_date],
    );
    const appointment = appointmentResult.rows[0];

    await client.query(
      `INSERT INTO payments
        (appointment_id, amount, gateway_provider, gateway_order_id, gateway_payment_id,
         platform_fee, lab_payout_amount, status, payout_status, transaction_date)
       VALUES ($1, $2, 'Razorpay', $3, $4, $5, $6, 'Success', 'PENDING', NOW())`,
      [
        appointment.appointment_id,
        lockedOrder.amount,
        orderId,
        paymentId,
        lockedOrder.platform_fee,
        lockedOrder.lab_payout_amount,
      ],
    );
    await client.query(
      `UPDATE appointment_payment_orders
       SET status = 'BOOKED', razorpay_payment_id = $2, appointment_id = $3,
           updated_at = NOW()
       WHERE razorpay_order_id = $1`,
      [orderId, paymentId, appointment.appointment_id],
    );

    await client.query("COMMIT");
    transactionStarted = false;
    return res.status(201).json({
      success: true,
      message: "Payment verified and appointment booked successfully!",
      appointment,
    });
  } catch (error) {
    if (transactionStarted && client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Booking transaction rollback failed:", rollbackError);
      }
      transactionStarted = false;
    }
    console.error("Verification/Booking Error:", error);
    return res.status(500).json({ success: false, error: "Server error during booking finalization." });
  } finally {
    if (client) client.release();
  }
};

// ==========================================
// GET ALL APPOINTMENTS FOR A PATIENT
// ==========================================
exports.getPatientAppointments = async (req, res) => {
  try {
    const patientId = req.user.id;

    const result = await db.query(
      `SELECT 
         a.appointment_id, 
         TO_CHAR(a.appointment_date, 'YYYY-MM-DD') AS appointment_date, -- FIX: Force pure string
         a.status, 
         a.report_url,
         pay.gateway_payment_id AS payment_id,
         l.name AS lab_name, 
         l.address_text,
         t.test_name, 
         t.price,
         s.start_time, 
         s.end_time
       FROM appointments a
       JOIN lab_test_slots lts ON a.lab_test_slot_id = lts.lab_test_slot_id
       JOIN labs l ON lts.lab_id = l.lab_id
       JOIN tests t ON lts.test_id = t.test_id
       JOIN time_slots s ON lts.slot_id = s.slot_id
       LEFT JOIN payments pay ON a.appointment_id = pay.appointment_id
       WHERE a.patient_id = $1
       ORDER BY a.appointment_date DESC, s.start_time DESC`,
      [patientId]
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = [];
    const past = [];

    result.rows.forEach((app) => {
      const appDate = new Date(app.appointment_date);
      if (appDate >= today && app.status !== "CANCELLED") {
        upcoming.push(app);
      } else {
        past.push(app);
      }
    });

    res.status(200).json({
      success: true,
      total: result.rows.length,
      upcoming,
      past,
    });
  } catch (error) {
    console.error("Fetch Appointments Error:", error);
    res.status(500).json({ success: false, error: "Server error while fetching appointments." });
  }
};

// ==========================================
// CANCEL AN APPOINTMENT
// ==========================================
exports.cancelAppointment = async (req, res) => {
  try {
    const patientId = req.user.id;
    const { id } = req.params; // The appointment ID

    // 1. Find the appointment and ensure it belongs to this patient
    const appCheck = await db.query(
      `SELECT appointment_date, status FROM appointments 
       WHERE appointment_id = $1 AND patient_id = $2`,
      [id, patientId],
    );

    if (appCheck.rowCount === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Appointment not found." });
    }

    const appointment = appCheck.rows[0];

    // 2. Business Logic Validation
    if (appointment.status === "CANCELLED") {
      return res
        .status(400)
        .json({
          success: false,
          error: "This appointment is already cancelled.",
        });
    }

    const appDate = new Date(appointment.appointment_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (appDate < today) {
      return res
        .status(400)
        .json({
          success: false,
          error: "You cannot cancel a past appointment.",
        });
    }

    // 3. Find payment details for refund execution
    const payCheck = await db.query(
      `SELECT payment_id, amount, gateway_payment_id, gateway_order_id, razorpay_transfer_id 
       FROM payments 
       WHERE appointment_id = $1`,
      [id]
    );

    let refundDetails = null;

    if (payCheck.rowCount > 0) {
      const pay = payCheck.rows[0];
      const targetPaymentId = pay.gateway_payment_id || pay.gateway_order_id;

      if (targetPaymentId) {
        try {
          refundDetails = await processRefund({
            paymentId: targetPaymentId,
            amount: parseFloat(pay.amount),
          });
        } catch (refundErr) {
          console.error("⚠️ Failed to process Razorpay refund:", refundErr);
        }
      }

      // Update payments table with refund details
      await db.query(
        `UPDATE payments 
         SET 
           status = 'Refunded',
           refund_id = $1,
           refund_status = 'PROCESSED',
           refund_amount = $2,
           payout_status = 'CANCELLED_REFUNDED'
         WHERE appointment_id = $3`,
        [refundDetails?.refund_id || `rfnd_sys_${Date.now()}`, pay.amount, id]
      );
    }

    // 4. Update appointment status
    await db.query(
      `UPDATE appointments SET status = 'CANCELLED' 
       WHERE appointment_id = $1`,
      [id],
    );

    res.status(200).json({
      success: true,
      message:
        "Appointment cancelled successfully. Refund has been initiated back to your payment source.",
      refund: refundDetails,
    });
  } catch (error) {
    console.error("Cancel Appointment Error:", error);
    res
      .status(500)
      .json({
        success: false,
        error: "Server error while cancelling appointment.",
      });
  }
};

// ==========================================
// GET DAILY ROSTER FOR LABS
// ==========================================
exports.getLabDailyRoster = async (req, res) => {
  try {
    const labId = req.user.id;
    const targetDate = req.query.date || new Date().toISOString().split("T")[0];

    // FIX: Added LEFT JOIN payments to get the payment ID properly
    const rosterResult = await db.query(
      `SELECT 
         a.appointment_id, 
         a.appointment_date, 
         a.status,
         pay.gateway_payment_id AS payment_id,
         p.name AS patient_name,
         p.phone_number AS patient_phone,
         p.email AS patient_email,
         t.test_name,
         s.start_time,
         s.end_time
       FROM appointments a
       JOIN lab_test_slots lts ON a.lab_test_slot_id = lts.lab_test_slot_id
       JOIN patients p ON a.patient_id = p.patient_id
       JOIN tests t ON lts.test_id = t.test_id
       JOIN time_slots s ON lts.slot_id = s.slot_id
       LEFT JOIN payments pay ON a.appointment_id = pay.appointment_id
       WHERE lts.lab_id = $1 AND a.appointment_date = $2
       ORDER BY s.start_time ASC`,
      [labId, targetDate],
    );

    res.status(200).json({
      success: true,
      date: targetDate,
      total_patients: rosterResult.rowCount,
      roster: rosterResult.rows,
    });
  } catch (error) {
    console.error("Lab Roster Error:", error);
    res.status(500).json({ success: false, error: "Server error while fetching the daily roster." });
  }
};
// ==========================================
// COMPLETE APPOINTMENT & ATTACH REPORT (LAB ONLY)
// ==========================================
exports.completeAppointment = async (req, res) => {
  try {
    const labId = req.user.id;
    const { id } = req.params; // The appointment ID
    const { report_url } = req.body;

    // 1. Verify the appointment belongs to this lab
    const appCheck = await db.query(
      `SELECT a.status
       FROM appointments a
       JOIN lab_test_slots lts ON lts.lab_test_slot_id = a.lab_test_slot_id
       WHERE a.appointment_id = $1 AND lts.lab_id = $2`,
      [id, labId],
    );

    if (appCheck.rowCount === 0) {
      return res
        .status(404)
        .json({
          success: false,
          error: "Appointment not found or unauthorized.",
        });
    }

    const currentStatus = appCheck.rows[0].status;

    // 2. Business Logic Validation
    if (currentStatus === "CANCELLED") {
      return res.status(400).json({
        success: false,
        error: "Cannot complete a cancelled appointment.",
      });
    }

    if (currentStatus === "COMPLETED" && !report_url) {
      return res.status(400).json({
        success: false,
        error: "This appointment is already marked as completed.",
      });
    }

    // 3. Update Status and Attach URL
    // We use COALESCE so if they want to update the URL later, it doesn't overwrite it with null if they forget to send it
    const updatedAppointment = await db.query(
      `UPDATE appointments 
       SET 
         status = 'COMPLETED',
         report_url = COALESCE($1, report_url)
       WHERE appointment_id = $2 
       RETURNING appointment_id, status, report_url`,
      [report_url || null, id],
    );

    res.status(200).json({
      success: true,
      message: "Appointment marked as completed successfully.",
      appointment: updatedAppointment.rows[0],
    });
  } catch (error) {
    console.error("Complete Appointment Error:", error);
    res
      .status(500)
      .json({
        success: false,
        error: "Server error while completing appointment.",
      });
  }
};

// ==========================================
// MANUAL MIDNIGHT PAYOUT TRIGGER
// ==========================================
exports.triggerManualPayout = async (req, res) => {
  try {
    const { processMidnightPayoutsManually } = require("../services/payoutCronService");
    const result = await processMidnightPayoutsManually();
    res.status(200).json({
      success: true,
      message: "Midnight payout batch execution completed.",
      summary: result,
    });
  } catch (error) {
    console.error("Manual Payout Trigger Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to execute manual payout.",
    });
  }
};
