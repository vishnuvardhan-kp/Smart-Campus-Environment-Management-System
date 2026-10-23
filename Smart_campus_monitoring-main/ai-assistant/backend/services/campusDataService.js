import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { assessEnvironment } from './assessmentService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Resolve MongoDB URI safely
function resolveMongoUri() {
  if (process.env.MONGO_URI && process.env.MONGO_URI.trim()) {
    return process.env.MONGO_URI.trim();
  }

  // Check local ai-assistant/backend/.env
  const localEnvPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(localEnvPath)) {
    try {
      const parsed = dotenv.parse(fs.readFileSync(localEnvPath, 'utf8'));
      if (parsed.MONGO_URI) return parsed.MONGO_URI.trim();
    } catch (e) {}
  }

  // Fallback to parent backend/.env if available
  const parentEnvPath = path.resolve(__dirname, '../../../backend/.env');
  if (fs.existsSync(parentEnvPath)) {
    try {
      const parentEnvContent = fs.readFileSync(parentEnvPath, 'utf8');
      const parsed = dotenv.parse(parentEnvContent);
      if (parsed.MONGO_URI) {
        return parsed.MONGO_URI.trim();
      }
    } catch (e) {
      console.warn('[campusDataService] Could not parse parent .env:', e.message);
    }
  }

  return null;
}

const MONGO_URI = resolveMongoUri();
const DEFAULT_ROOM = process.env.DEFAULT_ROOM || 'LAB101';

// 2. Define Mongoose Schemas (Read-Only)
const currentEnvironmentSchema = new mongoose.Schema(
  {
    room: { type: String, required: true },
    temperature: { type: Number, default: null },
    humidity: { type: Number, default: null },
    peopleCount: { type: Number, default: 0 },
    sessionStartedAt: { type: Date, default: Date.now },
    light: { type: String, default: 'OFF' },
    fan: { type: String, default: 'OFF' },
    systemStatus: { type: String, default: 'Connected' },
    lastUpdated: { type: Date, default: Date.now }
  },
  { collection: 'current_environment' }
);

const environmentHistorySchema = new mongoose.Schema(
  {
    room: { type: String, required: true },
    temperature: { type: Number, default: null },
    humidity: { type: Number, default: null },
    peopleCount: { type: Number, default: 0 },
    sessionStartedAt: { type: Date, default: Date.now },
    light: { type: String, default: 'OFF' },
    fan: { type: String, default: 'OFF' },
    systemStatus: { type: String, default: 'Connected' },
    timestamp: { type: Date, default: Date.now }
  },
  { collection: 'environment_history' }
);

let CurrentEnvironment;
let EnvironmentHistory;
let dbConnectionPromise = null;
const LOCAL_MONGO_URI = 'mongodb://127.0.0.1:27017/smart_campus';

export async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (dbConnectionPromise) {
    return dbConnectionPromise;
  }

  const connectWithFallback = async () => {
    let conn = null;

    if (MONGO_URI) {
      try {
        console.log('[campusDataService] Connecting to primary MongoDB...');
        conn = await mongoose.connect(MONGO_URI, {
          serverSelectionTimeoutMS: 2500,
          connectTimeoutMS: 2500
        });
        console.log('[campusDataService] Connected to primary MongoDB:', conn.connection.name);
      } catch (err) {
        console.warn(`[campusDataService] Primary MongoDB connection failed (${err.message}). Trying local fallback...`);
      }
    }

    if (!conn) {
      try {
        conn = await mongoose.connect(LOCAL_MONGO_URI, {
          serverSelectionTimeoutMS: 2500,
          connectTimeoutMS: 2500
        });
        console.log('[campusDataService] Connected to local MongoDB fallback:', conn.connection.name);
      } catch (fallbackErr) {
        console.error(`[campusDataService] Local MongoDB fallback failed: ${fallbackErr.message}`);
        throw fallbackErr;
      }
    }

    CurrentEnvironment = conn.model('CurrentEnvironment', currentEnvironmentSchema);
    EnvironmentHistory = conn.model('EnvironmentHistory', environmentHistorySchema);
    return conn;
  };

  dbConnectionPromise = connectWithFallback().catch((err) => {
    dbConnectionPromise = null;
    throw err;
  });

  return dbConnectionPromise;
}

