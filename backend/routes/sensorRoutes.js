const express = require('express');
const router = express.Router();
const {
    getCurrentEnvironment,
    getCurrentEnvironmentByRoom,
    getEnvironmentHistory,
    getEnvironmentHistoryByRoom,
    getLatestReading
} = require('../controllers/sensorController');

// Legacy & alias endpoints for /api/sensor
router.get('/latest', getLatestReading);
router.get('/current', getCurrentEnvironment);
router.get('/current/:room', getCurrentEnvironmentByRoom);
router.get('/history', getEnvironmentHistory);
router.get('/history/:room', getEnvironmentHistoryByRoom);

module.exports = router;
