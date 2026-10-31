import React, { useRef, useEffect, useState, useCallback } from 'react';
import { SatelliteState, Vector3D, ScenarioMode, HohmannTransferState } from '../physics/types';
import { EARTH_RADIUS, GEO_RADIUS, DHAKA_LAT, DHAKA_LON, EARTH_ROTATION_RATE, MU_EARTH } from '../physics/constants';
import { WORLD_CONTINENTS } from '../physics/worldData';
import { RotateCw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface Viewport3DProps {
  satellites: SatelliteState[];
  simTimeSec: number;
  showVelocityVector: boolean;
  showAccelVector: boolean;
  showOrbitTrails: boolean;
  isAligned: boolean;
  conjunctionFlashTimer: number;
  scenario?: ScenarioMode;
  hohmannState?: HohmannTransferState;
}

// Helper to draw high-contrast, crystal-clear text on light blue canvas
const drawHighContrastText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  font: string = '11px JetBrains Mono, monospace',
  align: CanvasTextAlign = 'left',
  withBackdrop: boolean = false
) => {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';

  if (withBackdrop) {
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const paddingX = 7;
    const height = 20;
    let boxX = x - paddingX;
    if (align === 'center') boxX = x - textWidth / 2 - paddingX;
    else if (align === 'right') boxX = x - textWidth - paddingX;
    const boxY = y - height / 2;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(boxX, boxY, textWidth + paddingX * 2, height);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(boxX, boxY, textWidth + paddingX * 2, height);
  } else {
    // 3.5px white halo outline for 100% legibility over light blue background
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.5;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, x, y);
  }

  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
};

