require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const fs = require("fs");
const path = require("path");
const pool = require("../src/config/db");

const migrations = {
  expand: {
    id: "001_normalize_appointments_reviews_expand",
    file: "001_normalize_appointments_reviews_expand.sql",
  },
  contract: {
    id: "002_normalize_appointments_reviews_contract",
    file: "002_normalize_appointments_reviews_contract.sql",
  },
};

async function run() {
  const stage = process.argv[2];
  const migration = migrations[stage];

  if (!migration) {
    throw new Error("Choose one migration stage: expand or contract.");
  }
  if (process.env.ALLOW_NORMALIZATION_MIGRATION !== "true") {
    throw new Error("Set ALLOW_NORMALIZATION_MIGRATION=true after reviewing the migration and securing a backup.");
  }
  if (process.env.NORMALIZATION_BACKUP_CONFIRMED !== "true") {
    throw new Error("Confirm a verified database backup with NORMALIZATION_BACKUP_CONFIRMED=true.");
  }
  if (!process.env.NORMALIZATION_TARGET_DATABASE) {
    throw new Error("Set NORMALIZATION_TARGET_DATABASE to the exact database name.");
  }
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_PRODUCTION_NORMALIZATION_MIGRATION !== "true"
  ) {
    throw new Error("Production migrations also require ALLOW_PRODUCTION_NORMALIZATION_MIGRATION=true.");
  }

  const client = await pool.connect();
  try {
    const target = await client.query("SELECT current_database() AS database_name");
    if (target.rows[0].database_name !== process.env.NORMALIZATION_TARGET_DATABASE) {
      throw new Error(
        `Connected to "${target.rows[0].database_name}", not the approved target ` +
        `"${process.env.NORMALIZATION_TARGET_DATABASE}". No migration was applied.`
      );
    }

    await client.query("SELECT pg_advisory_lock(hashtext('medbook-normalized-schema-migration'))");
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        migration_id TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const alreadyApplied = await client.query(
      "SELECT 1 FROM schema_migrations WHERE migration_id = $1",
      [migration.id]
    );
    if (alreadyApplied.rowCount > 0) {
      console.log(`Migration ${migration.id} is already applied; no changes made.`);
      return;
    }

    const sqlPath = path.resolve(__dirname, "../database/migrations", migration.file);
    const sql = fs.readFileSync(sqlPath, "utf8");
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (migration_id) VALUES ($1)",
        [migration.id]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }

    console.log(`Applied ${migration.id} to database "${target.rows[0].database_name}".`);
  } finally {
    try {
      await client.query("SELECT pg_advisory_unlock(hashtext('medbook-normalized-schema-migration'))");
    } finally {
      client.release();
      await pool.end();
    }
  }
}

run().catch((error) => {
  console.error("Normalized schema migration failed:", error.message || error);
  process.exitCode = 1;
});
