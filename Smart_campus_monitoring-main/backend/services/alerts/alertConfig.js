/**
 * Alert System Configuration & Safety Gate
 *
 * Enforces fail-closed multi-channel delivery architecture:
 * - Default channels: Email-first with WhatsApp-fallback ('email,whatsapp')
 * - Default provider for all channels is strictly 'mock'
 * - Real external delivery is disabled by default via hard delivery gates
 * - Configurable deduplication cooldown
 * - Server-side authorized staff recipient structure with placeholders
 * - Masking functions to ensure emails, phone numbers, and secrets are never exposed
 */

const ROOM_TO_DISPLAY = {
    'LAB101': 'CC1',
    'LAB102': 'CC2',
    'SERVER_ROOM': 'CC3',
    'SEMINAR_HALL': 'CC4',
    'STUDY_POD': 'CC5',
    'LAB201': 'CC6',
    'ROBOTICS_BAY': 'CC7',
    'B2_STORAGE': 'CC8',
    'TRUST_MAIN': 'CC9',
    'MEETING_1': 'CC10',
    'RECORDS_OFFICE': 'CC11',
    'ADMIN_OFFICE': 'CC12',
    'COUNCIL_CHAMBER': 'CC13',
    'DISC_ROOM_1': 'CC14',
    'DISC_ROOM_2': 'CC15',
    'READING_HALL': 'CC16',
    'ARCHIVE_SECTION': 'CC17'
};

const ROOM_TO_BUILDING = {
    'LAB101': 'IT Park',
    'LAB102': 'IT Park',
    'SERVER_ROOM': 'IT Park',
    'SEMINAR_HALL': 'IT Park',
    'STUDY_POD': 'IT Park',
    'LAB201': 'CTUG Block',
    'ROBOTICS_BAY': 'CTUG Block',
    'B2_STORAGE': 'CTUG Block',
    'TRUST_MAIN': 'Trust Office',
    'MEETING_1': 'Trust Office',
    'RECORDS_OFFICE': 'Trust Office',
    'ADMIN_OFFICE': 'Administrative Block',
    'COUNCIL_CHAMBER': 'Administrative Block',
    'DISC_ROOM_1': 'Central Library',
    'DISC_ROOM_2': 'Central Library',
    'READING_HALL': 'Central Library',
    'ARCHIVE_SECTION': 'Central Library'
};

/**
 * Server-side authorized staff recipient registry
 * Uses placeholders or empty strings; does not invent phone numbers or email addresses.
 */
const DEFAULT_STAFF_RECIPIENTS = [
    {
        id: 'staff-facility-mgr',
        name: 'Facility Operations Manager',
        role: 'FACILITY_MANAGER',
        building: 'IT Park',
        rooms: ['LAB101', 'CC1'],
        email: process.env.STAFF_EMAIL_FACILITY_MGR || '',       // Placeholder / empty by default
        phone: process.env.STAFF_PHONE_FACILITY_MGR || '',       // Placeholder / empty by default
        whatsapp: process.env.STAFF_WHATSAPP_FACILITY_MGR || '', // Placeholder / empty by default
        enabled: Boolean(
            process.env.STAFF_EMAIL_FACILITY_MGR ||
            process.env.STAFF_PHONE_FACILITY_MGR ||
            process.env.STAFF_WHATSAPP_FACILITY_MGR
        )
    },
    {
        id: 'staff-safety-officer',
        name: 'Campus Safety & Health Officer',
        role: 'SAFETY_OFFICER',
        building: '*',
        rooms: ['*'],
        email: process.env.STAFF_EMAIL_SAFETY_OFFICER || '',       // Placeholder / empty by default
        phone: process.env.STAFF_PHONE_SAFETY_OFFICER || '',       // Placeholder / empty by default
        whatsapp: process.env.STAFF_WHATSAPP_SAFETY_OFFICER || '', // Placeholder / empty by default
        enabled: Boolean(
            process.env.STAFF_EMAIL_SAFETY_OFFICER ||
            process.env.STAFF_PHONE_SAFETY_OFFICER ||
            process.env.STAFF_WHATSAPP_SAFETY_OFFICER
        )
    }
];

/**
 * Mask a phone number to prevent credential/PII leaks
 */
function maskPhoneNumber(phone) {
    if (!phone || typeof phone !== 'string') return '(placeholder)';
    const clean = phone.trim();
    if (clean.length < 5) return '***';
    return clean.slice(0, 2) + '****' + clean.slice(-4);
}

/**
 * Mask an email address to prevent credential/PII leaks
 */
function maskEmail(email) {
    if (!email || typeof email !== 'string') return '(placeholder)';
    const clean = email.trim();
    const parts = clean.split('@');
    if (parts.length !== 2) return '***@***';
    const name = parts[0];
    const domain = parts[1];
    const maskedName = name.length <= 2 ? name[0] + '***' : name[0] + '***' + name[name.length - 1];
    return `${maskedName}@${domain}`;
}

