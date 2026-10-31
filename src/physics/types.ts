export type ViewMode = '3d-orbit' | '2d-plane' | 'ground-track' | 'grid';

export type ScenarioMode = 'geo-vs-polar' | 'hohmann-transfer' | 'dual-resonance';

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Vector2D {
  x: number;
  y: number;
}

export interface SatelliteState {
  id: string;
  name: string;
  nameBn: string;
  color: string;
  radius: number; // km from Earth center
  altitude: number; // km from Earth surface
  velocity: number; // km/s
  period: number; // seconds
  trueAnomaly: number; // radians (orbital position)
  inclination: number; // radians (0 for equatorial, pi/2 for polar)
  raan: number; // right ascension of ascending node (radians)
  semiMajorAxis: number; // km
  eccentricity: number; // 0 for circular
  specificEnergy: number; // MJ/kg (km^2/s^2)
  kineticEnergy: number; // MJ/kg
  potentialEnergy: number; // MJ/kg
  // 3D Cartesian position & velocity in Earth-Centered Inertial (ECI) frame
  pos: Vector3D;
  vel: Vector3D;
  // Geographic footprint
  lat: number; // degrees
  lon: number; // degrees
  trail: { lat: number; lon: number; time: number }[];
  orbitPath: Vector3D[];
}

export type HohmannStage = 
  | 'leo-stable' 
  | 'burning-delta1' 
  | 'transfer-ellipse' 
  | 'ready-delta2' 
  | 'burning-delta2' 
  | 'geo-circularized';

export interface HohmannTransferState {
  stage: HohmannStage;
  r1: number; // initial orbit radius (km)
  r2: number; // target orbit radius (km)
  h1: number; // initial altitude (km)
  h2: number; // target altitude (km)
  v1: number; // initial circular velocity (km/s)
  v2: number; // target circular velocity (km/s)
  a_tx: number; // semi-major axis of transfer ellipse (km)
  e_tx: number; // eccentricity of transfer ellipse
  v_periapsis: number; // velocity after burn 1 at periapsis (km/s)
  v_apoapsis: number; // velocity before burn 2 at apoapsis (km/s)
  deltaV1: number; // km/s
  deltaV2: number; // km/s
  deltaVTotal: number; // km/s
  transferDuration: number; // seconds (half of ellipse period)
  transferTimeElapsed: number; // seconds elapsed in transfer
  transferProgress: number; // 0 to 1
  periapsisAngle: number; // angle of periapsis burn (radians)
  apoapsisAngle: number; // angle of apoapsis burn (radians)
  autoPilot: boolean;
  isBurning: boolean; // true during engine burn
  burnType: 'none' | 'delta1' | 'delta2';
  burnMessage: string;
  targetOrbitName: string;
  burnFlashTimer: number; // for visual flame effect
}

export interface SynodicConjunctionState {
  conjunctionCount: number;
  lastConjunctionSimTime: number;
  observedPeriods: number[]; // seconds
  theoreticalPeriod: number; // seconds
  phaseAngleDelta: number; // radians between the two satellites (0 to 2pi)
  isAligned: boolean;
  alignmentFlashTimer: number; // for visual pulse
}

export interface CabinMicrogravityState {
  astronautOffset: { x: number; y: number; vx: number; vy: number; rot: number; vrot: number };
  toolOffset: { x: number; y: number; vx: number; vy: number; rot: number };
  penOffset: { x: number; y: number; vx: number; vy: number; rot: number };
  isThrusting: boolean;
  thrustVector: { ax: number; ay: number }; // g's
  apparentWeightScaleG: number; // in g's (0 in free fall, >0 during thrust)
}


