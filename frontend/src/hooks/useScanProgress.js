import { useState, useEffect, useRef } from 'react';

const POLL_INTERVAL = 2000; // 2s

export default function useScanProgress() {
  const [scanState, setScanState] = useState(null);
  const intervalRef = useRef(null);

  const poll = async () => {
    try {
      const res = await fetch('/api/scan/status');
      if (!res.ok) return;
      const data = await res.json();
      setScanState(data);
    } catch {
      // ignore fetch errors silently
    }
  };

  useEffect(() => {
    // Always poll status
    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, []);

  return scanState;
}
