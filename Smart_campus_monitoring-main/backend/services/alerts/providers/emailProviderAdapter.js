/**
 * Real Email Provider Adapter (SMTP / SendGrid)
 *
 * Implements clean Email adapter with strict fail-closed safety gate:
 * - Real external delivery is disabled by default (EMAIL_ENABLE_REAL_DELIVERY=false).
 * - Requires explicit SMTP / SendGrid host configuration; does not assume a free email quota exists.
 * - Fails closed if real delivery is disabled, missing configuration, or uninitialized transport.
 * - Supports injected transport for unit testing without external network requests.
 * - Never prints credentials to logs.
 */

const BaseSmsProvider = require('./baseProvider');
const { maskEmail } = require('../alertConfig');

class EmailProviderAdapter extends BaseSmsProvider {
    constructor(config = {}, transport = null) {
        super(config);
        this.name = config.emailProvider || 'smtp';
        this.transport = transport; // Injected transport for automated unit testing
    }

    async sendEmail({ to, recipientName, recipientRole, subject, body, incident, room, severity }) {
        // 1. HARD SAFETY GATE: Verify real Email delivery is explicitly authorized
        if (this.config.emailEnableRealDelivery !== true) {
            const gateError = 'Real Email delivery is disabled by safety gate (EMAIL_ENABLE_REAL_DELIVERY=false).';
            console.warn(`[Email Adapter] Safety Gate Blocked: ${gateError}`);
            return {
                success: false,
                channel: 'email',
                provider: this.name,
                status: 'FAILED',
                acceptanceStatus: 'REJECTED',
                error: gateError,
                simulated: false
            };
        }

        // 2. Validate SMTP / Provider Configuration
        const host = this.config.smtpHost || process.env.SMTP_HOST;
        const port = this.config.smtpPort || process.env.SMTP_PORT;
        const user = this.config.smtpUser || process.env.SMTP_USER;
        const from = this.config.emailFrom || process.env.EMAIL_FROM || 'alerts@campus.edu';

        if (!host || !user) {
            const credError = 'Email provider credentials not configured (requires SMTP_HOST, SMTP_USER). Verify provider account configuration.';
            console.warn(`[Email Adapter] Configuration Error: ${credError}`);
            return {
                success: false,
                channel: 'email',
                provider: this.name,
                status: 'FAILED',
                acceptanceStatus: 'REJECTED',
                error: credError,
                simulated: false
            };
        }

        if (!to) {
            return {
                success: false,
                channel: 'email',
                provider: this.name,
                status: 'FAILED',
                acceptanceStatus: 'REJECTED',
                error: 'Recipient email address is missing.',
                simulated: false
            };
        }

        // 3. Dispatch via Injected Transport (for unit testing)
        if (this.transport && typeof this.transport.sendMail === 'function') {
            try {
                const res = await this.transport.sendMail({
                    from,
                    to,
                    subject,
                    text: body
                });
                return {
                    success: true,
                    channel: 'email',
                    provider: this.name,
                    messageId: res.messageId || `email-test-${Date.now()}`,
                    to: maskEmail(to),
                    recipientName: recipientName || 'Staff Member',
                    recipientRole: recipientRole || 'STAFF',
                    subject,
                    incidentId: incident ? incident.incidentId : null,
                    status: 'SENT',
                    acceptanceStatus: 'ACCEPTED',
                    simulated: false,
                    deliveredAt: new Date()
                };
            } catch (err) {
                return {
                    success: false,
                    channel: 'email',
                    provider: this.name,
                    status: 'FAILED',
                    acceptanceStatus: 'REJECTED',
                    error: err.message,
                    simulated: false
                };
            }
        }

        // 4. Default: No external network transport initialized
        return {
            success: false,
            channel: 'email',
            provider: this.name,
            status: 'FAILED',
            acceptanceStatus: 'REJECTED',
            error: 'Email outbound network transport not initialized. Outbound calls are locked.',
            simulated: false
        };
    }
}

module.exports = EmailProviderAdapter;
