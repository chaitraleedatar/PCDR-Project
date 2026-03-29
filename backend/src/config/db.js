'use strict';
const { Pool } = require('pg');
const { DATABASE_URL } = require('./env');

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 1000) {
    console.warn(`[DB] Slow query (${duration}ms): ${text.substring(0, 80)}`);
  }
  return res;
}

async function getClient() {
  return pool.connect();
}

module.exports = { query, getClient, pool };
