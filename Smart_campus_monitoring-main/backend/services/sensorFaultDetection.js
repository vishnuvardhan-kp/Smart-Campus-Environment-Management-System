/**
 * Sensor Fault and Anomaly Detection Service
 *
 * Implements deterministic detection of:
 * 1. Device Offline (telemetry silence beyond configurable timeout)
 * 2. Sudden Abnormal Temperature Changes (rate of change and instant step jump)
 * 3. Implausible Readings (out-of-bounds, NaN, malformed payloads)
 * 4. Stuck Sensors (zero variance across extensive sample window)
 * 5. Threshold Prediction (linear lookahead forecasting of threshold violations)
 */

const SensorFault = require('../models/SensorFault');
const EnvironmentHistory = require('../models/EnvironmentHistory');
const CurrentEnvironment = require('../models/CurrentEnvironment');

const FAULT_CONFIG = {
    offlineTimeoutMs: 45 * 1000, // 45 seconds without telemetry -> Offline
    staleTimeoutMs: 20 * 1000,   // 20 seconds -> Warning/Stale
    temperature: {
        minPlausible: -5.0,        // °C minimum realistic indoor/outdoor room temp
        maxPlausible: 60.0,        // °C maximum realistic room temperature
        maxInstantStep: 4.0,       // °C jump between consecutive readings (< 30s)
        maxRatePerMinute: 3.0,     // °C per minute rate of change
        warningThreshold: 28.0,    // °C threshold for early attention
        criticalThreshold: 30.0,   // °C critical threshold to forecast
        lookaheadMinutes: 15       // Forecast horizon
    },
    humidity: {
        minPlausible: 5.0,         // % RH minimum
        maxPlausible: 98.0         // % RH maximum
    },
    peopleCount: {
        minPlausible: 0,
        maxPlausible: 500
    },
    stuckSensor: {
        windowMinutes: 20,         // History window to check
        minSamples: 10,            // Minimum samples required to avoid false positives
        tolerance: 0.001           // Value difference tolerance
    }
};

/**
 * 1. Validate incoming telemetry payload for plausibility and completeness.
 * Pure function: does not access DB.
 *
 * @param {Object} rawPayload
 * @param {Object} [config=FAULT_CONFIG]
 * @returns {Object} { isValid, isImplausible, errors, sanitized }
 */
function validateTelemetryPayload(rawPayload, config = FAULT_CONFIG) {
    const errors = [];
    if (!rawPayload || typeof rawPayload !== 'object') {
        return {
            isValid: false,
            isImplausible: true,
            errors: ['Telemetry payload is empty or malformed'],
            sanitized: null
        };
    }

    const { temperature, humidity, peopleCount, people } = rawPayload;
    const sanitized = {};

    // Validate Temperature (if provided)
    if (temperature !== undefined && temperature !== null && temperature !== '') {
        const t = Number(temperature);
        if (isNaN(t) || typeof t !== 'number') {
            errors.push(`Non-numeric temperature value: "${temperature}"`);
        } else if (t < config.temperature.minPlausible || t > config.temperature.maxPlausible) {
            errors.push(`Physically implausible temperature: ${t}°C (Plausible range: ${config.temperature.minPlausible}°C to ${config.temperature.maxPlausible}°C)`);
        } else {
            sanitized.temperature = Number(t.toFixed(2));
        }
    }

    // Validate Humidity (if provided)
    if (humidity !== undefined && humidity !== null && humidity !== '') {
        const h = Number(humidity);
        if (isNaN(h) || typeof h !== 'number') {
            errors.push(`Non-numeric humidity value: "${humidity}"`);
        } else if (h < config.humidity.minPlausible || h > config.humidity.maxPlausible) {
            errors.push(`Physically implausible humidity: ${h}% (Plausible range: ${config.humidity.minPlausible}% to ${config.humidity.maxPlausible}%)`);
        } else {
            sanitized.humidity = Number(h.toFixed(2));
        }
    }

    // Validate Occupancy / People Count (if provided)
    const rawPeople = peopleCount !== undefined ? peopleCount : people;
    if (rawPeople !== undefined && rawPeople !== null && rawPeople !== '') {
        const p = parseInt(rawPeople, 10);
        if (isNaN(p)) {
            errors.push(`Non-integer people count: "${rawPeople}"`);
        } else if (p < config.peopleCount.minPlausible || p > config.peopleCount.maxPlausible) {
            errors.push(`Implausible occupancy count: ${p} (Plausible range: ${config.peopleCount.minPlausible} to ${config.peopleCount.maxPlausible})`);
        } else {
            sanitized.peopleCount = p;
        }
    }

    const isImplausible = errors.length > 0;
    return {
        isValid: !isImplausible,
        isImplausible,
        errors,
        sanitized: isImplausible ? null : sanitized
    };
}

