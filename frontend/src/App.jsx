import React, { useEffect, useState } from 'react';
import Header from './components/Header.jsx';
import TradeCard from './components/TradeCard.jsx';
import DetailPane from './components/DetailPane.jsx';
import ScanProgress from './components/ScanProgress.jsx';
import LoadingSkeleton from './components/LoadingSkeleton.jsx';
import EmptyState from './components/EmptyState.jsx';
import About from './components/About.jsx';
import DateCarousel from './components/DateCarousel.jsx';
import useScanData from './hooks/useScanData.js';
import useScanProgress from './hooks/useScanProgress.js';
import useDateNavigation from './hooks/useDateNavigation.js';

export default function App() {
  const dateNav = useDateNavigation();
  const { cards, scanTimestamp, scanDate, isLoading, error, triggerScan, refetch } = useScanData(dateNav.currentDate);
  const scanState = useScanProgress();
  const [selectedCard, setSelectedCard] = useState(null);
  const [showAbout, setShowAbout] = useState(false);

  // Refetch results and refresh dates whenever a scan completes
  useEffect(() => {
    if (scanState?.status === 'complete') {
      refetch();
      dateNav.refreshDates(); // Update available dates after scan
    }
  }, [scanState?.status, refetch, dateNav]);

  // Close detail pane on ESC key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && selectedCard) {
        setSelectedCard(null);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedCard]);

  const showSkeleton = isLoading && !cards;
  const showEmpty = !isLoading && !cards && scanState?.status !== 'running';
  const showCards = !!cards?.length;

  return (
    <div className="min-h-screen">
      <Header
        scanState={scanState}
        lastScanTime={scanTimestamp}
        onTriggerScan={triggerScan}
        onShowAbout={() => setShowAbout(true)}
      />

      {/* Date Navigation Carousel */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 border-t border-white/10 shadow-lg">
        {dateNav.isLoading ? (
          <div className="py-4 text-center text-white text-sm">Loading dates...</div>
        ) : dateNav.availableDates.length > 0 ? (
          <DateCarousel
            currentDate={dateNav.currentDate}
            hasNext={dateNav.hasNext}
            hasPrevious={dateNav.hasPrevious}
            onNext={dateNav.goToNext}
            onPrevious={dateNav.goToPrevious}
            isViewingLatest={dateNav.isViewingLatest}
          />
        ) : (
          <div className="py-4 text-center text-white text-sm">
            No historical data available. Run a scan to get started.
          </div>
        )}
      </div>

      {/* Main content area with white background */}
      <main className="w-full px-6 py-8 space-y-6 bg-white/95 backdrop-blur-sm shadow-2xl rounded-t-3xl mt-4">
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

        {/* Trade cards grid - responsive layout with split view */}
        {showCards && (
          <div className={`flex gap-6 ${selectedCard ? 'flex-col xl:flex-row' : ''}`}>
            {/* Cards section - takes half width when detail is open, full width otherwise */}
            {/* Click anywhere in cards area to dismiss detail pane */}
            <div
              className={`${selectedCard ? 'xl:flex-1' : 'w-full'} ${
                selectedCard ? 'xl:cursor-pointer xl:hover:opacity-95 transition-opacity' : ''
              }`}
              onClick={(e) => {
                // Only close if clicking the background, not a card
                if (e.target === e.currentTarget || e.target.closest('.card-grid-container')) {
                  if (selectedCard) setSelectedCard(null);
                }
              }}
              title={selectedCard ? 'Click to close detail pane (or press ESC)' : ''}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Today's Top {cards.length} Picks
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    All 4 pillars scored ≥ 40% · Ranked by composite score
                  </p>
                </div>
                {scanTimestamp && !selectedCard && (
                  <span className="text-xs text-gray-400">
                    Generated{' '}
                    {new Date(scanTimestamp).toLocaleTimeString('en-US', {
                      hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short',
                    })}
                  </span>
                )}
              </div>
              <div className={`card-grid-container grid gap-5 ${
                selectedCard
                  ? 'grid-cols-1'
                  : 'grid-cols-1 lg:grid-cols-2'
              }`}>
                {cards.map((card, i) => (
                  <TradeCard
                    key={card.ticker}
                    card={card}
                    index={i}
                    onClick={() => setSelectedCard(card)}
                    isSelected={selectedCard?.ticker === card.ticker}
                  />
                ))}
              </div>
            </div>

            {/* Detail pane - takes other half, fills remaining space */}
            {selectedCard && (
              <div className="xl:flex-1 xl:sticky xl:top-6 xl:self-start">
                <DetailPane
                  card={selectedCard}
                  onClose={() => setSelectedCard(null)}
                  isInline={true}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full px-6 py-8 border-t border-purple-100 mt-8 bg-gradient-to-r from-purple-50/50 to-blue-50/50">
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs text-gray-500 text-center font-medium">
            📈 Stock Digest · For informational purposes only · Not financial advice ·
            Scans run automatically at 8:30 AM ET Mon–Fri
          </p>
          <button
            onClick={() => setShowAbout(true)}
            className="text-xs font-bold text-purple-600 hover:text-purple-700 hover:underline transition-colors"
          >
            About · Data Sources · Methodology
          </button>
        </div>
      </footer>

      {/* Mobile overlay for detail pane */}
      {selectedCard && (
        <div className="xl:hidden">
          <DetailPane
            card={selectedCard}
            onClose={() => setSelectedCard(null)}
            isInline={false}
          />
        </div>
      )}

      {/* About Modal */}
      <About isOpen={showAbout} onClose={() => setShowAbout(false)} />
    </div>
  );
}
