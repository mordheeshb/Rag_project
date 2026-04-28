import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import mongoose from 'mongoose';

// ─── Inline Mongoose models (avoid importing from backend) ────────────────────

const userSchema = new mongoose.Schema({
  name: String, email: String, role: String,
  skills: [String], rating: Number, isAvailable: Boolean,
  location: { lat: Number, lng: Number },
});
const User = mongoose.models.User || mongoose.model('User', userSchema);

const bookingSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  technicianId: mongoose.Schema.Types.ObjectId,
  serviceType: String,
  status: { type: String, default: 'pending' },
  userLocation: { lat: Number, lng: Number },
  eta: Number,
}, { timestamps: true });
const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);

// ─── Haversine helper ─────────────────────────────────────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371, toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ─── Connect to MongoDB ───────────────────────────────────────────────────────
let uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/itb_mcp';
if (uri.includes('localhost') || uri.includes('127.0.0.1')) {
  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    uri = mongod.getUri();
    console.error('[MCP] Using In-Memory MongoDB');
  } catch (err) {
    console.error('[MCP] Failed to start In-Memory MongoDB, falling back to local connection');
  }
}

try {
  await mongoose.connect(uri);
  console.error('[MCP] Connected to MongoDB');
} catch (err) {
  console.error('[MCP] MongoDB connection error:', err.message);
}

// ─── Create MCP Server ────────────────────────────────────────────────────────
const server = new McpServer({
  name: 'instant-technician-booker',
  version: '1.0.0',
});

/**
 * Tool: find_technicians
 * Queries MongoDB for available technicians matching the requested skill,
 * then computes distance from the user's coordinates.
 */
server.tool(
  'find_technicians',
  'Find nearby available technicians for a specific skill/service',
  {
    skill: z.string().describe('Service type: plumber, electrician, ac_repair, carpenter, painter, appliance_repair, mason, cleaner'),
    lat: z.number().describe('User latitude'),
    lng: z.number().describe('User longitude'),
    maxKm: z.number().optional().default(50).describe('Maximum distance in km (default: 50)'),
  },
  async ({ skill, lat, lng, maxKm }) => {
    const techs = await User.find({ role: 'technician', isAvailable: true, skills: skill });
    const results = techs
      .filter(t => t.location?.lat && t.location?.lng)
      .map(t => ({
        id: t._id.toString(),
        name: t.name,
        skills: t.skills,
        rating: t.rating,
        distanceKm: parseFloat(haversine(lat, lng, t.location.lat, t.location.lng).toFixed(2)),
        etaMinutes: Math.ceil(haversine(lat, lng, t.location.lat, t.location.lng) / 30 * 60),
      }))
      .filter(t => t.distanceKm <= maxKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ count: results.length, technicians: results }, null, 2),
      }],
    };
  }
);

/**
 * Tool: create_booking
 * Creates a booking record in MongoDB.
 */
server.tool(
  'create_booking',
  'Create a new booking between a user and technician',
  {
    userId: z.string().describe('MongoDB ObjectId of the user'),
    technicianId: z.string().describe('MongoDB ObjectId of the technician'),
    serviceType: z.string().describe('Service type requested'),
    userLat: z.number().describe('User latitude'),
    userLng: z.number().describe('User longitude'),
  },
  async ({ userId, technicianId, serviceType, userLat, userLng }) => {
    const tech = await User.findById(technicianId);
    if (!tech) {
      return { content: [{ type: 'text', text: JSON.stringify({ error: 'Technician not found' }) }] };
    }
    const distanceKm = haversine(userLat, userLng, tech.location.lat, tech.location.lng);
    const eta = Math.ceil(distanceKm / 30 * 60);

    const booking = await Booking.create({
      userId, technicianId, serviceType,
      userLocation: { lat: userLat, lng: userLng },
      eta, distanceKm: parseFloat(distanceKm.toFixed(2)),
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ bookingId: booking._id, status: booking.status, eta }, null, 2),
      }],
    };
  }
);

/**
 * Tool: get_booking_status
 * Returns the current status and details of a booking.
 */
server.tool(
  'get_booking_status',
  'Get the current status of a booking by its ID',
  { bookingId: z.string().describe('MongoDB ObjectId of the booking') },
  async ({ bookingId }) => {
    const booking = await Booking.findById(bookingId)
      .populate('technicianId', 'name rating')
      .populate('userId', 'name');
    if (!booking) {
      return { content: [{ type: 'text', text: JSON.stringify({ error: 'Booking not found' }) }] };
    }
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          id: booking._id,
          status: booking.status,
          serviceType: booking.serviceType,
          eta: booking.eta,
          user: booking.userId?.name,
          technician: booking.technicianId?.name,
          createdAt: booking.createdAt,
        }, null, 2),
      }],
    };
  }
);

/**
 * Tool: list_available_skills
 * Returns all supported service categories.
 */
server.tool(
  'list_available_skills',
  'List all available service categories on the platform',
  {},
  async () => {
    const skills = ['plumber', 'electrician', 'ac_repair', 'carpenter', 'painter', 'appliance_repair', 'mason', 'cleaner'];
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ skills, count: skills.length }, null, 2),
      }],
    };
  }
);

// ─── Start server over stdio transport ────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('[MCP] Instant Technician Booker MCP server ready (stdio)');
