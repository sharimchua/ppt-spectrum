/**
 * SVG ADSR envelope curve visualiser.
 * Renders the fundamental envelope curve, high-harmonic spectral damping overlay, and phase labels.
 */

import React from 'react';
import { ADSREnvelope } from '../../core/types';
import { calculateAdsrGeometry } from './adsr-curve-geometry';

export interface AdsrCurveProps {
  adsr: ADSREnvelope;
  periodMode?: 'pitch' | 'rhythm';
}

export const AdsrCurve: React.FC<AdsrCurveProps> = ({ adsr, periodMode = 'pitch' }) => {
  const geo = calculateAdsrGeometry(adsr, 320, periodMode);

  return (
    <>
      <div className="relative w-full h-24 bg-slate-950/70 border border-slate-800 rounded-lg overflow-hidden flex items-center justify-center p-2">
        <svg viewBox="0 0 320 90" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="adsrGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid guidelines */}
          <line x1="20" y1="68" x2="310" y2="68" stroke="#334155" strokeWidth="1" strokeDasharray="2,2" />
          <line x1="20" y1="15" x2="310" y2="15" stroke="#334155" strokeWidth="0.5" strokeDasharray="1,3" />

          {/* Damped High Harmonic Comparison Curve */}
          {geo.showDamped && (
            <path
              d={geo.dampPath}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="1.2"
              strokeDasharray="3,2"
              opacity="0.75"
            />
          )}

          {/* Main Fundamental Curve Filled Area */}
          <path d={geo.mainFill} fill="url(#adsrGrad)" />
          <path d={geo.mainPath} fill="none" stroke="#f59e0b" strokeWidth="2.0" />

          {/* Anchor Points */}
          <circle cx={geo.points.peak.x} cy={geo.points.peak.y} r="3" fill="#ffffff" stroke="#f59e0b" strokeWidth="1.5" />
          <circle cx={geo.points.decay.x} cy={geo.points.decay.y} r="2.5" fill="#f59e0b" />
          <circle cx={geo.points.sustainEnd.x} cy={geo.points.sustainEnd.y} r="2.5" fill="#f59e0b" />
          <circle cx={geo.points.releaseEnd.x} cy={geo.points.releaseEnd.y} r="2.5" fill="#f59e0b" />

          {/* Phase Labels */}
          <text x={geo.labels.a.x} y={geo.labels.a.y} fill="#94a3b8" fontSize="8" fontFamily="monospace" textAnchor="middle">A</text>
          <text x={geo.labels.d.x} y={geo.labels.d.y} fill="#94a3b8" fontSize="8" fontFamily="monospace" textAnchor="middle">D</text>
          <text x={geo.labels.s.x} y={geo.labels.s.y} fill="#94a3b8" fontSize="8" fontFamily="monospace" textAnchor="middle">S</text>
          <text x={geo.labels.r.x} y={geo.labels.r.y} fill="#94a3b8" fontSize="8" fontFamily="monospace" textAnchor="middle">R</text>
        </svg>
      </div>
      {adsr.damping && adsr.damping > 0.08 ? (
        <div className="flex items-center gap-1.5 text-[9px] text-cyan-400 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span>Cyan dashed curve shows accelerated decay on higher harmonics due to spectral damping ({adsr.damping.toFixed(2)})</span>
        </div>
      ) : null}
    </>
  );
};
