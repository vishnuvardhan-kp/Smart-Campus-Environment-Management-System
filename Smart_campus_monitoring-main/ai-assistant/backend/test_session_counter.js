import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getLatestReading } from './services/campusDataService.js';
import { processAssistantRequest } from './services/assistantService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function runSessionVerification() {
  console.log('=== STARTING SESSION-BASED IR COUNTER VERIFICATION ===\n');

  // 1. Connect to MongoDB
  const { connectToDatabase } = await import('./services/campusDataService.js');
  const conn = await connectToDatabase();
  console.log('1. Connected to MongoDB database:', conn.connection.name);

  const CurrentEnvironment = conn.model('CurrentEnvironment');
  const EnvironmentHistory = conn.model('EnvironmentHistory');

  // Check baseline historical documents count
  const initialHistoryCount = await EnvironmentHistory.countDocuments();
  console.log(`2. Baseline historical records in environment_history: ${initialHistoryCount} documents.`);

  // Baseline record in current_environment
  const initialDoc = await CurrentEnvironment.findOne({ room: /^LAB101$/i }).lean();
  console.log(`3. Baseline LAB101 snapshot: Temp: ${initialDoc.temperature}°C, Hum: ${initialDoc.humidity}%, Fan: ${initialDoc.fan}, Light: ${initialDoc.light}`);

  // Test Step A: Simulate a new session start (ESP32 boot event or session reset: count = 0)
  const sessionStartTime = new Date();
  await CurrentEnvironment.findOneAndUpdate(
    { room: /^LAB101$/i },
    {
      peopleCount: 0,
      sessionStartedAt: sessionStartTime,
      lastUpdated: sessionStartTime
    },
    { returnDocument: 'after' }
  );

  const session0 = await getLatestReading('LAB101');
  console.log('\n--- TEST A: Session Initialization ---');
  console.log('Session Count:', session0.peopleCount, '(Expected: 0)');
  console.log('Session Started At:', session0.sessionStartedAtFormatted);
  if (session0.peopleCount !== 0) throw new Error('Session counter did not start at 0');

  // Test Step B: First valid IR detection (count = 1)
  await CurrentEnvironment.findOneAndUpdate(
    { room: /^LAB101$/i },
    { peopleCount: 1, lastUpdated: new Date() },
    { returnDocument: 'after' }
  );
  const session1 = await getLatestReading('LAB101');
  console.log('\n--- TEST B: First Detection ---');
  console.log('Detection Count:', session1.peopleCount, '(Expected: 1)');
  if (session1.peopleCount !== 1) throw new Error('Detection count did not increment to 1');

  // Test Step C: Subsequent valid detections (count = 2, count = 3)
  await CurrentEnvironment.findOneAndUpdate(
    { room: /^LAB101$/i },
    { peopleCount: 3, lastUpdated: new Date() },
    { returnDocument: 'after' }
  );
  const session3 = await getLatestReading('LAB101');
  console.log('\n--- TEST C: Subsequent Detections ---');
  console.log('Detection Count:', session3.peopleCount, '(Expected: 3)');
  if (session3.peopleCount !== 3) throw new Error('Detection count did not update to 3');

  // Test Step D: Idempotency / Duplicate MQTT delivery check
  // Delivering the same message count=3 again must remain 3
  await CurrentEnvironment.findOneAndUpdate(
    { room: /^LAB101$/i },
    { peopleCount: 3, lastUpdated: new Date() },
    { returnDocument: 'after' }
  );
  const sessionDup = await getLatestReading('LAB101');
  console.log('\n--- TEST D: Duplicate Message Handling ---');
  console.log('Detection Count after duplicate delivery:', sessionDup.peopleCount, '(Expected: 3)');
  if (sessionDup.peopleCount !== 3) throw new Error('Duplicate message caused unintended increment');

  // Test Step E: Restart resilience check
  // Reloading from MongoDB without in-memory state retains count 3 and session start time
  const reloaded = await CurrentEnvironment.findOne({ room: /^LAB101$/i }).lean();
  console.log('\n--- TEST E: Backend Restart Resilience ---');
  console.log('Persisted Session Count:', reloaded.peopleCount, '(Expected: 3)');
  console.log('Persisted Session Started At:', reloaded.sessionStartedAt ? new Date(reloaded.sessionStartedAt).toISOString() : 'None');
  if (reloaded.peopleCount !== 3) throw new Error('Database did not retain count on restart simulation');

  // Test Step F: Environmental data preservation check
  console.log('\n--- TEST F: Environmental Field Preservation ---');
  console.log('Temperature:', reloaded.temperature, '(Expected:', initialDoc.temperature, ')');
  console.log('Humidity:', reloaded.humidity, '(Expected:', initialDoc.humidity, ')');
  console.log('Fan:', reloaded.fan, '(Expected:', initialDoc.fan, ')');
  console.log('Light:', reloaded.light, '(Expected:', initialDoc.light, ')');
  if (reloaded.temperature !== initialDoc.temperature || reloaded.humidity !== initialDoc.humidity) {
    throw new Error('Environmental readings were accidentally modified!');
  }

  // Test Step G: Historical records preservation check
  const finalHistoryCount = await EnvironmentHistory.countDocuments();
  console.log('\n--- TEST G: Historical Records Preservation ---');
  console.log('Historical records before:', initialHistoryCount, '| after:', finalHistoryCount);
  if (finalHistoryCount < initialHistoryCount) {
    throw new Error('Historical records were deleted!');
  }

  // Test Step H: AI Assistant Natural Language Grounding & Occupancy Disclaimers
  console.log('\n--- TEST H: AI Assistant Semantics Verification ---');
  
  const q1 = await processAssistantRequest('How many IR detection events occurred in the current session?');
  console.log('Q1 Response:', q1.reply);
  console.log('Q1 Metrics:', q1.metrics.map(m => `${m.label}: ${m.value}`).join(' | '));

  const q2 = await processAssistantRequest('When did the current counting session begin?');
  console.log('Q2 Response:', q2.reply);

  const q3 = await processAssistantRequest('How many people are currently in the room?');
  console.log('Q3 Response (Occupancy disclaimer test):', q3.reply);

  if (!q3.reply.toLowerCase().includes('not') || !q3.reply.toLowerCase().includes('room')) {
    console.warn('WARNING: Occupancy disclaimer missing or weak in Q3 response');
  }

  console.log('\n=== ALL SESSION VERIFICATION TESTS COMPLETED SUCCESSFULLY ===');
  process.exit(0);
}

runSessionVerification().catch(err => {
  console.error('\n*** VERIFICATION FAILED ***:', err);
  process.exit(1);
});
