import { getLatestReading, getHistoricalAnalysis } from './campusDataService.js';
import { generateLlmExplanation, getDisplayRoom } from './llmService.js';

export const REVERSE_ROOM_NAME_MAP = {
  'CC1': 'LAB101',
  'CC2': 'LAB102',
  'CC3': 'SERVER_ROOM',
  'CC4': 'SEMINAR_HALL',
  'CC5': 'STUDY_POD',
  'CC6': 'LAB201',
  'CC7': 'ROBOTICS_BAY',
  'CC8': 'B2_STORAGE',
  'CC9': 'TRUST_MAIN',
  'CC10': 'MEETING_1',
  'CC11': 'RECORDS_OFFICE',
  'CC12': 'ADMIN_OFFICE',
  'CC13': 'COUNCIL_CHAMBER',
  'CC14': 'DISC_ROOM_1',
  'CC15': 'DISC_ROOM_2',
  'CC16': 'READING_HALL',
  'CC17': 'ARCHIVE_SECTION'
};

export function getInternalRoom(raw) {
  if (!raw) return 'LAB101';
  const clean = raw.replace(/\s+/g, '').toUpperCase();
  return REVERSE_ROOM_NAME_MAP[clean] || clean;
}

/**
 * Determine user intent from natural-language query
 */
export function analyzeQuery(rawQuery = '') {
  const q = rawQuery.toLowerCase();

  // Extract room if mentioned, e.g. CC1, CC 1, LAB101, LAB 101, Room 304
  let room = 'LAB101';
  const ccMatch = q.match(/\bcc\s*(\d+)\b/i);
  if (ccMatch) {
    room = getInternalRoom(`CC${ccMatch[1]}`);
  } else {
    const roomMatch = q.match(/\b(lab\s*\d+|room\s*\d+)\b/i);
    if (roomMatch) {
      room = roomMatch[1].replace(/\s+/g, '').toUpperCase();
    }
  }

  // Greetings
  if (/^(hi|hello|hey|greetings|who are you|what can you do)\b/i.test(q.trim())) {
    return { intent: 'greeting', room };
  }

  // IR Sensor / People / Occupancy
  if (q.includes('ir') || q.includes('people') || q.includes('motion') || q.includes('detect') || q.includes('occupan') || q.includes('person')) {
    return { intent: 'ir_sensor', room };
  }

  // Trend / History / Past hours / Extrema
  if (
    q.includes('trend') ||
    q.includes('history') ||
    q.includes('past') ||
    q.includes('earlier') ||
    q.includes('ago') ||
    q.includes('change') ||
    q.includes('minimum') ||
    q.includes('maximum') ||
    q.includes('min') ||
    q.includes('max') ||
    q.includes('peak') ||
    q.includes('hottest') ||
    q.includes('coldest')
  ) {
    let hours = 6;
    if (q.includes('2 hour') || q.includes('two hour')) hours = 2;
    else if (q.includes('12 hour')) hours = 12;
    else if (q.includes('24 hour') || q.includes('today')) hours = 24;
    else if (q.includes('1 hour') || q.includes('one hour')) hours = 1;

    return { intent: 'history', room, hours };
  }

  // Environmental assessment / alerts
  if (q.includes('abnormal') || q.includes('alert') || q.includes('safe') || q.includes('condition') || q.includes('assessment') || q.includes('warning')) {
    return { intent: 'assessment', room };
  }

  // Default to current reading
  return { intent: 'current_reading', room };
}

/**
 * Main Assistant Orchestration Pipeline
 */
