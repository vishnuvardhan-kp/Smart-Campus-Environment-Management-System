/**
 * Assistant API Service
 * 
 * Handles network interaction with the assistant backend on port 5005.
 * Never silently fabricates live data on network failure.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5005';

/**
 * Check if the assistant backend service is healthy and reachable
 */
export async function checkBackendHealth() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(`${API_BASE}/api/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Health check returned HTTP ${response.status}`);
    }

    const data = await response.json();
    return { isOnline: true, data };
  } catch (error) {
    clearTimeout(timeoutId);
    return {
      isOnline: false,
      error: error.name === 'AbortError' ? 'Connection timed out' : error.message
    };
  }
}

/**
 * Send a chat query to the backend
 * @param {string} message 
 * @returns {Promise<object>} response payload from backend
 */
export async function sendChatMessage(message) {
  const response = await fetch(`${API_BASE}/api/assistant/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ message })
  });

  if (!response.ok) {
    let errorDetail = `Server error HTTP ${response.status}`;
    try {
      const errorJson = await response.json();
      if (errorJson.error) {
        errorDetail = errorJson.error;
      }
    } catch {
      // Use fallback errorDetail
    }
    throw new Error(errorDetail);
  }

  return response.json();
}
