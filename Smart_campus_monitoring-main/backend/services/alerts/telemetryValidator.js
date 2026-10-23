/**
 * Telemetry Validator for Alert Detection Pipeline
 *
 * Enforces strict validation:
 * 1. Live hardware verification (strictly excludes simulated, mock, demo, or fallback data).
 * 2. Room identity verification against authoritative hardware node configuration.
 * 3. Physical reading plausibility (reusing existing sensor fault detection rules).
 * 4. Timestamp freshness and validity checks.
 */

const { validateTelemetryPayload } = require('../sensorFaultDetection');
const { getAlertConfig } = require('./alertConfig');

/**
 * Validate incoming telemetry reading for alert processing
 *
 * @param {Object} reading
 * @param {string} reading.room - Room identifier
 * @param {number} [reading.temperature] - Temperature reading in °C
 * @param {number} [reading.humidity] - Relative humidity reading in %
 * @param {string} [reading.source] - Telemetry source ('LIVE_HARDWARE', 'SIMULATOR', etc.)
 * @param {boolean} [reading.mock] - Explicit mock/simulated flag
 * @param {boolean} [reading.simulated] - Explicit simulated flag
 * @param {boolean} [reading.isDemo] - Demo flag
 * @param {Date|number} [reading.timestamp] - Telemetry timestamp
 * @param {Object} [customConfig] - Optional config override for testing
 * @returns {Object} { isValid: boolean, reason: string|null, sanitized: Object|null }
 */
function validateLiveTelemetryForAlerts(reading, customConfig = null) {
    if (!reading || typeof reading !== 'object') {
        return { isValid: false, reason: 'EMPTY_PAYLOAD', sanitized: null };
    }

    const config = customConfig || getAlertConfig();

    // 1. Check for Simulated / Demo / Mock Flags
    if (
        reading.mock === true ||
        reading.simulated === true ||
        reading.isDemo === true ||
        reading.demo === true ||
        reading.source === 'SIMULATOR' ||
        reading.source === 'MOCK' ||
        reading.source === 'DEMO'
    ) {
        return { isValid: false, reason: 'SIMULATED_DATA_IGNORED', sanitized: null };
    }

    // 2. Authoritative Source Check
    // Genuine readings must specify source === 'LIVE_HARDWARE' or isLiveHardware === true
    if (reading.source !== 'LIVE_HARDWARE' && reading.isLiveHardware !== true) {
        return { isValid: false, reason: 'NON_LIVE_HARDWARE_SOURCE', sanitized: null };
    }

    // 3. Room Identity Validation
    const rawRoom = (reading.room || '').trim().toUpperCase();
    const targetRoom = (config.espRoom || 'LAB101').trim().toUpperCase();

    if (!rawRoom) {
        return { isValid: false, reason: 'MISSING_ROOM_IDENTIFIER', sanitized: null };
    }

    if (rawRoom !== targetRoom && rawRoom !== 'CC1') {
        return { isValid: false, reason: 'NON_HARDWARE_ROOM', sanitized: null };
    }

    // 4. Timestamp Freshness and Bounds
    const now = Date.now();
    const readingTime = reading.timestamp ? new Date(reading.timestamp).getTime() : now;

    if (isNaN(readingTime)) {
        return { isValid: false, reason: 'INVALID_TIMESTAMP', sanitized: null };
    }

    // Reject readings older than 60 seconds (stale)
    if (now - readingTime > 60 * 1000) {
        return { isValid: false, reason: 'STALE_OR_INVALID_TIMESTAMP', sanitized: null };
    }

    // Reject readings set more than 10 seconds into the future
    if (readingTime - now > 10 * 1000) {
        return { isValid: false, reason: 'FUTURE_TIMESTAMP_REJECTED', sanitized: null };
    }

    // 5. Plausibility Validation (Reuses authoritative sensorFaultDetection rules)
    const payloadValidation = validateTelemetryPayload({
        temperature: reading.temperature,
        humidity: reading.humidity,
        peopleCount: reading.peopleCount
    });

    if (payloadValidation.isImplausible) {
        return {
            isValid: false,
            reason: 'IMPLAUSIBLE_READING',
            errors: payloadValidation.errors,
            sanitized: null
        };
    }

    return {
        isValid: true,
        reason: null,
        sanitized: {
            room: targetRoom,
            temperature: payloadValidation.sanitized ? payloadValidation.sanitized.temperature : null,
            humidity: payloadValidation.sanitized ? payloadValidation.sanitized.humidity : null,
            peopleCount: payloadValidation.sanitized ? payloadValidation.sanitized.peopleCount : 0,
            timestamp: new Date(readingTime)
        }
    };
}

module.exports = {
    validateLiveTelemetryForAlerts
};
