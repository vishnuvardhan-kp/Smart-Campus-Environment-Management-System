/**
 * Mock SMS Provider
 *
 * Mandatory default provider:
 * - Records all simulated delivery attempts in memory
 * - Makes ZERO external network calls or HTTP requests
 * - Never leaks real phone numbers or credentials
 * - Exposes verification methods for automated tests
 */

const BaseSmsProvider = require('./baseProvider');
const { maskPhoneNumber } = require('../alertConfig');

class MockSmsProvider extends BaseSmsProvider {
    constructor(config = {}) {
        super(config);
        this.name = 'mock';
        this.sentMessages = [];
    }

    async sendSms({ to, recipientName, recipientRole, message, incident, room, severity }) {
        const messageId = `mock-sms-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
        const record = {
            success: true,
            provider: 'mock',
            messageId,
            to: maskPhoneNumber(to),
            recipientName: recipientName || 'Authorized Staff',
            recipientRole: recipientRole || 'STAFF',
            message,
            incidentId: incident ? incident.incidentId : null,
            incidentType: incident ? incident.incidentType : null,
            room: room || 'UNKNOWN',
            severity: severity || 'CRITICAL',
            simulated: true,
            status: 'SIMULATED',
            deliveredAt: new Date()
        };

        this.sentMessages.push(record);
        console.log(`[Mock SMS Provider] (Simulated Delivery) To: ${record.recipientName} (${record.to}) | Room: ${record.room} | Severity: ${record.severity} | Message: "${message}"`);
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

module.exports = MockSmsProvider;
