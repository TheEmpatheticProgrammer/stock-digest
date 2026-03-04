import React, { useEffect, useState } from 'react';

const PILLAR_COLORS = {
  vol: '#3B82F6',      // blue
  quality: '#10B981',  // emerald
  regime: '#8B5CF6',   // violet
  info: '#F59E0B',     // amber
};

const PILLAR_LABELS = {
  vol: 'Vol-Edge',
  quality: 'Quality Gate',
  regime: 'Regime',
  info: 'Info-Edge',
};

const PILLAR_MAX = 25;

/**
 * A labeled horizontal score bar for a single pillar.
 * Props: pillar ('vol'|'quality'|'regime'|'info'), score (0-25), subScores {}
 */
export default function PillarBar({ pillar, score }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = requestAnimationFrame(() =>
      setWidth(Math.round((score / PILLAR_MAX) * 100))
    );
    return () => cancelAnimationFrame(timer);
  }, [score]);

  const color = PILLAR_COLORS[pillar] ?? '#6B7280';
  const label = PILLAR_LABELS[pillar] ?? pillar;
  const grade = getGrade(score, PILLAR_MAX);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-gray-700">{label}</span>
        <div className="flex items-center gap-1.5">
          <span
            className="mono font-semibold"
            style={{ color }}
          >
            {score}
          </span>
          <span className="text-gray-400">/ 25</span>
          <span
            className="text-[10px] font-bold px-1 py-0.5 rounded"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {grade}
          </span>
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full pillar-bar-fill"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function getGrade(score, max) {
  const pct = score / max;
  if (pct >= 0.88) return 'A+';
  if (pct >= 0.80) return 'A';
  if (pct >= 0.72) return 'B+';
  if (pct >= 0.64) return 'B';
  if (pct >= 0.56) return 'C+';
  if (pct >= 0.48) return 'C';
  return 'D';
}
