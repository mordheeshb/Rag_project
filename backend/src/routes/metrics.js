const express = require('express');
const Booking = require('../models/Booking');
const User = require('../models/User');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/metrics
 * Returns observability counts: total/active bookings, users, technicians,
 * and guardrail violations logged in the last hour.
 */
router.get('/', async (req, res) => {
  try {
    const [totalBookings, activeBookings, totalUsers, totalTechnicians] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ status: { $nin: ['completed', 'cancelled'] } }),
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'technician' }),
    ]);

    // Count guardrail violations in the last hour from log file
    let violationsLastHour = 0;
    try {
      const violationsLog = path.join(__dirname, '../../../logs/guardrail_violations.log');
      if (fs.existsSync(violationsLog)) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const lines = fs.readFileSync(violationsLog, 'utf8').trim().split('\n').filter(Boolean);
        violationsLastHour = lines.filter((line) => {
          try {
            const entry = JSON.parse(line);
            return new Date(entry.timestamp) > oneHourAgo;
          } catch {
            return false;
          }
        }).length;
      }
    } catch (e) {
      // Non-critical — log file may not exist yet
    }

    res.json({
      success: true,
      metrics: {
        totalBookings,
        activeBookings,
        totalUsers,
        totalTechnicians,
        guardrailViolationsLastHour: violationsLastHour,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    logger.error('Metrics error', { error: err.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
