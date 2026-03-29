'use strict';
/**
 * Bayesian Knowledge Tracing (BKT) implementation.
 * Reference: Corbett & Anderson (1994)
 *
 * Four parameters per concept:
 *   p_know   = P(student knows the concept) — updated after each observation
 *   p_learn  = P(learning at each opportunity) — fixed
 *   p_guess  = P(correct | not known) — fixed
 *   p_slip   = P(incorrect | known) — fixed
 */

const DEFAULTS = {
  p_know:  0.3,
  p_learn: 0.09,
  p_guess: 0.2,
  p_slip:  0.1,
};

/**
 * Update mastery estimate given one observation.
 * @param {object} mastery - current { p_know, p_learn, p_guess, p_slip }
 * @param {boolean} isCorrect - whether student answered correctly
 * @returns {object} updated mastery with new p_know
 */
function updateBKT(mastery, isCorrect) {
  const { p_learn, p_guess, p_slip } = mastery;
  // Clamp p_know to avoid division by zero
  const p_know = Math.min(0.9999, Math.max(0.0001, mastery.p_know));

  let p_know_given_obs;
  if (isCorrect) {
    // P(correct) = P(know)*(1-slip) + P(not know)*guess
    const p_correct = p_know * (1 - p_slip) + (1 - p_know) * p_guess;
    // Bayes: P(know | correct)
    p_know_given_obs = (p_know * (1 - p_slip)) / p_correct;
  } else {
    // P(wrong) = P(know)*slip + P(not know)*(1-guess)
    const p_wrong = p_know * p_slip + (1 - p_know) * (1 - p_guess);
    // Bayes: P(know | wrong)
    p_know_given_obs = (p_know * p_slip) / p_wrong;
  }

  // Update: P(know_next) = P(knew it) + P(didn't but learned)
  const p_know_next = p_know_given_obs + (1 - p_know_given_obs) * p_learn;

  return {
    ...mastery,
    p_know: Math.min(0.9999, Math.max(0.0001, p_know_next)),
  };
}

/**
 * Check if a concept is considered mastered.
 * @param {object} mastery
 * @param {number} threshold - default 0.95
 */
function isMastered(mastery, threshold = 0.95) {
  return mastery.p_know >= threshold;
}

/**
 * Get mastery level label for UI display.
 */
function masteryLabel(p_know) {
  if (p_know >= 0.95) return 'mastered';
  if (p_know >= 0.75) return 'proficient';
  if (p_know >= 0.5)  return 'developing';
  return 'novice';
}

module.exports = { updateBKT, isMastered, masteryLabel, DEFAULTS };
