import { LatLng, AreaMeasurements } from "@/types";

// Earth's radius in meters
const EARTH_RADIUS = 6371000;

// Convert degrees to radians
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Calculate distance between two points using Haversine formula
export function calculateDistance(point1: LatLng, point2: LatLng): number {
  const lat1 = toRadians(point1.lat);
  const lat2 = toRadians(point2.lat);
  const deltaLat = toRadians(point2.lat - point1.lat);
  const deltaLng = toRadians(point2.lng - point1.lng);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS * c; // Distance in meters
}

// Calculate perimeter of a polygon
export function calculatePerimeter(points: LatLng[]): number {
  if (points.length < 2) return 0;

  let perimeter = 0;
  for (let i = 0; i < points.length; i++) {
    const nextIndex = (i + 1) % points.length;
    perimeter += calculateDistance(points[i], points[nextIndex]);
  }

  return perimeter;
}

// Calculate area of a polygon using Shoelace formula with spherical correction
export function calculatePolygonArea(points: LatLng[]): number {
  if (points.length < 3) return 0;

  // For small areas, we can use a simple planar approximation
  // Convert to a local coordinate system centered on the centroid
  const centroid = {
    lat: points.reduce((sum, p) => sum + p.lat, 0) / points.length,
    lng: points.reduce((sum, p) => sum + p.lng, 0) / points.length,
  };

  // Convert points to meters relative to centroid
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng =
    111320 * Math.cos(toRadians(centroid.lat));

  const localPoints = points.map((p) => ({
    x: (p.lng - centroid.lng) * metersPerDegreeLng,
    y: (p.lat - centroid.lat) * metersPerDegreeLat,
  }));

  // Shoelace formula
  let area = 0;
  for (let i = 0; i < localPoints.length; i++) {
    const j = (i + 1) % localPoints.length;
    area += localPoints[i].x * localPoints[j].y;
    area -= localPoints[j].x * localPoints[i].y;
  }

  return Math.abs(area) / 2;
}

// Convert square meters to square feet
export function sqmToSqft(sqm: number): number {
  return sqm * 10.7639;
}

// Convert meters to feet
export function metersToFeet(meters: number): number {
  return meters * 3.28084;
}

// Get all measurements for an area
export function getMeasurements(points: LatLng[]): AreaMeasurements {
  const area = calculatePolygonArea(points);
  const perimeter = calculatePerimeter(points);

  return {
    area: Math.round(area * 100) / 100,
    perimeter: Math.round(perimeter * 100) / 100,
    areaFt: Math.round(sqmToSqft(area) * 100) / 100,
    perimeterFt: Math.round(metersToFeet(perimeter) * 100) / 100,
  };
}

// Format area for display
export function formatArea(area: number, isMetric: boolean = true): string {
  if (isMetric) {
    return `${area.toLocaleString()} m²`;
  }
  return `${area.toLocaleString()} ft²`;
}

// Format distance for display
export function formatDistance(
  distance: number,
  isMetric: boolean = true
): string {
  if (isMetric) {
    if (distance >= 1000) {
      return `${(distance / 1000).toFixed(2)} km`;
    }
    return `${distance.toFixed(2)} m`;
  }
  if (distance >= 5280) {
    return `${(distance / 5280).toFixed(2)} mi`;
  }
  return `${distance.toFixed(2)} ft`;
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
  }).format(amount);
}
