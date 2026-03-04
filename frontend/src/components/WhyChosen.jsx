import React from 'react';

export default function WhyChosen({ reasons }) {
  if (!reasons?.length) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        Why Chosen
      </p>
      <ul className="space-y-1">
        {reasons.map((reason, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
            <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
            <span>{reason}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
