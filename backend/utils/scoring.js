/** Clamp a value to [0, max] and round to integer. */
export const clamp = (val, max) => Math.max(0, Math.min(max, Math.round(val ?? 0)));

/** Map a value in [inMin, inMax] linearly to [0, outMax]. */
export function mapRange(val, inMin, inMax, outMax) {
  if (inMax === inMin) return 0;
  const pct = Math.max(0, Math.min(1, (val - inMin) / (inMax - inMin)));
  return Math.round(pct * outMax);
}

/** Pearson correlation coefficient between two same-length arrays. */
export function pearsonCorr(x, y) {
  const n = Math.min(x.length, y.length);
  if (n < 5) return 0;
  const xs = x.slice(0, n);
  const ys = y.slice(0, n);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    denX += (xs[i] - meanX) ** 2;
    denY += (ys[i] - meanY) ** 2;
  }
  const denom = Math.sqrt(denX * denY);
  return denom === 0 ? 0 : num / denom;
}

/**
 * Compute annualized historical volatility from an array of closing prices.
 * @param {number[]} closes - Array of close prices (oldest first)
 * @param {number} days - Number of trailing days to use
 */
export function computeHV(closes, days = 30) {
  if (closes.length < days + 1) return 0.25; // safe fallback
  const recent = closes.slice(-(days + 1));
  const returns = [];
  for (let i = 1; i < recent.length; i++) {
    if (recent[i - 1] > 0) returns.push(Math.log(recent[i] / recent[i - 1]));
  }
  if (returns.length < 2) return 0.25;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((a, b) => a + (b - mean) ** 2, 0) / (returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252);
}

/** Convert daily log-returns array to annualized HV. */
export function returnsToHV(returns, days) {
  const slice = returns.slice(-days);
  if (slice.length < 2) return 0.25;
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / (slice.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252);
}
