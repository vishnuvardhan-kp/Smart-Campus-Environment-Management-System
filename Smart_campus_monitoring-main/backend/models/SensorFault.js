const mongoose = require('mongoose');

const sensorFaultSchema = new mongoose.Schema(
    {
        room: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        sensorType: {
            type: String,
            default: 'DHT11'
        },
        faultType: {
            type: String,
            required: true,
            enum: [
                'DEVICE_OFFLINE',
                'SUDDEN_TEMP_CHANGE',
                'IMPLAUSIBLE_READING',
                'STUCK_SENSOR',
                'THRESHOLD_PREDICTION'
            ]
        },
        severity: {
            type: String,
            required: true,
            enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
            default: 'MEDIUM'
        },
        status: {
            type: String,
            required: true,
            enum: ['ACTIVE', 'RESOLVED'],
            default: 'ACTIVE',
            index: true
        },
        message: {
            type: String,
            required: true
        },
        metric: {
            type: String,
            enum: ['temperature', 'humidity', 'peopleCount', 'connectivity', 'telemetry', 'general'],
            default: 'general'
        },
        firstSeen: {
            type: Date,
            default: Date.now
        },
        lastSeen: {
            type: Date,
            default: Date.now
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
        collection: 'sensor_faults',
        timestamps: true
    }
);

sensorFaultSchema.index({ room: 1, faultType: 1, status: 1 });
sensorFaultSchema.index({ status: 1, lastSeen: -1 });

module.exports = mongoose.model('SensorFault', sensorFaultSchema);
