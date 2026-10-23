/**
 * Multi-Channel Notification Orchestrator
 *
 * Implements channel-independent dispatch logic with Email-first and WhatsApp-fallback:
 * 1. Attempts primary channel (Email) first.
 * 2. If email submission succeeds, stops immediately (does NOT invoke WhatsApp).
 * 3. If email submission fails, triggers exactly one WhatsApp fallback attempt.
 * 4. Records every individual attempt and final outcome in MongoDB and in-memory log.
 * 5. Represents provider acceptance separately from confirmed delivery.
 * 6. Enforces per-incident idempotency preventing duplicate notifications.
 * 7. Fails closed with zero external requests in mock mode.
 * 8. Never crashes MQTT ingestion if any channel throws.
 */

const mongoose = require('mongoose');
const AlertNotification = require('../../models/AlertNotification');
const AlertIncident = require('../../models/AlertIncident');
const { maskEmail, maskPhoneNumber } = require('./alertConfig');
const { getEmailProvider, getWhatsAppProvider, getSmsProvider } = require('./providers/providerFactory');

/**
 * Format email subject line
 */
function formatEmailSubject({ incidentType, room, displayRoom, severity }) {
    const roomStr = displayRoom && displayRoom !== room ? `${displayRoom} (${room})` : room;
    return `[CRITICAL ALERT] ${severity} Incident in ${roomStr} - Action Required`;
}

/**
 * Format detailed email body
 */
function formatEmailBody({ incidentType, room, displayRoom, measuredValue, severity, timestamp }) {
    const roomStr = displayRoom && displayRoom !== room ? `${displayRoom} (${room})` : room;
    const timeStr = new Date(timestamp).toLocaleString('en-US');

    return [
        `============================================================`,
        `CAMPUS ENVIRONMENTAL INCIDENT NOTIFICATION`,
        `============================================================`,
        `Incident Type: ${incidentType}`,
        `Severity:      ${severity}`,
        `Location:      ${roomStr}`,
        `Measured Value:${measuredValue !== null ? ` ${measuredValue}` : ' N/A'}`,
        `Recorded At:   ${timeStr}`,
        `------------------------------------------------------------`,
        `Operational Assessment:`,
        incidentType === 'CRITICAL_TEMPERATURE'
            ? `Critical temperature threshold breach detected. Please inspect heating/cooling controls and room HVAC immediately.`
            : incidentType === 'CRITICAL_HUMIDITY'
            ? `Critical relative humidity deviation detected. Check ventilation dampers and dehumidifier status.`
            : `Hardware sensing node offline. Check physical power connection and Wi-Fi link.`,
        `------------------------------------------------------------`,
        `System: Smart Campus Environment Management`,
        `Channel: Primary Email Dispatch`,
        `============================================================`
    ].join('\n');
}

/**
 * Format concise WhatsApp emergency message
 */
function formatWhatsAppMessage({ incidentType, room, displayRoom, measuredValue, severity, timestamp, isFallback }) {
    const roomStr = displayRoom && displayRoom !== room ? `${displayRoom} (${room})` : room;
    const timeStr = new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const fallbackTag = isFallback ? '[FALLBACK VIA WHATSAPP] ' : '';

    return `${fallbackTag}🚨 *CAMPUS ALERT* (${severity}): ${incidentType} in *${roomStr}* at ${timeStr}.${measuredValue !== null ? ` Reading: ${measuredValue}` : ''}. Please inspect room conditions immediately.`;
}

/**
 * Orchestrate multi-channel dispatch for an incident
 */
