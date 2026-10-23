/**
 * Multi-Channel Notification Provider Factory
 *
 * Ensures mock is the mandatory default provider for Email, WhatsApp, and SMS.
 */

const MockSmsProvider = require('./mockProvider');
const TwilioSmsProvider = require('./twilioProvider');
const MockEmailProvider = require('./mockEmailProvider');
const TwilioEmailProvider = require('./twilioEmailProvider');
const EmailProviderAdapter = require('./emailProviderAdapter');
const MockWhatsAppProvider = require('./mockWhatsAppProvider');
const TwilioWhatsAppProvider = require('./twilioWhatsAppProvider');

let activeSmsProviderInstance = null;
let activeEmailProviderInstance = null;
let activeWhatsAppProviderInstance = null;

function getEmailProvider(config = {}, transport = null, forceNew = false) {
    if (activeEmailProviderInstance && !forceNew) {
        return activeEmailProviderInstance;
    }

    if (config && config.emailProvider === 'twilio') {
        activeEmailProviderInstance = new TwilioEmailProvider(config, transport);
    } else if (config && (config.emailProvider === 'smtp' || config.emailProvider === 'sendgrid')) {
        activeEmailProviderInstance = new EmailProviderAdapter(config, transport);
    } else {
        activeEmailProviderInstance = new MockEmailProvider(config);
    }

    return activeEmailProviderInstance;
}

function getWhatsAppProvider(config = {}, transport = null, forceNew = false) {
    if (activeWhatsAppProviderInstance && !forceNew) {
        return activeWhatsAppProviderInstance;
    }

    if (config && config.whatsappProvider === 'twilio') {
        activeWhatsAppProviderInstance = new TwilioWhatsAppProvider(config, transport);
    } else {
        activeWhatsAppProviderInstance = new MockWhatsAppProvider(config);
    }

    return activeWhatsAppProviderInstance;
}

function getSmsProvider(config = {}, transport = null, forceNew = false) {
    if (activeSmsProviderInstance && !forceNew) {
        return activeSmsProviderInstance;
    }

    if (config && (config.provider === 'twilio' || config.smsProvider === 'twilio')) {
        activeSmsProviderInstance = new TwilioSmsProvider(config, transport);
    } else {
        activeSmsProviderInstance = new MockSmsProvider(config);
    }

    return activeSmsProviderInstance;
}

function resetProviderInstance() {
    activeSmsProviderInstance = null;
    activeEmailProviderInstance = null;
    activeWhatsAppProviderInstance = null;
}

module.exports = {
    getEmailProvider,
    getWhatsAppProvider,
    getSmsProvider,
    resetProviderInstance,
    resetAllProviders: resetProviderInstance
};
