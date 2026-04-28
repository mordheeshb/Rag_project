const express = require('express');
const User = require('../models/User');
const { haversineDistance, estimateETA } = require('../utils/haversine');
const { authMiddleware, requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/technicians/nearby?lat=&lng=&skill=&maxKm=
 * Returns available technicians near the given coordinates, filtered by skill.
 * Results include computed distance and ETA.
 */
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, skill, maxKm = 50 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'lat and lng are required' });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const maxDistance = parseFloat(maxKm);

    // Build query filter
    const query = { role: 'technician', isAvailable: true };
    if (skill) query.skills = skill; // MongoDB checks if array contains value

    const technicians = await User.find(query).select('-password');

    // Compute distance + ETA for each technician, then filter by maxKm
    const enriched = technicians
      .filter((t) => t.location?.lat && t.location?.lng)
      .map((t) => {
        const distanceKm = haversineDistance(userLat, userLng, t.location.lat, t.location.lng);
        const etaMinutes = estimateETA(distanceKm);
        return { ...t.toObject(), distanceKm: parseFloat(distanceKm.toFixed(2)), etaMinutes };
      })
      .filter((t) => t.distanceKm <= maxDistance)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    logger.info('Nearby technicians queried', {
      userLat, userLng, skill, count: enriched.length,
    });

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    logger.error('Nearby technicians error', { error: err.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * GET /api/technicians/dashboard
 * Technician-only: returns their active (non-terminal) bookings.
 */
router.get('/dashboard', authMiddleware, requireRole('technician'), async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    const jobs = await Booking.find({
      technicianId: req.user._id,
      status: { $nin: ['completed', 'cancelled'] },
    })
      .populate('userId', 'name email location')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: jobs.length, data: jobs });
  } catch (err) {
    logger.error('Dashboard error', { error: err.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * GET /api/technicians/:id
 * Public: get a single technician by ID.
 */
router.get('/:id', async (req, res) => {
  try {
    const tech = await User.findOne({ _id: req.params.id, role: 'technician' }).select('-password');
    if (!tech) return res.status(404).json({ success: false, message: 'Technician not found' });
    res.json({ success: true, data: tech });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * GET /api/technicians
 * Public: list all technicians (for browsing / admin use).
 */
router.get('/', async (req, res) => {
  try {
    const { skill, available } = req.query;
    const query = { role: 'technician' };
    if (skill) query.skills = skill;
    if (available === 'true') query.isAvailable = true;

    const techs = await User.find(query).select('-password');
    res.json({ success: true, count: techs.length, data: techs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * PATCH /api/technicians/availability
 * Technician-only: toggle availability status.
 */
router.patch('/availability', authMiddleware, requireRole('technician'), async (req, res) => {
  try {
    const { isAvailable } = req.body;
    await User.findByIdAndUpdate(req.user._id, { isAvailable });
    res.json({ success: true, message: `Availability set to ${isAvailable}` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
