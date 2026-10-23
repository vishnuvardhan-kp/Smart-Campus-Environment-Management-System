/**
 * Environmental Incident Alert & Notification Engine
 *
 * Implements a complete backend environmental incident notification pipeline:
 * - Deterministic alert detection based on genuine live ESP32 hardware telemetry.
 * - Reuses existing thresholds from environmentAssessment.js.
 * - Distinct separation between temperature, humidity, and sensor-offline incidents.
 * - Robust in-memory deduplication with persistent MongoDB state across restarts.
 * - Configurable cooldown period preventing duplicate notification spam.
 * - Fail-closed provider architecture defaulting to simulated mock delivery.
 * - Safe error handling preventing any crash in MQTT ingestion.
 */

const mongoose = require('mongoose');
const AlertIncident = require('../../models/AlertIncident');
const AlertNotification = require('../../models/AlertNotification');
const {
    ENVIRONMENT_THRESHOLDS,
    evaluateTemperature,
    evaluateHumidity
} = require('../environmentAssessment');
const {
    ROOM_TO_DISPLAY,
    ROOM_TO_BUILDING,
    getAlertConfig,
    maskEmail,
    maskPhoneNumber
} = require('./alertConfig');
const { getSmsProvider } = require('./providers/providerFactory');
const { validateLiveTelemetryForAlerts } = require('./telemetryValidator');
const { orchestrateNotification, handleDelayedDeliveryFailure } = require('./notificationOrchestrator');

// In-memory active incident cache: key `${room.toUpperCase()}_${incidentType}`
const inMemoryActiveIncidents = new Map();

// In-memory notifications log (retained for inspection and fallback)
const inMemoryNotifications = [];

/**
 * Bootstrap active incidents from MongoDB on server startup to maintain cooldown after restart.
 */
async function initAlertService() {
    try {
        if (mongoose.connection.readyState === 1) {
            const activeDocs = await AlertIncident.find({ status: 'ACTIVE' }).lean();
            for (const doc of activeDocs) {
                const key = `${doc.room.toUpperCase()}_${doc.incidentType}`;
                inMemoryActiveIncidents.set(key, { ...doc });
            }
            console.log(`[Alert Engine] Initialized with ${activeDocs.length} active incidents from MongoDB.`);
        }
    } catch (err) {
        console.warn('[Alert Engine] Notice during DB bootstrap (using in-memory):', err.message);
    }
}

/**
 * Format human-readable alert notification SMS body
 */
function formatAlertMessage({ incidentType, room, displayRoom, measuredValue, severity, timestamp }) {
    const timeStr = new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const roomStr = displayRoom && displayRoom !== room ? `${displayRoom} (${room})` : room;

    switch (incidentType) {
        case 'CRITICAL_TEMPERATURE':
            return `[CRITICAL ALERT] ${roomStr}: Critical temperature recorded at ${measuredValue}°C (Threshold: <${ENVIRONMENT_THRESHOLDS.temperature.criticalLow}°C or >${ENVIRONMENT_THRESHOLDS.temperature.criticalHigh}°C) at ${timeStr}. Immediate facility inspection recommended.`;
        
        case 'CRITICAL_HUMIDITY':
            return `[CRITICAL ALERT] ${roomStr}: Critical relative humidity recorded at ${measuredValue}% (Threshold: <${ENVIRONMENT_THRESHOLDS.humidity.criticalLow}% or >${ENVIRONMENT_THRESHOLDS.humidity.criticalHigh}%) at ${timeStr}. Check HVAC/ventilation controls.`;
        
        case 'SENSOR_OFFLINE':
            return `[HARDWARE ALERT] ${roomStr}: Sensor node is OFFLINE. No telemetry received for >45s at ${timeStr}. Check node power and network connectivity.`;

        default:
            return `[ALERT] ${roomStr}: ${incidentType} detected (${severity}) at ${timeStr}.`;
    }
}

/**
 * Find authorized staff recipients for a room/building
 */
function resolveStaffRecipients(room, config) {
    const recipients = config.recipients || [];
    const normalizedRoom = room.toUpperCase();

    // Match configured and enabled recipients across email, whatsapp, or phone
    const matched = recipients.filter(r => {
        if (!r.enabled && !r.phone && !r.email && !r.whatsapp) return false;
        if (!r.rooms) return false;
        return r.rooms.includes('*') || r.rooms.some(rm => rm.toUpperCase() === normalizedRoom);
    });

    if (matched.length > 0) {
        return matched;
    }

    // Fallback placeholder recipient in mock mode
    return [
        {
            id: 'mock-staff-primary',
            name: 'Facility Operations Manager',
            role: 'FACILITY_MANAGER',
            email: 'facility.manager@campus.edu',
            phone: '', // Placeholder
            whatsapp: '', // Placeholder
            enabled: true
        }
    ];
}

