const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

const schemaFile = path.resolve(__dirname, '../database/schema.sql');

async function initDatabase() {
  const client = await pool.connect();
  try {
    const schemaSql = fs.readFileSync(schemaFile, 'utf8');
    await client.query(schemaSql);
    console.log('Database schema created successfully.');
  } catch (error) {
    console.error('Failed to initialize database schema:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

initDatabase();
