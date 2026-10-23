import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { environmentApi } from '../services/api';

const EnvironmentContext = createContext();

export const EnvironmentProvider = ({ children }) => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [apiConnected, setApiConnected] = useState(true);
  const [now, setNow] = useState(Date.now());

  const fetchCurrentEnvironment = useCallback(async (isInitial = false) => {
    try {
      if (isInitial && rooms.length === 0) setLoading(true);
      const res = await environmentApi.getCurrentEnvironment();
      if (res && res.success) {
        setRooms(res.data || []);
        setError(null);
        setApiConnected(true);
        setLastSyncTime(new Date());
      } else {
        setError(res?.message || 'Failed to fetch live environment data.');
        setApiConnected(false);
      }
    } catch (err) {
      console.error('[EnvironmentContext] API Poll error:', err);
      setError('Unable to fetch live environment data. Retrying...');
      setApiConnected(false);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [rooms.length]);

  useEffect(() => {
    // 1. Fetch immediately when provider mounts
    fetchCurrentEnvironment(true);

    // 2. Poll every 5 seconds
    const pollId = setInterval(() => {
      fetchCurrentEnvironment(false);
    }, 5000);

    // 3. Ticker every 1 second to recalculate relative timestamps dynamically
    const tickerId = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      clearInterval(pollId);
      clearInterval(tickerId);
    };
  }, [fetchCurrentEnvironment]);

  const value = {
    rooms,
    loading,
    error,
    lastSyncTime,
    apiConnected,
    now,
    refetch: () => fetchCurrentEnvironment(true),
  };

  return (
    <EnvironmentContext.Provider value={value}>
      {children}
    </EnvironmentContext.Provider>
  );
};

export const useEnvironment = () => {
  const context = useContext(EnvironmentContext);
  if (!context) {
    throw new Error('useEnvironment must be used within an EnvironmentProvider');
  }
  return context;
};

export default EnvironmentContext;
