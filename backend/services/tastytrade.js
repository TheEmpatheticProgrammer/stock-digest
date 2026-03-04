import { tastyClient } from '../utils/httpClient.js';

const CLIENT_ID = process.env.TASTYTRADE_CLIENT_ID;
const CLIENT_SECRET = process.env.TASTYTRADE_CLIENT_SECRET;
let refreshToken = process.env.TASTYTRADE_REFRESH_TOKEN;

let accessToken = null;
let tokenExpiry = 0;

/**
 * Refresh the Tastytrade OAuth2 access token using the refresh_token grant.
 */
async function refreshAccessToken() {
  if (!CLIENT_ID || !CLIENT_SECRET || !refreshToken) {
    throw new Error('Tastytrade credentials not configured');
  }
  const resp = await tastyClient.post('/oauth/token', {
    grant_type: 'refresh_token',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: refreshToken,
  });
  accessToken = resp.data.access_token;
  // expires_in is in seconds (typically 900 = 15 min)
  tokenExpiry = Date.now() + (resp.data.expires_in - 60) * 1000;
  if (resp.data.refresh_token) refreshToken = resp.data.refresh_token;
  console.log('[tastytrade] Token refreshed, expires in', resp.data.expires_in, 's');
}

async function ensureToken() {
  if (!accessToken || Date.now() >= tokenExpiry) {
    await refreshAccessToken();
  }
}

/**
 * Fetch market metrics (IV rank, IV percentile, etc.) for a batch of symbols.
 * @param {string[]} symbols - Yahoo Finance format tickers (BRK-B → BRK%2FB for API)
 * @returns {Object} Map of ticker → metrics
 */
export async function getMarketMetrics(symbols) {
  try {
    await ensureToken();
    // Tastytrade uses '/' for share class separators in option routes but plain for equities
    const symbolStr = symbols.join(',');
    const resp = await tastyClient.get('/market-metrics', {
      params: { symbols: symbolStr },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const items = resp.data?.data?.items || [];
    const map = {};
    for (const item of items) {
      const sym = item.symbol?.replace('/', '-'); // normalize back to Yahoo format
      if (!sym) continue;
      map[sym] = {
        ivRank: parseFloat(item['implied-volatility-rank'] ?? 0),      // 0–1
        ivPercentile: parseFloat(item['implied-volatility-percentile'] ?? 0), // 0–1
        currentIV: parseFloat(item['implied-volatility-index'] ?? 0),   // annualized decimal
        liquidityRating: item['liquidity-rating'] ?? 'Unknown',
      };
    }
    return map;
  } catch (err) {
    console.warn(`[tastytrade] Market metrics failed: ${err.message}`);
    return {};
  }
}

/**
 * Get option chain for a single symbol to extract term structure.
 * Returns near-term and mid-term implied vols for slope calculation.
 */
export async function getOptionChainIVs(symbol) {
  try {
    await ensureToken();
    const tastySymbol = symbol.replace('-', '/');
    const resp = await tastyClient.get(`/option-chains/${tastySymbol}/nested`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const expirations = resp.data?.data?.items?.[0]?.expirations || [];
    const today = new Date();

    // Sort by expiration date ascending
    const sorted = expirations
      .map((exp) => {
        const date = new Date(exp['expiration-date']);
        const dte = Math.round((date - today) / 86400000);
        const iv = parseFloat(exp['implied-volatility'] ?? 0);
        return { dte, iv };
      })
      .filter((e) => e.dte > 0 && e.iv > 0)
      .sort((a, b) => a.dte - b.dte);

    const near = sorted.find((e) => e.dte >= 7 && e.dte <= 35);
    const mid = sorted.find((e) => e.dte >= 45 && e.dte <= 90);

    return {
      nearIV: near?.iv ?? null,
      midIV: mid?.iv ?? null,
      slope: near && mid ? mid.iv - near.iv : null, // positive = contango
    };
  } catch (err) {
    console.warn(`[tastytrade] Option chain failed for ${symbol}: ${err.message}`);
    return { nearIV: null, midIV: null, slope: null };
  }
}
