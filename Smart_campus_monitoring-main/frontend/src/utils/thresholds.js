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

/**
 * Get hardware diagnostic status metadata
 */
export const getHardwareStatusMeta = (status) => {
  switch (String(status).toUpperCase()) {
    case 'FAULT':
      return { label: 'Hardware Fault', class: 'status-critical', color: '#C65C5C' };
    case 'DEGRADED':
      return { label: 'Degraded', class: 'status-warning', color: '#C98A35' };
    case 'OFFLINE':
      return { label: 'Node Offline', class: 'status-offline', color: '#6B746E' };
    case 'HEALTHY':
    default:
      return { label: 'Healthy', class: 'status-normal', color: '#4F8058' };
  }
};

/**
 * Get fault severity styling metadata
 */
export const getFaultSeverityMeta = (severity) => {
  switch (String(severity).toUpperCase()) {
    case 'CRITICAL':
      return { label: 'CRITICAL', bg: '#FDE8E8', color: '#9B1C1C', border: '#F8B4B4' };
    case 'HIGH':
      return { label: 'HIGH', bg: '#FDF2E9', color: '#A96132', border: '#E7C7AD' };
    case 'MEDIUM':
      return { label: 'MEDIUM', bg: '#FEF9C3', color: '#854D0E', border: '#FDE047' };
    case 'LOW':
    default:
      return { label: 'LOW', bg: '#F3F4F6', color: '#374151', border: '#E5E7EB' };
  }
};

/**
 * Human-readable label for fault types
 */
export const getFaultTypeLabel = (type) => {
  switch (String(type).toUpperCase()) {
    case 'DEVICE_OFFLINE':
      return 'Node Offline';
    case 'SUDDEN_TEMP_CHANGE':
      return 'Sudden Temp Spike';
    case 'IMPLAUSIBLE_READING':
      return 'Implausible Telemetry';
    case 'STUCK_SENSOR':
      return 'Stuck Sensor';
    case 'THRESHOLD_PREDICTION':
      return 'Threshold Forecast';
    default:
      return type || 'Anomaly';
  }
};
