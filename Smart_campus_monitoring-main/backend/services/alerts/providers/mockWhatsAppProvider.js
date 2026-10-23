/**
 * Mock WhatsApp Provider
 *
 * Simulates WhatsApp message delivery for environmental incident notifications:
 * - Triggered automatically as fallback when email delivery fails.
 * - Makes strictly ZERO external network calls or WhatsApp API requests.
 * - Records all simulated dispatch attempts in memory for inspection.
 * - Supports simulated failure mode to test total channel failure scenarios.
 * - Sanitizes all recipient phone numbers.
 */

const BaseSmsProvider = require('./baseProvider');
const { maskPhoneNumber } = require('../alertConfig');

class MockWhatsAppProvider extends BaseSmsProvider {
    constructor(config = {}) {
        super(config);
        this.name = 'mock-whatsapp';
        this.sentMessages = [];
        this.simulateFailure = false;
        this.simulatedFailureReason = 'Simulated WhatsApp Gateway unreachable';
    }

    /**
     * Configure simulated failure mode for test verification
     * @param {boolean} shouldFail
     * @param {string} [reason]
     */
    setSimulateFailure(shouldFail, reason = 'Simulated WhatsApp Gateway unreachable') {
        this.simulateFailure = Boolean(shouldFail);
        this.simulatedFailureReason = reason;
    }

    async sendWhatsApp({ to, recipientName, recipientRole, message, incident, room, severity, isFallback = false, fallbackReason = null }) {
        if (this.simulateFailure) {
            const failureRecord = {
                success: false,
                channel: 'whatsapp',
                provider: this.name,
                status: 'FAILED',
                acceptanceStatus: 'REJECTED',
                error: this.simulatedFailureReason,
                to: maskPhoneNumber(to),
                recipientName: recipientName || 'Authorized Staff',
                recipientRole: recipientRole || 'STAFF',
                room: room || 'UNKNOWN',
                isFallback,
                fallbackReason,
                simulated: true,
                attemptedAt: new Date()
            };
            console.warn(`[Mock WhatsApp Provider] (Simulated Failure) To: ${failureRecord.recipientName} | Error: ${this.simulatedFailureReason}`);
            return failureRecord;
        }

        const messageId = `mock-wa-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
        const record = {
            success: true,
            channel: 'whatsapp',
            provider: this.name,
            messageId,
            to: maskPhoneNumber(to),
            recipientName: recipientName || 'Authorized Staff',
            recipientRole: recipientRole || 'STAFF',
            message,
            incidentId: incident ? incident.incidentId : null,
            incidentType: incident ? incident.incidentType : null,
            room: room || 'UNKNOWN',
            severity: severity || 'CRITICAL',
            status: 'SIMULATED',
            acceptanceStatus: 'ACCEPTED',
            isFallback,
            fallbackReason,
            simulated: true,
            deliveredAt: new Date()
        };

        this.sentMessages.push(record);
        console.log(`[Mock WhatsApp Provider] (Simulated Delivery) To: ${record.recipientName} (${record.to}) | Room: ${record.room} | Fallback: ${isFallback} | Message: "${record.message}"`);
        return record;
    }

    getSentMessages() {
        return [...this.sentMessages];
    }

    getLastMessage() {
        return this.sentMessages[this.sentMessages.length - 1] || null;
    }

    clearSentMessages() {
        this.sentMessages = [];
    }
}

module.exports = MockWhatsAppProvider;
