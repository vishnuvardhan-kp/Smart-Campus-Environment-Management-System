/**
 * Twilio Email API Provider Adapter
 *
 * Implements integration with the official Twilio Email API:
 * Endpoint: POST https://comms.twilio.com/v1/Emails
 * Status Polling: GET https://comms.twilio.com/v1/Operations/{operationId}
 * Authentication: HTTP Basic using Twilio API Key SID and API Key Secret.
 *
 * Asynchronous Lifecycle:
 * - HTTP 202 Accepted signifies the email job was accepted for queueing, NOT confirmed delivery.
 * - Extracts and persists the operationId.
 * - Pending status does NOT trigger premature WhatsApp fallback.
 * - WhatsApp fallback is triggered ONLY when submission definitively fails or polling confirms failure.
 * - Enforces fail-closed safety gate (EMAIL_ENABLE_REAL_DELIVERY=false by default).
 * - Never prints credentials or secret values in logs or exceptions.
 */

const BaseSmsProvider = require('./baseProvider');
const { maskEmail } = require('../alertConfig');

const TWILIO_EMAIL_ENDPOINT = 'https://comms.twilio.com/v1/Emails';
const TWILIO_OPERATIONS_ENDPOINT = 'https://comms.twilio.com/v1/Operations';

class TwilioEmailProvider extends BaseSmsProvider {
    constructor(config = {}, transport = null) {
        super(config);
        this.name = 'twilio-email';
        this.transport = transport; // Injected transport for unit testing without external network calls
    }

    /**
     * Send email via Twilio Email API (POST https://comms.twilio.com/v1/Emails)
     */
    async sendEmail({ to, recipientName, recipientRole, subject, body, html, incident, room, severity }) {
        // 1. HARD SAFETY GATE: Verify real Email delivery is explicitly authorized
        if (this.config.emailEnableRealDelivery !== true) {
            const gateError = 'Real Email delivery is disabled by safety gate (EMAIL_ENABLE_REAL_DELIVERY=false).';
            console.warn(`[Twilio Email Provider] Safety Gate Blocked: ${gateError}`);
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

        // 2. Validate Twilio Email API Configuration
        const apiKey = this.config.twilioEmailApiKey || process.env.TWILIO_EMAIL_API_KEY;
        const apiSecret = this.config.twilioEmailApiSecret || process.env.TWILIO_EMAIL_API_SECRET;
        const fromAddress = this.config.twilioEmailFromAddress || process.env.TWILIO_EMAIL_FROM_ADDRESS;
        const fromName = this.config.twilioEmailFromName || process.env.TWILIO_EMAIL_FROM_NAME || 'Smart Campus Alerts';

        if (!apiKey || !apiSecret || !fromAddress) {
            const credError = 'Twilio Email API configuration missing (requires TWILIO_EMAIL_API_KEY, TWILIO_EMAIL_API_SECRET, and TWILIO_EMAIL_FROM_ADDRESS).';
            console.warn(`[Twilio Email Provider] Configuration Error: ${credError}`);
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

        // 3. Construct Payload per Twilio Email API Documentation
        const plainText = body || `Campus Alert: Environmental anomaly detected in ${room}.`;
        const htmlContent = html || `<p>${plainText.replace(/\n/g, '<br/>')}</p>`;

        const payload = {
            from: {
                address: fromAddress,
                name: fromName
            },
            to: [
                {
                    address: to,
                    name: recipientName || 'Staff Member'
                }
            ],
            content: {
                subject: subject || `[CRITICAL ALERT] Incident in ${room}`,
                html: htmlContent,
                text: plainText
            }
        };

        const authHeader = 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

        // 4. Dispatch Request via Injected Transport (for test safety) or Native Fetch
        try {
            let res;
            if (this.transport && typeof this.transport.post === 'function') {
                res = await this.transport.post(TWILIO_EMAIL_ENDPOINT, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': authHeader
                    },
                    body: payload
                });
            } else if (typeof fetch === 'function') {
                const response = await fetch(TWILIO_EMAIL_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': authHeader
                    },
                    body: JSON.stringify(payload)
                });

                const respText = await response.text();
                let respData = {};
                try {
                    respData = JSON.parse(respText);
                } catch (e) {
                    respData = { raw: respText };
                }

                res = {
                    statusCode: response.status,
                    headers: Object.fromEntries(response.headers.entries()),
                    data: respData
                };
            } else {
                return {
                    success: false,
                    channel: 'email',
                    provider: this.name,
                    status: 'FAILED',
                    acceptanceStatus: 'REJECTED',
                    error: 'Outbound HTTP client transport not initialized.',
                    simulated: false
                };
            }

