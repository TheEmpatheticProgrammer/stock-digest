import yahooFinance from 'yahoo-finance2';
import pLimit from 'p-limit';
import { getSP500List } from './sp500.js';
import { getMacroData } from './fred.js';
import { getMarketMetrics, getOptionChainIVs } from './tastytrade.js';
import { getStockData } from './finnhub.js';
import { prewarmCorpus } from './reddit.js';
import { scoreVolEdge } from './volEdge.js';
import { scoreQualityGate } from './qualityGate.js';
import { scoreRegime } from './regime.js';
import { scoreInfoEdge } from './infoEdge.js';
import * as cache from './cache.js';

// Minimum pillar scores to be promoted (40% of 25 = 10)
const MIN_PILLAR_SCORE = 10;

/**
 * Split an array into chunks of a given size.
 */
function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

/**
 * Extract closing prices from yahoo-finance2 historical data.
 */
function toCloses(historical) {
  return historical.map((h) => h.close).filter(Boolean);
}

/**
 * Generate human-readable "why chosen" reasons from pillar results.
 */
function buildWhyChosen(volResult, qualResult, regimeResult, infoResult) {
  const all = [
    ...volResult.reasons,
    ...qualResult.reasons,
    ...regimeResult.reasons,
    ...infoResult.reasons,
  ];
  // Return up to 5 reasons, prefer most informative ones
  return all.slice(0, 5);
}

/**
 * Build trade card pricing suggestions.
 */
function buildPricing(currentPrice, analystTarget) {
  const entryPrice = currentPrice;
  const targetPrice = analystTarget
    ? Math.min(analystTarget, currentPrice * 1.15)
    : currentPrice * 1.08;
  const stopLoss = parseFloat((currentPrice * 0.94).toFixed(2));
  const target = parseFloat(targetPrice.toFixed(2));
  const riskReward = parseFloat(
    ((target - entryPrice) / Math.max(entryPrice - stopLoss, 0.01)).toFixed(2)
  );
  return {
    currentPrice: parseFloat(currentPrice.toFixed(2)),
    entryPrice: parseFloat(entryPrice.toFixed(2)),
    targetPrice: target,
    stopLoss,
    riskReward,
  };
}

/**
 * Main scan function. Orchestrates all services and returns top 10 trade cards.
 */
