import React, { useRef, useEffect, useState } from 'react';
import { SatelliteState, ScenarioMode, HohmannTransferState } from '../physics/types';
import { EARTH_RADIUS, GEO_RADIUS, LEO_RADIUS, MU_EARTH } from '../physics/constants';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface Viewport2DProps {
  satellites: SatelliteState[];
  simTimeSec: number;
  showVelocityVector: boolean;
  showAccelVector: boolean;
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

export const Viewport2D: React.FC<Viewport2DProps> = ({
  satellites,
  simTimeSec,
  showVelocityVector,
  showAccelVector,
  isAligned,
  conjunctionFlashTimer,
  scenario,
  hohmannState,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.4, Math.min(4.0, z * (e.deltaY > 0 ? 0.9 : 1.1))));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const cx = width / 2 + pan.x;
    const cy = height / 2 + pan.y;

    // 0. Light Blue Canvas Background Gradient
    const bgGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, Math.max(width, height));
    bgGrad.addColorStop(0, '#f8fafc');
    bgGrad.addColorStop(0.4, '#f0f9ff');
    bgGrad.addColorStop(1, '#dbeafe');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle Celestial Grid dots
    ctx.fillStyle = 'rgba(147, 197, 253, 0.45)';
    const gridSpacing = 40;
    for (let gx = 0; gx < width; gx += gridSpacing) {
      for (let gy = 0; gy < height; gy += gridSpacing) {
        ctx.fillRect(gx, gy, 1.2, 1.2);
      }
    }

    // Scale: GEO radius (42,164 km) occupies approx 38% of half-screen
    const baseScale = (Math.min(width, height) * 0.38) / GEO_RADIUS;
    const scale = baseScale * zoom;

    const kmToScreen = (km: number) => km * scale;

    // 1. Polar Coordinate Grids & Radial Reference Rings
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.8)';
    ctx.lineWidth = 1;

    // Concentric Orbit Circles (LEO, MEO/GPS, GEO)
    const referenceRadii = [
      { r: LEO_RADIUS, label: 'LEO Ring (500 km)', color: '#0284c7', ringColor: 'rgba(2, 132, 199, 0.45)' },
      { r: EARTH_RADIUS + 20200, label: 'MEO/GPS Ring (20,200 km)', color: '#2563eb', ringColor: 'rgba(37, 99, 235, 0.4)' },
      { r: GEO_RADIUS, label: 'GEO Orbit (35,786 km)', color: '#059669', ringColor: 'rgba(5, 150, 105, 0.5)' },
    ];

    referenceRadii.forEach(({ r, label, color, ringColor }) => {
      ctx.strokeStyle = ringColor;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, kmToScreen(r), 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      drawHighContrastText(
        ctx,
        label,
        cx + kmToScreen(r) + 8,
        cy - 4,
        color,
        'bold 11px JetBrains Mono, monospace',
        'left',
        true
      );
    });

    // Radial axis lines (0, 90, 180, 270 deg)
    ctx.strokeStyle = 'rgba(147, 197, 253, 0.6)';
    ctx.beginPath();
    ctx.moveTo(cx - kmToScreen(GEO_RADIUS * 1.3), cy);
    ctx.lineTo(cx + kmToScreen(GEO_RADIUS * 1.3), cy);
    ctx.moveTo(cx, cy - kmToScreen(GEO_RADIUS * 1.3));
    ctx.lineTo(cx, cy + kmToScreen(GEO_RADIUS * 1.3));
    ctx.stroke();

    // 2. Earth Center Disk
    const earthRScreen = kmToScreen(EARTH_RADIUS);
    const earthGrad = ctx.createRadialGradient(cx - earthRScreen * 0.2, cy - earthRScreen * 0.2, 2, cx, cy, earthRScreen);
    earthGrad.addColorStop(0, '#38bdf8');
    earthGrad.addColorStop(0.5, '#0284c7');
    earthGrad.addColorStop(1, '#1e3a8a');

    ctx.fillStyle = earthGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, earthRScreen, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // Earth Center Label - crystal clear badge
    drawHighContrastText(
      ctx,
      'EARTH (M = 5.972×10²⁴ kg)',
      cx,
      cy,
      '#0f172a',
      'bold 11px JetBrains Mono, monospace',
      'center',
      true
    );

    // 3. Orbits of Active Satellites
    if (scenario === 'hohmann-transfer' && hohmannState) {
      const isLeoActive = hohmannState.stage === 'leo-stable';
      const isTransferActive = hohmannState.stage === 'transfer-ellipse' || hohmannState.stage === 'ready-delta2';
      const isGeoActive = hohmannState.stage === 'geo-circularized';

      // A. Initial Circular Orbit (r1)
      ctx.save();
      if (isLeoActive) {
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2.2;
        ctx.shadowColor = '#0284c7';
        ctx.shadowBlur = 6;
      } else {
        ctx.strokeStyle = 'rgba(2, 132, 199, 0.45)';
        ctx.lineWidth = 1.3;
        ctx.setLineDash([4, 4]);
      }
      ctx.beginPath();
      ctx.arc(cx, cy, kmToScreen(hohmannState.r1), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // B. Target Circular Orbit (r2)
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
      ctx.arc(cx, cy, kmToScreen(hohmannState.r2), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // C. Transfer Ellipse
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
      for (let nu = 0; nu <= Math.PI * 2 + 0.05; nu += 0.05) {
        const r = (a_tx * (1 - e_tx * e_tx)) / (1 + e_tx * Math.cos(nu));
        const angle = pAngle + nu;
        const px = cx + kmToScreen(r * Math.cos(angle));
        const py = cy - kmToScreen(r * Math.sin(angle));
        if (nu === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();

      // D. Periapsis Marker Point P
      const pX = cx + kmToScreen(hohmannState.r1 * Math.cos(pAngle));
      const pY = cy - kmToScreen(hohmannState.r1 * Math.sin(pAngle));
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(pX, pY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      drawHighContrastText(
        ctx,
        `Periapsis P (Burn 1: +${hohmannState.deltaV1.toFixed(2)} km/s)`,
        pX + 10,
        pY - 8,
        '#0284c7',
        'bold 11px JetBrains Mono, monospace',
        'left',
        true
      );

      // E. Apoapsis Marker Point A
      const aAngle = hohmannState.apoapsisAngle;
      const aX = cx + kmToScreen(hohmannState.r2 * Math.cos(aAngle));
      const aY = cy - kmToScreen(hohmannState.r2 * Math.sin(aAngle));
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.arc(aX, aY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      drawHighContrastText(
        ctx,
        `Apoapsis A (Burn 2: +${hohmannState.deltaV2.toFixed(2)} km/s)`,
        aX - 10,
        aY - 8,
        '#d97706',
        'bold 11px JetBrains Mono, monospace',
        'right',
        true
      );
    } else {
      // General satellite orbit trails / circles
      satellites.forEach((sat) => {
        ctx.strokeStyle = sat.color;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(cx, cy, kmToScreen(sat.radius), 0, Math.PI * 2);
        ctx.stroke();
      });
    }

    // 4. Conjunction Line if Dual Resonance Mode
    if (scenario === 'dual-resonance' && satellites.length >= 2) {
      const sat1 = satellites[0];
      const sat2 = satellites[1];
      const s1X = cx + kmToScreen(sat1.pos.x);
      const s1Y = cy - kmToScreen(sat1.pos.y);
      const s2X = cx + kmToScreen(sat2.pos.x);
      const s2Y = cy - kmToScreen(sat2.pos.y);

      // Laser guide line between Earth core and Satellites
      ctx.strokeStyle = 'rgba(225, 29, 72, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(s1X, s1Y);
      ctx.moveTo(cx, cy);
      ctx.lineTo(s2X, s2Y);
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
        ctx.moveTo(cx, cy);
        ctx.lineTo(s2X, s2Y);
        ctx.stroke();
        ctx.restore();

        // Flash text with high-contrast badge
        drawHighContrastText(
          ctx,
          'CONJUNCTION ALIGNMENT (একত্রিত সংযোগ)',
          (s1X + s2X) / 2 + 10,
          (s1Y + s2Y) / 2,
          '#e11d48',
          'bold 12px JetBrains Mono, monospace',
          'left',
          true
        );
      }
    }

    // 5. Draw Satellites & Vector Arrows
    satellites.forEach((sat) => {
      const sx = cx + kmToScreen(sat.pos.x);
      const sy = cy - kmToScreen(sat.pos.y);

      // Satellite body
      ctx.fillStyle = sat.color;
      ctx.beginPath();
      ctx.arc(sx, sy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Velocity Vector arrow (Cyan/Sapphire)
      if (showVelocityVector && sat.vel) {
        const vScale = 4.5;
        const vxScreen = sat.vel.x * vScale;
        const vyScreen = -sat.vel.y * vScale; // canvas inverted Y

        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + vxScreen, sy + vyScreen);
        ctx.stroke();

        // Arrowhead
        const angleV = Math.atan2(vyScreen, vxScreen);
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.moveTo(sx + vxScreen, sy + vyScreen);
        ctx.lineTo(sx + vxScreen - 7 * Math.cos(angleV - 0.4), sy + vyScreen - 7 * Math.sin(angleV - 0.4));
        ctx.lineTo(sx + vxScreen - 7 * Math.cos(angleV + 0.4), sy + vyScreen - 7 * Math.sin(angleV + 0.4));
        ctx.fill();

        drawHighContrastText(
          ctx,
          `v = ${sat.velocity.toFixed(2)} km/s`,
          sx + vxScreen + 8,
          sy + vyScreen - 6,
          '#0284c7',
          'bold 11px JetBrains Mono, monospace',
          'left',
          false
        );
      }

      // Acceleration / Gravity Force Vector arrow (Crimson pointing to Earth core)
      if (showAccelVector) {
        const dx = cx - sx;
        const dy = cy - sy;
        const dist = Math.hypot(dx, dy) || 1;
        const aLen = 38; // fixed visual length
        const axScreen = (dx / dist) * aLen;
        const ayScreen = (dy / dist) * aLen;

        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + axScreen, sy + ayScreen);
        ctx.stroke();

        // Arrowhead
        const angleA = Math.atan2(ayScreen, axScreen);
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.moveTo(sx + axScreen, sy + ayScreen);
        ctx.lineTo(sx + axScreen - 6 * Math.cos(angleA - 0.4), sy + ayScreen - 6 * Math.sin(angleA - 0.4));
        ctx.lineTo(sx + axScreen - 6 * Math.cos(angleA + 0.4), sy + ayScreen - 6 * Math.sin(angleA + 0.4));
        ctx.fill();

        const ag_m_s2 = ((MU_EARTH / (sat.radius * sat.radius)) * 1000).toFixed(2);
        drawHighContrastText(
          ctx,
          `a_g = ${ag_m_s2} m/s²`,
          sx + axScreen + 8,
          sy + ayScreen + 10,
          '#dc2626',
          'bold 11px JetBrains Mono, monospace',
          'left',
          false
        );
      }

      // Rocket exhaust plume if engine burning
      if (hohmannState && (hohmannState.isBurning || (hohmannState.burnFlashTimer ?? 0) > 0)) {
        ctx.save();
        const vMag = Math.sqrt(sat.vel.x * sat.vel.x + sat.vel.y * sat.vel.y) || 1;
        const exhaustX = -sat.vel.x / vMag;
        const exhaustY = sat.vel.y / vMag; // note inverted Y on canvas
        const flameLen = 22;

        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + exhaustX * flameLen, sy + exhaustY * flameLen);
        ctx.stroke();

        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + exhaustX * flameLen * 0.5, sy + exhaustY * flameLen * 0.5);
        ctx.stroke();
        ctx.restore();
      }

      // Satellite Label
      drawHighContrastText(
        ctx,
        sat.name,
        sx + 10,
        sy - 12,
        '#0f172a',
        'bold 12px JetBrains Mono, monospace',
        'left',
        false
      );
    });
  }, [satellites, simTimeSec, zoom, pan, showVelocityVector, showAccelVector, isAligned, conjunctionFlashTimer, scenario, hohmannState]);

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

      {/* Floating HUD Controls */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 p-1 bg-white/95 backdrop-blur border border-sky-300 rounded-lg text-slate-800 shadow-sm">
        <button
          onClick={() => { setZoom(1.0); setPan({ x: 0, y: 0 }); }}
          className="p-1.5 hover:bg-sky-100 rounded text-xs transition-colors text-slate-700 hover:text-sky-950"
          title="Reset View"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.min(4.0, z * 1.2))}
          className="p-1.5 hover:bg-sky-100 rounded text-xs transition-colors text-slate-700 hover:text-sky-950"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.4, z * 0.8))}
          className="p-1.5 hover:bg-sky-100 rounded text-xs transition-colors text-slate-700 hover:text-sky-950"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <div className="h-3.5 w-px bg-sky-300 mx-1"></div>
        <div className="text-xs font-mono text-sky-900 font-semibold px-1">
          2D EQUATORIAL/POLAR PLANE PROJECTION
        </div>
      </div>

      {/* Physics Gauge Legend */}
      <div className="absolute top-3 right-3 hidden sm:flex items-center gap-3 text-xs font-mono bg-white/95 backdrop-blur px-3 py-1.5 rounded-lg border border-sky-300 text-slate-800 shadow-sm">
        <span className="text-sky-700 font-bold">Blue: Velocity v&#8407;</span>
        <span className="text-slate-400">·</span>
        <span className="text-red-600 font-bold">Red: Gravity a&#8407;_g</span>
        <span className="text-slate-400">·</span>
        <span className="text-emerald-700 font-bold">Green Ring: GEO</span>
      </div>
    </div>
  );
};
