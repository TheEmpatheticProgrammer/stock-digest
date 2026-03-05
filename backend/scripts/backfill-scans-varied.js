/**
 * Backfill script with VARIED data for each day
 * Creates different stock selections and scores for each historical date
 */

import { saveScan, getStats } from '../services/database.js';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to shuffle array
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Helper to vary scores slightly
function varyScores(card, variance = 5) {
  const varyScore = (score, max = 25) => {
    const newScore = score + (Math.random() * variance * 2 - variance);
    return Math.max(0, Math.min(max, Math.round(newScore)));
  };

  return {
    ...card,
    scores: {
      vol: varyScore(card.scores.vol),
      quality: varyScore(card.scores.quality),
      regime: varyScore(card.scores.regime),
      info: varyScore(card.scores.info),
      total: 0, // Will recalculate
    },
  };
}

async function backfillVariedScans() {
  console.log('[backfill-varied] Starting database backfill with varied data...\n');

  // First, clear existing scans
  const dbPath = path.join(__dirname, '../.cache/scans.db');
  const db = new Database(dbPath);
  db.exec('DELETE FROM scans');
  console.log('[backfill-varied] Cleared existing scans\n');

  // Get the base scan data from cache
  const cachePath = path.join(__dirname, '../.cache/scan-results.json');
  let baseCards;
  try {
    const fs = await import('fs');
    const cacheData = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    baseCards = cacheData.results || cacheData.cards;
  } catch (err) {
    console.error('[backfill-varied] Failed to read cache:', err.message);
    process.exit(1);
  }

  if (!baseCards || baseCards.length === 0) {
    console.error('[backfill-varied] No cards found in cache');
    process.exit(1);
  }

  console.log(`[backfill-varied] Using ${baseCards.length} cards as base\n`);

  // Generate dates for the past 7 days (weekdays only)
  const dates = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const dateStr = date.toISOString().split('T')[0];
      dates.push({
        date: dateStr,
        timestamp: date.getTime() + (8.5 * 60 * 60 * 1000),
      });
    }
  }

  console.log(`[backfill-varied] Generating ${dates.length} varied scans:\n`);

  // Create varied data for each date
  dates.forEach(({ date, timestamp }, index) => {
    // Shuffle the cards
    let shuffledCards = shuffle(baseCards);

    // Vary the scores slightly for each day
    shuffledCards = shuffledCards.map(card => {
      const varied = varyScores(card, 3 + index); // More variance for older dates
      // Recalculate total
      varied.scores.total = varied.scores.vol + varied.scores.quality + varied.scores.regime + varied.scores.info;
      return varied;
    });

    // Re-sort by new total scores
    shuffledCards.sort((a, b) => b.scores.total - a.scores.total);

    // Take top 10 with updated scores
    const topCards = shuffledCards.slice(0, 10).map(card => ({
      ...card,
      scanTimestamp: timestamp,
    }));

    saveScan(date, timestamp, topCards);

    const dayName = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });

    // Show which stocks made it this day
    const tickers = topCards.map(c => c.ticker).join(', ');
    console.log(`  ✓ ${date} (${dayName})`);
    console.log(`    Top stocks: ${tickers.substring(0, 60)}${tickers.length > 60 ? '...' : ''}`);
    console.log(`    Score range: ${topCards[0].scores.total} - ${topCards[topCards.length - 1].scores.total}\n`);
  });

  console.log('[backfill-varied] Backfill complete!\n');

  // Show stats
  const stats = getStats();
  console.log(`[backfill-varied] Database now contains ${stats.totalScans} varied scan(s)\n`);

  console.log('✅ Each day now has different stocks and scores!\n');
  db.close();
  process.exit(0);
}

backfillVariedScans().catch(err => {
  console.error('[backfill-varied] Error:', err);
  process.exit(1);
});
