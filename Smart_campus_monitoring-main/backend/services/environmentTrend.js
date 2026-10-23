/**
 * Real-Time Environmental Trend Detection Service
 *
 * Evaluates directional changes (RISING, FALLING, STABLE, UNKNOWN) for
 * temperature and humidity over a primary ~20-minute historical lookback window.
 */

const EnvironmentHistory = require('../models/EnvironmentHistory');
const mongoose = require('mongoose');

const TREND_CONFIG = {
    windowMinutes: 20,
    temperatureChangeThreshold: 1.0, // °C
    humidityChangeThreshold: 5.0,     // percentage points
    minWindowMinutes: 12,             // minimum lookback threshold (12 mins)
    maxWindowMinutes: 30              // maximum lookback threshold (30 mins)
};

/**
 * Validate numeric value
 */
function isValidNumber(val) {
    if (val === null || val === undefined || val === '') return false;
    const n = Number(val);
    return !isNaN(n) && isFinite(n);
}

/**
 * Calculate trend for temperature
 */
function calculateTemperatureTrend(currVal, histVal, config = TREND_CONFIG) {
    if (!isValidNumber(currVal) || !isValidNumber(histVal)) {
        return {
            trend: 'UNKNOWN',
            change: null,
            unit: '°C',
            observation: 'Not enough historical data to determine a trend.'
        };
    }

    const c = Number(currVal);
    const h = Number(histVal);
    // Round difference to 2 decimal places to avoid IEEE 754 precision issues
    const diff = Number((c - h).toFixed(2));
    const threshold = config.temperatureChangeThreshold;

    let trend = 'STABLE';
    let observation = '';

    if (diff > threshold) {
        trend = 'RISING';
        observation = `Temperature increased by ${Math.abs(diff)}°C over the last ${config.windowMinutes} minutes.`;
    } else if (diff < -threshold) {
        trend = 'FALLING';
        observation = `Temperature decreased by ${Math.abs(diff)}°C over the last ${config.windowMinutes} minutes.`;
    } else {
        trend = 'STABLE';
        observation = `Temperature remained relatively stable over the last ${config.windowMinutes} minutes.`;
    }

    return {
        trend,
        change: diff,
        unit: '°C',
        observation
    };
}

/**
 * Calculate trend for humidity
 */
function calculateHumidityTrend(currVal, histVal, config = TREND_CONFIG) {
    if (!isValidNumber(currVal) || !isValidNumber(histVal)) {
        return {
            trend: 'UNKNOWN',
            change: null,
            unit: 'percentage points',
            observation: 'Not enough historical data to determine a trend.'
        };
    }

    const c = Number(currVal);
    const h = Number(histVal);
    const diff = Number((c - h).toFixed(2));
    const threshold = config.humidityChangeThreshold;

    let trend = 'STABLE';
    let observation = '';

    if (diff > threshold) {
        trend = 'RISING';
        observation = `Humidity increased by ${Math.abs(diff)} percentage points over the last ${config.windowMinutes} minutes.`;
    } else if (diff < -threshold) {
        trend = 'FALLING';
        observation = `Humidity decreased by ${Math.abs(diff)} percentage points over the last ${config.windowMinutes} minutes.`;
    } else {
        trend = 'STABLE';
        observation = `Humidity remained relatively stable over the last ${config.windowMinutes} minutes.`;
    }

    return {
        trend,
        change: diff,
        unit: 'percentage points',
        observation
    };
}

/**
 * Generate short combined summary text
 */