            // 5. Handle HTTP 202 Accepted Lifecycle
            // HTTP 202 means Accepted for processing, NOT confirmed delivery
            const statusCode = res.statusCode || res.status || 202;
            const operationId = (res.headers && (res.headers.operationid || res.headers['operation-id'] || res.headers.operationId))
                || (res.data && res.data.operationId)
                || (res.operationId)
                || `op-${Date.now()}`;

            if (statusCode === 202 || (statusCode >= 200 && statusCode < 300)) {
                console.log(`[Twilio Email Provider] Request Accepted (HTTP 202) for ${maskEmail(to)}. OperationId: ${operationId}`);
                return {
                    success: true,
                    channel: 'email',
                    provider: this.name,
                    operationId,
                    messageId: operationId,
                    to: maskEmail(to),
                    recipientName: recipientName || 'Staff Member',
                    recipientRole: recipientRole || 'STAFF',
                    subject: payload.content.subject,
                    incidentId: incident ? incident.incidentId : null,
                    acceptanceStatus: 'ACCEPTED',
                    status: 'PENDING', // Asynchronously pending in Twilio processing queue
                    simulated: false,
                    isPending: true,
                    submittedAt: new Date()
                };
            }

            // Definitive submission failure (HTTP 4xx / 5xx)
            const errorMsg = (res.data && (res.data.message || res.data.error)) || `HTTP ${statusCode} submission rejected by Twilio Email API`;
            console.error(`[Twilio Email Provider] Submission Failed (HTTP ${statusCode}): ${errorMsg}`);
            return {
                success: false,
                channel: 'email',
                provider: this.name,
                status: 'FAILED',
                acceptanceStatus: 'REJECTED',
                error: errorMsg,
                simulated: false
            };

        } catch (netErr) {
            console.error(`[Twilio Email Provider] Network Exception: ${netErr.message}`);
            return {
                success: false,
                channel: 'email',
                provider: this.name,
                status: 'FAILED',
                acceptanceStatus: 'REJECTED',
                error: netErr.message,
                simulated: false
            };
        }
    }

    /**
     * Poll operation status via GET https://comms.twilio.com/v1/Operations/{operationId}
     * Bounded status polling with configurable attempts and interval.
     */
    async pollOperationStatus(operationId, options = {}) {
        if (!operationId) {
            return { status: 'UNKNOWN', completed: false, failed: false };
        }

        const maxAttempts = options.maxAttempts || this.config.emailPollingMaxAttempts || 3;
        const apiKey = this.config.twilioEmailApiKey || process.env.TWILIO_EMAIL_API_KEY;
        const apiSecret = this.config.twilioEmailApiSecret || process.env.TWILIO_EMAIL_API_SECRET;
        const authHeader = 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
        const pollUrl = `${TWILIO_OPERATIONS_ENDPOINT}/${encodeURIComponent(operationId)}`;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                let res;
                if (this.transport && typeof this.transport.get === 'function') {
                    res = await this.transport.get(pollUrl, {
                        headers: { 'Authorization': authHeader }
                    });
                } else if (typeof fetch === 'function') {
                    const response = await fetch(pollUrl, {
                        headers: { 'Authorization': authHeader }
                    });
                    const json = await response.json();
                    res = { statusCode: response.status, data: json };
                }

                const opStatus = res && res.data ? (res.data.status || '').toUpperCase() : '';

                if (opStatus === 'COMPLETED') {
                    return {
                        status: 'DELIVERED',
                        operationStatus: 'COMPLETED',
                        completed: true,
                        failed: false,
                        operationId,
                        details: res.data
                    };
                }

                if (opStatus === 'FAILED' || opStatus === 'CANCELED') {
                    return {
                        status: 'FAILED',
                        operationStatus: opStatus,
                        completed: false,
                        failed: true,
                        operationId,
                        error: (res.data && res.data.errorMessage) || `Operation ended with status ${opStatus}`
                    };
                }

                // If SCHEDULED or PROCESSING, remain in pending state without resending
                if (attempt === maxAttempts) {
                    return {
                        status: 'PENDING',
                        operationStatus: opStatus || 'PROCESSING',
                        completed: false,
                        failed: false,
                        operationId
                    };
                }

                // Wait before next poll attempt
                const interval = options.intervalMs || this.config.emailPollingIntervalMs || 1000;
                await new Promise(resolve => setTimeout(resolve, interval));

            } catch (err) {
                console.warn(`[Twilio Email Provider] Polling attempt ${attempt} warning:`, err.message);
            }
        }

        return { status: 'PENDING', completed: false, failed: false, operationId };
    }
}

module.exports = TwilioEmailProvider;
