import { clamp, pearsonCorr } from '../utils/scoring.js';

/**
 * Score Regime pillar (0–25) using macro data + SPY correlation.
 *
 * @param {number[]} stockCloses - Stock close prices (last 60 days)
 * @param {number[]} spyCloses   - SPY close prices (last 60 days, same dates)
 * @param {object}  macro        - { dgs10, dtb3, hyIgSpread, yieldCurveSlope }
 * @param {number}  vixLevel     - Current VIX value
 * @returns {{ total, sub, reasons }}
 */
export function scoreRegime(stockCloses, spyCloses, macro, vixLevel) {
  const reasons = [];
  let vixScore = 0;
  let spreadScore = 0;
  let yieldScore = 0;
  let corrScore = 0;

  // ── 1. VIX Level (0–7) ────────────────────────────────────────────────────
  const vix = vixLevel ?? 20;
  if (vix >= 12 && vix <= 18) {
    vixScore = 7;
    reasons.push(`VIX at ${vix.toFixed(1)} — ideal range for risk-on positioning`);
  } else if (vix >= 10 && vix <= 22) {
    vixScore = 5;
  } else if (vix >= 8 && vix <= 28) {
    vixScore = 3;
  } else if (vix > 28 && vix <= 35) {
    vixScore = 1;
    reasons.push(`VIX elevated at ${vix.toFixed(1)} — macro headwind`);
  } else {
    vixScore = 0; // extreme fear or extreme complacency
  }

  // ── 2. Credit Spreads HY-IG (0–6) ────────────────────────────────────────
  const spread = macro?.hyIgSpread ?? 2.5;
  if (spread < 2.0) {
    spreadScore = 6;
    reasons.push(`Credit spreads tight (${spread.toFixed(2)}%) — risk-on environment`);
  } else if (spread < 3.0) {
    spreadScore = 4;
  } else if (spread < 4.0) {
    spreadScore = 2;
  } else {
    spreadScore = 0; // wide spreads = stress
  }

  // ── 3. Yield Curve Slope 10yr–3mo (0–6) ──────────────────────────────────
  const slope = macro?.yieldCurveSlope ?? 0.3;
  if (slope >= 1.5) {
    yieldScore = 6;
    reasons.push(`Yield curve slope +${slope.toFixed(2)}% — bullish macro regime`);
  } else if (slope >= 0.5) {
    yieldScore = 4;
  } else if (slope >= 0) {
    yieldScore = 2;
  } else if (slope >= -0.5) {
    yieldScore = 1; // mild inversion
  } else {
    yieldScore = 0; // deep inversion
  }

  // ── 4. SPY Correlation Modifier (0–6) ─────────────────────────────────────
  // Compute 30-day rolling log-return correlation
  const n = Math.min(stockCloses.length, spyCloses.length, 30);
  if (n >= 10) {
    const stockRet = [];
    const spyRet = [];
    for (let i = stockCloses.length - n; i < stockCloses.length; i++) {
      if (stockCloses[i - 1] > 0 && spyCloses[i - 1] > 0) {
        stockRet.push(Math.log(stockCloses[i] / stockCloses[i - 1]));
        spyRet.push(Math.log(spyCloses[i] / spyCloses[i - 1]));
      }
    }
    const corr = pearsonCorr(stockRet, spyRet);
    if (corr < 0.4) corrScore = 6;
    else if (corr < 0.6) corrScore = 4;
    else if (corr < 0.75) corrScore = 2;
    else corrScore = 1;
  } else {
    corrScore = 3; // neutral fallback
  }

  const total = clamp(vixScore + spreadScore + yieldScore + corrScore, 25);

  return {
    total,
    sub: { vixScore, spreadScore, yieldScore, corrScore },
    meta: { vixLevel: vix, yieldCurveSlope: slope, hyIgSpread: spread },
    reasons,
  };
}
