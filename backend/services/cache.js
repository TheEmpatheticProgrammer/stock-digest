/**
 * In-memory cache for scan state and results with file persistence.
 * Single-process; no Redis needed.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = path.join(__dirname, '../.cache/scan-results.json');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

let scanState = {
  status: 'idle', // 'idle' | 'running' | 'complete' | 'error'
  progress: 0,
  phase: '',
  startedAt: null,
  completedAt: null,
  error: null,
};

let results = null;
let resultsTimestamp = null;

// Load cached results from disk on startup
function loadCacheFromDisk() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      if (cached.resultsTimestamp && Date.now() - cached.resultsTimestamp < CACHE_TTL_MS) {
        results = cached.results;
        resultsTimestamp = cached.resultsTimestamp;
        console.log('[cache] Loaded valid results from disk cache');
        return true;
      } else {
        console.log('[cache] Disk cache expired');
      }
    }
  } catch (err) {
    console.warn('[cache] Failed to load cache from disk:', err.message);
  }
  return false;
}

// Save results to disk
function saveCacheToDisk() {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(
      CACHE_FILE,
      JSON.stringify({ results, resultsTimestamp }, null, 2),
      'utf8'
    );
    console.log('[cache] Saved results to disk cache');
  } catch (err) {
    console.warn('[cache] Failed to save cache to disk:', err.message);
  }
}

// Initialize cache on module load
loadCacheFromDisk();

export function getScanState() {
  return { ...scanState };
}

export function setScanState(partial) {
  scanState = { ...scanState, ...partial };
}

export function getResults() {
  return {
    cards: results,
    scanTimestamp: resultsTimestamp,
    nextScanAt: getNextScanAt(),
  };
}

export function setResults(cards) {
  results = cards;
  resultsTimestamp = Date.now();
  saveCacheToDisk();
}

export function hasResults() {
  return results !== null;
}

export function hasFreshResults() {
  if (!results || !resultsTimestamp) return false;
  const age = Date.now() - resultsTimestamp;
  return age < CACHE_TTL_MS;
}

export function getCacheAge() {
  if (!resultsTimestamp) return null;
  return Date.now() - resultsTimestamp;
}

export function isRunning() {
  return scanState.status === 'running';
}

export function resetScanState() {
  scanState = {
    status: 'idle',
    progress: 0,
    phase: '',
    startedAt: null,
    completedAt: null,
    error: null,
  };
}

function getNextScanAt() {
  // Next 8:30 AM ET weekday
  const now = new Date();
  const etOffset = -5 * 60; // EST (UTC-5); adjust for EDT during summer
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const etNow = new Date(utcMs + etOffset * 60000);

  const next = new Date(etNow);
  next.setHours(8, 30, 0, 0);
  if (next <= etNow) next.setDate(next.getDate() + 1);
  // Skip weekends
  while (next.getDay() === 0 || next.getDay() === 6) next.setDate(next.getDate() + 1);

  return new Date(next.getTime() - etOffset * 60000).toISOString();
}
