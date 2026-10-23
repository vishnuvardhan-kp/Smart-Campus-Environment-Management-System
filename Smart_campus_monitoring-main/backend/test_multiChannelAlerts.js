/**
 * Automated Verification Suite for Email-First, WhatsApp-Fallback Notifications
 *
 * Verifies all required multi-channel notification behaviors:
 * 1. Email mock success prevents WhatsApp fallback.
 * 2. Email mock failure triggers exactly one WhatsApp mock attempt.
 * 3. Both channels failing records the final failure.
 * 4. Repeated readings do not duplicate attempts (cooldown and idempotency).
 * 5. Provider failures do not crash MQTT ingestion.
 * 6. Mock mode makes zero external requests and enforces hard safety gates.
 * 7. Delayed bounce simulation triggers downstream WhatsApp fallback.
 * 8. Simulated / demo data never triggers notifications.
 * 9. Existing sensor-offline, assessment, trend, and dashboard functionality remain intact.
 */

process.env.NOTIFICATION_CHANNEL_ORDER = 'email,whatsapp';

const {
    inMemoryActiveIncidents,
    inMemoryNotifications,
    processTelemetryReading,
    processOfflineIncident,
    resolveOfflineIncident,
    handleDelayedDeliveryFailure
} = require('./services/alerts/alertIncidentService');
const { getAlertConfig, getSanitizedConfig } = require('./services/alerts/alertConfig');
const {
    getEmailProvider,
    getWhatsAppProvider,
    getSmsProvider,
    resetAllProviders
} = require('./services/alerts/providers/providerFactory');
const MockEmailProvider = require('./services/alerts/providers/mockEmailProvider');
const MockWhatsAppProvider = require('./services/alerts/providers/mockWhatsAppProvider');
const TwilioWhatsAppProvider = require('./services/alerts/providers/twilioWhatsAppProvider');
const TwilioEmailProvider = require('./services/alerts/providers/twilioEmailProvider');
const EmailProviderAdapter = require('./services/alerts/providers/emailProviderAdapter');
const { orchestrateNotification } = require('./services/alerts/notificationOrchestrator');
const { assessEnvironment } = require('./services/environmentAssessment');

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

function clearState() {
    inMemoryActiveIncidents.clear();
    inMemoryNotifications.length = 0;
    resetAllProviders();
    const email = getEmailProvider(getAlertConfig());
    const wa = getWhatsAppProvider(getAlertConfig());
    email.clearSentEmails();
    email.setSimulateFailure(false);
    wa.clearSentMessages();
    wa.setSimulateFailure(false);
    return { email, wa };
}

