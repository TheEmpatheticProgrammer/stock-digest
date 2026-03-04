import React from 'react';

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-22 h-22 rounded-full shimmer flex-shrink-0" style={{ width: 88, height: 88 }} />
        <div className="flex-1 space-y-2 mt-2">
          <div className="h-6 w-24 shimmer rounded-lg" />
          <div className="h-3 w-40 shimmer rounded" />
          <div className="h-5 w-16 shimmer rounded mt-3" />
        </div>
      </div>
      {/* Bars */}
      <div className="space-y-3">
        {[85, 72, 60, 78].map((w, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between">
              <div className="h-3 w-20 shimmer rounded" />
              <div className="h-3 w-12 shimmer rounded" />
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full shimmer rounded-full" style={{ width: `${w}%` }} />
            </div>
          </div>
        ))}
      </div>
      {/* Reasons */}
      <div className="space-y-2">
        {[95, 80, 70].map((w, i) => (
          <div key={i} className="h-3 shimmer rounded" style={{ width: `${w}%` }} />
        ))}
      </div>
      {/* Price grid */}
      <div className="border-t border-gray-100 pt-4">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
              <div className="h-2 w-10 shimmer rounded mx-auto" />
              <div className="h-4 w-16 shimmer rounded mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LoadingSkeleton({ count = 10 }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
