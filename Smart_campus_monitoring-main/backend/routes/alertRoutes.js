const express = require('express');
const router = express.Router();
const {
    getAlertIncidents,
    getAlertNotifications,
    getAlertSystemConfig
} = require('../controllers/alertController');

// @route   GET /api/alerts/incidents
router.get('/incidents', getAlertIncidents);

// @route   GET /api/alerts/notifications
router.get('/notifications', getAlertNotifications);

// @route   GET /api/alerts/config
router.get('/config', getAlertSystemConfig);

module.exports = router;
