/**
 * Mock Campus Data Service
 * 
 * Provides deterministic simulated environmental metrics and responses.
 * All data returned here is explicitly marked with `isSimulated: true`.
 * Later this service can be swapped with a real MongoDB / MQTT / LLM pipeline.
 */

export const SIMULATION_NOTICE = 'SIMULATED DATA — NOT LIVE CAMPUS READINGS';

export const MOCK_CAMPUS_ZONES = [
  { id: 'zone-1', name: 'Central Library', temp: 22.1, humidity: 45, co2: 510, aqi: 38, status: 'Normal' },
  { id: 'zone-2', name: 'West Wing Lab 304', temp: 29.8, humidity: 52, co2: 680, aqi: 55, status: 'Warm' },
  { id: 'zone-3', name: 'Seminar Hall B', temp: 24.5, humidity: 58, co2: 1180, aqi: 82, status: 'Alert' },
  { id: 'zone-4', name: 'Basement Archives', temp: 19.4, humidity: 74, co2: 430, aqi: 28, status: 'Warning' },
  { id: 'zone-5', name: 'Server Room Alpha', temp: 20.2, humidity: 40, co2: 410, aqi: 22, status: 'Optimal' },
  { id: 'zone-6', name: 'Engineering Auditorium', temp: 23.0, humidity: 49, co2: 720, aqi: 48, status: 'Normal' }
];

export const MOCK_ALERTS = [
  {
    id: 'alt-01',
    severity: 'critical',
    location: 'Seminar Hall B',
    metric: 'CO2 Concentration',
    value: '1,180 ppm',
    threshold: '1,000 ppm',
    recommendation: 'Increase fresh air intake via HVAC damper Zone-3.'
  },
  {
    id: 'alt-02',
    severity: 'warning',
    location: 'Basement Archives',
    metric: 'Relative Humidity',
    value: '74% RH',
    threshold: '60% RH',
    recommendation: 'Check dehumidifier unit DH-02 in sub-level corridor.'
  }
];

export const MOCK_TRENDS = [
  { time: '08:00', avgTemp: 21.2, avgCo2: 480, hvacLoad: '35%' },
  { time: '10:00', avgTemp: 22.8, avgCo2: 620, hvacLoad: '55%' },
  { time: '12:00', avgTemp: 24.5, avgCo2: 790, hvacLoad: '72%' },
  { time: '14:00', avgTemp: 25.1, avgCo2: 840, hvacLoad: '80%' },
  { time: '16:00', avgTemp: 24.2, avgCo2: 710, hvacLoad: '65%' },
  { time: '18:00', avgTemp: 22.9, avgCo2: 530, hvacLoad: '45%' }
];

/**
 * Resolves a natural-language query to a simulated campus response
 * @param {string} rawQuery 
 * @returns {object} response payload
 */
export function processMockQuery(rawQuery) {
  const query = rawQuery.toLowerCase();

  // 1. Campus Status Query
  if (
    query.includes('status') ||
    query.includes('overview') ||
    query.includes('campus') ||
    query.includes('how is the environment')
  ) {
    return {
      category: 'campus_status',
      reply: 'Overall campus indoor environmental conditions are currently moderate across 6 simulated zones. 4 zones are in optimal/normal range, 1 zone has elevated temperature, and 1 zone has elevated CO2.',
      metrics: [
        { label: 'Avg Temperature', value: '23.2 °C', status: 'normal' },
        { label: 'Avg Humidity', value: '53%', status: 'normal' },
        { label: 'Avg CO2', value: '655 ppm', status: 'normal' },
        { label: 'Air Quality Index', value: '45 (Good)', status: 'normal' },
        { label: 'Active Sensors', value: '6 Mock Nodes', status: 'info' }
      ],
      quickSuggestions: [
        'Which is the hottest room?',
        'Are there any abnormal alerts?',
        'Show recent environmental trends'
      ],
      isSimulated: true,
      disclaimer: SIMULATION_NOTICE
    };
  }

  // 2. Hottest Room Query
  if (
    query.includes('hottest') ||
    query.includes('warmest') ||
    query.includes('high temp') ||
    query.includes('temperature peak')
  ) {
    const hottest = [...MOCK_CAMPUS_ZONES].sort((a, b) => b.temp - a.temp)[0];
    return {
      category: 'hottest_room',
      reply: `The hottest location currently simulated is ${hottest.name} reaching ${hottest.temp}°C. This is driven by afternoon solar radiation on the west-facing glass facade and high occupancy.`,
      metrics: [
        { label: 'Location', value: hottest.name, status: 'warning' },
        { label: 'Current Temp', value: `${hottest.temp} °C`, status: 'warning' },
        { label: 'Target Temp', value: '22.0 °C', status: 'normal' },
        { label: 'HVAC Zone', value: 'Zone-2 (Operating at 85%)', status: 'info' }
      ],
      quickSuggestions: [
        'Check campus status',
        'Are there any abnormal alerts?',
        'Recent environmental trends'
      ],
      isSimulated: true,
      disclaimer: SIMULATION_NOTICE
    };
  }

  // 3. Abnormal Conditions / Alerts Query
  if (
    query.includes('abnormal') ||
    query.includes('alert') ||
    query.includes('warning') ||
    query.includes('critical') ||
    query.includes('problem')
  ) {
    return {
      category: 'abnormal_conditions',
      reply: `Identified 2 simulated anomalies requiring facility attention: high CO2 in Seminar Hall B and high relative humidity in the Basement Archives.`,
      alerts: MOCK_ALERTS,
      metrics: [
        { label: 'Active Alerts', value: '2 Detected', status: 'warning' },
        { label: 'Seminar Hall B CO2', value: '1,180 ppm (Max: 1,000)', status: 'critical' },
        { label: 'Basement Archives Humidity', value: '74% (Max: 60%)', status: 'warning' }
      ],
      quickSuggestions: [
        'What is the hottest room?',
        'Show campus status',
        'Show recent trends'
      ],
      isSimulated: true,
      disclaimer: SIMULATION_NOTICE
    };
  }

  // 4. Trends Query
  if (
    query.includes('trend') ||
    query.includes('history') ||
    query.includes('recent') ||
    query.includes('pattern') ||
    query.includes('chart')
  ) {
    return {
      category: 'recent_trends',
      reply: 'Simulated 6-hour thermal and CO2 progression indicates peak thermal load occurred between 12:00 and 14:00 (reaching 25.1°C), with ventilation recovery stabilizing afternoon CO2 levels.',
      trendData: MOCK_TRENDS,
      metrics: [
        { label: 'Peak Temp Time', value: '14:00 (25.1 °C)', status: 'warning' },
        { label: 'Peak CO2 Time', value: '14:00 (840 ppm)', status: 'normal' },
        { label: 'HVAC Response', value: 'Stabilized at 18:00', status: 'normal' }
      ],
      quickSuggestions: [
        'Campus status overview',
        'Which room is the hottest?',
        'Any abnormal alerts?'
      ],
      isSimulated: true,
      disclaimer: SIMULATION_NOTICE
    };
  }

  // 5. Fallback for unmapped queries
  return {
    category: 'general_help',
    reply: `I am currently operating in simulated environment mode. I can analyze and report on simulated campus conditions, identify abnormal thresholds, or review temperature trends. Try selecting one of the suggested topics below.`,
    metrics: [],
    quickSuggestions: [
      'What is the current campus status?',
      'Which is the hottest room right now?',
      'Are there any abnormal conditions or alerts?',
      'What are the recent environmental trends?'
    ],
    isSimulated: true,
    disclaimer: SIMULATION_NOTICE
  };
}