/**
 * Core evaluation and deduplication logic for an incident
 */
async function handleIncidentEvaluation({
    incidentType,
    room,
    measuredValue = null,
    severity = 'CRITICAL',
    thresholdInfo = {},
    timestamp = Date.now(),
    customConfig = null
}) {
    const config = customConfig || getAlertConfig();
    const now = new Date(timestamp);
    const normalizedRoom = room.toUpperCase();
    const memKey = `${normalizedRoom}_${incidentType}`;
    const displayRoom = ROOM_TO_DISPLAY[normalizedRoom] || normalizedRoom;
    const building = ROOM_TO_BUILDING[normalizedRoom] || 'Campus';

    let existingIncident = inMemoryActiveIncidents.get(memKey) || null;

    // Check MongoDB if not present in memory
    if (!existingIncident && mongoose.connection.readyState === 1) {
        try {
            existingIncident = await AlertIncident.findOne({
                room: new RegExp(`^${normalizedRoom}$`, 'i'),
                incidentType,
                status: 'ACTIVE'
            });
            if (existingIncident) {
                inMemoryActiveIncidents.set(memKey, existingIncident.toObject ? existingIncident.toObject() : existingIncident);
            }
        } catch (dbErr) {
            console.warn('[Alert Engine] DB read warning:', dbErr.message);
        }
    }

    // -------------------------------------------------------------
    // Scenario 1: Persistent Incident -> Deduplication & Cooldown Check
    // -------------------------------------------------------------
    if (existingIncident) {
        const lastNotified = new Date(existingIncident.lastNotifiedAt || existingIncident.firstTriggeredAt).getTime();
        const elapsedSinceNotification = now.getTime() - lastNotified;

        // Persistent incident within cooldown window: SUPPRESS DUPLICATE NOTIFICATION
        if (elapsedSinceNotification < config.cooldownMs) {
            existingIncident.lastTriggeredAt = now;
            existingIncident.measuredValue = measuredValue;
            inMemoryActiveIncidents.set(memKey, existingIncident);

            if (mongoose.connection.readyState === 1) {
                try {
                    await AlertIncident.updateOne(
                        { incidentId: existingIncident.incidentId },
                        { $set: { lastTriggeredAt: now, measuredValue } }
                    );
                } catch (e) {}
            }

            return {
                alerted: false,
                reason: 'SUPPRESSED_COOLDOWN',
                incident: existingIncident,
                cooldownRemainingMs: config.cooldownMs - elapsedSinceNotification
            };
        }

        // Cooldown has elapsed -> Send reminder notification
        existingIncident.lastTriggeredAt = now;
        existingIncident.lastNotifiedAt = now;
        existingIncident.notificationCount = (existingIncident.notificationCount || 1) + 1;
        existingIncident.measuredValue = measuredValue;
        inMemoryActiveIncidents.set(memKey, existingIncident);

        if (mongoose.connection.readyState === 1) {
            try {
                await AlertIncident.updateOne(
                    { incidentId: existingIncident.incidentId },
                    {
                        $set: {
                            lastTriggeredAt: now,
                            lastNotifiedAt: now,
                            measuredValue
                        },
                        $inc: { notificationCount: 1 }
                    }
                );
            } catch (e) {}
        }

        // Dispatch reminder notification
        const dispatchResult = await dispatchNotification({
            incident: existingIncident,
            incidentType,
            room: normalizedRoom,
            displayRoom,
            measuredValue,
            severity,
            timestamp: now,
            config
        });

        return {
            alerted: true,
            isReminder: true,
            incident: existingIncident,
            delivery: dispatchResult
        };
    }

    // -------------------------------------------------------------
    // Scenario 2: Brand New Incident -> Create & Dispatch Initial Alert
    // -------------------------------------------------------------
    const incidentId = `INC-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const newIncident = {
        incidentId,
        incidentType,
        room: normalizedRoom,
        displayRoom,
        building,
        severity,
        status: 'ACTIVE',
        measuredValue,
        thresholdInfo,
        firstTriggeredAt: now,
        lastTriggeredAt: now,
        lastNotifiedAt: now,
        notificationCount: 1,
        resolvedAt: null,
        metadata: { createdVia: 'AlertIncidentService' }
    };

    inMemoryActiveIncidents.set(memKey, newIncident);

    if (mongoose.connection.readyState === 1) {
        try {
            await AlertIncident.create(newIncident);
            console.log(`[Alert Engine] New ACTIVE Incident logged in MongoDB: ${incidentId} [${incidentType}] in ${displayRoom}`);
        } catch (dbErr) {
            console.warn('[Alert Engine] DB incident persistence warning:', dbErr.message);
        }
    }

    const dispatchResult = await dispatchNotification({
        incident: newIncident,
        incidentType,
        room: normalizedRoom,
        displayRoom,
        measuredValue,
        severity,
        timestamp: now,
        config
    });

    return {
        alerted: true,
        isReminder: false,
        incident: newIncident,
        delivery: dispatchResult
    };
}

/**
 * Dispatch notification via the configured provider sequence (Email-first, WhatsApp-fallback, or SMS)
 */
async function dispatchNotification({
    incident,
    incidentType,
    room,
    displayRoom,
    measuredValue,
    severity,
    timestamp,
    config
}) {
    const recipients = resolveStaffRecipients(room, config);
    const channelOrder = (config && config.channelOrder) || ['email', 'whatsapp'];

    // 1. Multi-channel Email-first and WhatsApp-fallback pipeline
    if (channelOrder.includes('email') || channelOrder.includes('whatsapp')) {
        return await orchestrateNotification({
            incident,
            incidentType,
            room,
            displayRoom,
            measuredValue,
            severity,
            timestamp,
            config,
            recipients,
            inMemoryNotifications
        });
    }

    // 2. Retained SMS provider pipeline (when channelOrder is explicitly ['sms'])
    const message = formatAlertMessage({
        incidentType,
        room,
        displayRoom,
        measuredValue,
        severity,
        timestamp
    });

    const provider = getSmsProvider(config);
    const results = [];

    for (const recipient of recipients) {
        let deliveryAttempt;
        try {
            deliveryAttempt = await provider.sendSms({
                to: recipient.phone,
                recipientName: recipient.name,
                recipientRole: recipient.role,
                message,
                incident,
                room,
                severity
            });
        } catch (providerErr) {
            deliveryAttempt = {
                success: false,
                channel: 'sms',
                provider: provider.name,
                status: 'FAILED',
                error: providerErr.message,
                simulated: provider.name === 'mock'
            };
        }

        const notificationId = `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        const notificationRecord = {
            notificationId,
            idempotencyKey: `${incident.incidentId}_att${incident.notificationCount || 1}_${recipient.id || recipient.name}_sms`,
            incidentId: incident.incidentId,
            incidentType,
            channel: 'sms',
            attemptNumber: 1,
            room,
            displayRoom,
            recipient: recipient.name,
            recipientRole: recipient.role || 'STAFF',
            recipientPhone: maskPhoneNumber(recipient.phone),
            message,
            providerMode: provider.name === 'mock' ? 'mock' : 'twilio',
            acceptanceStatus: deliveryAttempt.success ? 'ACCEPTED' : 'REJECTED',
            deliveryStatus: deliveryAttempt.status || (deliveryAttempt.success ? 'SIMULATED' : 'FAILED'),
            fallbackTriggered: false,
            fallbackReason: null,
            simulated: deliveryAttempt.simulated !== false,
            externalMessageId: deliveryAttempt.messageId || null,
            eventTime: timestamp,
            error: deliveryAttempt.error || null,
            metadata: {
                severity,
                measuredValue
            }
        };

        inMemoryNotifications.push(notificationRecord);
        if (inMemoryNotifications.length > 200) {
            inMemoryNotifications.shift();
        }

        if (mongoose.connection.readyState === 1) {
            try {
                await AlertNotification.create(notificationRecord);
            } catch (dbErr) {
                console.warn('[Alert Engine] DB notification persistence warning:', dbErr.message);
            }
        }

        results.push(deliveryAttempt);
    }

    return results;
}

