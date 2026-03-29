'use strict';
const express = require('express');
const { query } = require('../config/db');
const redis = require('../config/redis');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { masteryLabel } = require('../services/bkt');

const router = express.Router();

// GET /api/dashboard/class - live active students (from Redis)
router.get('/class', requireAuth, requireRole('teacher', 'admin'), async (req, res, next) => {
  try {
    const keys = await redis.keys('session:*');
    const activeSessions = [];
    for (const key of keys) {
      const raw = await redis.get(key);
      if (!raw) continue;
      const data = JSON.parse(raw);
      const sessionId = key.replace('session:', '');
      const idleMs = Date.now() - (data.lastEventAt || data.startedAt);
      activeSessions.push({
        sessionId,
        userId:     data.userId,
        username:   data.username,
        problemId:  data.problemId,
        currentStep: data.currentStep || 0,
        totalSteps:  data.totalSteps || 0,
        routeErrors: data.routeErrors || 0,
        mcErrors:    data.mcErrors || 0,
        hintsUsed:   data.hintsUsed || 0,
        idleSeconds: Math.floor(idleMs / 1000),
        stuckAlert:  idleMs > 90000,
        startedAt:   data.startedAt,
      });
    }
    res.json(activeSessions);
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/heatmap - per-concept mastery across all students
router.get('/heatmap', requireAuth, requireRole('teacher', 'admin'), async (req, res, next) => {
  try {
    const { since, problemId } = req.query;
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 30 * 24 * 3600 * 1000);

    const { rows } = await query(
      `SELECT
         sm.concept_tag,
         ROUND(AVG(sm.p_know)::numeric, 3) AS avg_mastery,
         COUNT(DISTINCT sm.user_id) AS student_count,
         SUM(sm.obs_total) AS total_observations,
         SUM(sm.obs_correct) AS total_correct,
         CASE WHEN SUM(sm.obs_total) > 0
              THEN ROUND((1.0 - SUM(sm.obs_correct)::float / SUM(sm.obs_total))::numeric, 3)
              ELSE 0 END AS error_rate
       FROM student_mastery sm
       WHERE sm.updated_at >= $1
       GROUP BY sm.concept_tag
       ORDER BY avg_mastery ASC`,
      [sinceDate]
    );

    const result = rows.map(r => ({
      ...r,
      masteryLabel: masteryLabel(parseFloat(r.avg_mastery)),
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/student/:userId - individual student deep dive
router.get('/student/:userId', requireAuth, requireRole('teacher', 'admin'), async (req, res, next) => {
  try {
    const { userId } = req.params;
    const [userRes, masteryRes, sessionsRes] = await Promise.all([
      query('SELECT id, username, email, created_at FROM users WHERE id=$1', [userId]),
      query(
        `SELECT concept_tag, p_know, obs_correct, obs_total, updated_at
         FROM student_mastery WHERE user_id=$1 ORDER BY p_know ASC`,
        [userId]
      ),
      query(
        `SELECT s.id, s.problem_id, p.title, s.started_at, s.completed_at,
                s.route_errors, s.mc_errors, s.hints_used, s.total_steps
         FROM sessions s JOIN problems p ON p.id=s.problem_id
         WHERE s.user_id=$1 ORDER BY s.started_at DESC LIMIT 20`,
        [userId]
      ),
    ]);

    if (!userRes.rows[0]) return res.status(404).json({ error: 'user_not_found' });

    res.json({
      user: userRes.rows[0],
      mastery: masteryRes.rows.map(m => ({
        ...m,
        masteryLabel: masteryLabel(m.p_know),
      })),
      recentSessions: sessionsRes.rows,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/students - list all students
router.get('/students', requireAuth, requireRole('teacher', 'admin'), async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT u.id, u.username, u.email, u.created_at,
              COUNT(DISTINCT s.id) AS session_count,
              MAX(s.started_at) AS last_active
       FROM users u
       LEFT JOIN sessions s ON s.user_id = u.id
       WHERE u.role = 'student'
       GROUP BY u.id ORDER BY last_active DESC NULLS LAST`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
