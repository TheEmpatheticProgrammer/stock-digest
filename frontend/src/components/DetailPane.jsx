import React from 'react';
import PillarBar from './PillarBar.jsx';

function fmt(price) {
  return price != null
    ? price.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
    : '—';
}

function formatDate(dateString) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

/**
 * Detailed side pane that shows when a card is clicked.
 * Supports both inline (split view) and overlay (mobile) modes.
 */
export default function DetailPane({ card, onClose, isInline = false }) {
  if (!card) return null;

  const { ticker, name, sector, scores, subScores, pricing, meta, pillarReasons } = card;

  // Inline mode: static panel in the layout
  if (isInline) {
    return (
      <div className="bg-white rounded-3xl shadow-2xl border-2 border-purple-100 overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 border-b border-purple-200 px-6 py-5 flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="mono text-3xl font-black text-white">{ticker}</span>
              <span className="text-xs bg-white/20 backdrop-blur-sm text-white font-bold px-3 py-1 rounded-full border border-white/30">
                {sector}
              </span>
            </div>
            <p className="text-sm text-white/90 mt-1 font-medium">{name}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-10 h-10 rounded-full hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - scrollable */}
        <div className="p-6 space-y-8 max-h-[calc(100vh-200px)] overflow-y-auto">
          <DetailContent
            scores={scores}
            subScores={subScores}
            pricing={pricing}
            pillarReasons={pillarReasons}
            meta={meta}
          />
        </div>
      </div>
    );
  }

  // Overlay mode: full-screen modal for mobile
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Side Pane */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white shadow-2xl z-50 overflow-y-auto animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="mono text-3xl font-extrabold text-gray-900">{ticker}</span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-medium">
                {sector}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">{name}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          <DetailContent
            scores={scores}
            subScores={subScores}
            pricing={pricing}
            pillarReasons={pillarReasons}
            meta={meta}
          />
        </div>
      </div>
    </>
  );
}

