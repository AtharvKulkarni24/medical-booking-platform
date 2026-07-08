const { Pool } = require("pg");
require("dotenv").config();

// Create a new pool using the Render connection string
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  // Optional: helps manage dropped connections faster
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