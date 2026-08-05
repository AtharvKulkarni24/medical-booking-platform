require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const pool = require("../src/config/db");

async function applyMigrations() {
  const client = await pool.connect();
  try {
    console.log("🔄 Connecting to database and applying migrations...");

    // 1. Update labs table schema
    await client.query(`
      ALTER TABLE labs 
      ADD COLUMN IF NOT EXISTS razorpay_account_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS razorpay_account_status VARCHAR(50) DEFAULT 'NOT_LINKED',
      ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50),
      ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(20),
      ADD COLUMN IF NOT EXISTS bank_account_holder_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS business_entity_type VARCHAR(50) DEFAULT 'individual',
      ADD COLUMN IF NOT EXISTS platform_commission_percentage DECIMAL(5, 2) DEFAULT 10.00;
    `);
    console.log("✅ Updated 'labs' table with Razorpay Linked Account columns.");

    // 2. Update payments table schema
    await client.query(`
      ALTER TABLE payments 
      ADD COLUMN IF NOT EXISTS razorpay_transfer_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10, 2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS lab_payout_amount DECIMAL(10, 2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS refund_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS refund_status VARCHAR(50) DEFAULT 'NOT_REFUNDED',
      ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10, 2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS payout_status VARCHAR(50) DEFAULT 'PENDING',
      ADD COLUMN IF NOT EXISTS payout_date TIMESTAMP,
      ADD COLUMN IF NOT EXISTS payout_error TEXT;
    `);
    console.log("✅ Updated 'payments' table with Razorpay Route Transfer, Refund & Midnight Payout columns.");

    console.log("🟢 All database schema changes applied live to PostgreSQL successfully!");
  } catch (error) {
    console.error("🔴 Database migration failed:", error?.message || error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigrations();
