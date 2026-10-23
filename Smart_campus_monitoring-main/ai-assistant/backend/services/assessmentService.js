/**
 * Environmental Assessment Service
 *
 * Implements deterministic, explainable condition assessment matching
 * the existing Smart Campus environment thresholds.
 */

export const ENVIRONMENT_THRESHOLDS = {
  temperature: {
    preferredMin: 22,
    preferredMax: 28,
    criticalLow: 18,
    criticalHigh: 32
  },
  humidity: {
    preferredMin: 40,
    preferredMax: 60,
    attentionLow: 30,
    attentionHigh: 70,
    criticalLow: 30,
    criticalHigh: 70
  }
};

export function evaluateTemperature(temp) {
  if (temp === null || temp === undefined || temp === '') {
    return { status: 'UNKNOWN', level: 'UNKNOWN', text: 'unknown' };
  }
  const t = Number(temp);
  if (isNaN(t)) {
    return { status: 'UNKNOWN', level: 'UNKNOWN', text: 'unknown' };
  }

  if (t < ENVIRONMENT_THRESHOLDS.temperature.criticalLow) {
    return { status: 'CRITICAL', level: 'LOW_CRITICAL', text: 'critically low' };
  }
  if (t < ENVIRONMENT_THRESHOLDS.temperature.preferredMin) {
    return { status: 'ATTENTION', level: 'LOW_ATTENTION', text: 'below preferred range' };
  }
  if (t <= ENVIRONMENT_THRESHOLDS.temperature.preferredMax) {
    return { status: 'NORMAL', level: 'NORMAL', text: 'within preferred range' };
  }
  if (t <= ENVIRONMENT_THRESHOLDS.temperature.criticalHigh) {
    return { status: 'ATTENTION', level: 'HIGH_ATTENTION', text: 'above preferred range' };
  }
  return { status: 'CRITICAL', level: 'HIGH_CRITICAL', text: 'critically high' };
}

export function evaluateHumidity(hum) {
  if (hum === null || hum === undefined || hum === '') {
    return { status: 'UNKNOWN', level: 'UNKNOWN', text: 'unknown' };
  }
  const h = Number(hum);
  if (isNaN(h)) {
    return { status: 'UNKNOWN', level: 'UNKNOWN', text: 'unknown' };
  }

  if (h < ENVIRONMENT_THRESHOLDS.humidity.criticalLow) {
    return { status: 'CRITICAL', level: 'LOW_CRITICAL', text: 'critically low' };
  }
  if (h < ENVIRONMENT_THRESHOLDS.humidity.preferredMin) {
    return { status: 'ATTENTION', level: 'LOW_ATTENTION', text: 'below preferred range' };
  }
  if (h <= ENVIRONMENT_THRESHOLDS.humidity.preferredMax) {
    return { status: 'NORMAL', level: 'NORMAL', text: 'within preferred range' };
  }
  if (h <= ENVIRONMENT_THRESHOLDS.humidity.attentionHigh) {
    return { status: 'ATTENTION', level: 'HIGH_ATTENTION', text: 'above preferred range' };
  }
  return { status: 'CRITICAL', level: 'HIGH_CRITICAL', text: 'critically high' };
}

export function isFanActive(fan) {
  if (fan === null || fan === undefined) return false;
  const str = String(fan).trim().toUpperCase();
  return str === 'ON' || str === '1' || str === 'TRUE';
}

export function assessEnvironment(reading = {}) {
  const { temperature, humidity, fan } = reading;
  const tempEval = evaluateTemperature(temperature);
  const humEval = evaluateHumidity(humidity);

  if (tempEval.status === 'UNKNOWN' || humEval.status === 'UNKNOWN') {
    return {
      status: 'UNKNOWN',
      reason: 'Environmental telemetry is incomplete or missing.',
      recommendation: 'Awaiting sensor update.',
      temperatureStatus: tempEval.status,
      humidityStatus: humEval.status
    };
  }

  if (tempEval.status === 'NORMAL' && humEval.status === 'NORMAL') {
    return {
      status: 'NORMAL',
      reason: 'Temperature and humidity are within the optimal comfort range.',
      recommendation: 'Conditions are optimal. Normal operation.',
      temperatureStatus: 'NORMAL',
      humidityStatus: 'NORMAL'
    };
  }

  const overallStatus = (tempEval.status === 'CRITICAL' || humEval.status === 'CRITICAL')
    ? 'CRITICAL'
    : 'ATTENTION';

  const fanOn = isFanActive(fan);
  let reason = '';
  let recommendation = '';

  if (tempEval.status === 'CRITICAL') {
    reason = `Temperature is ${tempEval.text} (${temperature}°C).`;
    recommendation = fanOn ? 'Cooling is active. Continue monitoring.' : 'Enable ventilation / cooling.';
  } else if (tempEval.status === 'ATTENTION') {
    reason = `Temperature is ${tempEval.text} (${temperature}°C).`;
    recommendation = fanOn ? 'Cooling is currently running.' : 'Consider enabling ventilation if temperature rises.';
  }

  if (humEval.status === 'CRITICAL') {
    reason += ` Humidity is ${humEval.text} (${humidity}%).`;
    recommendation += ' Inspect room dehumidifier / HVAC.';
  } else if (humEval.status === 'ATTENTION') {
    reason += ` Humidity is ${humEval.text} (${humidity}%).`;
  }

  return {
    status: overallStatus,
    reason: reason.trim(),
    recommendation: recommendation.trim(),
    temperatureStatus: tempEval.status,
    humidityStatus: humEval.status
  };
}
