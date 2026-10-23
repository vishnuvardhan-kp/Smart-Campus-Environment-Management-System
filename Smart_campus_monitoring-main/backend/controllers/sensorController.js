const CurrentEnvironment = require('../models/CurrentEnvironment');
const EnvironmentHistory = require('../models/EnvironmentHistory');
const SensorFault = require('../models/SensorFault');
const { assessEnvironment } = require('../services/environmentAssessment');
const { getTrendForRoom } = require('../services/environmentTrend');
const { evaluateSensorHealth } = require('./faultController');
const { roomStateMap } = require('../mqtt/subscriber');

// @desc    Get all current environment readings for all rooms
// @route   GET /api/environment/current
const getCurrentEnvironment = async (req, res) => {
    try {
        const now = Date.now();
        let currentData = [];
        let activeFaults = [];

        if (require('mongoose').connection.readyState === 1) {
            try {
                const [dbData, dbFaults] = await Promise.all([
                    CurrentEnvironment.find().sort({ lastUpdated: -1 }).lean(),
                    SensorFault.find({ status: 'ACTIVE' }).lean()
                ]);
                currentData = dbData || [];
                activeFaults = dbFaults || [];
            } catch (e) {
                currentData = Array.from(roomStateMap.values());
            }
        } else {
            currentData = Array.from(roomStateMap.values());
            const { inMemoryFaults } = require('../services/sensorFaultDetection');
            activeFaults = Array.from(inMemoryFaults.values()).filter(f => f.status === 'ACTIVE');
        }

        const dataEnriched = await Promise.all(
            currentData.map(async (doc) => {
                const item = doc.toObject ? doc.toObject() : { ...doc };
                const roomFaults = activeFaults.filter(f => f.room && item.room && f.room.toUpperCase() === item.room.toUpperCase());
                item.assessment = assessEnvironment(item);
                item.trend = await getTrendForRoom(item);
                item.sensorHealth = evaluateSensorHealth(item.lastUpdated, roomFaults, now);
                return item;
            })
        );

        res.status(200).json({
            success: true,
            count: dataEnriched.length,
            data: dataEnriched
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get current environment reading for a specific room
// @route   GET /api/environment/current/:room
const getCurrentEnvironmentByRoom = async (req, res) => {
    try {
        const { room } = req.params;
        let currentData = null;
        let roomFaults = [];

        if (require('mongoose').connection.readyState === 1) {
            try {
                currentData = await CurrentEnvironment.findOne({ room: new RegExp(`^${room}$`, 'i') }).lean();
                roomFaults = await SensorFault.find({ room: new RegExp(`^${room}$`, 'i'), status: 'ACTIVE' }).lean();
            } catch (e) {}
        }

        if (!currentData) {
            for (const [key, val] of roomStateMap.entries()) {
                if (key.toUpperCase() === room.toUpperCase()) {
                    currentData = val;
                    break;
                }
            }
            const { inMemoryFaults } = require('../services/sensorFaultDetection');
            roomFaults = Array.from(inMemoryFaults.values()).filter(f => f.room.toUpperCase() === room.toUpperCase() && f.status === 'ACTIVE');
        }

        if (!currentData) {
            return res.status(404).json({ success: false, message: `No current environment record found for room: ${room}` });
        }

        const now = Date.now();
        const item = currentData.toObject ? currentData.toObject() : { ...currentData };
        item.assessment = assessEnvironment(item);
        item.trend = await getTrendForRoom(item);
        item.sensorHealth = evaluateSensorHealth(item.lastUpdated, roomFaults, now);

        res.status(200).json({
            success: true,
            data: item
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all historical environment records (newest first)
// @route   GET /api/environment/history
const getEnvironmentHistory = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit, 10) || 100;
        const history = await EnvironmentHistory.find()
            .sort({ timestamp: -1 })
            .limit(limit);

        res.status(200).json({
            success: true,
            count: history.length,
            data: history
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get historical environment records for a specific room (newest first)
// @route   GET /api/environment/history/:room
const getEnvironmentHistoryByRoom = async (req, res) => {
    try {
        const { room } = req.params;
        const limit = parseInt(req.query.limit, 10) || 100;

        const history = await EnvironmentHistory.find({ room: new RegExp(`^${room}$`, 'i') })
            .sort({ timestamp: -1 })
            .limit(limit);

        res.status(200).json({
            success: true,
            count: history.length,
            data: history
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Backward-compatible alias for GET /api/sensor/latest
const getLatestReading = async (req, res) => {
    if (req.query.room) {
        return getCurrentEnvironmentByRoom({ params: { room: req.query.room } }, res);
    }
    return getCurrentEnvironment(req, res);
};

module.exports = {
    getCurrentEnvironment,
    getCurrentEnvironmentByRoom,
    getEnvironmentHistory,
    getEnvironmentHistoryByRoom,
    getLatestReading
};