/**
 * 2. Detect sudden temperature spikes or plunges.
 * Pure function: compares current reading against last known valid reading.
 *
 * @param {number} newTemp
 * @param {number} lastValidTemp
 * @param {Date|number} lastTimestamp
 * @param {Date|number} currentTimestamp
 * @param {Object} [config=FAULT_CONFIG]
 * @returns {Object|null} Anomaly description or null if normal
 */
function detectSuddenTemperatureChange(newTemp, lastValidTemp, lastTimestamp, currentTimestamp = Date.now(), config = FAULT_CONFIG) {
    if (newTemp === null || newTemp === undefined || lastValidTemp === null || lastValidTemp === undefined) {
        return null;
    }

    const t1 = new Date(lastTimestamp).getTime();
    const t2 = new Date(currentTimestamp).getTime();
    const elapsedSeconds = Math.max((t2 - t1) / 1000, 1); // Avoid division by zero
    const deltaTemp = Number((newTemp - lastValidTemp).toFixed(2));
    const absDelta = Math.abs(deltaTemp);

    // Condition A: Sudden step jump within short timeframe (< 30 seconds)
    if (elapsedSeconds <= 30 && absDelta >= config.temperature.maxInstantStep) {
        return {
            detected: true,
            severity: absDelta >= config.temperature.maxInstantStep * 1.5 ? 'CRITICAL' : 'HIGH',
            deltaTemp,
            elapsedSeconds: Math.round(elapsedSeconds),
            ratePerMinute: Number(((absDelta / elapsedSeconds) * 60).toFixed(2)),
            message: `Abnormal sudden temperature change: ${deltaTemp > 0 ? '+' : ''}${deltaTemp}°C within ${Math.round(elapsedSeconds)}s (Exceeds step threshold of ${config.temperature.maxInstantStep}°C)`
        };
    }

    // Condition B: Rapid sustained rate of change (> maxRatePerMinute over up to 5 minutes)
    if (elapsedSeconds > 30 && elapsedSeconds <= 300) {
        const ratePerMinute = (absDelta / elapsedSeconds) * 60;
        if (ratePerMinute >= config.temperature.maxRatePerMinute) {
            return {
                detected: true,
                severity: 'HIGH',
                deltaTemp,
                elapsedSeconds: Math.round(elapsedSeconds),
                ratePerMinute: Number(ratePerMinute.toFixed(2)),
                message: `Abnormal temperature rate of change: ${Number(ratePerMinute.toFixed(2))}°C/min (Threshold: ${config.temperature.maxRatePerMinute}°C/min)`
            };
        }
    }

    return null;
}

/**
 * 3. Detect stuck sensor readings over a historical sequence.
 * Pure function: checks for identical consecutive readings across a long window.
 *
 * @param {Array<Object>} historySamples Array of { temperature, timestamp }
 * @param {Object} [config=FAULT_CONFIG]
 * @returns {Object|null}
 */
function detectStuckSensor(historySamples, config = FAULT_CONFIG) {
    if (!historySamples || !Array.isArray(historySamples) || historySamples.length < config.stuckSensor.minSamples) {
        return null; // Not enough samples to safely determine
    }

    // Filter valid numeric temperatures
    const validSamples = historySamples.filter(s => s && typeof s.temperature === 'number' && !isNaN(s.temperature));
    if (validSamples.length < config.stuckSensor.minSamples) {
        return null;
    }

    // Check time duration spanned by these samples
    const oldestTime = new Date(validSamples[validSamples.length - 1].timestamp).getTime();
    const newestTime = new Date(validSamples[0].timestamp).getTime();
    const spanMinutes = (newestTime - oldestTime) / (60 * 1000);

    if (spanMinutes < config.stuckSensor.windowMinutes) {
        return null; // Has not spanned the required duration yet
    }

    const firstVal = validSamples[0].temperature;
    const allIdentical = validSamples.every(s => Math.abs(s.temperature - firstVal) <= config.stuckSensor.tolerance);

    if (allIdentical) {
        return {
            detected: true,
            severity: 'MEDIUM',
            sampleCount: validSamples.length,
            durationMinutes: Math.round(spanMinutes),
            frozenValue: firstVal,
            message: `Possible stuck sensor: Temperature unchanged at ${firstVal}°C across ${validSamples.length} samples over ${Math.round(spanMinutes)} minutes.`
        };
    }

    return null;
}