export async function runScan() {
  cache.setScanState({ status: 'running', progress: 0, startedAt: Date.now(), error: null });

  try {
    // ── Phase 1: S&P 500 List ────────────────────────────────────────────────
    cache.setScanState({ progress: 2, phase: 'Loading S&P 500 list...' });
    const sp500 = await getSP500List();
    console.log(`[scanner] Loaded ${sp500.length} tickers`);

    // ── Phase 2: Shared Macro Data + Reddit corpus ───────────────────────────
    cache.setScanState({ progress: 5, phase: 'Fetching macro + Reddit data...' });
    const [macroData, vixQuote, spyHistory] = await Promise.all([
      getMacroData(),
      yahooFinance.quote('^VIX').catch(() => ({ regularMarketPrice: 18 })),
      yahooFinance
        .historical('SPY', { period1: daysAgo(65), interval: '1d' })
        .catch(() => []),
    ]);
    await prewarmCorpus();
    const vixLevel = vixQuote?.regularMarketPrice ?? 18;
    const spyCloses = toCloses(spyHistory);
    console.log(`[scanner] Macro loaded. VIX=${vixLevel}`);

    // ── Phase 3: Tastytrade IV Rank (batch 50, p-limit 10) ───────────────────
    cache.setScanState({ progress: 10, phase: 'Fetching IV rank data from Tastytrade...' });
    const tickers = sp500.map((s) => s.ticker);
    const tickerBatches = chunk(tickers, 50);
    const tastyLimit = pLimit(8);
    const tastyResults = await Promise.all(
      tickerBatches.map((batch) => tastyLimit(() => getMarketMetrics(batch)))
    );
    const tastyMap = Object.assign({}, ...tastyResults);
    console.log(`[scanner] Tastytrade metrics: ${Object.keys(tastyMap).length} tickers`);

    // ── Phase 4: Per-Ticker Scoring ───────────────────────────────────────────
    cache.setScanState({ progress: 15, phase: `Scoring ${sp500.length} stocks...` });
    const scoringLimit = pLimit(10);
    let completed = 0;

    const scoredStocks = await Promise.all(
      sp500.map((stock) =>
        scoringLimit(async () => {
          try {
            const oneYearAgo = daysAgo(365);
            const sixtyDaysAgo = daysAgo(65);

            const [summary, history, finnhubData, termStructure] = await Promise.all([
              yahooFinance
                .quoteSummary(stock.ticker, {
                  modules: [
                    'financialData',
                    'defaultKeyStatistics',
                    'earningsHistory',
                    'recommendationTrend',
                    'earningsTrend',
                    'calendarEvents',
                  ],
                })
                .catch(() => ({})),
              yahooFinance
                .historical(stock.ticker, { period1: oneYearAgo, interval: '1d' })
                .catch(() => []),
              getStockData(stock.ticker),
              getOptionChainIVs(stock.ticker),
            ]);

            const closes = toCloses(history);
            const recentCloses = closes.slice(-65);
            const currentPrice =
              summary?.financialData?.currentPrice ??
              history[history.length - 1]?.close ??
              0;

            if (!currentPrice || currentPrice <= 0) return null;

            // Score all 4 pillars
            const volResult = scoreVolEdge(tastyMap[stock.ticker], termStructure, closes);
            const qualResult = scoreQualityGate(summary);
            const regimeResult = scoreRegime(recentCloses, spyCloses, macroData, vixLevel);
            const infoResult = scoreInfoEdge(finnhubData, stock.ticker, summary);

            const total = volResult.total + qualResult.total + regimeResult.total + infoResult.total;

            completed++;
            if (completed % 50 === 0) {
              cache.setScanState({
                progress: 15 + Math.round((completed / sp500.length) * 65),
                phase: `Scoring stocks (${completed}/${sp500.length})...`,
              });
            }

            return {
              stock,
              scores: {
                total,
                vol: volResult.total,
                quality: qualResult.total,
                regime: regimeResult.total,
                info: infoResult.total,
              },
              subScores: {
                vol: volResult.sub,
                quality: qualResult.sub,
                regime: regimeResult.sub,
                info: infoResult.sub,
              },
              pillarReasons: { vol: volResult.reasons, quality: qualResult.reasons, regime: regimeResult.reasons, info: infoResult.reasons },
              meta: {
                ...volResult.meta,
                ...qualResult.meta,
                ...regimeResult.meta,
                ...infoResult.meta,
                vixLevel,
              },
              currentPrice,
            };
          } catch (err) {
            console.warn(`[scanner] Failed ${stock.ticker}: ${err.message}`);
            return null;
          }
        })
      )
    );

    // ── Phase 5: Filter + Rank ────────────────────────────────────────────────
    cache.setScanState({ progress: 82, phase: 'Filtering and ranking top stocks...' });
    const promoted = scoredStocks
      .filter(
        (s) =>
          s !== null &&
          s.scores.vol >= MIN_PILLAR_SCORE &&
          s.scores.quality >= MIN_PILLAR_SCORE &&
          s.scores.regime >= MIN_PILLAR_SCORE &&
          s.scores.info >= MIN_PILLAR_SCORE
      )
      .sort((a, b) => b.scores.total - a.scores.total)
      .slice(0, 10);

    console.log(`[scanner] Promoted ${promoted.length} stocks to trade cards`);

    // ── Phase 6: Build Trade Cards ────────────────────────────────────────────
    cache.setScanState({ progress: 92, phase: 'Generating trade cards...' });
    const tradeCards = promoted.map((result) => {
      const { stock, scores, subScores, pillarReasons, meta, currentPrice } = result;
      const allReasons = [
        ...pillarReasons.vol,
        ...pillarReasons.quality,
        ...pillarReasons.regime,
        ...pillarReasons.info,
      ];
      return {
        ticker: stock.ticker,
        name: stock.name,
        sector: stock.sector,
        scores,
        subScores,
        whyChosen: allReasons.slice(0, 5),
        pricing: buildPricing(currentPrice, meta.analystTarget),
        meta,
        scanTimestamp: Date.now(),
      };
    });

    cache.setResults(tradeCards);
    cache.setScanState({
      status: 'complete',
      progress: 100,
      phase: 'Scan complete',
      completedAt: Date.now(),
    });

    console.log(`[scanner] Scan complete. ${tradeCards.length} trade cards generated.`);
    return tradeCards;
  } catch (err) {
    console.error('[scanner] Scan error:', err);
    cache.setScanState({ status: 'error', error: err.message });
    throw err;
  }
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}
