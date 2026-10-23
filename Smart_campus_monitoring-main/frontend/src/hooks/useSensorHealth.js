import { useState, useEffect, useCallback } from 'react';
import { faultApi } from '../services/api';

/**
 * Hook to poll campus-wide sensor health and active faults
 */
export const useSensorHealth = () => {
  const [healthData, setHealthData] = useState(null);
  const [activeFaults, setActiveFaults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHealth = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const [healthRes, faultsRes] = await Promise.all([
        faultApi.getSensorHealthSummary().catch(() => null),
        faultApi.getActiveFaults().catch(() => null)
      ]);

      if (healthRes && healthRes.success) {
        setHealthData(healthRes.data);
      }
      if (faultsRes && faultsRes.success) {
        setActiveFaults(faultsRes.data || []);
      }
      setError(null);
    } catch (err) {
      console.warn('[useSensorHealth] Error polling sensor health:', err.message);
      setError(err.message || 'Failed to fetch sensor health diagnostics');
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth(true);
    const interval = setInterval(() => {
      fetchHealth(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchHealth]);

  return {
    healthData,
    activeFaults,
    loading,
    error,
    refetch: () => fetchHealth(true)
  };
};

/**
 * Hook to fetch detailed sensor health and fault history for a single room
 */
export const useRoomFaultHealth = (roomName) => {
  const [roomHealth, setRoomHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRoomHealth = useCallback(async () => {
    if (!roomName) return;
    try {
      setLoading(true);
      const res = await faultApi.getRoomHealth(roomName);
      if (res && res.success) {
        setRoomHealth(res.data);
        setError(null);
      } else {
        setError(res?.message || `Failed to fetch health for ${roomName}`);
      }
    } catch (err) {
      setError(err.message || 'Diagnostic query failed');
    } finally {
      setLoading(false);
    }
  }, [roomName]);

  useEffect(() => {
    fetchRoomHealth();
    const interval = setInterval(fetchRoomHealth, 5000);
    return () => clearInterval(interval);
  }, [fetchRoomHealth]);

  return { roomHealth, loading, error, refetch: fetchRoomHealth };
};
