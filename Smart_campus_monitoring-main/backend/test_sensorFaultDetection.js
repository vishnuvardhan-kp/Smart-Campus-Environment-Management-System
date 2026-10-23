/**
 * Automated Test Suite for Sensor Fault and Anomaly Detection Engine
 */

const {
    FAULT_CONFIG,
    validateTelemetryPayload,
    detectSuddenTemperatureChange,
    detectStuckSensor,
    predictThresholdViolation,
    evaluateDeviceOffline
} = require('./services/sensorFaultDetection');

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
    if (condition) {
        console.log(`[PASS] ${testName}`);
        passedTests++;
    } else {
        console.error(`[FAIL] ${testName}: ${details}`);
        failedTests++;
    }
}

console.log('================================================================');
console.log('RUNNING SENSOR FAULT AND ANOMALY DETECTION TEST SUITE');
console.log('================================================================\n');

// -----------------------------------------------------------------
// 1. Plausibility & Field Validation Tests
// -----------------------------------------------------------------
console.log('[1] Plausibility & Payload Validation Tests:');

const validPayload = { temperature: 24.5, humidity: 55.0, peopleCount: 12 };
const res1 = validateTelemetryPayload(validPayload);
assert(res1.isValid === true && !res1.isImplausible, 'Valid payload passes inspection');

const outOfBoundsTemp = { temperature: 145.0, humidity: 50.0 };
const res2 = validateTelemetryPayload(outOfBoundsTemp);
assert(res2.isImplausible === true && res2.errors.length > 0, 'Physically impossible temperature (145°C) flagged as implausible');

const outOfBoundsHum = { temperature: 24.0, humidity: 120.0 };
const res3 = validateTelemetryPayload(outOfBoundsHum);
assert(res3.isImplausible === true, 'Physically impossible humidity (120%) flagged as implausible');

const negativePeople = { temperature: 24.0, humidity: 50.0, peopleCount: -5 };
const res4 = validateTelemetryPayload(negativePeople);
assert(res4.isImplausible === true, 'Negative occupancy count (-5) flagged as implausible');

const nonNumeric = { temperature: 'INVALID_TEMP', humidity: 50.0 };
const res5 = validateTelemetryPayload(nonNumeric);
assert(res5.isImplausible === true, 'Non-numeric string temperature flagged as implausible');

const nullPayload = null;
const res6 = validateTelemetryPayload(nullPayload);
assert(res6.isImplausible === true, 'Null/malformed payload safely rejected without throwing');

// -----------------------------------------------------------------
// 2. Sudden Temperature Change Detection Tests
// -----------------------------------------------------------------
console.log('\n[2] Sudden Temperature Change Detection Tests:');

// Normal change: 0.5°C over 10 seconds
const normalChange = detectSuddenTemperatureChange(25.0, 24.5, Date.now() - 10000, Date.now());
assert(normalChange === null, 'Gradual small temperature change (+0.5°C) is normal');

// Sudden step spike: 7°C jump in 10 seconds
const suddenSpike = detectSuddenTemperatureChange(32.0, 25.0, Date.now() - 10000, Date.now());
assert(suddenSpike !== null && suddenSpike.detected && suddenSpike.deltaTemp === 7.0, 'Sudden step jump (+7°C in 10s) detected as anomaly');

// Sudden plunge: -6°C drop in 15 seconds
const suddenPlunge = detectSuddenTemperatureChange(19.0, 25.0, Date.now() - 15000, Date.now());
assert(suddenPlunge !== null && suddenPlunge.detected && suddenPlunge.deltaTemp === -6.0, 'Sudden step drop (-6°C in 15s) detected as anomaly');

// High sustained rate of change: 4°C rise over 60 seconds (rate = 4.0°C/min > 3.0 threshold)
const highRate = detectSuddenTemperatureChange(28.0, 24.0, Date.now() - 60000, Date.now());
assert(highRate !== null && highRate.detected && highRate.ratePerMinute >= 3.0, 'Abnormal sustained rate of change (+4°C in 60s) detected');

