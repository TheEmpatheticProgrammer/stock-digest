import React from 'react';

function formatTime(ts) {
  if (!ts) return null;
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
    hour12: true, timeZoneName: 'short',
  });
}

function StatusBadge({ status, progress }) {
  if (status === 'running') {
    return (
      <span className="flex items-center gap-2 text-xs font-bold text-white bg-white/20 backdrop-blur-sm border-2 border-white/30 px-3 py-1.5 rounded-full">
        <span className="inline-block w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
        Scanning {progress}%
      </span>
    );
  }
  if (status === 'complete') {
    return (
      <span className="flex items-center gap-2 text-xs font-bold text-white bg-emerald-500/30 backdrop-blur-sm border-2 border-emerald-300/50 px-3 py-1.5 rounded-full">
        <span className="inline-block w-2 h-2 bg-emerald-300 rounded-full" />
        Up to date
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="flex items-center gap-2 text-xs font-bold text-white bg-red-500/30 backdrop-blur-sm border-2 border-red-300/50 px-3 py-1.5 rounded-full">
        ⚠️ Scan error
      </span>
    );
  }
  return (
    <span className="text-xs font-bold text-white/70 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
      Idle
    </span>
  );
}

export default function Header({ scanState, lastScanTime, onTriggerScan, onShowAbout }) {
  const isRunning = scanState?.status === 'running';

  return (
    <header className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 sticky top-0 z-10 shadow-xl backdrop-blur-lg">
      <div className="w-full px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          {/* Brand */}
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              📈 Stock Digest
            </h1>
            <p className="text-xs text-white/80 mt-1 font-medium">
              Daily Pre-Market S&P 500 Scanner · Top 10 by Composite Score
            </p>
          </div>

          {/* Right: status + last scan + button */}
          <div className="flex items-center gap-4 flex-wrap justify-end">
            {lastScanTime && (
              <span className="text-xs text-white/70 font-medium">
                Last scan: <span className="text-white font-semibold">{formatTime(lastScanTime)}</span>
              </span>
            )}
            <StatusBadge status={scanState?.status} progress={scanState?.progress} />
            <button
              onClick={onShowAbout}
              className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl transition-all duration-200 bg-white/10 text-white border-2 border-white/30 hover:bg-white/20 hover:border-white/50 hover:scale-105 active:scale-95 backdrop-blur-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              About
            </button>
            <button
              onClick={onTriggerScan}
              disabled={isRunning}
              className={`
                flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl transition-all duration-200
                ${isRunning
                  ? 'bg-white/20 text-white/50 cursor-not-allowed'
                  : 'bg-white text-purple-600 hover:bg-purple-50 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl'}
              `}
            >
              {isRunning ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Scanning...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"/>
                  </svg>
                  Run Scan
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
