const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

const envPath = process.env.PAYMENT_ORDER_ENV_FILE || path.resolve(__dirname, "../.env");
dotenv.config({ path: path.resolve(envPath), override: true });

const pool = require("../src/config/db");
const migrationId = "003_add_appointment_payment_orders";

async function run() {
  if (process.env.ALLOW_PAYMENT_ORDER_MIGRATION !== "true") {
    throw new Error("Set ALLOW_PAYMENT_ORDER_MIGRATION=true after reviewing the migration.");
  }
  if (process.env.PAYMENT_ORDER_BACKUP_CONFIRMED !== "true") {
    throw new Error("Confirm a verified database backup with PAYMENT_ORDER_BACKUP_CONFIRMED=true.");
  }
  if (!process.env.PAYMENT_ORDER_TARGET_DATABASE) {
    throw new Error("Set PAYMENT_ORDER_TARGET_DATABASE to the exact database name.");
  }
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_PRODUCTION_PAYMENT_ORDER_MIGRATION !== "true"
  ) {
    throw new Error("Production also requires ALLOW_PRODUCTION_PAYMENT_ORDER_MIGRATION=true.");
  }

  const client = await pool.connect();
  let lockAcquired = false;
  try {
    const target = await client.query("SELECT current_database() AS database_name");
    if (target.rows[0].database_name !== process.env.PAYMENT_ORDER_TARGET_DATABASE) {
      throw new Error(
        `Connected to "${target.rows[0].database_name}", not the approved target ` +
        `"${process.env.PAYMENT_ORDER_TARGET_DATABASE}". No migration was applied.`
      );
    }

    await client.query("SELECT pg_advisory_lock(hashtext('medbook-payment-order-migration'))");
    lockAcquired = true;
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        migration_id TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const alreadyApplied = await client.query(
      "SELECT 1 FROM schema_migrations WHERE migration_id = $1",
      [migrationId],
    );
    if (alreadyApplied.rowCount > 0) {
      console.log(`Migration ${migrationId} is already applied; no changes made.`);
      return;
    }

    const sql = fs.readFileSync(
      path.resolve(__dirname, "../database/migrations/003_add_appointment_payment_orders.sql"),
      "utf8",
    );
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (migration_id) VALUES ($1)",
        [migrationId],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }

    console.log(`Applied ${migrationId} to database "${target.rows[0].database_name}".`);
  } finally {
    if (lockAcquired) {
      await client.query("SELECT pg_advisory_unlock(hashtext('medbook-payment-order-migration'))");
    }
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error("Payment-order migration failed:", error.message || error);
  process.exitCode = 1;
});
