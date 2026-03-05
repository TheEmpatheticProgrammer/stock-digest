import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for managing historical scan date navigation
 */
export default function useDateNavigation() {
  const [currentDate, setCurrentDate] = useState(null); // null = latest
  const [availableDates, setAvailableDates] = useState([]);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch available dates on mount
  useEffect(() => {
    console.log('[useDateNavigation] Fetching available dates...');
    fetch('/api/scans/dates')
      .then((res) => {
        console.log('[useDateNavigation] Response status:', res.status);
        return res.json();
      })
      .then((data) => {
        console.log('[useDateNavigation] Received dates:', data.dates);
        setAvailableDates(data.dates || []);
        // Start with the latest date
        if (data.dates && data.dates.length > 0) {
          setCurrentDate(data.dates[0]); // Most recent date
          console.log('[useDateNavigation] Set current date to:', data.dates[0]);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('[useDateNavigation] Failed to fetch dates:', err);
        setIsLoading(false);
      });
  }, []);

  // Update navigation state when current date changes
  useEffect(() => {
    if (!currentDate || availableDates.length === 0) {
      setHasNext(false);
      setHasPrevious(false);
      return;
    }

    const currentIndex = availableDates.indexOf(currentDate);
    setHasNext(currentIndex > 0); // Can go to newer date
    setHasPrevious(currentIndex < availableDates.length - 1); // Can go to older date
  }, [currentDate, availableDates]);

  const goToNext = useCallback(() => {
    if (!hasNext || !currentDate) return;

    const currentIndex = availableDates.indexOf(currentDate);
    if (currentIndex > 0) {
      setCurrentDate(availableDates[currentIndex - 1]);
    }
  }, [hasNext, currentDate, availableDates]);

  const goToPrevious = useCallback(() => {
    if (!hasPrevious || !currentDate) return;

    const currentIndex = availableDates.indexOf(currentDate);
    if (currentIndex < availableDates.length - 1) {
      setCurrentDate(availableDates[currentIndex + 1]);
    }
  }, [hasPrevious, currentDate, availableDates]);

  const goToLatest = useCallback(() => {
    if (availableDates.length > 0) {
      setCurrentDate(availableDates[0]);
    }
  }, [availableDates]);

  const isViewingLatest = currentDate === availableDates[0];
  const isViewingOldest = currentDate === availableDates[availableDates.length - 1];

  // Method to refresh available dates (called after a new scan)
  const refreshDates = useCallback(() => {
    fetch('/api/scans/dates')
      .then((res) => res.json())
      .then((data) => {
        setAvailableDates(data.dates || []);
        // Move to latest date after refresh
        if (data.dates && data.dates.length > 0) {
          setCurrentDate(data.dates[0]);
        }
      })
      .catch((err) => console.error('[useDateNavigation] Failed to refresh dates:', err));
  }, []);

  return {
    currentDate,
    availableDates,
    hasNext,
    hasPrevious,
    goToNext,
    goToPrevious,
    goToLatest,
    refreshDates,
    isViewingLatest,
    isViewingOldest,
    isLoading,
  };
}