export async function processAssistantRequest(message) {
  const { intent, room, hours } = analyzeQuery(message);
  const displayRoom = getDisplayRoom(room);

  // 1. Handle Greetings
  if (intent === 'greeting') {
    const latest = await getLatestReading(room);
    return {
      intent,
      reply: `Hello! I am your Smart Campus AI Assistant, grounded in real telemetry from MongoDB for ${displayRoom}. You can ask me about current temperature and humidity, IR sensor events, environmental assessments, or historical trends.`,
      metrics: latest.found ? [
        { label: 'Room', value: getDisplayRoom(latest.room), status: 'normal' },
        { label: 'Current Temp', value: `${latest.temperature} °C`, status: latest.assessment?.temperatureStatus || 'normal' },
        { label: 'Current Humidity', value: `${latest.humidity}%`, status: latest.assessment?.humidityStatus || 'normal' },
        { label: 'IR Events (Session)', value: `${latest.sessionCount ?? latest.peopleCount} events`, status: 'info' }
      ] : [],
      provenance: {
        isGrounded: true,
        source: 'MongoDB (smart_campus.current_environment)',
        timestamp: latest.lastUpdatedFormatted || null,
        isFresh: latest.isFresh || false,
        age: latest.ageFormatted || null
      },
      suggestions: [
        `What is the current temperature in ${displayRoom}?`,
        `What is the humidity and fan status?`,
        `Is the IR sensor detecting anything?`,
        `How has temperature changed over past hours?`
      ]
    };
  }

  // 2. Historical & Trend Analysis
  if (intent === 'history') {
    const histData = await getHistoricalAnalysis(room, hours || 6);
    const llmResult = await generateLlmExplanation({ query: message, intent, data: histData });

    const metrics = [];
    if (histData.found) {
      if (histData.temperature) {
        metrics.push({ label: 'Avg Temp', value: `${histData.temperature.avg} °C`, status: 'normal' });
        metrics.push({ label: 'Min / Max Temp', value: `${histData.temperature.min}°C / ${histData.temperature.max}°C`, status: 'normal' });
        metrics.push({ label: 'Thermal Trend', value: histData.temperature.trend, status: histData.temperature.trend === 'RISING' ? 'warning' : 'normal' });
      }
      if (histData.humidity) {
        metrics.push({ label: 'Avg Humidity', value: `${histData.humidity.avg}%`, status: 'normal' });
        metrics.push({ label: 'Humidity Trend', value: histData.humidity.trend, status: 'normal' });
      }
      metrics.push({ label: 'Samples Analyzed', value: `${histData.sampleCount} points`, status: 'info' });
    }

    return {
      intent,
      reply: llmResult.text,
      metrics,
      recordsSummary: histData.recordsSummary || [],
      modelUsed: llmResult.modelUsed,
      notice: llmResult.notice,
      provenance: {
        isGrounded: true,
        source: 'MongoDB (smart_campus.environment_history)',
        timestamp: histData.latestTimestampFormatted || null,
        isFresh: histData.isRecentWindow || false,
        age: histData.windowEnd ? `Window: ${histData.windowStart} to ${histData.windowEnd}` : null
      },
      suggestions: [
        `What is the current temperature in ${displayRoom}?`,
        `Is the IR sensor detecting anything?`,
        `What is the overall environmental condition?`
      ]
    };
  }

  // 3. Current Reading, IR Sensor, or Assessment
  const currentData = await getLatestReading(room);
  const llmResult = await generateLlmExplanation({ query: message, intent, data: currentData });

  const metrics = [];
  if (currentData.found) {
    metrics.push({ label: 'Room', value: getDisplayRoom(currentData.room), status: 'normal' });
    metrics.push({
      label: 'Temperature',
      value: currentData.temperature !== null ? `${currentData.temperature} °C` : 'N/A',
      status: currentData.assessment?.temperatureStatus === 'CRITICAL' ? 'critical' : currentData.assessment?.temperatureStatus === 'ATTENTION' ? 'warning' : 'normal'
    });
    metrics.push({
      label: 'Humidity',
      value: currentData.humidity !== null ? `${currentData.humidity}%` : 'N/A',
      status: currentData.assessment?.humidityStatus === 'CRITICAL' ? 'critical' : currentData.assessment?.humidityStatus === 'ATTENTION' ? 'warning' : 'normal'
    });
    metrics.push({
      label: 'IR Events (Session)',
      value: `${currentData.sessionCount ?? currentData.peopleCount} events`,
      status: 'info'
    });
    if (currentData.sessionStartedAtFormatted) {
      metrics.push({
        label: 'Session Started',
        value: currentData.sessionStartedAtFormatted,
        status: 'normal'
      });
    }
    metrics.push({
      label: 'Cooling Fan',
      value: currentData.fan,
      status: currentData.fan === 'ON' ? 'warning' : 'normal'
    });
    metrics.push({
      label: 'Light Relay',
      value: currentData.light,
      status: 'normal'
    });
  }

  return {
    intent,
    reply: llmResult.text,
    metrics,
    assessment: currentData.assessment || null,
    irDetails: currentData.irSensorDetails || null,
    modelUsed: llmResult.modelUsed,
    notice: llmResult.notice,
    provenance: {
      isGrounded: true,
      source: 'MongoDB (smart_campus.current_environment)',
      timestamp: currentData.lastUpdatedFormatted || null,
      isFresh: currentData.isFresh || false,
      age: currentData.ageFormatted || null
    },
    suggestions: [
      `How many IR detection events occurred in the current session?`,
      `When did the current counting session begin?`,
      `How many people are currently in the room?`
    ]
  };
}
