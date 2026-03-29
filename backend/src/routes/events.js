'use strict';
const express = require('express');
const { query } = require('../config/db');
const redis = require('../config/redis');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { updateMasteryForEvents } = require('../services/masteryUpdater');
const { onStudentEvent } = require('../ws/wsServer');

const router = express.Router();

const VALID_PHASES = new Set(['GREEN','VIOLET','YELLOW','BLUE','RED']);
const VALID_TYPES  = new Set(['route_error','mc_error','mc_correct','hint_requested','llm_hint_shown']);

// POST /api/events - batch insert step events
router.post('/', requireAuth, requireRole('student'), async (req, res, next) => {
  try {
    const { sessionId, events } = req.body;
    if (!sessionId || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'missing_fields' });
    }
    if (events.length > 50) {
      return res.status(422).json({ error: 'batch_too_large', max: 50 });
    }

    // Verify session ownership
    const { rows: sessionRows } = await query(
      'SELECT id, problem_id FROM sessions WHERE id=$1 AND user_id=$2',
      [sessionId, req.user.id]
    );
    if (!sessionRows[0]) {
      return res.status(404).json({ error: 'session_not_found' });
    }
    const problemId = sessionRows[0].problem_id;

    // Validate and build insert values
    const validEvents = [];
    for (const e of events) {
      if (!VALID_PHASES.has(e.phase) || !VALID_TYPES.has(e.eventType)) continue;
      if (e.stepIndex === undefined || e.stepIndex === null) continue;
      validEvents.push({
        sessionId,
        userId: req.user.id,
        problemId,
        stepIndex: Math.max(0, parseInt(e.stepIndex, 10)),
        phase: e.phase,
        conceptTag: (e.conceptTag || 'unknown').slice(0, 64),
        eventType: e.eventType,
        choiceMade: e.choiceMade ? String(e.choiceMade).slice(0, 128) : null,
        correct: typeof e.correct === 'boolean' ? e.correct : null,
        latencyMs: e.latencyMs && e.latencyMs > 0 && e.latencyMs < 1800000
          ? Math.round(e.latencyMs) : null,
      });
    }

    if (validEvents.length === 0) {
      return res.status(202).json({ received: 0 });
    }

    // Batch insert using unnest
    const values = validEvents.flatMap(e => [
      e.sessionId, e.userId, e.problemId, e.stepIndex,
      e.phase, e.conceptTag, e.eventType, e.choiceMade,
      e.correct, e.latencyMs,
    ]);
    const rowPlaceholders = validEvents.map((_, i) => {
      const b = i * 10;
      return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7},$${b+8},$${b+9},$${b+10})`;
    }).join(',');

    await query(
      `INSERT INTO step_events
         (session_id, user_id, problem_id, step_index, phase, concept_tag, event_type, choice_made, correct, latency_ms)
       VALUES ${rowPlaceholders}`,
      values
    );

    // Update mastery async (non-blocking)
    updateMasteryForEvents(req.user.id, validEvents.map(e => ({
      conceptTag: e.conceptTag,
      correct: e.correct,
      eventType: e.eventType,
    }))).catch(err => console.error('[Events] masteryUpdater error:', err.message));

    // Update Redis session cache and broadcast to teachers
    const cachedRaw = await redis.get(`session:${sessionId}`);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw);
      // Count errors and find latest step
      for (const e of validEvents) {
        if (e.eventType === 'route_error') cached.routeErrors = (cached.routeErrors || 0) + 1;
        if (e.eventType === 'mc_error')    cached.mcErrors    = (cached.mcErrors    || 0) + 1;
        if (e.eventType === 'hint_requested' || e.eventType === 'llm_hint_shown')
          cached.hintsUsed = (cached.hintsUsed || 0) + 1;
        if (e.eventType === 'mc_correct')
          cached.currentStep = Math.max(cached.currentStep || 0, e.stepIndex + 1);
      }
      cached.lastEventAt = Date.now();
      await redis.setex(`session:${sessionId}`, 8 * 3600, JSON.stringify(cached));
      onStudentEvent(sessionId, {
        userId: cached.userId,
        username: cached.username,
        problemId: cached.problemId,
        currentStep: cached.currentStep,
        totalSteps: cached.totalSteps,
        routeErrors: cached.routeErrors,
        mcErrors: cached.mcErrors,
        hintsUsed: cached.hintsUsed,
      });
    }

    res.status(202).json({ received: validEvents.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
