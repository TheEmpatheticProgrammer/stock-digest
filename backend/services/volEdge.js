import { clamp, computeHV } from '../utils/scoring.js';

/**
 * Score Vol-Edge pillar (0–25).
 *
 * @param {object} tastyMetrics - { ivRank, ivPercentile, currentIV } from tastytrade
 * @param {object} termStructure - { nearIV, midIV, slope } from tastytrade option chain
 * @param {number[]} closePrices - Array of close prices (oldest → newest), ≥ 252 entries ideal
 * @returns {{ total, sub, reasons }}
 */
export function scoreVolEdge(tastyMetrics, termStructure, closePrices) {
  const reasons = [];
  let ivRankScore = 0;
  let ivHvScore = 0;
  let termScore = 0;
  let hvTrendScore = 0;

  // ── 1. IV Rank (0–8) ──────────────────────────────────────────────────────
  const ivRank = tastyMetrics?.ivRank ?? 0; // 0–1 scale from Tastytrade
  ivRankScore = clamp(Math.round(ivRank * 8), 8);
  if (ivRank >= 0.7) {
    reasons.push(`IV Rank in top ${Math.round((1 - ivRank) * 100)}th percentile — premium-rich options`);
  } else if (ivRank >= 0.5) {
    reasons.push(`IV Rank at ${Math.round(ivRank * 100)}th percentile — elevated options premium`);
  }

  // ── 2. IV / HV Spread (0–7) ───────────────────────────────────────────────
  const currentIV = tastyMetrics?.currentIV ?? 0;
  const hv30 = computeHV(closePrices, 30);
  let ivHvRatio = hv30 > 0 ? currentIV / hv30 : 1;

  if (ivHvRatio >= 1.5) {
    ivHvScore = 7;
    reasons.push(`IV running ${Math.round((ivHvRatio - 1) * 100)}% above historical vol — options are expensive`);
  } else if (ivHvRatio >= 1.2) {
    ivHvScore = 5;
  } else if (ivHvRatio >= 1.0) {
    ivHvScore = 3;
  } else if (ivHvRatio >= 0.8) {
    ivHvScore = 1;
  } else {
    ivHvScore = 0; // HV >> IV, options are cheap
  }

  // ── 3. Term Structure Slope (0–5) ─────────────────────────────────────────
  const slope = termStructure?.slope ?? null;
  if (slope !== null) {
    if (slope > 0.03) {
      termScore = 5;
      reasons.push('Term structure in contango — front-month IV below back-month');
    } else if (slope > 0) {
      termScore = 3;
    } else if (slope > -0.03) {
      termScore = 2;
    } else {
      termScore = 0; // backwardation
    }
  } else {
    termScore = 2; // neutral fallback when data unavailable
  }

  // ── 4. HV Trend Direction (0–5) ───────────────────────────────────────────
  const hv10 = computeHV(closePrices, 10);
  if (hv10 > 0 && hv30 > 0) {
    const ratio = hv10 / hv30;
    if (ratio < 0.85) {
      hvTrendScore = 5;
      reasons.push('Historical volatility contracting — mean reversion opportunity');
    } else if (ratio < 1.0) {
      hvTrendScore = 3;
    } else if (ratio < 1.15) {
      hvTrendScore = 2;
    } else {
      hvTrendScore = 0; // HV expanding
    }
  } else {
    hvTrendScore = 2;
  }

  const total = clamp(ivRankScore + ivHvScore + termScore + hvTrendScore, 25);

  return {
    total,
    sub: { ivRankScore, ivHvScore, termScore, hvTrendScore },
    meta: { ivRank: ivRank * 100, currentIV, hv30 },
    reasons,
  };
}
