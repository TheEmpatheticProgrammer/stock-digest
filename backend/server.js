import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { runScan } from './services/scanner.js';
import * as cache from './services/cache.js';

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

  // Run an initial scan on startup (useful for dev and first-run)
  if (process.env.NODE_ENV !== 'test') {
    setTimeout(() => {
      console.log('[server] Running initial scan on startup...');
      runScan().catch((err) => console.error('[server] Initial scan failed:', err));
    }, 2000);
  }
});
