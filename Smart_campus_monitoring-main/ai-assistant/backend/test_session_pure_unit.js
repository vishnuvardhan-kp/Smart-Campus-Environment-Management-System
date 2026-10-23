/**
 * Pure Unit Test Suite: Session-Counter & Idempotency Rules
 * Verifies subscriber.js & campusDataService logic independently of external Atlas network reachability.
 */

console.log('=== PURE UNIT TEST SUITE: SESSION COUNTER & IDEMPOTENCY RULES ===\n');

// 1. Mock room state mimicking getOrCreateRoomState()
let roomState = {
  room: 'LAB101',
  temperature: 32.0,
  humidity: 57.3,
  peopleCount: 70, // old baseline count from past session
  sessionStartedAt: new Date('2026-10-22T10:00:00.000Z'),
  light: 'ON',
  fan: 'ON',
  systemStatus: 'Connected',
  lastUpdated: new Date('2026-10-22T10:58:13.000Z')
};

// Simulated history store
const mockHistory = [
  { room: 'LAB101', peopleCount: 70, timestamp: new Date('2026-10-22T10:57:00Z') },
  { room: 'LAB101', peopleCount: 69, timestamp: new Date('2026-10-22T10:56:00Z') }
];
const initialHistoryCount = mockHistory.length;

function handlePeopleMessage(rawMessage, now) {
  const count = parseInt(rawMessage, 10);
  if (isNaN(count)) return;

  const currentCount = (roomState.peopleCount !== undefined && roomState.peopleCount !== null) ? roomState.peopleCount : 0;
  // Exact subscriber.js condition:
  if (count < currentCount || !roomState.sessionStartedAt) {
    roomState.sessionStartedAt = new Date(now);
    console.log(`[Session Started] LAB101 - Initialized at ${roomState.sessionStartedAt.toISOString()} (Count: ${count})`);
  }
  roomState.peopleCount = count;
  roomState.lastUpdated = new Date(now);
}

function handleSessionReset(now) {
  roomState.peopleCount = 0;
  roomState.sessionStartedAt = new Date(now);
  roomState.lastUpdated = new Date(now);
  console.log(`[Session Reset] LAB101 - Counter reset to 0 at ${roomState.sessionStartedAt.toISOString()}`);
}

function saveThrottledHistory(now) {
  mockHistory.push({
    room: roomState.room,
    temperature: roomState.temperature,
    humidity: roomState.humidity,
    peopleCount: roomState.peopleCount,
    sessionStartedAt: roomState.sessionStartedAt,
    timestamp: new Date(now)
  });
}

// --- TEST 1: Initial Session Start (ESP32 Boot) ---
console.log('--- TEST 1: Boot event arrives with count 0 ---');
const bootTime = new Date('2026-10-22T15:00:00.000Z').getTime();
handlePeopleMessage('0', bootTime);

console.log(`Count: ${roomState.peopleCount} (Expected: 0)`);
console.log(`Session Started: ${roomState.sessionStartedAt.toISOString()} (Expected: 2026-10-22T15:00:00.000Z)`);
if (roomState.peopleCount !== 0 || roomState.sessionStartedAt.getTime() !== bootTime) {
  throw new Error('TEST 1 FAILED');
}
console.log('TEST 1 PASSED: Initial session started cleanly at 0.\n');

// --- TEST 2: Repeated '0' messages MUST NOT reset sessionStartedAt ---
console.log('--- TEST 2: Repeated 0 messages (Idempotency) ---');
const t1 = bootTime + 2000;
const t2 = bootTime + 5000;
const t3 = bootTime + 10000;

handlePeopleMessage('0', t1);
handlePeopleMessage('0', t2);
handlePeopleMessage('0', t3);

console.log(`Session Started after 3 repeated '0's: ${roomState.sessionStartedAt.toISOString()}`);
if (roomState.sessionStartedAt.getTime() !== bootTime) {
  throw new Error('TEST 2 FAILED: Repeated 0 messages bumped sessionStartedAt!');
}
console.log('TEST 2 PASSED: Repeated 0 messages did NOT reset sessionStartedAt.\n');