/**
 * 4. Forecast threshold violation using recent velocity.
 * Pure function.
 *
 * @param {number} currentTemp
 * @param {number|null} historicalTemp ~15-20 min ago
 * @param {number} windowMinutes
 * @param {Object} [config=FAULT_CONFIG]
 * @returns {Object|null}
 */
function predictThresholdViolation(currentTemp, historicalTemp, windowMinutes = 20, config = FAULT_CONFIG) {
    if (typeof currentTemp !== 'number' || typeof historicalTemp !== 'number' || isNaN(currentTemp) || isNaN(historicalTemp)) {
        return null;
    }

    const crit = config.temperature.criticalThreshold;
    // If already at or above critical, that is an active critical alarm, not a prediction
    if (currentTemp >= crit) {
        return null;
    }

    if (windowMinutes <= 0) return null;
    const delta = currentTemp - historicalTemp;
    const ratePerMinute = delta / windowMinutes; // °C per minute

    // Only forecast if warming up towards the threshold at a meaningful rate
    if (ratePerMinute > 0.05) {
        const remainingDegrees = crit - currentTemp;
        const minutesToBreach = Math.round(remainingDegrees / ratePerMinute);

        if (minutesToBreach > 0 && minutesToBreach <= config.temperature.lookaheadMinutes) {
            return {
                predicted: true,
                severity: minutesToBreach <= 5 ? 'HIGH' : 'MEDIUM',
                currentTemp,
                targetThreshold: crit,
                ratePerMinute: Number(ratePerMinute.toFixed(3)),
                estimatedMinutesToBreach: minutesToBreach,
                message: `Temperature rising at +${Number((ratePerMinute * 10).toFixed(1))}°C/10min. Projected to breach critical threshold (${crit}°C) in ~${minutesToBreach} minutes.`
            };
        }
    }

    return null;
}

/**
 * 5. Check if a device node is offline based on its last updated timestamp.
 *
 * @param {Date|number} lastUpdated
 * @param {Date|number} [now=Date.now()]
 * @param {Object} [config=FAULT_CONFIG]
 * @returns {Object|null}
 */
function evaluateDeviceOffline(lastUpdated, now = Date.now(), config = FAULT_CONFIG) {
    if (!lastUpdated) {
        return {
            offline: true,
            severity: 'HIGH',
            elapsedSeconds: null,
            message: 'Device has not reported any telemetry packets yet.'
        };
    }

    const lastTime = new Date(lastUpdated).getTime();
    if (isNaN(lastTime)) {
        return {
            offline: true,
            severity: 'HIGH',
            elapsedSeconds: null,
            message: 'Invalid lastUpdated timestamp recorded.'
        };
    }

    const currentTime = typeof now === 'number' ? now : new Date(now).getTime();
    const elapsedMs = currentTime - lastTime;

    if (elapsedMs > config.offlineTimeoutMs) {
        const elapsedSeconds = Math.round(elapsedMs / 1000);
        return {
            offline: true,
            severity: elapsedSeconds > 120 ? 'CRITICAL' : 'HIGH',
            elapsedSeconds,
            message: `Device offline: No telemetry received for ${elapsedSeconds} seconds (Timeout: ${Math.round(config.offlineTimeoutMs / 1000)}s)`
        };
    }

    return null;
}

// =========================================================================
// DATABASE & IN-MEMORY FAULT LIFECYCLE MANAGEMENT (Deduplication, Resolution, Querying)
// =========================================================================

const inMemoryFaults = new Map(); // key: `${room.toUpperCase()}_${faultType}`

/**
 * Record a new active fault or update lastSeen on an ongoing active fault to prevent duplicate spam.
 */