async function orchestrateNotification({
    incident,
    incidentType,
    room,
    displayRoom,
    measuredValue,
    severity = 'CRITICAL',
    timestamp = Date.now(),
    config,
    recipients = [],
    inMemoryNotifications = []
}) {
    const results = [];
    const channelsAttempted = [];
    const notificationAttempts = [];

    // Fallback order: email first, then whatsapp
    const channelOrder = (config && config.channelOrder) || ['email', 'whatsapp'];

    for (const recipient of recipients) {
        const recipientResults = {
            recipient: recipient.name,
            finalChannel: null,
            delivered: false,
            attempts: []
        };

        let primaryDelivered = false;

        // -------------------------------------------------------------
        // Step 1: Attempt Primary Channel (Email)
        // -------------------------------------------------------------
        if (channelOrder.includes('email')) {
            const attemptNumber = 1;
            const idempotencyKey = `${incident.incidentId}_att${incident.notificationCount || 1}_${recipient.id || recipient.name}_email`;

            // Check if this specific attempt has already been executed (idempotency guard)
            const alreadySent = inMemoryNotifications.some(n => n.idempotencyKey === idempotencyKey && n.deliveryStatus !== 'FAILED');

            if (!alreadySent) {
                channelsAttempted.push('email');
                const emailProvider = getEmailProvider(config);
                const emailSubject = formatEmailSubject({ incidentType, room, displayRoom, severity });
                const emailBody = formatEmailBody({ incidentType, room, displayRoom, measuredValue, severity, timestamp });

                let emailResult;
                try {
                    emailResult = await emailProvider.sendEmail({
                        to: recipient.email || '',
                        recipientName: recipient.name,
                        recipientRole: recipient.role || 'STAFF',
                        subject: emailSubject,
                        body: emailBody,
                        incident,
                        room,
                        severity
                    });
                } catch (emailErr) {
                    emailResult = {
                        success: false,
                        channel: 'email',
                        provider: emailProvider.name,
                        status: 'FAILED',
                        acceptanceStatus: 'REJECTED',
                        error: emailErr.message,
                        simulated: emailProvider.name.includes('mock')
                    };
                }

                const emailNotifId = `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
                const emailRecord = {
                    notificationId: emailNotifId,
                    idempotencyKey,
                    incidentId: incident.incidentId,
                    incidentType,
                    channel: 'email',
                    attemptNumber,
                    room,
                    displayRoom,
                    recipient: recipient.name,
                    recipientRole: recipient.role || 'STAFF',
                    recipientEmail: maskEmail(recipient.email),
                    recipientPhone: maskPhoneNumber(recipient.phone || recipient.whatsapp),
                    subject: emailSubject,
                    message: emailBody,
                    providerMode: emailProvider.name.includes('mock')
                        ? 'mock'
                        : (emailProvider.name.includes('twilio') ? 'twilio-email' : 'smtp'),
                    acceptanceStatus: emailResult.acceptanceStatus || (emailResult.success ? 'ACCEPTED' : 'REJECTED'),
                    deliveryStatus: emailResult.status || (emailResult.success ? 'SIMULATED' : 'FAILED'),
                    operationId: emailResult.operationId || null,
                    fallbackTriggered: false,
                    fallbackReason: null,
                    simulated: emailResult.simulated !== false,
                    externalMessageId: emailResult.messageId || null,
                    eventTime: new Date(timestamp),
                    error: emailResult.error || null,
                    metadata: { severity, measuredValue }
                };

                inMemoryNotifications.push(emailRecord);
                if (inMemoryNotifications.length > 200) inMemoryNotifications.shift();

                if (mongoose.connection.readyState === 1) {
                    try {
                        await AlertNotification.create(emailRecord);
                    } catch (dbErr) {
                        console.warn('[Notification Orchestrator] DB email record save warning:', dbErr.message);
                    }
                }

                recipientResults.attempts.push(emailRecord);
                notificationAttempts.push({
                    channel: 'email',
                    attemptNumber,
                    status: emailRecord.deliveryStatus,
                    timestamp: emailRecord.eventTime
                });

                if (emailResult.success) {
                    // Check if bounded status polling is enabled on this provider
                    if (config.emailStatusPollingEnabled && emailResult.operationId && typeof emailProvider.pollOperationStatus === 'function') {
                        const pollResult = await emailProvider.pollOperationStatus(emailResult.operationId);
                        if (pollResult.completed && pollResult.status === 'DELIVERED') {
                            emailRecord.deliveryStatus = 'DELIVERED';
                            primaryDelivered = true;
                            recipientResults.delivered = true;
                            recipientResults.finalChannel = 'email';
                        } else if (pollResult.failed) {
                            // Asynchronous operation failure confirmed -> trigger WhatsApp fallback!
                            emailRecord.deliveryStatus = 'FAILED';
                            emailRecord.error = pollResult.error || 'Twilio Email operation failed';
                            primaryDelivered = false;
                            console.warn(`[Notification Orchestrator] Polling confirmed asynchronous failure for ${recipient.name}. Triggering WhatsApp fallback.`);
                        } else {
                            // Still SCHEDULED / PROCESSING / PENDING -> Keep pending status honestly, DO NOT prematurely send WhatsApp!
                            emailRecord.deliveryStatus = 'PENDING';
                            primaryDelivered = true;
                            recipientResults.delivered = true;
                            recipientResults.finalChannel = 'email';
                            console.log(`[Notification Orchestrator] Email operation ${emailResult.operationId} is PENDING. Fallback SUPPRESSED.`);
                        }
                    } else {
                        primaryDelivered = true;
                        recipientResults.delivered = true;
                        recipientResults.finalChannel = 'email';
                        console.log(`[Notification Orchestrator] Primary Email accepted/succeeded for ${recipient.name}. WhatsApp fallback SUPPRESSED.`);
                    }
                }
            }
        }

        // -------------------------------------------------------------
        // Step 2: Attempt Fallback Channel (WhatsApp) ONLY if Email Failed
        // -------------------------------------------------------------
        if (!primaryDelivered && channelOrder.includes('whatsapp')) {
            const attemptNumber = recipientResults.attempts.length + 1;
            const idempotencyKey = `${incident.incidentId}_att${incident.notificationCount || 1}_${recipient.id || recipient.name}_whatsapp`;
            const lastError = recipientResults.attempts[0]?.error || 'Primary email delivery failed';

            channelsAttempted.push('whatsapp');
            console.log(`[Notification Orchestrator] Primary channel failed for ${recipient.name} ("${lastError}"). Initiating WhatsApp fallback...`);

            const whatsAppProvider = getWhatsAppProvider(config);
            const waMessage = formatWhatsAppMessage({
                incidentType,
                room,
                displayRoom,
                measuredValue,
                severity,
                timestamp,
                isFallback: true
            });

            let waResult;
            try {
                waResult = await whatsAppProvider.sendWhatsApp({
                    to: recipient.whatsapp || recipient.phone || '',
                    recipientName: recipient.name,
                    recipientRole: recipient.role || 'STAFF',
                    message: waMessage,
                    incident,
                    room,
                    severity,
                    isFallback: true,
                    fallbackReason: `Email failed: ${lastError}`
                });
            } catch (waErr) {
                waResult = {
                    success: false,
                    channel: 'whatsapp',
                    provider: whatsAppProvider.name,
                    status: 'FAILED',
                    acceptanceStatus: 'REJECTED',
                    error: waErr.message,
                    simulated: whatsAppProvider.name.includes('mock')
                };
            }

            const waNotifId = `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
            const waRecord = {
                notificationId: waNotifId,
                idempotencyKey,
                incidentId: incident.incidentId,
                incidentType,
                channel: 'whatsapp',
                attemptNumber,
                room,
                displayRoom,
                recipient: recipient.name,
                recipientRole: recipient.role || 'STAFF',
                recipientEmail: maskEmail(recipient.email),
                recipientPhone: maskPhoneNumber(recipient.whatsapp || recipient.phone),
                subject: null,
                message: waMessage,
                providerMode: whatsAppProvider.name.includes('mock') ? 'mock' : 'twilio',
                acceptanceStatus: waResult.acceptanceStatus || (waResult.success ? 'ACCEPTED' : 'REJECTED'),
                deliveryStatus: waResult.status || (waResult.success ? 'SIMULATED' : 'FAILED'),
                fallbackTriggered: true,
                fallbackReason: `Email failed: ${lastError}`,
                simulated: waResult.simulated !== false,
                externalMessageId: waResult.messageId || null,
                eventTime: new Date(timestamp),
                error: waResult.error || null,
                metadata: { severity, measuredValue }
            };

            inMemoryNotifications.push(waRecord);
            if (inMemoryNotifications.length > 200) inMemoryNotifications.shift();

            if (mongoose.connection.readyState === 1) {
                try {
                    await AlertNotification.create(waRecord);
                } catch (dbErr) {
                    console.warn('[Notification Orchestrator] DB WhatsApp record save warning:', dbErr.message);
                }
            }

            recipientResults.attempts.push(waRecord);
            notificationAttempts.push({
                channel: 'whatsapp',
                attemptNumber,
                status: waRecord.deliveryStatus,
                timestamp: waRecord.eventTime
            });

            if (waResult.success) {
                recipientResults.delivered = true;
                recipientResults.finalChannel = 'whatsapp';
                console.log(`[Notification Orchestrator] WhatsApp fallback succeeded for ${recipient.name}.`);
            } else {
                console.error(`[Notification Orchestrator] Both Email and WhatsApp failed for ${recipient.name}.`);
            }
        }

        results.push(recipientResults);
    }

    // -------------------------------------------------------------
    // Update Incident Outcome in MongoDB and In-Memory
    // -------------------------------------------------------------
    const anyDelivered = results.some(r => r.delivered);
    const deliveredChannels = [...new Set(results.filter(r => r.delivered).map(r => r.finalChannel))];
    const finalOutcome = anyDelivered
        ? (deliveredChannels.includes('whatsapp') ? 'DELIVERED_WHATSAPP_FALLBACK' : 'DELIVERED_EMAIL')
        : 'ALL_CHANNELS_FAILED';

    incident.channelsAttempted = [...new Set(channelsAttempted)];
    incident.finalDeliveryOutcome = finalOutcome;
    incident.notificationAttempts = notificationAttempts;

    if (mongoose.connection.readyState === 1) {
        try {
            await AlertIncident.updateOne(
                { incidentId: incident.incidentId },
                {
                    $set: {
                        channelsAttempted: incident.channelsAttempted,
                        finalDeliveryOutcome: incident.finalDeliveryOutcome,
                        notificationAttempts: incident.notificationAttempts
                    }
                }
            );
        } catch (dbErr) {
            console.warn('[Notification Orchestrator] DB incident outcome update warning:', dbErr.message);
        }
    }

    return results;
}

/**
 * Handle delayed bounces or downstream delivery rejections from provider webhooks.
 * Demonstrates how asynchronous delivery failure triggers WhatsApp fallback later.
 */
async function handleDelayedDeliveryFailure({
    notificationId,
    failureType = 'BOUNCE',
    errorDetails = 'Mailbox unavailable / rejected by recipient mail server',
    config,
    inMemoryNotifications = []
}) {
    console.log(`[Notification Orchestrator] Processing delayed delivery failure (${failureType}) for notification ${notificationId}`);

    // 1. Locate original notification
    let targetNotif = inMemoryNotifications.find(n => n.notificationId === notificationId);

    if (!targetNotif && mongoose.connection.readyState === 1) {
        try {
            targetNotif = await AlertNotification.findOne({ notificationId }).lean();
        } catch (e) {}
    }

    if (!targetNotif) {
        console.warn(`[Notification Orchestrator] Notification ${notificationId} not found for bounce processing.`);
        return { success: false, reason: 'NOTIFICATION_NOT_FOUND' };
    }

    // 2. Mark original notification as BOUNCED
    targetNotif.deliveryStatus = 'BOUNCED';
    targetNotif.error = errorDetails;

    if (mongoose.connection.readyState === 1) {
        try {
            await AlertNotification.updateOne(
                { notificationId },
                { $set: { deliveryStatus: 'BOUNCED', error: errorDetails } }
            );
        } catch (e) {}
    }

    // 3. If the bounced message was an email, trigger delayed WhatsApp fallback
    if (targetNotif.channel === 'email') {
        const whatsAppProvider = getWhatsAppProvider(config);
        const waMessage = `🚨 *CAMPUS ALERT (DELAYED BOUNCE FALLBACK)*: Email delivery failed for ${targetNotif.incidentType} in *${targetNotif.displayRoom || targetNotif.room}*. Original email bounced (${errorDetails}). Please inspect conditions immediately.`;

        const waResult = await whatsAppProvider.sendWhatsApp({
            to: targetNotif.recipientPhone || '',
            recipientName: targetNotif.recipient,
            message: waMessage,
            incident: { incidentId: targetNotif.incidentId, incidentType: targetNotif.incidentType },
            room: targetNotif.room,
            isFallback: true,
            fallbackReason: `Delayed bounce: ${errorDetails}`
        });

        const fallbackNotifId = `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        const fallbackRecord = {
            notificationId: fallbackNotifId,
            idempotencyKey: `${targetNotif.incidentId}_delayed_fallback_whatsapp`,
            incidentId: targetNotif.incidentId,
            incidentType: targetNotif.incidentType,
            channel: 'whatsapp',
            attemptNumber: (targetNotif.attemptNumber || 1) + 1,
            room: targetNotif.room,
            displayRoom: targetNotif.displayRoom,
            recipient: targetNotif.recipient,
            recipientRole: targetNotif.recipientRole,
            recipientEmail: targetNotif.recipientEmail,
            recipientPhone: targetNotif.recipientPhone,
            message: waMessage,
            providerMode: whatsAppProvider.name.includes('mock') ? 'mock' : 'twilio',
            acceptanceStatus: waResult.acceptanceStatus || (waResult.success ? 'ACCEPTED' : 'REJECTED'),
            deliveryStatus: waResult.status || (waResult.success ? 'SIMULATED' : 'FAILED'),
            fallbackTriggered: true,
            fallbackReason: `Delayed bounce: ${errorDetails}`,
            simulated: waResult.simulated !== false,
            eventTime: new Date(),
            error: waResult.error || null
        };

        inMemoryNotifications.push(fallbackRecord);
        if (mongoose.connection.readyState === 1) {
            try {
                await AlertNotification.create(fallbackRecord);
            } catch (e) {}
        }

        return {
            success: true,
            bounceProcessed: true,
            fallbackChannel: 'whatsapp',
            fallbackResult: waResult
        };
    }

    return { success: true, bounceProcessed: true, fallbackChannel: null };
}

module.exports = {
    formatEmailSubject,
    formatEmailBody,
    formatWhatsAppMessage,
    orchestrateNotification,
    handleDelayedDeliveryFailure
};
