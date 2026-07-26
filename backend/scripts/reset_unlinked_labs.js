require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const pool = require("../src/config/db");

async function resetUnlinkedLabs() {
  const client = await pool.connect();
  try {
    console.log("🔄 Resetting verification status for labs without linked Razorpay accounts...");

    const res = await client.query(`
      UPDATE labs
      SET is_verified = FALSE
      WHERE razorpay_account_id IS NULL 
         OR razorpay_account_status IS NULL 
         OR razorpay_account_status != 'ACTIVATED'
      RETURNING lab_id, name, email, is_verified;
    `);

    console.log(`✅ Successfully updated ${res.rowCount} existing lab(s) to is_verified = FALSE.`);
    if (res.rows.length > 0) {
      console.log("Updated Labs:", res.rows);
    }

    console.log("🟢 Done! All labs without active Razorpay linked accounts are now set to is_verified = FALSE.");
  } catch (error) {
    console.error("🔴 Error resetting lab verification status:", error?.message || error);
  } finally {
    client.release();
    await pool.end();
  }
}

resetUnlinkedLabs();