// -----------------------------------------------------------------
// 3. Stuck Sensor Detection Tests
// -----------------------------------------------------------------
console.log('\n[3] Stuck Sensor Detection Tests:');

const baseTime = Date.now();
// 12 samples over 22 minutes, all strictly identical at 24.0°C
const stuckSamples = [];
for (let i = 0; i < 12; i++) {
    stuckSamples.push({
        temperature: 24.0,
        timestamp: new Date(baseTime - (i * 2 * 60 * 1000)) // 2 min intervals (0 to 22 mins ago)
    });
}
const stuckResult = detectStuckSensor(stuckSamples);
assert(stuckResult !== null && stuckResult.detected === true, 'Stuck sensor detected (identical 24.0°C over 22 minutes)');

// Normal healthy varying samples
const normalSamples = [];
for (let i = 0; i < 12; i++) {
    normalSamples.push({
        temperature: 24.0 + (i % 3) * 0.4,
        timestamp: new Date(baseTime - (i * 2 * 60 * 1000))
    });
}
const normalResult = detectStuckSensor(normalSamples);
assert(normalResult === null, 'Healthy fluctuating readings are not falsely flagged as stuck');

// Insufficient duration (only 5 minutes)
const shortSamples = [];
for (let i = 0; i < 12; i++) {
    shortSamples.push({
        temperature: 24.0,
        timestamp: new Date(baseTime - (i * 20 * 1000)) // Only ~4 minutes total
    });
}
const shortResult = detectStuckSensor(shortSamples);
assert(shortResult === null, 'Short timeframe with identical readings is not flagged prematurely');

// -----------------------------------------------------------------
// 4. Threshold Prediction Tests
// -----------------------------------------------------------------
console.log('\n[4] Threshold Prediction Tests:');

// Rising from 26.0°C to 28.5°C over 20 minutes (velocity = +0.125°C/min)
// Critical threshold is 30.0°C. Remaining = 1.5°C -> Estimated ~12 minutes to breach
const risingPred = predictThresholdViolation(28.5, 26.0, 20);
assert(risingPred !== null && risingPred.predicted === true && risingPred.estimatedMinutesToBreach === 12,
    `Threshold violation accurately forecast (~12 min to breach ${FAULT_CONFIG.temperature.criticalThreshold}°C)`
);

// Falling from 29.0°C to 26.0°C (cooling down)
const coolingPred = predictThresholdViolation(26.0, 29.0, 20);
assert(coolingPred === null, 'Cooling/falling temperature produces no threshold breach prediction');

// Already exceeding critical threshold (31.5°C >= 30.0°C)
const alreadyExceeded = predictThresholdViolation(31.5, 29.0, 20);
assert(alreadyExceeded === null, 'Already critical temperature is not flagged as a future prediction');

// -----------------------------------------------------------------
// 5. Device Offline Evaluation Tests
// -----------------------------------------------------------------
console.log('\n[5] Device Offline Evaluation Tests:');

const recentUpdate = Date.now() - 10000; // 10 seconds ago
const onlineEval = evaluateDeviceOffline(recentUpdate);
assert(onlineEval === null, 'Device reporting 10s ago is marked ONLINE (not offline)');

const staleUpdate = Date.now() - 60000; // 60 seconds ago (> 45s threshold)
const offlineEval = evaluateDeviceOffline(staleUpdate);
assert(offlineEval !== null && offlineEval.offline === true, 'Device silent for 60s is detected as DEVICE_OFFLINE');

const noTimestamp = null;
const neverReportedEval = evaluateDeviceOffline(noTimestamp);
assert(neverReportedEval !== null && neverReportedEval.offline === true, 'Unregistered / null timestamp device is flagged as offline');

// -----------------------------------------------------------------
// Summary
// -----------------------------------------------------------------
console.log('\n================================================================');
console.log(`TOTAL TESTS: ${passedTests + failedTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failedTests}`);
console.log('================================================================');

if (failedTests > 0) {
    process.exit(1);
} else {
    console.log('ALL ANOMALY & FAULT DETECTION TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
}
