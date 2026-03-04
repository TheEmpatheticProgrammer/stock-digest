/**
 * In-memory cache for scan state and results.
 * Single-process; no Redis needed.
 */

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
}

export function hasResults() {
  return results !== null;
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
