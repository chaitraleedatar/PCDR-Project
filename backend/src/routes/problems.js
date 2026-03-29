'use strict';
const express = require('express');
const { query } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();

// GET /api/problems - list all published problems
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, title, formula, assignment, difficulty, is_published,
              jsonb_array_length(steps_json) AS step_count, created_at
       FROM problems
       WHERE is_published = TRUE
       ORDER BY difficulty ASC, id ASC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/problems/:id - get full problem including steps
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT id, title, formula, assignment, difficulty, steps_json AS steps, targets_json AS targets FROM problems WHERE id=$1 AND is_published=TRUE',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'problem_not_found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/problems - teacher/admin create problem
router.post('/', requireAuth, requireRole('teacher', 'admin'), async (req, res, next) => {
  try {
    const { id, title, formula, assignment, difficulty, steps, targets } = req.body;
    if (!id || !title || !formula || !assignment || !Array.isArray(steps) || !Array.isArray(targets)) {
      return res.status(400).json({ error: 'missing_fields' });
    }
    // Validate each step has required fields
    for (const step of steps) {
      if (!step.color || !step.question || !Array.isArray(step.choices) || step.correct === undefined) {
        return res.status(422).json({ error: 'invalid_step_shape', message: 'Each step needs color, question, choices, correct' });
      }
      if (step.correct < 0 || step.correct >= step.choices.length) {
        return res.status(422).json({ error: 'invalid_correct_index' });
      }
    }
    const { rows } = await query(
      `INSERT INTO problems (id, title, formula, assignment, difficulty, author_id, is_published, steps_json, targets_json)
       VALUES ($1,$2,$3,$4,$5,$6,FALSE,$7,$8)
       RETURNING id, title, difficulty, is_published`,
      [id.trim(), title, formula, assignment, difficulty || 1, req.user.id, JSON.stringify(steps), JSON.stringify(targets)]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'problem_id_taken' });
    next(err);
  }
});

// PATCH /api/problems/:id/publish - teacher/admin toggle publish
router.patch('/:id/publish', requireAuth, requireRole('teacher', 'admin'), async (req, res, next) => {
  try {
    const { is_published } = req.body;
    const { rows } = await query(
      'UPDATE problems SET is_published=$1 WHERE id=$2 RETURNING id, is_published',
      [!!is_published, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'problem_not_found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
