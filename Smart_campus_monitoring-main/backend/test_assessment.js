const { assessEnvironment, ENVIRONMENT_THRESHOLDS } = require('./services/environmentAssessment');

const tests = [
    {
        name: 'TEST 1: Normal temperature & humidity, Fan ON',
        input: { temperature: 25, humidity: 50, fan: 'ON' },
        expectedStatus: 'NORMAL',
        expectedReasonSubstring: 'within the preferred range',
        expectedRecSubstring: 'currently normal'
    },
    {
        name: 'TEST 2: Attention high temperature, Fan ON',
        input: { temperature: 30, humidity: 50, fan: 'ON' },
        expectedStatus: 'ATTENTION',
        expectedReasonSubstring: 'above the preferred range. Cooling is currently active.',
        expectedRecSubstring: 'Continue cooling and monitor the temperature.'
    },
    {
        name: 'TEST 3: Critical high temperature, Fan ON',
        input: { temperature: 34, humidity: 50, fan: 'ON' },
        expectedStatus: 'CRITICAL',
        expectedReasonSubstring: 'critically high. Cooling is currently active.',
        expectedRecSubstring: 'Continue cooling and monitor the temperature.'
    },
    {
        name: 'TEST 4: Critical high temperature, Fan OFF',
        input: { temperature: 34, humidity: 50, fan: 'OFF' },
        expectedStatus: 'CRITICAL',
        expectedReasonSubstring: 'fan is OFF',
        expectedRecSubstring: 'Enable cooling and monitor the temperature.'
    },
    {
        name: 'TEST 5: Attention high humidity, Fan OFF',
        input: { temperature: 25, humidity: 65, fan: 'OFF' },
        expectedStatus: 'ATTENTION',
        expectedReasonSubstring: 'Humidity is above the preferred range.',
        expectedRecSubstring: 'Monitor humidity and ventilation.'
    },
    {
        name: 'TEST 6: Critical high humidity, Fan OFF',
        input: { temperature: 25, humidity: 75, fan: 'OFF' },
        expectedStatus: 'CRITICAL',
        expectedReasonSubstring: 'Humidity is critically high.',
        expectedRecSubstring: 'Check ventilation and monitor humidity.'
    },
    {
        name: 'TEST 7: Critical temperature AND critical humidity, Fan ON',
        input: { temperature: 34, humidity: 75, fan: 'ON' },
        expectedStatus: 'CRITICAL',
        expectedReasonSubstring: 'critically high',
        expectedRecSubstring: 'Continue cooling and check room ventilation.'
    },
    {
        name: 'TEST 8: Null/incomplete sensor data',
        input: { temperature: null, humidity: null, fan: 'OFF' },
        expectedStatus: 'UNKNOWN',
        expectedReasonSubstring: 'incomplete',
        expectedRecSubstring: 'Wait for the next sensor update.'
    },
    {
        name: 'TEST 9 (Edge): Attention temperature, Fan OFF',
        input: { temperature: 30, humidity: 50, fan: 'OFF' },
        expectedStatus: 'ATTENTION',
        expectedReasonSubstring: 'above the preferred range and the fan is OFF.',
        expectedRecSubstring: 'Enable cooling and monitor the temperature.'
    },
    {
        name: 'TEST 10 (Edge): Critical low temperature (<18)',
        input: { temperature: 16, humidity: 50, fan: 'OFF' },
        expectedStatus: 'CRITICAL',
        expectedReasonSubstring: 'Temperature is critically low.',
        expectedRecSubstring: 'Inspect heating and room temperature.'
    },
    {
        name: 'TEST 11 (Edge): Critical low humidity (<30)',
        input: { temperature: 25, humidity: 25, fan: 'OFF' },
        expectedStatus: 'CRITICAL',
        expectedReasonSubstring: 'Humidity is critically low.',
        expectedRecSubstring: 'Check air circulation and indoor humidity levels.'
    },
    {
        name: 'TEST 12 (Edge): Missing humidity only (NaN/undefined)',
        input: { temperature: 34, humidity: undefined, fan: 'ON' },
        expectedStatus: 'UNKNOWN',
        expectedReasonSubstring: 'incomplete',
        expectedRecSubstring: 'Wait for the next sensor update.'
    }
];

let failed = 0;
console.log('--- RUNNING ENVIRONMENTAL ASSESSMENT TESTS ---\n');

tests.forEach((t, i) => {
    const res = assessEnvironment(t.input);
    const statusMatch = res.status === t.expectedStatus;
    const reasonMatch = res.reason.toLowerCase().includes(t.expectedReasonSubstring.toLowerCase());
    const recMatch = res.recommendation.toLowerCase().includes(t.expectedRecSubstring.toLowerCase());

    if (statusMatch && reasonMatch && recMatch) {
        console.log(`[PASS] ${t.name}`);
        console.log(`       -> Status: ${res.status}`);
        console.log(`       -> Reason: "${res.reason}"`);
        console.log(`       -> Rec:    "${res.recommendation}"`);
    } else {
        console.error(`[FAIL] ${t.name}`);
        console.error(`       Expected: Status=${t.expectedStatus}, Reason contains="${t.expectedReasonSubstring}", Rec contains="${t.expectedRecSubstring}"`);
        console.error(`       Received: Status=${res.status}, Reason="${res.reason}", Rec="${res.recommendation}"`);
        failed++;
    }
});

console.log(`\nTOTAL: ${tests.length} tests. Passed: ${tests.length - failed}, Failed: ${failed}`);
if (failed > 0) {
    process.exit(1);
} else {
    console.log('ALL TESTS PASSED SUCCESSFULLY!');
}
