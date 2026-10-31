import React from 'react';
import { BookOpen, RotateCcw, Play, Pause, Globe, Compass, Map, LayoutGrid } from 'lucide-react';
import { ViewMode } from '../physics/types';

interface HeaderProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  onReset: () => void;
  onOpenFormulas: () => void;
  simTimeDays: number;
}

export const Header: React.FC<HeaderProps> = ({
  viewMode,
  setViewMode,
  isPlaying,
  setIsPlaying,
  onReset,
  onOpenFormulas,
  simTimeDays,
}) => {
  return (
    <header className="h-14 px-3 sm:px-6 bg-sky-100/95 backdrop-blur-md border-b border-sky-300 flex items-center justify-between shrink-0 z-30 shadow-xs">
      {/* Zone 1: Single text element Brand Zone */}
      <div className="flex items-center gap-2 sm:gap-3">
        <a href="#lab" className="text-sm sm:text-base lg:text-lg font-bold tracking-tight text-sky-950 font-display flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-600 shadow-[0_0_8px_#0284c7]"></span>
          <span className="hidden sm:inline">Satellite Dynamics & Sync Lab</span>
          <span className="sm:hidden font-bold">OrbitLab</span>
        </a>
        <span className="hidden 2xl:inline text-xs text-sky-800 font-sans font-medium">
          উপগ্রহের গতি ও হোহম্যান ট্রান্সফার
        </span>
      </div>

      {/* Zone 2: Navigation Links / Viewport Modes */}
      <nav className="flex items-center gap-1 sm:gap-1.5 p-1 bg-white/95 border border-sky-300 rounded-lg shadow-xs">
        <button
          onClick={() => setViewMode('3d-orbit')}
          className={`flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
            viewMode === '3d-orbit'
              ? 'bg-sky-600 text-white font-bold shadow-xs'
              : 'text-slate-600 hover:text-sky-950 hover:bg-sky-50'
          }`}
          title="3D Orbital Perspective (ত্রিমাত্রিক দৃশ্য)"
        >
          <Globe className="w-3.5 h-3.5" />
          <span className="hidden md:inline">3D Perspective</span>
          <span className="md:hidden">3D</span>
        </button>

        <button
          onClick={() => setViewMode('2d-plane')}
          className={`flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
            viewMode === '2d-plane'
              ? 'bg-sky-600 text-white font-bold shadow-xs'
              : 'text-slate-600 hover:text-sky-950 hover:bg-sky-50'
          }`}
          title="2D Polar Plane / Top-Down View (কক্ষপথ সমতল)"
        >
          <Compass className="w-3.5 h-3.5" />
          <span className="hidden md:inline">2D Plane</span>
          <span className="md:hidden">2D</span>
        </button>

        <button
          onClick={() => setViewMode('ground-track')}
          className={`flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
            viewMode === 'ground-track'
              ? 'bg-sky-600 text-white font-bold shadow-xs'
              : 'text-slate-600 hover:text-sky-950 hover:bg-sky-50'
          }`}
          title="2D Equirectangular Ground Track Map (গ্রাউন্ড ট্র্যাক)"
        >
          <Map className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Ground Track</span>
          <span className="md:hidden">Map</span>
        </button>

        <button
          onClick={() => setViewMode('grid')}
          className={`flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
            viewMode === 'grid'
              ? 'bg-sky-600 text-white font-bold shadow-xs'
              : 'text-slate-600 hover:text-sky-950 hover:bg-sky-50'
          }`}
          title="Multi-Viewport Grid View (গ্রিড ভিউ - একসাথে সব দৃশ্য)"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Grid View</span>
          <span className="md:hidden">Grid</span>
        </button>
      </nav>

      {/* Zone 3: Primary Actions + Top-Right UDVASH Badge */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="hidden xl:flex items-center text-xs font-mono text-slate-800 bg-white px-2 py-1 rounded border border-sky-300 shadow-xs">
          <span className="text-slate-600 mr-1 font-medium">SIM:</span>
          <span className="text-sky-700 tabular-nums font-bold">{simTimeDays.toFixed(2)}d</span>
        </div>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`p-1.5 sm:px-2.5 sm:py-1 rounded-md text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs ${
            isPlaying
              ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
          title={isPlaying ? "Pause simulation" : "Play simulation"}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span className="hidden sm:inline">{isPlaying ? 'Pause' : 'Play'}</span>
        </button>

        <button
          onClick={onReset}
          className="p-1.5 text-slate-700 hover:text-sky-950 hover:bg-sky-200/70 rounded-md border border-sky-300 bg-white transition-colors shadow-xs"
          title="Reset Simulation"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onOpenFormulas}
          className="px-2 py-1 text-xs font-bold rounded-md bg-sky-700 hover:bg-sky-800 text-white shadow-xs transition-colors flex items-center gap-1 whitespace-nowrap"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Formulas</span>
        </button>

        {/* User Request: 'ar akbare top right corner a UDVASH lekha ta red a rakho' */}
        <div
          className="ml-1 px-2.5 py-1 text-xs sm:text-sm font-black tracking-widest text-red-600 bg-red-50 border-2 border-red-500 rounded-md shadow-xs select-none whitespace-nowrap"
          title="UDVASH"
        >
          UDVASH
        </div>
      </div>
    </header>
  );
};
