import { clamp } from '../utils/scoring.js';
import {
  parseSentiment,
  parseInsiderActivity,
  parseCongressional,
  parseUpgradeDowngrade,
} from './finnhub.js';
import { getTickerSentiment } from './reddit.js';
import { differenceInDays } from 'date-fns';

/**
 * Score Info-Edge pillar (0–25).
 *
 * @param {object} finnhubData   - { sentiment, insiders, recommendations, upgrades, congressional }
 * @param {string} ticker        - Ticker symbol (for Reddit lookup)
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
  const bullishPct = parseSentiment(finnhubData?.sentiment);
  // Combine Finnhub (weighted 70%) with Reddit (30%)
  const redditData = getTickerSentiment(ticker);
  const redditBullish = (redditData.sentimentScore + 1) / 2; // normalize -1..1 → 0..1
  const redditWeight = redditData.mentions > 0 ? 0.3 : 0;
  const finnhubWeight = 1 - redditWeight;
  const combinedBullish = bullishPct * finnhubWeight + redditBullish * redditWeight;

  newsScore = clamp(Math.round(combinedBullish * 8), 8);
  if (combinedBullish >= 0.65) {
    reasons.push(
      `Bullish news sentiment at ${Math.round(combinedBullish * 100)}%` +
        (redditData.mentions > 5 ? ` with ${redditData.mentions} Reddit mentions` : '')
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
      bullishPct: combinedBullish,
      redditMentions: redditData.mentions,
      analystUpgrades: ratingChange.upgrades,
      analystDowngrades: ratingChange.downgrades,
      congressionalBuys: congressional.congressionalBuys,
    },
    reasons,
  };
}
