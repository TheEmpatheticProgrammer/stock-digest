import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database file location
const DB_PATH = path.join(__dirname, '../.cache/scans.db');

// Ensure .cache directory exists
const CACHE_DIR = path.dirname(DB_PATH);
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Initialize database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL'); // Better performance

// Create schema
const initSchema = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scan_date TEXT NOT NULL UNIQUE,
      scan_timestamp INTEGER NOT NULL,
      cards_json TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_scan_date ON scans(scan_date DESC);
  `);
};

initSchema();

/**
 * Save a scan to the database
 * @param {string} scanDate - Date in YYYY-MM-DD format
 * @param {number} scanTimestamp - Unix timestamp in ms
 * @param {Array} cards - Array of trade cards
 */
export function saveScan(scanDate, scanTimestamp, cards) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO scans (scan_date, scan_timestamp, cards_json)
    VALUES (?, ?, ?)
  `);

  stmt.run(scanDate, scanTimestamp, JSON.stringify(cards));
  console.log(`[database] Saved scan for ${scanDate} with ${cards.length} cards`);

  // Cleanup old scans (older than 7 days)
  cleanupOldScans();
}

/**
 * Get scan data for a specific date
 * @param {string} scanDate - Date in YYYY-MM-DD format
 * @returns {Object|null} Scan data or null if not found
 */
export function getScan(scanDate) {
  const stmt = db.prepare(`
    SELECT scan_date, scan_timestamp, cards_json
    FROM scans
    WHERE scan_date = ?
  `);

  const row = stmt.get(scanDate);
  if (!row) return null;

  return {
    scanDate: row.scan_date,
    scanTimestamp: row.scan_timestamp,
    cards: JSON.parse(row.cards_json),
  };
}

/**
 * Get the most recent scan
 * @returns {Object|null} Latest scan data or null
 */
export function getLatestScan() {
  const stmt = db.prepare(`
    SELECT scan_date, scan_timestamp, cards_json
    FROM scans
    ORDER BY scan_date DESC
    LIMIT 1
  `);

  const row = stmt.get();
  if (!row) return null;

  return {
    scanDate: row.scan_date,
    scanTimestamp: row.scan_timestamp,
    cards: JSON.parse(row.cards_json),
  };
}

/**
 * Get list of available scan dates (last 7 days)
 * @returns {Array} Array of date strings in YYYY-MM-DD format
 */
export function getAvailableDates() {
  const stmt = db.prepare(`
    SELECT scan_date
    FROM scans
    ORDER BY scan_date DESC
    LIMIT 7
  `);

  return stmt.all().map((row) => row.scan_date);
}

/**
 * Get next available date after the given date
 * @param {string} currentDate - Current date in YYYY-MM-DD format
 * @returns {string|null} Next date or null if none
 */
export function getNextDate(currentDate) {
  const stmt = db.prepare(`
    SELECT scan_date
    FROM scans
    WHERE scan_date > ?
    ORDER BY scan_date ASC
    LIMIT 1
  `);

  const row = stmt.get(currentDate);
  return row ? row.scan_date : null;
}

/**
 * Get previous available date before the given date
 * @param {string} currentDate - Current date in YYYY-MM-DD format
 * @returns {string|null} Previous date or null if none
 */
export function getPreviousDate(currentDate) {
  const stmt = db.prepare(`
    SELECT scan_date
    FROM scans
    WHERE scan_date < ?
    ORDER BY scan_date DESC
    LIMIT 1
  `);

  const row = stmt.get(currentDate);
  return row ? row.scan_date : null;
}

/**
 * Delete scans older than 7 days
 */
function cleanupOldScans() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoffDate = sevenDaysAgo.toISOString().split('T')[0]; // YYYY-MM-DD

  const stmt = db.prepare('DELETE FROM scans WHERE scan_date < ?');
  const result = stmt.run(cutoffDate);

  if (result.changes > 0) {
    console.log(`[database] Cleaned up ${result.changes} old scan(s)`);
  }
}

/**
 * Get database stats
 */
export function getStats() {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM scans');
  const row = stmt.get();
  return {
    totalScans: row.count,
    availableDates: getAvailableDates(),
  };
}

// Graceful shutdown
process.on('exit', () => db.close());
process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});
