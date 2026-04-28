const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validateBody, loginSchema, registerSchema } = require('../middleware/guardrails');
const { authLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');

const router = express.Router();

// Helper: generate JWT token
function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

/**
 * POST /api/auth/register
 * Register a new user or technician account.
 */
router.post(
  '/register',
  authLimiter,
  validateBody(registerSchema),
  async (req, res) => {
    try {
      const { name, email, password, role, skills, lat, lng } = req.validatedBody;

      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Email already registered' });
      }

      const user = await User.create({
        name,
        email,
        password,
        role: role || 'user',
        skills: role === 'technician' ? (skills || []) : [],
        location: { lat: lat || null, lng: lng || null },
      });

      const token = signToken(user._id);
      logger.info('User registered', { userId: user._id, role: user.role });

      res.status(201).json({
        success: true,
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
      });
    } catch (err) {
      logger.error('Register error', { error: err.message });
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

/**
 * POST /api/auth/login
 * Authenticate user, return JWT.
 */
router.post(
  '/login',
  authLimiter,
  validateBody(loginSchema),
  async (req, res) => {
    try {
      const { email, password } = req.validatedBody;

      // Explicitly select password (excluded by default in schema)
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const token = signToken(user._id);
      logger.info('User logged in', { userId: user._id });

      res.json({
        success: true,
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role, skills: user.skills },
      });
    } catch (err) {
      logger.error('Login error', { error: err.message });
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

module.exports = router;
