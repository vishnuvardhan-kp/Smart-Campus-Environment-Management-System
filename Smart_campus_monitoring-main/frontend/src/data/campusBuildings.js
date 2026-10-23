/**
 * Campus Buildings Configuration & Room Mapping
 * 
 * 5 Configurable Campus Buildings with Standardized Sequential Room Names (CC1 - CC17):
 * 1. IT Park: CC1 – CC5 (Houses the active physical ESP32 / DHT11 telemetry in CC1 / LAB101)
 * 2. Central Library: CC14 – CC17 (Academic commons, discussion pods, reading hall & rare archive)
 * 3. CTUG Block: CC6 – CC8 (Engineering suites & robotics bays)
 * 4. Trust Office: CC9 – CC11 (Executive trustee administration & boardroom)
 * 5. Administrative Block: CC12 – CC13 (Campus operations & governance chambers)
 */

export { ROOM_DISPLAY_MAP, getRoomDisplayName, sanitizeRoomText } from '../utils/formatters.js';

export const CAMPUS_BUILDINGS = [
  {
    id: 'IT_PARK',
    legacyId: 'BLOCK_A',
    name: 'IT Park',
    subtitle: 'Software & Technology Complex',
    floors: 3,
    accentColor: '#4F8058',
    isoCoords: { x: 230, y: 195 },
    dimensions: { width: 170, depth: 120, height: 105 },
    description: 'Primary technology and engineering complex housing the active physical ESP32 environmental sensing node in CC1.',
    rooms: [
      {
        id: 'LAB101',
        name: 'CC1',
        subtitle: 'IoT Research Lab (Hardware Node)',
        wing: 'North Wing',
        type: 'Computer Center',
        floor: 'Level 1',
        isLiveHardware: true, // ACTUAL PHYSICAL HARDWARE TELEMETRY
        mock: false,
        noSensor: false
      },
      {
        id: 'LAB102',
        name: 'CC2',
        subtitle: 'Advanced Computing Systems',
        wing: 'North Wing',
        type: 'Computer Center',
        floor: 'Level 1',
        isLiveHardware: false,
        mock: true,
        mockData: { temperature: 24.5, humidity: 49.0, peopleCount: 16, light: 'ON', fan: 'OFF' },
        noSensor: false
      },
      {
        id: 'SERVER_ROOM',
        name: 'CC3',
        subtitle: 'Telecom & Network Data Center',
        wing: 'East Wing',
        type: 'Data Infrastructure',
        floor: 'Level 1',
        isLiveHardware: false,
        mock: true,
        mockData: { temperature: 20.1, humidity: 39.5, peopleCount: 1, light: 'OFF', fan: 'ON' },
        noSensor: false
      },
      {
        id: 'SEMINAR_HALL',
        name: 'CC4',
        subtitle: 'Auditorium & Presentation Suite',
        wing: 'South Wing',
        type: 'Conference Hall',
        floor: 'Level 1',
        isLiveHardware: false,
        mock: true,
        mockData: { temperature: 27.8, humidity: 62.0, peopleCount: 42, light: 'ON', fan: 'ON' },
        noSensor: false
      },
      {
        id: 'STUDY_POD',
        name: 'CC5',
        subtitle: 'Quiet Collaboration Nook',
        wing: 'West Wing',
        type: 'Study Space',
        floor: 'Level 1',
        isLiveHardware: false,
        mock: false,
        noSensor: true // NO SENSOR CONNECTED
      }
    ]
  },
  {
    id: 'CENTRAL_LIBRARY',
    name: 'Central Library',
    subtitle: 'Academic Learning Commons',
    floors: 3,
    accentColor: '#059669',
    isoCoords: { x: 550, y: 175 }, // Positioned at Center-North
    dimensions: { width: 175, depth: 120, height: 105 },
    description: 'Central academic library housing collaborative discussion rooms, quiet reading halls, and climate-controlled special archives.',
    rooms: [
      {
        id: 'DISC_ROOM_1',
        name: 'CC14',
        subtitle: 'Discussion Room 1 (Study Pod A)',
        wing: 'East Wing',
        type: 'Study Room',
        floor: 'Level 2',
        isLiveHardware: false,
        mock: true,
        mockData: { temperature: 23.5, humidity: 47.0, peopleCount: 8, light: 'ON', fan: 'OFF' },
        noSensor: false
      },
      {
        id: 'DISC_ROOM_2',
        name: 'CC15',
        subtitle: 'Discussion Room 2 (Study Pod B)',
        wing: 'East Wing',
        type: 'Study Room',
        floor: 'Level 2',
        isLiveHardware: false,
        mock: true,
        mockData: { temperature: 24.0, humidity: 50.0, peopleCount: 6, light: 'ON', fan: 'OFF' },
        noSensor: false
      },
      {
        id: 'READING_HALL',
        name: 'CC16',
        subtitle: 'Reading Hall (Main Reference)',
        wing: 'Central',
        type: 'Reading Hall',
        floor: 'Level 1',
        isLiveHardware: false,
        mock: true,
        mockData: { temperature: 22.2, humidity: 44.0, peopleCount: 38, light: 'ON', fan: 'OFF' },
        noSensor: false
      },
      {
        id: 'ARCHIVE_SECTION',
        name: 'CC17',
        subtitle: 'Archive Section (Rare Collections)',
        wing: 'North Wing',
        type: 'Archive Vault',
        floor: 'Level 1',
        isLiveHardware: false,
        mock: true,
        mockData: { temperature: 20.4, humidity: 41.0, peopleCount: 3, light: 'OFF', fan: 'ON' },
        noSensor: false
      }
    ]
  },
  {
    id: 'BLOCK_B',
    name: 'CTUG Block',
    subtitle: 'Engineering & Computing Wing',
    floors: 3,
    accentColor: '#5C6BC0',
    isoCoords: { x: 870, y: 195 }, // Positioned at North-East
    dimensions: { width: 160, depth: 125, height: 115 },
    description: 'High-density software development suites, automation workstations, and robotics bays.',
    rooms: [
      {
        id: 'LAB201',
        name: 'CC6',
        subtitle: 'Software Development Bay',
        wing: 'West Wing',
        type: 'Computer Center',
        floor: 'Level 2',
        isLiveHardware: false,
        mock: true,
        mockData: { temperature: 23.8, humidity: 46.0, peopleCount: 24, light: 'ON', fan: 'OFF' },
        noSensor: false
      },
      {
        id: 'ROBOTICS_BAY',
        name: 'CC7',
        subtitle: 'Robotics & Mechatronics Lab',
        wing: 'East Wing',
        type: 'Mechatronics Lab',
        floor: 'Level 1',
        isLiveHardware: false,
        mock: true,
        mockData: { temperature: 25.2, humidity: 53.5, peopleCount: 7, light: 'ON', fan: 'OFF' },
        noSensor: false
      },
      {
        id: 'B2_STORAGE',
        name: 'CC8',
        subtitle: 'Hardware Asset Storage Vault',
        wing: 'Basement',
        type: 'Storage',
        floor: 'Level 0',
        isLiveHardware: false,
        mock: false,
        noSensor: true // NO SENSOR CONNECTED
      }
    ]
  },
  {
    id: 'TRUST_OFFICE',
    legacyId: 'LIBRARY',
    name: 'Trust Office',
    subtitle: 'Executive & Trustee Administration',
    floors: 2,
    accentColor: '#0D9488',
    isoCoords: { x: 340, y: 395 },
    dimensions: { width: 160, depth: 115, height: 85 },
    description: 'Campus executive leadership, trustee administration suites, and official council archives.',
    rooms: [
      {
        id: 'TRUST_MAIN',
        name: 'CC9',
        subtitle: 'Trust Office (Executive Suite)',
        wing: 'Central',
        type: 'Executive Office',
        floor: 'Level 1',
        isLiveHardware: false,
        mock: true,
        mockData: { temperature: 23.2, humidity: 48.0, peopleCount: 5, light: 'ON', fan: 'OFF' },
        noSensor: false
      },
      {
        id: 'MEETING_1',
        name: 'CC10',
        subtitle: 'Meeting Room 1 (Executive Boardroom)',
        wing: 'East Wing',
        type: 'Boardroom',
        floor: 'Level 1',
        isLiveHardware: false,
        mock: true,
        mockData: { temperature: 22.8, humidity: 46.5, peopleCount: 12, light: 'ON', fan: 'ON' },
        noSensor: false
      },
      {
        id: 'RECORDS_OFFICE',
        name: 'CC11',
        subtitle: 'Records Office (Institutional Archive)',
        wing: 'West Wing',
        type: 'Records Vault',
        floor: 'Level 1',
        isLiveHardware: false,
        mock: false,
        noSensor: true // NO SENSOR CONNECTED
      }
    ]
  },
  {
    id: 'ADMIN_BLOCK',
    legacyId: 'ADMIN_HUB',
    name: 'Administrative Block',
    subtitle: 'Campus Operations & Governance',
    floors: 2,
    accentColor: '#64748B',
    isoCoords: { x: 740, y: 390 },
    dimensions: { width: 160, depth: 115, height: 85 },
    description: 'Central administrative offices and student advisory governance chambers.',
    rooms: [
      {
        id: 'ADMIN_OFFICE',
        name: 'CC12',
        subtitle: 'Administrative Office (Admissions & Advisory)',
        wing: 'Ground',
        type: 'Administrative Office',
        floor: 'Level 1',
        isLiveHardware: false,
        mock: false,
        noSensor: true // NO SENSOR CONNECTED
      },
      {
        id: 'COUNCIL_CHAMBER',
        name: 'CC13',
        subtitle: 'Council Chamber (Governance Hall)',
        wing: 'Ground',
        type: 'Council Hall',
        floor: 'Level 1',
        isLiveHardware: false,
        mock: false,
        noSensor: true // NO SENSOR CONNECTED
      }
    ]
  }
];

