require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

/**
 * Seed script: populates the database with 10 realistic mock technicians
 * distributed around Chennai, India (Base: 13.0827° N, 80.2707° E).
 *
 * Run: npm run seed (from /backend directory)
 */

// Small coordinate offsets to spread technicians around the city (±0.1° ≈ ±11km)
const technicians = [
  { name: 'Rajan Kumar',     email: 'rajan@itb.dev',    skills: ['plumber', 'mason'],             lat: 13.0900, lng: 80.2750, rating: 4.8, isAvailable: true  },
  { name: 'Selvam Murugan',  email: 'selvam@itb.dev',   skills: ['electrician'],                  lat: 13.0750, lng: 80.2600, rating: 4.5, isAvailable: true  },
  { name: 'Deepa Krishnan',  email: 'deepa@itb.dev',    skills: ['ac_repair', 'appliance_repair'],lat: 13.0980, lng: 80.2900, rating: 4.9, isAvailable: true  },
  { name: 'Venkat Raj',      email: 'venkat@itb.dev',   skills: ['carpenter', 'painter'],         lat: 13.0650, lng: 80.2550, rating: 4.3, isAvailable: false },
  { name: 'Priya Sundar',    email: 'priya@itb.dev',    skills: ['cleaner'],                      lat: 13.1050, lng: 80.2800, rating: 4.6, isAvailable: true  },
  { name: 'Manikandan S',    email: 'mani@itb.dev',     skills: ['plumber', 'mason'],             lat: 13.0720, lng: 80.2700, rating: 4.2, isAvailable: true  },
  { name: 'Suresh Babu',     email: 'suresh@itb.dev',   skills: ['electrician', 'appliance_repair'],lat: 13.0860,lng: 80.2650, rating: 4.7, isAvailable: true  },
  { name: 'Kavitha Nair',    email: 'kavitha@itb.dev',  skills: ['painter', 'cleaner'],           lat: 13.0940, lng: 80.2500, rating: 4.4, isAvailable: true  },
  { name: 'Arjun Pillai',    email: 'arjun@itb.dev',    skills: ['ac_repair'],                    lat: 13.0800, lng: 80.2850, rating: 4.8, isAvailable: false },
  { name: 'Lakshmi Devi',    email: 'lakshmi@itb.dev',  skills: ['carpenter'],                    lat: 13.1000, lng: 80.2600, rating: 4.1, isAvailable: true  },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Clear existing technician accounts (keep user accounts)
  await User.deleteMany({ role: 'technician' });
  console.log('🗑️  Cleared existing technicians');

  const hashedPassword = await bcrypt.hash('Tech@1234', 12);

  const created = await User.insertMany(
    technicians.map((t) => ({
      ...t,
      password: hashedPassword,
      role: 'technician',
      location: { lat: t.lat, lng: t.lng },
      totalReviews: Math.floor(Math.random() * 200) + 10,
    }))
  );

  console.log(`✅ Seeded ${created.length} technicians`);
  console.log('Default password for all: Tech@1234');

  await mongoose.disconnect();
  console.log('🔌 Disconnected');
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
