'use strict';
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { explainLimiter } = require('../middleware/rateLimiter');
const { explainCode } = require('../services/claude');

const router = express.Router();

// POST /api/explain — generate a plain-English explanation of a code snippet
// Available to any authenticated user (student, teacher, admin)
router.post('/', requireAuth, explainLimiter, async (req, res, next) => {
  try {
    const { formula, title } = req.body;
    if (!formula) {
      return res.status(400).json({ error: 'missing_fields', message: 'formula is required' });
    }
    const result = await explainCode({ formula, title: title || 'this problem' });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