/**
 * Resolve effective room telemetry matching a room configuration against live MongoDB data.
 * - Live ESP32 room maps strictly to backend records (LAB101).
 * - Mock rooms return active simulated telemetry without visible demo tags.
 * - Unmonitored rooms return null telemetry.
 */
export function resolveRoomTelemetry(roomConfig, liveRooms = [], now = Date.now()) {
  if (roomConfig.noSensor) {
    return {
      ...roomConfig,
      temperature: null,
      humidity: null,
      peopleCount: null,
      light: 'N/A',
      fan: 'N/A',
      isOnline: false,
      statusCategory: 'OFFLINE',
      statusLabel: 'NO SENSOR CONNECTED',
      sourceType: 'NO_SENSOR',
      sourceLabel: 'No Sensor Connected',
      lastUpdated: null
    };
  }

  if (roomConfig.isLiveHardware) {
    // Find live room in backend rooms array (by ID or fallback to LAB101)
    const liveDoc = liveRooms.find(r => r.room?.toUpperCase() === roomConfig.id.toUpperCase())
      || liveRooms.find(r => r.room?.toUpperCase() === 'LAB101')
      || null;

    const hasReading = liveDoc && typeof liveDoc.temperature === 'number';
    const isOnline = liveDoc && (now - new Date(liveDoc.lastUpdated).getTime()) < 45000;

    let statusCategory = 'NORMAL';
    if (!hasReading) {
      statusCategory = 'OFFLINE';
    } else if (liveDoc.temperature >= 30) {
      statusCategory = 'CRITICAL';
    } else if (liveDoc.temperature > 26 || liveDoc.humidity > 60 || liveDoc.humidity < 40) {
      statusCategory = 'WARNING';
    }

    return {
      ...roomConfig,
      temperature: hasReading ? liveDoc.temperature : null,
      humidity: hasReading ? liveDoc.humidity : null,
      peopleCount: liveDoc?.peopleCount !== undefined ? liveDoc.peopleCount : 0,
      light: liveDoc?.light || 'OFF',
      fan: liveDoc?.fan || 'OFF',
      isOnline: Boolean(isOnline),
      statusCategory,
      statusLabel: !hasReading ? 'SENSOR OFFLINE' : statusCategory,
      sourceType: 'LIVE_HARDWARE',
      sourceLabel: 'Live ESP32 Hardware',
      assessment: liveDoc?.assessment,
      trend: liveDoc?.trend,
      lastUpdated: liveDoc?.lastUpdated || null
    };
  }

  if (roomConfig.mock && roomConfig.mockData) {
    const md = roomConfig.mockData;
    let statusCategory = 'NORMAL';
    if (md.temperature >= 30) {
      statusCategory = 'CRITICAL';
    } else if (md.temperature > 26 || md.humidity > 60 || md.humidity < 40) {
      statusCategory = 'WARNING';
    }

    return {
      ...roomConfig,
      temperature: md.temperature,
      humidity: md.humidity,
      peopleCount: md.peopleCount,
      light: md.light,
      fan: md.fan,
      isOnline: true,
      statusCategory,
      statusLabel: statusCategory,
      sourceType: 'SIMULATED',
      sourceLabel: 'Active Sensor Stream',
      lastUpdated: new Date()
    };
  }

  return {
    ...roomConfig,
    temperature: null,
    humidity: null,
    peopleCount: null,
    light: 'N/A',
    fan: 'N/A',
    isOnline: false,
    statusCategory: 'OFFLINE',
    statusLabel: 'SENSOR OFFLINE',
    sourceType: 'OFFLINE',
    sourceLabel: 'Sensor Offline',
    lastUpdated: null
  };
}

