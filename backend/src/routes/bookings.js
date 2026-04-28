const express = require('express');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const { validateBody, bookingSchema, validateBookingDistance, validateSkillMatch } = require('../middleware/guardrails');
const { haversineDistance, estimateETA } = require('../utils/haversine');
const logger = require('../utils/logger');

const router = express.Router();

// Attach socket.io instance from app
function emitEvent(req, event, data) {
  const io = req.app.get('io');
  if (io) io.emit(event, data);
}

/**
 * POST /api/bookings
 * Create a new booking. Applies distance + skill guardrails.
 */
router.post('/', authMiddleware, validateBody(bookingSchema), async (req, res) => {
  try {
    const { technicianId, serviceType, userLat, userLng, description } = req.validatedBody;

    // Fetch technician to validate skills and location
    const technician = await User.findOne({ _id: technicianId, role: 'technician' });
    if (!technician) {
      return res.status(404).json({ success: false, message: 'Technician not found' });
    }

    // Guardrail: skill match
    const skillCheck = validateSkillMatch(technician.skills, serviceType);
    if (!skillCheck.valid) {
      return res.status(400).json({ success: false, message: skillCheck.message });
    }

    // Guardrail: distance check
    const distanceKm = haversineDistance(userLat, userLng, technician.location.lat, technician.location.lng);
    const distanceCheck = validateBookingDistance(distanceKm);
    if (!distanceCheck.valid) {
      return res.status(400).json({ success: false, message: distanceCheck.message });
    }

    const etaMinutes = estimateETA(distanceKm);

    const booking = await Booking.create({
      userId: req.user._id,
      technicianId,
      serviceType,
      userLocation: { lat: userLat, lng: userLng },
      description: description || '',
      eta: etaMinutes,
      distanceKm: parseFloat(distanceKm.toFixed(2)),
    });

    // Real-time event: notify technician of new job
    emitEvent(req, 'booking:new', {
      bookingId: booking._id,
      technicianId,
      serviceType,
      userLocation: booking.userLocation,
      eta: etaMinutes,
    });

    logger.info('Booking created', { bookingId: booking._id, userId: req.user._id, technicianId });

    res.status(201).json({ success: true, data: booking });
  } catch (err) {
    logger.error('Create booking error', { error: err.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * GET /api/bookings/:id
 * Get booking details (populated with user and technician info).
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('technicianId', 'name email skills rating location photoUrl');

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    // Only allow booking parties to view details
    const isOwner = booking.userId._id.toString() === req.user._id.toString();
    const isTech = booking.technicianId._id.toString() === req.user._id.toString();
    if (!isOwner && !isTech) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: booking });
  } catch (err) {
    logger.error('Get booking error', { error: err.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * PATCH /api/bookings/:id/status
 * Update booking status — enforces state machine transitions.
 * Technicians can accept/update; users can cancel.
 */
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'status is required' });

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    // Enforce ownership: technician drives progress, user can only cancel
    const isTech = booking.technicianId.toString() === req.user._id.toString();
    const isUser = booking.userId.toString() === req.user._id.toString();

    if (!isTech && !isUser) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (isUser && status !== 'cancelled') {
      return res.status(403).json({ success: false, message: 'Users can only cancel bookings' });
    }

    // Apply state machine transition (throws on invalid)
    booking.transitionTo(status);
    await booking.save();

    // Real-time event: notify all listeners of status change
    emitEvent(req, 'booking:status_changed', { bookingId: booking._id, status });

    logger.info('Booking status updated', { bookingId: booking._id, newStatus: status });

    res.json({ success: true, data: booking });
  } catch (err) {
    if (err.code === 'INVALID_TRANSITION') {
      return res.status(400).json({ success: false, message: err.message });
    }
    logger.error('Update status error', { error: err.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * GET /api/bookings
 * List bookings for the authenticated user (or all jobs for a technician).
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const filter = req.user.role === 'technician'
      ? { technicianId: req.user._id }
      : { userId: req.user._id };

    const bookings = await Booking.find(filter)
      .populate('technicianId', 'name skills rating')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: bookings.length, data: bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
