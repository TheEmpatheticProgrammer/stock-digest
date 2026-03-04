import React from 'react';

export default function EmptyState({ onTriggerScan }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-5">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">No results yet</h2>
      <p className="text-sm text-gray-500 max-w-sm mb-6">
        Run a scan to find today's top S&P 500 stocks scored across volatility,
        fundamentals, macro regime, and information flow.
      </p>
      <button
        onClick={onTriggerScan}
        className="bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-700 transition-colors shadow-sm"
      >
        Run First Scan
      </button>
      <p className="text-xs text-gray-400 mt-4">
        Scans run automatically at 8:30 AM ET on weekdays
      </p>
    </div>
  );
}
