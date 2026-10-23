/**
 * Base SMS Provider Interface
 */

class BaseSmsProvider {
    constructor(config = {}) {
        this.name = 'base';
        this.config = config;
    }

    /**
     * Send SMS dispatch (or simulation)
     * @param {Object} options
     * @param {string} options.to - Recipient phone number or identifier
     * @param {string} options.recipientName - Name of the staff recipient
     * @param {string} options.message - Formatted SMS message body
     * @param {Object} options.incident - Alert incident object
     * @param {string} options.room - Room identifier
     * @param {string} options.severity - Alert severity
     * @returns {Promise<Object>} Delivery result
     */
    async sendSms(options) {
        throw new Error('sendSms() must be implemented by subclass');
    }
}

module.exports = BaseSmsProvider;
