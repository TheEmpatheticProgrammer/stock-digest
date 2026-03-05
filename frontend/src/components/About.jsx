import React from 'react';

/**
 * About modal explaining data sources and methodology
 */
export default function About({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-slide-in-right">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 px-8 py-6 flex items-center justify-between border-b border-purple-200 z-10">
            <div>
              <h2 className="text-3xl font-black text-white flex items-center gap-2">
                📊 About Stock Digest
              </h2>
              <p className="text-white/90 text-sm mt-1 font-medium">
                Data sources, methodology, and scoring system
              </p>
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

          {/* Content */}
          <div className="p-8 space-y-8">
            {/* Overview */}
            <section>
              <h3 className="text-xl font-bold text-gray-900 mb-3">What is Stock Digest?</h3>
              <p className="text-gray-700 leading-relaxed">
                Stock Digest is an automated daily scanner that analyzes all S&P 500 stocks using a
                proprietary 4-pillar scoring system. It identifies the top 10 opportunities based on
                options premiums, fundamentals, market conditions, and catalysts—helping traders and
                investors focus on the most compelling setups each day.
              </p>
            </section>

            {/* Scoring System */}
            <section>
              <h3 className="text-xl font-bold text-gray-900 mb-4">4-Pillar Scoring System</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <ScorePillarCard
                  emoji="📊"
                  title="Options Edge (0-25 pts)"
                  description="Measures options pricing opportunities through IV Rank, IV Percentile, and term structure analysis. High scores indicate expensive options relative to historical levels—ideal for premium selling strategies."
                />
                <ScorePillarCard
                  emoji="💰"
                  title="Fundamentals (0-25 pts)"
                  description="Evaluates company quality through analyst ratings, price targets, earnings growth, profitability metrics (ROIC), and recent upgrades/downgrades from major investment banks."
                />
                <ScorePillarCard
                  emoji="⏰"
                  title="Market Timing (0-25 pts)"
                  description="Assesses market regime and conditions including VIX levels, SPY correlation, momentum trends, and overall market environment to time entries effectively."
                />
                <ScorePillarCard
                  emoji="⚡"
                  title="Catalysts (0-25 pts)"
                  description="Analyzes news sentiment from financial media, insider trading activity, congressional purchases, analyst upgrades, and earnings calendar proximity to identify near-term drivers."
                />
              </div>
              <div className="mt-4 p-4 bg-purple-50 rounded-xl border border-purple-200">
                <p className="text-sm text-gray-700">
                  <strong className="text-purple-900">Composite Score:</strong> Sum of all 4 pillars (0-100).
                  Stocks must score ≥5 on at least 3 pillars or achieve a composite score ≥30 to be promoted.
                  Results are ranked by total score and limited to the top 10 opportunities.
                </p>
              </div>
            </section>

            {/* Data Sources */}
            <section>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Data Sources</h3>
              <div className="space-y-3">
                <DataSourceCard
                  name="Yahoo Finance"
                  icon="📈"
                  description="Stock prices, historical data, analyst ratings, earnings calendars, and fundamental metrics"
                  status="Active"
                  statusColor="emerald"
                />
                <DataSourceCard
                  name="Finnhub"
                  icon="📰"
                  description="Financial news sentiment, insider transactions, congressional trading, analyst upgrades/downgrades"
                  status="Active"
                  statusColor="emerald"
                />
                <DataSourceCard
                  name="FRED (Federal Reserve)"
                  icon="🏛️"
                  description="Economic indicators, yield curves, credit spreads, and macro data for market regime analysis"
                  status="Active"
                  statusColor="emerald"
                />
                <DataSourceCard
                  name="Tastytrade"
                  icon="📉"
                  description="Options market data including IV Rank, IV Percentile, and implied volatility term structure"
                  status="Optional"
                  statusColor="amber"
                />
              </div>
            </section>

            {/* Methodology */}
            <section>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Scan Schedule</h3>
              <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">🕐</span>
                  <div>
                    <p className="font-bold text-blue-900 mb-2">Daily at 8:30 AM ET, Monday–Friday</p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      Scans run automatically before market open to identify opportunities based on overnight
                      news, pre-market data, and updated market conditions. Results are cached for 24 hours
                      to minimize API usage and ensure consistent data throughout the trading day.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Disclaimer */}
            <section>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Important Disclaimer</h3>
              <div className="bg-red-50 rounded-xl p-5 border border-red-200">
                <p className="text-sm text-gray-700 leading-relaxed">
                  <strong className="text-red-900">⚠️ Not Financial Advice:</strong> Stock Digest is an educational
                  tool for informational purposes only. All data, scores, and recommendations are generated algorithmically
                  and should not be construed as financial advice. Trading stocks and options involves substantial risk
                  of loss. Always conduct your own research and consult with a licensed financial advisor before making
                  investment decisions. Past performance does not guarantee future results.
                </p>
              </div>
            </section>

            {/* Technical Stack */}
            <section>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Technology Stack</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <TechBadge name="React" />
                <TechBadge name="Node.js" />
                <TechBadge name="Express" />
                <TechBadge name="Tailwind CSS" />
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

function ScorePillarCard({ emoji, title, description }) {
  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-200">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{emoji}</span>
        <h4 className="font-bold text-gray-900 text-sm">{title}</h4>
      </div>
      <p className="text-xs text-gray-700 leading-relaxed">{description}</p>
    </div>
  );
}

function DataSourceCard({ name, icon, description, status, statusColor }) {
  const statusColors = {
    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    amber: 'bg-amber-100 text-amber-700 border-amber-300',
  };

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <span className="text-2xl">{icon}</span>
          <div className="flex-1">
            <h4 className="font-bold text-gray-900 mb-1">{name}</h4>
            <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
          </div>
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-full border ${statusColors[statusColor]}`}>
          {status}
        </span>
      </div>
    </div>
  );
}

function TechBadge({ name }) {
  return (
    <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg px-3 py-2 text-center border border-purple-200">
      <span className="text-sm font-bold text-purple-900">{name}</span>
    </div>
  );
}
