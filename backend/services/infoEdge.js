import { clamp } from '../utils/scoring.js';
import {
  parseSentiment,
  parseInsiderActivity,
  parseCongressional,
  parseUpgradeDowngrade,
} from './finnhub.js';
import { differenceInDays } from 'date-fns';

/**
 * Score Catalysts pillar (0–25).
 *
 * Analyzes news sentiment, insider activity, analyst ratings, and earnings proximity
 * using Finnhub financial news data.
 *
 * @param {object} finnhubData   - { sentiment, insiders, recommendations, upgrades, congressional }
 * @param {string} ticker        - Ticker symbol
 * @param {object} yahooSummary  - quoteSummary result (for calendarEvents)
 * @returns {{ total, sub, reasons }}
 */
export function scoreInfoEdge(finnhubData, ticker, yahooSummary) {
  const reasons = [];
  let newsScore = 0;
  let insiderScore = 0;
  let ratingScore = 0;
  let earningsProxScore = 0;

  // ── 1. News Sentiment (0–8) ───────────────────────────────────────────────
  // Use Finnhub news sentiment exclusively (from major financial news sources)
  const bullishPct = parseSentiment(finnhubData?.sentiment);

  newsScore = clamp(Math.round(bullishPct * 8), 8);
  if (bullishPct >= 0.65) {
    reasons.push(
      `Strong bullish news sentiment at ${Math.round(bullishPct * 100)}% from financial media`
    );
  } else if (bullishPct >= 0.55) {
    reasons.push(
      `Positive news sentiment at ${Math.round(bullishPct * 100)}%`
    );
  }

  // ── 2. Insider Activity (0–7) ──────────────────────────────────────────────
  const insiderActivity = parseInsiderActivity(finnhubData?.insiders);
  const congressional = parseCongressional(finnhubData?.congressional);

  // Executive/director insider (Finnhub Form 4)
  let execScore = 0;
  if (insiderActivity.netActivity > 0) {
    execScore = insiderActivity.netBuy > 10000 ? 3 : 2;
    reasons.push('Recent executive/director insider buying (SEC Form 4)');
  } else if (insiderActivity.netActivity < -50000) {
    execScore = 0;
  } else {
    execScore = 1;
  }

  // Congressional (Capitol Trades / Finnhub Congressional)
  let congressScore = 0;
  if (congressional.congressionalBuys >= 3) {
    congressScore = 4;
    reasons.push(
      `${congressional.congressionalBuys} congressional purchases in past 30 days` +
        (congressional.bipartisan ? ' (bipartisan interest)' : '')
    );
  } else if (congressional.congressionalBuys >= 1) {
    congressScore = 2;
    reasons.push(`${congressional.congressionalBuys} congressional purchase(s) in past 30 days`);
  }

  insiderScore = clamp(execScore + congressScore, 7);

  // ── 3. Analyst Rating Changes (0–5) ───────────────────────────────────────
  const ratingChange = parseUpgradeDowngrade(finnhubData?.upgrades);
  const net = ratingChange.net;
  if (net >= 3) {
    ratingScore = 5;
    reasons.push(`${ratingChange.upgrades} analyst upgrades in past 30 days`);
  } else if (net >= 1) {
    ratingScore = 4;
  } else if (net === 0) {
    ratingScore = 2;
  } else if (net === -1) {
    ratingScore = 1;
  } else {
    ratingScore = 0;
  }

  // ── 4. Earnings Proximity (0–5) ───────────────────────────────────────────
  let nextEarningsDate = null;
  try {
    const calendar = yahooSummary?.calendarEvents;
    const earningsDateRaw = calendar?.earnings?.earningsDate?.[0];
    if (earningsDateRaw) {
      nextEarningsDate = new Date(earningsDateRaw);
      const daysAway = differenceInDays(nextEarningsDate, new Date());
      if (daysAway > 30) {
        earningsProxScore = 5;
        reasons.push(`Earnings ${daysAway} days away — safe theta decay window`);
      } else if (daysAway > 14) {
        earningsProxScore = 3;
      } else if (daysAway > 7) {
        earningsProxScore = 1;
      } else {
        earningsProxScore = 0; // too close to earnings = binary event risk
      }
    } else {
      earningsProxScore = 3; // unknown = neutral
    }
  } catch {
    earningsProxScore = 3;
  }

  const total = clamp(newsScore + insiderScore + ratingScore + earningsProxScore, 25);

  return {
    total,
    sub: { newsScore, insiderScore, ratingScore, earningsProxScore },
    meta: {
      nextEarningsDate: nextEarningsDate?.toISOString() ?? null,
      bullishPct: bullishPct,
      analystUpgrades: ratingChange.upgrades,
      analystDowngrades: ratingChange.downgrades,
      congressionalBuys: congressional.congressionalBuys,
    },
    reasons,
  };
}