/**
 * Auto-resolve an active incident when healthy telemetry returns
 */
async function resolveIncident({ room, incidentType, timestamp = Date.now() }) {
    const normalizedRoom = room.toUpperCase();
    const memKey = `${normalizedRoom}_${incidentType}`;
    const now = new Date(timestamp);

    if (inMemoryActiveIncidents.has(memKey)) {
        const inc = inMemoryActiveIncidents.get(memKey);
        inc.status = 'RESOLVED';
        inc.resolvedAt = now;
        inMemoryActiveIncidents.delete(memKey);
    }

    if (mongoose.connection.readyState === 1) {
        try {
            const result = await AlertIncident.updateMany(
                {
                    room: new RegExp(`^${normalizedRoom}$`, 'i'),
                    incidentType,
                    status: 'ACTIVE'
                },
                {
                    $set: {
                        status: 'RESOLVED',
                        resolvedAt: now
                    }
                }
            );
            if (result.modifiedCount > 0) {
                console.log(`[Alert Engine] Auto-RESOLVED incident: [${normalizedRoom}] ${incidentType}`);
            }
            return result.modifiedCount;
        } catch (dbErr) {
            console.warn('[Alert Engine] DB resolve warning:', dbErr.message);
        }
    }

    return 1;
}

/**
 * High-level telemetry evaluation entrypoint (called from MQTT subscriber on valid live readings)
 */
