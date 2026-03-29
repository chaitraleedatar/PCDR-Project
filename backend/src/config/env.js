'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

const required = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`[ENV] Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

module.exports = {
  DATABASE_URL:       process.env.DATABASE_URL,
  REDIS_URL:          process.env.REDIS_URL,
  JWT_SECRET:         process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  ANTHROPIC_API_KEY:  process.env.ANTHROPIC_API_KEY || '',
  ANON_SECRET:        process.env.ANON_SECRET || 'dev_anon_secret',
  NODE_ENV:           process.env.NODE_ENV || 'development',
  PORT:               parseInt(process.env.PORT || '3000', 10),
  ALLOWED_ORIGINS:    (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
};
