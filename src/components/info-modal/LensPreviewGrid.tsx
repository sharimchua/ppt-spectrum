import React, { useState, useEffect, useRef } from 'react';
import { Eye, RotateCw } from 'lucide-react';

interface LensItem {
  id: string;
  name: string;
  badge: string;
  plainTitle: string;
  summary: string;
  accentBorder: string;
  accentBackBorder: string;
  accentText: string;
  accentBg: string;
  renderSvg: () => React.ReactNode;
}

const LENS_ITEMS: LensItem[] = [
  {
    id: 'ruler',
    name: 'Spectrum Ruler',
    badge: 'Logarithmic Axis (d)',
    plainTitle: 'The Master Speed Map',
    summary:
      'Your panoramic map from slow drum tempos on the left, across the 25.8 Hz Auditory Horizon in the middle, up to high musical notes on the right.',
    accentBorder: 'border-amber-500/35',
    accentBackBorder: 'border-amber-400/60',
    accentText: 'text-amber-300',
    accentBg: 'bg-amber-500/10',
    renderSvg: () => (
      <svg viewBox="0 0 180 76" className="w-full h-24">
        <rect x="6" y="10" width="64" height="56" rx="4" fill="rgba(56,189,248,0.08)" />
        <rect x="70" y="10" width="36" height="56" rx="3" fill="rgba(239,68,68,0.14)" stroke="rgba(239,68,68,0.4)" strokeDasharray="2 2" />
        <rect x="106" y="10" width="68" height="56" rx="4" fill="rgba(192,132,252,0.08)" />
        <line x1="10" y1="46" x2="170" y2="46" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
        <line x1="88" y1="12" x2="88" y2="64" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 2" />
        {[24, 46, 64, 118, 138, 156].map((x, idx) => (
          <g key={idx}>
            <line x1={x} y1={idx % 2 === 0 ? 22 : 28} x2={x} y2="46" stroke={x < 88 ? '#38bdf8' : '#fbbf24'} strokeWidth="2" />
            <circle cx={x} cy={idx % 2 === 0 ? 22 : 28} r="3" fill={x < 88 ? '#38bdf8' : '#fbbf24'} />
          </g>
        ))}
        <text x="14" y="60" fill="#38bdf8" fontSize="7" fontFamily="monospace">RHYTHM</text>
        <text x="88" y="60" fill="#fca5a5" fontSize="7" fontFamily="monospace" textAnchor="middle">25.8Hz</text>
        <text x="166" y="60" fill="#c084fc" fontSize="7" fontFamily="monospace" textAnchor="end">PITCH</text>
      </svg>
    ),
  },
  {
    id: 'clock',
    name: 'Concentric Ring Clock',
    badge: 'DuPeriod Orbits',
    plainTitle: 'Octave & Tempo Rings',
    summary:
      'Wraps the ruler into a spiral of 12-hour clocks. Moving outward doubles the speed (one octave higher); 12 o’clock is always Beat 1 (Do).',
    accentBorder: 'border-cyan-500/35',
    accentBackBorder: 'border-cyan-400/60',
    accentText: 'text-cyan-300',
    accentBg: 'bg-cyan-500/10',
    renderSvg: () => (
      <svg viewBox="0 0 180 76" className="w-full h-24">
        <circle cx="90" cy="38" r="11" fill="none" stroke="rgba(56,189,248,0.3)" strokeWidth="1.2" />
        <circle cx="90" cy="38" r="21" fill="none" stroke="rgba(239,68,68,0.5)" strokeWidth="1.4" strokeDasharray="3 2" />
        <circle cx="90" cy="38" r="31" fill="none" stroke="rgba(251,191,36,0.4)" strokeWidth="1.2" />
        <line x1="90" y1="4" x2="90" y2="72" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <line x1="56" y1="38" x2="124" y2="38" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <circle cx="90" cy="7" r="3.5" fill="#ef4444" />
        <circle cx="117" cy="53" r="3.5" fill="#60a5fa" />
        <circle cx="90" cy="27" r="3" fill="#38bdf8" />
        <text x="130" y="16" fill="#67e8f9" fontSize="7" fontFamily="monospace">12h = Do</text>
      </svg>
    ),
  },
  {
    id: 'wheel',
    name: 'Cycle Wheel',
    badge: 'Polar Cycle',
    plainTitle: 'One Bar in a Circle',
    summary:
      'Folds a single repeating cycle into a wheel so you can see where beats land around a bar and how symmetrical a sound wave is.',
    accentBorder: 'border-emerald-500/35',
    accentBackBorder: 'border-emerald-400/60',
    accentText: 'text-emerald-300',
    accentBg: 'bg-emerald-500/10',
    renderSvg: () => (
      <svg viewBox="0 0 180 76" className="w-full h-24">
        <circle cx="90" cy="38" r="29" fill="rgba(16,185,129,0.06)" stroke="rgba(16,185,129,0.4)" strokeWidth="1.5" />
        <polygon points="90,9 115,52 65,52" fill="rgba(52,211,153,0.15)" stroke="#34d399" strokeWidth="1.5" />
        <line x1="90" y1="38" x2="90" y2="9" stroke="#fbbf24" strokeWidth="2" />
        <circle cx="90" cy="9" r="4" fill="#10b981" />
        <circle cx="115" cy="52" r="3.5" fill="#38bdf8" />
        <circle cx="65" cy="52" r="3.5" fill="#38bdf8" />
        <circle cx="90" cy="38" r="2.5" fill="#ffffff" />
      </svg>
    ),
  },
  {
    id: 'waveform',
    name: 'Composite Waveform',
    badge: 'Oscilloscope',
    plainTitle: 'The Combined Sound Wave',
    summary:
      'Traces the actual physical air-pressure wave—showing how your partials add their amplitudes together at every instant in time.',
    accentBorder: 'border-sky-500/35',
    accentBackBorder: 'border-sky-400/60',
    accentText: 'text-sky-300',
    accentBg: 'bg-sky-500/10',
    renderSvg: () => (
      <svg viewBox="0 0 180 76" className="w-full h-24">
        <line x1="8" y1="38" x2="172" y2="38" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <path d="M 8 38 Q 20 8, 32 32 T 56 26 T 80 54 T 104 18 T 128 46 T 152 20 T 172 38" fill="none" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" />
        <text x="12" y="16" fill="#7dd3fc" fontSize="7" fontFamily="monospace">+Amplitude</text>
        <text x="12" y="68" fill="#64748b" fontSize="7" fontFamily="monospace">−Amplitude</text>
      </svg>
    ),
  },
  {
    id: 'phasors',
    name: 'Rotating Phasors',
    badge: 'Spinning Vectors',
    plainTitle: 'Spinning Wheels Within Wheels',
    summary:
      'Shows each overtone as a spinning clock hand whose length is its amplitude. Watch how their speeds team up to draw the sound.',
    accentBorder: 'border-purple-500/35',
    accentBackBorder: 'border-purple-400/60',
    accentText: 'text-purple-300',
    accentBg: 'bg-purple-500/10',
    renderSvg: () => (
      <svg viewBox="0 0 180 76" className="w-full h-24">
        {[
          { cx: 36, r: 20, ang: -40, col: '#f87171', lbl: '1×' },
          { cx: 90, r: 16, ang: 55, col: '#fbbf24', lbl: '2×' },
          { cx: 140, r: 13, ang: 145, col: '#c084fc', lbl: '3×' },
        ].map((p, i) => {
          const rad = (p.ang * Math.PI) / 180;
          const ex = p.cx + Math.cos(rad) * p.r;
          const ey = 38 + Math.sin(rad) * p.r;
          return (
            <g key={i}>
              <circle cx={p.cx} cy={38} r={p.r} fill="none" stroke={p.col} strokeOpacity="0.35" strokeWidth="1.3" />
              <line x1={p.cx} y1={38} x2={ex} y2={ey} stroke={p.col} strokeWidth="2" strokeLinecap="round" />
              <circle cx={ex} cy={ey} r="3" fill={p.col} />
              <text x={p.cx} y="69" fill={p.col} fontSize="7.5" fontFamily="monospace" textAnchor="middle">{p.lbl}</text>
            </g>
          );
        })}
      </svg>
    ),
  },
  {
    id: 'lanes',
    name: 'Event Lanes',
    badge: 'Polyrhythm Grid',
    plainTitle: 'Multi-Track Drum Lanes',
    summary:
      'Lays out each voice on its own horizontal track across one bar so you can see how 3-against-2 or 4:5:6 polyrhythms interlock.',
    accentBorder: 'border-rose-500/35',
    accentBackBorder: 'border-rose-400/60',
    accentText: 'text-rose-300',
    accentBg: 'bg-rose-500/10',
    renderSvg: () => (
      <svg viewBox="0 0 180 76" className="w-full h-24">
        <line x1="20" y1="20" x2="160" y2="20" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
        <line x1="20" y1="38" x2="160" y2="38" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
        <line x1="20" y1="56" x2="160" y2="56" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
        {[20, 66.6, 113.3, 160].map((x, i) => <circle key={`3-${i}`} cx={x} cy="20" r="4" fill={i === 0 || i === 3 ? '#10b981' : '#fbbf24'} />)}
        {[20, 90, 160].map((x, i) => <circle key={`2-${i}`} cx={x} cy="38" r="4" fill={i === 0 || i === 2 ? '#10b981' : '#38bdf8'} />)}
        {[20, 55, 90, 125, 160].map((x, i) => <circle key={`4-${i}`} cx={x} cy="56" r="3.5" fill={i === 0 || i === 4 ? '#10b981' : '#fb7185'} />)}
      </svg>
    ),
  },
  {
    id: 'primes',
    name: 'Prime Profile',
    badge: 'Prime Families',
    plainTitle: 'Musical Flavour Meter',
    summary:
      'Breaks your sound down into its prime-number ingredients (2, 3, 5, 7, 11, and >11) to show why it feels grounded, sweet, bluesy, or bell-like.',
    accentBorder: 'border-indigo-500/35',
    accentBackBorder: 'border-indigo-400/60',
    accentText: 'text-indigo-300',
    accentBg: 'bg-indigo-500/10',
    renderSvg: () => (
      <svg viewBox="0 0 180 76" className="w-full h-24">
        {[
          { x: 22, h: 42, col: '#fb923c', lbl: 'P2' },
          { x: 48, h: 34, col: '#60a5fa', lbl: 'P3' },
          { x: 74, h: 26, col: '#fde047', lbl: 'P5' },
          { x: 100, h: 16, col: '#f472b6', lbl: 'P7' },
          { x: 126, h: 10, col: '#34d399', lbl: 'P11' },
          { x: 152, h: 20, col: '#c084fc', lbl: '>11' },
        ].map((b, i) => (
          <g key={i}>
            <rect x={b.x - 8} y={56 - b.h} width="16" height={b.h} rx="3" fill={b.col} fillOpacity="0.85" />
            <text x={b.x} y="68" fill="#cbd5e1" fontSize="7" fontFamily="monospace" textAnchor="middle">{b.lbl}</text>
          </g>
        ))}
      </svg>
    ),
  },
  {
    id: 'alignment',
    name: 'Alignment Meter',
    badge: 'Coincidence & Sam',
    plainTitle: 'How Often Everything Locks',
    summary:
      'Measures how neatly your layers line up on a shared downbeat (The Sam / Ghost Root) versus how much they rub and shimmer.',
    accentBorder: 'border-teal-500/35',
    accentBackBorder: 'border-teal-400/60',
    accentText: 'text-teal-300',
    accentBg: 'bg-teal-500/10',
    renderSvg: () => (
      <svg viewBox="0 0 180 76" className="w-full h-24">
        <path d="M 14 54 L 30 54 L 36 14 L 42 54 L 84 54 L 90 26 L 96 54 L 138 54 L 144 14 L 150 54 L 166 54" fill="none" stroke="#2dd4bf" strokeWidth="2.2" strokeLinejoin="round" />
        <circle cx="36" cy="14" r="3.5" fill="#10b981" />
        <circle cx="144" cy="14" r="3.5" fill="#10b981" />
        <text x="90" y="68" fill="#5eead4" fontSize="7" fontFamily="monospace" textAnchor="middle">SAM CONVERGENCE PEAKS</text>
      </svg>
    ),
  },
];

