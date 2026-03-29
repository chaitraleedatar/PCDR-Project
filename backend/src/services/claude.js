'use strict';
const Anthropic = require('@anthropic-ai/sdk');
const { ANTHROPIC_API_KEY } = require('../config/env');

let client = null;
if (ANTHROPIC_API_KEY) {
  client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
}

/**
 * Generate a personalized hint for a struggling student using Claude.
 * Falls back gracefully if API key is missing or call times out.
 */
async function generateLLMHint({ question, formula, wrongAnswers, conceptTag, phase, stepExplain }) {
  if (!client) {
    console.warn('[Claude] No ANTHROPIC_API_KEY — returning static hint');
    return { hint: stepExplain, source: 'static' };
  }

  const systemPrompt = `You are a patient, encouraging tutor helping a student with dyslexia learn propositional logic.
Rules:
- Keep the hint to 1-2 short sentences maximum
- Use plain, concrete language — no jargon
- Do NOT reveal the answer directly
- Focus on the concept: ${conceptTag}
- Be warm and supportive`;

  const userPrompt = `The student is working on this logic problem.
Formula: ${formula}
Current question: ${question}
Phase: ${phase} (${phaseDescription(phase)})
The student answered incorrectly with: ${wrongAnswers.join(', ')}
Give a gentle, visual hint to help them think about it differently.`;

  const timeoutMs = 5000;
  const claudeCall = client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 100,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Claude timeout')), timeoutMs)
  );

  try {
    const response = await Promise.race([claudeCall, timeoutPromise]);
    const hint = response.content[0].text.trim();
    return { hint, source: 'llm' };
  } catch (err) {
    console.warn('[Claude] Hint generation failed, using static fallback:', err.message);
    return { hint: stepExplain, source: 'static' };
  }
}

function phaseDescription(phase) {
  const desc = {
    GREEN:  'identify scope and groupings',
    VIOLET: 'evaluate atomic propositions (P, Q values)',
    YELLOW: 'apply negation or simplify sub-expressions',
    BLUE:   'combine sub-expressions with connectives',
    RED:    'determine final truth value',
  };
  return desc[phase] || phase;
}

module.exports = { generateLLMHint };
