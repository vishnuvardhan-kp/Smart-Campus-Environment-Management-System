/**
 * Automated Verification Suite for Sensor Health and Fault History API Endpoints
 * Tests HTTP routing, controller logic, query parameter filtering, pagination, and status codes.
 */

const express = require('express');
const http = require('http');
const faultRoutes = require('./routes/faultRoutes');
const { evaluateSensorHealth } = require('./controllers/faultController');
const SensorFault = require('./models/SensorFault');
const CurrentEnvironment = require('./models/CurrentEnvironment');
const EnvironmentHistory = require('./models/EnvironmentHistory');

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
    if (condition) {
        console.log(`[PASS] ${testName}`);
        passedTests++;
    } else {
        console.error(`[FAIL] ${testName}: ${details}`);
        failedTests++;
    }
}

async function makeRequest(port, method, path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: '127.0.0.1',
            port,
            path,
            method,
            headers: { 'Content-Type': 'application/json' }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ statusCode: res.statusCode, body: parsed });
                } catch (e) {
                    resolve({ statusCode: res.statusCode, body: data });
                }
            });
        });

        req.on('error', err => reject(err));
        req.end();
    });
}

async function runApiVerification() {
    console.log('================================================================');
    console.log('RUNNING SENSOR HEALTH & FAULT HISTORY API VERIFICATION');
    console.log('================================================================\n');

    // -----------------------------------------------------------------
    // 1. Pure Unit Verification of evaluateSensorHealth logic
    // -----------------------------------------------------------------
    console.log('[1] Sensor Health State Evaluation Logic:');

    const now = Date.now();
    // Fresh node (10s ago), zero faults
    const h1 = evaluateSensorHealth(new Date(now - 10000), [], now);
    assert(h1.connectivity === 'ONLINE' && h1.status === 'HEALTHY', 'Fresh node with no faults is ONLINE and HEALTHY');

    // Stale node (25s ago), zero faults
    const h2 = evaluateSensorHealth(new Date(now - 25000), [], now);
    assert(h2.connectivity === 'STALE' && h2.status === 'HEALTHY', 'Telemetry 25s ago is evaluated as STALE connectivity');

    // Offline node (60s ago)
    const h3 = evaluateSensorHealth(new Date(now - 60000), [], now);
    assert(h3.connectivity === 'OFFLINE' && h3.status === 'OFFLINE', 'Telemetry > 45s ago is evaluated as OFFLINE');

    // Online node with HIGH severity fault
    const highFault = { _id: 'f1', faultType: 'SUDDEN_TEMP_CHANGE', severity: 'HIGH', message: 'Spike' };
    const h4 = evaluateSensorHealth(new Date(now - 5000), [highFault], now);
    assert(h4.connectivity === 'ONLINE' && h4.status === 'FAULT', 'Online node with HIGH severity anomaly has status FAULT');

    // Online node with MEDIUM severity fault (e.g. STUCK_SENSOR or PREDICTION)
    const medFault = { _id: 'f2', faultType: 'STUCK_SENSOR', severity: 'MEDIUM', message: 'Stuck' };
    const h5 = evaluateSensorHealth(new Date(now - 5000), [medFault], now);
    assert(h5.connectivity === 'ONLINE' && h5.status === 'DEGRADED', 'Online node with MEDIUM anomaly has status DEGRADED');

    // -----------------------------------------------------------------
    // 2. HTTP Routing & Controller Integration Tests
    // -----------------------------------------------------------------
    console.log('\n[2] Setting Up Ephemeral Test Server with Fault Routes...');

    // Simulate active mongoose connection state for controller tests
    require('mongoose').connection.readyState = 1;

    // Mock DB queries for deterministic testing
    const mockFaults = [
        {
            _id: 'fault_101',
            room: 'LAB101',
            sensorType: 'DHT11',
            faultType: 'SUDDEN_TEMP_CHANGE',
            severity: 'HIGH',
            status: 'ACTIVE',
            message: 'Sudden spike of +5°C detected',
            metric: 'temperature',
            firstSeen: new Date(now - 60000),
            lastSeen: new Date(now)
        },
        {
            _id: 'fault_102',
            room: 'LAB101',
            sensorType: 'DHT11',
            faultType: 'IMPLAUSIBLE_READING',
            severity: 'CRITICAL',
            status: 'RESOLVED',
            message: 'Sensor disconnected reading resolved',
            metric: 'temperature',
            firstSeen: new Date(now - 600000),
            lastSeen: new Date(now - 300000),
            resolvedAt: new Date(now - 300000)
        },
        {
            _id: 'fault_201',
            room: 'SEMINAR_HALL',
            sensorType: 'DHT11',
            faultType: 'THRESHOLD_PREDICTION',
            severity: 'MEDIUM',
            status: 'ACTIVE',
            message: 'Projected to breach 30°C in ~8 mins',
            metric: 'temperature',
            firstSeen: new Date(now - 120000),
            lastSeen: new Date(now)
        }
    ];

    const mockRooms = [
        { room: 'LAB101', temperature: 28.5, humidity: 55, lastUpdated: new Date(now - 8000) },
        { room: 'LAB102', temperature: 24.0, humidity: 50, lastUpdated: new Date(now - 35000) },
        { room: 'SERVER_ROOM', temperature: 21.0, humidity: 45, lastUpdated: new Date(now - 80000) }
    ];

    // Mock SensorFault methods
    SensorFault.find = function (filter = {}) {
        let results = [...mockFaults];
        if (filter.status) {
            results = results.filter(f => f.status === filter.status);
        }
        if (filter.room) {
            results = results.filter(f => filter.room.test(f.room));
        }
        if (filter.severity) {
            results = results.filter(f => f.severity === filter.severity);
        }
        if (filter.faultType) {
            results = results.filter(f => f.faultType === filter.faultType);
        }
        return {
            sort: () => ({
                skip: (n) => ({
                    limit: (m) => ({
                        lean: async () => results.slice(n, n + m)
                    })
                }),
                lean: async () => results
            }),
            lean: async () => results
        };
    };

    SensorFault.countDocuments = async function (filter = {}) {
        let results = [...mockFaults];
        if (filter.status) results = results.filter(f => f.status === filter.status);
        if (filter.room) results = results.filter(f => filter.room.test(f.room));
        return results.length;
    };

    CurrentEnvironment.find = function () {
        return {
            sort: () => ({
                lean: async () => mockRooms
            })
        };
    };

    CurrentEnvironment.findOne = function (filter = {}) {
        const found = mockRooms.find(r => filter.room && filter.room.test(r.room));
        return {
            lean: async () => found || null
        };
    };

    EnvironmentHistory.find = function () {
        return {
            select: () => ({
                lean: async () => []
            })
        };
    };

    const app = express();
    app.use(express.json());
    app.use('/api/faults', faultRoutes);

    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    console.log(`    Test Server running on port ${port}\n`);

    // Test 1: GET /api/faults/active
    console.log('[3] Testing GET /api/faults/active:');
    const resActive = await makeRequest(port, 'GET', '/api/faults/active');
    assert(resActive.statusCode === 200, 'GET /api/faults/active returns 200 OK');
    assert(resActive.body.success === true, 'Response payload has success: true');
    assert(resActive.body.count === 2, 'Returns exactly 2 active faults');
    assert(resActive.body.data.every(f => f.status === 'ACTIVE'), 'All returned faults have status ACTIVE');

    // Test 2: Filter active faults by room
    const resActiveFiltered = await makeRequest(port, 'GET', '/api/faults/active?room=LAB101');
    assert(resActiveFiltered.body.count === 1 && resActiveFiltered.body.data[0].room === 'LAB101',
        'Filtering active faults by room (?room=LAB101) returns only LAB101 fault'
    );

    // Test 3: GET /api/faults/history (Resolved + Pagination)
    console.log('\n[4] Testing GET /api/faults/history:');
    const resHist = await makeRequest(port, 'GET', '/api/faults/history?status=RESOLVED');
    assert(resHist.statusCode === 200, 'GET /api/faults/history returns 200 OK');
    assert(resHist.body.count === 1, 'Returns 1 resolved fault');
    assert(resHist.body.data[0].faultType === 'IMPLAUSIBLE_READING', 'Resolved fault type matches');
    assert(resHist.body.page === 1 && resHist.body.totalPages === 1, 'Pagination metadata included');

    // Test 4: GET /api/faults/health
    console.log('\n[5] Testing GET /api/faults/health:');
    const resHealth = await makeRequest(port, 'GET', '/api/faults/health');
    assert(resHealth.statusCode === 200, 'GET /api/faults/health returns 200 OK');
    const hData = resHealth.body.data;
    assert(hData.totalRooms === 3, 'Reports 3 total rooms');
    assert(hData.connectivity.online === 1, 'Correctly counts 1 online room (LAB101, 8s ago)');
    assert(hData.connectivity.stale === 1, 'Correctly counts 1 stale room (LAB102, 35s ago)');
    assert(hData.connectivity.offline === 1, 'Correctly counts 1 offline room (SERVER_ROOM, 80s ago)');
    assert(hData.hardwareStatus.fault === 1, 'LAB101 marked as hardware FAULT due to HIGH severity anomaly');
    assert(hData.activeFaultsTotal === 2, 'Reports 2 total active faults across campus');

    // Test 5: GET /api/faults/room/:room
    console.log('\n[6] Testing GET /api/faults/room/:room:');
    const resRoom = await makeRequest(port, 'GET', '/api/faults/room/LAB101');
    assert(resRoom.statusCode === 200, 'GET /api/faults/room/LAB101 returns 200 OK');
    assert(resRoom.body.data.room === 'LAB101', 'Room name matches LAB101');
    assert(resRoom.body.data.connectivity === 'ONLINE', 'Connectivity is ONLINE');
    assert(resRoom.body.data.status === 'FAULT', 'Hardware status is FAULT');
    assert(resRoom.body.data.activeFaultCount === 1, 'activeFaultCount is 1');

    // Test 6: 404 for unknown room
    const res404 = await makeRequest(port, 'GET', '/api/faults/room/UNKNOWN_ROOM_999');
    assert(res404.statusCode === 404, 'GET /api/faults/room for non-existent room returns 404 Not Found');

    server.close();

    console.log('\n================================================================');
    console.log(`TOTAL API TESTS: ${passedTests + failedTests}`);
    console.log(`PASSED: ${passedTests}`);
    console.log(`FAILED: ${failedTests}`);
    console.log('================================================================');

    if (failedTests > 0) {
        process.exit(1);
    } else {
        console.log('ALL API ENDPOINT TESTS PASSED SUCCESSFULLY!\n');
        process.exit(0);
    }
}

runApiVerification();
