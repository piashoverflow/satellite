import React from 'react';
import { Play, Pause, RotateCcw, FastForward, Rocket, Sliders, Layers, Eye, RefreshCw, Flame, CheckCircle } from 'lucide-react';
import { ScenarioMode, HohmannTransferState } from '../physics/types';

interface ControlsPanelProps {
  scenario: ScenarioMode;
  setScenario: (mode: ScenarioMode) => void;
  timeScale: number;
  setTimeScale: (scale: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  onStepForward: (seconds: number) => void;
  onReset: () => void;
  // Hohmann controls
  hohmannState: HohmannTransferState;
  onFireDeltaV1: () => void;
  onFireDeltaV2: () => void;
  onAutoTransfer: () => void;
  onResetHohmann: () => void;
  onFastForwardApoapsis?: () => void;
  targetHohmannAlt: number;
  setTargetHohmannAlt: (altKm: number) => void;
  // Dual resonance controls
  sat1AltitudeKm: number;
  setSat1AltitudeKm: (alt: number) => void;
  sat2AltitudeKm: number;
  setSat2AltitudeKm: (alt: number) => void;
  // Visual toggles
  showVelocityVector: boolean;
  setShowVelocityVector: (val: boolean) => void;
  showAccelVector: boolean;
  setShowAccelVector: (val: boolean) => void;
  showOrbitTrails: boolean;
  setShowOrbitTrails: (val: boolean) => void;
}

const TIME_PRESETS = [
  { label: '1×', value: 1 },
  { label: '10×', value: 10 },
  { label: '60× (1m/s)', value: 60 },
  { label: '300×', value: 300 },
  { label: '1,000×', value: 1000 },
  { label: '5,000×', value: 5000 },
  { label: '10,000×', value: 10000 },
];

const HOHMANN_PRESETS = [
  { label: 'GEO (35,793 km)', alt: 35793 },
  { label: 'MEO / GPS (20,200 km)', alt: 20200 },
  { label: 'Mid Orbit (8,000 km)', alt: 8000 },
  { label: 'High LEO (1,500 km)', alt: 1500 },
];

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
  scenario,
  setScenario,
  timeScale,
  setTimeScale,
  isPlaying,
  setIsPlaying,
  onStepForward,
  onReset,
  hohmannState,
  onFireDeltaV1,
  onFireDeltaV2,
  onAutoTransfer,
  onResetHohmann,
  onFastForwardApoapsis,
  targetHohmannAlt,
  setTargetHohmannAlt,
  sat1AltitudeKm,
  setSat1AltitudeKm,
  sat2AltitudeKm,
  setSat2AltitudeKm,
  showVelocityVector,
  setShowVelocityVector,
  showAccelVector,
  setShowAccelVector,
  showOrbitTrails,
  setShowOrbitTrails,
}) => {
  const formatTime = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = Math.floor(sec % 60);
    return `${hrs.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  };

  return (
    <div className="space-y-4">
      {/* 1. Scenario Mode Selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-sky-950 uppercase tracking-wider font-mono">
          Laboratory Scenario (পরীক্ষার দৃশ্যপট)
        </label>
        <div className="grid grid-cols-3 gap-1 p-1 bg-white/95 rounded-lg border border-sky-300 shadow-xs">
          <button
            onClick={() => setScenario('geo-vs-polar')}
            className={`px-2 py-1.5 text-xs font-semibold rounded-md transition-colors text-center ${
              scenario === 'geo-vs-polar'
                ? 'bg-sky-600 text-white font-bold shadow-xs'
                : 'text-slate-700 hover:text-sky-950 hover:bg-sky-100/60'
            }`}
          >
            GEO vs Polar
          </button>
          <button
            onClick={() => setScenario('hohmann-transfer')}
            className={`px-2 py-1.5 text-xs font-semibold rounded-md transition-colors text-center ${
              scenario === 'hohmann-transfer'
                ? 'bg-sky-600 text-white font-bold shadow-xs'
                : 'text-slate-700 hover:text-sky-950 hover:bg-sky-100/60'
            }`}
          >
            Hohmann Lab
          </button>
          <button
            onClick={() => setScenario('dual-resonance')}
            className={`px-2 py-1.5 text-xs font-semibold rounded-md transition-colors text-center ${
              scenario === 'dual-resonance'
                ? 'bg-sky-600 text-white font-bold shadow-xs'
                : 'text-slate-700 hover:text-sky-950 hover:bg-sky-100/60'
            }`}
          >
            Synodic Sync
          </button>
        </div>
      </div>

      {/* 2. Scenario-Specific Operational Controls */}
      {scenario === 'hohmann-transfer' && (
        <div className="p-3.5 bg-white/95 rounded-xl border border-sky-300 space-y-3 shadow-xs">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-sky-200 pb-2">
            <span className="text-xs font-bold text-sky-950 font-display flex items-center gap-1.5">
              <Rocket className="w-4 h-4 text-sky-600" />
              <span>Hohmann Orbit Transfer Lab</span>
            </span>
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
              hohmannState.stage === 'geo-circularized'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : hohmannState.stage === 'ready-delta2'
                ? 'bg-amber-100 text-amber-900 border border-amber-400 animate-pulse'
                : hohmannState.stage === 'transfer-ellipse'
                ? 'bg-sky-100 text-sky-900 border border-sky-300'
                : 'bg-slate-100 text-slate-700 border border-slate-300'
            }`}>
              {hohmannState.stage === 'leo-stable' && 'Stage 1: LEO Parking'}
              {hohmannState.stage === 'transfer-ellipse' && 'Stage 2: Transfer Ellipse'}
              {hohmannState.stage === 'ready-delta2' && 'Stage 3: Apoapsis Ready'}
              {hohmannState.stage === 'geo-circularized' && 'Stage 4: Target Circularized'}
            </span>
          </div>

          {/* Stepper Visual Indicator */}
          <div className="grid grid-cols-4 gap-1 text-[11px] font-mono text-center">
            <div className={`p-1 rounded ${hohmannState.stage === 'leo-stable' ? 'bg-sky-600 text-white font-bold shadow-xs' : 'bg-sky-50 text-slate-700 border border-sky-200 font-medium'}`}>
              1. LEO
            </div>
            <div className={`p-1 rounded ${hohmannState.stage === 'transfer-ellipse' ? 'bg-amber-500 text-slate-950 font-bold shadow-xs' : 'bg-sky-50 text-slate-700 border border-sky-200 font-medium'}`}>
              2. Ellipse
            </div>
            <div className={`p-1 rounded ${hohmannState.stage === 'ready-delta2' ? 'bg-rose-600 text-white font-bold animate-pulse shadow-xs' : 'bg-sky-50 text-slate-700 border border-sky-200 font-medium'}`}>
              3. Apoapsis
            </div>
            <div className={`p-1 rounded ${hohmannState.stage === 'geo-circularized' ? 'bg-emerald-600 text-white font-bold shadow-xs' : 'bg-sky-50 text-slate-700 border border-sky-200 font-medium'}`}>
              4. Target GEO
            </div>
          </div>

          {/* Mission Progress & Flight Timer */}
          <div className="p-2.5 bg-sky-50/80 rounded-lg border border-sky-200 space-y-1.5 font-mono text-xs">
            <div className="flex justify-between items-center text-slate-800 font-semibold">
              <span>Transfer Progress:</span>
              <span className="text-sky-900 font-bold text-sm tabular-nums">
                {(hohmannState.transferProgress * 100).toFixed(1)}%
              </span>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-sky-200/80 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-150"
                style={{ width: `${Math.min(100, Math.max(0, hohmannState.transferProgress * 100))}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-600 font-medium pt-0.5">
              <span>Elapsed: {formatTime(hohmannState.transferTimeElapsed)}</span>
              <span>Total: {formatTime(hohmannState.transferDuration)}</span>
            </div>
          </div>

          {/* Primary Thrust Burn Action Buttons */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={onFireDeltaV1}
              disabled={hohmannState.stage !== 'leo-stable'}
              className={`p-2.5 rounded-lg font-medium border text-left transition-all ${
                hohmannState.stage === 'leo-stable'
                  ? 'bg-sky-100 hover:bg-sky-200 text-sky-950 border-sky-400 shadow-sm cursor-pointer'
                  : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              }`}
            >
              <div className="font-bold flex items-center justify-between">
                <span>Burn 1 (Δv₁)</span>
                {hohmannState.stage === 'leo-stable' && <Flame className="w-4 h-4 text-sky-600" />}
              </div>
              <div className={`text-[11px] mt-0.5 font-mono font-medium ${hohmannState.stage === 'leo-stable' ? 'text-sky-800' : 'text-slate-400'}`}>
                +{hohmannState.deltaV1.toFixed(2)} km/s (Inject)
              </div>
            </button>

            <button
              onClick={onFireDeltaV2}
              disabled={hohmannState.stage !== 'ready-delta2'}
              className={`p-2.5 rounded-lg font-medium border text-left transition-all ${
                hohmannState.stage === 'ready-delta2'
                  ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border-emerald-500 shadow-sm animate-pulse cursor-pointer ring-2 ring-emerald-400/50'
                  : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              }`}
            >
              <div className="font-bold flex items-center justify-between">
                <span>Burn 2 (Δv₂)</span>
                {hohmannState.stage === 'ready-delta2' && <Flame className="w-4 h-4 text-emerald-600" />}
              </div>
              <div className={`text-[11px] mt-0.5 font-mono font-medium ${hohmannState.stage === 'ready-delta2' ? 'text-emerald-800' : 'text-slate-400'}`}>
                +{hohmannState.deltaV2.toFixed(2)} km/s (Circularize)
              </div>
            </button>
          </div>

          {/* Transfer Fast-Forward / Speed Helper during Elliptical Coast */}
          {hohmannState.stage === 'transfer-ellipse' && (
            <div className="flex gap-2 p-2 bg-amber-50 rounded-lg border border-amber-300 text-xs">
              {onFastForwardApoapsis && (
                <button
                  onClick={onFastForwardApoapsis}
                  className="flex-1 py-1.5 px-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  title="Instantly jump to Apoapsis to test Burn 2 circularization"
                >
                  <FastForward className="w-4 h-4" />
                  <span>Jump to Apoapsis (স্কিপ)</span>
                </button>
              )}
              {timeScale < 1000 && (
                <button
                  onClick={() => setTimeScale(1000)}
                  className="py-1.5 px-2.5 bg-white hover:bg-sky-50 text-slate-800 border border-sky-300 rounded font-mono text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                  title="Set time scale to 1,000x for fast orbital transit"
                >
                  ⚡ 1,000× Speed
                </button>
              )}
            </div>
          )}

          {/* Apoapsis Ready Notification */}
          {hohmannState.stage === 'ready-delta2' && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-400 rounded-lg text-emerald-950 text-xs flex items-center justify-between animate-pulse">
              <span className="font-bold">🎯 Apoapsis Reached! Ready for Burn 2.</span>
              <button
                onClick={onFireDeltaV2}
                className="px-3 py-1 bg-emerald-600 text-white font-bold rounded hover:bg-emerald-700 transition-colors text-xs cursor-pointer shadow-xs"
              >
                Fire Now (Δv₂)
              </button>
            </div>
          )}

          {/* Target Orbit Presets */}
          <div className="space-y-1.5 pt-1 border-t border-sky-200">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-800 font-semibold">Target Altitude (h₂):</span>
              <span className="text-sky-800 font-bold text-sm tabular-nums">
                {Math.round(targetHohmannAlt).toLocaleString()} km
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {HOHMANN_PRESETS.map((p) => (
                <button
                  key={p.alt}
                  onClick={() => setTargetHohmannAlt(p.alt)}
                  className={`px-2 py-1.5 text-xs font-mono rounded transition-colors text-left truncate font-medium ${
                    Math.abs(targetHohmannAlt - p.alt) < 100
                      ? 'bg-sky-600 text-white font-bold shadow-xs'
                      : 'bg-sky-50 text-slate-700 hover:text-sky-950 border border-sky-200 hover:bg-sky-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {/* Target Altitude Slider */}
            <input
              type="range"
              min="1000"
              max="36000"
              step="500"
              value={targetHohmannAlt}
              onChange={(e) => setTargetHohmannAlt(Number(e.target.value))}
              disabled={hohmannState.stage === 'transfer-ellipse'}
              className="w-full accent-sky-600 h-1.5 bg-sky-200 rounded-lg cursor-pointer disabled:opacity-40"
            />
          </div>

          {/* Auto-Pilot Transfer & Reset Bar */}
          <div className="flex items-center justify-between pt-1 border-t border-sky-200">
            <button
              onClick={onAutoTransfer}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                hohmannState.autoPilot
                  ? 'bg-amber-500 text-slate-950 border border-amber-600 animate-pulse'
                  : 'bg-sky-600 hover:bg-sky-700 text-white'
              }`}
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>{hohmannState.autoPilot ? 'Auto-Pilot Running...' : 'Auto-Pilot Transfer'}</span>
            </button>

            <button
              onClick={onResetHohmann}
              className="text-xs text-slate-700 hover:text-sky-950 flex items-center gap-1 py-1.5 px-2.5 rounded bg-sky-50 border border-sky-200 hover:bg-sky-100 transition-colors cursor-pointer font-medium shadow-xs"
              title="Reset spacecraft back to circular LEO parking orbit"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset LEO</span>
            </button>
          </div>

          {/* Mission Status Announcement */}
          {hohmannState.burnMessage && (
            <div className="p-2.5 bg-sky-50 rounded border border-sky-200 text-xs font-sans text-sky-950 flex items-start gap-1.5 leading-relaxed font-medium">
              <CheckCircle className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <span>{hohmannState.burnMessage}</span>
            </div>
          )}
        </div>
      )}

      {scenario === 'dual-resonance' && (
        <div className="p-3.5 bg-white/95 rounded-xl border border-sky-300 space-y-3 shadow-xs">
          <div className="text-xs font-bold text-sky-950 font-display flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-sky-600" />
            <span>Dual Orbit Altitudes (দ্বৈত কক্ষপথ টিউনিং)</span>
          </div>

          {/* Sat 1 Altitude */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-sky-800 font-semibold">Satellite A Altitude (h₁):</span>
              <span className="font-bold tabular-nums text-sky-950 text-sm">{sat1AltitudeKm} km</span>
            </div>
            <input
              type="range"
              min="300"
              max="20000"
              step="100"
              value={sat1AltitudeKm}
              onChange={(e) => setSat1AltitudeKm(Number(e.target.value))}
              className="w-full accent-sky-600 h-1.5 bg-sky-200 rounded-lg cursor-pointer"
            />
          </div>

          {/* Sat 2 Altitude */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-purple-800 font-semibold">Satellite B Altitude (h₂):</span>
              <span className="font-bold tabular-nums text-purple-950 text-sm">{sat2AltitudeKm} km</span>
            </div>
            <input
              type="range"
              min="500"
              max="35786"
              step="200"
              value={sat2AltitudeKm}
              onChange={(e) => setSat2AltitudeKm(Number(e.target.value))}
              className="w-full accent-purple-600 h-1.5 bg-sky-200 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* 3. Time-Lapse & Playback Controls */}
      <div className="p-3.5 bg-white/95 rounded-xl border border-sky-300 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-sky-950 font-mono">
            Time-Lapse Speed (গতিবর্ধক)
          </span>
          <span className="text-sm font-mono text-sky-700 font-bold tabular-nums">
            {timeScale}×
          </span>
        </div>

        {/* Time slider */}
        <input
          type="range"
          min="1"
          max="10000"
          step="10"
          value={timeScale}
          onChange={(e) => setTimeScale(Number(e.target.value))}
          className="w-full accent-sky-600 h-1.5 bg-sky-200 rounded-lg cursor-pointer"
        />

        {/* Quick preset chips */}
        <div className="flex items-center justify-between gap-1 overflow-x-auto pb-0.5">
          {TIME_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => setTimeScale(p.value)}
              className={`px-2 py-1 text-xs font-mono rounded transition-colors whitespace-nowrap font-medium ${
                timeScale === p.value
                  ? 'bg-sky-600 text-white font-bold shadow-xs'
                  : 'bg-sky-50 text-slate-700 hover:text-sky-950 border border-sky-200 hover:bg-sky-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Playback Buttons */}
        <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-sky-200">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-xs ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            onClick={() => onStepForward(3600)}
            className="p-1.5 rounded-lg text-xs font-medium bg-sky-50 text-slate-700 hover:text-sky-950 hover:bg-sky-100 border border-sky-200 transition-colors flex items-center justify-center gap-1 shadow-xs"
            title="Step forward 1 hour"
          >
            <FastForward className="w-3 h-3" />
            <span>+1 hr</span>
          </button>

          <button
            onClick={() => onStepForward(86400)}
            className="p-1.5 rounded-lg text-xs font-medium bg-sky-50 text-slate-700 hover:text-sky-950 hover:bg-sky-100 border border-sky-200 transition-colors flex items-center justify-center gap-1 shadow-xs"
            title="Step forward 1 Earth day"
          >
            <FastForward className="w-3 h-3" />
            <span>+1 day</span>
          </button>

          <button
            onClick={onReset}
            className="p-1.5 rounded-lg text-xs font-medium bg-sky-50 text-slate-700 hover:text-sky-950 hover:bg-sky-100 border border-sky-200 transition-colors flex items-center justify-center gap-1 shadow-xs"
            title="Reset Simulation Time"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* 4. Visual Vector & Layer Toggles */}
      <div className="p-3.5 bg-white/95 rounded-xl border border-sky-300 space-y-2 shadow-xs">
        <span className="text-xs font-bold text-sky-950 font-mono">
          Vectors & Visual Layers (ভেক্টর নির্দেশক)
        </span>

        <div className="space-y-2 text-xs">
          <label className="flex items-center justify-between text-slate-700 hover:text-sky-950 font-medium cursor-pointer">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-600"></span>
              <span>Velocity Vector v&#8407; (বেগ ভেক্টর)</span>
            </span>
            <input
              type="checkbox"
              checked={showVelocityVector}
              onChange={(e) => setShowVelocityVector(e.target.checked)}
              className="accent-sky-600 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between text-slate-700 hover:text-sky-950 font-medium cursor-pointer">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              <span>Gravity Force a&#8407;_g (মহাকর্ষীয় ত্বরণ)</span>
            </span>
            <input
              type="checkbox"
              checked={showAccelVector}
              onChange={(e) => setShowAccelVector(e.target.checked)}
              className="accent-red-500 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between text-slate-700 hover:text-sky-950 font-medium cursor-pointer">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
              <span>Ground Orbit Trails (কক্ষপথের রেখা)</span>
            </span>
            <input
              type="checkbox"
              checked={showOrbitTrails}
              onChange={(e) => setShowOrbitTrails(e.target.checked)}
              className="accent-purple-600 rounded cursor-pointer"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
