import React from 'react';
import { SatelliteState, SynodicConjunctionState, ScenarioMode } from '../physics/types';
import { Activity, Gauge, Zap, Compass, AlertCircle } from 'lucide-react';

interface TelemetryPanelProps {
  satellites: SatelliteState[];
  selectedSatId: string;
  setSelectedSatId: (id: string) => void;
  scenario: ScenarioMode;
  synodicState: SynodicConjunctionState;
  simTimeDays: number;
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({
  satellites,
  selectedSatId,
  setSelectedSatId,
  scenario,
  synodicState,
  simTimeDays,
}) => {
  const currentSat = satellites.find((s) => s.id === selectedSatId) || satellites[0];

  if (!currentSat) return null;

  // Format period nicely (e.g. 1h 34m or 23h 56m)
  const formatPeriod = (sec: number) => {
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    if (hours === 0) return `${minutes} min`;
    return `${hours}h ${minutes}m`;
  };

  // Specific energy metrics (MJ/kg = km^2/s^2)
  const kinetic = currentSat.kineticEnergy;
  const potential = currentSat.potentialEnergy;
  const total = currentSat.specificEnergy;

  return (
    <div className="space-y-4">
      {/* 1. Satellite Selector Tabs */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-sky-950 uppercase tracking-wider font-mono flex items-center justify-between">
          <span>Active Telemetry (টেলিমেট্রি মনিটর)</span>
          <span className="text-[11px] text-emerald-700 font-sans font-bold">● NOMINAL</span>
        </label>

        <div className="flex gap-1 overflow-x-auto p-1 bg-white/95 rounded-lg border border-sky-300 shadow-xs">
          {satellites.map((sat) => (
            <button
              key={sat.id}
              onClick={() => setSelectedSatId(sat.id)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                selectedSatId === sat.id
                  ? 'bg-sky-600 text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:text-sky-950 hover:bg-sky-100/60'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sat.color }}></span>
              <span>{sat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Primary Metrics Cards (Altitude, Velocity, Period) */}
      <div className="grid grid-cols-2 gap-2">
        {/* Metric 1: Orbital Velocity */}
        <div className="p-3 bg-white/95 rounded-xl border border-sky-200 shadow-xs">
          <div className="text-xs font-mono text-slate-700 uppercase tracking-wide font-bold">
            Orbital Speed ($v$)
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-bold font-mono tabular-nums text-sky-700">
              {currentSat.velocity.toFixed(2)}
            </span>
            <span className="text-xs font-mono text-slate-500 font-medium">km/s</span>
          </div>
          <div className="text-xs text-slate-600 font-mono mt-0.5 font-medium">
            {(currentSat.velocity * 3600).toFixed(0)} km/h
          </div>
        </div>

        {/* Metric 2: Altitude */}
        <div className="p-3 bg-white/95 rounded-xl border border-sky-200 shadow-xs">
          <div className="text-xs font-mono text-slate-700 uppercase tracking-wide font-bold">
            Altitude ($h$)
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {currentSat.altitude.toFixed(0)}
            </span>
            <span className="text-xs font-mono text-slate-500 font-medium">km</span>
          </div>
          <div className="text-xs text-slate-600 font-mono mt-0.5 font-medium">
            Radius $r$: {currentSat.radius.toFixed(0)} km
          </div>
        </div>

        {/* Metric 3: Orbital Period */}
        <div className="p-3 bg-white/95 rounded-xl border border-sky-200 shadow-xs">
          <div className="text-xs font-mono text-slate-700 uppercase tracking-wide font-bold">
            Period ($T$)
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-bold font-mono tabular-nums text-emerald-700">
              {formatPeriod(currentSat.period)}
            </span>
          </div>
          <div className="text-xs text-slate-600 font-mono mt-0.5 font-medium">
            {(currentSat.period / 3600).toFixed(2)} hours
          </div>
        </div>

        {/* Metric 4: Eccentricity */}
        <div className="p-3 bg-white/95 rounded-xl border border-sky-200 shadow-xs">
          <div className="text-xs font-mono text-slate-700 uppercase tracking-wide font-bold">
            Eccentricity ($e$)
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-bold font-mono tabular-nums text-amber-700">
              {currentSat.eccentricity.toFixed(4)}
            </span>
          </div>
          <div className="text-xs text-slate-600 font-mono mt-0.5 font-medium">
            {currentSat.eccentricity < 0.01 ? 'Circular (গোলাকার)' : 'Elliptical (উপবৃত্তাকার)'}
          </div>
        </div>
      </div>

      {/* 3. Specific Mechanical Energy & Speed Paradox Section */}
      <div className="p-3.5 bg-white/95 rounded-xl border border-sky-200 space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-sky-950 font-display flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Specific Orbital Energy (নির্দিষ্ট যান্ত্রিক শক্তি)</span>
          </span>
          <span className="text-xs font-mono text-sky-800 font-bold tabular-nums">
            {total.toFixed(2)} MJ/kg
          </span>
        </div>

        {/* Visual Energy Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono text-slate-700 font-medium">
            <span>Kinetic $K = \frac{1}{2}v^2$</span>
            <span className="text-sky-700 font-bold">+{kinetic.toFixed(2)} MJ/kg</span>
          </div>
          <div className="h-2 w-full bg-sky-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (kinetic / 40) * 100)}%` }}
            ></div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono text-slate-700 font-medium">
            <span>Potential $U = -\mu/r$</span>
            <span className="text-rose-600 font-bold">{potential.toFixed(2)} MJ/kg</span>
          </div>
          <div className="h-2 w-full bg-sky-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-rose-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (Math.abs(potential) / 70) * 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Energy vs Speed Paradox Note */}
        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-xs text-amber-950 space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-amber-900">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-700" />
            <span>The Speed vs Energy Paradox (শক্তির প্যারাডক্স):</span>
          </div>
          <p className="text-xs leading-relaxed text-amber-900 font-sans font-normal">
            Moving to a higher orbit increases specific mechanical energy ($E = -\mu/2r$, less negative), yet circular orbital velocity <strong>decreases</strong> ({"$v = \\sqrt{\\mu/r}$"})! LEO travels at ~7.8 km/s while GEO moves at only 3.07 km/s.
          </p>
        </div>
      </div>

      {/* 4. Synodic Conjunction Metrics (if Dual Resonance or >= 2 satellites) */}
      {scenario === 'dual-resonance' && (
        <div className="p-3.5 bg-white/95 rounded-xl border border-sky-300 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-950 font-display flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-purple-600" />
              <span>Synodic Conjunction Engine (সাইনোডিক সংযোগ)</span>
            </span>
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold ${synodicState.isAligned ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-sky-100 text-sky-800 border border-sky-300'}`}>
              {synodicState.isAligned ? 'COLLINEAR ALIGNED' : 'TRACKING'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded bg-sky-50 border border-sky-200">
              <div className="text-xs text-slate-600 font-medium">Observed Conjunctions</div>
              <div className="text-xl font-bold text-rose-600 tabular-nums mt-0.5">
                {synodicState.conjunctionCount} times
              </div>
              <div className="text-xs text-slate-500 mt-0.5">in {simTimeDays.toFixed(1)} days</div>
            </div>

            <div className="p-2.5 rounded bg-sky-50 border border-sky-200">
              <div className="text-xs text-slate-600 font-medium">Theoretical {"$T_{syn}$"}</div>
              <div className="text-xl font-bold text-purple-700 tabular-nums mt-0.5">
                {(synodicState.theoreticalPeriod / 3600).toFixed(2)} hrs
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Formula: {"$\\frac{T_1 T_2}{|T_1 - T_2|}$"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
