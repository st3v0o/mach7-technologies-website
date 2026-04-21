const EARTH_RADIUS_MILES = 3958.8;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Calculate the great-circle distance in miles between two GPS coordinates
 * using the Haversine formula (point-to-point).
 */
function haversinePointMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MILES * c;
}

/**
 * Sum haversine distances over an ordered array of [lat, lon] coordinate pairs.
 * Returns total route distance in miles.
 *
 * TODO: Replace with PostGIS ST_Length once PostGIS is added for large-session
 * performance improvements.
 */
export function haversineDistanceMiles(coords: Array<[number, number]>): number {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const [lat1, lon1] = coords[i - 1]!;
    const [lat2, lon2] = coords[i]!;
    total += haversinePointMiles(lat1, lon1, lat2, lon2);
  }
  return total;
}

/**
 * Build a GeoJSON LineString from an ordered array of [lat, lon] pairs.
 * GeoJSON coordinates are [lon, lat] per the spec.
 */
export function buildLineString(
  coords: Array<[number, number]>,
): GeoJSONLineString | null {
  if (coords.length < 2) return null;
  return {
    type: "LineString",
    coordinates: coords.map(([lat, lon]) => [lon, lat]),
  };
}

export interface GeoJSONLineString {
  type: "LineString";
  coordinates: Array<[number, number]>;
}
