import React from 'react';

/**
 * Carousel navigation for browsing historical scan dates
 */
export default function DateCarousel({
  currentDate,
  hasNext,
  hasPrevious,
  onNext,
  onPrevious,
  isViewingLatest,
}) {
  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return 'Latest';
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    if (dateOnly.getTime() === today.getTime()) {
      return 'Today';
    } else if (dateOnly.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    }

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="flex items-center justify-center gap-4 py-4">
      {/* Previous Day Button */}
      <button
        onClick={onPrevious}
        disabled={!hasPrevious}
        className={`
          flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all duration-200
          ${
            hasPrevious
              ? 'bg-white/10 text-white border-2 border-white/30 hover:bg-white/20 hover:border-white/50 hover:scale-105 active:scale-95 backdrop-blur-sm'
              : 'bg-white/5 text-white/30 border-2 border-white/10 cursor-not-allowed'
          }
        `}
        aria-label="Previous day"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="hidden sm:inline">Previous</span>
      </button>

      {/* Current Date Display */}
      <div className="flex flex-col items-center min-w-[180px]">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black text-white tracking-tight">
            {formatDisplayDate(currentDate)}
          </span>
          {!isViewingLatest && (
            <span className="text-xs bg-amber-500/80 text-white px-2 py-0.5 rounded-full font-bold border border-amber-300">
              Historical
            </span>
          )}
        </div>
        {currentDate && (
          <span className="text-xs text-white/70 font-medium mt-1">
            {new Date(currentDate + 'T00:00:00').toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        )}
      </div>

      {/* Next Day Button */}
      <button
        onClick={onNext}
        disabled={!hasNext}
        className={`
          flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all duration-200
          ${
            hasNext
              ? 'bg-white/10 text-white border-2 border-white/30 hover:bg-white/20 hover:border-white/50 hover:scale-105 active:scale-95 backdrop-blur-sm'
              : 'bg-white/5 text-white/30 border-2 border-white/10 cursor-not-allowed'
          }
        `}
        aria-label="Next day"
      >
        <span className="hidden sm:inline">Next</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
