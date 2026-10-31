/**
 * Planetary and Orbital Constants
 * Physical units: Distances in km, mass in kg, time in seconds, velocities in km/s.
 */

// Earth Constants
export const EARTH_MASS = 5.9722e24; // kg
export const EARTH_RADIUS = 6371.0; // km
export const G_GRAV = 6.67430e-11; // m^3 / (kg * s^2)
// Gravitational parameter mu = G * M in km^3 / s^2
export const MU_EARTH = 398600.4418; // km^3 / s^2

// Earth Rotation
// Sidereal day = 23h 56m 4.0905s = 86164.0905 seconds
export const EARTH_ROTATION_PERIOD = 86164.0905; // seconds
export const EARTH_ROTATION_RATE = (2 * Math.PI) / EARTH_ROTATION_PERIOD; // rad/s (~7.292115e-5)

// Geostationary Orbit (GEO)
// r_geo = (mu / omega^2)^(1/3)
export const GEO_RADIUS = Math.cbrt(MU_EARTH / Math.pow(EARTH_ROTATION_RATE, 2)); // ~42164.17 km
export const GEO_ALTITUDE = GEO_RADIUS - EARTH_RADIUS; // ~35793.17 km
export const GEO_VELOCITY = Math.sqrt(MU_EARTH / GEO_RADIUS); // ~3.07466 km/s

// Dhaka / Bangladesh coordinates
export const DHAKA_LAT = 23.8103; // degrees North
export const DHAKA_LON = 90.4125; // degrees East

// Typical Standard Orbits
export const LEO_ALTITUDE = 500.0; // km
export const LEO_RADIUS = EARTH_RADIUS + LEO_ALTITUDE; // 6871.0 km
export const LEO_VELOCITY = Math.sqrt(MU_EARTH / LEO_RADIUS); // ~7.6126 km/s
export const LEO_PERIOD = (2 * Math.PI) * Math.sqrt(Math.pow(LEO_RADIUS, 3) / MU_EARTH); // ~5677 s (~94.6 min)

// Polar Remote Sensing Orbit
export const POLAR_ALTITUDE = 750.0; // km
export const POLAR_RADIUS = EARTH_RADIUS + POLAR_ALTITUDE; // 7121.0 km
export const POLAR_VELOCITY = Math.sqrt(MU_EARTH / POLAR_RADIUS); // ~7.478 km/s
export const POLAR_PERIOD = (2 * Math.PI) * Math.sqrt(Math.pow(POLAR_RADIUS, 3) / MU_EARTH); // ~5990 s (~99.8 min)
