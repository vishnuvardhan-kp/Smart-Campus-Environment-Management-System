import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const environmentApi = {
  // Fetch current environment readings for all rooms
  getCurrentEnvironment: async () => {
    const response = await apiClient.get('/environment/current');
    return response.data;
  },

  // Fetch current environment reading for a specific room
  getCurrentEnvironmentByRoom: async (room) => {
    const response = await apiClient.get(`/environment/current/${encodeURIComponent(room)}`);
    return response.data;
  },

  // Fetch all historical environment records
  getEnvironmentHistory: async (params = {}) => {
    const response = await apiClient.get('/environment/history', { params });
    return response.data;
  },

  // Fetch historical environment records for a specific room
  getEnvironmentHistoryByRoom: async (room, params = {}) => {
    const response = await apiClient.get(`/environment/history/${encodeURIComponent(room)}`, { params });
    return response.data;
  },
};

export const faultApi = {
  // Fetch active sensor faults and anomalies
  getActiveFaults: async (params = {}) => {
    const response = await apiClient.get('/faults/active', { params });
    return response.data;
  },

  // Fetch historical sensor fault events with pagination
  getFaultHistory: async (params = {}) => {
    const response = await apiClient.get('/faults/history', { params });
    return response.data;
  },

  // Fetch campus-wide sensor connectivity and hardware health summary
  getSensorHealthSummary: async () => {
    const response = await apiClient.get('/faults/health');
    return response.data;
  },

  // Fetch detailed sensor health and diagnostic status for a specific room
  getRoomHealth: async (room) => {
    const response = await apiClient.get(`/faults/room/${encodeURIComponent(room)}`);
    return response.data;
  },
};

export default apiClient;
