require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const logger = require('./utils/logger');
const { generalLimiter } = require('./middleware/rateLimiter');

// ─── Route imports ────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const technicianRoutes = require('./routes/technicians');
const bookingRoutes = require('./routes/bookings');
const metricsRoutes = require('./routes/metrics');

const app = express();
const httpServer = http.createServer(app);

// ─── Socket.IO setup ──────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Make io accessible from routes via req.app.get('io')
app.set('io', io);

io.on('connection', (socket) => {
  logger.info('Socket connected', { socketId: socket.id });

  // Technician sends live location updates
  socket.on('technician:location_update', (data) => {
    // Broadcast to all clients tracking this booking
    socket.broadcast.emit('technician:location_update', data);
    logger.info('Location update', { bookingId: data.bookingId, lat: data.lat, lng: data.lng });
  });

  socket.on('disconnect', () => {
    logger.info('Socket disconnected', { socketId: socket.id });
  });
});

// ─── Core middleware ──────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Morgan HTTP logger — pipes to Winston
app.use(
  morgan(':method :url :status :res[content-length] - :response-time ms', {
    stream: { write: (msg) => logger.info(msg.trim(), { type: 'http' }) },
  })
);

// Apply general rate limiter to all routes
app.use(generalLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/technicians', technicianRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/metrics', metricsRoutes);

// ─── 404 & Global error handler ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

app.use((err, req, res, _next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ─── Startup ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    logger.info(`ITB Backend running on port ${PORT}`);
    logger.info(`Socket.IO ready`);
  });
});

module.exports = { app, httpServer };
