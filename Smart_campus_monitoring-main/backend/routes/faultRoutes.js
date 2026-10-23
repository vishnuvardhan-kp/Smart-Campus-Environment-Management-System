const express = require('express');
const router = express.Router();
const {
    getActiveFaults,
    getFaultHistory,
    getSensorHealthSummary,
    getRoomHealth
} = require('../controllers/faultController');

// @route   GET /api/faults/active
// @desc    Retrieve all currently active sensor faults and anomalies
router.get('/active', getActiveFaults);

// @route   GET /api/faults/history
// @desc    Retrieve paginated historical fault events
router.get('/history', getFaultHistory);

// @route   GET /api/faults/health
// @desc    Retrieve campus-wide sensor connectivity and hardware health breakdown
router.get('/health', getSensorHealthSummary);

// @route   GET /api/faults/room/:room
// @desc    Retrieve detailed sensor health and diagnostic status for a specific room
router.get('/room/:room', getRoomHealth);

module.exports = router;
