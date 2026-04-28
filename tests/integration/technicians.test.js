/**
 * Integration tests for GET /api/technicians/nearby
 * Seeds 2 technicians and verifies filtering by skill, distance, and count.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const request = require('supertest');
const mongoose = require('mongoose');

let app;
let User;

beforeAll(async () => {
  process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/itb_test';
  process.env.JWT_SECRET = 'test_secret_only';
  process.env.NODE_ENV = 'test';

  const mod = require('../../backend/src/index');
  app = mod.app;
  User = require('../../backend/src/models/User');

  // Seed test technicians around Chennai
  await User.deleteMany({ role: 'technician', email: /itb_test/ });
  await User.create([
    {
      name: 'Test Plumber',
      email: 'plumber@itb_test.dev',
      password: 'hashed',
      role: 'technician',
      skills: ['plumber'],
      isAvailable: true,
      rating: 4.5,
      location: { lat: 13.09, lng: 80.27 }, // ~1km from base
    },
    {
      name: 'Test Electrician',
      email: 'elec@itb_test.dev',
      password: 'hashed',
      role: 'technician',
      skills: ['electrician'],
      isAvailable: true,
      rating: 4.2,
      location: { lat: 13.07, lng: 80.26 }, // ~3km from base
    },
    {
      name: 'Far Away Tech',
      email: 'far@itb_test.dev',
      password: 'hashed',
      role: 'technician',
      skills: ['plumber'],
      isAvailable: true,
      rating: 4.0,
      location: { lat: 14.0, lng: 80.0 }, // ~100km away
    },
  ]);
});

afterAll(async () => {
  await User.deleteMany({ email: /itb_test/ });
  await mongoose.disconnect();
});

// Base: Chennai center
const BASE_LAT = 13.0827;
const BASE_LNG = 80.2707;

describe('GET /api/technicians/nearby', () => {
  test('should return nearby technicians within 50km by default', async () => {
    const res = await request(app)
      .get(`/api/technicians/nearby?lat=${BASE_LAT}&lng=${BASE_LNG}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Should include the 2 close technicians, not the far one
    const names = res.body.data.map(t => t.name);
    expect(names).toContain('Test Plumber');
    expect(names).toContain('Test Electrician');
    expect(names).not.toContain('Far Away Tech');
  });

  test('should filter by skill', async () => {
    const res = await request(app)
      .get(`/api/technicians/nearby?lat=${BASE_LAT}&lng=${BASE_LNG}&skill=plumber`);

    expect(res.status).toBe(200);
    expect(res.body.data.every(t => t.skills.includes('plumber'))).toBe(true);
  });

  test('should return 400 if lat/lng are missing', async () => {
    const res = await request(app).get('/api/technicians/nearby');
    expect(res.status).toBe(400);
  });

  test('should include distanceKm and etaMinutes in response', async () => {
    const res = await request(app)
      .get(`/api/technicians/nearby?lat=${BASE_LAT}&lng=${BASE_LNG}&skill=electrician`);

    expect(res.status).toBe(200);
    expect(res.body.data[0].distanceKm).toBeDefined();
    expect(res.body.data[0].etaMinutes).toBeDefined();
  });

  test('should sort by distance ascending', async () => {
    const res = await request(app)
      .get(`/api/technicians/nearby?lat=${BASE_LAT}&lng=${BASE_LNG}`);

    const distances = res.body.data.map(t => t.distanceKm);
    for (let i = 1; i < distances.length; i++) {
      expect(distances[i]).toBeGreaterThanOrEqual(distances[i - 1]);
    }
  });
});