async function recordOrUpdateFault({ room, sensorType = 'DHT11', faultType, severity = 'MEDIUM', message, metric = 'general', metadata = {}, now = new Date() }) {
    const memKey = `${room.toUpperCase()}_${faultType}`;
    const faultObj = {
        _id: memKey,
        room,
        sensorType,
        faultType,
        severity,
        status: 'ACTIVE',
        message,
        metric,
        firstSeen: inMemoryFaults.has(memKey) ? inMemoryFaults.get(memKey).firstSeen : now,
        lastSeen: now,
        metadata
    };
    inMemoryFaults.set(memKey, faultObj);

    if (require('mongoose').connection.readyState === 1) {
        try {
            const existingFault = await SensorFault.findOne({
                room: new RegExp(`^${room}$`, 'i'),
                faultType,
                status: 'ACTIVE'
            });

            if (existingFault) {
                existingFault.lastSeen = now;
                existingFault.severity = severity;
                existingFault.message = message;
                existingFault.metadata = { ...existingFault.metadata, ...metadata };
                await existingFault.save();
                return existingFault;
            }

            const newFault = await SensorFault.create({
                room,
                sensorType,
                faultType,
                severity,
                status: 'ACTIVE',
                message,
                metric,
                firstSeen: now,
                lastSeen: now,
                metadata
            });

            console.log(`[Fault Engine] New ACTIVE Fault logged: [${room}] ${faultType} (${severity}) - ${message}`);
            return newFault;
        } catch (err) {
            console.error(`[Fault Engine] Error recording fault for ${room}:`, err.message);
        }
    }

    return faultObj;
}

/**
 * Auto-resolve an active fault when healthy/normal behavior is observed.
 */
async function resolveFault(room, faultType, now = new Date()) {
    const memKey = `${room.toUpperCase()}_${faultType}`;
    if (inMemoryFaults.has(memKey)) {
        const f = inMemoryFaults.get(memKey);
        f.status = 'RESOLVED';
        f.resolvedAt = now;
    }

    if (require('mongoose').connection.readyState === 1) {
        try {
            const result = await SensorFault.updateMany(
                {
                    room: new RegExp(`^${room}$`, 'i'),
                    faultType,
                    status: 'ACTIVE'
                },
                {
                    $set: {
                        status: 'RESOLVED',
                        resolvedAt: now
                    }
                }
            );

            if (result.modifiedCount > 0) {
                console.log(`[Fault Engine] Auto-RESOLVED fault: [${room}] ${faultType}`);
            }
            return result.modifiedCount;
        } catch (err) {
            console.error(`[Fault Engine] Error resolving fault ${faultType} for ${room}:`, err.message);
        }
    }
    return 1;
}

/**
 * Perform periodic offline sweep across all registered rooms.
 */
async function sweepOfflineDevices(config = FAULT_CONFIG, activeRoomsList = []) {
    try {
        let rooms = activeRoomsList;
        if (require('mongoose').connection.readyState === 1) {
            try {
                rooms = await CurrentEnvironment.find().lean();
            } catch (e) {
                rooms = activeRoomsList;
            }
        }
        const now = Date.now();

        for (const roomDoc of rooms) {
            const offlineEval = evaluateDeviceOffline(roomDoc.lastUpdated, now, config);
            if (offlineEval && offlineEval.offline) {
                await recordOrUpdateFault({
                    room: roomDoc.room,
                    sensorType: 'NODE',
                    faultType: 'DEVICE_OFFLINE',
                    severity: offlineEval.severity,
                    message: offlineEval.message,
                    metric: 'connectivity',
                    metadata: { elapsedSeconds: offlineEval.elapsedSeconds },
                    now: new Date(now)
                });
                try {
                    const { processOfflineIncident } = require('./alerts/alertIncidentService');
                    await processOfflineIncident({ room: roomDoc.room, timestamp: now });
                } catch (alertErr) {
                    // Safe handling: never crash fault sweep
                }
            } else if (offlineEval === null) {
                await resolveFault(roomDoc.room, 'DEVICE_OFFLINE', new Date(now));
                try {
                    const { resolveOfflineIncident } = require('./alerts/alertIncidentService');
                    await resolveOfflineIncident({ room: roomDoc.room, timestamp: now });
                } catch (alertErr) {
                    // Safe handling: never crash fault sweep
                }
            }
        }
    } catch (err) {
        console.error('[Fault Engine] Error during offline device sweep:', err.message);
    }
}

module.exports = {
    FAULT_CONFIG,
    inMemoryFaults,
    validateTelemetryPayload,
    detectSuddenTemperatureChange,
    detectStuckSensor,
    predictThresholdViolation,
    evaluateDeviceOffline,
    recordOrUpdateFault,
    resolveFault,
    sweepOfflineDevices
};
