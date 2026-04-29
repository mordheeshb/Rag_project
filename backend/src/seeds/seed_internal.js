const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const logger = require('../utils/logger');

const technicians = [
  { name: 'Rajan Kumar',     email: 'rajan@itb.dev',    skills: ['plumber', 'mason'],             lat: 13.0900, lng: 80.2750, rating: 4.8, isAvailable: true, certifications: ['ISO-9001'], experienceYears: 12 },
  { name: 'Selvam Murugan',  email: 'selvam@itb.dev',   skills: ['electrician'],                  lat: 13.0750, lng: 80.2600, rating: 4.5, isAvailable: true, certifications: ['Licensed-Electrician'], experienceYears: 8 },
  { name: 'Deepa Krishnan',  email: 'deepa@itb.dev',    skills: ['ac_repair', 'appliance_repair'],lat: 13.0980, lng: 80.2900, rating: 4.9, isAvailable: true, certifications: ['HVAC-Expert'], experienceYears: 15 },
  { name: 'Vikram Singh',    email: 'vikram@itb.dev',   skills: ['industrial_electrician'],       lat: 13.0650, lng: 80.2550, rating: 4.9, isAvailable: true, certifications: ['OSHA-30', 'Hazard-Certified'], experienceYears: 20 },
  { name: 'Priya Sundar',    email: 'priya@itb.dev',    skills: ['cleaner'],                      lat: 13.1050, lng: 80.2800, rating: 4.6, isAvailable: true, certifications: ['Sanitary-Lead'], experienceYears: 5 },
  { name: 'Amit Shah',       email: 'amit@itb.dev',     skills: ['hvac_industrial', 'welder'],    lat: 13.0720, lng: 80.2700, rating: 4.7, isAvailable: true, certifications: ['ISO-14001', 'Welding-Grade-A'], experienceYears: 18 },
  { name: 'Suresh Babu',     email: 'suresh@itb.dev',   skills: ['electrician', 'appliance_repair'],lat: 13.0860,lng: 80.2650, rating: 4.7, isAvailable: true, certifications: ['Domestic-Tech'], experienceYears: 10 },
  { name: 'Kavitha Nair',    email: 'kavitha@itb.dev',  skills: ['painter', 'cleaner'],           lat: 13.0940, lng: 80.2500, rating: 4.4, isAvailable: true, certifications: [], experienceYears: 6 },
];

const customers = [
  { name: 'Demo Customer', email: 'customer@itb.dev', password: 'User@1234', role: 'user', lat: 13.0827, lng: 80.2707 },
];

async function seedInternal() {
  try {
    // Clear existing accounts
    await User.deleteMany({});
    
    const techPassword = await bcrypt.hash('Tech@1234', 12);
    const userPassword = await bcrypt.hash('User@1234', 12);

    // Seed Technicians
    const seededTechs = await User.insertMany(
      technicians.map((t) => ({
        ...t,
        password: techPassword,
        role: 'technician',
        location: { lat: t.lat, lng: t.lng },
        totalReviews: Math.floor(Math.random() * 200) + 10,
      }))
    );

    // Seed Customers
    const seededUsers = await User.insertMany(
      customers.map((c) => ({
        ...c,
        password: userPassword,
        location: { lat: c.lat, lng: c.lng },
      }))
    );

    logger.info(`✅ Seeded ${seededTechs.length} technicians and ${seededUsers.length} customers into in-memory database`);
  } catch (err) {
    logger.error('Internal seed failed:', { error: err.message });
  }
}

module.exports = { seedInternal };
