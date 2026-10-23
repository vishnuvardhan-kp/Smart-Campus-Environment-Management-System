const mongoose = require('mongoose');

const alertNotificationSchema = new mongoose.Schema(
    {
        notificationId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        idempotencyKey: {
            type: String,
            index: true,
            default: null
        },
        incidentId: {
            type: String,
            required: true,
            index: true
        },
        incidentType: {
            type: String,
            required: true,
            enum: ['CRITICAL_TEMPERATURE', 'CRITICAL_HUMIDITY', 'SENSOR_OFFLINE']
        },
        channel: {
            type: String,
            required: true,
            enum: ['email', 'whatsapp', 'sms'],
            default: 'email',
            index: true
        },
        attemptNumber: {
            type: Number,
            required: true,
            default: 1
        },
        room: {
            type: String,
            required: true,
            trim: true
        },
        displayRoom: {
            type: String,
            default: 'CC1'
        },
        recipient: {
            type: String,
            required: true
        },
        recipientRole: {
            type: String,
            default: 'STAFF'
        },
        recipientEmail: {
            type: String,
            default: null
        },
        recipientPhone: {
            type: String,
            default: null
        },
        subject: {
            type: String,
            default: null
        },
        message: {
            type: String,
            required: true
        },
        providerMode: {
            type: String,
            required: true,
            enum: ['mock', 'twilio', 'twilio-email', 'smtp', 'sendgrid', 'ses'],
            default: 'mock'
        },
        acceptanceStatus: {
            type: String,
            enum: ['ACCEPTED', 'REJECTED', 'PENDING'],
            default: 'ACCEPTED'
        },
        deliveryStatus: {
            type: String,
            required: true,
            enum: ['SIMULATED', 'SENT', 'ACCEPTED', 'PENDING', 'DELIVERED', 'FAILED', 'BOUNCED', 'SUPPRESSED_COOLDOWN', 'NO_RECIPIENT']
        },
        operationId: {
            type: String,
            default: null,
            index: true
        },
        fallbackTriggered: {
            type: Boolean,
            default: false
        },
        fallbackReason: {
            type: String,
            default: null
        },
        simulated: {
            type: Boolean,
            default: true
        },
        externalMessageId: {
            type: String,
            default: null
        },
        eventTime: {
            type: Date,
            default: Date.now,
            index: true
        },
        error: {
            type: String,
            default: null
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    {
        collection: 'alert_notifications',
        timestamps: true
    }
);

alertNotificationSchema.index({ incidentId: 1, eventTime: -1 });
alertNotificationSchema.index({ room: 1, eventTime: -1 });
alertNotificationSchema.index({ incidentId: 1, channel: 1, attemptNumber: 1 });

module.exports = mongoose.model('AlertNotification', alertNotificationSchema);
