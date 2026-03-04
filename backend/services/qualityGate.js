import { clamp } from '../utils/scoring.js';

/**
 * Score Quality Gate pillar (0–25) using Yahoo Finance quoteSummary data.
 *
 * @param {object} summary - quoteSummary result with modules:
 *   financialData, defaultKeyStatistics, earningsHistory, recommendationTrend, earningsTrend
 * @returns {{ total, sub, reasons }}
 */
export function scoreQualityGate(summary) {
  const reasons = [];
  let profScore = 0;
  let earningScore = 0;
  let analystScore = 0;
  let healthScore = 0;

  const fin = summary?.financialData ?? {};
  const stats = summary?.defaultKeyStatistics ?? {};
  const earningsHist = summary?.earningsHistory?.history ?? [];
  const recTrend = summary?.recommendationTrend?.trend ?? [];

  // ── 1. Profitability & Margins (0–7) ──────────────────────────────────────
  const opMargin = fin.operatingMargins ?? 0;
  const roe = fin.returnOnEquity ?? 0;

  let marginPts = 0;
  if (opMargin >= 0.30) { marginPts = 4; reasons.push(`Exceptional operating margin of ${(opMargin * 100).toFixed(1)}%`); }
  else if (opMargin >= 0.20) { marginPts = 3; }
  else if (opMargin >= 0.10) { marginPts = 2; }
  else if (opMargin >= 0.05) { marginPts = 1; }

  let roePts = 0;
  if (roe >= 0.30) { roePts = 3; reasons.push(`Strong return on equity of ${(roe * 100).toFixed(1)}%`); }
  else if (roe >= 0.20) { roePts = 2; }
  else if (roe >= 0.10) { roePts = 1; }

  profScore = clamp(marginPts + roePts, 7);

  // ── 2. Earnings Surprise History (0–6) ────────────────────────────────────
  const surprises = earningsHist
    .slice(0, 4)
    .map((e) => e.surprisePercent ?? 0)
    .filter((v) => v !== null);

  if (surprises.length >= 2) {
    const avgSurprise = surprises.reduce((a, b) => a + b, 0) / surprises.length;
    const allPositive = surprises.every((s) => s > 0);

    if (allPositive && avgSurprise >= 0.10) {
      earningScore = 6;
      reasons.push(`Beat earnings estimates all ${surprises.length} quarters (avg +${(avgSurprise * 100).toFixed(1)}%)`);
    } else if (allPositive) {
      earningScore = 4;
      reasons.push(`Consistent earnings beats over ${surprises.length} quarters`);
    } else if (avgSurprise > 0.05) {
      earningScore = 3;
    } else if (avgSurprise > 0) {
      earningScore = 2;
    } else {
      earningScore = 0;
    }
  }

  // ── 3. Analyst Consensus vs Price (0–6) ───────────────────────────────────
  const latest = recTrend[0];
  if (latest) {
    const totalAnalysts =
      (latest.strongBuy ?? 0) + (latest.buy ?? 0) + (latest.hold ?? 0) +
      (latest.sell ?? 0) + (latest.strongSell ?? 0);

    if (totalAnalysts > 0) {
      const buyPct = ((latest.strongBuy ?? 0) + (latest.buy ?? 0)) / totalAnalysts;
      const targetPrice = fin.targetMeanPrice ?? 0;
      const currentPrice = fin.currentPrice ?? 1;
      const upside = targetPrice > 0 ? (targetPrice - currentPrice) / currentPrice : 0;

      const consensusPts = buyPct >= 0.75 ? 3 : buyPct >= 0.55 ? 2 : buyPct >= 0.40 ? 1 : 0;
      const upsidePts = upside >= 0.20 ? 3 : upside >= 0.10 ? 2 : upside >= 0.05 ? 1 : 0;
      analystScore = clamp(consensusPts + upsidePts, 6);

      if (buyPct >= 0.70) {
        reasons.push(
          `Strong analyst consensus — ${Math.round(buyPct * 100)}% buy ratings with $${targetPrice?.toFixed(2)} target`
        );
      }
    }
  }

  // ── 4. Financial Health Ratios (0–6) ──────────────────────────────────────
  const debtToEquity = fin.debtToEquity ?? 100;
  const currentRatio = fin.currentRatio ?? 1;
  const freeCashflow = fin.freeCashflow ?? 0;

  // Debt/equity: lower is better (expressed as %, e.g. 50 = 50%)
  const deScore = debtToEquity < 30 ? 2 : debtToEquity < 80 ? 1 : 0;
  // Current ratio: higher is better
  const crScore = currentRatio >= 2.0 ? 2 : currentRatio >= 1.2 ? 1 : 0;
  // Free cash flow: positive = healthy
  const fcfScore = freeCashflow > 0 ? 2 : 0;

  healthScore = clamp(deScore + crScore + fcfScore, 6);

  const total = clamp(profScore + earningScore + analystScore + healthScore, 25);

  return {
    total,
    sub: { profScore, earningScore, analystScore, healthScore },
    meta: {
      operatingMargin: opMargin,
      roe,
      analystTarget: fin.targetMeanPrice ?? null,
      currentPrice: fin.currentPrice ?? null,
      buyPct: latest
        ? ((latest.strongBuy ?? 0) + (latest.buy ?? 0)) /
          Math.max(
            1,
            (latest.strongBuy ?? 0) + (latest.buy ?? 0) + (latest.hold ?? 0) +
              (latest.sell ?? 0) + (latest.strongSell ?? 0)
          )
        : 0.5,
    },
    reasons,
  };
}
