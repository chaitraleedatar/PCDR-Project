'use strict';
const crypto = require('crypto');
const { ANON_SECRET } = require('../config/env');

/**
 * Anonymize a user ID using HMAC-SHA256.
 * Uses server-side secret so IDs cannot be de-anonymized by guessing.
 */
function anonymizeId(userId) {
  return crypto
    .createHmac('sha256', ANON_SECRET)
    .update(userId)
    .digest('hex')
    .slice(0, 16); // 16 hex chars = 64 bits, sufficient for anonymization
}

/**
 * Anonymize a batch of step_events rows for research export.
 */
function anonymizeEvents(rows) {
  return rows.map(row => ({
    anon_user_id:  anonymizeId(row.user_id),
    problem_id:    row.problem_id,
    step_index:    row.step_index,
    phase:         row.phase,
    concept_tag:   row.concept_tag,
    event_type:    row.event_type,
    correct:       row.correct,
    latency_ms:    row.latency_ms,
    created_at:    row.created_at,
    // Omit: session_id (linkable), choice_made (potentially identifying)
  }));
}

module.exports = { anonymizeId, anonymizeEvents };
