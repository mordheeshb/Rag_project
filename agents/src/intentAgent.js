/**
 * IntentAgent — classifies a free-text user message into:
 * - serviceType: one of the supported skill categories
 * - urgency: 'high' | 'medium' | 'low'
 * - summary: cleaned description to pass to the booking
 *
 * Uses OpenAI if available; falls back to a keyword-matching heuristic.
 */

import OpenAI from 'openai';

const SERVICE_KEYWORDS = {
  plumber:          ['plumb', 'pipe', 'leak', 'drain', 'tap', 'water', 'toilet', 'flush', 'faucet', 'sewage'],
  electrician:      ['electric', 'wiring', 'power', 'switch', 'socket', 'fuse', 'circuit', 'fan', 'light', 'voltage'],
  ac_repair:        ['ac ', 'air condition', 'cooling', 'refriger', 'hvac', 'chiller', 'heat pump'],
  carpenter:        ['carpent', 'wood', 'furniture', 'door', 'window', 'cabinet', 'shelf', 'table', 'chair'],
  painter:          ['paint', 'wall', 'colour', 'color', 'brush', 'primer', 'stain'],
  appliance_repair: ['appliance', 'washing machine', 'fridge', 'refrigerator', 'oven', 'microwave', 'dishwasher', 'geyser', 'water heater'],
  mason:            ['mason', 'brick', 'plaster', 'tile', 'concrete', 'cement', 'crack', 'wall repair'],
  cleaner:          ['clean', 'sweep', 'mop', 'dust', 'sanitize', 'disinfect', 'housekeep'],
};

const URGENCY_KEYWORDS = {
  high:   ['urgent', 'emergency', 'immediately', 'asap', 'flood', 'burst', 'fire', 'danger', 'now', 'critical'],
  medium: ['soon', 'today', 'quick', 'fast'],
  low:    ['whenever', 'sometime', 'tomorrow', 'next week'],
};

/**
 * Keyword-based fallback classifier (no API key needed).
 */
function classifyByKeywords(message) {
  const lower = message.toLowerCase();

  let serviceType = null;
  let serviceScore = 0;
  for (const [service, keywords] of Object.entries(SERVICE_KEYWORDS)) {
    const score = keywords.filter(kw => lower.includes(kw)).length;
    if (score > serviceScore) { serviceScore = score; serviceType = service; }
  }

  let urgency = 'medium'; // default
  for (const [level, keywords] of Object.entries(URGENCY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) { urgency = level; break; }
  }

  return { serviceType: serviceType || 'plumber', urgency, method: 'keyword' };
}

/**
 * OpenAI-based classifier with structured JSON output.
 */
async function classifyWithLLM(message) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const systemPrompt = `You are a service classifier for a home services platform.
Given a user's message, extract:
- serviceType: one of [plumber, electrician, ac_repair, carpenter, painter, appliance_repair, mason, cleaner]
- urgency: one of [high, medium, low]
- summary: a clean 1-sentence description of the problem

Respond ONLY with valid JSON: {"serviceType":"...","urgency":"...","summary":"..."}`;

  const resp = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ],
    temperature: 0,
    max_tokens: 80,
    response_format: { type: 'json_object' },
  });

  return { ...JSON.parse(resp.choices[0].message.content), method: 'llm' };
}

/**
 * Main classify function — tries LLM first, falls back to keyword matching.
 */
export async function classify(message) {
  try {
    if (process.env.OPENAI_API_KEY) {
      return await classifyWithLLM(message);
    }
  } catch (err) {
    console.warn('[IntentAgent] LLM classification failed, using keyword fallback:', err.message);
  }
  const result = classifyByKeywords(message);
  result.summary = message; // Use original message as summary in fallback
  return result;
}
