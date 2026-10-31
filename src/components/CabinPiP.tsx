import React, { useRef, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Zap, Minimize2, Maximize2 } from 'lucide-react';
import { CabinMicrogravityState } from '../physics/types';

interface CabinPiPProps {
  currentAltitudeKm: number;
  onFireThrusterDeltaV?: () => void;
  position?: 'bottom-left' | 'bottom-right';
}

export const CabinPiP: React.FC<CabinPiPProps> = ({
  currentAltitudeKm,
  onFireThrusterDeltaV,
  position = 'bottom-right',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isThrustActive, setIsThrustActive] = useState(false);
  const [astronautG, setAstronautG] = useState(0.0);

  // Physics state of floating objects inside cabin
  const cabinRef = useRef({
    // Astronaut (x, y, vx, vy, angle, vangle)
    astro: { x: 130, y: 85, vx: 0.15, vy: -0.1, angle: 0.05, vangle: 0.004 },
    // Loose wrench / tool
    wrench: { x: 75, y: 55, vx: -0.2, vy: 0.15, angle: 0.2, vangle: -0.015 },
    // Floating pen
    pen: { x: 190, y: 110, vx: 0.1, vy: 0.25, angle: -0.4, vangle: 0.02 },
    // Thrust inertia force vector
    thrustAccX: 0,
    apparentG: 0,
  });

  // Trigger thruster pulse
  const triggerThrust = () => {
    setIsThrustActive(true);
    if (onFireThrusterDeltaV) onFireThrusterDeltaV();

    // Sudden forward acceleration creates backward inertial force in cabin frame
    cabinRef.current.thrustAccX = -6.5;
    cabinRef.current.apparentG = 1.45;
    setAstronautG(1.45);

    setTimeout(() => {
      cabinRef.current.thrustAccX = 0;
      cabinRef.current.apparentG = 0;
      setIsThrustActive(false);
      setAstronautG(0.0);
    }, 1800);
  };

  useEffect(() => {
    if (isCollapsed) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      const state = cabinRef.current;

      // 1. Cabin Interior Background (Spacecraft Bulkhead & Window in Clean Light Blue)
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#f0f9ff');
      grad.addColorStop(1, '#e0f2fe');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Cabin wall panel lines
      ctx.strokeStyle = 'rgba(147, 197, 253, 0.7)';
      ctx.lineWidth = 1;
      ctx.strokeRect(10, 10, width - 20, height - 20);
      ctx.beginPath();
      ctx.moveTo(10, 50);
      ctx.lineTo(width - 10, 50);
      ctx.moveTo(10, 110);
      ctx.lineTo(width - 10, 110);
      ctx.stroke();

      // Porthole / Observation Window looking out at Earth
      const winX = 45;
      const winY = 80;
      const winR = 24;

      ctx.save();
      ctx.beginPath();
      ctx.arc(winX, winY, winR, 0, Math.PI * 2);
      ctx.clip();

      // View of blue curved Earth and black space through window
      ctx.fillStyle = '#020617';
      ctx.fillRect(winX - winR, winY - winR, winR * 2, winR * 2);

      const earthGrad = ctx.createRadialGradient(winX + 15, winY + 30, 2, winX + 15, winY + 30, 35);
      earthGrad.addColorStop(0, '#38bdf8');
      earthGrad.addColorStop(0.5, '#1e40af');
      earthGrad.addColorStop(1, '#030712');
      ctx.fillStyle = earthGrad;
      ctx.beginPath();
      ctx.arc(winX + 10, winY + 25, 28, 0, Math.PI * 2);
      ctx.fill();

      // Tiny stars in porthole
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(winX - 12, winY - 14, 1.5, 1.5);
      ctx.fillRect(winX + 5, winY - 18, 1, 1);
      ctx.restore();

      // Porthole rim with rivets
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(winX, winY, winR, 0, Math.PI * 2);
      ctx.stroke();

      // 2. Physics Update for Objects inside Cabin
      const astro = state.astro;
      const wrench = state.wrench;
      const pen = state.pen;

      // Inertial force: ax = thrustAccX
      astro.vx += state.thrustAccX * 0.05;
      wrench.vx += state.thrustAccX * 0.08;
      pen.vx += state.thrustAccX * 0.09;

      // Damping / restitution
      astro.vx *= 0.96;
      astro.vy *= 0.98;
      wrench.vx *= 0.98;
      wrench.vy *= 0.98;
      pen.vx *= 0.98;

      astro.x += astro.vx;
      astro.y += astro.vy;
      astro.angle += astro.vangle;

      wrench.x += wrench.vx;
      wrench.y += wrench.vy;
      wrench.angle += wrench.vangle;

      pen.x += pen.vx;
      pen.y += pen.vy;
      pen.angle += pen.vangle;

      // Wall boundaries collision & bounce
      const margin = 20;
      if (astro.x < margin + 15) { astro.x = margin + 15; astro.vx = -astro.vx * 0.6; }
      if (astro.x > width - margin - 15) { astro.x = width - margin - 15; astro.vx = -astro.vx * 0.6; }
      if (astro.y < margin + 15) { astro.y = margin + 15; astro.vy = -astro.vy * 0.6; }
      if (astro.y > height - margin - 15) { astro.y = height - margin - 15; astro.vy = -astro.vy * 0.6; }

      if (wrench.x < margin) { wrench.x = margin; wrench.vx = -wrench.vx * 0.7; }
      if (wrench.x > width - margin) { wrench.x = width - margin; wrench.vx = -wrench.vx * 0.7; }
      if (wrench.y < margin) { wrench.y = margin; wrench.vy = -wrench.vy * 0.7; }
      if (wrench.y > height - margin) { wrench.y = height - margin; wrench.vy = -wrench.vy * 0.7; }

      if (pen.x < margin) { pen.x = margin; pen.vx = -pen.vx * 0.7; }
      if (pen.x > width - margin) { pen.x = width - margin; pen.vx = -pen.vx * 0.7; }
      if (pen.y < margin) { pen.y = margin; pen.vy = -pen.vy * 0.7; }
      if (pen.y > height - margin) { pen.y = height - margin; pen.vy = -pen.vy * 0.7; }

      // 3. Draw Floating Objects inside Cabin
      // A. Floating Tool / Wrench
      ctx.save();
      ctx.translate(wrench.x, wrench.y);
      ctx.rotate(wrench.angle);
      ctx.fillStyle = '#334155';
      ctx.fillRect(-10, -2.5, 20, 5);
      ctx.beginPath();
      ctx.arc(-10, 0, 5, 0, Math.PI * 2);
      ctx.arc(10, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f0f9ff';
      ctx.beginPath();
      ctx.arc(-10, 0, 2, 0, Math.PI * 2);
      ctx.arc(10, 0, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // B. Floating Stylus / Pen
      ctx.save();
      ctx.translate(pen.x, pen.y);
      ctx.rotate(pen.angle);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-8, -1.5, 16, 3);
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(8, -1.5);
      ctx.lineTo(12, 0);
      ctx.lineTo(8, 1.5);
      ctx.fill();
      ctx.restore();

      // C. Floating Astronaut in Spacesuit
      ctx.save();
      ctx.translate(astro.x, astro.y);
      ctx.rotate(astro.angle);

      // White space suit body
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.4;

      // Torso
      ctx.beginPath();
      ctx.roundRect(-10, -12, 20, 24, 5);
      ctx.fill();
      ctx.stroke();

      // Helmet
      ctx.beginPath();
      ctx.arc(0, -20, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Gold reflective Visor
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.ellipse(3, -20, 7, 5, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Suit Arms
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-10, -5);
      ctx.lineTo(-18, 5);
      ctx.moveTo(10, -5);
      ctx.lineTo(18, -2);
      ctx.stroke();

      // Suit Legs
      ctx.beginPath();
      ctx.moveTo(-5, 12);
      ctx.lineTo(-8, 25);
      ctx.moveTo(5, 12);
      ctx.lineTo(10, 25);
      ctx.stroke();

      // Mission badge
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-4, -6, 8, 5);

      ctx.restore();

      // 4. Thruster Flame Effect (If thrust active)
      if (isThrustActive) {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(width - 6, height / 2 - 12, 6, 24);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(width - 4, height / 2 - 8, 4, 16);

        // Flash banner with clear backdrop
        ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
        ctx.fillRect(12, 14, width - 24, 24);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.4;
        ctx.strokeRect(12, 14, width - 24, 24);

        ctx.fillStyle = '#b91c1c';
        ctx.font = 'bold 11px JetBrains Mono, monospace';
        ctx.textBaseline = 'middle';
        ctx.fillText('THRUSTER FIRING: INERTIAL G-FORCE ACTIVE', 18, 26);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isCollapsed, isThrustActive]);

  const posClass = position === 'bottom-left' ? 'bottom-3 left-3' : 'bottom-3 right-3';

  return (
    <div
      className={`absolute ${posClass} bg-white/95 backdrop-blur-md border border-sky-300 rounded-xl overflow-hidden shadow-xl transition-all duration-300 z-20 ${
        isCollapsed ? 'w-64 h-11' : 'w-72 sm:w-80 h-64'
      }`}
    >
      {/* Header bar */}
      <div className="h-10 px-3 bg-sky-100/90 border-b border-sky-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-bold text-sky-950 font-display">
            Cabin Microgravity (ওজনহীনতা)
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 text-slate-700 hover:text-sky-950 rounded transition-colors"
            title={isCollapsed ? 'Expand PiP' : 'Collapse PiP'}
          >
            {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="relative w-full h-[calc(100%-2.5rem)] flex flex-col">
          <canvas
            ref={canvasRef}
            width={320}
            height={160}
            className="w-full flex-1 block bg-sky-50"
          />

          {/* Bottom Telemetry & Thruster Button */}
          <div className="h-12 px-3 bg-white border-t border-sky-200 flex items-center justify-between text-xs font-mono">
            <div>
              <span className="text-slate-600 font-medium">Scale: </span>
              <span className={`font-bold tabular-nums text-sm ${astronautG > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {astronautG.toFixed(2)} g
              </span>
              <span className="text-xs text-slate-500 font-medium ml-1">
                {astronautG === 0 ? '(Free Fall W=0)' : '(Inertial W>0)'}
              </span>
            </div>

            <button
              onClick={triggerThrust}
              disabled={isThrustActive}
              className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs ${
                isThrustActive
                  ? 'bg-amber-500 text-slate-950 border border-amber-600'
                  : 'bg-sky-600 text-white hover:bg-sky-700'
              }`}
              title="Apply engine thrust to demonstrate acceleration vs weightlessness"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isThrustActive ? 'Firing...' : 'Fire Δv'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
