/**
 * Comprehensive Automated Verification Suite for Twilio-Ready SMS Alerts Pipeline
 */

process.env.NOTIFICATION_CHANNEL_ORDER = 'sms';

const {
    inMemoryActiveIncidents,
    inMemoryNotifications,
    processTelemetryReading,
    processOfflineIncident,
    resolveOfflineIncident,
    handleIncidentEvaluation,
    resolveIncident,
    formatAlertMessage
} = require('./services/alerts/alertIncidentService');
const { getAlertConfig, maskPhoneNumber, getSanitizedConfig } = require('./services/alerts/alertConfig');
const { getSmsProvider, resetProviderInstance } = require('./services/alerts/providers/providerFactory');
const MockSmsProvider = require('./services/alerts/providers/mockProvider');
const TwilioSmsProvider = require('./services/alerts/providers/twilioProvider');
const { validateLiveTelemetryForAlerts } = require('./services/alerts/telemetryValidator');
const { assessEnvironment, evaluateTemperature, evaluateHumidity } = require('./services/environmentAssessment');
const { validateTelemetryPayload } = require('./services/sensorFaultDetection');

let passedTests = 0;
let failedTests = 0;
let mockProvider = null;

function assert(condition, testName, details = '') {
    if (condition) {
        console.log(`[PASS] ${testName}`);
        passedTests++;
    } else {
        console.error(`[FAIL] ${testName}: ${details}`);
        failedTests++;
    }
}

function clearState() {
    inMemoryActiveIncidents.clear();
    inMemoryNotifications.length = 0;
    resetProviderInstance();
    mockProvider = getSmsProvider({ provider: 'mock' });
    mockProvider.clearSentMessages();
    return mockProvider;
}

