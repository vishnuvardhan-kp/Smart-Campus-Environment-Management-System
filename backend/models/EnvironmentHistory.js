const mongoose = require('mongoose');

const environmentHistorySchema = new mongoose.Schema(
    {
        room: {
            type: String,
            required: true,
            trim: true
        },
        temperature: {
            type: Number,
            required: false,
            default: null
        },
        humidity: {
            type: Number,
            required: false,
            default: null
        },
        peopleCount: {
            type: Number,
            default: 0
        },
        light: {
            type: String,
            default: 'OFF'
        },
        fan: {
            type: String,
            default: 'OFF'
        },
        systemStatus: {
            type: String,
            default: 'Connected'
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    },
    {
        collection: 'environment_history'
    }
);

environmentHistorySchema.index({ room: 1, timestamp: -1 });

module.exports = mongoose.model('EnvironmentHistory', environmentHistorySchema);