function generateSummaryText(tempTrend, humTrend) {
    if (tempTrend === 'UNKNOWN' && humTrend === 'UNKNOWN') {
        return 'Not enough historical data to determine trends.';
    }
    if (tempTrend === 'UNKNOWN') {
        return `Humidity is ${humTrend.toLowerCase()}. Insufficient temperature history.`;
    }
    if (humTrend === 'UNKNOWN') {
        return `Temperature is ${tempTrend.toLowerCase()}. Insufficient humidity history.`;
    }

    if (tempTrend === 'STABLE' && humTrend === 'STABLE') {
        return 'Temperature and humidity remain relatively stable.';
    }
    if (tempTrend === 'RISING' && humTrend === 'RISING') {
        return 'Temperature and humidity are rising.';
    }
    if (tempTrend === 'FALLING' && humTrend === 'FALLING') {
        return 'Temperature and humidity are falling.';
    }
    if (tempTrend === 'RISING' && humTrend === 'STABLE') {
        return 'Temperature is rising while humidity remains stable.';
    }
    if (tempTrend === 'FALLING' && humTrend === 'STABLE') {
        return 'Temperature is falling while humidity remains stable.';
    }
    if (tempTrend === 'STABLE' && humTrend === 'RISING') {
        return 'Temperature remains stable while humidity is rising.';
    }
    if (tempTrend === 'STABLE' && humTrend === 'FALLING') {
        return 'Temperature remains stable while humidity is falling.';
    }
    if (tempTrend === 'RISING' && humTrend === 'FALLING') {
        return 'Temperature is rising while humidity is falling.';
    }
    if (tempTrend === 'FALLING' && humTrend === 'RISING') {
        return 'Temperature is falling while humidity is rising.';
    }
    return `Temperature is ${tempTrend.toLowerCase()} and humidity is ${humTrend.toLowerCase()}.`;
}

/**
 * Pure calculation function from current and historical readings
 */
function calculateEnvironmentTrend({ currentReading = {}, historicalReading = null, config = TREND_CONFIG }) {
    const tempResult = calculateTemperatureTrend(
        currentReading.temperature,
        historicalReading ? historicalReading.temperature : null,
        config
    );

    const humResult = calculateHumidityTrend(
        currentReading.humidity,
        historicalReading ? historicalReading.humidity : null,
        config
    );

    const summary = generateSummaryText(tempResult.trend, humResult.trend);

    return {
        windowMinutes: config.windowMinutes,
        temperature: tempResult,
        humidity: humResult,
        summary
    };
}

/**
 * Query historical reading closest to windowMinutes ago (typically 20 minutes)
 */
async function getHistoricalReadingForWindow(roomName, currentTimestamp, config = TREND_CONFIG) {
    if (!roomName) return null;
    if (mongoose.connection.readyState !== 1) return null;

    const baseTime = currentTimestamp ? new Date(currentTimestamp).getTime() : Date.now();
    const targetTimeMs = baseTime - config.windowMinutes * 60 * 1000;
    const minTime = new Date(baseTime - config.maxWindowMinutes * 60 * 1000);
    const maxTime = new Date(baseTime - config.minWindowMinutes * 60 * 1000);

    try {
        const candidates = await EnvironmentHistory.find({
            room: new RegExp(`^${roomName}$`, 'i'),
            timestamp: { $gte: minTime, $lte: maxTime }
        })
        .select('room temperature humidity timestamp')
        .lean();

        if (!candidates || candidates.length === 0) {
            return null;
        }

        // Pick candidate closest to targetTimeMs
        let closest = candidates[0];
        let smallestDiff = Math.abs(new Date(closest.timestamp).getTime() - targetTimeMs);

        for (let i = 1; i < candidates.length; i++) {
            const diff = Math.abs(new Date(candidates[i].timestamp).getTime() - targetTimeMs);
            if (diff < smallestDiff) {
                smallestDiff = diff;
                closest = candidates[i];
            }
        }

        return closest;
    } catch (err) {
        console.warn(`[environmentTrend] Error querying history for room ${roomName}:`, err.message);
        return null;
    }
}

/**
 * Helper to compute trend for a single room
 */
async function getTrendForRoom(roomData, config = TREND_CONFIG) {
    if (!roomData) {
        return calculateEnvironmentTrend({ currentReading: {}, historicalReading: null, config });
    }

    const roomName = roomData.room;
    const lastUpdated = roomData.lastUpdated;
    const historicalReading = await getHistoricalReadingForWindow(roomName, lastUpdated, config);

    return calculateEnvironmentTrend({
        currentReading: roomData,
        historicalReading,
        config
    });
}

module.exports = {
    TREND_CONFIG,
    calculateEnvironmentTrend,
    calculateTemperatureTrend,
    calculateHumidityTrend,
    getHistoricalReadingForWindow,
    getTrendForRoom
};
