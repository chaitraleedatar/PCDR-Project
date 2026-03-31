'use strict';
const express = require('express');
const { query } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { anonymizeEvents } = require('../services/anonymizer');

const router = express.Router();

function buildDateFilter(since, until) {
  const params = [];
  const clauses = [];
  if (since) { params.push(new Date(since)); clauses.push(`e.created_at >= $${params.length}`); }
  if (until) { params.push(new Date(until)); clauses.push(`e.created_at <= $${params.length}`); }
  return { params, clauses };
}

async function fetchEvents(req) {
  const { since, until, problemId } = req.query;
  const { params, clauses } = buildDateFilter(since, until);
  if (problemId) { params.push(problemId); clauses.push(`e.problem_id = $${params.length}`); }
  const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
  const { rows } = await query(
    `SELECT e.user_id, e.problem_id, e.step_index, e.phase, e.concept_tag,
            e.event_type, e.correct, e.latency_ms, e.created_at
     FROM step_events e ${where}
     ORDER BY e.created_at ASC
     LIMIT 50000`,
    params
  );
  return anonymizeEvents(rows);
}

// GET /api/export/events.csv
router.get('/events.csv', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const events = await fetchEvents(req);
    if (events.length === 0) {
      return res.status(204).send();
    }
    const headers = Object.keys(events[0]);
    const csv = [
      headers.join(','),
      ...events.map(row =>
        headers.map(h => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          const str = String(val);
          return str.includes(',') ? `"${str.replace(/"/g, '""')}"` : str;
        }).join(',')
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="tracewise_events_${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

// GET /api/export/events.json
router.get('/events.json', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const events = await fetchEvents(req);
    res.setHeader('Content-Disposition', `attachment; filename="tracewise_events_${Date.now()}.json"`);
    res.json({ exported_at: new Date().toISOString(), count: events.length, events });
  } catch (err) {
    next(err);
  }
});

// GET /api/export/mastery-snapshot.json - aggregated, no individual user data
router.get('/mastery-snapshot.json', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT concept_tag,
              COUNT(DISTINCT user_id) AS student_count,
              ROUND(AVG(p_know)::numeric, 4) AS avg_mastery,
              ROUND(MIN(p_know)::numeric, 4) AS min_mastery,
              ROUND(MAX(p_know)::numeric, 4) AS max_mastery,
              SUM(obs_total) AS total_observations,
              SUM(obs_correct) AS total_correct
       FROM student_mastery
       GROUP BY concept_tag
       ORDER BY avg_mastery ASC`
    );
    res.json({
      exported_at: new Date().toISOString(),
      concepts: rows,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
