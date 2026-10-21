const CurrentEnvironment = require('../models/CurrentEnvironment');
const EnvironmentHistory = require('../models/EnvironmentHistory');
const { assessEnvironment } = require('../services/environmentAssessment');
const { getTrendForRoom } = require('../services/environmentTrend');

// @desc    Get all current environment readings for all rooms
// @route   GET /api/environment/current
const getCurrentEnvironment = async (req, res) => {
    try {
        const currentData = await CurrentEnvironment.find().sort({ lastUpdated: -1 });
        const dataEnriched = await Promise.all(
            currentData.map(async (doc) => {
                const item = doc.toObject ? doc.toObject() : { ...doc };
                item.assessment = assessEnvironment(item);
                item.trend = await getTrendForRoom(item);
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
        const currentData = await CurrentEnvironment.findOne({ room: new RegExp(`^${room}$`, 'i') });

        if (!currentData) {
            return res.status(404).json({ success: false, message: `No current environment record found for room: ${room}` });
        }

        const item = currentData.toObject ? currentData.toObject() : { ...currentData };
        item.assessment = assessEnvironment(item);
        item.trend = await getTrendForRoom(item);

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
