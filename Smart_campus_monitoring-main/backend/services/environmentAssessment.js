/**
 * Real-Time Environmental Condition Assessment Service
 *
 * Implements deterministic, explainable, rule-based environmental condition
 * assessment based on temperature, humidity, and fan actuator status.
 */

const ENVIRONMENT_THRESHOLDS = {
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

/**
 * Evaluate temperature metric against thresholds
 */
function evaluateTemperature(temp) {
    if (temp === null || temp === undefined || temp === '') {
        return { status: 'UNKNOWN', level: 'UNKNOWN', text: null };
    }
    const t = Number(temp);
    if (isNaN(t)) {
        return { status: 'UNKNOWN', level: 'UNKNOWN', text: null };
    }

    if (t < ENVIRONMENT_THRESHOLDS.temperature.criticalLow) {
        return { status: 'CRITICAL', level: 'LOW_CRITICAL', text: 'critically low' };
    }
    if (t < ENVIRONMENT_THRESHOLDS.temperature.preferredMin) {
        return { status: 'ATTENTION', level: 'LOW_ATTENTION', text: 'below the preferred range' };
    }
    if (t <= ENVIRONMENT_THRESHOLDS.temperature.preferredMax) {
        return { status: 'NORMAL', level: 'NORMAL', text: 'within the preferred range' };
    }
    if (t <= ENVIRONMENT_THRESHOLDS.temperature.criticalHigh) {
        return { status: 'ATTENTION', level: 'HIGH_ATTENTION', text: 'above the preferred range' };
    }
    return { status: 'CRITICAL', level: 'HIGH_CRITICAL', text: 'critically high' };
}

/**
 * Evaluate humidity metric against thresholds
 */
function evaluateHumidity(hum) {
    if (hum === null || hum === undefined || hum === '') {
        return { status: 'UNKNOWN', level: 'UNKNOWN', text: null };
    }
    const h = Number(hum);
    if (isNaN(h)) {
        return { status: 'UNKNOWN', level: 'UNKNOWN', text: null };
    }

    if (h < ENVIRONMENT_THRESHOLDS.humidity.criticalLow) {
        return { status: 'CRITICAL', level: 'LOW_CRITICAL', text: 'critically low' };
    }
    if (h < ENVIRONMENT_THRESHOLDS.humidity.preferredMin) {
        return { status: 'ATTENTION', level: 'LOW_ATTENTION', text: 'below the preferred range' };
    }
    if (h <= ENVIRONMENT_THRESHOLDS.humidity.preferredMax) {
        return { status: 'NORMAL', level: 'NORMAL', text: 'within the preferred range' };
    }
    if (h <= ENVIRONMENT_THRESHOLDS.humidity.attentionHigh) {
        return { status: 'ATTENTION', level: 'HIGH_ATTENTION', text: 'above the preferred range' };
    }
    return { status: 'CRITICAL', level: 'HIGH_CRITICAL', text: 'critically high' };
}

/**
 * Check whether fan/cooling relay is currently active
 */
function isFanActive(fan) {
    if (fan === null || fan === undefined) return false;
    const str = String(fan).trim().toUpperCase();
    return str === 'ON' || str === '1' || str === 'TRUE';
}

/**
 * Determine overall priority status (CRITICAL > ATTENTION > NORMAL)
 */
function determineOverallStatus(tempStatus, humStatus) {
    if (tempStatus === 'CRITICAL' || humStatus === 'CRITICAL') {
        return 'CRITICAL';
    }
    if (tempStatus === 'ATTENTION' || humStatus === 'ATTENTION') {
        return 'ATTENTION';
    }
    return 'NORMAL';
}

/**
 * Assess environmental conditions from raw sensor data
 *
 * @param {Object} reading
 * @param {number|null} reading.temperature
 * @param {number|null} reading.humidity
 * @param {string|null} [reading.fan]
 * @param {string|null} [reading.light]
 * @returns {Object} assessment
 */
function assessEnvironment(reading = {}) {
    const { temperature, humidity, fan } = reading;

    const tempEval = evaluateTemperature(temperature);
    const humEval = evaluateHumidity(humidity);

    // Edge Case: Incomplete or invalid sensor telemetry
    if (tempEval.status === 'UNKNOWN' || humEval.status === 'UNKNOWN') {
        return {
            status: 'UNKNOWN',
            reason: 'Environmental data is incomplete.',
            recommendation: 'Wait for the next sensor update.',
            temperatureStatus: tempEval.status,
            humidityStatus: humEval.status
        };
    }

    // Baseline: Both metrics are normal
    if (tempEval.status === 'NORMAL' && humEval.status === 'NORMAL') {
        return {
            status: 'NORMAL',
            reason: 'Temperature and humidity are within the preferred range.',
            recommendation: 'Environmental conditions are currently normal.',
            temperatureStatus: 'NORMAL',
            humidityStatus: 'NORMAL'
        };
    }

    const overallStatus = determineOverallStatus(tempEval.status, humEval.status);
    const fanOn = isFanActive(fan);

    let reason = '';
    let recommendation = '';

    const isTempWarm = tempEval.level === 'HIGH_ATTENTION' || tempEval.level === 'HIGH_CRITICAL';
    const isTempCold = tempEval.level === 'LOW_ATTENTION' || tempEval.level === 'LOW_CRITICAL';
    const isHumHigh = humEval.level === 'HIGH_ATTENTION' || humEval.level === 'HIGH_CRITICAL';
    const isHumLow = humEval.level === 'LOW_ATTENTION' || humEval.level === 'LOW_CRITICAL';

    // Scenario A: Both Temperature and Humidity have issues
    if (tempEval.status !== 'NORMAL' && humEval.status !== 'NORMAL') {
        // Both high
        if (isTempWarm && isHumHigh) {
            if (tempEval.status === 'CRITICAL' && humEval.status === 'CRITICAL') {
                reason = `Temperature and humidity are critically high.${fanOn ? ' Cooling is currently active.' : ' The fan is OFF.'}`;
                recommendation = fanOn
                    ? 'Continue cooling and check room ventilation.'
                    : 'Enable cooling and check room ventilation.';
            } else if (tempEval.status === 'CRITICAL') {
                reason = `Temperature is critically high and humidity is above the preferred range.${fanOn ? ' Cooling is currently active.' : ' The fan is OFF.'}`;
                recommendation = fanOn
                    ? 'Continue cooling and check room ventilation.'
                    : 'Enable cooling and check room ventilation.';
            } else if (humEval.status === 'CRITICAL') {
                reason = `Humidity is critically high and temperature is above the preferred range.${fanOn ? ' Cooling is currently active.' : ' The fan is OFF.'}`;
                recommendation = fanOn
                    ? 'Continue cooling and check room ventilation.'
                    : 'Enable cooling and check room ventilation.';
            } else {
                reason = `Temperature and humidity are above the preferred range.${fanOn ? ' Cooling is currently active.' : ' The fan is OFF.'}`;
                recommendation = fanOn
                    ? 'Continue cooling and check room ventilation.'
                    : 'Enable cooling and check room ventilation.';
            }
        } else {
            // Mixed (e.g. cold + humid, or warm + dry)
            reason = `Temperature is ${tempEval.text} and humidity is ${humEval.text}.`;
            recommendation = 'Adjust climate controls and monitor room conditions.';
        }
    } 
    // Scenario B: Temperature has issues, Humidity is Normal
    else if (tempEval.status !== 'NORMAL') {
        if (isTempWarm) {
            if (tempEval.status === 'CRITICAL') {
                reason = fanOn
                    ? 'Temperature is critically high. Cooling is currently active.'
                    : 'Temperature is critically high and the fan is OFF.';
                recommendation = fanOn
                    ? 'Continue cooling and monitor the temperature.'
                    : 'Enable cooling and monitor the temperature.';
            } else {
                reason = fanOn
                    ? 'Temperature is above the preferred range. Cooling is currently active.'
                    : 'Temperature is above the preferred range and the fan is OFF.';
                recommendation = fanOn
                    ? 'Continue cooling and monitor the temperature.'
                    : 'Enable cooling and monitor the temperature.';
            }
        } else if (isTempCold) {
            if (tempEval.status === 'CRITICAL') {
                reason = 'Temperature is critically low.';
                recommendation = 'Inspect heating and room temperature.';
            } else {
                reason = 'Temperature is below the preferred range.';
                recommendation = 'Monitor room temperature.';
            }
        }
    } 
    // Scenario C: Humidity has issues, Temperature is Normal
    else {
        if (humEval.status === 'CRITICAL') {
            if (isHumHigh) {
                reason = 'Humidity is critically high.';
                recommendation = 'Check ventilation and monitor humidity.';
            } else {
                reason = 'Humidity is critically low.';
                recommendation = 'Check air circulation and indoor humidity levels.';
            }
        } else {
            if (isHumHigh) {
                reason = 'Humidity is above the preferred range.';
                recommendation = 'Monitor humidity and ventilation.';
            } else {
                reason = 'Humidity is below the preferred range.';
                recommendation = 'Monitor indoor humidity levels.';
            }
        }
    }

    return {
        status: overallStatus,
        reason,
        recommendation,
        temperatureStatus: tempEval.status,
        humidityStatus: humEval.status
    };
}

module.exports = {
    ENVIRONMENT_THRESHOLDS,
    assessEnvironment,
    evaluateTemperature,
    evaluateHumidity
};