export const LensPreviewGrid: React.FC = () => {
  // Track which cards are flipped to the back (text explanation) face
  const [flippedIds, setFlippedIds] = useState<Set<string>>(() => new Set());
  // If user manually clicks a card or "Flip All", remember manual state for that card
  const manualOverridesRef = useRef<Map<string, boolean>>(new Map());
  const gridRef = useRef<HTMLDivElement>(null);

  // Scroll-depth progressive auto-flip: as the grid scrolls through the middle/upper half of the modal,
  // flip cards 0..7 progressively so the user sees them animate from visual -> explanation (and back when scrolling up).
  useEffect(() => {
    const gridEl = gridRef.current;
    if (!gridEl) return;

    const scrollParent = gridEl.closest('[data-tutorial-scroll-body="true"]') as HTMLElement | null;
    if (!scrollParent) return;

    const evaluateScrollFlip = () => {
      const parentRect = scrollParent.getBoundingClientRect();
      const gridRect = gridEl.getBoundingClientRect();
      const viewH = parentRect.height || 1;

      // Start flipping when the top of the grid moves above 62% of the modal viewport height;
      // complete all 8 cards when it reaches 12% of the modal viewport height.
      const relTop = gridRect.top - parentRect.top;
      const startY = viewH * 0.62;
      const endY = viewH * 0.12;
      const progress = Math.max(0, Math.min(1, (startY - relTop) / Math.max(1, startY - endY)));
      const targetAutoFlipCount = Math.round(progress * LENS_ITEMS.length);

      setFlippedIds((prev) => {
        const next = new Set<string>();
        LENS_ITEMS.forEach((item, idx) => {
          const manual = manualOverridesRef.current.get(item.id);
          if (manual !== undefined) {
            if (manual) next.add(item.id);
          } else if (idx < targetAutoFlipCount) {
            next.add(item.id);
          }
        });
        if (next.size === prev.size && Array.from(next).every((id) => prev.has(id))) {
          return prev;
        }
        return next;
      });
    };

    scrollParent.addEventListener('scroll', evaluateScrollFlip, { passive: true });
    return () => scrollParent.removeEventListener('scroll', evaluateScrollFlip);
  }, []);

  const handleToggleCard = (id: string) => {
    setFlippedIds((prev) => {
      const next = new Set(prev);
      const willFlip = !next.has(id);
      manualOverridesRef.current.set(id, willFlip);
      if (willFlip) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const allFlipped = flippedIds.size === LENS_ITEMS.length;

  const handleToggleAll = () => {
    const targetState = !allFlipped;
    LENS_ITEMS.forEach((item) => {
      manualOverridesRef.current.set(item.id, targetState);
    });
    if (targetState) {
      setFlippedIds(new Set(LENS_ITEMS.map((l) => l.id)));
    } else {
      setFlippedIds(new Set());
    }
  };

  return (
    <div ref={gridRef} className="rounded-xl border border-stone-800 bg-stone-900/40 p-4 sm:p-5">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-amber-400 shrink-0" />
            <h3 className="text-sm font-bold text-stone-100">
              Eight Ways to Look at the Same Sound (The Visual Lenses)
            </h3>
          </div>
          <p className="text-[11px] text-stone-400 mt-0.5">
            Click any card to flip between its visual diagram and plain-English guide (or scroll down to watch them flip).
          </p>
        </div>

        <button
          type="button"
          onClick={handleToggleAll}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-950 px-2.5 py-1.5 text-[11px] font-semibold text-stone-300 hover:border-amber-500/50 hover:text-amber-300 transition cursor-pointer shrink-0"
        >
          <RotateCw className="h-3 w-3" />
          <span>{allFlipped ? 'Show All Visuals' : 'Flip All to Text'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {LENS_ITEMS.map((lens) => {
          const isFlipped = flippedIds.has(lens.id);
          return (
            <div
              key={lens.id}
              onClick={() => handleToggleCard(lens.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleToggleCard(lens.id);
                }
              }}
              style={{ perspective: '1000px' }}
              className="group relative h-[196px] w-full select-none cursor-pointer focus:outline-none"
              aria-label={`${lens.name} — click to flip card`}
            >
              {/* 3D Rotating Inner Container — Fixed height prevents any layout shift */}
              <div
                style={{
                  transformStyle: 'preserve-3d',
                  transition: 'transform 650ms cubic-bezier(0.22, 1, 0.36, 1)',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
                className="relative h-full w-full"
              >
                {/* FRONT FACE: Visual SVG Thumbnail */}
                <div
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                  }}
                  className={`absolute inset-0 flex flex-col justify-between rounded-xl border p-3.5 bg-stone-950/90 hover:bg-stone-900/90 transition-colors ${lens.accentBorder}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border ${lens.accentBorder} ${lens.accentText} ${lens.accentBg} truncate`}
                    >
                      {lens.badge}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-stone-400 group-hover:text-amber-300 shrink-0">
                      <RotateCw className="h-3 w-3 transition-transform group-hover:rotate-90" />
                    </span>
                  </div>

                  <div className="my-1 flex items-center justify-center rounded-lg border border-stone-800/80 bg-[#070a12] px-2 py-0.5">
                    {lens.renderSvg()}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-stone-100 truncate">{lens.name}</h4>
                    <div className={`text-[11px] font-medium ${lens.accentText} truncate`}>
                      {lens.plainTitle}
                    </div>
                  </div>
                </div>

                {/* BACK FACE: Plain-English Description */}
                <div
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                  className={`absolute inset-0 flex flex-col justify-between rounded-xl border p-3.5 bg-stone-900/95 shadow-inner ${lens.accentBackBorder}`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span
                        className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border ${lens.accentBorder} ${lens.accentText} ${lens.accentBg} truncate`}
                      >
                        {lens.name}
                      </span>
                      <RotateCw className="h-3 w-3 text-amber-300 shrink-0" />
                    </div>
                    <div className={`text-xs font-bold ${lens.accentText} mb-1`}>
                      {lens.plainTitle}
                    </div>
                    <p className="text-[11px] leading-relaxed text-stone-200">
                      {lens.summary}
                    </p>
                  </div>

                  <div className="pt-1 border-t border-stone-800/80 flex items-center justify-between text-[10px] text-stone-400 font-mono">
                    <span>{lens.badge}</span>
                    <span className="text-amber-400">Visual ↻</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