/**
 * Format relative time for human reading
 */
function formatAge(date) {
  if (!date) return 'unknown';
  const now = Date.now();
  const diffMs = now - new Date(date).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
  return new Date(date).toLocaleString();
}

/**
 * Health check for database connection
 */
export async function getDatabaseHealth() {
  try {
    await connectToDatabase();
    const isConnected = mongoose.connection.readyState === 1;
    const currentCount = await CurrentEnvironment.countDocuments();
    const historyCount = await EnvironmentHistory.countDocuments();

    return {
      connected: isConnected,
      database: mongoose.connection.name,
      currentCount,
      historyCount,
      error: null
    };
  } catch (err) {
    return {
      connected: false,
      database: null,
      currentCount: 0,
      historyCount: 0,
      error: err.message
    };
  }
}

/**
 * Retrieve the latest environmental reading from MongoDB
 */
export async function getLatestReading(targetRoom = DEFAULT_ROOM) {
  await connectToDatabase();

  const room = (targetRoom || DEFAULT_ROOM).trim();
  let doc = await CurrentEnvironment.findOne({
    room: new RegExp(`^${room}$`, 'i')
  }).lean();

  // Fallback to any recent document if specific room not found
  if (!doc) {
    doc = await CurrentEnvironment.findOne({}).sort({ lastUpdated: -1 }).lean();
  }

  if (!doc) {
    return {
      found: false,
      room,
      message: `No current environment record found in MongoDB collection 'current_environment' for room ${room}.`
    };
  }

  const lastUpdated = doc.lastUpdated ? new Date(doc.lastUpdated) : null;
  const ageMs = lastUpdated ? Date.now() - lastUpdated.getTime() : Infinity;
  // Consider fresh if updated in the last 15 minutes
  const isFresh = ageMs <= 15 * 60 * 1000;
  const assessment = assessEnvironment(doc);

  const sessionStartedAt = doc.sessionStartedAt ? new Date(doc.sessionStartedAt) : lastUpdated;

  return {
    found: true,
    room: doc.room || room,
    temperature: doc.temperature !== null ? Number(doc.temperature) : null,
    humidity: doc.humidity !== null ? Number(doc.humidity) : null,
    peopleCount: doc.peopleCount !== null ? Number(doc.peopleCount) : 0,
    sessionCount: doc.peopleCount !== null ? Number(doc.peopleCount) : 0,
    sessionStartedAt: sessionStartedAt ? sessionStartedAt.toISOString() : null,
    sessionStartedAtFormatted: sessionStartedAt ? sessionStartedAt.toLocaleString() : 'Active Session',
    fan: doc.fan || 'OFF',
    light: doc.light || 'OFF',
    systemStatus: doc.systemStatus || 'Connected',
    lastUpdated: lastUpdated ? lastUpdated.toISOString() : null,
    lastUpdatedFormatted: lastUpdated ? lastUpdated.toLocaleString() : 'Unknown',
    ageFormatted: formatAge(lastUpdated),
    isFresh,
    assessment,
    irSensorDetails: {
      type: 'Digital IR obstacle / beam-break sensor (HW-201 on Pin 27)',
      sessionDetectionEvents: doc.peopleCount !== null ? Number(doc.peopleCount) : 0,
      sessionStartedAt: sessionStartedAt ? sessionStartedAt.toLocaleString() : 'Active Session',
      semantics: 'Cumulative IR detection triggers within the current counting session. This counter increments when an object/person crosses the sensor line; because exit detection is not implemented, it does NOT represent current room occupancy.'
    }
  };
}

/**
 * Retrieve historical records from MongoDB with time range and statistical calculations
 */
