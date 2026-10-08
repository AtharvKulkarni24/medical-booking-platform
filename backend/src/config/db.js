const { Pool } = require("pg");
require("dotenv").config();

const databaseUrl = process.env.DATABASE_URL;
let isRenderPostgres = false;

if (databaseUrl) {
  try {
    isRenderPostgres = new URL(databaseUrl).hostname.endsWith(".render.com");
  } catch (error) {
    throw new Error("DATABASE_URL must be a valid PostgreSQL connection URL.");
  }
}

const pool = new Pool({
  connectionString: databaseUrl,
  ...(isRenderPostgres ? { ssl: { rejectUnauthorized: false } } : {}),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// A quick test to ensure the pool connects automatically when the server starts
pool.on("connect", () => {
  console.log("Connected to the PostgreSQL Database");
});

// Catch idle connection errors gracefully
pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  // REMOVED: process.exit(-1); 
});

module.exports = pool;