// Extract content into reusable component
function DetailContent({ scores, subScores, pricing, pillarReasons, meta }) {
  // Generate comprehensive synthesis for traders
  const generateSynthesis = () => {
    const synthesis = {
      headline: '',
      setup: '',
      momentum: '',
      catalysts: [],
      risks: [],
      dayTraderNotes: '',
      momentumTraderNotes: '',
    };

    // Analyze momentum
    const has5dMomentum = meta?.momentum5d != null;
    const has20dMomentum = meta?.momentum20d != null;
    const strongMomentum5d = has5dMomentum && Math.abs(meta.momentum5d) > 3;
    const strongMomentum20d = has20dMomentum && Math.abs(meta.momentum20d) > 8;
    const isTrending = (has5dMomentum && meta.momentum5d > 0) && (has20dMomentum && meta.momentum20d > 0);
    const isReversal = (has5dMomentum && meta.momentum5d < 0) && (has20dMomentum && meta.momentum20d > 0);

    // Analyze volatility
    const highIV = meta?.ivRank != null && meta.ivRank > 50;
    const lowIV = meta?.ivRank != null && meta.ivRank < 30;
    const highBeta = meta?.beta != null && meta.beta > 1.2;
    const lowBeta = meta?.beta != null && meta.beta < 0.8;

    // Analyze volume
    const hasVolume = meta?.avgVolume != null && meta.avgVolume > 1000000;

    // Analyze technical position
    const above50MA = meta?.distFrom50MA != null && meta.distFrom50MA > 2;
    const below50MA = meta?.distFrom50MA != null && meta.distFrom50MA < -2;
    const near50MA = meta?.distFrom50MA != null && Math.abs(meta.distFrom50MA) < 2;

    // Generate headline
    const scoreQuality = scores.total >= 75 ? 'High-Conviction' : scores.total >= 60 ? 'Strong' : 'Moderate';
    if (isTrending && above50MA) {
      synthesis.headline = `${scoreQuality} Uptrend Setup with Positive Momentum`;
    } else if (strongMomentum5d && near50MA) {
      synthesis.headline = `${scoreQuality} Breakout Candidate Near Key Support`;
    } else if (highIV && scores.vol >= 18) {
      synthesis.headline = `${scoreQuality} Premium Selling Opportunity`;
    } else {
      synthesis.headline = `${scoreQuality} Multi-Factor Opportunity`;
    }

    // Setup description
    if (above50MA) {
      synthesis.setup = `Trading above its 50-day moving average${meta.distFrom50MA ? ` (+${meta.distFrom50MA.toFixed(1)}%)` : ''}, indicating technical strength.`;
    } else if (below50MA) {
      synthesis.setup = `Currently below its 50-day moving average${meta.distFrom50MA ? ` (${meta.distFrom50MA.toFixed(1)}%)` : ''}, presenting a potential contrarian or reversal setup.`;
    } else {
      synthesis.setup = `Testing the 50-day moving average, a key technical level that often acts as support/resistance.`;
    }

    // Momentum assessment
    if (isTrending) {
      synthesis.momentum = `Strong upward momentum across timeframes: ${has5dMomentum ? `+${meta.momentum5d.toFixed(1)}% (5D)` : ''} and ${has20dMomentum ? `+${meta.momentum20d.toFixed(1)}% (20D)` : ''}. This confirms trend strength and momentum alignment.`;
    } else if (isReversal) {
      synthesis.momentum = `Recent pullback (${has5dMomentum ? `${meta.momentum5d.toFixed(1)}% (5D)` : ''}) within larger uptrend (${has20dMomentum ? `+${meta.momentum20d.toFixed(1)}% (20D)` : ''}). Could be a healthy retracement before continuation.`;
    } else if (has5dMomentum && has20dMomentum) {
      synthesis.momentum = `Mixed momentum signals: ${meta.momentum5d.toFixed(1)}% (5D), ${meta.momentum20d.toFixed(1)}% (20D). Watch for directional clarity.`;
    } else {
      synthesis.momentum = 'Momentum data limited - focus on other technical and fundamental factors.';
    }

    // Extract catalysts from pillar reasons
    if (pillarReasons?.info && pillarReasons.info.length > 0) {
      synthesis.catalysts = pillarReasons.info.slice(0, 3);
    }
    if (synthesis.catalysts.length === 0 && pillarReasons?.quality) {
      synthesis.catalysts = pillarReasons.quality.slice(0, 2);
    }

    // Risk factors
    if (highIV) {
      synthesis.risks.push('Elevated implied volatility may lead to wider bid-ask spreads and increased slippage.');
    }
    if (!hasVolume) {
      synthesis.risks.push('Lower average volume may impact liquidity and execution quality.');
    }
    if (pricing.riskReward < 1.5) {
      synthesis.risks.push(`Risk/reward ratio of ${pricing.riskReward.toFixed(1)}x is below ideal - tight stop loss required.`);
    }
    if (meta?.nextEarningsDate) {
      const daysToEarnings = Math.round((new Date(meta.nextEarningsDate) - new Date()) / 86400000);
      if (daysToEarnings >= 0 && daysToEarnings < 14) {
        synthesis.risks.push(`Earnings in ${daysToEarnings} days - expect increased volatility and potential gap risk.`);
      }
    }

    // Day trader specific notes
    if (highBeta && hasVolume) {
      synthesis.dayTraderNotes = `High beta (${meta.beta?.toFixed(2)}) with strong volume (${formatVolume(meta.avgVolume)} avg) provides intraday movement potential. ATR of $${meta.atr?.toFixed(2)} suggests ${meta.atr && meta.atr > pricing.currentPrice * 0.02 ? 'above-average' : 'moderate'} daily range. Best suited for scalping or momentum trades with tight stops.`;
    } else if (hasVolume) {
      synthesis.dayTraderNotes = `Adequate liquidity (${formatVolume(meta.avgVolume)} avg volume) for day trading. Monitor pre-market price action and opening range breakouts. Use ATR ($${meta.atr?.toFixed(2)}) for position sizing.`;
    } else {
      synthesis.dayTraderNotes = 'Limited volume may restrict day trading opportunities. Focus on major price levels and avoid trading during low-volume periods.';
    }

    // Momentum trader specific notes
    if (isTrending && above50MA) {
      synthesis.momentumTraderNotes = `Classic momentum setup with aligned timeframes and technical position above 50-MA. Consider adding on pullbacks to the 50-MA or on breakouts above recent highs. Trailing stops recommended to capture extended moves.`;
    } else if (strongMomentum20d && near50MA) {
      synthesis.momentumTraderNotes = `Strong 20-day momentum (+${meta.momentum20d?.toFixed(1)}%) meeting key support. This technical test could provide an excellent risk/reward entry for swing trades targeting recent highs. Watch for bounce confirmation.`;
    } else if (below50MA && has20dMomentum && meta.momentum20d > 5) {
      synthesis.momentumTraderNotes = `Trading below 50-MA despite positive 20-day momentum may indicate consolidation before the next leg. Wait for reclaim of 50-MA with volume for safer entry, or use smaller position size with wider stops.`;
    } else {
      synthesis.momentumTraderNotes = `Mixed technical signals suggest selective entry. Focus on catalyst-driven moves and use fundamental strength as conviction for holding through volatility.`;
    }

    return synthesis;
  };

  const synthesis = generateSynthesis();

  // Helper to format volume
  function formatVolume(vol) {
    if (!vol) return '—';
    if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`;
    if (vol >= 1e6) return `${(vol / 1e6).toFixed(1)}M`;
    if (vol >= 1e3) return `${(vol / 1e3).toFixed(0)}K`;
    return vol.toString();
  }

  return (
    <>
      {/* Overall Score & Trade Setup */}
      <section>
        <h3 className="text-sm font-bold text-gray-900 mb-4">Overview</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl p-5 shadow-lg border-2 border-purple-300">
            <p className="text-xs font-bold text-white/80 mb-1">Composite Score</p>
            <p className="text-5xl font-black text-white">{scores.total}</p>
            <p className="text-xs text-white/90 mt-1 font-semibold">out of 100</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 shadow-lg border-2 border-emerald-300">
            <p className="text-xs font-bold text-white/80 mb-1">Risk / Reward</p>
            <p className="text-5xl font-black text-white">{pricing.riskReward?.toFixed(1)}x</p>
            <p className="text-xs text-white/90 mt-1 font-semibold">
              {pricing.riskReward >= 2 ? '🚀 Excellent' : pricing.riskReward >= 1.5 ? '✅ Good' : '👍 Fair'}
            </p>
          </div>
        </div>

        {/* Price Levels */}
        <div className="mt-4 grid grid-cols-4 gap-3">
          <PriceBox label="Current" value={pricing.currentPrice} />
          <PriceBox label="Entry" value={pricing.entryPrice} color="text-blue-600" />
          <PriceBox label="Target" value={pricing.targetPrice} color="text-emerald-600" />
          <PriceBox label="Stop" value={pricing.stopLoss} color="text-red-600" />
        </div>
      </section>

      {/* Trading Synthesis - AI-Generated Analysis */}
      <section>
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 rounded-3xl p-6 shadow-2xl border-2 border-purple-300 text-white">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🎯</span>
            <div>
              <h3 className="text-lg font-black">Trading Synthesis</h3>
              <p className="text-xs text-white/80 font-medium">AI-powered analysis for traders</p>
            </div>
          </div>

          {/* Headline */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4 border border-white/20">
            <h4 className="text-xl font-black mb-2">{synthesis.headline}</h4>
            <p className="text-sm leading-relaxed text-white/90">
              {synthesis.setup} {synthesis.momentum}
            </p>
          </div>

          {/* Key Catalysts */}
          {synthesis.catalysts.length > 0 && (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4 border border-white/20">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">⚡</span>
                <h4 className="text-sm font-bold uppercase tracking-wide">Key Catalysts</h4>
              </div>
              <div className="space-y-2">
                {synthesis.catalysts.map((catalyst, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-emerald-300 mt-0.5 flex-shrink-0">✓</span>
                    <span className="text-white/90">{catalyst}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk Factors */}
          {synthesis.risks.length > 0 && (
            <div className="bg-red-500/20 backdrop-blur-sm rounded-xl p-4 mb-4 border border-red-400/30">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">⚠️</span>
                <h4 className="text-sm font-bold uppercase tracking-wide">Risk Factors</h4>
              </div>
              <div className="space-y-2">
                {synthesis.risks.map((risk, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-red-300 mt-0.5 flex-shrink-0">!</span>
                    <span className="text-white/90">{risk}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trader-Specific Notes */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Day Trader */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">📊</span>
                <h4 className="text-xs font-bold uppercase tracking-wide">Day Trader Notes</h4>
              </div>
              <p className="text-xs leading-relaxed text-white/90">
                {synthesis.dayTraderNotes}
              </p>
            </div>

            {/* Momentum Trader */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🚀</span>
                <h4 className="text-xs font-bold uppercase tracking-wide">Momentum Trader Notes</h4>
              </div>
              <p className="text-xs leading-relaxed text-white/90">
                {synthesis.momentumTraderNotes}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why This Stock (Enhanced) */}
      <section>
        <h3 className="text-sm font-bold text-gray-900 mb-4">Why This Stock Was Selected</h3>

        <div className="space-y-4">
          {/* Options Edge */}
          {pillarReasons?.vol && pillarReasons.vol.length > 0 && (
            <PillarReasons
              emoji="📊"
              title="OPTIONS EDGE"
              reasons={pillarReasons.vol}
              color="blue"
            />
          )}

          {/* Fundamentals */}
          {pillarReasons?.quality && pillarReasons.quality.length > 0 && (
            <PillarReasons
              emoji="💰"
              title="FUNDAMENTALS"
              reasons={pillarReasons.quality}
              color="emerald"
            />
          )}

          {/* Market Timing */}
          {pillarReasons?.regime && pillarReasons.regime.length > 0 && (
            <PillarReasons
              emoji="⏰"
              title="MARKET TIMING"
              reasons={pillarReasons.regime}
              color="purple"
            />
          )}

          {/* Catalysts */}
          {pillarReasons?.info && pillarReasons.info.length > 0 && (
            <PillarReasons
              emoji="⚡"
              title="CATALYSTS"
              reasons={pillarReasons.info}
              color="amber"
            />
          )}

          {/* Trade Rationale */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200">
            <div className="flex items-start gap-2">
              <span className="text-2xl">💡</span>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-indigo-900 mb-2">TRADE RATIONALE</h4>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {generateRationale()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pillar Scores Breakdown */}
      <section>
        <h3 className="text-sm font-bold text-gray-900 mb-4">Score Breakdown</h3>
        <div className="space-y-4">
          <PillarDetail
            name="Options Edge"
            score={scores.vol}
            subScores={subScores?.vol}
            reasons={pillarReasons?.vol || []}
          />
          <PillarDetail
            name="Fundamentals"
            score={scores.quality}
            subScores={subScores?.quality}
            reasons={pillarReasons?.quality || []}
          />
          <PillarDetail
            name="Market Timing"
            score={scores.regime}
            subScores={subScores?.regime}
            reasons={pillarReasons?.regime || []}
          />
          <PillarDetail
            name="Catalysts"
            score={scores.info}
            subScores={subScores?.info}
            reasons={pillarReasons?.info || []}
          />
        </div>
      </section>

      {/* Options Analysis */}
      {(meta?.ivRank != null || meta?.ivPercentile != null) && (
        <section>
          <h3 className="text-sm font-bold text-gray-900 mb-4">Options Analysis</h3>
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200 space-y-3">
            {meta.ivRank != null && (
              <MetricRow label="IV Rank" value={`${Math.round(meta.ivRank)}%`} />
            )}
            {meta.ivPercentile != null && (
              <MetricRow label="IV Percentile" value={`${Math.round(meta.ivPercentile)}%`} />
            )}
            {meta.currentIV != null && (
              <MetricRow label="Current IV" value={`${(meta.currentIV * 100).toFixed(1)}%`} />
            )}
            {meta.historicalVol != null && (
              <MetricRow label="Historical Vol (20d)" value={`${(meta.historicalVol * 100).toFixed(1)}%`} />
            )}
          </div>
        </section>
      )}

      {/* Fundamental Metrics */}
      <section>
        <h3 className="text-sm font-bold text-gray-900 mb-4">Fundamentals</h3>
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 space-y-3">
          {meta?.buyPct != null && (
            <MetricRow label="Analyst Buy Rating" value={`${Math.round(meta.buyPct * 100)}%`} />
          )}
          {meta?.analystTarget != null && (
            <MetricRow label="Analyst Target" value={fmt(meta.analystTarget)} />
          )}
          {meta?.analystUpgrades != null && meta.analystUpgrades > 0 && (
            <MetricRow label="Recent Upgrades" value={`${meta.analystUpgrades} in last 30d`} />
          )}
          {meta?.analystDowngrades != null && meta.analystDowngrades > 0 && (
            <MetricRow label="Recent Downgrades" value={`${meta.analystDowngrades} in last 30d`} />
          )}
          {meta?.epsGrowth != null && (
            <MetricRow label="EPS Growth" value={`${(meta.epsGrowth * 100).toFixed(1)}%`} />
          )}
          {meta?.roic != null && (
            <MetricRow label="ROIC" value={`${(meta.roic * 100).toFixed(1)}%`} />
          )}
        </div>
      </section>

      {/* Sentiment & Activity */}
      <section>
        <h3 className="text-sm font-bold text-gray-900 mb-4">Sentiment & Activity</h3>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 space-y-3">
          {meta?.bullishPct != null && (
            <MetricRow
              label="News Sentiment"
              value={`${Math.round(meta.bullishPct * 100)}% Bullish`}
              subValue="from financial media"
              indicator={meta.bullishPct >= 0.6 ? 'positive' : meta.bullishPct >= 0.4 ? 'neutral' : 'negative'}
            />
          )}
          {meta?.congressionalBuys != null && meta.congressionalBuys > 0 && (
            <MetricRow
              label="Congressional Activity"
              value={`${meta.congressionalBuys} purchase${meta.congressionalBuys > 1 ? 's' : ''} (30d)`}
              indicator="positive"
            />
          )}
        </div>
      </section>

      {/* Market Context */}
      <section>
        <h3 className="text-sm font-bold text-gray-900 mb-4">Market Context</h3>
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
          {meta?.vixLevel != null && (
            <MetricRow
              label="VIX Level"
              value={meta.vixLevel.toFixed(1)}
              indicator={meta.vixLevel < 15 ? 'positive' : meta.vixLevel < 25 ? 'neutral' : 'negative'}
            />
          )}
          {meta?.marketRegime && (
            <MetricRow label="Market Regime" value={meta.marketRegime} />
          )}
          {meta?.spyCorrelation != null && (
            <MetricRow label="SPY Correlation" value={meta.spyCorrelation.toFixed(2)} />
          )}
        </div>
      </section>

      {/* Earnings & Events */}
      {meta?.nextEarningsDate && (
        <section>
          <h3 className="text-sm font-bold text-gray-900 mb-4">Upcoming Events</h3>
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
            <MetricRow
              label="Next Earnings Date"
              value={formatDate(meta.nextEarningsDate)}
              subValue={(() => {
                const days = Math.round((new Date(meta.nextEarningsDate) - new Date()) / 86400000);
                return days > 0 ? `in ${days} days` : 'announced';
              })()}
            />
          </div>
        </section>
      )}
    </>
  );
}

// Component for pillar reasons with context
function PillarReasons({ emoji, title, reasons, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    emerald: 'bg-emerald-50 border-emerald-200',
    purple: 'bg-purple-50 border-purple-200',
    amber: 'bg-amber-50 border-amber-200',
  };

  return (
    <div className={`rounded-xl p-4 border ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{emoji}</span>
        <h4 className="text-xs font-bold text-gray-700 tracking-wider">{title}</h4>
      </div>
      <div className="space-y-2">
        {reasons.map((reason, i) => (
          <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
            <span className="leading-relaxed">{reason}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PriceBox({ label, value, color = 'text-gray-900' }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`mono text-sm font-bold ${color}`}>{fmt(value)}</p>
    </div>
  );
}

function PillarDetail({ name, score, subScores, reasons }) {
  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-gray-900">{name}</h4>
        <span className="text-lg font-black text-gray-900">{score}/25</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
          style={{ width: `${(score / 25) * 100}%` }}
        />
      </div>

      {/* Sub-scores */}
      {subScores && Object.keys(subScores).length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          {Object.entries(subScores).map(([key, val]) => (
            <div key={key} className="text-xs bg-gray-50 rounded px-2 py-1.5 flex justify-between">
              <span className="text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
              <span className="font-semibold text-gray-900">{val}</span>
            </div>
          ))}
        </div>
      )}

      {/* Reasons */}
      {reasons && reasons.length > 0 && (
        <div className="space-y-1.5">
          {reasons.map((reason, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
              <span className="text-emerald-500 mt-0.5">✓</span>
              <span>{reason}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MetricRow({ label, value, subValue, indicator }) {
  const indicatorColor =
    indicator === 'positive' ? 'bg-emerald-500' :
    indicator === 'negative' ? 'bg-red-500' :
    'bg-gray-400';

  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        {indicator && (
          <span className={`w-2 h-2 rounded-full ${indicatorColor}`} />
        )}
        <span className="text-gray-600">{label}</span>
      </div>
      <div className="text-right">
        <span className="font-semibold text-gray-900">{value}</span>
        {subValue && (
          <span className="text-xs text-gray-500 ml-2">({subValue})</span>
        )}
      </div>
    </div>
  );
}