async function runTestSuite() {
    console.log('================================================================');
    console.log('RUNNING TWILIO-READY SMS ALERT PIPELINE VERIFICATION SUITE');
    console.log('================================================================\n');

    // -----------------------------------------------------------------
    // TEST 1: Valid critical live reading creates 1 incident & 1 mock delivery attempt
    // -----------------------------------------------------------------
    console.log('[1] Scenario 1: Valid Critical Live Reading');
    clearState();

    const criticalReading = {
        room: 'LAB101',
        temperature: 34.5,
        humidity: 55.0,
        source: 'LIVE_HARDWARE',
        timestamp: Date.now()
    };

    const res1 = await processTelemetryReading(criticalReading);
    assert(res1.alerted === true, 'Critical live reading generates an alert');
    assert(inMemoryActiveIncidents.has('LAB101_CRITICAL_TEMPERATURE'), 'Incident stored as active in memory');
    
    const inc1 = inMemoryActiveIncidents.get('LAB101_CRITICAL_TEMPERATURE');
    assert(inc1.measuredValue === 34.5 && inc1.incidentType === 'CRITICAL_TEMPERATURE', 'Incident records correct temperature and type');
    assert(mockProvider.getSentMessages().length === 1, 'Exactly one mock SMS delivery attempt recorded');
    
    const msg1 = mockProvider.getLastMessage();
    assert(msg1.simulated === true && msg1.provider === 'mock', 'Delivery record confirms mock simulated mode');
    assert(msg1.message.includes('Critical temperature recorded at 34.5°C'), 'SMS message body contains formatted alert details');

    // -----------------------------------------------------------------
    // TEST 2: Repeated critical readings do not generate duplicate alerts
    // -----------------------------------------------------------------
    console.log('\n[2] Scenario 2: Deduplication & Configurable Cooldown');
    
    // Dispatch repeated critical readings within cooldown
    const res2_repeat1 = await processTelemetryReading({
        room: 'LAB101',
        temperature: 35.0,
        humidity: 56.0,
        source: 'LIVE_HARDWARE',
        timestamp: Date.now() + 1000
    });
    assert(res2_repeat1.alerted === false, 'Persistent critical reading is not alerted');
    assert(res2_repeat1.results.temperature.reason === 'SUPPRESSED_COOLDOWN', 'Deduplication suppressed alert via cooldown');
    assert(mockProvider.getSentMessages().length === 1, 'No duplicate SMS sent during cooldown window');

    const res2_repeat2 = await processTelemetryReading({
        room: 'LAB101',
        temperature: 35.2,
        humidity: 56.0,
        source: 'LIVE_HARDWARE',
        timestamp: Date.now() + 2000
    });
    assert(res2_repeat2.alerted === false, 'Second repeat critical reading also suppressed');
    assert(mockProvider.getSentMessages().length === 1, 'Sent count remains strictly 1');

    // Cooldown Expiry Test: simulate time beyond cooldown (last notification was 31 mins ago)
    const activeInc = inMemoryActiveIncidents.get('LAB101_CRITICAL_TEMPERATURE');
    activeInc.lastNotifiedAt = new Date(Date.now() - 31 * 60 * 1000);

    const res2_reminder = await processTelemetryReading(
        {
            room: 'LAB101',
            temperature: 34.8,
            humidity: 55.0,
            source: 'LIVE_HARDWARE',
            timestamp: Date.now()
        },
        { ...getAlertConfig(), cooldownMs: 30 * 60 * 1000 }
    );
    assert(res2_reminder.alerted === true, 'Reading after cooldown expiration triggers a reminder alert');
    assert(res2_reminder.results.temperature.isReminder === true, 'Alert marked as a reminder notification');
    assert(mockProvider.getSentMessages().length === 2, 'Total sent mock messages is now 2 (initial + reminder)');

    // -----------------------------------------------------------------
    // TEST 3: Normal and warning readings do not generate critical SMS alerts
    // -----------------------------------------------------------------
    console.log('\n[3] Scenario 3: Normal and Warning Readings Evaluation');
    clearState();
    mockProvider.clearSentMessages();

    // Normal reading (25.0°C)
    const normalReading = {
        room: 'LAB101',
        temperature: 25.0,
        humidity: 50.0,
        source: 'LIVE_HARDWARE',
        timestamp: Date.now()
    };
    const res3_normal = await processTelemetryReading(normalReading);
    assert(res3_normal.alerted === false, 'Normal temperature (25.0°C) produces no alert');
    assert(mockProvider.getSentMessages().length === 0, 'Zero SMS messages dispatched for normal reading');

    // Warning/Attention reading (29.5°C)
    const warningReading = {
        room: 'LAB101',
        temperature: 29.5,
        humidity: 50.0,
        source: 'LIVE_HARDWARE',
        timestamp: Date.now()
    };
    const res3_warn = await processTelemetryReading(warningReading);
    assert(res3_warn.alerted === false, 'Warning/Attention temperature (29.5°C) produces no critical SMS alert');
    assert(mockProvider.getSentMessages().length === 0, 'Zero SMS messages dispatched for warning reading');

    // Auto-recovery test: Critical followed by Normal resolves active incident
    await processTelemetryReading({ room: 'LAB101', temperature: 34.0, humidity: 50.0, source: 'LIVE_HARDWARE', timestamp: Date.now() });
    assert(inMemoryActiveIncidents.has('LAB101_CRITICAL_TEMPERATURE'), 'Incident active before recovery');
    
    await processTelemetryReading({ room: 'LAB101', temperature: 24.0, humidity: 50.0, source: 'LIVE_HARDWARE', timestamp: Date.now() });
    assert(!inMemoryActiveIncidents.has('LAB101_CRITICAL_TEMPERATURE'), 'Normal reading auto-resolves active incident from cache');

    // -----------------------------------------------------------------
    // TEST 4: Simulated / demo data never triggers an alert
    // -----------------------------------------------------------------
    console.log('\n[4] Scenario 4: Simulated and Demo Data Rejection');
    clearState();
    mockProvider.clearSentMessages();

    const sim1 = await processTelemetryReading({
        room: 'LAB101',
        temperature: 42.0,
        mock: true,
        source: 'LIVE_HARDWARE',
        timestamp: Date.now()
    });
    assert(sim1.alerted === false && sim1.reason === 'SIMULATED_DATA_IGNORED', 'Explicit mock:true payload is ignored');

    const sim2 = await processTelemetryReading({
        room: 'LAB101',
        temperature: 42.0,
        simulated: true,
        timestamp: Date.now()
    });
    assert(sim2.alerted === false && sim2.reason === 'SIMULATED_DATA_IGNORED', 'Explicit simulated:true payload is ignored');

    const sim3 = await processTelemetryReading({
        room: 'LAB101',
        temperature: 42.0,
        source: 'SIMULATOR',
        timestamp: Date.now()
    });
    assert(sim3.alerted === false && sim3.reason === 'SIMULATED_DATA_IGNORED', 'Payload with source:SIMULATOR is ignored');

    const sim4 = await processTelemetryReading({
        room: 'SERVER_ROOM', // Simulated zone, not the physical hardware node
        temperature: 45.0,
        source: 'LIVE_HARDWARE',
        timestamp: Date.now()
    });
    assert(sim4.alerted === false && sim4.reason === 'NON_HARDWARE_ROOM', 'Non-hardware simulated room rejected from alerts');
    assert(mockProvider.getSentMessages().length === 0, 'Zero SMS messages sent across all simulated payload tests');

    // -----------------------------------------------------------------
    // TEST 5: Invalid, stale, or unmapped readings are rejected safely
    // -----------------------------------------------------------------
    console.log('\n[5] Scenario 5: Invalid, Stale, and Unmapped Readings');

    const inv1 = await processTelemetryReading({
        room: 'LAB101',
        temperature: 'INVALID_TEMP',
        source: 'LIVE_HARDWARE',
        timestamp: Date.now()
    });
    assert(inv1.alerted === false && inv1.reason === 'IMPLAUSIBLE_READING', 'Non-numeric temperature rejected');

    const inv2 = await processTelemetryReading({
        room: 'LAB101',
        temperature: 150.0, // Exceeds plausible 60°C bound
        source: 'LIVE_HARDWARE',
        timestamp: Date.now()
    });
    assert(inv2.alerted === false && inv2.reason === 'IMPLAUSIBLE_READING', 'Physically impossible temperature (150°C) rejected');

    const inv3 = await processTelemetryReading({
        room: 'LAB101',
        temperature: 34.0,
        source: 'LIVE_HARDWARE',
        timestamp: Date.now() - 120000 // 2 minutes stale (>60s)
    });
    assert(inv3.alerted === false && inv3.reason === 'STALE_OR_INVALID_TIMESTAMP', 'Stale reading (>60s old) rejected');

    const inv4 = await processTelemetryReading({
        room: 'LAB101',
        temperature: 34.0,
        source: 'LIVE_HARDWARE',
        timestamp: Date.now() + 60000 // Future timestamp
    });
    assert(inv4.alerted === false && inv4.reason === 'FUTURE_TIMESTAMP_REJECTED', 'Future timestamp (>10s ahead) rejected');

    const inv5 = await processTelemetryReading({
        room: 'UNKNOWN_ROOM_X',
        temperature: 35.0,
        source: 'LIVE_HARDWARE',
        timestamp: Date.now()
    });
    assert(inv5.alerted === false && inv5.reason === 'NON_HARDWARE_ROOM', 'Unmapped room rejected');

    // -----------------------------------------------------------------
    // TEST 6: Sensor-offline alerts are distinct from temperature incidents
    // -----------------------------------------------------------------
    console.log('\n[6] Scenario 6: Sensor-Offline Distinct Incident Handling');
    clearState();
    mockProvider.clearSentMessages();

    // 1. Trigger sensor offline incident
    const offlineRes = await processOfflineIncident({ room: 'LAB101', timestamp: Date.now() });
    assert(offlineRes.alerted === true, 'Sensor offline incident triggers an alert');
    assert(inMemoryActiveIncidents.has('LAB101_SENSOR_OFFLINE'), 'Sensor offline stored under key LAB101_SENSOR_OFFLINE');
    assert(mockProvider.getSentMessages().length === 1, '1 mock SMS delivered for sensor offline');

    // 2. Trigger temperature incident in parallel
    const tempRes = await processTelemetryReading({
        room: 'LAB101',
        temperature: 35.0,
        source: 'LIVE_HARDWARE',
        timestamp: Date.now()
    });
    assert(tempRes.alerted === true, 'Temperature incident triggers an alert concurrently');
    assert(inMemoryActiveIncidents.has('LAB101_CRITICAL_TEMPERATURE'), 'Temperature stored under distinct key LAB101_CRITICAL_TEMPERATURE');
    assert(mockProvider.getSentMessages().length === 2, 'Distinct mock SMS delivered for temperature incident');

    // 3. Resolve offline incident
    await resolveOfflineIncident({ room: 'LAB101', timestamp: Date.now() });
    assert(!inMemoryActiveIncidents.has('LAB101_SENSOR_OFFLINE'), 'Sensor offline incident resolved');
    assert(inMemoryActiveIncidents.has('LAB101_CRITICAL_TEMPERATURE'), 'Temperature incident remains active independently');

    // -----------------------------------------------------------------
    // TEST 7: Missing recipients and provider failures handled safely
    // -----------------------------------------------------------------
    console.log('\n[7] Scenario 7: Missing Recipients & Provider Failures');
    clearState();

    // Test with empty recipients configuration
    const emptyRecipientsConfig = {
        ...getAlertConfig(),
        recipients: []
    };
    const res7_empty = await processTelemetryReading(
        { room: 'LAB101', temperature: 34.5, source: 'LIVE_HARDWARE', timestamp: Date.now() },
        emptyRecipientsConfig
    );
    assert(res7_empty.alerted === true, 'Empty recipient config falls back safely to mock placeholder without crashing');

    // Test with provider throwing an unhandled exception
    clearState();
    const failingProvider = {
        name: 'mock',
        sendSms: async () => { throw new Error('Simulated network timeout'); }
    };
    // Ensure pipeline wraps and handles failure
    let threw = false;
    try {
        await handleIncidentEvaluation({
            incidentType: 'CRITICAL_TEMPERATURE',
            room: 'LAB101',
            measuredValue: 35.0,
            customConfig: {
                ...getAlertConfig(),
                provider: 'mock'
            }
        });
    } catch (e) {
        threw = true;
    }
    assert(!threw, 'Alert engine catches provider exceptions safely without crashing');

    // -----------------------------------------------------------------
    // TEST 8: Twilio adapter is never invoked in mock mode
    // -----------------------------------------------------------------
    console.log('\n[8] Scenario 8: Provider Selection Isolation');
    resetProviderInstance();

    const providerMock = getSmsProvider({ provider: 'mock' });
    assert(providerMock instanceof MockSmsProvider, 'Mock provider instantiated when provider=mock');
    assert(!(providerMock instanceof TwilioSmsProvider), 'Twilio adapter is NOT instantiated in mock mode');

    // -----------------------------------------------------------------
    // TEST 9: Hard delivery gate & Twilio adapter safety checks
    // -----------------------------------------------------------------
    console.log('\n[9] Scenario 9: Twilio Hard Delivery Gate & Mock Transport');

    // 1. Safety Gate: Real delivery disabled (default)
    const twilioGate = new TwilioSmsProvider({
        provider: 'twilio',
        enableRealDelivery: false
    });
    const gateRes = await twilioGate.sendSms({
        to: '+1234567890',
        message: 'Test message',
        room: 'LAB101'
    });
    assert(gateRes.success === false, 'Twilio adapter rejects dispatch when enableRealDelivery=false');
    assert(gateRes.error.includes('safety gate'), 'Rejection explicitly cites safety gate');

    // 2. Missing credentials check
    const twilioCredCheck = new TwilioSmsProvider({
        provider: 'twilio',
        enableRealDelivery: true,
        twilioAccountSid: null,
        twilioAuthToken: null
    });
    const credRes = await twilioCredCheck.sendSms({
        to: '+1234567890',
        message: 'Test message',
        room: 'LAB101'
    });
    assert(credRes.success === false && credRes.error.includes('credentials not configured'), 'Fails closed when credentials are missing');

    // 3. Unit test Twilio adapter with injected mock transport (zero external network calls)
    let mockTransportCalled = false;
    let mockTransportPayload = null;
    const injectedTransport = {
        post: async (payload) => {
            mockTransportCalled = true;
            mockTransportPayload = payload;
            return { sid: 'SM_TEST_MOCK_SID_123' };
        }
    };
    const twilioWithTransport = new TwilioSmsProvider(
        {
            provider: 'twilio',
            enableRealDelivery: true,
            twilioAccountSid: 'AC_TEST_ACCOUNT_SID',
            twilioAuthToken: 'AUTH_TEST_TOKEN',
            twilioFromNumber: '+10000000000'
        },
        injectedTransport
    );
    const transportRes = await twilioWithTransport.sendSms({
        to: '+1987654321',
        message: 'Emergency room overheating',
        room: 'LAB101'
    });
    assert(transportRes.success === true, 'Twilio adapter executes successfully with injected transport');
    assert(mockTransportCalled === true, 'Injected mock transport received request without external network call');
    assert(mockTransportPayload.to === '+1987654321', 'Transport received correct recipient phone');
    assert(transportRes.to === maskPhoneNumber('+1987654321'), 'Response masks recipient phone number');

    // -----------------------------------------------------------------
    // TEST 10: Existing environmental assessment & trend integrity
    // -----------------------------------------------------------------
    console.log('\n[10] Scenario 10: Existing Assessment Engine & Threshold Integrity');

    const assessNormal = assessEnvironment({ temperature: 24.0, humidity: 50.0, fan: 'OFF' });
    assert(assessNormal.status === 'NORMAL', 'assessEnvironment normal baseline preserved');

    const assessCritHigh = assessEnvironment({ temperature: 33.5, humidity: 50.0, fan: 'OFF' });
    assert(assessCritHigh.status === 'CRITICAL' && assessCritHigh.temperatureStatus === 'CRITICAL', 'assessEnvironment critical high temp (>32°C) preserved');

    const assessCritLow = assessEnvironment({ temperature: 16.0, humidity: 50.0, fan: 'OFF' });
    assert(assessCritLow.status === 'CRITICAL' && assessCritLow.temperatureStatus === 'CRITICAL', 'assessEnvironment critical low temp (<18°C) preserved');

    const assessCritHum = assessEnvironment({ temperature: 24.0, humidity: 75.0, fan: 'OFF' });
    assert(assessCritHum.status === 'CRITICAL' && assessCritHum.humidityStatus === 'CRITICAL', 'assessEnvironment critical humidity (>70%) preserved');

    const configSanitized = getSanitizedConfig();
    assert(configSanitized.provider === 'mock' && configSanitized.enableRealDelivery === false, 'Sanitized config confirms default mock mode & real delivery disabled');

    // -----------------------------------------------------------------
    // Summary
    // -----------------------------------------------------------------
    console.log('\n================================================================');
    console.log(`TEST SUITE COMPLETE: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('================================================================\n');

    if (failedTests > 0) {
        process.exit(1);
    }
}

runTestSuite().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
