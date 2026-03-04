import React, { useEffect } from 'react';
import Header from './components/Header.jsx';
import TradeCard from './components/TradeCard.jsx';
import ScanProgress from './components/ScanProgress.jsx';
import LoadingSkeleton from './components/LoadingSkeleton.jsx';
import EmptyState from './components/EmptyState.jsx';
import useScanData from './hooks/useScanData.js';
import useScanProgress from './hooks/useScanProgress.js';

export default function App() {
  const { cards, scanTimestamp, isLoading, error, triggerScan, refetch } = useScanData();
  const scanState = useScanProgress();

  // Refetch results whenever a scan completes
  useEffect(() => {
    if (scanState?.status === 'complete') {
      refetch();
    }
  }, [scanState?.status, refetch]);

  const showSkeleton = isLoading && !cards;
  const showEmpty = !isLoading && !cards && scanState?.status !== 'running';
  const showCards = !!cards?.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        scanState={scanState}
        lastScanTime={scanTimestamp}
        onTriggerScan={triggerScan}
      />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Scan progress banner */}
        <ScanProgress scanState={scanState} />

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Loading skeleton */}
        {showSkeleton && <LoadingSkeleton count={10} />}

        {/* Empty state */}
        {showEmpty && <EmptyState onTriggerScan={triggerScan} />}

        {/* Trade cards grid */}
        {showCards && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Today's Top {cards.length} Picks
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  All 4 pillars scored ≥ 40% · Ranked by composite score
                </p>
              </div>
              {scanTimestamp && (
                <span className="text-xs text-gray-400">
                  Generated{' '}
                  {new Date(scanTimestamp).toLocaleTimeString('en-US', {
                    hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short',
                  })}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {cards.map((card, i) => (
                <TradeCard key={card.ticker} card={card} index={i} />
              ))}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-8 border-t border-gray-100 mt-8">
        <p className="text-xs text-gray-400 text-center">
          Stock Digest · For informational purposes only · Not financial advice ·
          Scans run automatically at 8:30 AM ET Mon–Fri
        </p>
      </footer>
    </div>
  );
}
