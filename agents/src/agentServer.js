/**
 * Agent HTTP server — exposes POST /api/agent/book
 * Runs the full 3-agent pipeline (Intent → Matching → Booking).
 */
import 'dotenv/config';
import express from 'express';
import { runAgentPipeline } from './orchestrator.js';

const app = express();
app.use(express.json({ limit: '10kb' }));

/**
 * POST /api/agent/book
 * Body: { message, userLat, userLng, userId, authToken }
 *
 * Example:
 * {
 *   "message": "my pipe is leaking badly",
 *   "userLat": 13.0827,
 *   "userLng": 80.2707,
 *   "userId": "<mongo-user-id>",
 *   "authToken": "<jwt-token>"
 * }
 */
app.post('/api/agent/book', async (req, res) => {
  try {
    const { message, userLat, userLng, userId, authToken } = req.body;

    // Basic input validation
    if (!message || typeof message !== 'string' || message.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'A descriptive message is required (min 3 chars)' });
    }
    if (typeof userLat !== 'number' || typeof userLng !== 'number') {
      return res.status(400).json({ success: false, message: 'userLat and userLng must be numbers' });
    }
    if (!userId || !authToken) {
      return res.status(400).json({ success: false, message: 'userId and authToken are required' });
    }

    const result = await runAgentPipeline({
      message: message.trim(),
      userLat, userLng, userId, authToken,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    // Surface guardrail errors to user
    if (err.code === 'NO_TECHNICIAN_FOUND' || err.code === 'BOOKING_FAILED') {
      return res.status(400).json({ success: false, message: err.message });
    }
    console.error('[AgentServer] Unhandled error:', err);
    res.status(500).json({ success: false, message: 'Agent pipeline failed: ' + err.message });
  }
});

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'agents' }));

const PORT = process.env.AGENT_PORT || 3003;
app.listen(PORT, () => console.log(`[Agents] Server running on port ${PORT}`));
