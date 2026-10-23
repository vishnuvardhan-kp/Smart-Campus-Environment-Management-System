/**
 * NVIDIA NIM LLM Integration Service
 * 
 * Interacts with NVIDIA NIM OpenAI-compatible chat completion endpoint:
 * https://integrate.api.nvidia.com/v1/chat/completions
 * Default Model: meta/llama-3.1-8b-instruct
 */

const DEFAULT_NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_NVIDIA_MODEL = 'meta/llama-3.1-8b-instruct';

/**
 * Standardized Sequential Room Display Name Mapping (CC1 - CC17)
 */
export function getDisplayRoom(raw) {
  if (!raw || typeof raw !== 'string') return raw || 'CC1';
  const clean = raw.replace(/\s+/g, '').toUpperCase();
  const map = {
    'LAB101': 'CC1',
    'LAB102': 'CC2',
    'SERVER_ROOM': 'CC3',
    'SEMINAR_HALL': 'CC4',
    'STUDY_POD': 'CC5',
    'LAB201': 'CC6',
    'ROBOTICS_BAY': 'CC7',
    'B2_STORAGE': 'CC8',
    'TRUST_MAIN': 'CC9',
    'MEETING_1': 'CC10',
    'RECORDS_OFFICE': 'CC11',
    'ADMIN_OFFICE': 'CC12',
    'COUNCIL_CHAMBER': 'CC13',
    'DISC_ROOM_1': 'CC14',
    'DISC_ROOM_2': 'CC15',
    'READING_HALL': 'CC16',
    'ARCHIVE_SECTION': 'CC17'
  };
  return map[clean] || raw;
}

/**
 * Format deterministic explanation as fallback if NVIDIA API key is not configured or fails
 */
export function generateDeterministicExplanation({ query, intent, data }) {
  if (!data || !data.found) {
    return data?.message || 'No matching sensor records were found in the campus database.';
  }

  const roomDisplay = getDisplayRoom(data.room);

  // 1. Current reading intent
  if (intent === 'current_reading' || intent === 'assessment') {
    const freshTag = data.isFresh ? 'Recent' : `Past Telemetry (recorded ${data.ageFormatted})`;
    let text = `In ${roomDisplay}, the recorded temperature is ${data.temperature}°C and relative humidity is ${data.humidity}% [${freshTag}].`;
    
    if (data.assessment) {
      text += ` Overall condition is assessed as ${data.assessment.status}. ${data.assessment.reason} ${data.assessment.recommendation}`;
    }

    if (data.fan || data.light) {
      text += ` Actuator states: Fan is ${data.fan}, Light is ${data.light}.`;
    }

    if (!data.isFresh) {
      text += ` Note: This record was logged on ${data.lastUpdatedFormatted} (${data.ageFormatted}). It reflects persisted telemetry rather than an instantaneous reading.`;
    }

    return text;
  }

  // 2. IR sensor / People detection intent
  if (intent === 'ir_sensor') {
    const sessionCount = data.sessionCount !== undefined ? data.sessionCount : data.peopleCount;
    const sessionStarted = data.sessionStartedAtFormatted || data.lastUpdatedFormatted || 'active session';
    return `In ${roomDisplay}, there have been ${sessionCount} IR Detection Events in the current session (Session Started At: ${sessionStarted}). Hardware Note: The physical hardware uses a single digital IR beam-break obstacle detector (Pin 27) that increments upon object crossing. Because exit detection is not implemented, this counter represents cumulative IR detection events within the session, NOT the number of people currently inside the room.`;
  }

  // 3. Historical / Trend intent
  if (intent === 'history' || intent === 'trend' || intent === 'extrema') {
    const t = data.temperature;
    const h = data.humidity;
    let text = `Historical analysis for ${roomDisplay} across ${data.sampleCount} recorded points:`;
    
    if (t) {
      text += ` Temperature averaged ${t.avg}°C (Min: ${t.min}°C, Max: ${t.max}°C). The directional thermal trend is ${t.trend}`;
      if (t.peakTime) {
        text += ` with the peak temperature observed around ${t.peakTime}.`;
      } else {
        text += '.';
      }
    }

    if (h) {
      text += ` Humidity averaged ${h.avg}% (Min: ${h.min}%, Max: ${h.max}%). Directional trend is ${h.trend}.`;
    }

    if (!data.isRecentWindow) {
      text += ` (Calculated from the latest ${data.sampleCount} persisted records logged between ${data.windowStart} and ${data.windowEnd}).`;
    }

    return text;
  }

  return `Current conditions for ${roomDisplay}: Temperature is ${data.temperature}°C, humidity is ${data.humidity}%, fan is ${data.fan}, light is ${data.light}.`;
}

