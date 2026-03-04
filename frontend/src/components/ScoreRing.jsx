import React, { useEffect, useState } from 'react';

function getColor(score) {
  if (score >= 75) return '#10B981'; // emerald
  if (score >= 55) return '#3B82F6'; // blue
  if (score >= 40) return '#F59E0B'; // amber
  return '#EF4444';                  // red
}

/**
 * SVG circular score gauge.
 * Props: score (0-100), size (px), strokeWidth
 */
export default function ScoreRing({ score, size = 88, strokeWidth = 8 }) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    // Animate ring fill on mount
    const timer = requestAnimationFrame(() => setDisplayScore(score));
    return () => cancelAnimationFrame(timer);
  }, [score]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference - (displayScore / 100) * circumference;
  const color = getColor(score);

  return (
    <div style={{ width: size, height: size }} className="relative flex-shrink-0">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
        />
        {/* Score arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          className="score-ring-progress"
        />
      </svg>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="mono text-xl font-bold leading-none" style={{ color }}>
          {score}
        </span>
        <span className="text-[10px] text-gray-400 font-medium leading-none mt-0.5">/ 100</span>
      </div>
    </div>
  );
}
