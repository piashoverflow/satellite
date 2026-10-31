/**
 * Satellite Dynamics & Sync Lab
 * Main Application Component
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { Viewport3D } from './components/Viewport3D';
import { Viewport2D } from './components/Viewport2D';
import { ViewportGroundTrack } from './components/ViewportGroundTrack';
import { CabinPiP } from './components/CabinPiP';
import { ControlsPanel } from './components/ControlsPanel';
import { TelemetryPanel } from './components/TelemetryPanel';
import { FormulaDrawer } from './components/FormulaDrawer';
import { Globe, Compass, Map, Maximize2, Activity, Zap, Rocket } from 'lucide-react';

import {
  ViewMode,
  ScenarioMode,
  SatelliteState,
  HohmannTransferState,
  SynodicConjunctionState,
  Vector3D,
} from './physics/types';

import {
  EARTH_RADIUS,
  GEO_RADIUS,
  GEO_ALTITUDE,
  GEO_VELOCITY,
  LEO_RADIUS,
  LEO_ALTITUDE,
  LEO_VELOCITY,
  POLAR_RADIUS,
  POLAR_ALTITUDE,
  POLAR_VELOCITY,
  POLAR_PERIOD,
  DHAKA_LON,
  MU_EARTH,
  EARTH_ROTATION_RATE,
} from './physics/constants';

import {
  getCircularVelocity,
  getOrbitalPeriod,
  calculateHohmann,
  calculateSynodicPeriod,
  orbitalToECI,
  eciToGeodetic,
  solveKepler,
  eccentricToTrueAnomaly,
  generateEllipsePath,
} from './physics/orbitalMath';

export default function App() {
  // Navigation & View Mode
  const [viewMode, setViewMode] = useState<ViewMode>('3d-orbit');
  const [scenario, setScenario] = useState<ScenarioMode>('geo-vs-polar');

  // Simulation Time & Playback
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [timeScale, setTimeScale] = useState<number>(60); // 60x default
  const [simTimeSec, setSimTimeSec] = useState<number>(0);

  // Modals
  const [isFormulaDrawerOpen, setIsFormulaDrawerOpen] = useState<boolean>(false);

  // Visual Vector Toggles
  const [showVelocityVector, setShowVelocityVector] = useState<boolean>(true);
  const [showAccelVector, setShowAccelVector] = useState<boolean>(true);
  const [showOrbitTrails, setShowOrbitTrails] = useState<boolean>(true);

  // Selected Satellite for Telemetry
  const [selectedSatId, setSelectedSatId] = useState<string>('sat-geo');

  // Dual Resonance Parameters
  const [sat1Alt, setSat1Alt] = useState<number>(600); // km
  const [sat2Alt, setSat2Alt] = useState<number>(1800); // km

  // Hohmann Target Altitude (default: GEO ~35,793 km)
  const [targetHohmannAlt, setTargetHohmannAlt] = useState<number>(GEO_ALTITUDE);

  // Hohmann Transfer State
  const initialHohmannParams = calculateHohmann(LEO_RADIUS, EARTH_RADIUS + GEO_ALTITUDE);
  const [hohmannState, setHohmannState] = useState<HohmannTransferState>({
    stage: 'leo-stable',
    r1: LEO_RADIUS,
    r2: EARTH_RADIUS + GEO_ALTITUDE,
    h1: LEO_ALTITUDE,
    h2: GEO_ALTITUDE,
    v1: initialHohmannParams.v1,
    v2: initialHohmannParams.v2,
    a_tx: initialHohmannParams.a_tx,
    e_tx: (EARTH_RADIUS + GEO_ALTITUDE - LEO_RADIUS) / (EARTH_RADIUS + GEO_ALTITUDE + LEO_RADIUS),
    v_periapsis: initialHohmannParams.v_periapsis,
    v_apoapsis: initialHohmannParams.v_apoapsis,
    deltaV1: initialHohmannParams.deltaV1,
    deltaV2: initialHohmannParams.deltaV2,
    deltaVTotal: initialHohmannParams.deltaVTotal,
    transferDuration: initialHohmannParams.transferDuration,
    transferTimeElapsed: 0,
    transferProgress: 0,
    periapsisAngle: 0,
    apoapsisAngle: Math.PI,
    autoPilot: false,
    isBurning: false,
    burnType: 'none',
    burnMessage: 'Parked in LEO (500 km). Click Burn 1 or Auto-Pilot to begin transfer.',
    targetOrbitName: 'GEO',
    burnFlashTimer: 0,
  });

  const hohmannRef = useRef<HohmannTransferState>(hohmannState);
  useEffect(() => {
    hohmannRef.current = hohmannState;
  }, [hohmannState]);

  // Synodic Conjunction State
  const [synodicState, setSynodicState] = useState<SynodicConjunctionState>({
    conjunctionCount: 0,
    lastConjunctionSimTime: 0,
    observedPeriods: [],
    theoreticalPeriod: 0,
    phaseAngleDelta: 0,
    isAligned: false,
    alignmentFlashTimer: 0,
  });

  // Satellite Objects Array
  const [satellites, setSatellites] = useState<SatelliteState[]>([]);

  // Previous angle tracker for conjunction zero-crossing detection
  const prevAngleDeltaRef = useRef<number>(0);
  const lastTrailUpdateRef = useRef<number>(0);

  // Initialize or Reset Scenarios
  const initScenario = useCallback(() => {
    setSimTimeSec(0);
    prevAngleDeltaRef.current = 0;
    lastTrailUpdateRef.current = 0;

    if (scenario === 'geo-vs-polar') {
      const geoPeriod = getOrbitalPeriod(GEO_RADIUS);
      const polarPeriod = getOrbitalPeriod(POLAR_RADIUS);

      const geoOrbitPath: Vector3D[] = [];
      const polarOrbitPath: Vector3D[] = [];
      for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.08) {
        geoOrbitPath.push(orbitalToECI(GEO_RADIUS, a, 0, 0).pos);
        polarOrbitPath.push(orbitalToECI(POLAR_RADIUS, a, Math.PI / 2, 0).pos);
      }

      const initialSatellites: SatelliteState[] = [
        {
          id: 'sat-geo',
          name: 'Bangabandhu-1 (GEO)',
          nameBn: 'বঙ্গবন্ধু স্যাটেলাইট-১ (ভূ-স্থির)',
          color: '#34d399', // Emerald
          radius: GEO_RADIUS,
          altitude: GEO_ALTITUDE,
          velocity: GEO_VELOCITY,
          period: geoPeriod,
          trueAnomaly: (DHAKA_LON * Math.PI) / 180,
          inclination: 0,
          raan: 0,
          semiMajorAxis: GEO_RADIUS,
          eccentricity: 0.0,
          specificEnergy: -MU_EARTH / (2 * GEO_RADIUS),
          kineticEnergy: 0.5 * GEO_VELOCITY * GEO_VELOCITY,
          potentialEnergy: -MU_EARTH / GEO_RADIUS,
          pos: { x: GEO_RADIUS, y: 0, z: 0 },
          vel: { x: 0, y: GEO_VELOCITY, z: 0 },
          lat: 0,
          lon: DHAKA_LON,
          trail: [],
          orbitPath: geoOrbitPath,
        },
        {
          id: 'sat-polar',
          name: 'Earth Observer (Polar LEO)',
          nameBn: 'মেরু রিমোট সেন্সিং উপগ্রহ',
          color: '#c084fc', // Purple
          radius: POLAR_RADIUS,
          altitude: POLAR_ALTITUDE,
          velocity: POLAR_VELOCITY,
          period: polarPeriod,
          trueAnomaly: 0,
          inclination: Math.PI / 2,
          raan: 0,
          semiMajorAxis: POLAR_RADIUS,
          eccentricity: 0.0,
          specificEnergy: -MU_EARTH / (2 * POLAR_RADIUS),
          kineticEnergy: 0.5 * POLAR_VELOCITY * POLAR_VELOCITY,
          potentialEnergy: -MU_EARTH / POLAR_RADIUS,
          pos: { x: POLAR_RADIUS, y: 0, z: 0 },
          vel: { x: 0, y: 0, z: POLAR_VELOCITY },
          lat: 0,
          lon: 0,
          trail: [],
          orbitPath: polarOrbitPath,
        },
      ];

      setSatellites(initialSatellites);
      setSelectedSatId('sat-geo');
    } else if (scenario === 'hohmann-transfer') {
      const r1 = LEO_RADIUS;
      const r2 = EARTH_RADIUS + targetHohmannAlt;
      const p = calculateHohmann(r1, r2);
      const e_tx = (r2 - r1) / (r2 + r1);
      const leoPeriod = getOrbitalPeriod(r1);

      const leoOrbitPath: Vector3D[] = [];
      for (let a = 0; a <= Math.PI * 2 + 0.08; a += 0.08) {
        leoOrbitPath.push(orbitalToECI(r1, a, 0, 0).pos);
      }

      const hohmannSat: SatelliteState = {
        id: 'sat-hohmann',
        name: 'Spacecraft Alpha (Hohmann)',
        nameBn: 'হোহম্যান ট্রান্সফার মহাকাশযান',
        color: '#f59e0b', // Amber
        radius: r1,
        altitude: LEO_ALTITUDE,
        velocity: p.v1,
        period: leoPeriod,
        trueAnomaly: 0,
        inclination: 0,
        raan: 0,
        semiMajorAxis: r1,
        eccentricity: 0.0,
        specificEnergy: -MU_EARTH / (2 * r1),
        kineticEnergy: 0.5 * p.v1 * p.v1,
        potentialEnergy: -MU_EARTH / r1,
        pos: { x: r1, y: 0, z: 0 },
        vel: { x: 0, y: p.v1, z: 0 },
        lat: 0,
        lon: 0,
        trail: [],
        orbitPath: leoOrbitPath,
      };

      setSatellites([hohmannSat]);
      setSelectedSatId('sat-hohmann');

      const nextHohmannState: HohmannTransferState = {
        stage: 'leo-stable',
        r1,
        r2,
        h1: LEO_ALTITUDE,
        h2: targetHohmannAlt,
        v1: p.v1,
        v2: p.v2,
        a_tx: p.a_tx,
        e_tx,
        v_periapsis: p.v_periapsis,
        v_apoapsis: p.v_apoapsis,
        deltaV1: p.deltaV1,
        deltaV2: p.deltaV2,
        deltaVTotal: p.deltaVTotal,
        transferDuration: p.transferDuration,
        transferTimeElapsed: 0,
        transferProgress: 0,
        periapsisAngle: 0,
        apoapsisAngle: Math.PI,
        autoPilot: false,
        isBurning: false,
        burnType: 'none',
        burnMessage: 'Parked in LEO (500 km). Click Burn 1 or Auto-Pilot to begin transfer.',
        targetOrbitName: targetHohmannAlt > 35000 ? 'GEO' : targetHohmannAlt > 15000 ? 'MEO' : 'High LEO',
        burnFlashTimer: 0,
      };

      setHohmannState(nextHohmannState);
      hohmannRef.current = nextHohmannState;
    } else if (scenario === 'dual-resonance') {
      const r1 = EARTH_RADIUS + sat1Alt;
      const r2 = EARTH_RADIUS + sat2Alt;
      const T1 = getOrbitalPeriod(r1);
      const T2 = getOrbitalPeriod(r2);
      const v1 = getCircularVelocity(r1);
      const v2 = getCircularVelocity(r2);
      const Tsyn = calculateSynodicPeriod(T1, T2);

      const path1: Vector3D[] = [];
      const path2: Vector3D[] = [];
      for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.08) {
        path1.push(orbitalToECI(r1, a, 0, 0).pos);
        path2.push(orbitalToECI(r2, a, 0, 0).pos);
      }

      const satA: SatelliteState = {
        id: 'sat-res-1',
        name: 'Satellite A (Inner)',
        nameBn: 'অভ্যন্তরীণ উপগ্রহ (A)',
        color: '#06b6d4',
        radius: r1,
        altitude: sat1Alt,
        velocity: v1,
        period: T1,
        trueAnomaly: 0,
        inclination: 0,
        raan: 0,
        semiMajorAxis: r1,
        eccentricity: 0,
        specificEnergy: -MU_EARTH / (2 * r1),
        kineticEnergy: 0.5 * v1 * v1,
        potentialEnergy: -MU_EARTH / r1,
        pos: { x: r1, y: 0, z: 0 },
        vel: { x: 0, y: v1, z: 0 },
        lat: 0,
        lon: 0,
        trail: [],
        orbitPath: path1,
      };

      const satB: SatelliteState = {
        id: 'sat-res-2',
        name: 'Satellite B (Outer)',
        nameBn: 'বহিঃস্থ উপগ্রহ (B)',
        color: '#c084fc',
        radius: r2,
        altitude: sat2Alt,
        velocity: v2,
        period: T2,
        trueAnomaly: 0,
        inclination: 0,
        raan: 0,
        semiMajorAxis: r2,
        eccentricity: 0,
        specificEnergy: -MU_EARTH / (2 * r2),
        kineticEnergy: 0.5 * v2 * v2,
        potentialEnergy: -MU_EARTH / r2,
        pos: { x: r2, y: 0, z: 0 },
        vel: { x: 0, y: v2, z: 0 },
        lat: 0,
        lon: 0,
        trail: [],
        orbitPath: path2,
      };

      setSatellites([satA, satB]);
      setSelectedSatId('sat-res-1');

      setSynodicState({
        conjunctionCount: 0,
        lastConjunctionSimTime: 0,
        observedPeriods: [],
        theoreticalPeriod: Tsyn,
        phaseAngleDelta: 0,
        isAligned: true,
        alignmentFlashTimer: 1.0,
      });
    }
  }, [scenario, sat1Alt, sat2Alt]);

  useEffect(() => {
    initScenario();
  }, [initScenario]);

  // Main Simulation Physics Loop
  useEffect(() => {
    if (!isPlaying) return;

    let lastTimestamp = performance.now();
    let frameId: number;

    const tick = (now: number) => {
      const realDtSec = Math.min(0.1, (now - lastTimestamp) / 1000);
      lastTimestamp = now;

      const simDt = realDtSec * timeScale;

      setSimTimeSec((prevSimTime) => {
        const nextSimTime = prevSimTime + simDt;

        // Propagate active satellites
        setSatellites((prevSats) => {
          if (scenario === 'hohmann-transfer') {
            const sat = prevSats[0];
            if (!sat) return prevSats;

            const hRef = hohmannRef.current;
            let updatedSat = { ...sat };

            // Decrease visual burn flash timer
            if (hRef.burnFlashTimer > 0) {
              hRef.burnFlashTimer = Math.max(0, hRef.burnFlashTimer - realDtSec);
              if (hRef.burnFlashTimer === 0) {
                hRef.isBurning = false;
              }
            }

            if (hRef.stage === 'leo-stable') {
              // Stable Circular LEO Orbit
              const omega = (2 * Math.PI) / sat.period;
              const nextAnomaly = (sat.trueAnomaly + omega * simDt) % (Math.PI * 2);
              const eci = orbitalToECI(sat.radius, nextAnomaly, 0, 0);
              const geo = eciToGeodetic(eci.pos, nextSimTime);

              // Point P follows spacecraft in LEO until Burn 1 injection is fired
              hRef.periapsisAngle = nextAnomaly;
              hRef.apoapsisAngle = (nextAnomaly + Math.PI) % (Math.PI * 2);

              updatedSat = {
                ...sat,
                trueAnomaly: nextAnomaly,
                pos: eci.pos,
                vel: eci.vel,
                lat: geo.lat,
                lon: geo.lon,
              };
            } else if (hRef.stage === 'transfer-ellipse') {
              // Coasting along Transfer Ellipse
              hRef.transferTimeElapsed += simDt;
              const progress = Math.min(1.0, hRef.transferTimeElapsed / hRef.transferDuration);
              hRef.transferProgress = progress;

              // Kepler Solver for Elliptical Motion
              const M = progress * Math.PI; // Mean anomaly from 0 (periapsis) to PI (apoapsis)
              const E = solveKepler(M, hRef.e_tx);
              const nu = eccentricToTrueAnomaly(E, hRef.e_tx);

              // Radial distance on ellipse
              let curR = hRef.a_tx * (1 - hRef.e_tx * Math.cos(E));
              let curSpeed = Math.sqrt(Math.max(0, MU_EARTH * (2 / curR - 1 / hRef.a_tx)));
              let curAlt = curR - EARTH_RADIUS;

              // Current orbital angle
              let curAngle = hRef.periapsisAngle + nu;
              let x = curR * Math.cos(curAngle);
              let y = curR * Math.sin(curAngle);

              // Orbital Velocity Vector: radial (vr) and transverse (vtheta)
              const p = hRef.a_tx * (1 - hRef.e_tx * hRef.e_tx);
              const vr = Math.sqrt(MU_EARTH / p) * hRef.e_tx * Math.sin(nu);
              const vtheta = Math.sqrt(MU_EARTH / p) * (1 + hRef.e_tx * Math.cos(nu));

              let vx = vr * Math.cos(curAngle) - vtheta * Math.sin(curAngle);
              let vy = vr * Math.sin(curAngle) + vtheta * Math.cos(curAngle);

              // Apoapsis Arrival Check
              if (progress >= 0.999) {
                if (hRef.autoPilot) {
                  // Auto-Pilot triggers Burn 2 immediately!
                  hRef.stage = 'geo-circularized';
                  hRef.isBurning = true;
                  hRef.burnFlashTimer = 3.5;
                  hRef.burnType = 'delta2';
                  hRef.burnMessage = `Auto-Pilot: Burn 2 (+${hRef.deltaV2.toFixed(2)} km/s) executed at Apoapsis! Target orbit circularized.`;
                  hRef.autoPilot = false;

                  const targetPath: Vector3D[] = [];
                  for (let a = 0; a <= Math.PI * 2 + 0.08; a += 0.08) {
                    targetPath.push(orbitalToECI(hRef.r2, a, 0, 0).pos);
                  }
                  const targetPeriod = getOrbitalPeriod(hRef.r2);

                  curR = hRef.r2;
                  curSpeed = hRef.v2;
                  curAlt = hRef.h2;
                  curAngle = hRef.apoapsisAngle;

                  x = curR * Math.cos(curAngle);
                  y = curR * Math.sin(curAngle);
                  vx = -curSpeed * Math.sin(curAngle);
                  vy = curSpeed * Math.cos(curAngle);

                  const eci = { pos: { x, y, z: 0 }, vel: { x: vx, y: vy, z: 0 } };
                  const geo = eciToGeodetic(eci.pos, nextSimTime);

                  updatedSat = {
                    ...sat,
                    radius: curR,
                    altitude: curAlt,
                    velocity: curSpeed,
                    period: targetPeriod,
                    trueAnomaly: curAngle,
                    semiMajorAxis: hRef.r2,
                    eccentricity: 0.0001,
                    specificEnergy: -MU_EARTH / (2 * hRef.r2),
                    kineticEnergy: 0.5 * curSpeed * curSpeed,
                    potentialEnergy: -MU_EARTH / curR,
                    pos: eci.pos,
                    vel: eci.vel,
                    lat: geo.lat,
                    lon: geo.lon,
                    orbitPath: targetPath,
                  };
                } else {
                  hRef.stage = 'ready-delta2';
                  hRef.burnMessage = '🎯 Apoapsis Reached! Fire Burn 2 (Δv₂) to circularize target orbit.';

                  curR = hRef.r2;
                  curSpeed = hRef.v_apoapsis;
                  curAlt = hRef.h2;
                  curAngle = hRef.apoapsisAngle;

                  x = curR * Math.cos(curAngle);
                  y = curR * Math.sin(curAngle);
                  vx = -curSpeed * Math.sin(curAngle);
                  vy = curSpeed * Math.cos(curAngle);

                  const eci = { pos: { x, y, z: 0 }, vel: { x: vx, y: vy, z: 0 } };
                  const geo = eciToGeodetic(eci.pos, nextSimTime);

                  updatedSat = {
                    ...sat,
                    radius: curR,
                    altitude: curAlt,
                    velocity: curSpeed,
                    trueAnomaly: curAngle,
                    semiMajorAxis: hRef.a_tx,
                    eccentricity: hRef.e_tx,
                    specificEnergy: -MU_EARTH / (2 * hRef.a_tx),
                    kineticEnergy: 0.5 * curSpeed * curSpeed,
                    potentialEnergy: -MU_EARTH / curR,
                    pos: eci.pos,
                    vel: eci.vel,
                    lat: geo.lat,
                    lon: geo.lon,
                  };
                }
              } else {
                const eci = {
                  pos: { x, y, z: 0 },
                  vel: { x: vx, y: vy, z: 0 },
                  speed: curSpeed,
                };
                const geo = eciToGeodetic(eci.pos, nextSimTime);

                updatedSat = {
                  ...sat,
                  radius: curR,
                  altitude: curAlt,
                  velocity: curSpeed,
                  trueAnomaly: curAngle,
                  semiMajorAxis: hRef.a_tx,
                  eccentricity: hRef.e_tx,
                  specificEnergy: -MU_EARTH / (2 * hRef.a_tx),
                  kineticEnergy: 0.5 * curSpeed * curSpeed,
                  potentialEnergy: -MU_EARTH / curR,
                  pos: eci.pos,
                  vel: eci.vel,
                  lat: geo.lat,
                  lon: geo.lon,
                };
              }
            } else if (hRef.stage === 'ready-delta2') {
              // Spacecraft coasting at Apoapsis waiting for Burn 2
              const curR = hRef.r2;
              const curSpeed = hRef.v_apoapsis;
              const curAngle = hRef.apoapsisAngle;
              const x = curR * Math.cos(curAngle);
              const y = curR * Math.sin(curAngle);
              const vx = -curSpeed * Math.sin(curAngle);
              const vy = curSpeed * Math.cos(curAngle);

              const eci = { pos: { x, y, z: 0 }, vel: { x: vx, y: vy, z: 0 } };
              const geo = eciToGeodetic(eci.pos, nextSimTime);

              updatedSat = {
                ...sat,
                radius: curR,
                altitude: hRef.h2,
                velocity: curSpeed,
                trueAnomaly: curAngle,
                pos: eci.pos,
                vel: eci.vel,
                lat: geo.lat,
                lon: geo.lon,
              };
            } else if (hRef.stage === 'geo-circularized') {
              // Stable Circular Target Orbit
              const targetPeriod = getOrbitalPeriod(hRef.r2);
              const omega = (2 * Math.PI) / targetPeriod;
              const nextAnomaly = (sat.trueAnomaly + omega * simDt) % (Math.PI * 2);
              const eci = orbitalToECI(hRef.r2, nextAnomaly, 0, 0);
              const geo = eciToGeodetic(eci.pos, nextSimTime);

              updatedSat = {
                ...sat,
                radius: hRef.r2,
                altitude: hRef.h2,
                velocity: hRef.v2,
                period: targetPeriod,
                trueAnomaly: nextAnomaly,
                semiMajorAxis: hRef.r2,
                eccentricity: 0.0001, // Circularized
                specificEnergy: -MU_EARTH / (2 * hRef.r2),
                kineticEnergy: 0.5 * hRef.v2 * hRef.v2,
                potentialEnergy: -MU_EARTH / hRef.r2,
                pos: eci.pos,
                vel: eci.vel,
                lat: geo.lat,
                lon: geo.lon,
              };
            }

            // Sync updated Hohmann state back to React state
            setHohmannState({ ...hRef });

            // Ground track trail
            if (nextSimTime - lastTrailUpdateRef.current > 30) {
              lastTrailUpdateRef.current = nextSimTime;
              const newTrail = [...updatedSat.trail, { lat: updatedSat.lat, lon: updatedSat.lon, time: nextSimTime }];
              if (newTrail.length > 250) newTrail.shift();
              updatedSat.trail = newTrail;
            }

            return [updatedSat];
          }

          // Other Scenarios (GEO vs Polar, Dual Resonance)
          const updated = prevSats.map((sat) => {
            const omega = (2 * Math.PI) / sat.period;
            let nextAnomaly: number;

            if (sat.name.includes('GEO')) {
              const greenwich = (EARTH_ROTATION_RATE * nextSimTime) % (Math.PI * 2);
              nextAnomaly = greenwich + (DHAKA_LON * Math.PI) / 180;
            } else {
              nextAnomaly = (sat.trueAnomaly + omega * simDt) % (Math.PI * 2);
            }

            const eci = orbitalToECI(sat.radius, nextAnomaly, sat.inclination, sat.raan);
            const geo = eciToGeodetic(eci.pos, nextSimTime);

            let newTrail = sat.trail;
            if (nextSimTime - lastTrailUpdateRef.current > 30) {
              newTrail = [...sat.trail, { lat: geo.lat, lon: geo.lon, time: nextSimTime }];
              if (newTrail.length > 300) newTrail.shift();
            }

            return {
              ...sat,
              trueAnomaly: nextAnomaly,
              pos: eci.pos,
              vel: eci.vel,
              lat: geo.lat,
              lon: geo.lon,
              trail: newTrail,
            };
          });

          // Conjunction detector for dual-resonance
          if (scenario === 'dual-resonance' && updated.length >= 2) {
            const satA = updated[0];
            const satB = updated[1];

            let angleDiff = (satA.trueAnomaly - satB.trueAnomaly) % (Math.PI * 2);
            if (angleDiff < 0) angleDiff += Math.PI * 2;

            const prevDiff = prevAngleDeltaRef.current;
            const crossedZero =
              (prevDiff > Math.PI * 1.5 && angleDiff < Math.PI * 0.5) ||
              (prevDiff < Math.PI * 0.5 && angleDiff > Math.PI * 1.5);

            prevAngleDeltaRef.current = angleDiff;
            const isCollinear = Math.abs(Math.sin(angleDiff)) < 0.05;

            if (crossedZero) {
              setSynodicState((st) => {
                const count = st.conjunctionCount + 1;
                const elapsed = nextSimTime - st.lastConjunctionSimTime;
                return {
                  ...st,
                  conjunctionCount: count,
                  lastConjunctionSimTime: nextSimTime,
                  observedPeriods: [...st.observedPeriods.slice(-10), elapsed],
                  phaseAngleDelta: angleDiff,
                  isAligned: true,
                  alignmentFlashTimer: 1.0,
                };
              });
            } else {
              setSynodicState((st) => ({
                ...st,
                phaseAngleDelta: angleDiff,
                isAligned: isCollinear,
                alignmentFlashTimer: Math.max(0, st.alignmentFlashTimer - realDtSec * 2),
              }));
            }
          }

          return updated;
        });

        return nextSimTime;
      });

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, timeScale, scenario]);

  // Hohmann Actions
  const handleFireDeltaV1 = () => {
    const sat = satellites[0];
    const hRef = hohmannRef.current;
    if (hRef.stage !== 'leo-stable') return;

    const curAngle = sat ? sat.trueAnomaly : hRef.periapsisAngle;

    hRef.periapsisAngle = curAngle;
    hRef.apoapsisAngle = (curAngle + Math.PI) % (Math.PI * 2);
    hRef.stage = 'transfer-ellipse';
    hRef.transferTimeElapsed = 0;
    hRef.transferProgress = 0;
    hRef.isBurning = true;
    hRef.burnFlashTimer = 3.0;
    hRef.burnType = 'delta1';
    hRef.burnMessage = `Burn 1 Fired! (+${hRef.deltaV1.toFixed(2)} km/s). Coasting to Apoapsis along transfer ellipse.`;

    const ellipsePath = generateEllipsePath(hRef.a_tx, hRef.e_tx, curAngle);

    const vx = -hRef.v_periapsis * Math.sin(curAngle);
    const vy = hRef.v_periapsis * Math.cos(curAngle);

    setSatellites((prev) => {
      if (!prev[0]) return prev;
      return [
        {
          ...prev[0],
          velocity: hRef.v_periapsis,
          vel: { x: vx, y: vy, z: 0 },
          semiMajorAxis: hRef.a_tx,
          eccentricity: hRef.e_tx,
          specificEnergy: -MU_EARTH / (2 * hRef.a_tx),
          kineticEnergy: 0.5 * hRef.v_periapsis * hRef.v_periapsis,
          potentialEnergy: -MU_EARTH / hRef.r1,
          orbitPath: ellipsePath,
        },
      ];
    });

    setHohmannState({ ...hRef });
  };

  const handleFastForwardApoapsis = () => {
    const hRef = hohmannRef.current;
    if (hRef.stage !== 'transfer-ellipse') return;

    hRef.transferTimeElapsed = hRef.transferDuration;
    hRef.transferProgress = 1.0;
    hRef.stage = 'ready-delta2';
    hRef.burnMessage = '🎯 Apoapsis Reached! Ready to execute Burn 2 (Δv₂) to circularize target orbit.';

    const curR = hRef.r2;
    const curSpeed = hRef.v_apoapsis;
    const curAngle = hRef.apoapsisAngle;
    const x = curR * Math.cos(curAngle);
    const y = curR * Math.sin(curAngle);
    const vx = -curSpeed * Math.sin(curAngle);
    const vy = curSpeed * Math.cos(curAngle);
    const eci = { pos: { x, y, z: 0 }, vel: { x: vx, y: vy, z: 0 } };
    const geo = eciToGeodetic(eci.pos, simTimeSec);

    setSatellites((prev) => {
      if (!prev[0]) return prev;
      return [
        {
          ...prev[0],
          radius: curR,
          altitude: hRef.h2,
          velocity: curSpeed,
          trueAnomaly: curAngle,
          pos: eci.pos,
          vel: eci.vel,
          lat: geo.lat,
          lon: geo.lon,
        },
      ];
    });

    setHohmannState({ ...hRef });
  };

  const handleFireDeltaV2 = () => {
    const hRef = hohmannRef.current;
    if (hRef.stage !== 'ready-delta2') return;

    hRef.stage = 'geo-circularized';
    hRef.isBurning = true;
    hRef.burnFlashTimer = 3.5;
    hRef.burnType = 'delta2';
    hRef.burnMessage = `Burn 2 Fired! Orbit circularized at ${Math.round(hRef.h2).toLocaleString()} km (+${hRef.deltaV2.toFixed(2)} km/s). Mission accomplished!`;
    hRef.autoPilot = false;

    // Generate Circular Target Orbit Path
    const targetPath: Vector3D[] = [];
    for (let a = 0; a <= Math.PI * 2 + 0.08; a += 0.08) {
      targetPath.push(orbitalToECI(hRef.r2, a, 0, 0).pos);
    }
    const targetPeriod = getOrbitalPeriod(hRef.r2);

    const curAngle = hRef.apoapsisAngle;
    const x = hRef.r2 * Math.cos(curAngle);
    const y = hRef.r2 * Math.sin(curAngle);
    const vx = -hRef.v2 * Math.sin(curAngle);
    const vy = hRef.v2 * Math.cos(curAngle);
    const eci = { pos: { x, y, z: 0 }, vel: { x: vx, y: vy, z: 0 } };
    const geo = eciToGeodetic(eci.pos, simTimeSec);

    setSatellites((prev) => {
      if (!prev[0]) return prev;
      return [
        {
          ...prev[0],
          radius: hRef.r2,
          altitude: hRef.h2,
          velocity: hRef.v2,
          period: targetPeriod,
          trueAnomaly: curAngle,
          pos: eci.pos,
          vel: eci.vel,
          lat: geo.lat,
          lon: geo.lon,
          semiMajorAxis: hRef.r2,
          eccentricity: 0.0001,
          specificEnergy: -MU_EARTH / (2 * hRef.r2),
          kineticEnergy: 0.5 * hRef.v2 * hRef.v2,
          potentialEnergy: -MU_EARTH / hRef.r2,
          orbitPath: targetPath,
        },
      ];
    });

    setHohmannState({ ...hRef });
  };

  const handleAutoTransfer = () => {
    const r1 = LEO_RADIUS;
    const r2 = EARTH_RADIUS + targetHohmannAlt;
    const p = calculateHohmann(r1, r2);
    const e_tx = (r2 - r1) / (r2 + r1);
    const leoPeriod = getOrbitalPeriod(r1);

    const launchAngle = 0;
    const apoAngle = Math.PI;

    const ellipsePath = generateEllipsePath(p.a_tx, e_tx, launchAngle);

    const autoHohmann: HohmannTransferState = {
      stage: 'transfer-ellipse',
      r1,
      r2,
      h1: LEO_ALTITUDE,
      h2: targetHohmannAlt,
      v1: p.v1,
      v2: p.v2,
      a_tx: p.a_tx,
      e_tx,
      v_periapsis: p.v_periapsis,
      v_apoapsis: p.v_apoapsis,
      deltaV1: p.deltaV1,
      deltaV2: p.deltaV2,
      deltaVTotal: p.deltaVTotal,
      transferDuration: p.transferDuration,
      transferTimeElapsed: 0,
      transferProgress: 0,
      periapsisAngle: launchAngle,
      apoapsisAngle: apoAngle,
      autoPilot: true,
      isBurning: true,
      burnType: 'delta1',
      burnMessage: `Auto-Pilot: Burn 1 (+${p.deltaV1.toFixed(2)} km/s) executed! Transferring to Apoapsis at 1,000× time scale...`,
      targetOrbitName: targetHohmannAlt > 35000 ? 'GEO' : targetHohmannAlt > 15000 ? 'MEO' : 'High LEO',
      burnFlashTimer: 3.5,
    };

    hohmannRef.current = autoHohmann;
    setHohmannState(autoHohmann);

    const x = r1 * Math.cos(launchAngle);
    const y = r1 * Math.sin(launchAngle);
    const vx = -p.v_periapsis * Math.sin(launchAngle);
    const vy = p.v_periapsis * Math.cos(launchAngle);

    setSatellites([
      {
        id: 'sat-hohmann',
        name: 'Spacecraft Alpha (Hohmann)',
        nameBn: 'হোহম্যান ট্রান্সফার মহাকাশযান',
        color: '#f59e0b',
        radius: r1,
        altitude: LEO_ALTITUDE,
        velocity: p.v_periapsis,
        period: leoPeriod,
        trueAnomaly: launchAngle,
        inclination: 0,
        raan: 0,
        semiMajorAxis: p.a_tx,
        eccentricity: e_tx,
        specificEnergy: -MU_EARTH / (2 * p.a_tx),
        kineticEnergy: 0.5 * p.v_periapsis * p.v_periapsis,
        potentialEnergy: -MU_EARTH / r1,
        pos: { x, y, z: 0 },
        vel: { x: vx, y: vy, z: 0 },
        lat: 0,
        lon: 0,
        trail: [],
        orbitPath: ellipsePath,
      },
    ]);

    setTimeScale(1000);
    setIsPlaying(true);
  };

  const handleResetHohmann = (customAlt?: number) => {
    const alt = customAlt ?? targetHohmannAlt;
    const r1 = LEO_RADIUS;
    const r2 = EARTH_RADIUS + alt;
    const p = calculateHohmann(r1, r2);
    const e_tx = (r2 - r1) / (r2 + r1);
    const leoPeriod = getOrbitalPeriod(r1);

    const leoOrbitPath: Vector3D[] = [];
    for (let a = 0; a <= Math.PI * 2 + 0.08; a += 0.08) {
      leoOrbitPath.push(orbitalToECI(r1, a, 0, 0).pos);
    }

    const resetHohmann: HohmannTransferState = {
      stage: 'leo-stable',
      r1,
      r2,
      h1: LEO_ALTITUDE,
      h2: alt,
      v1: p.v1,
      v2: p.v2,
      a_tx: p.a_tx,
      e_tx,
      v_periapsis: p.v_periapsis,
      v_apoapsis: p.v_apoapsis,
      deltaV1: p.deltaV1,
      deltaV2: p.deltaV2,
      deltaVTotal: p.deltaVTotal,
      transferDuration: p.transferDuration,
      transferTimeElapsed: 0,
      transferProgress: 0,
      periapsisAngle: 0,
      apoapsisAngle: Math.PI,
      autoPilot: false,
      isBurning: false,
      burnType: 'none',
      burnMessage: 'Parked in LEO (500 km). Click Burn 1 or Auto-Pilot to begin transfer.',
      targetOrbitName: alt > 35000 ? 'GEO' : alt > 15000 ? 'MEO' : 'High LEO',
      burnFlashTimer: 0,
    };

    hohmannRef.current = resetHohmann;
    setHohmannState(resetHohmann);

    setSatellites([
      {
        id: 'sat-hohmann',
        name: 'Spacecraft Alpha (Hohmann)',
        nameBn: 'হোহম্যান ট্রান্সফার মহাকাশযান',
        color: '#f59e0b',
        radius: r1,
        altitude: LEO_ALTITUDE,
        velocity: p.v1,
        period: leoPeriod,
        trueAnomaly: 0,
        inclination: 0,
        raan: 0,
        semiMajorAxis: r1,
        eccentricity: 0.0,
        specificEnergy: -MU_EARTH / (2 * r1),
        kineticEnergy: 0.5 * p.v1 * p.v1,
        potentialEnergy: -MU_EARTH / r1,
        pos: { x: r1, y: 0, z: 0 },
        vel: { x: 0, y: p.v1, z: 0 },
        lat: 0,
        lon: 0,
        trail: [],
        orbitPath: leoOrbitPath,
      },
    ]);

    setTimeScale(60);
    setIsPlaying(true);
  };

  const handleSetTargetHohmannAlt = (altKm: number) => {
    setTargetHohmannAlt(altKm);
    const hRef = hohmannRef.current;
    const r1 = LEO_RADIUS;
    const r2 = EARTH_RADIUS + altKm;
    const p = calculateHohmann(r1, r2);
    const e_tx = (r2 - r1) / (r2 + r1);

    if (hRef.stage === 'leo-stable') {
      const updated: HohmannTransferState = {
        ...hRef,
        r2,
        h2: altKm,
        v2: p.v2,
        a_tx: p.a_tx,
        e_tx,
        v_periapsis: p.v_periapsis,
        v_apoapsis: p.v_apoapsis,
        deltaV1: p.deltaV1,
        deltaV2: p.deltaV2,
        deltaVTotal: p.deltaVTotal,
        transferDuration: p.transferDuration,
        targetOrbitName: altKm > 35000 ? 'GEO' : altKm > 15000 ? 'MEO' : 'High LEO',
      };
      hohmannRef.current = updated;
      setHohmannState(updated);
    } else {
      handleResetHohmann(altKm);
    }
  };

  const handleReset = () => {
    initScenario();
  };

  const handleStepForward = (seconds: number) => {
    setSimTimeSec((t) => t + seconds);
  };

  const simTimeDays = simTimeSec / 86400;

  const geoSat = satellites.find((s) => s.id === 'sat-geo');
  const dhakaDrift = geoSat ? Math.abs(geoSat.lon - DHAKA_LON) : 0;
  const hohmannSat = satellites.find((s) => s.id === 'sat-hohmann');
  const hohmannEcc = hohmannSat ? hohmannSat.eccentricity : 0;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#f0f7ff] text-slate-800 font-sans">
      {/* 1. Header Bar */}
      <Header
        viewMode={viewMode}
        setViewMode={setViewMode}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        onReset={handleReset}
        onOpenFormulas={() => setIsFormulaDrawerOpen(true)}
        simTimeDays={simTimeDays}
      />

      {/* 2. Main Stage & Workspace Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Sidebar: Controls & Telemetry Dashboard */}
        <aside className="w-full lg:w-96 xl:w-[420px] h-[45vh] lg:h-full bg-sky-50/90 border-b lg:border-b-0 lg:border-r border-sky-200 flex flex-col overflow-y-auto p-4 space-y-4 shrink-0 z-10 order-2 lg:order-1">
          <ControlsPanel
            scenario={scenario}
            setScenario={setScenario}
            timeScale={timeScale}
            setTimeScale={setTimeScale}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            onStepForward={handleStepForward}
            onReset={handleReset}
            hohmannState={hohmannState}
            onFireDeltaV1={handleFireDeltaV1}
            onFireDeltaV2={handleFireDeltaV2}
            onAutoTransfer={handleAutoTransfer}
            onResetHohmann={() => handleResetHohmann()}
            onFastForwardApoapsis={handleFastForwardApoapsis}
            targetHohmannAlt={targetHohmannAlt}
            setTargetHohmannAlt={handleSetTargetHohmannAlt}
            sat1AltitudeKm={sat1Alt}
            setSat1AltitudeKm={setSat1Alt}
            sat2AltitudeKm={sat2Alt}
            setSat2AltitudeKm={setSat2Alt}
            showVelocityVector={showVelocityVector}
            setShowVelocityVector={setShowVelocityVector}
            showAccelVector={showAccelVector}
            setShowAccelVector={setShowAccelVector}
            showOrbitTrails={showOrbitTrails}
            setShowOrbitTrails={setShowOrbitTrails}
          />

          <TelemetryPanel
            satellites={satellites}
            selectedSatId={selectedSatId}
            setSelectedSatId={setSelectedSatId}
            scenario={scenario}
            synodicState={synodicState}
            simTimeDays={simTimeDays}
          />
        </aside>

        {/* Right/Center: High-Performance Canvas Stage */}
        <main className="flex-1 h-[55vh] lg:h-full relative overflow-hidden bg-sky-100/60 order-1 lg:order-2">
          {viewMode === 'grid' ? (
            <div className="h-full w-full p-2 grid grid-cols-1 md:grid-cols-2 grid-rows-2 gap-2 bg-sky-200/50 overflow-hidden">
              {/* Quadrant 1: 3D Orbital Perspective */}
              <div className="relative rounded-xl overflow-hidden border border-sky-300 bg-white shadow-xs flex flex-col min-h-0">
                <div className="h-8 px-3 bg-sky-100/95 border-b border-sky-200 flex items-center justify-between z-10 shrink-0">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-950">
                    <Globe className="w-3.5 h-3.5 text-sky-600" />
                    <span>3D Perspective (ত্রিমাত্রিক দৃশ্য)</span>
                  </div>
                  <button
                    onClick={() => setViewMode('3d-orbit')}
                    className="text-[11px] font-semibold text-sky-700 hover:text-sky-950 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-sky-200/70 transition-colors"
                    title="Maximize 3D View"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span className="hidden sm:inline">Maximize</span>
                  </button>
                </div>
                <div className="flex-1 relative overflow-hidden">
                  <Viewport3D
                    satellites={satellites}
                    simTimeSec={simTimeSec}
                    showVelocityVector={showVelocityVector}
                    showAccelVector={showAccelVector}
                    showOrbitTrails={showOrbitTrails}
                    isAligned={synodicState.isAligned}
                    conjunctionFlashTimer={synodicState.alignmentFlashTimer}
                    scenario={scenario}
                    hohmannState={hohmannState}
                  />
                </div>
              </div>

              {/* Quadrant 2: 2D Polar Plane */}
              <div className="relative rounded-xl overflow-hidden border border-sky-300 bg-white shadow-xs flex flex-col min-h-0">
                <div className="h-8 px-3 bg-sky-100/95 border-b border-sky-200 flex items-center justify-between z-10 shrink-0">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-950">
                    <Compass className="w-3.5 h-3.5 text-indigo-600" />
                    <span>2D Polar Plane (কক্ষপথ সমতল)</span>
                  </div>
                  <button
                    onClick={() => setViewMode('2d-plane')}
                    className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-950 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-sky-200/70 transition-colors"
                    title="Maximize 2D Plane View"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span className="hidden sm:inline">Maximize</span>
                  </button>
                </div>
                <div className="flex-1 relative overflow-hidden">
                  <Viewport2D
                    satellites={satellites}
                    simTimeSec={simTimeSec}
                    showVelocityVector={showVelocityVector}
                    showAccelVector={showAccelVector}
                    isAligned={synodicState.isAligned}
                    conjunctionFlashTimer={synodicState.alignmentFlashTimer}
                    scenario={scenario}
                    hohmannState={hohmannState}
                  />
                </div>
              </div>

              {/* Quadrant 3: Ground Track Map */}
              <div className="relative rounded-xl overflow-hidden border border-sky-300 bg-white shadow-xs flex flex-col min-h-0">
                <div className="h-8 px-3 bg-sky-100/95 border-b border-sky-200 flex items-center justify-between z-10 shrink-0">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-950">
                    <Map className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Equirectangular Ground Track (গ্রাউন্ড ট্র্যাক)</span>
                  </div>
                  <button
                    onClick={() => setViewMode('ground-track')}
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-950 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-sky-200/70 transition-colors"
                    title="Maximize Ground Track View"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span className="hidden sm:inline">Maximize</span>
                  </button>
                </div>
                <div className="flex-1 relative overflow-hidden">
                  <ViewportGroundTrack
                    satellites={satellites}
                    simTimeSec={simTimeSec}
                  />
                </div>
              </div>

              {/* Quadrant 4: Mission Operations & Flight Instruments Deck */}
              <div className="relative rounded-xl overflow-hidden border border-sky-300 bg-white shadow-xs flex flex-col min-h-0">
                <div className="h-8 px-3 bg-sky-100/95 border-b border-sky-200 flex items-center justify-between z-10 shrink-0">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-950">
                    <Activity className="w-3.5 h-3.5 text-amber-600" />
                    <span>Flight Deck & Dynamics (ফ্লাইট ডেক ও কেবিন)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-mono font-bold text-sky-800 bg-sky-200/80 px-2 py-0.5 rounded">
                      SYNCHRONIZED
                    </span>
                  </div>
                </div>

                <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-linear-to-b from-sky-50/80 to-white text-xs">
                  {/* Primary Telemetry Quick Card */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-lg bg-white border border-sky-200 shadow-2xs">
                      <div className="text-[10px] text-slate-500 font-medium">PRIMARY ORBIT ALTITUDE</div>
                      <div className="text-base font-extrabold text-sky-900 font-mono">
                        {(satellites[0]?.altitude ?? LEO_ALTITUDE).toFixed(0)} <span className="text-xs font-normal">km</span>
                      </div>
                      <div className="text-[10px] text-sky-600 font-semibold mt-0.5">
                        r = {((satellites[0]?.radius ?? LEO_RADIUS)).toFixed(0)} km
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-white border border-sky-200 shadow-2xs">
                      <div className="text-[10px] text-slate-500 font-medium">ORBITAL VELOCITY (v)</div>
                      <div className="text-base font-extrabold text-emerald-800 font-mono">
                        {(satellites[0]?.velocity ?? LEO_VELOCITY).toFixed(3)} <span className="text-xs font-normal">km/s</span>
                      </div>
                      <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                        T = {((satellites[0]?.period ?? 5400) / 60).toFixed(1)} min
                      </div>
                    </div>
                  </div>

                  {/* Hohmann Quick Controls if active */}
                  {scenario === 'hohmann-transfer' && (
                    <div className="p-2.5 rounded-lg bg-amber-50/90 border border-amber-300">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-amber-950 text-xs flex items-center gap-1">
                          <Rocket className="w-3.5 h-3.5 text-amber-600" />
                          Hohmann Transfer Control
                        </span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-200/80 text-amber-900 font-bold">
                          {hohmannState.stage}
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-900 mb-2 leading-relaxed">
                        {hohmannState.burnMessage}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {hohmannState.stage === 'leo-stable' && (
                          <button
                            onClick={handleFireDeltaV1}
                            className="px-2.5 py-1 text-xs font-bold rounded bg-amber-600 hover:bg-amber-700 text-white shadow-2xs flex items-center gap-1"
                          >
                            <Zap className="w-3 h-3" />
                            Fire Burn 1 (+{hohmannState.deltaV1.toFixed(2)} km/s)
                          </button>
                        )}
                        {hohmannState.stage === 'transfer-ellipse' && (
                          <button
                            onClick={handleFastForwardApoapsis}
                            className="px-2.5 py-1 text-xs font-bold rounded bg-sky-600 hover:bg-sky-700 text-white shadow-2xs"
                          >
                            Jump to Apoapsis &rarr;
                          </button>
                        )}
                        {hohmannState.stage === 'ready-delta2' && (
                          <button
                            onClick={handleFireDeltaV2}
                            className="px-2.5 py-1 text-xs font-bold rounded bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs flex items-center gap-1"
                          >
                            <Zap className="w-3 h-3" />
                            Fire Burn 2 (+{hohmannState.deltaV2.toFixed(2)} km/s)
                          </button>
                        )}
                        <button
                          onClick={handleAutoTransfer}
                          className="px-2 py-1 text-xs font-semibold rounded border border-amber-400 bg-white hover:bg-amber-100 text-amber-900"
                        >
                          Auto-Pilot
                        </button>
                        <button
                          onClick={() => handleResetHohmann()}
                          className="px-2 py-1 text-xs font-semibold rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Microgravity Observation Note */}
                  <div className="p-2 rounded-lg bg-sky-50 border border-sky-200 text-sky-950 text-[11px] leading-relaxed">
                    <span className="font-bold">কক্ষপথীয় গতিবিজ্ঞান পর্যবেক্ষণ:</span> উপরের ৩টি ভিউপোর্টে উপগ্রহের 3D ত্রিমাত্রিক অবস্থান, 2D সমতলে উৎকেন্দ্রিকতা ও কক্ষপথের ব্যাসার্ধ, এবং পৃথিবীর ঘূর্ণনজনিত 2D গ্রাউন্ড ট্র্যাক সাইন কার্ভ একই সাথে সিনক্রোনাইজড অবস্থায় চলমান।
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {viewMode === '3d-orbit' && (
                <Viewport3D
                  satellites={satellites}
                  simTimeSec={simTimeSec}
                  showVelocityVector={showVelocityVector}
                  showAccelVector={showAccelVector}
                  showOrbitTrails={showOrbitTrails}
                  isAligned={synodicState.isAligned}
                  conjunctionFlashTimer={synodicState.alignmentFlashTimer}
                  scenario={scenario}
                  hohmannState={hohmannState}
                />
              )}

              {viewMode === '2d-plane' && (
                <Viewport2D
                  satellites={satellites}
                  simTimeSec={simTimeSec}
                  showVelocityVector={showVelocityVector}
                  showAccelVector={showAccelVector}
                  isAligned={synodicState.isAligned}
                  conjunctionFlashTimer={synodicState.alignmentFlashTimer}
                  scenario={scenario}
                  hohmannState={hohmannState}
                />
              )}

              {viewMode === 'ground-track' && (
                <ViewportGroundTrack
                  satellites={satellites}
                  simTimeSec={simTimeSec}
                />
              )}

              {/* Picture-in-Picture (PiP) Cabin View in Bottom-Right Corner */}
              <CabinPiP
                currentAltitudeKm={satellites[0]?.altitude || LEO_ALTITUDE}
                onFireThrusterDeltaV={() => {
                  if (scenario === 'hohmann-transfer') {
                    if (hohmannState.stage === 'leo-stable') handleFireDeltaV1();
                    else if (hohmannState.stage === 'ready-delta2') handleFireDeltaV2();
                  }
                }}
              />
            </>
          )}
        </main>
      </div>

      {/* 3. Mathematical Reference Drawer */}
      <FormulaDrawer
        isOpen={isFormulaDrawerOpen}
        onClose={() => setIsFormulaDrawerOpen(false)}
      />
    </div>
  );
}