/**
 * Generate LLM explanation using NVIDIA NIM API with deterministic fallback
 */
export async function generateLlmExplanation({ query, intent, data }) {
  const apiKey = process.env.NVIDIA_API_KEY ? process.env.NVIDIA_API_KEY.trim() : '';
  const baseUrl = process.env.NVIDIA_BASE_URL || DEFAULT_NVIDIA_BASE_URL;
  const model = process.env.NVIDIA_MODEL || DEFAULT_NVIDIA_MODEL;

  // If no NVIDIA API Key is provided, use high-fidelity deterministic engine
  if (!apiKey) {
    return {
      text: generateDeterministicExplanation({ query, intent, data }),
      modelUsed: 'deterministic-rules-engine',
      llmActive: false,
      notice: 'LLM Key not configured. Answer was deterministically synthesized from verified MongoDB records.'
    };
  }

  const systemPrompt = `You are the Smart Campus AI Assistant. Your task is to provide a concise, friendly, and accurate response to the user's question about the campus environment.

CRITICAL GROUNDING RULES:
1. Base your answer EXCLUSIVELY on the verified MongoDB sensor data provided in the prompt.
2. NEVER invent, hallucinate, or estimate sensor readings. Every number and timestamp must match the data provided.
3. If the data is not fresh or has an old timestamp, explicitly state the recorded timestamp (${data.lastUpdatedFormatted || data.windowEnd || 'past'}) and clarify that it reflects historical/persisted data.
4. For IR sensor or occupancy questions, use the exact term "IR Detection Events — Current Session" (${data.sessionCount ?? data.peopleCount} events) and cite the session start time (${data.sessionStartedAtFormatted || 'active session'}). You MUST explicitly state that because the single IR sensor lacks exit detection, this counter represents cumulative detection events for this session, NOT the current number of people inside the room.
5. Keep explanations clear, professional, and accessible. Use units like °C and % RH.`;

  const userPrompt = `USER QUESTION: "${query}"

VERIFIED DATABASE CONTEXT (MongoDB):
${JSON.stringify(data, null, 2)}

Provide a helpful, natural-language explanation grounded in the above records:`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 512,
        stream: false
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errText = `HTTP ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson.error?.message) errText += `: ${errJson.error.message}`;
      } catch {
        // use status
      }
      console.warn(`[llmService] NVIDIA API call returned ${errText}. Using deterministic fallback.`);
      return {
        text: generateDeterministicExplanation({ query, intent, data }),
        modelUsed: 'deterministic-fallback',
        llmActive: false,
        notice: `NVIDIA API responded with ${response.status}. Answer was deterministically generated from verified MongoDB records.`
      };
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('NVIDIA API returned empty message content');
    }

    return {
      text: content,
      modelUsed: model,
      llmActive: true,
      notice: null
    };
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn(`[llmService] NVIDIA API error (${error.message}). Falling back to deterministic output.`);
    return {
      text: generateDeterministicExplanation({ query, intent, data }),
      modelUsed: 'deterministic-fallback',
      llmActive: false,
      notice: `NVIDIA call failed (${error.name === 'AbortError' ? 'timed out' : error.message}). Answer generated from MongoDB records.`
    };
  }
}
