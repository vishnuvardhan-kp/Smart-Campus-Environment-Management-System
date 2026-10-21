// Threshold rules for Temperature & Humidity status calculation

export const SENSOR_OFFLINE_THRESHOLD_MS = 30000; // 30 seconds without update = Offline
export const SENSOR_STALE_THRESHOLD_MS = 15000;   // 15 seconds without update = Stale

export const THRESHOLDS = {
  TEMPERATURE: {
    NORMAL_MAX: 33.0,
    WARNING_MAX: 35.0,
  },
  HUMIDITY: {
    NORMAL_MIN: 40.0,
    NORMAL_MAX: 70.0,
    WARNING_MAX: 80.0,
  },
  OFFLINE_TIMEOUT_MS: SENSOR_OFFLINE_THRESHOLD_MS,
  STALE_TIMEOUT_MS: SENSOR_STALE_THRESHOLD_MS,
};

/**
 * Check if sensor is online (updated within 30 seconds)
 */
export const isSensorOnline = (lastUpdated, now = Date.now()) => {
  if (!lastUpdated) return false;
  const date = new Date(lastUpdated);
  if (isNaN(date.getTime())) return false;
  const currentTime = typeof now === 'number' ? now : new Date(now).getTime();
  return (currentTime - date.getTime()) <= SENSOR_OFFLINE_THRESHOLD_MS;
};

/**
 * Get status of temperature reading
 */
export const getTemperatureStatus = (temp) => {
  if (temp === undefined || temp === null || isNaN(temp)) return 'offline';
  if (temp > THRESHOLDS.TEMPERATURE.WARNING_MAX) return 'critical';
  if (temp > THRESHOLDS.TEMPERATURE.NORMAL_MAX) return 'warning';
  return 'normal';
};

/**
 * Get status of humidity reading
 */
export const getHumidityStatus = (hum) => {
  if (hum === undefined || hum === null || isNaN(hum)) return 'offline';
  if (hum > THRESHOLDS.HUMIDITY.WARNING_MAX) return 'critical';
  if (hum > THRESHOLDS.HUMIDITY.NORMAL_MAX || hum < THRESHOLDS.HUMIDITY.NORMAL_MIN) return 'warning';
  return 'normal';
};

/**
 * Get overall room environment status using real-time freshness rule
 */
export const getRoomStatus = (temp, hum, lastUpdated, now = Date.now()) => {
  if (temp === undefined || temp === null || isNaN(temp)) return 'offline';

  if (!lastUpdated) return 'offline';
  const date = new Date(lastUpdated);
  if (isNaN(date.getTime())) return 'offline';

  const currentTime = typeof now === 'number' ? now : new Date(now).getTime();
  const timeDiff = currentTime - date.getTime();

  // If lastUpdated is older than 30 seconds, mark as offline
  if (timeDiff > SENSOR_OFFLINE_THRESHOLD_MS) {
    return 'offline';
  }

  const tempStatus = getTemperatureStatus(temp);
  const humStatus = getHumidityStatus(hum);

  if (tempStatus === 'critical' || humStatus === 'critical') return 'critical';
  if (tempStatus === 'warning' || humStatus === 'warning') return 'warning';

  if (timeDiff > SENSOR_STALE_THRESHOLD_MS) {
    return 'stale';
  }

  return 'normal';
};

/**
 * Get status display metadata
 */
export const getStatusMeta = (status) => {
  switch (status) {
    case 'critical':
      return { label: 'Critical', class: 'status-critical', color: '#C65C5C' };
    case 'warning':
      return { label: 'Warning', class: 'status-warning', color: '#C98A35' };
    case 'stale':
      return { label: 'Stale', class: 'status-warning', color: '#C98A35' };
    case 'offline':
      return { label: 'Offline', class: 'status-offline', color: '#6B746E' };
    case 'normal':
    default:
      return { label: 'Online', class: 'status-normal', color: '#4F8058' };
  }
};
