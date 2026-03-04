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
      <span className="flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
        <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
        Scanning {progress}%
      </span>
    );
  }
  if (status === 'complete') {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
        <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full" />
        Up to date
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
        Scan error
      </span>
    );
  }
  return (
    <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
      Idle
    </span>
  );
}

export default function Header({ scanState, lastScanTime, onTriggerScan }) {
  const isRunning = scanState?.status === 'running';

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Brand */}
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
              Stock Digest
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Daily Pre-Market S&P 500 Scanner · Top 10 by Composite Score
            </p>
          </div>

          {/* Right: status + last scan + button */}
          <div className="flex items-center gap-3 flex-wrap justify-end">
            {lastScanTime && (
              <span className="text-xs text-gray-400">
                Last scan: <span className="text-gray-600 font-medium">{formatTime(lastScanTime)}</span>
              </span>
            )}
            <StatusBadge status={scanState?.status} progress={scanState?.progress} />
            <button
              onClick={onTriggerScan}
              disabled={isRunning}
              className={`
                flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-all
                ${isRunning
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-900 text-white hover:bg-gray-700 active:scale-95 shadow-sm'}
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
