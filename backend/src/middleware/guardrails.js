const { z } = require('zod');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

// ─── Guardrail violation log file ────────────────────────────────────────────
const logsDir = path.join(__dirname, '../../../logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
const violationsLog = path.join(logsDir, 'guardrail_violations.log');

function logViolation(type, details) {
  const entry = JSON.stringify({ timestamp: new Date().toISOString(), type, ...details }) + '\n';
  fs.appendFileSync(violationsLog, entry);
  logger.warn(`Guardrail violation: ${type}`, details);
}

// ─── Profanity filter (simple word-list) ─────────────────────────────────────
const BANNED_WORDS = ['fuck', 'shit', 'asshole', 'bastard', 'bitch', 'damn', 'crap'];

function containsProfanity(text) {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase();
  return BANNED_WORDS.some((word) => lower.includes(word));
}

/**
 * Middleware: reject requests with profanity in body.message or body.description
 */
function profanityGuard(req, res, next) {
  const fieldsToCheck = [req.body?.message, req.body?.description, req.body?.name];
  const offending = fieldsToCheck.find((f) => containsProfanity(f));
  if (offending) {
    logViolation('PROFANITY', { ip: req.ip, path: req.path, snippet: offending.slice(0, 30) });
    return res.status(400).json({
      success: false,
      message: 'Your message contains inappropriate language. Please revise and try again.',
    });
  }
  next();
}

// ─── Distance guardrail ───────────────────────────────────────────────────────
const MAX_BOOKING_DISTANCE_KM = 50;

/**
 * Rejects a booking if the technician is farther than MAX_BOOKING_DISTANCE_KM.
 * Called programmatically (not as middleware) from the booking route.
 */
function validateBookingDistance(distanceKm) {
  if (distanceKm > MAX_BOOKING_DISTANCE_KM) {
    logViolation('DISTANCE_EXCEEDED', { distanceKm, maxAllowed: MAX_BOOKING_DISTANCE_KM });
    return {
      valid: false,
      message: `No technician available within ${MAX_BOOKING_DISTANCE_KM}km of your location. Try expanding your search area.`,
    };
  }
  return { valid: true };
}

// ─── Skill mismatch guardrail ─────────────────────────────────────────────────

/**
 * Ensures the technician's skills include the requested service type.
 * Called programmatically from the booking route.
 */
function validateSkillMatch(technicianSkills, requestedService) {
  if (!technicianSkills.includes(requestedService)) {
    logViolation('SKILL_MISMATCH', { technicianSkills, requestedService });
    return {
      valid: false,
      message: `This technician is not qualified for ${requestedService}. Please select a different technician.`,
    };
  }
  return { valid: true };
}

// ─── Zod schemas for request validation ─────────────────────────────────────

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  role: z.enum(['user', 'technician']).optional(),
  skills: z.array(z.string()).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const bookingSchema = z.object({
  technicianId: z.string().min(1),
  serviceType: z.enum(['plumber', 'electrician', 'ac_repair', 'carpenter', 'painter', 'appliance_repair', 'mason', 'cleaner']),
  userLat: z.number(),
  userLng: z.number(),
  description: z.string().max(500).optional(),
});

const agentBookSchema = z.object({
  message: z.string().min(3).max(300),
  userLat: z.number(),
  userLng: z.number(),
  userId: z.string().min(1),
});

/**
 * Middleware factory: validates req.body against a Zod schema.
 * Returns 422 with field errors on failure.
 */
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      logViolation('SCHEMA_VALIDATION', { path: req.path, errors });
      return res.status(422).json({ success: false, message: 'Validation failed', errors });
    }
    req.validatedBody = result.data;
    next();
  };
}

module.exports = {
  profanityGuard,
  validateBookingDistance,
  validateSkillMatch,
  validateBody,
  containsProfanity,
  registerSchema,
  loginSchema,
  bookingSchema,
  agentBookSchema,
  MAX_BOOKING_DISTANCE_KM,
  logViolation,
};