export const Viewport3D: React.FC<Viewport3DProps> = ({
  satellites,
  simTimeSec,
  showVelocityVector,
  showAccelVector,
  showOrbitTrails,
  isAligned,
  conjunctionFlashTimer,
  scenario,
  hohmannState,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Camera state: spherical coordinates (distance, yaw, pitch)
  const [camera, setCamera] = useState({
    distance: 120000, // km (approx view distance)
    yaw: 0.6, // radians
    pitch: 0.45, // radians
  });

  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  // Handle mouse drag for 3D rotation
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    setCamera((prev) => ({
      ...prev,
      yaw: prev.yaw + dx * 0.008,
      pitch: Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, prev.pitch + dy * 0.008)),
    }));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setCamera((prev) => ({
      ...prev,
      distance: Math.max(25000, Math.min(300000, prev.distance * (e.deltaY > 0 ? 1.1 : 0.9))),
    }));
  };

  // Reset Camera View
  const resetCamera = () => {
    setCamera({ distance: 120000, yaw: 0.6, pitch: 0.45 });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      // Responsive canvas sizing
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const cx = width / 2;
      const cy = height / 2;

      // 0. Light Blue Celestial Sky Gradient
      const bgGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, Math.max(width, height));
      bgGrad.addColorStop(0, '#f8fafc');
      bgGrad.addColorStop(0.4, '#f0f9ff');
      bgGrad.addColorStop(1, '#dbeafe');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Celestial coordinate dots
      ctx.fillStyle = 'rgba(147, 197, 253, 0.4)';
      for (let gx = 0; gx < width; gx += 45) {
        for (let gy = 0; gy < height; gy += 45) {
          ctx.fillRect(gx, gy, 1.2, 1.2);
        }
      }

      const fovScale = Math.min(width, height) * 0.8;
      const scale = fovScale / camera.distance;

      // Camera transformation matrix
      const cyaw = Math.cos(camera.yaw);
      const syaw = Math.sin(camera.yaw);
      const cpitch = Math.cos(camera.pitch);
      const spitch = Math.sin(camera.pitch);

      // Project 3D vector (km) to 2D screen coordinates
      const project = (p: Vector3D): { x: number; y: number; zDepth: number } => {
        // Rotate around Y axis (yaw)
        const x1 = p.x * cyaw - p.y * syaw;
        const y1 = p.x * syaw + p.y * cyaw;
        const z1 = p.z;

        // Rotate around X axis (pitch)
        const x2 = x1;
        const y2 = y1 * cpitch - z1 * spitch;
        const z2 = y1 * spitch + z1 * cpitch;

        const screenX = cx + x2 * scale;
        const screenY = cy - z2 * scale; // Invert Z for screen Y
        return { x: screenX, y: screenY, zDepth: y2 };
      };

      // 1. Draw Space Coordinate Grid (Celestial Equatorial Plane)
      ctx.strokeStyle = 'rgba(147, 197, 253, 0.55)';
      ctx.lineWidth = 1;
      const gridRadius = GEO_RADIUS * 1.5;
      const numRings = 4;
      for (let i = 1; i <= numRings; i++) {
        const r = (gridRadius / numRings) * i;
        ctx.beginPath();
        for (let angle = 0; angle <= Math.PI * 2; angle += 0.1) {
          const pt = project({ x: r * Math.cos(angle), y: r * Math.sin(angle), z: 0 });
          if (angle === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // 2. Earth Globe Rendering
      const earthRadiusScreen = EARTH_RADIUS * scale;
      const earthCenter = project({ x: 0, y: 0, z: 0 });

      // Earth rotation angle
      const earthRotRad = (EARTH_ROTATION_RATE * simTimeSec) % (Math.PI * 2);

      // Base ocean globe
      const earthGradient = ctx.createRadialGradient(
        earthCenter.x - earthRadiusScreen * 0.3,
        earthCenter.y - earthRadiusScreen * 0.3,
        earthRadiusScreen * 0.1,
        earthCenter.x,
        earthCenter.y,
        earthRadiusScreen
      );
      earthGradient.addColorStop(0, '#38bdf8'); // luminous ocean
      earthGradient.addColorStop(0.5, '#0284c7');
      earthGradient.addColorStop(1, '#1e3a8a');

      ctx.fillStyle = earthGradient;
      ctx.beginPath();
      ctx.arc(earthCenter.x, earthCenter.y, earthRadiusScreen, 0, Math.PI * 2);
      ctx.fill();

      // Atmospheric glow
      ctx.strokeStyle = 'rgba(2, 132, 199, 0.45)';
      ctx.lineWidth = Math.max(1.5, earthRadiusScreen * 0.04);
      ctx.stroke();

      // Clip continents to Earth circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(earthCenter.x, earthCenter.y, earthRadiusScreen, 0, Math.PI * 2);
      ctx.clip();

      // Draw Earth Continents in 3D
      ctx.fillStyle = 'rgba(16, 185, 129, 0.65)'; // Emerald landmass
      ctx.strokeStyle = 'rgba(5, 150, 105, 0.9)';
      ctx.lineWidth = 1;

      WORLD_CONTINENTS.forEach((continent) => {
        ctx.beginPath();
        let first = true;
        continent.points.forEach(([lonDeg, latDeg]) => {
          // Convert lat/lon + Earth rotation to 3D Cartesian
          const latRad = (latDeg * Math.PI) / 180;
          const lonRad = (lonDeg * Math.PI) / 180 + earthRotRad;

          const px = EARTH_RADIUS * Math.cos(latRad) * Math.cos(lonRad);
          const py = EARTH_RADIUS * Math.cos(latRad) * Math.sin(lonRad);
          const pz = EARTH_RADIUS * Math.sin(latRad);

          const pt = project({ x: px, y: py, z: pz });
          if (pt.zDepth < 0) { // only front-facing roughly
            if (first) {
              ctx.moveTo(pt.x, pt.y);
              first = false;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          }
        });
        if (!first) {
          ctx.stroke();
          ctx.fill();
        }
      });

      // Dhaka / Bangladesh Ground Beacon
      const dhakaLatRad = (DHAKA_LAT * Math.PI) / 180;
      const dhakaLonRad = (DHAKA_LON * Math.PI) / 180 + earthRotRad;
      const dhakaPos: Vector3D = {
        x: EARTH_RADIUS * Math.cos(dhakaLatRad) * Math.cos(dhakaLonRad),
        y: EARTH_RADIUS * Math.cos(dhakaLatRad) * Math.sin(dhakaLonRad),
        z: EARTH_RADIUS * Math.sin(dhakaLatRad),
      };
      const dhakaScreen = project(dhakaPos);

      // Only draw if on front hemisphere
      if (dhakaScreen.zDepth < 0) {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(dhakaScreen.x, dhakaScreen.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(dhakaScreen.x, dhakaScreen.y, 7, 0, Math.PI * 2);
        ctx.stroke();

        drawHighContrastText(
          ctx,
          'Dhaka, BD (90.4°E)',
          dhakaScreen.x + 10,
          dhakaScreen.y - 4,
          '#b45309',
          'bold 11px JetBrains Mono, monospace',
          'left',
          true
        );
      }

      ctx.restore(); // unclip Earth

      // 3. Orbit Paths & Trajectories
      if (showOrbitTrails) {
        if (scenario === 'hohmann-transfer' && hohmannState) {
          const isLeoActive = hohmannState.stage === 'leo-stable';
          const isTransferActive = hohmannState.stage === 'transfer-ellipse' || hohmannState.stage === 'ready-delta2';
          const isGeoActive = hohmannState.stage === 'geo-circularized';

          // A. LEO Parking Ring
          ctx.save();
          if (isLeoActive) {
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 2.2;
            ctx.shadowColor = '#0284c7';
            ctx.shadowBlur = 6;
          } else {
            ctx.strokeStyle = 'rgba(2, 132, 199, 0.45)';
            ctx.lineWidth = 1.2;
            ctx.setLineDash([4, 4]);
          }
          ctx.beginPath();
          for (let angle = 0; angle <= Math.PI * 2; angle += 0.05) {
            const pt = project({
              x: hohmannState.r1 * Math.cos(angle),
              y: hohmannState.r1 * Math.sin(angle),
              z: 0,
            });
            if (angle === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
          ctx.closePath();
          ctx.stroke();
          ctx.restore();

          // B. Target GEO Ring
          ctx.save();
          if (isGeoActive) {
            ctx.strokeStyle = '#059669';
            ctx.lineWidth = 2.4;
            ctx.shadowColor = '#059669';
            ctx.shadowBlur = 8;
          } else {
            ctx.strokeStyle = 'rgba(5, 150, 105, 0.45)';
            ctx.lineWidth = 1.3;
            ctx.setLineDash([5, 5]);
          }
          ctx.beginPath();
          for (let angle = 0; angle <= Math.PI * 2; angle += 0.05) {
            const pt = project({
              x: hohmannState.r2 * Math.cos(angle),
              y: hohmannState.r2 * Math.sin(angle),
              z: 0,
            });
            if (angle === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
          ctx.closePath();
          ctx.stroke();
          ctx.restore();

          // C. Elliptical Transfer Orbit
          ctx.save();
          if (isTransferActive) {
            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#d97706';
            ctx.shadowBlur = 8;
          } else {
            ctx.strokeStyle = 'rgba(217, 119, 6, 0.5)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([6, 4]);
          }
          ctx.beginPath();
          const a_tx = hohmannState.a_tx;
          const e_tx = hohmannState.e_tx;
          const pAngle = hohmannState.periapsisAngle;
          for (let nu = 0; nu <= Math.PI * 2; nu += 0.05) {
            const r = (a_tx * (1 - e_tx * e_tx)) / (1 + e_tx * Math.cos(nu));
            const angle = pAngle + nu;
            const pt = project({
              x: r * Math.cos(angle),
              y: r * Math.sin(angle),
              z: 0,
            });
            if (nu === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
          ctx.closePath();
          ctx.stroke();
          ctx.restore();

          // D. Periapsis Point P Marker (Burn 1 point)
          const pPt3D = {
            x: hohmannState.r1 * Math.cos(pAngle),
            y: hohmannState.r1 * Math.sin(pAngle),
            z: 0,
          };
          const pScreen = project(pPt3D);
          ctx.fillStyle = '#0284c7';
          ctx.beginPath();
          ctx.arc(pScreen.x, pScreen.y, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          drawHighContrastText(
            ctx,
            `Periapsis P (+${hohmannState.deltaV1.toFixed(2)} km/s)`,
            pScreen.x + 8,
            pScreen.y - 8,
            '#0284c7',
            'bold 11px JetBrains Mono, monospace',
            'left',
            true
          );

          // E. Apoapsis Point A Marker (Burn 2 point)
          const aAngle = hohmannState.apoapsisAngle;
          const aPt3D = {
            x: hohmannState.r2 * Math.cos(aAngle),
            y: hohmannState.r2 * Math.sin(aAngle),
            z: 0,
          };
          const aScreen = project(aPt3D);
          ctx.fillStyle = '#d97706';
          ctx.beginPath();
          ctx.arc(aScreen.x, aScreen.y, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          drawHighContrastText(
            ctx,
            `Apoapsis A (+${hohmannState.deltaV2.toFixed(2)} km/s)`,
            aScreen.x - 8,
            aScreen.y - 8,
            '#d97706',
            'bold 11px JetBrains Mono, monospace',
            'right',
            true
          );
        } else {
          // Standard full 3D orbital rings
          satellites.forEach((sat) => {
            if (sat.orbitPath && sat.orbitPath.length > 2) {
              ctx.strokeStyle = sat.color;
              ctx.lineWidth = 1.8;
              ctx.beginPath();
              sat.orbitPath.forEach((pt, i) => {
                const screenPt = project(pt);
                if (i === 0) ctx.moveTo(screenPt.x, screenPt.y);
                else ctx.lineTo(screenPt.x, screenPt.y);
              });
              ctx.closePath();
              ctx.stroke();
            }
          });
        }
      }

      // 4. Conjunction Line in Dual Resonance Mode
      if (scenario === 'dual-resonance' && satellites.length >= 2) {
        const s1 = project(satellites[0].pos);
        const s2 = project(satellites[1].pos);

        // Core to Satellites guide lines
        ctx.strokeStyle = 'rgba(225, 29, 72, 0.45)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(earthCenter.x, earthCenter.y);
        ctx.lineTo(s1.x, s1.y);
        ctx.moveTo(earthCenter.x, earthCenter.y);
        ctx.lineTo(s2.x, s2.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // If aligned or within flash period
        if (isAligned || conjunctionFlashTimer > 0) {
          ctx.save();
          ctx.strokeStyle = `rgba(225, 29, 72, ${Math.max(0.6, conjunctionFlashTimer)})`;
          ctx.lineWidth = 3.0;
          ctx.shadowColor = '#e11d48';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.moveTo(earthCenter.x, earthCenter.y);
          ctx.lineTo(s2.x, s2.y);
          ctx.stroke();

          // Alignment text
          drawHighContrastText(
            ctx,
            'CONJUNCTION ALIGNMENT',
            (s1.x + s2.x) / 2 + 10,
            (s1.y + s2.y) / 2,
            '#e11d48',
            'bold 12px JetBrains Mono, monospace',
            'left',
            true
          );
          ctx.restore();
        }
      }

      // 5. Draw Satellites & Vectors
      satellites.forEach((sat) => {
        const satScreen = project(sat.pos);

        // Satellite Marker
        ctx.fillStyle = sat.color;
        ctx.beginPath();
        ctx.arc(satScreen.x, satScreen.y, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Velocity Vector Arrow
        if (showVelocityVector && sat.vel) {
          const vScale = 3.5;
          const vTip = {
            x: sat.pos.x + sat.vel.x * vScale * 100,
            y: sat.pos.y + sat.vel.y * vScale * 100,
            z: sat.pos.z + sat.vel.z * vScale * 100,
          };
          const vScreen = project(vTip);

          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(satScreen.x, satScreen.y);
          ctx.lineTo(vScreen.x, vScreen.y);
          ctx.stroke();

          // Arrowhead
          const angle = Math.atan2(vScreen.y - satScreen.y, vScreen.x - satScreen.x);
          ctx.fillStyle = '#0284c7';
          ctx.beginPath();
          ctx.moveTo(vScreen.x, vScreen.y);
          ctx.lineTo(vScreen.x - 7 * Math.cos(angle - 0.4), vScreen.y - 7 * Math.sin(angle - 0.4));
          ctx.lineTo(vScreen.x - 7 * Math.cos(angle + 0.4), vScreen.y - 7 * Math.sin(angle + 0.4));
          ctx.fill();

          drawHighContrastText(
            ctx,
            `v = ${sat.velocity.toFixed(2)} km/s`,
            vScreen.x + 8,
            vScreen.y - 6,
            '#0284c7',
            'bold 11px JetBrains Mono, monospace',
            'left',
            false
          );
        }

        // Acceleration / Gravity Vector Arrow pointing toward Earth center
        if (showAccelVector) {
          const dx = earthCenter.x - satScreen.x;
          const dy = earthCenter.y - satScreen.y;
          const dist = Math.hypot(dx, dy) || 1;
          const aLength = 36;
          const targetX = satScreen.x + (dx / dist) * aLength;
          const targetY = satScreen.y + (dy / dist) * aLength;

          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(satScreen.x, satScreen.y);
          ctx.lineTo(targetX, targetY);
          ctx.stroke();

          // Arrowhead toward Earth
          const angleA = Math.atan2(targetY - satScreen.y, targetX - satScreen.x);
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.moveTo(targetX, targetY);
          ctx.lineTo(targetX - 6 * Math.cos(angleA - 0.4), targetY - 6 * Math.sin(angleA - 0.4));
          ctx.lineTo(targetX - 6 * Math.cos(angleA + 0.4), targetY - 6 * Math.sin(angleA + 0.4));
          ctx.fill();

          const ag_m_s2 = ((MU_EARTH / (sat.radius * sat.radius)) * 1000).toFixed(2);
          drawHighContrastText(
            ctx,
            `a_g = ${ag_m_s2} m/s²`,
            targetX + 8,
            targetY + 8,
            '#dc2626',
            'bold 11px JetBrains Mono, monospace',
            'left',
            false
          );
        }

        // Satellite Labels
        drawHighContrastText(
          ctx,
          sat.name,
          satScreen.x + 10,
          satScreen.y - 12,
          '#0f172a',
          'bold 12px JetBrains Mono, monospace',
          'left',
          false
        );

        drawHighContrastText(
          ctx,
          `${sat.altitude.toFixed(0)} km`,
          satScreen.x + 10,
          satScreen.y + 4,
          '#0284c7',
          'bold 11px JetBrains Mono, monospace',
          'left',
          false
        );
      });
    };

    render();
  }, [satellites, simTimeSec, camera, showVelocityVector, showAccelVector, showOrbitTrails, isAligned, conjunctionFlashTimer, scenario, hohmannState]);

  return (
    <div
      className="relative w-full h-full bg-[#f0f7ff] cursor-grab active:cursor-grabbing select-none overflow-hidden"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Floating HUD Controls in Top-Left of Viewport */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 p-1 bg-white/95 backdrop-blur border border-sky-300 rounded-lg text-slate-800 shadow-sm">
        <button
          onClick={resetCamera}
          className="p-1.5 hover:bg-sky-100 rounded text-xs transition-colors text-slate-700 hover:text-sky-950"
          title="Reset Camera (ক্যামেরা রিসেট)"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setCamera((prev) => ({ ...prev, distance: Math.max(25000, prev.distance * 0.8) }))}
          className="p-1.5 hover:bg-sky-100 rounded text-xs transition-colors text-slate-700 hover:text-sky-950"
          title="Zoom In (জুম ইন)"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setCamera((prev) => ({ ...prev, distance: Math.min(300000, prev.distance * 1.25) }))}
          className="p-1.5 hover:bg-sky-100 rounded text-xs transition-colors text-slate-700 hover:text-sky-950"
          title="Zoom Out (জুম আউট)"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <div className="h-3.5 w-px bg-sky-300 mx-1"></div>
        <div className="text-xs font-mono text-sky-900 font-semibold px-1">
          DRAG TO ROTATE · SCROLL TO ZOOM
        </div>
      </div>

      {/* Top-Right Info Ribbon */}
      <div className="absolute top-3 right-3 hidden sm:flex items-center gap-3 text-xs font-mono bg-white/95 backdrop-blur px-3 py-1.5 rounded-lg border border-sky-300 text-slate-800 shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-sky-600"></span>
          <span className="text-sky-800 font-bold">v&#8407; Velocity</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-600"></span>
          <span className="text-red-700 font-bold">a&#8407;_g Gravity</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          <span className="text-amber-800 font-bold">Dhaka (90.4°E)</span>
        </div>
      </div>
    </div>
  );
};
