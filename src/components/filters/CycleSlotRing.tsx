import React from 'react';

interface CycleSlotRingProps {
  divisions: number;
  slotWeights: number[];
  rotation: number;
  onToggleSlot: (slotIdx: number) => void;
  size?: number;
}

export const CycleSlotRing: React.FC<CycleSlotRingProps> = ({
  divisions,
  slotWeights,
  rotation,
  onToggleSlot,
  size = 180,
}) => {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.38;
  const nodeRadius = Math.max(4, Math.min(12, (2 * Math.PI * radius) / (divisions * 2.5)));

  return (
    <div className="flex flex-col items-center justify-center p-2">
      <svg width={size} height={size} className="select-none">
        {/* Background Guide Circle */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="rgba(100, 116, 139, 0.2)"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />

        {/* Apex landmark pointer at top (slot 0) */}
        <polygon
          points={`${cx},${cy - radius - nodeRadius - 5} ${cx - 4},${cy - radius - nodeRadius - 12} ${cx + 4},${cy - radius - nodeRadius - 12}`}
          fill="rgba(56, 189, 248, 0.7)"
        />

        {/* Slots around the ring */}
        {Array.from({ length: divisions }, (_, idx) => {
          // Angle starts at top (-PI/2), rotates clockwise
          const effectiveIdx = (idx + rotation) % divisions;
          const angle = (idx / divisions) * 2 * Math.PI - Math.PI / 2;
          const sx = cx + radius * Math.cos(angle);
          const sy = cy + radius * Math.sin(angle);
          const weight = slotWeights[effectiveIdx] ?? 0;
          const isActive = weight > 0.1;

          return (
            <g
              key={idx}
              className="cursor-pointer group"
              onClick={() => onToggleSlot(effectiveIdx)}
            >
              {/* Hit circle */}
              <circle
                cx={sx}
                cy={sy}
                r={nodeRadius + 6}
                fill="transparent"
              />

              {/* Visual Slot Node */}
              <circle
                cx={sx}
                cy={sy}
                r={nodeRadius}
                fill={isActive ? 'rgba(56, 189, 248, 0.9)' : 'rgba(30, 41, 59, 0.8)'}
                stroke={isActive ? '#38bdf8' : 'rgba(100, 116, 139, 0.5)'}
                strokeWidth={isActive ? '2' : '1.5'}
                className="transition-all duration-150 group-hover:stroke-sky-300 group-hover:brightness-125"
              />

              {/* Slot Index Label */}
              {divisions <= 16 && (
                <text
                  x={sx}
                  y={sy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={nodeRadius * 0.9}
                  fontFamily="monospace"
                  fill={isActive ? '#0f172a' : '#94a3b8'}
                  fontWeight="bold"
                  pointerEvents="none"
                  className="transition-colors group-hover:fill-sky-200"
                >
                  {effectiveIdx}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <span className="text-[10px] text-slate-500 font-mono mt-1">
        Apex slot 0 at top · Click to toggle onsets
      </span>
    </div>
  );
};
