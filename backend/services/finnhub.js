import { finnhubClient } from '../utils/httpClient.js';

const API_KEY = process.env.FINNHUB_API_KEY;

// Bottleneck-style rate limiting: max 55 req/min (free tier is 60)
const MIN_INTERVAL = 1100; // ms between requests
let lastRequestTime = 0;

async function rateLimit() {
  const now = Date.now();
  const wait = MIN_INTERVAL - (now - lastRequestTime);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestTime = Date.now();
}

async function get(path, params = {}) {
  if (!API_KEY) return null;
  await rateLimit();
  try {
    const resp = await finnhubClient.get(path, {
      params: { ...params, token: API_KEY },
    });
    return resp.data;
  } catch (err) {
    console.warn(`[finnhub] ${path} failed: ${err.message}`);
    return null;
  }
}

/**
 * Fetch all Finnhub data for one ticker in parallel (4 endpoints).
 * Rate limiting is applied per-request via rateLimit().
 */
export async function getStockData(ticker) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const [sentiment, insiders, recommendations, upgrades, congressional] =
    await Promise.all([
      get('/news-sentiment', { symbol: ticker }),
      get('/stock/insider-transactions', { symbol: ticker, from: thirtyDaysAgo }),
      get('/stock/recommendation', { symbol: ticker }),
      get('/stock/upgrade-downgrade', { symbol: ticker, from: thirtyDaysAgo }),
      get('/stock/congressional-trading', { symbol: ticker, from: thirtyDaysAgo }),
    ]);

  return {
    sentiment,
    insiders,
    recommendations,
    upgrades,
    congressional,
  };
}

/**
 * Parse Finnhub sentiment into a normalized bullish percentage (0–1).
 */
export function parseSentiment(sentimentData) {
  if (!sentimentData?.sentiment) return 0.5;
  return sentimentData.sentiment.bullishPercent ?? 0.5;
}

/**
 * Parse insider transactions into net activity score.
 * Positive = net buying, negative = net selling.
 */
export function parseInsiderActivity(insiderData) {
  const txns = insiderData?.data ?? [];
  let netBuy = 0;
  let netSell = 0;
  for (const t of txns) {
    const change = parseInt(t.change ?? 0);
    if (change > 0) netBuy += change;
    else netSell += Math.abs(change);
  }
  return { netBuy, netSell, netActivity: netBuy - netSell };
}

/**
 * Parse congressional trading data from Finnhub.
 */
export function parseCongressional(congressionalData) {
  const trades = congressionalData?.data ?? [];
  const recent = trades.slice(0, 20); // last 20 trades
  const buys = recent.filter((t) => t.transactionType?.toLowerCase() === 'purchase');
  const sells = recent.filter((t) => t.transactionType?.toLowerCase() === 'sale_full' || t.transactionType?.toLowerCase() === 'sale_partial');
  const parties = new Set(buys.map((t) => t.party).filter(Boolean));
  const bipartisan = parties.has('Democrat') && parties.has('Republican');
  return { congressionalBuys: buys.length, congressionalSells: sells.length, bipartisan };
}

/**
 * Parse upgrade/downgrade history: returns net (upgrades - downgrades) over 30 days.
 */
export function parseUpgradeDowngrade(upgradeData) {
  const items = upgradeData ?? [];
  let upgrades = 0;
  let downgrades = 0;
  for (const item of items) {
    const action = item.action?.toLowerCase();
    if (action === 'upgrade') upgrades++;
    else if (action === 'downgrade') downgrades++;
  }
  return { upgrades, downgrades, net: upgrades - downgrades };
}

/**
 * Parse analyst recommendations into buy percentage.
 */
export function parseRecommendations(recData) {
  const items = recData ?? [];
  if (!items.length) return { buyPct: 0.5, total: 0 };
  const latest = items[0];
  const total =
    (latest.strongBuy ?? 0) +
    (latest.buy ?? 0) +
    (latest.hold ?? 0) +
    (latest.sell ?? 0) +
    (latest.strongSell ?? 0);
  if (total === 0) return { buyPct: 0.5, total: 0 };
  const buyPct = ((latest.strongBuy ?? 0) + (latest.buy ?? 0)) / total;
  return { buyPct, total };
}
