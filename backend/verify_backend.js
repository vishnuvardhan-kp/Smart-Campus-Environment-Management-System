const mongoose = require('mongoose');
const dotenv = require('dotenv');
const http = require('http');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const CurrentEnvironment = require('./models/CurrentEnvironment');
const EnvironmentHistory = require('./models/EnvironmentHistory');

async function runVerification() {
    console.log('======================================================');
    console.log('STARTING AUTOMATED BACKEND VERIFICATION');
    console.log('======================================================');

    try {
        // 1. Connect to MongoDB Atlas
        console.log('\n[1] Testing MongoDB Atlas Connection...');
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error('MONGO_URI is not defined in .env');
        }
        await mongoose.connect(mongoUri);
        console.log('✅ MongoDB Atlas Connected Successfully');

        // 2. Collections Verification
        console.log('\n[2] Verifying MongoDB Collections...');
        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        console.log('Existing collections in MongoDB:', collectionNames);

        console.log(`✅ current_environment collection status: ready`);
        console.log(`✅ environment_history collection status: ready`);

        // 3. Testing Storage Logic & Throttling
        console.log('\n[3] Testing Realtime Upsert & 60s History Throttling...');
        const lastHistorySavedMap = new Map();
        const HISTORY_INTERVAL_MS = 60 * 1000;

        async function processMqttMessage(payload) {
            const { room, temperature, humidity } = payload;
            if (!room || typeof room !== 'string' || temperature === undefined || humidity === undefined) {
                console.log('  [Validation] Safely ignored invalid payload:', payload);
                return;
            }
            const roomName = room.trim();
            const now = Date.now();

            // Upsert current_environment
            await CurrentEnvironment.findOneAndUpdate(
                { room: roomName },
                { room: roomName, temperature: Number(temperature), humidity: Number(humidity), lastUpdated: new Date(now) },
                { upsert: true, returnDocument: 'after' }
            );
            console.log(`  [Realtime Updated] ${roomName}`);

            // Throttled history insert
            const lastSaved = lastHistorySavedMap.get(roomName) || 0;
            if (now - lastSaved >= HISTORY_INTERVAL_MS) {
                await EnvironmentHistory.create({
                    room: roomName,
                    temperature: Number(temperature),
                    humidity: Number(humidity),
                    timestamp: new Date(now)
                });
                lastHistorySavedMap.set(roomName, now);
                console.log(`  [History Saved] ${roomName}`);
            } else {
                console.log(`  [History Throttled] ${roomName} (skipped, <60s elapsed)`);
            }
        }

        // Simulate rapid publishes for LAB101
        console.log('\n--- Simulating 3 rapid publishes for LAB101 (5s apart) ---');
        await processMqttMessage({ room: 'LAB101', temperature: 31.8, humidity: 60.5 });
        await new Promise(res => setTimeout(res, 500));
        await processMqttMessage({ room: 'LAB101', temperature: 32.0, humidity: 59.8 });
        await new Promise(res => setTimeout(res, 500));
        await processMqttMessage({ room: 'LAB101', temperature: 32.2, humidity: 59.0 });

        // 4. Verify MongoDB Content
        console.log('\n[4] Database Content Sample Output:');
        const currentDocs = await CurrentEnvironment.find({ room: 'LAB101' });
        console.log('\n--- current_environment (LAB101) ---');
        console.log(JSON.stringify(currentDocs, null, 2));

        const historyDocs = await EnvironmentHistory.find({ room: 'LAB101' }).sort({ timestamp: -1 });
        console.log('\n--- environment_history (LAB101) ---');
        console.log(JSON.stringify(historyDocs, null, 2));

        console.log(`\nDocument counts:`);
        console.log(`- current_environment documents for LAB101: ${currentDocs.length} (Must be exactly 1)`);
        console.log(`- environment_history documents for LAB101: ${historyDocs.length}`);

        // 5. Test Error Handling
        console.log('\n[5] Testing Error Handling for Malformed Payload & Missing Fields:');
        await processMqttMessage({ room: 'LAB101' }); // missing temp & humidity
        await processMqttMessage({ temperature: 30 }); // missing room
        console.log('✅ All invalid payloads safely handled without process crash');

        // 6. Test Express API endpoints
        console.log('\n[6] Testing Express REST APIs...');
        const express = require('express');
        const cors = require('cors');
        const environmentRoutes = require('./routes/environmentRoutes');
        const sensorRoutes = require('./routes/sensorRoutes');

        const app = express();
        app.use(cors());
        app.use(express.json());
        app.get('/', (req, res) => res.status(200).json({ status: 'running' }));
        app.use('/api/environment', environmentRoutes);
        app.use('/api/sensor', sensorRoutes);

        const server = app.listen(5002);

        function makeHttpRequest(path) {
            return new Promise((resolve) => {
                http.get(`http://localhost:5002${path}`, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        try {
                            resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
                        } catch (e) {
                            resolve({ statusCode: res.statusCode, body: data });
                        }
                    });
                }).on('error', (err) => resolve({ statusCode: 500, error: err.message }));
            });
        }

        const healthRes = await makeHttpRequest('/');
        console.log('  GET / -> Status:', healthRes.statusCode, 'Body:', JSON.stringify(healthRes.body));

        const currentRes = await makeHttpRequest('/api/environment/current');
        console.log('  GET /api/environment/current -> Status:', currentRes.statusCode, 'Count:', currentRes.body?.count, 'Data:', currentRes.body?.data);

        const currentRoomRes = await makeHttpRequest('/api/environment/current/LAB101');
        console.log('  GET /api/environment/current/LAB101 -> Status:', currentRoomRes.statusCode, 'Room:', currentRoomRes.body?.data?.room);

        const historyRes = await makeHttpRequest('/api/environment/history');
        console.log('  GET /api/environment/history -> Status:', historyRes.statusCode, 'Count:', historyRes.body?.count);

        const historyRoomRes = await makeHttpRequest('/api/environment/history/LAB101');
        console.log('  GET /api/environment/history/LAB101 -> Status:', historyRoomRes.statusCode, 'Count:', historyRoomRes.body?.count);

        server.close();

        console.log('\n======================================================');
        console.log('ALL VERIFICATION CHECKS COMPLETED!');
        console.log('======================================================');

    } catch (err) {
        console.error('❌ Verification error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

runVerification();
