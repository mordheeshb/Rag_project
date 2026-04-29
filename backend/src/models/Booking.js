const mongoose = require('mongoose');

/**
 * Valid booking status transitions:
 * pending → accepted → en_route → arrived → completed
 * Any state → cancelled (by either party)
 */
const VALID_TRANSITIONS = {
  pending:    ['accepted', 'cancelled'],
  accepted:   ['en_route', 'cancelled'],
  en_route:   ['arrived', 'cancelled'],
  arrived:    ['completed', 'cancelled'],
  completed:  [], // Terminal state
  cancelled:  [], // Terminal state
};

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    technicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    serviceType: {
      type: String,
      enum: ['plumber', 'electrician', 'ac_repair', 'carpenter', 'painter', 'appliance_repair', 'mason', 'cleaner'],
      required: true,
    },
    status: {
      type: String,
      enum: Object.keys(VALID_TRANSITIONS),
      default: 'pending',
    },
    // Location of the user at booking time
    userLocation: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, default: '' },
    },
    // Estimated time of arrival at booking creation (minutes)
    eta: {
      type: Number,
      default: null,
    },
    // Distance from technician to user (km) at booking time
    distanceKm: {
      type: Number,
      default: null,
    },
    // Problem description from the user
    description: {
      type: String,
      default: '',
      maxlength: 500,
    },
    // Industrial safety & audit fields
    safetyChecklist: [
      {
        task: { type: String, required: true },
        isCompleted: { type: Boolean, default: false },
        completedAt: { type: Date, default: null },
      }
    ],
    auditTrail: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        note: { type: String, default: '' },
      }
    ],
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

/**
 * Instance method to validate and apply a status transition.
 * Enforces the state machine — throws on invalid transitions.
 */
bookingSchema.methods.transitionTo = function (newStatus, note = '') {
  const allowed = VALID_TRANSITIONS[this.status];
  if (!allowed.includes(newStatus)) {
    const err = new Error(
      `Invalid transition: ${this.status} → ${newStatus}. Allowed: [${allowed.join(', ')}]`
    );
    err.code = 'INVALID_TRANSITION';
    throw err;
  }
  
  // Record transition in audit trail
  this.auditTrail.push({
    status: newStatus,
    timestamp: new Date(),
    note: note || `Status changed from ${this.status} to ${newStatus}`
  });

  this.status = newStatus;
  if (newStatus === 'completed') this.completedAt = new Date();
  return this;
};

// Export state machine for use in tests
bookingSchema.statics.VALID_TRANSITIONS = VALID_TRANSITIONS;

module.exports = mongoose.model('Booking', bookingSchema);
