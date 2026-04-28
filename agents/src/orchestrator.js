/**
 * Orchestrator — runs the full 3-agent pipeline in sequence:
 * 1. IntentAgent: classify message → serviceType + urgency
 * 2. MatchingAgent: find + rank nearby technicians
 * 3. BookingAgent: confirm and create booking
 *
 * Each step is logged to logs/agent_reasoning.log for observability.
 */

import { classify } from './intentAgent.js';
import { findAndRank } from './matchingAgent.js';
import { confirmBooking } from './bookingAgent.js';
import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logsDir = path.join(__dirname, '../../logs');
if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });
const agentLogPath = path.join(logsDir, 'agent_reasoning.log');

function logStep(sessionId, step, data) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    sessionId,
    step,
    ...data,
  }) + '\n';
  appendFileSync(agentLogPath, entry);
  console.log(`[Agent:${step}]`, JSON.stringify(data));
}

/**
 * Run the full agent pipeline.
 *
 * @param {Object} params
 * @param {string} params.message     - User's natural language request
 * @param {number} params.userLat     - User's latitude
 * @param {number} params.userLng     - User's longitude
 * @param {string} params.userId      - MongoDB user ID
 * @param {string} params.authToken   - JWT token (required to create booking)
 * @returns {Object} - Full pipeline result with booking confirmation
 */
export async function runAgentPipeline({ message, userLat, userLng, userId, authToken }) {
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  logStep(sessionId, 'START', { message, userLat, userLng, userId });

  // ── Step 1: Intent Classification ─────────────────────────────────────────
  const intent = await classify(message);
  logStep(sessionId, 'INTENT', intent);

  if (!intent.serviceType) {
    throw new Error('Could not determine service type from your message. Please be more specific.');
  }

  // ── Step 2: Technician Matching ───────────────────────────────────────────
  const { rankedTechnicians, bestMatch } = await findAndRank(intent.serviceType, userLat, userLng);
  logStep(sessionId, 'MATCHING', {
    serviceType: intent.serviceType,
    candidateCount: rankedTechnicians.length,
    bestMatch: { id: bestMatch._id || bestMatch.id, name: bestMatch.name, score: bestMatch.weightedScore },
  });

  // ── Step 3: Booking Confirmation ──────────────────────────────────────────
  const booking = await confirmBooking(
    userId,
    bestMatch,
    intent.serviceType,
    userLat,
    userLng,
    intent.summary || message,
    authToken
  );
  logStep(sessionId, 'BOOKING', booking);

  logStep(sessionId, 'COMPLETE', { bookingId: booking.bookingId });

  return {
    sessionId,
    intent,
    booking,
    allCandidates: rankedTechnicians.slice(0, 5), // Return top 5 for UI display
  };
}
