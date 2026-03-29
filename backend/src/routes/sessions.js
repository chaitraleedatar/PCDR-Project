'use strict';
const express = require('express');
const { query } = require('../config/db');
const redis = require('../config/redis');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { onSessionComplete } = require('../ws/wsServer');

const router = express.Router();

// POST /api/sessions - start a new session
router.post('/', requireAuth, requireRole('student'), async (req, res, next) => {
  try {
    const { problemId } = req.body;
    if (!problemId) return res.status(400).json({ error: 'missing_problem_id' });

    // Verify problem exists
    const probCheck = await query('SELECT id, jsonb_array_length(steps_json) AS steps FROM problems WHERE id=$1 AND is_published=TRUE', [problemId]);
    if (!probCheck.rows[0]) return res.status(404).json({ error: 'problem_not_found' });

    const { rows } = await query(
      'INSERT INTO sessions (user_id, problem_id, total_steps) VALUES ($1,$2,$3) RETURNING id',
      [req.user.id, problemId, probCheck.rows[0].steps]
    );
    const sessionId = rows[0].id;

    // Cache in Redis: active session state (TTL = 8 hours)
    const sessionData = {
      userId: req.user.id,
      username: req.user.username,
      problemId,
      currentStep: 0,
      totalSteps: probCheck.rows[0].steps,
      routeErrors: 0,
      mcErrors: 0,
      hintsUsed: 0,
      startedAt: Date.now(),
      lastEventAt: Date.now(),
    };
    await redis.setex(`session:${sessionId}`, 8 * 3600, JSON.stringify(sessionData));

    res.status(201).json({ sessionId });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/sessions/:id/complete - mark session complete
router.patch('/:id/complete', requireAuth, async (req, res, next) => {
  try {
    const { routeErrors, mcErrors, hintsUsed } = req.body;
    const { rows } = await query(
      `UPDATE sessions
       SET completed_at=NOW(), route_errors=$1, mc_errors=$2, hints_used=$3
       WHERE id=$4 AND user_id=$5
       RETURNING *`,
      [routeErrors || 0, mcErrors || 0, hintsUsed || 0, req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'session_not_found' });

    // Remove from Redis and broadcast completion to teacher dashboard
    await redis.del(`session:${req.params.id}`);
    onSessionComplete(req.params.id);

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/sessions - list my sessions
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT s.id, s.problem_id, p.title AS problem_title, s.started_at, s.completed_at,
              s.total_steps, s.route_errors, s.mc_errors, s.hints_used
       FROM sessions s
       JOIN problems p ON p.id = s.problem_id
       WHERE s.user_id=$1
       ORDER BY s.started_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
