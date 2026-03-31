'use strict';
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_requests', retryAfter: 900 },
});

const hintLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: 'too_many_hints', retryAfter: 60 },
});

const explainLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: { error: 'too_many_explain_requests', retryAfter: 60 },
});

module.exports = { authLimiter, hintLimiter, explainLimiter };
