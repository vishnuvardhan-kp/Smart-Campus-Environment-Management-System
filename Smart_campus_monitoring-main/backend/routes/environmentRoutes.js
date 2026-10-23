const express = require('express');
const router = express.Router();
const {
    getCurrentEnvironment,
    getCurrentEnvironmentByRoom,
    getEnvironmentHistory,
    getEnvironmentHistoryByRoom
} = require('../controllers/sensorController');

// @route   GET /api/environment/current
router.get('/current', getCurrentEnvironment);

// @route   GET /api/environment/current/:room
router.get('/current/:room', getCurrentEnvironmentByRoom);

// @route   GET /api/environment/history
router.get('/history', getEnvironmentHistory);

// @route   GET /api/environment/history/:room
router.get('/history/:room', getEnvironmentHistoryByRoom);

module.exports = router;
