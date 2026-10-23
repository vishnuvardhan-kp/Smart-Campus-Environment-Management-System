import { useState, useEffect, useCallback } from 'react';
import { environmentApi } from '../services/api';
import { useEnvironment } from '../context/EnvironmentContext';

export { useEnvironment };

/**
 * Hook to poll current environment data for a single room from the live context or room API
 */
export const useRoomCurrent = (roomName) => {
  const { rooms, loading, error, lastSyncTime, apiConnected, now, refetch } = useEnvironment();
  
  // Find current room document from live rooms array
  const roomData = rooms.find(r => r.room?.toUpperCase() === roomName?.toUpperCase()) || null;

  return {
    roomData,
    loading,
    error,
    lastSyncTime,
    apiConnected,
    now,
    refetch
  };
};

/**
 * Hook to fetch room history data (without auto-polling every 5s, only on manual refetch or param change)
 */
export const useRoomHistory = (room, limit = 100) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHistory = useCallback(async () => {
    if (!room) return;
    try {
      setLoading(true);
      const res = await environmentApi.getEnvironmentHistoryByRoom(room, { limit });
      if (res && res.success) {
        // Backend returns newest first. For charts, we want chronological order (oldest to newest).
        const rawData = res.data || [];
        const chronologicalData = [...rawData].reverse();
        setHistory(chronologicalData);
        setError(null);
      } else {
        setError(res?.message || `No history found for room ${room}`);
      }
    } catch (err) {
      console.error(`[useRoomHistory] Error fetching history for ${room}:`, err);
      setError(err.message || 'Unable to fetch historical data.');
    } finally {
      setLoading(false);
    }
  }, [room, limit]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { history, loading, error, refetch: fetchHistory };
};
