const mongoose = require('mongoose');

const alertIncidentSchema = new mongoose.Schema(
    {
        incidentId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        incidentType: {
            type: String,
            required: true,
            enum: ['CRITICAL_TEMPERATURE', 'CRITICAL_HUMIDITY', 'SENSOR_OFFLINE'],
            index: true
        },
        room: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        displayRoom: {
            type: String,
            default: 'CC1'
        },
        building: {
            type: String,
            default: 'IT Park'
        },
        severity: {
            type: String,
            required: true,
            enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
            default: 'CRITICAL'
        },
        status: {
            type: String,
            required: true,
            enum: ['ACTIVE', 'RESOLVED', 'COOLDOWN'],
            default: 'ACTIVE',
            index: true
        },
        measuredValue: {
            type: Number,
            default: null
        },
        thresholdInfo: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        firstTriggeredAt: {
            type: Date,
            default: Date.now
        },
        lastTriggeredAt: {
            type: Date,
            default: Date.now
        },
        lastNotifiedAt: {
            type: Date,
            default: Date.now
        },
        notificationCount: {
            type: Number,
            default: 1
        },
        channelsAttempted: {
            type: [String],
            default: []
        },
        finalDeliveryOutcome: {
            type: String,
            default: null
        },
        notificationAttempts: {
            type: [mongoose.Schema.Types.Mixed],
            default: []
        },
        resolvedAt: {
            type: Date,
            default: null
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    {
        collection: 'alert_incidents',
        timestamps: true
    }
);

alertIncidentSchema.index({ room: 1, incidentType: 1, status: 1 });
alertIncidentSchema.index({ status: 1, lastTriggeredAt: -1 });

module.exports = mongoose.model('AlertIncident', alertIncidentSchema);