function getAlertConfig() {
    // Channel Ordering: Email-first with WhatsApp-fallback by default
    const rawOrder = process.env.NOTIFICATION_CHANNEL_ORDER || 'email,whatsapp';
    const channelOrder = rawOrder
        .split(',')
        .map(c => c.trim().toLowerCase())
        .filter(c => ['email', 'whatsapp', 'sms'].includes(c));

    if (channelOrder.length === 0) {
        channelOrder.push('email', 'whatsapp');
    }

    // Providers (Default to 'mock')
    const emailProvider = (process.env.EMAIL_PROVIDER || 'mock').toLowerCase().trim();
    const whatsappProvider = (process.env.WHATSAPP_PROVIDER || 'mock').toLowerCase().trim();
    const smsProvider = (process.env.SMS_PROVIDER || 'mock').toLowerCase().trim();

    // HARD DELIVERY GATES: Real delivery is strictly disabled unless explicitly set to 'true'
    const emailEnableRealDelivery = process.env.EMAIL_ENABLE_REAL_DELIVERY === 'true';
    const whatsappEnableRealDelivery = process.env.WHATSAPP_ENABLE_REAL_DELIVERY === 'true';
    const smsEnableRealDelivery = process.env.SMS_ENABLE_REAL_DELIVERY === 'true';

    // Global delivery gate fallback
    const globalEnableRealDelivery = process.env.NOTIFICATION_ENABLE_REAL_DELIVERY === 'true';

    const cooldownMinutes = Math.max(1, parseInt(process.env.SMS_COOLDOWN_MINUTES || process.env.ALERT_COOLDOWN_MINUTES || '30', 10));
    const cooldownMs = cooldownMinutes * 60 * 1000;

    const espRoom = (process.env.ESP32_ROOM || 'LAB101').trim().toUpperCase();

    return {
        // Channel sequence
        channelOrder,

        // Email settings
        emailProvider: emailProvider === 'twilio' || emailProvider === 'smtp' || emailProvider === 'sendgrid' ? emailProvider : 'mock',
        emailEnableRealDelivery: emailEnableRealDelivery || globalEnableRealDelivery,
        twilioEmailApiKey: process.env.TWILIO_EMAIL_API_KEY || null,
        twilioEmailApiSecret: process.env.TWILIO_EMAIL_API_SECRET || null,
        twilioEmailFromAddress: process.env.TWILIO_EMAIL_FROM_ADDRESS || null,
        twilioEmailFromName: process.env.TWILIO_EMAIL_FROM_NAME || 'Smart Campus Alerts',
        emailStatusPollingEnabled: process.env.EMAIL_STATUS_POLLING_ENABLED === 'true',
        emailPollingMaxAttempts: parseInt(process.env.EMAIL_POLLING_MAX_ATTEMPTS || '3', 10),
        emailPollingIntervalMs: parseInt(process.env.EMAIL_POLLING_INTERVAL_MS || '1000', 10),
        emailPollingTimeoutMs: parseInt(process.env.EMAIL_POLLING_TIMEOUT_MS || '5000', 10),
        smtpHost: process.env.SMTP_HOST || null,
        smtpPort: process.env.SMTP_PORT || null,
        smtpUser: process.env.SMTP_USER || null,
        smtpPass: process.env.SMTP_PASS || null,
        emailFrom: process.env.EMAIL_FROM || process.env.TWILIO_EMAIL_FROM_ADDRESS || 'alerts@campus.edu',

        // WhatsApp settings (Twilio WhatsApp or mock)
        whatsappProvider: whatsappProvider === 'twilio' ? 'twilio' : 'mock',
        whatsappEnableRealDelivery: whatsappEnableRealDelivery || globalEnableRealDelivery,
        twilioWhatsAppFrom: process.env.TWILIO_WHATSAPP_FROM || null, // e.g. whatsapp:+14155238886

        // Legacy / SMS settings (retained for backward compatibility)
        provider: smsProvider === 'twilio' ? 'twilio' : 'mock',
        enableRealDelivery: smsEnableRealDelivery,
        smsProvider: smsProvider === 'twilio' ? 'twilio' : 'mock',
        smsEnableRealDelivery,
        twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || null,
        twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || null,
        twilioFromNumber: process.env.TWILIO_FROM_NUMBER || null,

        // General settings
        cooldownMinutes,
        cooldownMs,
        espRoom,
        recipients: DEFAULT_STAFF_RECIPIENTS
    };
}

/**
 * Return safe sanitized configuration for frontend and health endpoints (zero secrets or raw contact details)
 */
function getSanitizedConfig(config = getAlertConfig()) {
    return {
        provider: config.smsProvider || 'mock',
        enableRealDelivery: config.smsEnableRealDelivery || false,
        channelOrder: config.channelOrder,
        email: {
            provider: config.emailProvider,
            enableRealDelivery: config.emailEnableRealDelivery,
            hasTwilioEmailConfig: Boolean(config.twilioEmailApiKey && config.twilioEmailApiSecret && config.twilioEmailFromAddress),
            hasSmtpConfig: Boolean(config.smtpHost && config.smtpUser)
        },
        whatsapp: {
            provider: config.whatsappProvider,
            enableRealDelivery: config.whatsappEnableRealDelivery,
            hasTwilioConfig: Boolean(config.twilioAccountSid && config.twilioWhatsAppFrom)
        },
        sms: {
            provider: config.smsProvider,
            enableRealDelivery: config.smsEnableRealDelivery,
            hasTwilioConfig: Boolean(config.twilioAccountSid && config.twilioFromNumber)
        },
        cooldownMinutes: config.cooldownMinutes,
        espRoom: config.espRoom,
        recipients: config.recipients.map(r => ({
            id: r.id,
            name: r.name,
            role: r.role,
            building: r.building,
            rooms: r.rooms,
            emailConfigured: Boolean(r.email),
            maskedEmail: maskEmail(r.email),
            phoneConfigured: Boolean(r.phone),
            maskedPhone: maskPhoneNumber(r.phone),
            whatsappConfigured: Boolean(r.whatsapp),
            maskedWhatsApp: maskPhoneNumber(r.whatsapp),
            enabled: r.enabled
        }))
    };
}

module.exports = {
    ROOM_TO_DISPLAY,
    ROOM_TO_BUILDING,
    DEFAULT_STAFF_RECIPIENTS,
    maskPhoneNumber,
    maskEmail,
    getAlertConfig,
    getSanitizedConfig
};
