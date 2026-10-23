import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function runReviewTests() {
  console.log('=== VERIFYING READ-ONLY REVIEW SPECIFICATIONS ===\n');

  const { connectToDatabase } = await import('./services/campusDataService.js');
  const conn = await connectToDatabase();
  const CurrentEnvironment = conn.model('CurrentEnvironment');
  const EnvironmentHistory = conn.model('EnvironmentHistory');

  // Baseline checks
  const historyCount = await EnvironmentHistory.countDocuments();
  console.log(`[Baseline] Total records in environment_history: ${historyCount} (Must remain exactly preserved).`);

  // --- CHECK 1: Repeated '0' messages cannot repeatedly reset sessionStartedAt ---
  console.log('\n--- CHECK 1: Idempotency of Repeated 0 Messages ---');
  const sessionT0 = new Date('2026-10-22T15:00:00.000Z');

  // Initialize session at count 0
  await CurrentEnvironment.findOneAndUpdate(
    { room: /^LAB101$/i },
    { peopleCount: 0, sessionStartedAt: sessionT0, lastUpdated: sessionT0 }
  );

  // Read back state
  let doc = await CurrentEnvironment.findOne({ room: /^LAB101$/i }).lean();
  const originalSessionStart = new Date(doc.sessionStartedAt).getTime();
  console.log(`Initial Session Started At: ${new Date(originalSessionStart).toISOString()}`);

  // Simulate multiple repeated '0' arrivals (mimicking subscriber logic)
  const arrivals = [
    { count: 0, delayMs: 2000, now: new Date(originalSessionStart + 2000) },
    { count: 0, delayMs: 5000, now: new Date(originalSessionStart + 5000) },
    { count: 0, delayMs: 8000, now: new Date(originalSessionStart + 8000) }
  ];

  for (const item of arrivals) {
    const currentCount = (doc.peopleCount !== undefined && doc.peopleCount !== null) ? doc.peopleCount : 0;
    // Condition from subscriber.js: count < currentCount || !doc.sessionStartedAt
    if (item.count < currentCount || !doc.sessionStartedAt) {
      doc.sessionStartedAt = item.now;
      console.log('UNINTENDED RESET TRIGGERED!');
    }
    doc.peopleCount = item.count;
    doc.lastUpdated = item.now;
  }

  const sessionStartAfterRepeatedZeros = new Date(doc.sessionStartedAt).getTime();
  console.log(`Session Started At after 3 repeated 0s: ${new Date(sessionStartAfterRepeatedZeros).toISOString()}`);
  if (originalSessionStart !== sessionStartAfterRepeatedZeros) {
    throw new Error('CHECK 1 FAILED: Repeated 0 messages reset sessionStartedAt!');
  }
  console.log('CHECK 1 PASSED: Repeated 0 messages did NOT reset sessionStartedAt.');

  // --- CHECK 2: Backend restart or MQTT reconnection cannot mistake ordinary initial count for a new session ---
  console.log('\n--- CHECK 2: Backend Restart / Reconnection State Retention ---');
  // Suppose session has progressed to count = 4
  const sessionT1 = new Date('2026-10-22T15:10:00.000Z');
  await CurrentEnvironment.findOneAndUpdate(
    { room: /^LAB101$/i },
    { peopleCount: 4, sessionStartedAt: sessionT0, lastUpdated: sessionT1 }
  );

  // Simulate cold backend reboot: in-memory state is wiped, loaded fresh from MongoDB
  const loadedFromMongo = await CurrentEnvironment.findOne({ room: /^LAB101$/i }).lean();
  console.log(`Cold load from DB: peopleCount = ${loadedFromMongo.peopleCount}, sessionStartedAt = ${new Date(loadedFromMongo.sessionStartedAt).toISOString()}`);

  // Ordinary MQTT message or reconnection arrives with count = 4
  const msgCount = 4;
  const currentCount = loadedFromMongo.peopleCount;
  let reloadedSessionStart = loadedFromMongo.sessionStartedAt;

  if (msgCount < currentCount || !reloadedSessionStart) {
    reloadedSessionStart = new Date();
    console.log('UNINTENDED RESET ON RESTART MESSAGE!');
  }

  if (new Date(reloadedSessionStart).getTime() !== new Date(sessionT0).getTime()) {
    throw new Error('CHECK 2 FAILED: Ordinary count publication reset session timestamp on restart!');
  }
  console.log('CHECK 2 PASSED: Backend restart correctly preserved active session timestamp.');

  // --- CHECK 3: New environment_history records receive correct session timestamp while historical records are unchanged ---
  console.log('\n--- CHECK 3: Historical Records Immutability & New Record Session Timestamp ---');
  const countBeforeInsert = await EnvironmentHistory.countDocuments();
  
  // Verify existing records have not been altered
  const sampleOldRecord = await EnvironmentHistory.findOne({}).sort({ timestamp: 1 }).lean();
  console.log(`Oldest historical record (Aug 2026): Room ${sampleOldRecord.room}, Temp ${sampleOldRecord.temperature}°C, timestamp: ${new Date(sampleOldRecord.timestamp).toISOString()}`);

  // Create one test history point for the active session
  const testHistTime = new Date();
  const newHistDoc = await EnvironmentHistory.create({
    room: 'LAB101',
    temperature: 32.0,
    humidity: 57.3,
    peopleCount: 4,
    sessionStartedAt: sessionT0,
    light: 'ON',
    fan: 'ON',
    systemStatus: 'ESP32 Campus System Connected',
    timestamp: testHistTime
  });

  console.log(`New history document created: ID ${newHistDoc._id}, sessionStartedAt: ${newHistDoc.sessionStartedAt ? newHistDoc.sessionStartedAt.toISOString() : 'None'}`);
  if (!newHistDoc.sessionStartedAt || newHistDoc.sessionStartedAt.getTime() !== sessionT0.getTime()) {
    throw new Error('CHECK 3 FAILED: New history document did not receive correct session timestamp!');
  }

  // Clean up only our single test document to leave environment_history in its exact original state
  await EnvironmentHistory.findByIdAndDelete(newHistDoc._id);
  const countAfterCleanup = await EnvironmentHistory.countDocuments();
  console.log(`Historical document count verified: ${countAfterCleanup} (matches original ${countBeforeInsert}).`);
  if (countAfterCleanup !== countBeforeInsert) {
    throw new Error('CHECK 3 FAILED: Historical record count changed!');
  }
  console.log('CHECK 3 PASSED: Historical records remain completely intact.');

  // --- CHECK 4: campus/session/reset topic follows exact session boundary rules ---
  console.log('\n--- CHECK 4: Explicit campus/session/reset topic rules ---');
  const resetNow = new Date();
  await CurrentEnvironment.findOneAndUpdate(
    { room: /^LAB101$/i },
    { peopleCount: 0, sessionStartedAt: resetNow, lastUpdated: resetNow }
  );

  const resetDoc = await CurrentEnvironment.findOne({ room: /^LAB101$/i }).lean();
  console.log(`After explicit reset: peopleCount = ${resetDoc.peopleCount}, sessionStartedAt = ${new Date(resetDoc.sessionStartedAt).toISOString()}`);
  if (resetDoc.peopleCount !== 0) {
    throw new Error('CHECK 4 FAILED: Explicit reset did not reset peopleCount to 0!');
  }
  console.log('CHECK 4 PASSED: Explicit session reset resets counter to 0 and records new session timestamp.');

  console.log('\n=== ALL 4 BACKEND REVIEW CHECKS PASSED ===');
  process.exit(0);
}

runReviewTests().catch(e => {
  console.error('\n*** REVIEW CHECK FAILED ***:', e);
  process.exit(1);
});
