/**
 * Integration tests for Authentication endpoints.
 * Requires backend to be running OR uses supertest against the app directly.
 *
 * Tests: register, login, invalid credentials.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const request = require('supertest');

// Load the app without starting the server (httpServer.listen is in connectDB callback)
// We monkey-patch for testing by importing and using supertest directly
let app;
beforeAll(async () => {
  process.env.MONGO_URI = process.env.MONGO_URI || process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/itb_test';
  process.env.JWT_SECRET = 'test_secret_only';
  process.env.NODE_ENV = 'test';

  // Re-require after setting env vars
  const mod = require('../../backend/src/index');
  app = mod.app;
});

afterAll(async () => {
  const mongoose = require('mongoose');
  await mongoose.connection.db?.dropCollection('users').catch(() => {});
  await mongoose.disconnect();
});

const testEmail = `test_${Date.now()}@itb.dev`;

describe('POST /api/auth/register', () => {
  test('should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: testEmail, password: 'Password123' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body.user.password).toBeUndefined(); // Never expose password
  });

  test('should reject duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User 2', email: testEmail, password: 'Password123' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test('should reject invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Bad User', email: 'not-an-email', password: 'Password123' });

    expect(res.status).toBe(422);
    expect(res.body.errors).toBeDefined();
  });

  test('should reject weak password (<6 chars)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Weak Pass', email: 'weak@itb.dev', password: '123' });

    expect(res.status).toBe(422);
  });
});

describe('POST /api/auth/login', () => {
  test('should login and return JWT for valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'Password123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/); // JWT format
  });

  test('should reject wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'WrongPassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('should reject non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@itb.dev', password: 'Password123' });

    expect(res.status).toBe(401);
  });
});
