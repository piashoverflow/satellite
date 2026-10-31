import React, { useRef, useEffect, useState } from 'react';
import { SatelliteState } from '../physics/types';
import { WORLD_CONTINENTS, GEO_TARGET_LOCATION } from '../physics/worldData';
import { getGroundCoverageRadius } from '../physics/orbitalMath';
import { Layers, MapPin, Eye } from 'lucide-react';

interface ViewportGroundTrackProps {
  satellites: SatelliteState[];
  simTimeSec: number;
}

export const ViewportGroundTrack: React.FC<ViewportGroundTrackProps> = ({
  satellites,
  simTimeSec,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showSwathCoverage, setShowSwathCoverage] = useState(true);
  const [hoverCoord, setHoverCoord] = useState<{ lat: number; lon: number } | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const lon = ((x / rect.width) * 360) - 180;
    const lat = 90 - ((y / rect.height) * 180);
    setHoverCoord({ lat, lon });
  };

  const handleMouseLeave = () => {
    setHoverCoord(null);
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

    ctx.clearRect(0, 0, width, height);

    // Coordinate conversion
    const lonToX = (lon: number) => ((lon + 180) / 360) * width;
    const latToY = (lat: number) => ((90 - lat) / 180) * height;

    // 1. Light Ocean Background
    const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
    oceanGrad.addColorStop(0, '#e0f2fe');
    oceanGrad.addColorStop(0.5, '#dbeafe');
    oceanGrad.addColorStop(1, '#bfdbfe');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Lat/Lon Coordinate Grid
    ctx.strokeStyle = 'rgba(147, 197, 253, 0.6)';
    ctx.lineWidth = 0.8;

    // Longitude lines every 30 deg
    for (let lon = -180; lon <= 180; lon += 30) {
      const x = lonToX(lon);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      ctx.fillStyle = '#0369a1';
      ctx.font = 'bold 10px JetBrains Mono, monospace';
      ctx.fillText(`${lon}°`, x + 3, height - 6);
    }

    // Latitude lines every 30 deg
    for (let lat = -60; lat <= 60; lat += 30) {
      const y = latToY(lat);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      ctx.fillStyle = '#0369a1';
      ctx.font = 'bold 10px JetBrains Mono, monospace';
      ctx.fillText(`${lat}°`, 6, y - 3);
    }

    // Equator (0 deg lat) & Prime Meridian (0 deg lon)
    ctx.strokeStyle = 'rgba(2, 132, 199, 0.7)';
    ctx.lineWidth = 1.4;
    // Equator
    ctx.beginPath();
    ctx.moveTo(0, latToY(0));
    ctx.lineTo(width, latToY(0));
    ctx.stroke();
    // Prime Meridian
    ctx.beginPath();
    ctx.moveTo(lonToX(0), 0);
    ctx.lineTo(lonToX(0), height);
    ctx.stroke();

    // 3. Continents Vector Outlines (Clean Light Pastel Landmass)
    ctx.fillStyle = 'rgba(187, 247, 208, 0.85)'; // Fresh emerald-mint landmass
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)';
    ctx.lineWidth = 1.2;

    WORLD_CONTINENTS.forEach((continent) => {
      ctx.beginPath();
      continent.points.forEach(([lon, lat], i) => {
        const x = lonToX(lon);
        const y = latToY(lat);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    // 4. Dhaka / Bangladesh Ground Beacon
    const dhakaX = lonToX(GEO_TARGET_LOCATION.lon);
    const dhakaY = latToY(GEO_TARGET_LOCATION.lat);

    // Dhaka target circles
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(dhakaX, dhakaY, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(dhakaX, dhakaY, 9, 0, Math.PI * 2);
    ctx.stroke();

    const dText = 'Dhaka, Bangladesh (90.4°E, 23.8°N)';
    ctx.font = 'bold 11px Plus Jakarta Sans, sans-serif';
    const dW = ctx.measureText(dText).width;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(dhakaX + 10, dhakaY - 14, dW + 12, 20);
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(dhakaX + 10, dhakaY - 14, dW + 12, 20);

    ctx.fillStyle = '#b45309';
    ctx.textBaseline = 'middle';
    ctx.fillText(dText, dhakaX + 16, dhakaY - 3);

    // 5. Swath Coverage / Footprint Painting
    if (showSwathCoverage) {
      satellites.forEach((sat) => {
        const satX = lonToX(sat.lon);
        const satY = latToY(sat.lat);

        if (sat.name.includes('GEO') || sat.altitude > 30000) {
          // GEO Footprint covers almost 1/3 of the globe
          const geoRadiusKm = 7500; // broad hemispheric beam
          const footprintPixelR = (geoRadiusKm / 40075) * width;

          const grad = ctx.createRadialGradient(satX, satY, 5, satX, satY, footprintPixelR);
          grad.addColorStop(0, 'rgba(5, 150, 105, 0.4)');
          grad.addColorStop(0.7, 'rgba(16, 185, 129, 0.15)');
          grad.addColorStop(1, 'rgba(16, 185, 129, 0)');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(satX, satY, footprintPixelR, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = 'rgba(5, 150, 105, 0.4)';
          ctx.stroke();
        } else {
          // LEO / Polar Swath Footprint
          const swathKm = getGroundCoverageRadius(sat.altitude, 30);
          const swathPixelR = Math.max(12, (swathKm / 40075) * width * 1.5);

          ctx.fillStyle = 'rgba(147, 51, 234, 0.25)'; // Purple swath
          ctx.beginPath();
          ctx.arc(satX, satY, swathPixelR, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(126, 34, 206, 0.5)';
          ctx.stroke();
        }
      });
    }

    // 6. Ground Track Trails
    satellites.forEach((sat) => {
      if (!sat.trail || sat.trail.length < 2) return;

      ctx.strokeStyle = sat.color;
      ctx.lineWidth = 2.0;

      ctx.beginPath();
      let prevX: number | null = null;
      let prevY: number | null = null;

      sat.trail.forEach((pt) => {
        const px = lonToX(pt.lon);
        const py = latToY(pt.lat);

        if (prevX !== null && prevY !== null) {
          // Prevent wrap-around lines when crossing the 180° / -180° date line
          if (Math.abs(px - prevX) < width * 0.4) {
            ctx.beginPath();
            ctx.moveTo(prevX, prevY);
            ctx.lineTo(px, py);
            ctx.stroke();
          }
        }
        prevX = px;
        prevY = py;
      });
    });

    // 7. Satellite Sub-Satellite Points & Markers
    satellites.forEach((sat) => {
      const satX = lonToX(sat.lon);
      const satY = latToY(sat.lat);

      // Marker
      ctx.fillStyle = sat.color;
      ctx.beginPath();
      ctx.arc(satX, satY, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label with light backdrop badge
      const sLabel = `${sat.name} (${sat.lat.toFixed(1)}°, ${sat.lon.toFixed(1)}°)`;
      ctx.font = 'bold 11px JetBrains Mono, monospace';
      const sW = ctx.measureText(sLabel).width;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.fillRect(satX + 8, satY - 10, sW + 10, 18);
      ctx.strokeStyle = sat.color;
      ctx.lineWidth = 1.4;
      ctx.strokeRect(satX + 8, satY - 10, sW + 10, 18);

      ctx.fillStyle = '#0f172a';
      ctx.textBaseline = 'middle';
      ctx.fillText(sLabel, satX + 13, satY - 1);
    });
  }, [satellites, simTimeSec, showSwathCoverage]);

  return (
    <div className="relative w-full h-full bg-[#f0f7ff] overflow-hidden select-none cursor-crosshair">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

      {/* Floating HUD Controls */}
      <div className="absolute top-3 left-3 flex items-center gap-2 p-1.5 bg-white/95 backdrop-blur border border-sky-300 rounded-lg text-slate-800 shadow-sm">
        <button
          onClick={() => setShowSwathCoverage(!showSwathCoverage)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
            showSwathCoverage
              ? 'bg-purple-600 text-white font-bold shadow-xs'
              : 'text-slate-700 hover:text-sky-950 hover:bg-sky-100'
          }`}
          title="Toggle Sensor Swath Coverage Beam (স্ক্যান অঞ্চল)"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Swath Beam</span>
        </button>

        <div className="h-3.5 w-px bg-sky-300"></div>

        {hoverCoord && (
          <div className="text-xs font-mono text-slate-800 px-1 font-semibold">
            LAT: <span className="text-sky-700 font-bold">{hoverCoord.lat.toFixed(1)}°</span> · LON:{' '}
            <span className="text-sky-700 font-bold">{hoverCoord.lon.toFixed(1)}°</span>
          </div>
        )}
      </div>

      {/* Pedagogical Note Badge */}
      <div className="absolute bottom-3 left-3 max-w-md bg-white/95 backdrop-blur p-3.5 rounded-xl border border-sky-300 text-xs text-slate-800 leading-relaxed font-sans shadow-md">
        <div className="font-bold text-sky-950 mb-1 flex items-center gap-1.5">
          <span>GEO vs Polar Ground Track Principle:</span>
        </div>
        <div>
          <span className="text-emerald-700 font-bold">GEO (BS-1):</span> Ground track remains stationary over 90.4° E equatorial longitude.
        </div>
        <div className="mt-0.5">
          <span className="text-purple-700 font-bold">Polar Orbit:</span> Moves N→S while Earth rotates W→E underneath, shifting each ground swath westward for 100% planetary coverage.
        </div>
      </div>
    </div>
  );
};
