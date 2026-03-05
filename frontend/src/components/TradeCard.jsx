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
export default function TradeCard({ card, index, onClick, isSelected }) {
  const { ticker, name, sector, scores, whyChosen, pricing, meta } = card;

  return (
    <div
      className={`trade-card bg-white rounded-3xl p-6 flex flex-col gap-5 cursor-pointer transition-all duration-300
        ${isSelected
          ? 'shadow-2xl border-2 border-transparent bg-gradient-to-br from-purple-50 to-blue-50 ring-4 ring-purple-200 scale-[1.02]'
          : 'shadow-lg border-2 border-transparent hover:shadow-2xl hover:border-purple-300 hover:scale-[1.02] hover:bg-gradient-to-br hover:from-purple-50/30 hover:to-blue-50/30'
        }`}
      style={{ animationDelay: `${index * 80}ms` }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
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

      {/* Pillar bars - sorted by score (highest to lowest) */}
      <div className="space-y-3">
        {[
          { key: 'vol', score: scores.vol },
          { key: 'quality', score: scores.quality },
          { key: 'regime', score: scores.regime },
          { key: 'info', score: scores.info },
        ]
          .sort((a, b) => b.score - a.score)
          .map(({ key }) => (
            <PillarBar key={key} pillar={key} score={scores[key]} />
          ))}
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

      {/* Trading metrics - for day traders & momentum traders */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
          Trading Metrics
        </p>
        <div className="grid grid-cols-3 gap-2 text-[11px]">
          {/* Row 1: Volume & Volatility */}
          {meta?.avgVolume != null && (
            <MetricCell
              label="Avg Volume"
              value={formatVolume(meta.avgVolume)}
              icon="📊"
            />
          )}
          {meta?.atr != null && (
            <MetricCell
              label="ATR"
              value={`$${meta.atr.toFixed(2)}`}
              icon="📈"
            />
          )}
          {meta?.beta != null && (
            <MetricCell
              label="Beta"
              value={meta.beta.toFixed(2)}
              icon="🎯"
              color={meta.beta > 1.2 ? 'text-purple-600' : meta.beta < 0.8 ? 'text-blue-600' : 'text-gray-800'}
            />
          )}

          {/* Row 2: Momentum */}
          {meta?.momentum5d != null && (
            <MetricCell
              label="5D Momentum"
              value={`${meta.momentum5d > 0 ? '+' : ''}${meta.momentum5d.toFixed(1)}%`}
              icon="⚡"
              color={meta.momentum5d > 0 ? 'text-emerald-600' : 'text-red-500'}
            />
          )}
          {meta?.momentum20d != null && (
            <MetricCell
              label="20D Momentum"
              value={`${meta.momentum20d > 0 ? '+' : ''}${meta.momentum20d.toFixed(1)}%`}
              icon="🚀"
              color={meta.momentum20d > 0 ? 'text-emerald-600' : 'text-red-500'}
            />
          )}
          {meta?.distFrom50MA != null && (
            <MetricCell
              label="vs 50-MA"
              value={`${meta.distFrom50MA > 0 ? '+' : ''}${meta.distFrom50MA.toFixed(1)}%`}
              icon="📍"
              color={meta.distFrom50MA > 2 ? 'text-emerald-600' : meta.distFrom50MA < -2 ? 'text-red-500' : 'text-amber-600'}
            />
          )}
        </div>
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

function MetricCell({ label, value, icon, color = 'text-gray-800' }) {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-2.5 border border-gray-200">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-sm">{icon}</span>
        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide truncate">{label}</p>
      </div>
      <p className={`mono text-xs font-bold ${color} truncate`}>{value}</p>
    </div>
  );
}

function formatVolume(vol) {
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`;
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(1)}M`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(0)}K`;
  return vol.toString();
}
