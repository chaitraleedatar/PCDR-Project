'use strict';
const Anthropic = require('@anthropic-ai/sdk');
const { ANTHROPIC_API_KEY } = require('../config/env');

let client = null;
if (ANTHROPIC_API_KEY) {
  client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
}

const TIMEOUT_MS = 5000;

function raceTimeout(promise) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Claude timeout')), TIMEOUT_MS)
  );
  return Promise.race([promise, timeout]);
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

  const systemPrompt = `You are a patient, encouraging tutor helping a dyslexic student learn to trace through Python code.
Rules:
- Keep the hint to 1-2 short sentences maximum
- Use plain, concrete language — no jargon
- Do NOT reveal the answer directly
- Focus on the concept: ${conceptTag} (${phaseDescription(phase)})
- Be warm, encouraging, and specific to the code snippet`;

  const userPrompt = `The student is tracing through this Python code:
\`\`\`python
${formula}
\`\`\`
Current question: ${question}
The student answered incorrectly with: ${wrongAnswers.join(', ')}
Give a gentle, concrete hint that guides them to think about the code differently. Do not reveal the answer.`;

  try {
    const response = await raceTimeout(client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }));
    return { hint: response.content[0].text.trim(), source: 'llm' };
  } catch (err) {
    console.warn('[Claude] Hint generation failed, using static fallback:', err.message);
    return { hint: stepExplain, source: 'static' };
  }
}

/**
 * Generate a plain-English explanation of a code snippet for accessibility.
 * Used by the "Explain this code" feature.
 */
async function explainCode({ formula, title }) {
  if (!client) {
    return {
      explanation: `This code traces through "${title}". Read it one line at a time — each line does one thing.`,
      source: 'static',
    };
  }

  const systemPrompt = `You are an accessible coding tutor for students with dyslexia who are learning to read Python code.
Rules:
- Explain what the code does in 2-3 short, simple sentences
- Use plain language — no technical jargon
- Be concrete: mention the actual variable names and values in the code
- Structure: first say what it sets up, then what it does, then what it prints
- End by saying what the final output will be`;

  const userPrompt = `Explain this Python code in plain, simple language for a student who finds reading hard:
\`\`\`python
${formula}
\`\`\`
Keep it to 2-3 sentences. Be friendly and concrete.`;

  try {
    const response = await raceTimeout(client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }));
    return { explanation: response.content[0].text.trim(), source: 'llm' };
  } catch (err) {
    console.warn('[Claude] Code explanation failed, using static fallback:', err.message);
    return {
      explanation: `This code traces through "${title}". Read it one line at a time — each line does one thing.`,
      source: 'static',
    };
  }
}

function phaseDescription(phase) {
  const desc = {
    GREEN:  'scan the overall code structure',
    VIOLET: 'read the value of a variable',
    YELLOW: 'evaluate an expression or condition',
    BLUE:   'follow the control flow (which branch or loop runs)',
    RED:    'determine the final output',
  };
  return desc[phase] || phase;
}

module.exports = { generateLLMHint, explainCode };
