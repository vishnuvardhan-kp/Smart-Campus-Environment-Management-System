const SensorFault = require('../models/SensorFault');
const CurrentEnvironment = require('../models/CurrentEnvironment');
const { FAULT_CONFIG, inMemoryFaults } = require('../services/sensorFaultDetection');
const { getTrendForRoom } = require('../services/environmentTrend');
const { roomStateMap } = require('../mqtt/subscriber');

/**
 * Compute sensor hardware connectivity and health status for a room.
 *
 * Distinguishes between:
 * - Device Connectivity: ONLINE, STALE, OFFLINE
 * - Hardware Health: HEALTHY, DEGRADED, FAULT, OFFLINE
 */
function evaluateSensorHealth(lastUpdated, activeFaults = [], now = Date.now()) {
    if (!lastUpdated) {
        return {
            connectivity: 'OFFLINE',
            status: 'OFFLINE',
            lastSeen: null,
            elapsedSeconds: null,
            activeFaultCount: activeFaults.length,
            activeFaults: []
        };
    }

    const lastTime = new Date(lastUpdated).getTime();
    const elapsedMs = Math.max(0, now - lastTime);
    const elapsedSeconds = Math.round(elapsedMs / 1000);

    let connectivity = 'ONLINE';
    if (elapsedMs > FAULT_CONFIG.offlineTimeoutMs) {
        connectivity = 'OFFLINE';
    } else if (elapsedMs > FAULT_CONFIG.staleTimeoutMs) {
        connectivity = 'STALE';
    }

    let status = 'HEALTHY';
    if (connectivity === 'OFFLINE') {
        status = 'OFFLINE';
    } else if (activeFaults.some(f => f.severity === 'CRITICAL' || f.severity === 'HIGH')) {
        status = 'FAULT';
    } else if (activeFaults.length > 0) {
        status = 'DEGRADED';
    }

    return {
        connectivity,
        status,
        lastSeen: lastUpdated,
        elapsedSeconds,
        activeFaultCount: activeFaults.length,
        activeFaults: activeFaults.map(f => ({
            id: f._id,
            faultType: f.faultType,
            severity: f.severity,
            message: f.message,
            metric: f.metric,
            firstSeen: f.firstSeen,
            lastSeen: f.lastSeen
        }))
    };
}

