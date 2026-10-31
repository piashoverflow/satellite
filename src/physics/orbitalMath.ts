import {
  EARTH_RADIUS,
  EARTH_ROTATION_RATE,
  MU_EARTH,
} from './constants';
import { Vector3D } from './types';

/**
 * Computes circular orbital speed (km/s) at radius r (km)
 */
export function getCircularVelocity(radiusKm: number): number {
  return Math.sqrt(MU_EARTH / radiusKm);
}

/**
 * Computes circular orbital period in seconds at radius r (km)
 */
export function getOrbitalPeriod(radiusKm: number): number {
  return 2 * Math.PI * Math.sqrt(Math.pow(radiusKm, 3) / MU_EARTH);
}

/**
 * Vis-Viva equation: velocity at radius r in an orbit with semi-major axis a
 */
export function getVisVivaVelocity(rKm: number, aKm: number): number {
  return Math.sqrt(Math.max(0, MU_EARTH * (2 / rKm - 1 / aKm)));
}

/**
 * Computes Hohmann transfer parameters between circular orbits r1 and r2
 */
export function calculateHohmann(r1Km: number, r2Km: number) {
  const v1 = getCircularVelocity(r1Km);
  const v2 = getCircularVelocity(r2Km);
  const a_tx = (r1Km + r2Km) / 2;
  
  // Velocity at periapsis of transfer ellipse
  const v_periapsis = Math.sqrt(MU_EARTH * (2 / r1Km - 1 / a_tx));
  const deltaV1 = v_periapsis - v1;

  // Velocity at apoapsis of transfer ellipse
  const v_apoapsis = Math.sqrt(MU_EARTH * (2 / r2Km - 1 / a_tx));
  const deltaV2 = v2 - v_apoapsis;

  const deltaVTotal = Math.abs(deltaV1) + Math.abs(deltaV2);
  const transferDuration = Math.PI * Math.sqrt(Math.pow(a_tx, 3) / MU_EARTH); // half period

  // Specific energies (MJ / kg)
  const e1 = -MU_EARTH / (2 * r1Km);
  const e_tx = -MU_EARTH / (2 * a_tx);
  const e2 = -MU_EARTH / (2 * r2Km);

  return {
    v1,
    v2,
    a_tx,
    v_periapsis,
    v_apoapsis,
    deltaV1,
    deltaV2,
    deltaVTotal,
    transferDuration,
    e1,
    e_tx,
    e2,
  };
}

/**
 * Computes theoretical synodic period (seconds) between two circular orbits
 */
export function calculateSynodicPeriod(T1Sec: number, T2Sec: number): number {
  const diff = Math.abs(T1Sec - T2Sec);
  if (diff < 1e-6) return Infinity;
  return (T1Sec * T2Sec) / diff;
}

/**
 * Converts orbital plane coordinates (radius, trueAnomaly, inclination, raan)
 * into 3D Earth-Centered Inertial (ECI) coordinates.
 * x: toward vernal equinox (0 deg longitude at t=0)
 * y: 90 deg East in equatorial plane
 * z: North pole
 */
export function orbitalToECI(
  r: number,
  nu: number, // true anomaly (rad)
  inclination: number, // rad
  raan: number = 0 // rad
): { pos: Vector3D; vel: Vector3D; speed: number } {
  // In orbital plane
  const x_orb = r * Math.cos(nu);
  const y_orb = r * Math.sin(nu);

  // Rotation for inclination and RAAN
  const cosI = Math.cos(inclination);
  const sinI = Math.sin(inclination);
  const cosO = Math.cos(raan);
  const sinO = Math.sin(raan);

  const x = (cosO * x_orb - sinO * y_orb * cosI);
  const y = (sinO * x_orb + cosO * y_orb * cosI);
  const z = y_orb * sinI;

  // Tangential velocity vector
  const vMag = getCircularVelocity(r);
  const vx_orb = -vMag * Math.sin(nu);
  const vy_orb = vMag * Math.cos(nu);

  const vx = (cosO * vx_orb - sinO * vy_orb * cosI);
  const vy = (sinO * vx_orb + cosO * vy_orb * cosI);
  const vz = vy_orb * sinI;

  return {
    pos: { x, y, z },
    vel: { x: vx, y: vy, z: vz },
    speed: vMag
  };
}

