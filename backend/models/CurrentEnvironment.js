const mongoose = require('mongoose');

const currentEnvironmentSchema = new mongoose.Schema(
    {
        room: {
            type: String,
            required: true,
            unique: true,
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
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    },
    {
        collection: 'current_environment'
    }
);

module.exports = mongoose.model('CurrentEnvironment', currentEnvironmentSchema);
