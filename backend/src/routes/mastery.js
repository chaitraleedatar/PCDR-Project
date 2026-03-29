'use strict';
const express = require('express');
const { query } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { masteryLabel } = require('../services/bkt');

const router = express.Router();

// GET /api/mastery/me - current student's mastery
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT concept_tag, p_know, obs_correct, obs_total, updated_at
       FROM student_mastery WHERE user_id=$1 ORDER BY concept_tag`,
      [req.user.id]
    );
    res.json(rows.map(r => ({
      ...r,
      masteryLabel: masteryLabel(r.p_know),
      masteryPct: Math.round(r.p_know * 100),
    })));
  } catch (err) {
    next(err);
  }
});

// GET /api/mastery/:userId - for teacher/admin to view any student
router.get('/:userId', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role === 'student' && req.params.userId !== req.user.id) {
      return res.status(403).json({ error: 'insufficient_role' });
    }
    const { rows } = await query(
      `SELECT concept_tag, p_know, obs_correct, obs_total, updated_at
       FROM student_mastery WHERE user_id=$1 ORDER BY p_know ASC`,
      [req.params.userId]
    );
    res.json(rows.map(r => ({
      ...r,
      masteryLabel: masteryLabel(r.p_know),
      masteryPct: Math.round(r.p_know * 100),
    })));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
