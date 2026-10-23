/**
 * Alert Incident & Notification Controller
 */

const mongoose = require('mongoose');
const AlertIncident = require('../models/AlertIncident');
const AlertNotification = require('../models/AlertNotification');
const { getAlertConfig, getSanitizedConfig } = require('../services/alerts/alertConfig');
const { inMemoryActiveIncidents, inMemoryNotifications } = require('../services/alerts/alertIncidentService');

// @desc    Get active or historical alert incidents
// @route   GET /api/alerts/incidents
const getAlertIncidents = async (req, res) => {
    try {
        const { status, room, incidentType, limit = 50 } = req.query;
        let incidents = [];

        if (mongoose.connection.readyState === 1) {
            try {
                const query = {};
                if (status) query.status = status.toUpperCase().trim();
                if (room) query.room = new RegExp(`^${room.trim()}$`, 'i');
                if (incidentType) query.incidentType = incidentType.toUpperCase().trim();

                incidents = await AlertIncident.find(query)
                    .sort({ lastTriggeredAt: -1 })
                    .limit(parseInt(limit, 10))
                    .lean();
            } catch (dbErr) {
                incidents = Array.from(inMemoryActiveIncidents.values());
            }
        } else {
            incidents = Array.from(inMemoryActiveIncidents.values());
            if (status) incidents = incidents.filter(i => i.status === status.toUpperCase().trim());
            if (room) incidents = incidents.filter(i => i.room.toUpperCase() === room.toUpperCase().trim());
            if (incidentType) incidents = incidents.filter(i => i.incidentType === incidentType.toUpperCase().trim());
        }

        res.status(200).json({
            success: true,
            count: incidents.length,
            data: incidents
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get mock or sent alert notification history
// @route   GET /api/alerts/notifications
const getAlertNotifications = async (req, res) => {
    try {
        const { incidentId, room, limit = 50 } = req.query;
        let notifications = [];

        if (mongoose.connection.readyState === 1) {
            try {
                const query = {};
                if (incidentId) query.incidentId = incidentId;
                if (room) query.room = new RegExp(`^${room.trim()}$`, 'i');

                notifications = await AlertNotification.find(query)
                    .sort({ eventTime: -1 })
                    .limit(parseInt(limit, 10))
                    .lean();
            } catch (dbErr) {
                notifications = [...inMemoryNotifications].reverse();
            }
        } else {
            notifications = [...inMemoryNotifications].reverse();
            if (incidentId) notifications = notifications.filter(n => n.incidentId === incidentId);
            if (room) notifications = notifications.filter(n => n.room.toUpperCase() === room.toUpperCase().trim());
        }

        res.status(200).json({
            success: true,
            count: notifications.length,
            data: notifications
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get sanitized alert system configuration (provider, delivery gate, cooldown)
// @route   GET /api/alerts/config
const getAlertSystemConfig = async (req, res) => {
    try {
        const sanitized = getSanitizedConfig();
        res.status(200).json({
            success: true,
            data: sanitized
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getAlertIncidents,
    getAlertNotifications,
    getAlertSystemConfig
};
