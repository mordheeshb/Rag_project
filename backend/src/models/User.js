const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false, // Never return password in queries by default
    },
    role: {
      type: String,
      enum: ['user', 'technician'],
      default: 'user',
    },
    // Geographic location of user / technician's home base
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    // Only relevant for technicians
    skills: {
      type: [String],
      enum: ['plumber', 'electrician', 'ac_repair', 'carpenter', 'painter', 'appliance_repair', 'mason', 'cleaner'],
      default: [],
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 4.0,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    // Profile photo URL (optional)
    photoUrl: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Never expose password in JSON responses
userSchema.set('toJSON', {
  transform: (_, ret) => {
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
