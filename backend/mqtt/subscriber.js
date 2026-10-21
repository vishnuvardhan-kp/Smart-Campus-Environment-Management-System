const mqtt = require('mqtt');
const CurrentEnvironment = require('../models/CurrentEnvironment');
const EnvironmentHistory = require('../models/EnvironmentHistory');

// In-memory current state cache per room to aggregate scalar MQTT topics
const roomStateMap = new Map();

// In-memory throttling cache to enforce the 60-second history interval
const lastHistorySavedMap = new Map();

/**
 * Retrieve or initialize in-memory state for a room, bootstrapping from MongoDB if possible.
 */
async function getOrCreateRoomState(roomName) {
    if (roomStateMap.has(roomName)) {
        return roomStateMap.get(roomName);
    }

    try {
        const existing = await CurrentEnvironment.findOne({ 
            room: new RegExp(`^${roomName}$`, 'i') 
        });

        const state = {
            room: roomName,
            temperature: existing && existing.temperature !== undefined ? existing.temperature : null,
            humidity: existing && existing.humidity !== undefined ? existing.humidity : null,
            peopleCount: existing && existing.peopleCount !== undefined ? existing.peopleCount : 0,
            light: existing && existing.light ? existing.light : 'OFF',
            fan: existing && existing.fan ? existing.fan : 'OFF',
            systemStatus: existing && existing.systemStatus ? existing.systemStatus : 'Connected',
            lastUpdated: existing && existing.lastUpdated ? existing.lastUpdated : new Date()
        };

        roomStateMap.set(roomName, state);
        return state;
    } catch (e) {
        const state = {
            room: roomName,
            temperature: null,
            humidity: null,
            peopleCount: 0,
            light: 'OFF',
            fan: 'OFF',
            systemStatus: 'Connected',
            lastUpdated: new Date()
        };
        roomStateMap.set(roomName, state);
        return state;
    }
}

/**
 * Upsert current room snapshot immediately and write throttled history record (every 60s).
 */
async function saveRoomStateAndThrottleHistory(roomName, state, now) {
    // 1. Update/upsert current_environment
    await CurrentEnvironment.findOneAndUpdate(
        { room: roomName },
        {
            room: roomName,
            temperature: state.temperature,
            humidity: state.humidity,
            peopleCount: state.peopleCount,
            light: state.light,
            fan: state.fan,
            systemStatus: state.systemStatus,
            lastUpdated: new Date(now)
        },
        { upsert: true, returnDocument: 'after' }
    );
    console.log(`[Realtime Updated] ${roomName} - Temp: ${state.temperature}°C, Hum: ${state.humidity}%, People: ${state.peopleCount}, Light: ${state.light}, Fan: ${state.fan}, Status: ${state.systemStatus}`);

    // 2. Throttled history save (60 seconds per room)
    const latestHistory = await EnvironmentHistory.findOne({ 
        room: new RegExp(`^${roomName}$`, 'i') 
    }).sort({ timestamp: -1 });

    const mongoTime = (latestHistory && latestHistory.timestamp)
        ? new Date(latestHistory.timestamp).getTime()
        : 0;

    const inMemoryTime = lastHistorySavedMap.get(roomName) || 0;
    const lastSavedTime = Math.max(mongoTime, inMemoryTime);

    if (lastSavedTime === 0 || (now - lastSavedTime >= 60000)) {
        lastHistorySavedMap.set(roomName, now);

        await EnvironmentHistory.create({
            room: roomName,
            temperature: state.temperature,
            humidity: state.humidity,
            peopleCount: state.peopleCount,
            light: state.light,
            fan: state.fan,
            systemStatus: state.systemStatus,
            timestamp: new Date(now)
        });
        console.log(`[History Saved] ${roomName}`);
    }
}

