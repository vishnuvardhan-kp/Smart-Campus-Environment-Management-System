/**
 * Format relative time ago (e.g. "12 sec ago", "2 min ago", "Just now")
 * @param {string|Date|number} dateInput - ISO string or date
 * @param {number} now - current timestamp ms for real-time recalculation
 */
export const formatTimeAgo = (dateInput, now = Date.now()) => {
  if (!dateInput) return 'N/A';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'N/A';

  const currentTime = typeof now === 'number' ? now : new Date(now).getTime();
  const seconds = Math.floor((currentTime - date.getTime()) / 1000);
  
  if (seconds < 0) return 'Just now';
  if (seconds < 5) return 'Just now';
  if (seconds < 60) return `${seconds} sec ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
};

/**
 * Format full date & time (e.g., "Aug 8, 2026 10:15:30")
 */
export const formatDateTime = (dateInput) => {
  if (!dateInput) return 'N/A';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

/**
 * Format time for charts (e.g., "10:15:30")
 */
export const formatChartTime = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

/**
 * Format number with fixed decimals
 */
export const formatNumber = (num, decimals = 1) => {
  if (num === undefined || num === null || isNaN(num)) return 'N/A';
  return Number(num).toFixed(decimals);
};

/**
 * Temperature string formatter
 */
export const formatTemp = (temp) => {
  if (temp === undefined || temp === null || isNaN(temp)) return 'N/A';
  return `${formatNumber(temp, 1)}°C`;
};

/**
 * Humidity string formatter
 */
export const formatHumidity = (hum) => {
  if (hum === undefined || hum === null || isNaN(hum)) return 'N/A';
  return `${formatNumber(hum, 0)}%`;
};
