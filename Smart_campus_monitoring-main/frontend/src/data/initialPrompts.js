/**
 * Initial prompts and preset catalog for the Database-Grounded Smart Campus Assistant
 */

export const SUGGESTED_QUESTIONS = [
  {
    id: 'current_env',
    title: 'Current Conditions',
    prompt: 'What is the current temperature and humidity in CC1?',
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
    hint: 'Calculated from historical records'
  },
  {
    id: 'assessment',
    title: 'Condition Assessment',
    prompt: 'What is the current environmental condition assessment and fan status?',
    hint: 'Automated comfort thresholds'
  }
];

export const INITIAL_ASSISTANT_MESSAGE = {
  id: 'msg-welcome',
  sender: 'assistant',
  text: 'Hello! I am your Smart Campus Assistant. Ask me about room conditions, occupancy activity, comfort evaluations, or historical trends.',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  provenance: {
    isGrounded: true,
    source: 'Campus Sensor Network',
    isFresh: true,
    age: 'Connected to live telemetry'
  },
  metrics: [
    { label: 'Status', value: 'Online', status: 'normal' },
    { label: 'Primary Zone', value: 'CC1', status: 'normal' },
    { label: 'Sensors', value: 'Active', status: 'info' }
  ]
};
