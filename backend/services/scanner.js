import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();
import pLimit from 'p-limit';
import { getSP500List } from './sp500.js';
import { getMacroData } from './fred.js';
import { getMarketMetrics, getOptionChainIVs } from './tastytrade.js';
import { getStockData } from './finnhub.js';
import { scoreVolEdge } from './volEdge.js';
import { scoreQualityGate } from './qualityGate.js';
import { scoreRegime } from './regime.js';
import { scoreInfoEdge } from './infoEdge.js';
import * as cache from './cache.js';
import { saveScan } from './database.js';

// Minimum pillar scores to be promoted
// Lower threshold when API keys are missing to allow basic functionality
const MIN_PILLAR_SCORE = 5; // Reduced from 10 to work with limited API access

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
 * Calculate trading metrics for day traders and momentum traders.
 */
function calculateTradingMetrics(history, closes, spyCloses, currentPrice) {
  if (!closes || closes.length < 20) return {};

  // Average Daily Volume (last 20 days)
  const recentHistory = history.slice(-20);
  const avgVolume = recentHistory.reduce((sum, h) => sum + (h.volume || 0), 0) / recentHistory.length;

  // ATR (Average True Range) - simplified using last 14 days
  const atrPeriod = Math.min(14, closes.length - 1);
  let atrSum = 0;
  for (let i = closes.length - atrPeriod; i < closes.length; i++) {
    const high = history[i]?.high || closes[i];
    const low = history[i]?.low || closes[i];
    const prevClose = closes[i - 1] || closes[i];
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    atrSum += tr;
  }
  const atr = atrSum / atrPeriod;

  // Beta vs SPY (simplified correlation over last 60 days)
  const period = Math.min(60, closes.length - 1, spyCloses.length - 1);
  if (period > 10) {
    const stockReturns = [];
    const spyReturns = [];
    for (let i = closes.length - period; i < closes.length; i++) {
      const stockReturn = (closes[i] - closes[i - 1]) / closes[i - 1];
      const spyReturn = (spyCloses[i] - spyCloses[i - 1]) / spyCloses[i - 1];
      if (isFinite(stockReturn) && isFinite(spyReturn)) {
        stockReturns.push(stockReturn);
        spyReturns.push(spyReturn);
      }
    }

    if (stockReturns.length > 10) {
      const covariance = stockReturns.reduce((sum, val, i) => {
        const stockMean = stockReturns.reduce((a, b) => a + b) / stockReturns.length;
        const spyMean = spyReturns.reduce((a, b) => a + b) / spyReturns.length;
        return sum + (val - stockMean) * (spyReturns[i] - spyMean);
      }, 0) / stockReturns.length;

      const spyVariance = spyReturns.reduce((sum, val) => {
        const mean = spyReturns.reduce((a, b) => a + b) / spyReturns.length;
        return sum + Math.pow(val - mean, 2);
      }, 0) / spyReturns.length;

      var beta = spyVariance > 0 ? covariance / spyVariance : 1.0;
    }
  }

  // Momentum: 5-day and 20-day % change
  const momentum5d = closes.length >= 6
    ? ((closes[closes.length - 1] - closes[closes.length - 6]) / closes[closes.length - 6]) * 100
    : null;

  const momentum20d = closes.length >= 21
    ? ((closes[closes.length - 1] - closes[closes.length - 21]) / closes[closes.length - 21]) * 100
    : null;

  // Distance from 50-day MA
  let distFrom50MA = null;
  if (closes.length >= 50) {
    const ma50 = closes.slice(-50).reduce((sum, c) => sum + c, 0) / 50;
    distFrom50MA = ((currentPrice - ma50) / ma50) * 100;
  }

  return {
    avgVolume: Math.round(avgVolume),
    atr: parseFloat(atr.toFixed(2)),
    beta: beta ? parseFloat(beta.toFixed(2)) : null,
    momentum5d: momentum5d !== null ? parseFloat(momentum5d.toFixed(1)) : null,
    momentum20d: momentum20d !== null ? parseFloat(momentum20d.toFixed(1)) : null,
    distFrom50MA: distFrom50MA !== null ? parseFloat(distFrom50MA.toFixed(1)) : null,
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
        .historical('SPY', { period1: daysAgo(65), period2: new Date(), interval: '1d' })
        .catch(() => []),
    ]);
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
                .historical(stock.ticker, { period1: oneYearAgo, period2: new Date(), interval: '1d' })
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

            // Calculate trading metrics for day/momentum traders
            const tradingMetrics = calculateTradingMetrics(history, closes, spyCloses, currentPrice);

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
                ...tradingMetrics, // Add trading metrics for cards
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

    // Filter valid stocks
    const validStocks = scoredStocks.filter((s) => s !== null);

    // More flexible filtering: accept stocks that meet criteria on at least 3 pillars
    // OR have a strong total score (>= 30 out of 100)
    let promoted = validStocks.filter((s) => {
      const pillarsAboveMin = [
        s.scores.vol >= MIN_PILLAR_SCORE,
        s.scores.quality >= MIN_PILLAR_SCORE,
        s.scores.regime >= MIN_PILLAR_SCORE,
        s.scores.info >= MIN_PILLAR_SCORE,
      ].filter(Boolean).length;

      // Accept if: 3+ pillars meet minimum OR total score >= 30
      return pillarsAboveMin >= 3 || s.scores.total >= 30;
    });

    // If no stocks meet criteria (e.g., missing API keys), take top 10 by total score
    if (promoted.length === 0 && validStocks.length > 0) {
      console.log('[scanner] No stocks met minimum criteria - selecting top 10 by total score');
      promoted = validStocks.slice(0, 10);
    }

    promoted = promoted.sort((a, b) => b.scores.total - a.scores.total).slice(0, 10);

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
        pillarReasons, // Include full pillar reasons for detail view
        whyChosen: allReasons.slice(0, 5),
        pricing: buildPricing(currentPrice, meta.analystTarget),
        meta,
        scanTimestamp: Date.now(),
      };
    });

    // Save to cache (for quick access to latest)
    cache.setResults(tradeCards);

    // Save to database (for historical access)
    const scanTimestamp = Date.now();
    const scanDate = new Date(scanTimestamp).toISOString().split('T')[0]; // YYYY-MM-DD
    saveScan(scanDate, scanTimestamp, tradeCards);

    cache.setScanState({
      status: 'complete',
      progress: 100,
      phase: 'Scan complete',
      completedAt: scanTimestamp,
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
  return d;
}
