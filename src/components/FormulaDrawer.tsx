import React from 'react';
import { X, BookOpen, Atom } from 'lucide-react';

interface FormulaDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FormulaDrawer: React.FC<FormulaDrawerProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-end">
      <div className="bg-[#f0f7ff] border-l border-sky-300 w-full max-w-xl h-full overflow-y-auto p-6 flex flex-col shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-sky-200">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-sky-600" />
            <div>
              <h2 className="text-base font-bold text-sky-950 font-display">
                Orbital Mechanics & Physics Compendium
              </h2>
              <p className="text-xs text-sky-800 font-medium">
                মহাকর্ষীয় গতিবিদ্যা ও গাণিতিক সূত্রের সংকলন (Bilingual Mathematical Physics)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-600 hover:text-sky-950 rounded-lg hover:bg-sky-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section 1: Orbital Speed & Kepler's 3rd Law */}
        <div className="p-4 bg-white rounded-xl border border-sky-200 space-y-2 shadow-xs">
          <div className="text-xs font-bold text-sky-800 font-mono flex items-center gap-1.5">
            <Atom className="w-3.5 h-3.5 text-sky-600" />
            <span>1. Orbital Velocity & Period (কক্ষপথের দ্রুতি ও আবর্তনকাল)</span>
          </div>
          <div className="p-3 bg-sky-50 rounded-lg font-mono text-xs text-sky-950 border border-sky-200 space-y-1.5 font-semibold">
            <div>{"v = √(GM / r) = √(μ / r)"}</div>
            <div>{"T = 2π √(r³ / GM)  ⟹  T² = (4π² / GM) · r³"}</div>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed font-sans font-medium">
            <strong className="text-sky-800">বাংলা ব্যাখ্যা:</strong> বৃত্তাকার কক্ষপথে অভিকর্ষজ বলই কেন্দ্রমুখী বলের যোগান দেয় (m·v²/r = GMm/r²)। ব্যাসার্ধ (r) যত বাড়ে, উপগ্রহের দ্রুতি (v) তত কমে এবং পর্যায়কাল (T) বাড়ে।
          </p>
        </div>

        {/* Section 2: Geostationary Orbit (ভূ-স্থির উপগ্রহ) */}
        <div className="p-4 bg-white rounded-xl border border-sky-200 space-y-2 shadow-xs">
          <div className="text-xs font-bold text-emerald-800 font-mono">
            2. Geostationary Orbit Derivation (ভূ-স্থির উপগ্রহের ব্যাসার্ধ)
          </div>
          <div className="p-3 bg-sky-50 rounded-lg font-mono text-xs text-sky-950 border border-sky-200 space-y-1.5 font-semibold">
            <div>{"r_geo = [(GM · T_earth²) / (4π²)]^(1/3) ≈ 42,164 km"}</div>
            <div>{"h_geo = r_geo - R_earth ≈ 35,793 km"}</div>
            <div>{"v_geo ≈ 3.075 km/s"}</div>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed font-sans font-medium">
            <strong className="text-emerald-800">বঙ্গবন্ধু স্যাটেলাইট-১ (BS-1):</strong> পৃথিবীর ঘূর্ণনকাল (T = 23h 56m 4s) এবং উপগ্রহের আবর্তনকাল সমান হলে এটি বিষুবরেখার নির্দিষ্ট দ্রাঘিমাংশে স্থির থাকে।
          </p>
        </div>

        {/* Section 3: Hohmann Transfer Orbit */}
        <div className="p-4 bg-white rounded-xl border border-sky-200 space-y-2 shadow-xs">
          <div className="text-xs font-bold text-amber-900 font-mono">
            3. Hohmann Transfer Orbit (হোহম্যান কক্ষপথ স্থানান্তর)
          </div>
          <div className="p-3 bg-sky-50 rounded-lg font-mono text-xs text-sky-950 border border-sky-200 space-y-1.5 font-semibold">
            <div>{"a_tx = (r₁ + r₂) / 2"}</div>
            <div>{"Δv₁ = √(μ / r₁) · [√(2r₂ / (r₁ + r₂)) - 1]"}</div>
            <div>{"Δv₂ = √(μ / r₂) · [1 - √(2r₁ / (r₁ + r₂))]"}</div>
            <div>{"Δv_total = |Δv₁| + |Δv₂|"}</div>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed font-sans font-medium">
            <strong className="text-amber-900">ব্যাখ্যা:</strong> দুটি বৃত্তাকার কক্ষপথের মধ্যে ন্যূনতম জ্বালানি ব্যয়ে স্থানান্তর করতে উপবৃত্তাকার পথ (Transfer Ellipse) ব্যবহার করা হয়।
          </p>
        </div>

        {/* Section 4: Synodic Period & Conjunctions */}
        <div className="p-4 bg-white rounded-xl border border-sky-200 space-y-2 shadow-xs">
          <div className="text-xs font-bold text-purple-900 font-mono">
            4. Synodic Conjunction Period (সাইনোডিক পর্যায়কাল)
          </div>
          <div className="p-3 bg-sky-50 rounded-lg font-mono text-xs text-sky-950 border border-sky-200 space-y-1.5 font-semibold">
            <div>{"T_syn = (T₁ · T₂) / |T₁ - T₂|"}</div>
            <div>{"Δω = |ω₁ - ω₂| = 2π |(1/T₁) - (1/T₂)|"}</div>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed font-sans font-medium">
            <strong className="text-purple-900">ব্যাখ্যা:</strong> একই সমতলে দুটি উপগ্রহের পৃথিবীর সাপেক্ষে একই সরলরেখায় পুনরায় মিলিত হওয়ার সময়কাল।
          </p>
        </div>

        {/* Section 5: Weightlessness & Normal Force */}
        <div className="p-4 bg-white rounded-xl border border-sky-200 space-y-2 shadow-xs">
          <div className="text-xs font-bold text-rose-900 font-mono">
            5. Microgravity & Weightlessness (মহাশূন্যে ওজনহীনতার কারণ)
          </div>
          <div className="p-3 bg-sky-50 rounded-lg font-mono text-xs text-sky-950 border border-sky-200 space-y-1.5 font-semibold">
            <div>{"Σ F = m·g - N = m·a"}</div>
            <div>{"Since a = g = (GM / r²)  ⟹  N = m(g - a) = 0"}</div>
            <div>{"W_apparent = N = 0 (Apparent Weightlessness / আপাত ওজনহীনতা)"}</div>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed font-sans font-medium">
            <strong className="text-rose-900">প্রকৃত সত্য:</strong> মহাশূন্যে মহাকর্ষ বল কিন্তু শূন্য নয় (g ≈ 8.4 m/s² at 500 km)! উপগ্রহ এবং নভোচারী উভয়েই একই ত্বরণে পৃথিবীর দিকে অবিরত মুক্তভাবে পড়ছে (Perpetual Free-Fall), যার ফলে মেঝে বা দেয়ালের প্রতিক্রিয়া বল N = 0 হয়।
          </p>
        </div>

        {/* Section 6: Energy vs Speed Paradox */}
        <div className="p-4 bg-white rounded-xl border border-sky-200 space-y-2 shadow-xs">
          <div className="text-xs font-bold text-amber-900 font-mono">
            6. The Speed vs Energy Paradox (শক্তির প্যারাডক্স)
          </div>
          <div className="p-3 bg-sky-50 rounded-lg font-mono text-xs text-sky-950 border border-sky-200 space-y-1.5 font-semibold">
            <div>{"E = -GM / (2r)   (As r increases, E becomes less negative / increases)"}</div>
            <div>{"v = √(GM / r)     (As r increases, orbital speed v decreases)"}</div>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed font-sans font-medium">
            <strong className="text-amber-900">ব্যাখ্যা:</strong> উচ্চতর কক্ষপথে যেতে রকেট শক্তি যোগ করে বটে, কিন্তু স্থিতিশক্তি (Potential Energy) এতটাই বাড়ে যে গতিশক্তি (Kinetic Energy) কমে যায়—তাই উচ্চতর কক্ষপথের উপগ্রহ সবসময় ধীরগতিতে চলে!
          </p>
        </div>
      </div>
    </div>
  );
};