// @desc    Get all active sensor faults and anomalies
// @route   GET /api/faults/active
const getActiveFaults = async (req, res) => {
    try {
        const { room, severity, faultType } = req.query;
        let faults = [];

        if (require('mongoose').connection.readyState === 1) {
            try {
                const filter = { status: 'ACTIVE' };
                if (room) filter.room = new RegExp(`^${room.trim()}$`, 'i');
                if (severity) filter.severity = severity.toUpperCase().trim();
                if (faultType) filter.faultType = faultType.toUpperCase().trim();

                faults = await SensorFault.find(filter).sort({ lastSeen: -1 }).lean();
            } catch (e) {
                faults = Array.from(inMemoryFaults.values()).filter(f => f.status === 'ACTIVE');
            }
        } else {
            faults = Array.from(inMemoryFaults.values()).filter(f => f.status === 'ACTIVE');
            if (room) faults = faults.filter(f => f.room.toUpperCase() === room.toUpperCase());
            if (severity) faults = faults.filter(f => f.severity === severity.toUpperCase().trim());
            if (faultType) faults = faults.filter(f => f.faultType === faultType.toUpperCase().trim());
        }

        res.status(200).json({
            success: true,
            count: faults.length,
            data: faults
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get historical sensor fault events (active or resolved) with pagination
// @route   GET /api/faults/history
const getFaultHistory = async (req, res) => {
    try {
        const { room, status, severity, faultType } = req.query;
        let faults = [];
        let total = 0;

        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
        const skip = (page - 1) * limit;

        if (require('mongoose').connection.readyState === 1) {
            try {
                const filter = {};
                if (room) filter.room = new RegExp(`^${room.trim()}$`, 'i');
                if (status) filter.status = status.toUpperCase().trim();
                if (severity) filter.severity = severity.toUpperCase().trim();
                if (faultType) filter.faultType = faultType.toUpperCase().trim();

                [faults, total] = await Promise.all([
                    SensorFault.find(filter)
                        .sort({ lastSeen: -1 })
                        .skip(skip)
                        .limit(limit)
                        .lean(),
                    SensorFault.countDocuments(filter)
                ]);
            } catch (e) {
                const allList = Array.from(inMemoryFaults.values());
                faults = allList.slice(skip, skip + limit);
                total = allList.length;
            }
        } else {
            let allList = Array.from(inMemoryFaults.values());
            if (room) allList = allList.filter(f => f.room.toUpperCase() === room.toUpperCase());
            if (status) allList = allList.filter(f => f.status === status.toUpperCase().trim());
            if (severity) allList = allList.filter(f => f.severity === severity.toUpperCase().trim());
            if (faultType) allList = allList.filter(f => f.faultType === faultType.toUpperCase().trim());
            faults = allList.slice(skip, skip + limit);
            total = allList.length;
        }

        res.status(200).json({
            success: true,
            count: faults.length,
            total,
            page,
            totalPages: Math.ceil(total / limit) || 1,
            data: faults
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get overall sensor health summary across all campus rooms
// @route   GET /api/faults/health
const getSensorHealthSummary = async (req, res) => {
    try {
        const now = Date.now();
        let rooms = [];
        let allActiveFaults = [];

        if (require('mongoose').connection.readyState === 1) {
            try {
                [rooms, allActiveFaults] = await Promise.all([
                    CurrentEnvironment.find().sort({ room: 1 }).lean(),
                    SensorFault.find({ status: 'ACTIVE' }).lean()
                ]);
            } catch (e) {
                rooms = Array.from(roomStateMap.values());
                allActiveFaults = Array.from(inMemoryFaults.values()).filter(f => f.status === 'ACTIVE');
            }
        } else {
            rooms = Array.from(roomStateMap.values());
            allActiveFaults = Array.from(inMemoryFaults.values()).filter(f => f.status === 'ACTIVE');
        }

        let onlineCount = 0;
        let staleCount = 0;
        let offlineCount = 0;
        let healthyHardwareCount = 0;
        let degradedHardwareCount = 0;
        let faultHardwareCount = 0;

        const roomHealthMap = rooms.map(r => {
            const roomFaults = allActiveFaults.filter(f => f.room.toUpperCase() === r.room.toUpperCase());
            const health = evaluateSensorHealth(r.lastUpdated, roomFaults, now);

            if (health.connectivity === 'ONLINE') onlineCount++;
            else if (health.connectivity === 'STALE') staleCount++;
            else offlineCount++;

            if (health.status === 'HEALTHY') healthyHardwareCount++;
            else if (health.status === 'DEGRADED') degradedHardwareCount++;
            else if (health.status === 'FAULT') faultHardwareCount++;

            return {
                room: r.room,
                ...health
            };
        });

        const activeFaultCountsBySeverity = {
            CRITICAL: allActiveFaults.filter(f => f.severity === 'CRITICAL').length,
            HIGH: allActiveFaults.filter(f => f.severity === 'HIGH').length,
            MEDIUM: allActiveFaults.filter(f => f.severity === 'MEDIUM').length,
            LOW: allActiveFaults.filter(f => f.severity === 'LOW').length
        };

        res.status(200).json({
            success: true,
            data: {
                totalRooms: rooms.length,
                connectivity: {
                    online: onlineCount,
                    stale: staleCount,
                    offline: offlineCount
                },
                hardwareStatus: {
                    healthy: healthyHardwareCount,
                    degraded: degradedHardwareCount,
                    fault: faultHardwareCount,
                    offline: offlineCount
                },
                activeFaultsTotal: allActiveFaults.length,
                activeFaultsBySeverity: activeFaultCountsBySeverity,
                rooms: roomHealthMap
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get detailed sensor health and diagnostic status for a specific room
// @route   GET /api/faults/room/:room
const getRoomHealth = async (req, res) => {
    try {
        const { room } = req.params;
        const roomDoc = await CurrentEnvironment.findOne({ room: new RegExp(`^${room}$`, 'i') }).lean();

        if (!roomDoc) {
            return res.status(404).json({ success: false, message: `Room "${room}" not found` });
        }

        const now = Date.now();
        const [activeFaults, trend] = await Promise.all([
            SensorFault.find({ room: new RegExp(`^${room}$`, 'i'), status: 'ACTIVE' }).lean(),
            getTrendForRoom(roomDoc)
        ]);

        const health = evaluateSensorHealth(roomDoc.lastUpdated, activeFaults, now);

        res.status(200).json({
            success: true,
            data: {
                room: roomDoc.room,
                ...health,
                trend: trend?.summary || 'Stable',
                trendDetails: trend
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    evaluateSensorHealth,
    getActiveFaults,
    getFaultHistory,
    getSensorHealthSummary,
    getRoomHealth
};
