import React from 'react';
import { ExternalLink, BookOpen, Compass, Layers, Info } from 'lucide-react';

export const LinksSection: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Introduction Card */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-5 space-y-2">
        <h3 className="text-sm font-bold text-stone-100 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-amber-400" />
          <span>Prime Period Theory Ecosystem &amp; Educational Resources</span>
        </h3>
        <p className="text-xs text-stone-300 leading-relaxed">
          PPT Spectrum is part of the broader Prime Period Theory research and learning suite created by Midlife Muso.
          Explore the interactive web portals, video masterclasses, and complete theoretical specifications below.
        </p>
      </div>

      {/* Primary Outbound Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PPT Official Web Portal */}
        <a
          href="https://ppt.midlifemuso.com"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col justify-between rounded-xl border border-stone-800 bg-stone-950/60 p-5 transition-all hover:border-amber-500/50 hover:bg-stone-900/60 shadow-lg"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                Official Knowledge Portal
              </span>
              <ExternalLink className="h-4 w-4 text-stone-500 group-hover:text-amber-400 transition-colors" />
            </div>
            <h4 className="text-base font-bold text-stone-100 group-hover:text-amber-300 transition-colors">
              ppt.midlifemuso.com
            </h4>
            <p className="text-xs text-stone-400 leading-relaxed">
              Explore the complete Open Knowledge Format (OKF) documentation bundle, mathematical proofs, interactive tuning calculators, and lesson curriculum.
            </p>
          </div>

          <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-amber-400">
            <span>Visit Theory Hub</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </a>

        {/* Midlife Muso Main Site */}
        <a
          href="https://midlifemuso.com"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col justify-between rounded-xl border border-stone-800 bg-stone-950/60 p-5 transition-all hover:border-cyan-500/50 hover:bg-stone-900/60 shadow-lg"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                Creator &amp; Lesson Library
              </span>
              <ExternalLink className="h-4 w-4 text-stone-500 group-hover:text-cyan-400 transition-colors" />
            </div>
            <h4 className="text-base font-bold text-stone-100 group-hover:text-cyan-300 transition-colors">
              midlifemuso.com
            </h4>
            <p className="text-xs text-stone-400 leading-relaxed">
              Video lessons, production tutorials, essays on musical perception, and practical guides on applying PPT in modern digital audio workstations.
            </p>
          </div>

          <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-cyan-400">
            <span>Explore Creator Portal</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </a>
      </div>

      {/* Deep-Dive Resource Hub */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/30 p-5 space-y-3">
        <h4 className="text-xs font-bold text-stone-200 uppercase tracking-wide">
          Curriculum &amp; Reference Hub
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <a
            href="https://ppt.midlifemuso.com/reference"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-2.5 rounded-lg border border-stone-800/80 bg-stone-950/40 p-3 text-stone-300 transition-colors hover:border-stone-700 hover:text-amber-300"
          >
            <Compass className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-stone-200">OKF Reference</div>
              <div className="text-[11px] text-stone-400 mt-0.5">Formal taxonomy, formulas, and axis coordinate standards.</div>
            </div>
          </a>

          <a
            href="https://ppt.midlifemuso.com/topics"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-2.5 rounded-lg border border-stone-800/80 bg-stone-950/40 p-3 text-stone-300 transition-colors hover:border-stone-700 hover:text-cyan-300"
          >
            <BookOpen className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-stone-200">Theoretical Topics</div>
              <div className="text-[11px] text-stone-400 mt-0.5">Articles on the TPL boundary, prime profiles, and metric time.</div>
            </div>
          </a>

          <a
            href="https://ppt.midlifemuso.com/components"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-2.5 rounded-lg border border-stone-800/80 bg-stone-950/40 p-3 text-stone-300 transition-colors hover:border-stone-700 hover:text-emerald-300"
          >
            <Layers className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-stone-200">Visualiser Suite</div>
              <div className="text-[11px] text-stone-400 mt-0.5">Complementary tools including PPT Visualiser and Harmonic Analyser.</div>
            </div>
          </a>
        </div>
      </div>

      {/* Re-opening Help Modal Notice */}
      <div className="flex items-center gap-3 rounded-xl border border-stone-800 bg-stone-950/70 p-4 text-xs text-stone-300">
        <Info className="h-5 w-5 text-amber-400 shrink-0" />
        <p className="leading-relaxed">
          You can return to this comprehensive guide and interactive diagrams at any time by clicking the <strong>PPT SPECTRUM</strong> brand logo in the top toolbar or selecting <strong>Help &amp; Documentation</strong> in the settings menu.
        </p>
      </div>
    </div>
  );
};