const initMqttSubscriber = () => {
    const brokerUrl = process.env.MQTT_BROKER_URL;
    const username = process.env.MQTT_USERNAME;
    const password = process.env.MQTT_PASSWORD;
    const topic = 'campus/#';

    if (!brokerUrl) {
        console.warn('[MQTT] MQTT_BROKER_URL is not set in environment variables. Subscriber skipped.');
        return null;
    }

    const options = {
        clean: true,
        connectTimeout: 5000,
        reconnectPeriod: 2000,
    };

    if (username) options.username = username;
    if (password) options.password = password;

    console.log(`[MQTT] Connecting to MQTT broker at ${brokerUrl}...`);
    const client = mqtt.connect(brokerUrl, options);

    client.on('connect', () => {
        console.log('[MQTT Connected]');
        console.log('[MQTT] Connected to MQTT broker successfully');
        client.subscribe(topic, (err) => {
            if (err) {
                console.error(`[MQTT] Subscription error for topic pattern "${topic}":`, err.message);
            } else {
                console.log(`[MQTT] Subscribed to topic pattern: ${topic}`);
            }
        });
    });

    client.on('message', async (receivedTopic, message) => {
        try {
            const rawMessage = message.toString().trim();
            const now = Date.now();
            const espRoom = (process.env.ESP32_ROOM || 'LAB101').trim();

            // Case 1: Legacy or simulator composite JSON format (campus/environment/+)
            if (receivedTopic.startsWith('campus/environment/')) {
                try {
                    const payload = JSON.parse(rawMessage);
                    const topicRoom = receivedTopic.split('/')[2];
                    const roomName = (payload.room || topicRoom || espRoom).trim();
                    const state = await getOrCreateRoomState(roomName);

                    if (payload.temperature !== undefined && !isNaN(Number(payload.temperature))) {
                        state.temperature = Number(payload.temperature);
                    }
                    if (payload.humidity !== undefined && !isNaN(Number(payload.humidity))) {
                        state.humidity = Number(payload.humidity);
                    }
                    if (payload.peopleCount !== undefined && !isNaN(Number(payload.peopleCount))) {
                        state.peopleCount = parseInt(payload.peopleCount, 10);
                    }
                    if (payload.people !== undefined && !isNaN(Number(payload.people))) {
                        state.peopleCount = parseInt(payload.people, 10);
                    }
                    if (payload.light !== undefined) {
                        state.light = String(payload.light).trim().toUpperCase();
                    }
                    if (payload.fan !== undefined) {
                        state.fan = String(payload.fan).trim().toUpperCase();
                    }
                    if (payload.systemStatus !== undefined) {
                        state.systemStatus = String(payload.systemStatus).trim();
                    } else if (payload.status !== undefined) {
                        state.systemStatus = String(payload.status).trim();
                    }
                    state.lastUpdated = new Date(now);

                    await saveRoomStateAndThrottleHistory(roomName, state, now);
                    return;
                } catch (jsonErr) {
                    console.warn(`[MQTT] Invalid JSON on ${receivedTopic}:`, rawMessage);
                    return;
                }
            }

            // Case 2: Discrete scalar ESP32 topics
            switch (receivedTopic) {
                case 'campus/temperature': {
                    const temp = parseFloat(rawMessage);
                    if (isNaN(temp)) {
                        console.warn('[MQTT] Invalid temperature reading:', rawMessage);
                        return;
                    }
                    const state = await getOrCreateRoomState(espRoom);
                    state.temperature = Number(temp.toFixed(2));
                    state.lastUpdated = new Date(now);
                    await saveRoomStateAndThrottleHistory(espRoom, state, now);
                    break;
                }

                case 'campus/humidity': {
                    const hum = parseFloat(rawMessage);
                    if (isNaN(hum)) {
                        console.warn('[MQTT] Invalid humidity reading:', rawMessage);
                        return;
                    }
                    const state = await getOrCreateRoomState(espRoom);
                    state.humidity = Number(hum.toFixed(2));
                    state.lastUpdated = new Date(now);
                    await saveRoomStateAndThrottleHistory(espRoom, state, now);
                    break;
                }

                case 'campus/people': {
                    const count = parseInt(rawMessage, 10);
                    if (isNaN(count)) {
                        console.warn('[MQTT] Invalid people count:', rawMessage);
                        return;
                    }
                    const state = await getOrCreateRoomState(espRoom);
                    state.peopleCount = count;
                    state.lastUpdated = new Date(now);
                    await saveRoomStateAndThrottleHistory(espRoom, state, now);
                    break;
                }

                case 'campus/light': {
                    const norm = rawMessage.toUpperCase();
                    const state = await getOrCreateRoomState(espRoom);
                    state.light = (norm === 'ON' || norm === '1' || norm === 'TRUE') ? 'ON' : 'OFF';
                    state.lastUpdated = new Date(now);
                    await saveRoomStateAndThrottleHistory(espRoom, state, now);
                    break;
                }

                case 'campus/fan': {
                    const norm = rawMessage.toUpperCase();
                    const state = await getOrCreateRoomState(espRoom);
                    state.fan = (norm === 'ON' || norm === '1' || norm === 'TRUE') ? 'ON' : 'OFF';
                    state.lastUpdated = new Date(now);
                    await saveRoomStateAndThrottleHistory(espRoom, state, now);
                    break;
                }

                case 'campus/status': {
                    const state = await getOrCreateRoomState(espRoom);
                    state.systemStatus = rawMessage || 'Connected';
                    state.lastUpdated = new Date(now);
                    await saveRoomStateAndThrottleHistory(espRoom, state, now);
                    break;
                }

                default:
                    // Other campus/ topics can be ignored safely
                    break;
            }

        } catch (error) {
            console.error('[MQTT] Message processing error:', error.message);
        }
    });

    client.on('error', (err) => {
        console.error('[MQTT] Connection error:', err.message);
    });

    client.on('offline', () => {
        console.warn('[MQTT] Client went offline. Reconnecting automatically...');
    });

    client.on('reconnect', () => {
        console.log('[MQTT] Attempting MQTT reconnection...');
    });

    return client;
};

module.exports = initMqttSubscriber;

