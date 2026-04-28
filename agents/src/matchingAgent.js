/**
 * MatchingAgent — fetches available technicians via the backend API
 * and ranks them by a weighted score:
 *   distance:     40% weight  (lower is better, normalized to 0–1)
 *   rating:       40% weight  (higher is better, normalized to 0–1)
 *   availability: 20% weight  (isAvailable=true gets 1.0, false gets 0)
 *
 * Guardrail: rejects if no technician found within MAX_DISTANCE_KM.
 */

const MAX_DISTANCE_KM = 50;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

/**
 * Fetches candidates from the backend and returns the ranked list.
 *
 * @param {string} serviceType - e.g. 'plumber'
 * @param {number} userLat
 * @param {number} userLng
 * @returns {{ rankedTechnicians: Array, bestMatch: Object }}
 */
export async function findAndRank(serviceType, userLat, userLng) {
  // Fetch from backend API (avoids DB duplication in agent layer)
  const url = `${BACKEND_URL}/api/technicians/nearby?lat=${userLat}&lng=${userLng}&skill=${serviceType}&maxKm=${MAX_DISTANCE_KM}`;
  const resp = await fetch(url);
  const data = await resp.json();

  if (!data.success || data.count === 0) {
    const err = new Error(
      `No technician available for '${serviceType}' within ${MAX_DISTANCE_KM}km of your location.`
    );
    err.code = 'NO_TECHNICIAN_FOUND';
    throw err;
  }

  const candidates = data.data;

  // Normalize values for scoring
  const maxDist = Math.max(...candidates.map(t => t.distanceKm));
  const minRating = Math.min(...candidates.map(t => t.rating));
  const maxRating = Math.max(...candidates.map(t => t.rating));
  const ratingRange = maxRating - minRating || 1;

  const ranked = candidates.map(t => {
    const distScore   = 1 - (t.distanceKm / maxDist);            // 0=far, 1=close
    const ratingScore = (t.rating - minRating) / ratingRange;    // 0=low, 1=high
    const availScore  = t.isAvailable ? 1 : 0;

    const weightedScore =
      0.4 * distScore +
      0.4 * ratingScore +
      0.2 * availScore;

    return { ...t, weightedScore: parseFloat(weightedScore.toFixed(4)) };
  });

  // Sort by weighted score descending
  ranked.sort((a, b) => b.weightedScore - a.weightedScore);

  return { rankedTechnicians: ranked, bestMatch: ranked[0] };
}
