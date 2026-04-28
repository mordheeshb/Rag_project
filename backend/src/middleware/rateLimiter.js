const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * General rate limiter: 20 requests / minute per IP.
 * Applied to all public endpoints.
 */
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', { ip: req.ip, path: req.path });
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please slow down and try again in a minute.',
    });
  },
});

/**
 * Stricter auth limiter: 10 requests / 15 minutes per IP.
 * Applied to /api/auth/* to prevent brute force.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', { ip: req.ip });
    res.status(429).json({
      success: false,
      message: 'Too many auth attempts. Try again in 15 minutes.',
    });
  },
});

module.exports = { generalLimiter, authLimiter };