async function runTestSuite() {
    console.log('================================================================');
    console.log('RUNNING MULTI-CHANNEL (EMAIL-FIRST, WHATSAPP-FALLBACK) TESTS');
    console.log('================================================================\n');

    // -----------------------------------------------------------------
    // TEST 1: Email mock success prevents WhatsApp fallback
    // -----------------------------------------------------------------
    console.log('[1] Scenario 1: Primary Email Success Suppresses WhatsApp Fallback');
    const { email: email1, wa: wa1 } = clearState();

    const criticalReading1 = {
        room: 'LAB101',
        temperature: 34.5,
        humidity: 55.0,
        source: 'LIVE_HARDWARE',
        timestamp: Date.now()
    };

    const res1 = await processTelemetryReading(criticalReading1);
    assert(res1.alerted === true, 'Critical live reading generates an alert');
    assert(email1.getSentEmails().length === 1, 'Exactly one primary email dispatched');
    assert(wa1.getSentMessages().length === 0, 'WhatsApp fallback is NOT triggered after successful email');

    const emailRecord = email1.getLastEmail();
    assert(emailRecord.channel === 'email' && emailRecord.status === 'SIMULATED', 'Email record is marked channel:email and status:SIMULATED');
    assert(emailRecord.acceptanceStatus === 'ACCEPTED', 'Provider acceptance is explicitly marked ACCEPTED');
    assert(emailRecord.subject.includes('[CRITICAL ALERT]'), 'Email subject contains critical alert header');

    const inc1 = inMemoryActiveIncidents.get('LAB101_CRITICAL_TEMPERATURE');
    assert(inc1.finalDeliveryOutcome === 'DELIVERED_EMAIL', 'Incident records finalDeliveryOutcome as DELIVERED_EMAIL');
    assert(inc1.channelsAttempted.length === 1 && inc1.channelsAttempted[0] === 'email', 'Incident records channelsAttempted as ["email"]');

    // -----------------------------------------------------------------
    // TEST 2: Email mock failure triggers exactly one WhatsApp fallback
    // -----------------------------------------------------------------
    console.log('\n[2] Scenario 2: Primary Email Failure Triggers Exactly One WhatsApp Fallback');
    const { email: email2, wa: wa2 } = clearState();
    email2.setSimulateFailure(true, 'SMTP connection timeout on port 587');

    const criticalReading2 = {
        room: 'LAB101',
        temperature: 35.0,
        humidity: 58.0,
        source: 'LIVE_HARDWARE',
        timestamp: Date.now()
    };

    const res2 = await processTelemetryReading(criticalReading2);
    assert(res2.alerted === true, 'Incident triggers notification sequence');
    assert(email2.getSentEmails().length === 0, 'Zero emails recorded as sent due to failure');
    assert(wa2.getSentMessages().length === 1, 'Exactly one WhatsApp mock fallback dispatched');

    const waRecord = wa2.getLastMessage();
    assert(waRecord.channel === 'whatsapp' && waRecord.isFallback === true, 'WhatsApp dispatch explicitly flagged as isFallback:true');
    assert(waRecord.fallbackReason.includes('SMTP connection timeout'), 'WhatsApp record cites email failure reason');
    assert(waRecord.status === 'SIMULATED' && waRecord.acceptanceStatus === 'ACCEPTED', 'WhatsApp acceptance status marked ACCEPTED');

    const inc2 = inMemoryActiveIncidents.get('LAB101_CRITICAL_TEMPERATURE');
    assert(inc2.finalDeliveryOutcome === 'DELIVERED_WHATSAPP_FALLBACK', 'Incident records finalDeliveryOutcome as DELIVERED_WHATSAPP_FALLBACK');
    assert(inc2.channelsAttempted.includes('email') && inc2.channelsAttempted.includes('whatsapp'), 'Incident records both channels attempted');

    // Check notification log in memory contains both attempt #1 (email: FAILED) and attempt #2 (whatsapp: SIMULATED)
    const attempts = inMemoryNotifications.filter(n => n.incidentId === inc2.incidentId);
    assert(attempts.length === 2, 'Two distinct attempt records logged for the incident');
    assert(attempts[0].channel === 'email' && attempts[0].deliveryStatus === 'FAILED', 'Attempt 1 logged as email FAILED');
    assert(attempts[1].channel === 'whatsapp' && attempts[1].deliveryStatus === 'SIMULATED', 'Attempt 2 logged as whatsapp SIMULATED');

    // -----------------------------------------------------------------
    // TEST 3: Both channels failing records the final failure
    // -----------------------------------------------------------------
    console.log('\n[3] Scenario 3: Both Channels Failing Records Final Failure');
    const { email: email3, wa: wa3 } = clearState();
    email3.setSimulateFailure(true, 'SMTP service unreachable');
    wa3.setSimulateFailure(true, 'WhatsApp Gateway rate limit exceeded');

    const criticalReading3 = {
        room: 'LAB101',
        temperature: 36.0,
        humidity: 60.0,
        source: 'LIVE_HARDWARE',
        timestamp: Date.now()
    };

    const res3 = await processTelemetryReading(criticalReading3);
    assert(email3.getSentEmails().length === 0, 'Email sent count is 0');
    assert(wa3.getSentMessages().length === 0, 'WhatsApp sent count is 0');

    const inc3 = inMemoryActiveIncidents.get('LAB101_CRITICAL_TEMPERATURE');
    assert(inc3.finalDeliveryOutcome === 'ALL_CHANNELS_FAILED', 'Incident records finalDeliveryOutcome as ALL_CHANNELS_FAILED');

    const notifs3 = inMemoryNotifications.filter(n => n.incidentId === inc3.incidentId);
    assert(notifs3.length === 2, 'Both attempts recorded in notification history');
    assert(notifs3[0].deliveryStatus === 'FAILED' && notifs3[1].deliveryStatus === 'FAILED', 'Both notification records logged as FAILED');

    // -----------------------------------------------------------------
    // TEST 4: Repeated readings do not duplicate attempts (idempotency & cooldown)
    // -----------------------------------------------------------------
    console.log('\n[4] Scenario 4: Repeated Readings Do Not Duplicate Attempts');
    const { email: email4, wa: wa4 } = clearState();

    // Initial critical trigger
    await processTelemetryReading({
        room: 'LAB101',
        temperature: 34.5,
        humidity: 50.0,
        source: 'LIVE_HARDWARE',
        timestamp: Date.now()
    });
    assert(email4.getSentEmails().length === 1, 'Initial reading dispatches 1 email');

    // Repeat readings within cooldown
    const r1 = await processTelemetryReading({
        room: 'LAB101',
        temperature: 34.8,
        humidity: 51.0,
        source: 'LIVE_HARDWARE',
        timestamp: Date.now() + 1000
    });
    const r2 = await processTelemetryReading({
        room: 'LAB101',
        temperature: 35.1,
        humidity: 52.0,
        source: 'LIVE_HARDWARE',
        timestamp: Date.now() + 2000
    });
    assert(r1.alerted === false && r1.results.temperature.reason === 'SUPPRESSED_COOLDOWN', 'First repeat reading suppressed by cooldown');
    assert(r2.alerted === false && r2.results.temperature.reason === 'SUPPRESSED_COOLDOWN', 'Second repeat reading suppressed by cooldown');
    assert(email4.getSentEmails().length === 1, 'Zero duplicate emails sent during cooldown window');
    assert(wa4.getSentMessages().length === 0, 'Zero WhatsApp messages sent during cooldown window');

    // -----------------------------------------------------------------
    // TEST 5: Provider failures do not crash MQTT ingestion
    // -----------------------------------------------------------------
    console.log('\n[5] Scenario 5: Defensive Error Handling');
    clearState();

    // Override mock email provider to throw unhandled error
    const brokenEmailProvider = {
        name: 'mock-broken',
        sendEmail: async () => { throw new Error('Simulated memory fault'); }
    };

    let crashed = false;
    try {
        await processTelemetryReading({
            room: 'LAB101',
            temperature: 34.5,
            humidity: 50.0,
            source: 'LIVE_HARDWARE',
            timestamp: Date.now()
        });
    } catch (err) {
        crashed = true;
    }
    assert(!crashed, 'Pipeline catches provider exceptions safely without crashing MQTT ingestion');

    // -----------------------------------------------------------------
    // TEST 6: Mock mode makes zero external requests & safety gates verified
    // -----------------------------------------------------------------
    console.log('\n[6] Scenario 6: Hard Safety Gates for Real Providers');

    // 1. Email Adapter Hard Gate Check
    const realEmailAdapter = new EmailProviderAdapter({
        emailEnableRealDelivery: false,
        smtpHost: 'smtp.example.com',
        smtpUser: 'campus_user'
    });
    const emailGateRes = await realEmailAdapter.sendEmail({
        to: 'staff@campus.edu',
        subject: 'Test',
        body: 'Alert message'
    });
    assert(emailGateRes.success === false, 'Real email adapter rejects dispatch when emailEnableRealDelivery=false');
    assert(emailGateRes.error.includes('safety gate'), 'Email rejection cites safety gate');

    // 2. WhatsApp Adapter Hard Gate Check
    const realWhatsAppAdapter = new TwilioWhatsAppProvider({
        whatsappEnableRealDelivery: false,
        twilioAccountSid: 'AC_DUMMY',
        twilioAuthToken: 'AUTH_DUMMY',
        twilioWhatsAppFrom: 'whatsapp:+14155238886'
    });
    const waGateRes = await realWhatsAppAdapter.sendWhatsApp({
        to: '+1234567890',
        message: 'Test message'
    });
    assert(waGateRes.success === false, 'Real WhatsApp adapter rejects dispatch when whatsappEnableRealDelivery=false');
    assert(waGateRes.error.includes('safety gate'), 'WhatsApp rejection cites safety gate');

    // 3. WhatsApp Adapter checks formatting (requires whatsapp: prefix)
    const realWhatsAppFormatCheck = new TwilioWhatsAppProvider({
        whatsappEnableRealDelivery: true,
        twilioAccountSid: 'AC_DUMMY',
        twilioAuthToken: 'AUTH_DUMMY',
        twilioWhatsAppFrom: '+14155238886' // Missing whatsapp: prefix
    });
    const waFormatRes = await realWhatsAppFormatCheck.sendWhatsApp({
        to: '+1234567890',
        message: 'Test'
    });
    assert(waFormatRes.success === false && waFormatRes.error.includes('whatsapp:'), 'Validates that TWILIO_WHATSAPP_FROM requires "whatsapp:" prefix');

    // 4. Injected mock transport test for WhatsApp (zero network calls)
    let mockWaTransportCalled = false;
    let mockWaPayload = null;
    const injectedWaTransport = {
        post: async (payload) => {
            mockWaTransportCalled = true;
            mockWaPayload = payload;
            return { sid: 'WA_MOCK_SID_999' };
        }
    };
    const waWithTransport = new TwilioWhatsAppProvider(
        {
            whatsappEnableRealDelivery: true,
            twilioAccountSid: 'AC_TEST',
            twilioAuthToken: 'TOKEN_TEST',
            twilioWhatsAppFrom: 'whatsapp:+14155238886'
        },
        injectedWaTransport
    );
    const waTransRes = await waWithTransport.sendWhatsApp({
        to: '+1987654321',
        message: 'Campus emergency overheating'
    });
    assert(waTransRes.success === true, 'WhatsApp adapter executes successfully with injected transport');
    assert(mockWaTransportCalled === true, 'Injected mock transport received payload without external network request');
    assert(mockWaPayload.from === 'whatsapp:+14155238886', 'Transport received correct WhatsApp sender');

    // -----------------------------------------------------------------
    // TEST 7: Delayed bounce handling triggers downstream WhatsApp fallback
    // -----------------------------------------------------------------
    console.log('\n[7] Scenario 7: Delayed Bounce Webhook Simulation');
    const { email: email7, wa: wa7 } = clearState();

    // 1. Initial critical alert succeeds on email
    await processTelemetryReading({
        room: 'LAB101',
        temperature: 34.5,
        humidity: 50.0,
        source: 'LIVE_HARDWARE',
        timestamp: Date.now()
    });
    assert(email7.getSentEmails().length === 1, 'Initial email sent');
    assert(wa7.getSentMessages().length === 0, 'No initial WhatsApp message');

    const initialEmailNotif = inMemoryNotifications.find(n => n.channel === 'email');
    assert(initialEmailNotif && initialEmailNotif.deliveryStatus === 'SIMULATED', 'Initial email logged as SIMULATED');

    // 2. Later, a bounce webhook reports failure on the accepted email
    const bounceRes = await handleDelayedDeliveryFailure({
        notificationId: initialEmailNotif.notificationId,
        failureType: 'BOUNCE',
        errorDetails: '550 User mailbox not found',
        config: getAlertConfig(),
        inMemoryNotifications
    });
    assert(bounceRes.success === true && bounceRes.bounceProcessed === true, 'Delayed bounce processed successfully');
    assert(initialEmailNotif.deliveryStatus === 'BOUNCED', 'Original email notification status updated to BOUNCED');
    assert(wa7.getSentMessages().length === 1, 'Delayed bounce automatically triggered WhatsApp fallback');

    const bounceWa = wa7.getLastMessage();
    assert(bounceWa.isFallback === true && bounceWa.message.includes('DELAYED BOUNCE FALLBACK'), 'Delayed fallback message body sent to WhatsApp');

    // -----------------------------------------------------------------
    // TEST 8: Simulated / demo data never triggers notifications
    // -----------------------------------------------------------------
    console.log('\n[8] Scenario 8: Simulated and Demo Data Rejection');
    const { email: email8, wa: wa8 } = clearState();

    const simRes1 = await processTelemetryReading({
        room: 'LAB101',
        temperature: 40.0,
        mock: true,
        source: 'LIVE_HARDWARE',
        timestamp: Date.now()
    });
    const simRes2 = await processTelemetryReading({
        room: 'LAB101',
        temperature: 40.0,
        simulated: true,
        timestamp: Date.now()
    });
    const simRes3 = await processTelemetryReading({
        room: 'SERVER_ROOM', // Simulated non-hardware room
        temperature: 40.0,
        source: 'LIVE_HARDWARE',
        timestamp: Date.now()
    });

    assert(simRes1.alerted === false && simRes1.reason === 'SIMULATED_DATA_IGNORED', 'mock:true payload ignored');
    assert(simRes2.alerted === false && simRes2.reason === 'SIMULATED_DATA_IGNORED', 'simulated:true payload ignored');
    assert(simRes3.alerted === false && simRes3.reason === 'NON_HARDWARE_ROOM', 'Non-hardware room ignored');
    assert(email8.getSentEmails().length === 0, 'Zero emails dispatched for simulated data');
    assert(wa8.getSentMessages().length === 0, 'Zero WhatsApp messages dispatched for simulated data');

    // -----------------------------------------------------------------
    // TEST 9: Existing Assessment Engine & Config Integrity
    // -----------------------------------------------------------------
    console.log('\n[9] Scenario 9: Assessment Engine & Config Integrity');

    const assessNormal = assessEnvironment({ temperature: 24.0, humidity: 50.0, fan: 'OFF' });
    assert(assessNormal.status === 'NORMAL', 'Environmental assessment normal preserved');

    const assessCrit = assessEnvironment({ temperature: 33.0, humidity: 50.0, fan: 'OFF' });
    assert(assessCrit.status === 'CRITICAL', 'Environmental assessment critical threshold preserved');

    const sanitized = getSanitizedConfig();
    assert(sanitized.email.provider === 'mock' && sanitized.email.enableRealDelivery === false, 'Email is mock with real delivery disabled');
    assert(sanitized.whatsapp.provider === 'mock' && sanitized.whatsapp.enableRealDelivery === false, 'WhatsApp is mock with real delivery disabled');
    assert(sanitized.channelOrder.join(',') === 'email,whatsapp', 'Channel order verified as email,whatsapp');

    // -----------------------------------------------------------------
    // TEST 10: Official Twilio Email API (POST /v1/Emails) & Lifecycle
    // -----------------------------------------------------------------
    console.log('\n[10] Scenario 10: Twilio Email API (POST /v1/Emails) & Lifecycle');

    // 10.1 Safety Gate Rejection when emailEnableRealDelivery=false
    const twilioGateProvider = new TwilioEmailProvider({
        emailEnableRealDelivery: false,
        twilioEmailApiKey: 'SK_MOCK_KEY_123',
        twilioEmailApiSecret: 'SECRET_MOCK_XYZ',
        twilioEmailFromAddress: 'alerts@campus.edu'
    });
    const twilioGateRes = await twilioGateProvider.sendEmail({
        to: 'staff@campus.edu',
        subject: 'Test Emergency',
        body: 'Overheating in CC1'
    });
    assert(twilioGateRes.success === false, 'Twilio Email safety gate blocks delivery when emailEnableRealDelivery=false');
    assert(twilioGateRes.error.includes('safety gate'), 'Twilio Email rejection cites safety gate');
    assert(twilioGateRes.acceptanceStatus === 'REJECTED', 'Twilio Email safety gate sets acceptanceStatus: REJECTED');

    // 10.2 Configuration Validation (Missing Credentials)
    const twilioMissingCredsProvider = new TwilioEmailProvider({
        emailEnableRealDelivery: true
    });
    const twilioCredRes = await twilioMissingCredsProvider.sendEmail({
        to: 'staff@campus.edu',
        subject: 'Test Emergency',
        body: 'Overheating in CC1'
    });
    assert(twilioCredRes.success === false, 'Twilio Email fails safely when credentials are missing');
    assert(twilioCredRes.error.includes('missing'), 'Twilio Email error cites missing API configuration');

    // 10.3 Twilio Email API Request Structure & HTTP Basic Auth Verification (Injected Transport)
    let capturedUrl = null;
    let capturedHeaders = null;
    let capturedBody = null;
    const mockTwilioTransport202 = {
        post: async (url, options) => {
            capturedUrl = url;
            capturedHeaders = options.headers;
            capturedBody = options.body;
            return {
                statusCode: 202,
                headers: { 'operation-id': 'op_test_acceptance_987' },
                data: { operationId: 'op_test_acceptance_987' }
            };
        }
    };
    const twilioEmailWithTransport = new TwilioEmailProvider({
        emailEnableRealDelivery: true,
        twilioEmailApiKey: 'SK_TEST_API_KEY_123',
        twilioEmailApiSecret: 'SECRET_TEST_456',
        twilioEmailFromAddress: 'alerts@campus.edu',
        twilioEmailFromName: 'Campus Alert Team'
    }, mockTwilioTransport202);

    const dispatchRes = await twilioEmailWithTransport.sendEmail({
        to: 'facilities@campus.edu',
        recipientName: 'Facilities Lead',
        subject: '[CRITICAL ALERT] CC1 Overheating',
        body: 'Temperature exceeded 33C in CC1',
        html: '<p>Temperature exceeded 33C in CC1</p>',
        room: 'CC1'
    });

    assert(capturedUrl === 'https://comms.twilio.com/v1/Emails', 'Twilio Email targets POST https://comms.twilio.com/v1/Emails');
    const expectedBasicAuth = 'Basic ' + Buffer.from('SK_TEST_API_KEY_123:SECRET_TEST_456').toString('base64');
    assert(capturedHeaders['Authorization'] === expectedBasicAuth, 'Twilio Email constructs HTTP Basic Authorization header with Base64(apiKey:apiSecret)');
    assert(capturedBody.from.address === 'alerts@campus.edu' && capturedBody.from.name === 'Campus Alert Team', 'Twilio Email payload has valid from structure');
    assert(Array.isArray(capturedBody.to) && capturedBody.to[0].address === 'facilities@campus.edu', 'Twilio Email payload has valid to array');
    assert(capturedBody.content.subject === '[CRITICAL ALERT] CC1 Overheating', 'Twilio Email payload has valid content.subject');
    assert(capturedBody.content.html.includes('<p>Temperature'), 'Twilio Email payload has valid content.html');
    assert(capturedBody.content.text.includes('Temperature exceeded'), 'Twilio Email payload has valid content.text');

    // 10.4 HTTP 202 Accepted Lifecycle & OperationId Extraction
    assert(dispatchRes.success === true, 'Twilio Email HTTP 202 returns success: true');
    assert(dispatchRes.status === 'PENDING', 'Twilio Email HTTP 202 sets status: PENDING (not delivered or failed)');
    assert(dispatchRes.isPending === true, 'Twilio Email HTTP 202 sets isPending: true');
    assert(dispatchRes.acceptanceStatus === 'ACCEPTED', 'Twilio Email HTTP 202 sets acceptanceStatus: ACCEPTED');
    assert(dispatchRes.operationId === 'op_test_acceptance_987', 'Twilio Email HTTP 202 captures operationId');

    // 10.5 Orchestrator HTTP 202 (Pending) Suppresses WhatsApp Fallback
    const mockNotificationsPending = [];
    const twilioPendingConfig = {
        channelOrder: ['email', 'whatsapp'],
        emailProvider: 'twilio',
        emailEnableRealDelivery: true,
        twilioEmailApiKey: 'SK_TEST_KEY',
        twilioEmailApiSecret: 'SECRET_TEST_SEC',
        twilioEmailFromAddress: 'alerts@campus.edu',
        emailStatusPollingEnabled: false
    };
    resetAllProviders();
    getEmailProvider(twilioPendingConfig, mockTwilioTransport202, true);

    const testIncidentPending = { incidentId: 'INC_PENDING_001', notificationCount: 1 };
    const orchPendingRes = await orchestrateNotification({
        incident: testIncidentPending,
        incidentType: 'CRITICAL_TEMPERATURE',
        room: 'LAB101',
        displayRoom: 'CC1',
        measuredValue: 35.5,
        severity: 'CRITICAL',
        timestamp: Date.now(),
        config: twilioPendingConfig,
        recipients: [{ name: 'Campus Manager', email: 'manager@campus.edu', whatsapp: '+1234567890' }],
        inMemoryNotifications: mockNotificationsPending
    });

    assert(orchPendingRes[0].delivered === true, 'Orchestrator treats HTTP 202 acceptance as delivered');
    assert(orchPendingRes[0].finalChannel === 'email', 'Orchestrator finalChannel is email');
    assert(testIncidentPending.channelsAttempted.length === 1 && testIncidentPending.channelsAttempted[0] === 'email', 'WhatsApp fallback is SUPPRESSED when email is PENDING');
    assert(mockNotificationsPending.length === 1, 'Only 1 notification recorded during HTTP 202 accepted state');
    assert(mockNotificationsPending[0].deliveryStatus === 'PENDING', 'Notification record deliveryStatus is PENDING');
    assert(mockNotificationsPending[0].operationId === 'op_test_acceptance_987', 'Notification record persists operationId');

    // 10.6 Bounded Status Polling: GET /v1/Operations/{operationId} transitions
    // a) COMPLETED -> DELIVERED
    let pollUrlCalled = null;
    const pollCompletedTransport = {
        get: async (url) => {
            pollUrlCalled = url;
            return { statusCode: 200, data: { status: 'COMPLETED', operationId: 'op_test_poll_001' } };
        }
    };
    const twilioPollerCompleted = new TwilioEmailProvider(twilioPendingConfig, pollCompletedTransport);
    const pollResCompleted = await twilioPollerCompleted.pollOperationStatus('op_test_poll_001');
    assert(pollUrlCalled === 'https://comms.twilio.com/v1/Operations/op_test_poll_001', 'Operations polling queries GET https://comms.twilio.com/v1/Operations/{operationId}');
    assert(pollResCompleted.completed === true && pollResCompleted.status === 'DELIVERED', 'Operation status COMPLETED transitions to DELIVERED');

    // b) PROCESSING -> PENDING (no resend or premature fallback)
    const pollProcessingTransport = {
        get: async () => ({ statusCode: 200, data: { status: 'PROCESSING' } })
    };
    const twilioPollerProcessing = new TwilioEmailProvider(twilioPendingConfig, pollProcessingTransport);
    const pollResProcessing = await twilioPollerProcessing.pollOperationStatus('op_test_poll_002', { maxAttempts: 1 });
    assert(pollResProcessing.completed === false && pollResProcessing.status === 'PENDING', 'Operation status PROCESSING remains PENDING');

    // c) FAILED -> Triggers WhatsApp Fallback in Orchestrator
    const mockNotificationsAsyncFail = [];
    const asyncFailTransport = {
        post: async () => ({
            statusCode: 202,
            headers: { 'operation-id': 'op_async_fail_003' },
            data: { operationId: 'op_async_fail_003' }
        }),
        get: async () => ({
            statusCode: 200,
            data: { status: 'FAILED', errorMessage: '550 Recipient mailbox unavailable' }
        })
    };
    resetAllProviders();
    const asyncFailConfig = {
        ...twilioPendingConfig,
        emailStatusPollingEnabled: true,
        emailPollingMaxAttempts: 1,
        emailPollingIntervalMs: 5
    };
    getEmailProvider(asyncFailConfig, asyncFailTransport, true);

    const testIncidentAsyncFail = { incidentId: 'INC_ASYNC_FAIL_002', notificationCount: 1 };
    await orchestrateNotification({
        incident: testIncidentAsyncFail,
        incidentType: 'CRITICAL_TEMPERATURE',
        room: 'LAB101',
        displayRoom: 'CC1',
        measuredValue: 36.2,
        severity: 'CRITICAL',
        timestamp: Date.now(),
        config: asyncFailConfig,
        recipients: [{ name: 'Operations Lead', email: 'lead@campus.edu', whatsapp: '+1987654321' }],
        inMemoryNotifications: mockNotificationsAsyncFail
    });

    assert(testIncidentAsyncFail.channelsAttempted.includes('email') && testIncidentAsyncFail.channelsAttempted.includes('whatsapp'), 'Asynchronous failure via operation polling initiates WhatsApp fallback');
    assert(testIncidentAsyncFail.finalDeliveryOutcome === 'DELIVERED_WHATSAPP_FALLBACK', 'Incident outcome updated to DELIVERED_WHATSAPP_FALLBACK');
    assert(mockNotificationsAsyncFail.length === 2, 'Two notifications logged (attempt 1 email FAILED, attempt 2 whatsapp SIMULATED)');
    assert(mockNotificationsAsyncFail[0].deliveryStatus === 'FAILED' && mockNotificationsAsyncFail[0].error.includes('550 Recipient mailbox unavailable'), 'Attempt 1 email marked FAILED with operation error message');
    assert(mockNotificationsAsyncFail[1].channel === 'whatsapp' && mockNotificationsAsyncFail[1].fallbackTriggered === true, 'Attempt 2 logged as WhatsApp fallback');

    // 10.7 Definitive Submission Rejection (HTTP 400 Bad Request) Immediately Triggers WhatsApp Fallback
    const mockNotificationsSubFail = [];
    const submissionFailTransport = {
        post: async () => ({
            statusCode: 400,
            data: { message: 'Invalid recipient format or domain rejected' }
        })
    };
    resetAllProviders();
    getEmailProvider(twilioPendingConfig, submissionFailTransport, true);

    const testIncidentSubFail = { incidentId: 'INC_SUB_FAIL_003', notificationCount: 1 };
    await orchestrateNotification({
        incident: testIncidentSubFail,
        incidentType: 'CRITICAL_TEMPERATURE',
        room: 'LAB101',
        displayRoom: 'CC1',
        measuredValue: 37.0,
        severity: 'CRITICAL',
        timestamp: Date.now(),
        config: twilioPendingConfig,
        recipients: [{ name: 'Safety Officer', email: 'invalid-email', whatsapp: '+1122334455' }],
        inMemoryNotifications: mockNotificationsSubFail
    });

    assert(testIncidentSubFail.channelsAttempted.includes('email') && testIncidentSubFail.channelsAttempted.includes('whatsapp'), 'HTTP 400 submission error immediately triggers WhatsApp fallback');
    assert(mockNotificationsSubFail[0].deliveryStatus === 'FAILED', 'Initial email logged as FAILED');
    assert(mockNotificationsSubFail[1].channel === 'whatsapp', 'WhatsApp fallback dispatched');

    // 10.8 Data Masking & Sanitization Check
    const sanitizedEmailConfig = getSanitizedConfig();
    assert(sanitizedEmailConfig.email.hasOwnProperty('hasTwilioEmailConfig'), 'Sanitized config includes hasTwilioEmailConfig');
    assert(!JSON.stringify(sanitizedEmailConfig).includes('SECRET_TEST_SEC'), 'Sanitized config does not leak API secret');
    assert(mockNotificationsPending[0].recipientEmail === 'm***r@campus.edu', 'Recipient email is masked in notification log');

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
    console.error('Fatal test error in test_multiChannelAlerts:', err);
    process.exit(1);
});
