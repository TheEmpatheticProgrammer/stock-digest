import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { runScan } from './services/scanner.js';
import * as cache from './services/cache.js';
import { getAvailableDates, getScan, getLatestScan, getNextDate, getPreviousDate, getStats } from './services/database.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'] }));
app.use(express.json());

// ── Routes ───────────────────────────────────────────────────────────────────

// Return the latest scan results
app.get('/api/results', (req, res) => {
  if (!cache.hasResults()) {
    return res.status(204).end();
  }
  res.json(cache.getResults());
});

// Return current scan state (progress, phase, status)
app.get('/api/scan/status', (req, res) => {
  res.json(cache.getScanState());
});

// Manually trigger a new scan
app.post('/api/scan/trigger', (req, res) => {
  if (cache.isRunning()) {
    return res.status(409).json({ error: 'Scan already in progress' });
  }

  // Warn if results are fresh (less than 1 hour old)
  const cacheAge = cache.getCacheAge();
  if (cacheAge && cacheAge < 60 * 60 * 1000) {
    const minutesOld = Math.round(cacheAge / 60000);
    console.log(`[server] Warning: Manual scan triggered but results are only ${minutesOld} minutes old`);
  }

  // Fire and forget
  runScan().catch((err) => console.error('[server] Triggered scan failed:', err));
  res.json({ message: 'Scan started' });
});

// Health check
app.get('/api/health', (req, res) => {
  const state = cache.getScanState();
  res.json({
    status: 'ok',
    version: '1.0.0',
    scanStatus: state.status,
    lastScan: state.completedAt,
  });
});

// ── Historical Scans API ──────────────────────────────────────────────────────

// Get list of available scan dates (last 7 days)
app.get('/api/scans/dates', (req, res) => {
  const dates = getAvailableDates();
  res.json({ dates });
});

// Get scan data for a specific date (or latest if 'latest')
app.get('/api/scans/:date', (req, res) => {
  const { date } = req.params;

  let scan;
  if (date === 'latest') {
    scan = getLatestScan();
  } else {
    scan = getScan(date);
  }

  if (!scan) {
    return res.status(404).json({ error: 'Scan not found for this date' });
  }

  res.json(scan);
});

// Get next available date after the given date
app.get('/api/scans/:date/next', (req, res) => {
  const { date } = req.params;
  const nextDate = getNextDate(date);

  if (!nextDate) {
    return res.status(404).json({ error: 'No next date available' });
  }

  res.json({ nextDate });
});

// Get previous available date before the given date
app.get('/api/scans/:date/previous', (req, res) => {
  const { date } = req.params;
  const previousDate = getPreviousDate(date);

  if (!previousDate) {
    return res.status(404).json({ error: 'No previous date available' });
  }

  res.json({ previousDate });
});

// Get database stats
app.get('/api/scans/stats', (req, res) => {
  res.json(getStats());
});

// ── Scheduler ─────────────────────────────────────────────────────────────────
// Run every weekday at 8:30 AM Eastern Time
cron.schedule(
  '30 8 * * 1-5',
  () => {
    console.log('[cron] Triggering daily pre-market scan...');
    runScan().catch((err) => console.error('[cron] Scan failed:', err));
  },
  { timezone: 'America/New_York' }
);

// ── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Stock Digest API running on http://localhost:${PORT}`);
  console.log(`   Scheduled: 8:30 AM ET, Mon–Fri\n`);

  // Migrate existing cache to database if database is empty
  if (process.env.NODE_ENV !== 'test') {
    setTimeout(() => {
      const stats = getStats();
      console.log(`[database] ${stats.totalScans} scan(s) in database`);

      // If database is empty but cache has results, migrate them
      if (stats.totalScans === 0 && cache.hasFreshResults()) {
        const results = cache.getResults();
        const timestamp = results.scanTimestamp || Date.now();
        const scanDate = new Date(timestamp).toISOString().split('T')[0];
        console.log('[server] Migrating cached results to database...');
        import('./services/database.js').then(({ saveScan }) => {
          saveScan(scanDate, timestamp, results.cards);
        });
      }

      // Run an initial scan on startup only if no fresh results exist
      if (cache.hasFreshResults()) {
        const ageMinutes = Math.round(cache.getCacheAge() / 60000);
        console.log(`[server] Fresh results found (${ageMinutes} minutes old) - skipping startup scan`);
      } else {
        console.log('[server] Running initial scan on startup...');
        runScan().catch((err) => console.error('[server] Initial scan failed:', err));
      }
    }, 2000);
  }
});
