'use strict';
const { query, getClient } = require('../config/db');
const { updateBKT, DEFAULTS } = require('./bkt');

/**
 * Process a batch of step events and update BKT mastery for each concept.
 * Called after bulk event insert in the events route.
 *
 * @param {string} userId
 * @param {Array} events - array of { conceptTag, correct, eventType }
 */
async function updateMasteryForEvents(userId, events) {
  // Filter to only answer events (not routing errors or hints)
  const answerEvents = events.filter(e =>
    e.eventType === 'mc_correct' || e.eventType === 'mc_error'
  );
  if (answerEvents.length === 0) return;

  // Group by concept tag
  const byTag = {};
  for (const event of answerEvents) {
    if (!byTag[event.conceptTag]) byTag[event.conceptTag] = [];
    byTag[event.conceptTag].push(event.correct);
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    for (const [conceptTag, results] of Object.entries(byTag)) {
      // Get or create mastery record with row lock
      const { rows } = await client.query(
        `INSERT INTO student_mastery (user_id, concept_tag, p_know, p_learn, p_guess, p_slip, obs_correct, obs_total)
         VALUES ($1, $2, $3, $4, $5, $6, 0, 0)
         ON CONFLICT (user_id, concept_tag) DO UPDATE SET updated_at = student_mastery.updated_at
         RETURNING *`,
        [userId, conceptTag, DEFAULTS.p_know, DEFAULTS.p_learn, DEFAULTS.p_guess, DEFAULTS.p_slip]
      );
      // Re-fetch with lock
      const { rows: locked } = await client.query(
        'SELECT * FROM student_mastery WHERE user_id=$1 AND concept_tag=$2 FOR UPDATE',
        [userId, conceptTag]
      );
      let mastery = locked[0];

      let newCorrect = mastery.obs_correct;
      let newTotal   = mastery.obs_total;

      // Apply BKT update for each observation in order
      for (const isCorrect of results) {
        mastery = updateBKT(mastery, isCorrect);
        newTotal++;
        if (isCorrect) newCorrect++;
      }

      await client.query(
        `UPDATE student_mastery
         SET p_know=$1, obs_correct=$2, obs_total=$3, updated_at=NOW()
         WHERE user_id=$4 AND concept_tag=$5`,
        [mastery.p_know, newCorrect, newTotal, userId, conceptTag]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[BKT] masteryUpdater error:', err.message);
  } finally {
    client.release();
  }
}

module.exports = { updateMasteryForEvents };
