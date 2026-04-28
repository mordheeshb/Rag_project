const mongoose = require('mongoose');
const logger = require('../utils/logger');

let mongod = null;

/**
 * Connects to MongoDB.
 * If URI is localhost, falls back to MongoMemoryServer for a zero-config experience.
 */
async function connectDB() {
  try {
    let uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/itb_dev';

    // Zero-config: Use In-Memory MongoDB if pointing to localhost and not connected
    if (uri.includes('localhost') || uri.includes('127.0.0.1')) {
      if (!mongod) {
        try {
          const { MongoMemoryServer } = require('mongodb-memory-server');
          mongod = await MongoMemoryServer.create();
          uri = mongod.getUri();
          logger.info('🚀 Starting In-Memory MongoDB for zero-config development');
        } catch (err) {
          logger.warn('Failed to start mongodb-memory-server, falling back to localhost connection...', { error: err.message });
        }
      } else {
        uri = mongod.getUri();
      }
    }

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info(`MongoDB connected: ${conn.connection.host}`);
    
    // Proactively seed if using memory server
    if (mongod) {
      logger.info('🌱 Auto-seeding in-memory database...');
      const { seedInternal } = require('../seeds/seed_internal');
      await seedInternal();
    }
  } catch (err) {
    logger.error('MongoDB connection failed', { error: err.message });
    process.exit(1);
  }
}

// Log on connection events
mongoose.connection.on('disconnected', () =>
  logger.warn('MongoDB disconnected — retrying...')
);
mongoose.connection.on('reconnected', () =>
  logger.info('MongoDB reconnected')
);

module.exports = connectDB;
