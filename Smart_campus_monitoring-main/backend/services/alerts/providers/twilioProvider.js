/**
 * Twilio SMS Provider Adapter
 *
 * Implements clean Twilio adapter with strict fail-closed safety gate:
 * - Real external delivery is disabled by default (SMS_ENABLE_REAL_DELIVERY=false).
 * - Fails closed if real delivery is disabled, missing credentials, or missing transport.
 * - Supports injected transport for unit testing without external network requests.
 * - Never silently falls back to mock while reporting that a real SMS was sent.
 * - Never prints credentials to logs.
 */

const BaseSmsProvider = require('./baseProvider');
const { maskPhoneNumber } = require('../alertConfig');

class TwilioSmsProvider extends BaseSmsProvider {
    constructor(config = {}, transport = null) {
        super(config);
        this.name = 'twilio';
        this.transport = transport; // Injected transport for automated unit testing
    }

    async sendSms({ to, recipientName, recipientRole, message, incident, room, severity }) {
        // 1. HARD SAFETY GATE: Verify real delivery is explicitly authorized
        if (this.config.enableRealDelivery !== true) {
            const gateError = 'Real SMS delivery is disabled by safety gate (SMS_ENABLE_REAL_DELIVERY=false).';
            console.warn(`[Twilio Provider] Safety Gate Blocked: ${gateError}`);
            return {
                success: false,
                provider: 'twilio',
                status: 'FAILED',
                error: gateError,
                simulated: false
            };
        }

        // 2. Validate Credentials
        const accountSid = this.config.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID;
        const authToken = this.config.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN;
        const fromNumber = this.config.twilioFromNumber || process.env.TWILIO_FROM_NUMBER;

        if (!accountSid || !authToken || !fromNumber) {
            const credError = 'Twilio credentials not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER).';
            console.warn(`[Twilio Provider] Configuration Error: ${credError}`);
            return {
                success: false,
                provider: 'twilio',
                status: 'FAILED',
                error: credError,
                simulated: false
            };
        }

        if (!to) {
            return {
                success: false,
                provider: 'twilio',
                status: 'FAILED',
                error: 'Recipient phone number is missing.',
                simulated: false
            };
        }

        // 3. Dispatch via Injected Transport (for unit testing)
        if (this.transport && typeof this.transport.post === 'function') {
            try {
                const res = await this.transport.post({
                    accountSid,
                    authToken,
                    from: fromNumber,
                    to,
                    body: message
                });
                return {
                    success: true,
                    provider: 'twilio',
                    messageId: res.sid || `tw-test-${Date.now()}`,
                    to: maskPhoneNumber(to),
                    recipientName: recipientName || 'Staff Member',
                    recipientRole: recipientRole || 'STAFF',
                    message,
                    incidentId: incident ? incident.incidentId : null,
                    status: 'SENT',
                    simulated: false,
                    deliveredAt: new Date()
                };
            } catch (err) {
                return {
                    success: false,
                    provider: 'twilio',
                    status: 'FAILED',
                    error: err.message,
                    simulated: false
                };
            }
        }

        // 4. Default: No external network transport initialized
        return {
            success: false,
            provider: 'twilio',
            status: 'FAILED',
            error: 'Twilio outbound network transport not initialized. Outbound calls are locked.',
            simulated: false
        };
    }
}

module.exports = TwilioSmsProvider;
