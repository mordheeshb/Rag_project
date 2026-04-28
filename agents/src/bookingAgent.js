/**
 * BookingAgent — confirms the best technician match and creates a booking
 * via the backend API.
 *
 * Returns booking confirmation with ETA and technician details.
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

/**
 * Create a booking for the given user and technician.
 *
 * @param {string} userId - MongoDB user ID
 * @param {Object} technician - The best-matched technician object
 * @param {string} serviceType - The requested service
 * @param {number} userLat
 * @param {number} userLng
 * @param {string} description - Problem description
 * @param {string} authToken - JWT token for the user
 */
export async function confirmBooking(userId, technician, serviceType, userLat, userLng, description, authToken) {
  const resp = await fetch(`${BACKEND_URL}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      technicianId: technician._id || technician.id,
      serviceType,
      userLat,
      userLng,
      description: description || '',
    }),
  });

  const data = await resp.json();

  if (!data.success) {
    const err = new Error(data.message || 'Booking creation failed');
    err.code = 'BOOKING_FAILED';
    throw err;
  }

  return {
    bookingId: data.data._id,
    status: data.data.status,
    eta: data.data.eta,
    distanceKm: data.data.distanceKm,
    technician: {
      id: technician._id || technician.id,
      name: technician.name,
      rating: technician.rating,
      skills: technician.skills,
    },
  };
}