async function processTelemetryReading(reading, customConfig = null) {
    try {
        const validation = validateLiveTelemetryForAlerts(reading, customConfig);
        if (!validation.isValid) {
            return { alerted: false, reason: validation.reason };
        }

        const { room, temperature, humidity, timestamp } = validation.sanitized;
        const results = {
            temperature: null,
            humidity: null
        };

        // 1. Temperature Evaluation
        if (typeof temperature === 'number') {
            const tempEval = evaluateTemperature(temperature);
            if (tempEval.status === 'CRITICAL') {
                results.temperature = await handleIncidentEvaluation({
                    incidentType: 'CRITICAL_TEMPERATURE',
                    room,
                    measuredValue: temperature,
                    severity: 'CRITICAL',
                    thresholdInfo: ENVIRONMENT_THRESHOLDS.temperature,
                    timestamp,
                    customConfig
                });
            } else {
                // If previously active, auto-resolve
                await resolveIncident({ room, incidentType: 'CRITICAL_TEMPERATURE', timestamp });
            }
        }

        // 2. Humidity Evaluation
        if (typeof humidity === 'number') {
            const humEval = evaluateHumidity(humidity);
            if (humEval.status === 'CRITICAL') {
                results.humidity = await handleIncidentEvaluation({
                    incidentType: 'CRITICAL_HUMIDITY',
                    room,
                    measuredValue: humidity,
                    severity: 'CRITICAL',
                    thresholdInfo: ENVIRONMENT_THRESHOLDS.humidity,
                    timestamp,
                    customConfig
                });
            } else {
                // If previously active, auto-resolve
                await resolveIncident({ room, incidentType: 'CRITICAL_HUMIDITY', timestamp });
            }
        }

        return {
            alerted: Boolean((results.temperature && results.temperature.alerted) || (results.humidity && results.humidity.alerted)),
            results
        };
    } catch (err) {
        console.error('[Alert Engine] Safe error during processTelemetryReading:', err.message);
        return { alerted: false, error: err.message };
    }
}

/**
 * High-level sensor offline entrypoint (called when offline fault is confirmed)
 */
async function processOfflineIncident({ room, timestamp = Date.now(), customConfig = null }) {
    try {
        const config = customConfig || getAlertConfig();
        const targetRoom = (config.espRoom || 'LAB101').trim().toUpperCase();
        const normalizedRoom = (room || '').trim().toUpperCase();

        // Only genuine live hardware room can trigger sensor-offline alerts
        if (normalizedRoom !== targetRoom && normalizedRoom !== 'CC1') {
            return { alerted: false, reason: 'NON_HARDWARE_ROOM' };
        }

        return await handleIncidentEvaluation({
            incidentType: 'SENSOR_OFFLINE',
            room: targetRoom,
            measuredValue: null,
            severity: 'CRITICAL',
            thresholdInfo: { offlineTimeoutMs: 45000 },
            timestamp,
            customConfig: config
        });
    } catch (err) {
        console.error('[Alert Engine] Safe error during processOfflineIncident:', err.message);
        return { alerted: false, error: err.message };
    }
}

/**
 * High-level sensor recovery entrypoint (called when offline device reconnects)
 */
async function resolveOfflineIncident({ room, timestamp = Date.now() }) {
    try {
        const normalizedRoom = (room || '').trim().toUpperCase();
        return await resolveIncident({
            room: normalizedRoom,
            incidentType: 'SENSOR_OFFLINE',
            timestamp
        });
    } catch (err) {
        console.error('[Alert Engine] Safe error during resolveOfflineIncident:', err.message);
        return 0;
    }
}

module.exports = {
    inMemoryActiveIncidents,
    inMemoryNotifications,
    initAlertService,
    handleIncidentEvaluation,
    resolveIncident,
    processTelemetryReading,
    processOfflineIncident,
    resolveOfflineIncident,
    formatAlertMessage,
    resolveStaffRecipients,
    orchestrateNotification,
    handleDelayedDeliveryFailure
};
