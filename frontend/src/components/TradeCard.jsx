import React from 'react';
import ScoreRing from './ScoreRing.jsx';
import PillarBar from './PillarBar.jsx';
import WhyChosen from './WhyChosen.jsx';

function fmt(price) {
  return price != null
    ? price.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
    : '—';
}

function EarningsBadge({ date }) {
  if (!date) return null;
  const daysAway = Math.round((new Date(date) - new Date()) / 86400000);
  const color =
    daysAway > 30 ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : daysAway > 14 ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-red-50 text-red-700 border-red-200';
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${color}`}>
      Earnings {daysAway > 0 ? `in ${daysAway}d` : 'soon'}
    </span>
  );
}

function SectorBadge({ sector }) {
  return (
    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">
      {sector}
    </span>
  );
}

/**
 * Trade card for a single stock recommendation.
 */
export default function TradeCard({ card, index }) {
  const { ticker, name, sector, scores, whyChosen, pricing, meta } = card;

  return (
    <div
      className="trade-card bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-5"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Header row */}
      <div className="flex items-start gap-4">
        <ScoreRing score={scores.total} size={88} strokeWidth={8} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="mono text-2xl font-extrabold text-gray-900 tracking-tight">
              {ticker}
            </span>
            <SectorBadge sector={sector} />
            {meta?.nextEarningsDate && <EarningsBadge date={meta.nextEarningsDate} />}
          </div>
          <p className="text-sm text-gray-500 truncate" title={name}>{name}</p>
          <p className="mono text-lg font-bold text-gray-800 mt-2">
            {fmt(pricing.currentPrice)}
          </p>
        </div>
      </div>

      {/* Pillar bars */}
      <div className="space-y-3">
        <PillarBar pillar="vol" score={scores.vol} />
        <PillarBar pillar="quality" score={scores.quality} />
        <PillarBar pillar="regime" score={scores.regime} />
        <PillarBar pillar="info" score={scores.info} />
      </div>

      {/* Why chosen */}
      <WhyChosen reasons={whyChosen} />

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* Trade setup */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
          Trade Setup
        </p>
        <div className="grid grid-cols-3 gap-3">
          <PriceCell label="Entry" value={pricing.entryPrice} color="text-blue-600" />
          <PriceCell label="Target" value={pricing.targetPrice} color="text-emerald-600" />
          <PriceCell label="Stop" value={pricing.stopLoss} color="text-red-500" />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span>Risk / Reward</span>
          <span className={`mono font-bold ${pricing.riskReward >= 2 ? 'text-emerald-600' : pricing.riskReward >= 1 ? 'text-amber-600' : 'text-red-500'}`}>
            {pricing.riskReward?.toFixed(1)}x
          </span>
        </div>
      </div>

      {/* Key metrics footer */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        {meta?.ivRank != null && (
          <MetricPill label="IV Rank" value={`${Math.round(meta.ivRank)}%`} />
        )}
        {meta?.vixLevel != null && (
          <MetricPill label="VIX" value={meta.vixLevel.toFixed(1)} />
        )}
        {meta?.buyPct != null && (
          <MetricPill label="Analyst Buys" value={`${Math.round(meta.buyPct * 100)}%`} />
        )}
        {meta?.analystTarget != null && (
          <MetricPill label="Analyst Target" value={fmt(meta.analystTarget)} />
        )}
      </div>
    </div>
  );
}

function PriceCell({ label, value, color }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 text-center">
      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`mono text-sm font-bold ${color}`}>{fmt(value)}</p>
    </div>
  );
}

function MetricPill({ label, value }) {
  return (
    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-2.5 py-1.5">
      <span className="text-gray-500">{label}</span>
      <span className="mono font-semibold text-gray-800">{value}</span>
    </div>
  );
}
