const { 
    calculateEnvironmentTrend, 
    calculateTemperatureTrend, 
    calculateHumidityTrend, 
    TREND_CONFIG 
} = require('./services/environmentTrend');

const tests = [
    {
        name: 'TEST 1: Temperature 28°C -> 34°C (RISING, +6°C)',
        fn: () => {
            const res = calculateEnvironmentTrend({
                currentReading: { temperature: 34, humidity: 50 },
                historicalReading: { temperature: 28, humidity: 50 }
            });
            return res.temperature.trend === 'RISING' && res.temperature.change === 6;
        }
    },
    {
        name: 'TEST 2: Temperature 34°C -> 28°C (FALLING, -6°C)',
        fn: () => {
            const res = calculateEnvironmentTrend({
                currentReading: { temperature: 28, humidity: 50 },
                historicalReading: { temperature: 34, humidity: 50 }
            });
            return res.temperature.trend === 'FALLING' && res.temperature.change === -6;
        }
    },
    {
        name: 'TEST 3: Temperature 28°C -> 28.5°C (STABLE, +0.5°C)',
        fn: () => {
            const res = calculateEnvironmentTrend({
                currentReading: { temperature: 28.5, humidity: 50 },
                historicalReading: { temperature: 28, humidity: 50 }
            });
            return res.temperature.trend === 'STABLE' && Math.abs(res.temperature.change - 0.5) < 0.01;
        }
    },
    {
        name: 'TEST 4: Humidity 45% -> 55% (RISING, +10 percentage points)',
        fn: () => {
            const res = calculateEnvironmentTrend({
                currentReading: { temperature: 25, humidity: 55 },
                historicalReading: { temperature: 25, humidity: 45 }
            });
            return res.humidity.trend === 'RISING' && res.humidity.change === 10 && res.humidity.unit === 'percentage points';
        }
    },
    {
        name: 'TEST 5: Humidity 60% -> 50% (FALLING, -10 percentage points)',
        fn: () => {
            const res = calculateEnvironmentTrend({
                currentReading: { temperature: 25, humidity: 50 },
                historicalReading: { temperature: 25, humidity: 60 }
            });
            return res.humidity.trend === 'FALLING' && res.humidity.change === -10 && res.humidity.unit === 'percentage points';
        }
    },
    {
        name: 'TEST 6: Humidity 50% -> 53% (STABLE, +3 percentage points)',
        fn: () => {
            const res = calculateEnvironmentTrend({
                currentReading: { temperature: 25, humidity: 53 },
                historicalReading: { temperature: 25, humidity: 50 }
            });
            return res.humidity.trend === 'STABLE' && res.humidity.change === 3;
        }
    },
    {
        name: 'TEST 7: Insufficient historical data (historicalReading is null)',
        fn: () => {
            const res = calculateEnvironmentTrend({
                currentReading: { temperature: 34, humidity: 50 },
                historicalReading: null
            });
            return res.temperature.trend === 'UNKNOWN' && 
                   res.humidity.trend === 'UNKNOWN' && 
                   res.temperature.change === null && 
                   res.humidity.change === null;
        }
    },
    {
        name: 'TEST 8: Null current temperature',
        fn: () => {
            const res = calculateEnvironmentTrend({
                currentReading: { temperature: null, humidity: 50 },
                historicalReading: { temperature: 28, humidity: 50 }
            });
            return res.temperature.trend === 'UNKNOWN' && res.temperature.change === null;
        }
    },
    {
        name: 'TEST 9: NaN temperature',
        fn: () => {
            const res = calculateEnvironmentTrend({
                currentReading: { temperature: NaN, humidity: 50 },
                historicalReading: { temperature: 28, humidity: 50 }
            });
            return res.temperature.trend === 'UNKNOWN' && res.temperature.change === null;
        }
    },
    {
        name: 'TEST 10: Both temperature and humidity valid with different trends',
        fn: () => {
            const res = calculateEnvironmentTrend({
                currentReading: { temperature: 34, humidity: 50 }, // temp: 28 -> 34 (RISING)
                historicalReading: { temperature: 28, humidity: 60 } // hum: 60 -> 50 (FALLING)
            });
            return res.temperature.trend === 'RISING' && 
                   res.temperature.change === 6 && 
                   res.humidity.trend === 'FALLING' && 
                   res.humidity.change === -10 &&
                   res.summary.includes('Temperature is rising while humidity is falling');
        }
    }
];

let failed = 0;
console.log('--- RUNNING ENVIRONMENTAL TREND DETECTION TESTS ---\n');

tests.forEach((t) => {
    try {
        const passed = t.fn();
        if (passed) {
            console.log(`[PASS] ${t.name}`);
        } else {
            console.error(`[FAIL] ${t.name}`);
            failed++;
        }
    } catch (err) {
        console.error(`[ERROR] ${t.name}:`, err.message);
        failed++;
    }
});

console.log(`\nTOTAL: ${tests.length} tests. Passed: ${tests.length - failed}, Failed: ${failed}`);
if (failed > 0) {
    process.exit(1);
} else {
    console.log('ALL TREND TESTS PASSED SUCCESSFULLY!\n');
}
