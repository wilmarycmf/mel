/**
 * GlobalPulse — geographic projection for the Living World SVG globe.
 *
 * The globe is a sphere projected onto an SVG plane. A rotation in degrees
 * (longitude) and a tilt in degrees (latitude-axis pitch) determine which
 * hemisphere faces the viewer; markers whose longitude crosses the seam
 * wrap rather than jump.
 *
 * Coordinates always come from the server. Nothing in this file asserts a
 * geographic claim; only the math.
 */

export interface ProjectedPoint {
  x: number;
  y: number;
  /** Visible on the front hemisphere (facing > -0.02). */
  visible: boolean;
  /** 0..1 — 1 at the centre of the visible disc, 0 at the limb. */
  facing: number;
  /** Depth 0..1 — closer to the camera = larger; used for marker draw order. */
  depth: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function wrapLongitude(lon: number): number {
  let value = ((lon + 180) % 360 + 360) % 360 - 180;
  if (value === -180) value = 180;
  return value;
}

/**
 * Sphere projection on a circular SVG disc.
 *
 * Treats the globe as a sphere of radius `radius` centred at (cx, cy). The
 * viewer looks straight down +Z; `rotation` rotates the sphere about Y;
 * `tilt` rotates it about X (limited to ±25° in the UI).
 */
export function projectPoint(
  latitude: number,
  longitude: number,
  rotation: number,
  tilt: number,
  width: number,
  height: number,
  radius: number,
): ProjectedPoint {
  const cx = width / 2;
  const cy = height / 2;

  // Clamp inputs so out-of-range server data doesn't blow up.
  const latRad = (clamp(latitude, -90, 90) * Math.PI) / 180;
  const lonRad = (wrapLongitude(longitude - rotation) * Math.PI) / 180;
  const tiltRad = (clamp(tilt, -90, 90) * Math.PI) / 180;

  // Spherical → Cartesian, then tilt around X, then orthographic project.
  const cosLat = Math.cos(latRad);
  const x0 = cosLat * Math.sin(lonRad);
  const y0 = Math.sin(latRad);
  const z0 = cosLat * Math.cos(lonRad);

  // Tilt (rotate around X): y' = y cosθ - z sinθ, z' = y sinθ + z cosθ.
  const cosT = Math.cos(tiltRad);
  const sinT = Math.sin(tiltRad);
  const y = y0 * cosT - z0 * sinT;
  const z = y0 * sinT + z0 * cosT;

  const visible = z > -0.02; // hide just past the limb
  // The disc projects a sphere of radius `radius`; we multiply by radius so
  // the sphere occupies roughly the inner area of the viewBox.
  const x = cx + x0 * radius;
  const yPx = cy - y * radius;
  const facing = (z + 1) / 2; // 0..1
  return { x, y: yPx, visible, facing, depth: facing };
}

export interface LatLon {
  latitude: number;
  longitude: number;
}