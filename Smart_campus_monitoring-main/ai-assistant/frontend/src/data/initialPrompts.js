/**
 * Initial prompts and preset catalog for the Database-Grounded Smart Campus Assistant
 */

export const SUGGESTED_QUESTIONS = [
  {
    id: 'current_env',
    title: 'Current Conditions',
    prompt: 'What is the current temperature and humidity in LAB101?',
    hint: 'Real-time readings & comfort range'
  },
  {
    id: 'ir_session',
    title: 'IR Session Events',
    prompt: 'How many IR detection events occurred in the current session and when did it begin?',
    hint: 'Session counter & start time'
  },
  {
    id: 'extrema',
    title: 'Min / Max Today',
    prompt: 'What were the minimum and maximum temperatures and historical trends?',
    hint: 'Calculated from MongoDB history'
  },
  {
    id: 'assessment',
    title: 'Condition Assessment',
    prompt: 'What is the current environmental condition assessment and fan status?',
    hint: 'Deterministic comfort thresholds'
  }
];

export const INITIAL_ASSISTANT_MESSAGE = {
  id: 'msg-welcome',
  sender: 'assistant',
  text: 'Hello! I am your Smart Campus AI Assistant. All my environmental responses are strictly grounded in genuine sensor telemetry persisted in MongoDB.',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  provenance: {
    isGrounded: true,
    source: 'MongoDB (smart_campus)',
    isFresh: true,
    age: 'Connected to live database'
  },
  metrics: [
    { label: 'Database', value: 'MongoDB Connected', status: 'normal' },
    { label: 'Room Monitored', value: 'LAB101', status: 'normal' },
    { label: 'LLM Engine', value: 'NVIDIA NIM (meta/llama-3.1-8b)', status: 'info' }
  ]
};
