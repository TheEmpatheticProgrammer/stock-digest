import { useState, useEffect, useCallback, useRef } from 'react';

const POLL_INTERVAL = 30000; // 30s

/**
 * Hook for fetching scan data
 * @param {string|null} date - Optional date (YYYY-MM-DD) to fetch historical data. null = latest
 */
export default function useScanData(date = null) {
  const [cards, setCards] = useState(null);
  const [scanTimestamp, setScanTimestamp] = useState(null);
  const [scanDate, setScanDate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const lastTimestampRef = useRef(null);

  const fetchResults = useCallback(async () => {
    try {
      // If date is provided, fetch historical data; otherwise fetch latest
      const url = date ? `/api/scans/${date}` : '/api/results';
      console.log('[useScanData] Fetching from:', url);
      const res = await fetch(url);

      if (res.status === 204) {
        setIsLoading(false);
        return false; // no data yet
      }
      if (res.status === 404) {
        setError('No scan data available for this date');
        setIsLoading(false);
        return false;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      // Handle both old format (/api/results) and new format (/api/scans/:date)
      const cardsData = data.cards || data.cards;
      const timestamp = data.scanTimestamp || data.scanTimestamp;
      const scanDateStr = data.scanDate || date;

      if (timestamp !== lastTimestampRef.current || date) {
        setCards(cardsData);
        setScanTimestamp(timestamp);
        setScanDate(scanDateStr);
        lastTimestampRef.current = timestamp;
        setError(null);
      }
      setIsLoading(false);
      return true;
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
      return false;
    }
  }, [date]);

  // Initial fetch
  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Polling - only poll if viewing latest (no date specified)
  useEffect(() => {
    if (!date) {
      const id = setInterval(fetchResults, POLL_INTERVAL);
      return () => clearInterval(id);
    }
  }, [fetchResults, date]);

  const triggerScan = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/scan/trigger', { method: 'POST' });
      if (!res.ok && res.status !== 409) {
        throw new Error(`Failed to trigger scan: HTTP ${res.status}`);
      }
    } catch (err) {
      setError(err.message);
    }
  }, []);

  return {
    cards,
    scanTimestamp,
    scanDate,
    isLoading,
    error,
    triggerScan,
    refetch: fetchResults
  };
}