/**
 * Converts 3D ECI position and simulation time (t) into Geographic Latitude and Longitude (degrees)
 * taking into account Earth's Greenwich rotation angle.
 */
export function eciToGeodetic(pos: Vector3D, simTimeSec: number, initialGreenwichLonDeg: number = 0): { lat: number; lon: number } {
  const r = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
  if (r < 1e-4) return { lat: 0, lon: 0 };

  // Latitude (-90 to +90 deg)
  const latRad = Math.asin(Math.max(-1, Math.min(1, pos.z / r)));
  const lat = (latRad * 180) / Math.PI;

  // Right Ascension (Inertial Longitude) in rad
  let raRad = Math.atan2(pos.y, pos.x);

  // Earth's rotation angle since t=0
  const greenwichAngleRad = ((initialGreenwichLonDeg * Math.PI) / 180) + (EARTH_ROTATION_RATE * simTimeSec);

  // Longitude relative to Earth surface
  let lonRad = raRad - greenwichAngleRad;
  // Normalize into [-PI, PI]
  lonRad = Math.atan2(Math.sin(lonRad), Math.cos(lonRad));
  const lon = (lonRad * 180) / Math.PI;

  return { lat, lon };
}

/**
 * Computes coverage swath ground diameter (km) on Earth surface
 * for sensor with half-cone angle alphaRad at altitude hKm
 */
export function getGroundCoverageRadius(hKm: number, halfConeAngleDeg: number = 25): number {
  // Angular radius on sphere theta
  const alpha = (halfConeAngleDeg * Math.PI) / 180;
  const sinAlpha = Math.sin(alpha);
  const rRatio = (EARTH_RADIUS + hKm) / EARTH_RADIUS;
  // Using sine rule: sin(psi) = rRatio * sin(alpha)
  const psi = Math.asin(Math.min(1, rRatio * sinAlpha));
  const centralAngle = psi - alpha;
  return centralAngle * EARTH_RADIUS;
}

/**
 * Solves Kepler's Equation M = E - e*sin(E) for Eccentric Anomaly E (radians)
 * using Newton-Raphson iteration.
 */
export function solveKepler(M: number, e: number): number {
  let mNorm = M % (2 * Math.PI);
  if (mNorm < 0) mNorm += 2 * Math.PI;

  let E = mNorm;
  for (let i = 0; i < 7; i++) {
    const f = E - e * Math.sin(E) - mNorm;
    const fPrime = 1 - e * Math.cos(E);
    const delta = f / fPrime;
    E -= delta;
    if (Math.abs(delta) < 1e-7) break;
  }
  return E;
}

/**
 * Given eccentric anomaly E and eccentricity e, computes true anomaly nu in [0, 2*PI)
 */
export function eccentricToTrueAnomaly(E: number, e: number): number {
  const beta = e / (1 + Math.sqrt(Math.max(0, 1 - e * e)));
  const nu = E + 2 * Math.atan((beta * Math.sin(E)) / (1 - beta * Math.cos(E)));
  let nuNorm = nu % (2 * Math.PI);
  if (nuNorm < 0) nuNorm += 2 * Math.PI;
  return nuNorm;
}

/**
 * Generates points along an elliptical orbit oriented at periapsis angle omega
 */
export function generateEllipsePath(
  aKm: number,
  e: number,
  omegaPeriapsisRad: number,
  numPoints: number = 80
): Vector3D[] {
  const points: Vector3D[] = [];
  for (let i = 0; i <= numPoints; i++) {
    const nu = (i / numPoints) * 2 * Math.PI;
    const r = (aKm * (1 - e * e)) / (1 + e * Math.cos(nu));
    const angle = omegaPeriapsisRad + nu;
    points.push({
      x: r * Math.cos(angle),
      y: r * Math.sin(angle),
      z: 0,
    });
  }
  return points;
}
