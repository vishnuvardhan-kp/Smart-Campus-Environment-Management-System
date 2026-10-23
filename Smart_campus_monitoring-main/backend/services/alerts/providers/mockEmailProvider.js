/**
 * Mock Email Provider
 *
 * Simulates email delivery for critical environmental incidents:
 * - Makes strictly ZERO external network calls or SMTP requests.
 * - Records all simulated dispatch attempts in memory for inspection.
 * - Distinguishes between provider acceptance and confirmed delivery.
 * - Supports simulated failure mode to test fallback to WhatsApp.
 * - Sanitizes all recipient email addresses.
 */

const BaseSmsProvider = require('./baseProvider');
const { maskEmail } = require('../alertConfig');

class MockEmailProvider extends BaseSmsProvider {
    constructor(config = {}) {
        super(config);
        this.name = 'mock-email';
        this.sentEmails = [];
        this.simulateFailure = false;
        this.simulatedFailureReason = 'Simulated SMTP connection timeout';
    }

    /**
     * Configure simulated failure mode for test verification
     * @param {boolean} shouldFail
     * @param {string} [reason]
     */
    setSimulateFailure(shouldFail, reason = 'Simulated SMTP connection timeout') {
        this.simulateFailure = Boolean(shouldFail);
        this.simulatedFailureReason = reason;
    }

    async sendEmail({ to, recipientName, recipientRole, subject, body, incident, room, severity }) {
        if (this.simulateFailure) {
            const failureRecord = {
                success: false,
                channel: 'email',
                provider: this.name,
                status: 'FAILED',
                acceptanceStatus: 'REJECTED',
                error: this.simulatedFailureReason,
                to: maskEmail(to),
                recipientName: recipientName || 'Authorized Staff',
                recipientRole: recipientRole || 'STAFF',
                room: room || 'UNKNOWN',
                simulated: true,
                attemptedAt: new Date()
            };
            console.warn(`[Mock Email Provider] (Simulated Failure) To: ${failureRecord.recipientName} | Error: ${this.simulatedFailureReason}`);
            return failureRecord;
        }

        const messageId = `mock-email-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
        const record = {
            success: true,
            channel: 'email',
            provider: this.name,
            messageId,
            to: maskEmail(to),
            recipientName: recipientName || 'Authorized Staff',
            recipientRole: recipientRole || 'STAFF',
            subject: subject || `[ALERT] Campus Environmental Incident in ${room}`,
            body,
            incidentId: incident ? incident.incidentId : null,
            incidentType: incident ? incident.incidentType : null,
            room: room || 'UNKNOWN',
            severity: severity || 'CRITICAL',
            status: 'SIMULATED',
            acceptanceStatus: 'ACCEPTED', // Provider accepted message for queueing
            simulated: true,
            deliveredAt: new Date()
        };

        this.sentEmails.push(record);
        console.log(`[Mock Email Provider] (Simulated Delivery) To: ${record.recipientName} (${record.to}) | Subject: "${record.subject}" | Room: ${record.room}`);
        return record;
    }

    getSentEmails() {
        return [...this.sentEmails];
    }

    getLastEmail() {
        return this.sentEmails[this.sentEmails.length - 1] || null;
    }

    clearSentEmails() {
        this.sentEmails = [];
    }
}

module.exports = MockEmailProvider;
