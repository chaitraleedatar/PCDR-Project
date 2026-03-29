'use strict';
const express = require('express');
const { query } = require('../config/db');
const redis = require('../config/redis');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { hintLimiter } = require('../middleware/rateLimiter');
const { generateLLMHint } = require('../services/claude');

const router = express.Router();
const MAX_LLM_HINTS_PER_SESSION = 5;

// POST /api/hints - request an LLM-generated hint
router.post('/', requireAuth, requireRole('student'), hintLimiter, async (req, res, next) => {
  try {
    const {
      sessionId, stepIndex, phase, question, wrongAnswers,
      conceptTag, formula, stepExplain,
    } = req.body;

    if (!sessionId || stepIndex === undefined || !phase || !question) {
      return res.status(400).json({ error: 'missing_fields' });
    }

    // Verify session ownership
    const { rows } = await query(
      'SELECT id FROM sessions WHERE id=$1 AND user_id=$2 AND completed_at IS NULL',
      [sessionId, req.user.id]
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'session_not_found' });
    }

    // Rate limit LLM hints per session (use Redis counter)
    const hintKey = `hint_count:${sessionId}`;
    const count = await redis.incr(hintKey);
    if (count === 1) {
      // Set TTL on first increment (8h = session TTL)
      await redis.expire(hintKey, 8 * 3600);
    }
    if (count > MAX_LLM_HINTS_PER_SESSION) {
      // Decrement to prevent overcounting
      await redis.decr(hintKey);
      return res.status(429).json({
        error: 'hint_limit_reached',
        message: `Maximum ${MAX_LLM_HINTS_PER_SESSION} AI hints per session`,
        retryAfter: 0,
        fallback: stepExplain || 'Review the hint in the question.',
      });
    }

    const result = await generateLLMHint({
      question,
      formula: formula || '',
      wrongAnswers: Array.isArray(wrongAnswers) ? wrongAnswers.slice(0, 5) : [],
      conceptTag: conceptTag || 'unknown',
      phase,
      stepExplain: stepExplain || '',
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
