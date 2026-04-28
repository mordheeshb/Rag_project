/**
 * Integration tests for Bookings API.
 * Tests: create booking, get booking, status update (state machine).
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

let app, User, Booking;
let userToken, userId, technicianId;

beforeAll(async () => {
  process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/itb_test';
  process.env.JWT_SECRET = 'test_secret_only';
  process.env.NODE_ENV = 'test';

  const mod = require('../../backend/src/index');
  app = mod.app;
  User = require('../../backend/src/models/User');
  Booking = require('../../backend/src/models/Booking');

  // Create test user
  const user = await User.create({
    name: 'Booking Test User',
    email: `booking_user_${Date.now()}@itb_test.dev`,
    password: 'Password123',
    role: 'user',
    location: { lat: 13.0827, lng: 80.2707 },
  });
  userId = user._id.toString();
  userToken = jwt.sign({ id: userId }, 'test_secret_only', { expiresIn: '1h' });

  // Create test technician
  const tech = await User.create({
    name: 'Booking Test Tech',
    email: `booking_tech_${Date.now()}@itb_test.dev`,
    password: 'Password123',
    role: 'technician',
    skills: ['plumber'],
    isAvailable: true,
    rating: 4.5,
    location: { lat: 13.09, lng: 80.27 },
  });
  technicianId = tech._id.toString();
});

afterAll(async () => {
  await User.deleteMany({ email: /itb_test/ });
  await Booking.deleteMany({});
  await mongoose.disconnect();
});

let createdBookingId;

describe('POST /api/bookings', () => {
  test('should create a booking with valid data', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        technicianId,
        serviceType: 'plumber',
        userLat: 13.0827,
        userLng: 80.2707,
        description: 'Kitchen tap is leaking',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('pending');
    createdBookingId = res.body.data._id;
  });

  test('should reject if technician skill does not match service', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        technicianId,
        serviceType: 'electrician', // Technician is only a plumber
        userLat: 13.0827,
        userLng: 80.2707,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('should reject booking without auth token', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({ technicianId, serviceType: 'plumber', userLat: 13.0827, userLng: 80.2707 });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/bookings/:id', () => {
  test('should return booking details', async () => {
    const res = await request(app)
      .get(`/api/bookings/${createdBookingId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(createdBookingId);
    expect(res.body.data.serviceType).toBe('plumber');
  });
});

describe('PATCH /api/bookings/:id/status', () => {
  let techToken;
  beforeAll(() => {
    techToken = jwt.sign({ id: technicianId }, 'test_secret_only', { expiresIn: '1h' });
  });

  test('technician can update status to accepted', async () => {
    const res = await request(app)
      .patch(`/api/bookings/${createdBookingId}/status`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({ status: 'accepted' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('accepted');
  });

  test('should reject invalid transition (accepted → completed directly)', async () => {
    const res = await request(app)
      .patch(`/api/bookings/${createdBookingId}/status`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({ status: 'completed' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Invalid transition/i);
  });
});