export async function getHistoricalAnalysis(targetRoom = DEFAULT_ROOM, hours = 6) {
  await connectToDatabase();

  const room = (targetRoom || DEFAULT_ROOM).trim();
  const clampedHours = Math.min(Math.max(Number(hours) || 6, 1), 72);
  const startTime = new Date(Date.now() - clampedHours * 60 * 60 * 1000);

  let records = await EnvironmentHistory.find({
    room: new RegExp(`^${room}$`, 'i'),
    timestamp: { $gte: startTime }
  })
    .sort({ timestamp: -1 })
    .limit(200)
    .lean();

  // If no records in the past N hours, query the latest available records to give the user real historical facts
  let isRecentWindow = true;
  if (!records || records.length === 0) {
    isRecentWindow = false;
    records = await EnvironmentHistory.find({
      room: new RegExp(`^${room}$`, 'i')
    })
      .sort({ timestamp: -1 })
      .limit(30)
      .lean();
  }

  if (!records || records.length === 0) {
    return {
      found: false,
      room,
      message: `No historical records found for room ${room} in collection 'environment_history'.`
    };
  }

  // Calculate statistics from genuine MongoDB documents
  const validTemps = records.map(r => r.temperature).filter(t => t !== null && !isNaN(t)).map(Number);
  const validHums = records.map(r => r.humidity).filter(h => h !== null && !isNaN(h)).map(Number);

  const minTemp = validTemps.length > 0 ? Math.min(...validTemps) : null;
  const maxTemp = validTemps.length > 0 ? Math.max(...validTemps) : null;
  const avgTemp = validTemps.length > 0 ? Number((validTemps.reduce((a, b) => a + b, 0) / validTemps.length).toFixed(1)) : null;

  const minHum = validHums.length > 0 ? Math.min(...validHums) : null;
  const maxHum = validHums.length > 0 ? Math.max(...validHums) : null;
  const avgHum = validHums.length > 0 ? Number((validHums.reduce((a, b) => a + b, 0) / validHums.length).toFixed(1)) : null;

  // Find when peak temperature occurred
  const peakTempRecord = records.find(r => r.temperature === maxTemp);
  const peakTempTime = peakTempRecord ? new Date(peakTempRecord.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;

  // Directional Trend (earliest vs latest in window)
  const latestRecord = records[0];
  const earliestRecord = records[records.length - 1];

  let tempTrend = 'STABLE';
  let tempDelta = 0;
  if (latestRecord && earliestRecord && latestRecord.temperature !== null && earliestRecord.temperature !== null) {
    tempDelta = Number((latestRecord.temperature - earliestRecord.temperature).toFixed(1));
    if (tempDelta >= 1.0) tempTrend = 'RISING';
    else if (tempDelta <= -1.0) tempTrend = 'FALLING';
  }

  let humTrend = 'STABLE';
  let humDelta = 0;
  if (latestRecord && earliestRecord && latestRecord.humidity !== null && earliestRecord.humidity !== null) {
    humDelta = Number((latestRecord.humidity - earliestRecord.humidity).toFixed(1));
    if (humDelta >= 4.0) humTrend = 'RISING';
    else if (humDelta <= -4.0) humTrend = 'FALLING';
  }

  return {
    found: true,
    room,
    sampleCount: records.length,
    isRecentWindow,
    windowHours: clampedHours,
    windowStart: earliestRecord ? new Date(earliestRecord.timestamp).toLocaleString() : null,
    windowEnd: latestRecord ? new Date(latestRecord.timestamp).toLocaleString() : null,
    temperature: {
      current: latestRecord ? latestRecord.temperature : null,
      min: minTemp,
      max: maxTemp,
      avg: avgTemp,
      delta: tempDelta,
      trend: tempTrend,
      peakTime: peakTempTime
    },
    humidity: {
      current: latestRecord ? latestRecord.humidity : null,
      min: minHum,
      max: maxHum,
      avg: avgHum,
      delta: humDelta,
      trend: humTrend
    },
    latestTimestamp: latestRecord ? new Date(latestRecord.timestamp).toISOString() : null,
    latestTimestampFormatted: latestRecord ? new Date(latestRecord.timestamp).toLocaleString() : null,
    recordsSummary: records.slice(0, 8).map(r => ({
      time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      temp: r.temperature,
      humidity: r.humidity,
      peopleCount: r.peopleCount,
      fan: r.fan,
      light: r.light
    }))
  };
}