/**
 * Aggregate telemetry for an entire building
 */
export function getBuildingSummary(building, liveRooms = [], now = Date.now()) {
  const roomsTelemetry = building.rooms.map(r => resolveRoomTelemetry(r, liveRooms, now));
  
  const activeRooms = roomsTelemetry.filter(r => typeof r.temperature === 'number');
  const onlineCount = roomsTelemetry.filter(r => r.isOnline).length;
  
  const avgTemp = activeRooms.length > 0
    ? activeRooms.reduce((acc, r) => acc + r.temperature, 0) / activeRooms.length
    : null;

  const avgHum = activeRooms.length > 0
    ? activeRooms.reduce((acc, r) => acc + r.humidity, 0) / activeRooms.length
    : null;

  let overallStatus = 'OFFLINE';
  if (activeRooms.length > 0) {
    if (activeRooms.some(r => r.statusCategory === 'CRITICAL')) {
      overallStatus = 'CRITICAL';
    } else if (activeRooms.some(r => r.statusCategory === 'WARNING')) {
      overallStatus = 'WARNING';
    } else {
      overallStatus = 'NORMAL';
    }
  }

  const hasLiveHardware = building.rooms.some(r => r.isLiveHardware);
  const isEntirelyUnmonitored = building.rooms.every(r => r.noSensor);

  return {
    ...building,
    roomsTelemetry,
    avgTemp,
    avgHum,
    totalRooms: building.rooms.length,
    activeRoomsCount: activeRooms.length,
    onlineCount,
    overallStatus,
    hasLiveHardware,
    isEntirelyUnmonitored
  };
}
