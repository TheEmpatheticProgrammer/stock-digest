import React, { useEffect, useState } from 'react';

export default function ScanProgress({ scanState }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (scanState?.status !== 'running') return;
    const start = scanState.startedAt ?? Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [scanState?.status, scanState?.startedAt]);

  if (scanState?.status !== 'running') return null;

  const progress = scanState?.progress ?? 0;
  const phase = scanState?.phase ?? 'Initializing...';
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-500 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          <span className="text-sm font-semibold text-blue-700">{phase}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-blue-500">
          <span className="mono font-medium">{progress}%</span>
          <span className="mono text-blue-400">
            {mins > 0 ? `${mins}m ` : ''}{secs}s elapsed
          </span>
        </div>
      </div>
      <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-[11px] text-blue-400 mt-1.5">
        Scanning all S&P 500 stocks across 4 scoring pillars. Results typically take 5–12 minutes.
      </p>
    </div>
  );
}
