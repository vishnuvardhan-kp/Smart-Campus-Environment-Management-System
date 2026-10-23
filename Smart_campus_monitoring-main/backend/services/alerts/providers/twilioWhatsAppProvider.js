/**
 * Twilio WhatsApp Provider Adapter
 *
 * Implements clean WhatsApp adapter for Twilio with strict fail-closed safety gate:
 * - Real external delivery is disabled by default (WHATSAPP_ENABLE_REAL_DELIVERY=false).
 * - Twilio WhatsApp requires a dedicated WhatsApp-enabled sender (TWILIO_WHATSAPP_FROM e.g. 'whatsapp:+14155238886').
 *   Standard SMS credentials alone DO NOT enable WhatsApp.
 * - Fails closed if real delivery is disabled, missing credentials, or uninitialized transport.
 * - Supports injected transport for unit testing without external network requests.
 * - Never prints credentials to logs.
 */

const BaseSmsProvider = require('./baseProvider');
const { maskPhoneNumber } = require('../alertConfig');

class TwilioWhatsAppProvider extends BaseSmsProvider {
    constructor(config = {}, transport = null) {
        super(config);
        this.name = 'twilio-whatsapp';
        this.transport = transport; // Injected transport for automated unit testing
    }

    async sendWhatsApp({ to, recipientName, recipientRole, message, incident, room, severity, isFallback = false, fallbackReason = null }) {
        // 1. HARD SAFETY GATE: Verify real WhatsApp delivery is explicitly authorized
        if (this.config.whatsappEnableRealDelivery !== true) {
            const gateError = 'Real WhatsApp delivery is disabled by safety gate (WHATSAPP_ENABLE_REAL_DELIVERY=false).';
            console.warn(`[Twilio WhatsApp Provider] Safety Gate Blocked: ${gateError}`);
            return {
                success: false,
                channel: 'whatsapp',
                provider: this.name,
                status: 'FAILED',
                acceptanceStatus: 'REJECTED',
                error: gateError,
                isFallback,
                fallbackReason,
                simulated: false
            };
        }

        // 2. Validate Twilio WhatsApp Configuration
        const accountSid = this.config.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID;
        const authToken = this.config.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN;
        const whatsappFrom = this.config.twilioWhatsAppFrom || process.env.TWILIO_WHATSAPP_FROM;

        if (!accountSid || !authToken || !whatsappFrom) {
            const credError = 'Twilio WhatsApp credentials not fully configured (requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM).';
            console.warn(`[Twilio WhatsApp Provider] Configuration Error: ${credError}`);
            return {
                success: false,
                channel: 'whatsapp',
                provider: this.name,
                status: 'FAILED',
                acceptanceStatus: 'REJECTED',
                error: credError,
                isFallback,
                fallbackReason,
                simulated: false
            };
        }

        if (!whatsappFrom.startsWith('whatsapp:')) {
            const formatError = 'TWILIO_WHATSAPP_FROM must be prefixed with "whatsapp:" (e.g. whatsapp:+14155238886).';
            return {
                success: false,
                channel: 'whatsapp',
                provider: this.name,
                status: 'FAILED',
                acceptanceStatus: 'REJECTED',
                error: formatError,
                simulated: false
            };
        }

        if (!to) {
            return {
                success: false,
                channel: 'whatsapp',
                provider: this.name,
                status: 'FAILED',
                acceptanceStatus: 'REJECTED',
                error: 'Recipient phone number is missing.',
                simulated: false
            };
        }

        const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

        // 3. Dispatch via Injected Transport (for unit testing)
        if (this.transport && typeof this.transport.post === 'function') {
            try {
                const res = await this.transport.post({
                    accountSid,
                    authToken,
                    from: whatsappFrom,
                    to: formattedTo,
                    body: message
                });
                return {
                    success: true,
                    channel: 'whatsapp',
                    provider: this.name,
                    messageId: res.sid || `tw-wa-test-${Date.now()}`,
                    to: maskPhoneNumber(to),
                    recipientName: recipientName || 'Staff Member',
                    recipientRole: recipientRole || 'STAFF',
                    message,
                    incidentId: incident ? incident.incidentId : null,
                    status: 'SENT',
                    acceptanceStatus: 'ACCEPTED',
                    isFallback,
                    fallbackReason,
                    simulated: false,
                    deliveredAt: new Date()
                };
            } catch (err) {
                return {
                    success: false,
                    channel: 'whatsapp',
                    provider: this.name,
                    status: 'FAILED',
                    acceptanceStatus: 'REJECTED',
                    error: err.message,
                    isFallback,
                    fallbackReason,
                    simulated: false
                };
            }
        }

        // 4. Default: No external network transport initialized
        return {
            success: false,
            channel: 'whatsapp',
            provider: this.name,
            status: 'FAILED',
            acceptanceStatus: 'REJECTED',
            error: 'Twilio WhatsApp outbound network transport not initialized. Outbound calls are locked.',
            simulated: false
        };
    }
}

module.exports = TwilioWhatsAppProvider;