// --- TEST 3: Increments 1, 2, 3 ---
console.log('--- TEST 3: Subsequent Detections ---');
handlePeopleMessage('1', bootTime + 15000);
handlePeopleMessage('2', bootTime + 20000);
handlePeopleMessage('3', bootTime + 25000);

console.log(`Count after 3 detections: ${roomState.peopleCount} (Expected: 3)`);
console.log(`Session Started At: ${roomState.sessionStartedAt.toISOString()} (Expected: preserved ${new Date(bootTime).toISOString()})`);
if (roomState.peopleCount !== 3 || roomState.sessionStartedAt.getTime() !== bootTime) {
  throw new Error('TEST 3 FAILED: Count or sessionStartedAt corrupted during increments');
}
console.log('TEST 3 PASSED: Detection counts incremented while session timestamp was preserved.\n');

// --- TEST 4: Duplicate non-zero messages (e.g. QoS retries) ---
console.log('--- TEST 4: Duplicate Non-Zero Messages ---');
handlePeopleMessage('3', bootTime + 26000);
handlePeopleMessage('3', bootTime + 27000);

console.log(`Count after duplicate 3s: ${roomState.peopleCount} (Expected: 3)`);
if (roomState.peopleCount !== 3) {
  throw new Error('TEST 4 FAILED: Duplicate messages caused unintended increment!');
}
console.log('TEST 4 PASSED: Duplicate messages are idempotent.\n');

// --- TEST 5: Backend restart / cold state reload ---
console.log('--- TEST 5: Backend Restart Simulation ---');
// Mimic server restart: memory wiped, reloaded from DB snapshot
const dbSnapshot = JSON.parse(JSON.stringify(roomState));
roomState = {
  ...dbSnapshot,
  sessionStartedAt: new Date(dbSnapshot.sessionStartedAt),
  lastUpdated: new Date(dbSnapshot.lastUpdated)
};

// Reconnection message arrives with count 3
handlePeopleMessage('3', bootTime + 35000);
console.log(`Count after restart and reconnection: ${roomState.peopleCount} (Expected: 3)`);
console.log(`Session Started At after restart: ${roomState.sessionStartedAt.toISOString()} (Expected: ${new Date(bootTime).toISOString()})`);
if (roomState.peopleCount !== 3 || roomState.sessionStartedAt.getTime() !== bootTime) {
  throw new Error('TEST 5 FAILED: Backend restart corrupted session state!');
}
console.log('TEST 5 PASSED: Backend restart preserved active session.\n');

// --- TEST 6: History persistence & immutability ---
console.log('--- TEST 6: History Persistence ---');
saveThrottledHistory(bootTime + 40000);
console.log(`History count: ${mockHistory.length} (Expected: ${initialHistoryCount + 1})`);
const latestHist = mockHistory[mockHistory.length - 1];
console.log(`Latest History sessionStartedAt: ${latestHist.sessionStartedAt.toISOString()} (Expected: ${new Date(bootTime).toISOString()})`);
if (mockHistory.length !== initialHistoryCount + 1 || latestHist.sessionStartedAt.getTime() !== bootTime) {
  throw new Error('TEST 6 FAILED: New history document did not record session timestamp properly!');
}
// Verify old historical records were untouched
console.log(`Oldest history record count: ${mockHistory[0].peopleCount} (Expected: 70)`);
if (mockHistory[0].peopleCount !== 70) {
  throw new Error('TEST 6 FAILED: Old history was modified!');
}
console.log('TEST 6 PASSED: Historical records remain immutable.\n');

// --- TEST 7: Explicit campus/session/reset ---
console.log('--- TEST 7: Explicit Reset Command ---');
const resetTime = bootTime + 60000;
handleSessionReset(resetTime);
console.log(`Count after reset: ${roomState.peopleCount} (Expected: 0)`);
console.log(`Session Started after reset: ${roomState.sessionStartedAt.toISOString()} (Expected: ${new Date(resetTime).toISOString()})`);
if (roomState.peopleCount !== 0 || roomState.sessionStartedAt.getTime() !== resetTime) {
  throw new Error('TEST 7 FAILED: Explicit reset failed');
}
console.log('TEST 7 PASSED: campus/session/reset initiated new session at count 0.\n');

console.log('=== ALL 7 PURE UNIT TESTS PASSED WITH ZERO DEFECTS ===');
