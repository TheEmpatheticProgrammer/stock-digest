/**
 * Backfill script to populate database with historical scans for testing/demo
 * This duplicates the current scan results for past dates to enable carousel navigation
 */

import { saveScan, getLatestScan, getStats } from '../services/database.js';

async function backfillScans() {
  console.log('[backfill] Starting database backfill...\n');

  // Get current scan to use as template
  const latestScan = getLatestScan();
  if (!latestScan) {
    console.error('[backfill] No scan data found. Please run a scan first.');
    process.exit(1);
  }

  console.log(`[backfill] Using scan template with ${latestScan.cards.length} cards\n`);

  // Generate dates for the past 7 days (including today)
  const dates = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Skip weekends (Saturday = 6, Sunday = 0)
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      dates.push({
        date: dateStr,
        timestamp: date.getTime() + (8.5 * 60 * 60 * 1000), // 8:30 AM that day
      });
    }
  }

  console.log(`[backfill] Generating ${dates.length} scan(s) for weekdays:\n`);

  // Save a scan for each date
  dates.forEach(({ date, timestamp }) => {
    // Use the same cards but update the scanTimestamp in each card
    const cards = latestScan.cards.map(card => ({
      ...card,
      scanTimestamp: timestamp,
    }));

    saveScan(date, timestamp, cards);

    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    console.log(`  ✓ ${date} (${dayName}) - ${cards.length} cards`);
  });

  console.log('\n[backfill] Backfill complete!\n');

  // Show stats
  const stats = getStats();
  console.log(`[backfill] Database now contains ${stats.totalScans} scan(s):`);
  stats.availableDates.forEach((date, i) => {
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const label = i === 0 ? '(Latest)' : '';
    console.log(`  - ${date} (${dayName}) ${label}`);
  });

  console.log('\n✅ Carousel is now ready with multiple dates!\n');
  process.exit(0);
}

backfillScans().catch(err => {
  console.error('[backfill] Error:', err);
  process.exit(1);
});
