import { useState, useEffect, useCallback, useRef } from 'react';

const POLL_INTERVAL = 30000; // 30s

export default function useScanData() {
  const [cards, setCards] = useState(null);
  const [scanTimestamp, setScanTimestamp] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const lastTimestampRef = useRef(null);

  const fetchResults = useCallback(async () => {
    try {
      const res = await fetch('/api/results');
      if (res.status === 204) {
        setIsLoading(false);
        return false; // no data yet
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.scanTimestamp !== lastTimestampRef.current) {
        setCards(data.cards);
        setScanTimestamp(data.scanTimestamp);
        lastTimestampRef.current = data.scanTimestamp;
        setError(null);
      }
      setIsLoading(false);
      return true;
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
      return false;
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Polling
  useEffect(() => {
    const id = setInterval(fetchResults, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchResults]);

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

  return { cards, scanTimestamp, isLoading, error, triggerScan, refetch: fetchResults };
}
