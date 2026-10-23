/**
 * Format relative time ago (e.g. "12 sec ago", "2 min ago", "Just now")
 * @param {string|Date|number} dateInput - ISO string or date
 * @param {number} now - current timestamp ms for real-time recalculation
 */
export const formatTimeAgo = (dateInput, now = Date.now()) => {
  if (!dateInput) return 'N/A';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'N/A';

  const currentTime = typeof now === 'number' ? now : new Date(now).getTime();
  const seconds = Math.floor((currentTime - date.getTime()) / 1000);
  
  if (seconds < 0) return 'Just now';
  if (seconds < 5) return 'Just now';
  if (seconds < 60) return `${seconds} sec ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
};

/**
 * Format full date & time (e.g., "Aug 8, 2026 10:15:30")
 */
export const formatDateTime = (dateInput) => {
  if (!dateInput) return 'N/A';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

/**
 * Format time for charts (e.g., "10:15:30")
 */
export const formatChartTime = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

/**
 * Format number with fixed decimals
 */
export const formatNumber = (num, decimals = 1) => {
  if (num === undefined || num === null || isNaN(num)) return 'N/A';
  return Number(num).toFixed(decimals);
};

/**
 * Temperature string formatter
 */
export const formatTemp = (temp) => {
  if (temp === undefined || temp === null || isNaN(temp)) return 'N/A';
  return `${formatNumber(temp, 1)}°C`;
};

/**
 * Humidity string formatter
 */
export const formatHumidity = (hum) => {
  if (hum === undefined || hum === null || isNaN(hum)) return 'N/A';
  return `${formatNumber(hum, 0)}%`;
};

/**
 * Global Sequential Room Display Name Mapping (CC1 - CC17)
 * Preserves internal identifiers in MongoDB and MQTT while standardizing all user-facing labels.
 */
export const ROOM_DISPLAY_MAP = {
  // IT Park (CC1 - CC5)
  'LAB101': 'CC1',
  'LAB102': 'CC2',
  'SERVER_ROOM': 'CC3',
  'SEMINAR_HALL': 'CC4',
  'STUDY_POD': 'CC5',

  // CTUG Block (CC6 - CC8)
  'LAB201': 'CC6',
  'ROBOTICS_BAY': 'CC7',
  'B2_STORAGE': 'CC8',

  // Trust Office (CC9 - CC11)
  'TRUST_MAIN': 'CC9',
  'MEETING_1': 'CC10',
  'RECORDS_OFFICE': 'CC11',

  // Administrative Block (CC12 - CC13)
  'ADMIN_OFFICE': 'CC12',
  'COUNCIL_CHAMBER': 'CC13',

  // Central Library (CC14 - CC17)
  'DISC_ROOM_1': 'CC14',
  'DISC_ROOM_2': 'CC15',
  'READING_HALL': 'CC16',
  'ARCHIVE_SECTION': 'CC17',

  // Self-mappings for CC1..CC17
  'CC1': 'CC1',
  'CC2': 'CC2',
  'CC3': 'CC3',
  'CC4': 'CC4',
  'CC5': 'CC5',
  'CC6': 'CC6',
  'CC7': 'CC7',
  'CC8': 'CC8',
  'CC9': 'CC9',
  'CC10': 'CC10',
  'CC11': 'CC11',
  'CC12': 'CC12',
  'CC13': 'CC13',
  'CC14': 'CC14',
  'CC15': 'CC15',
  'CC16': 'CC16',
  'CC17': 'CC17'
};

/**
 * Resolve standardized display name for a given room identifier
 * @param {string} rawRoom - Room ID (e.g. 'LAB101', 'LAB 101', 'TRUST_MAIN', etc.)
 * @returns {string} Standardized room name (e.g. 'CC1', 'CC9', etc.)
 */
export const getRoomDisplayName = (rawRoom) => {
  if (!rawRoom || typeof rawRoom !== 'string') return rawRoom || 'CC1';
  const cleanKey = rawRoom.replace(/\s+/g, '').toUpperCase();
  if (ROOM_DISPLAY_MAP[cleanKey]) {
    return ROOM_DISPLAY_MAP[cleanKey];
  }
  return rawRoom;
};

/**
 * Sanitize user-facing prose text by replacing raw/legacy room labels with CC names
 * @param {string} text - User-facing text string
 * @returns {string} Text with standardized room identifiers
 */
export const sanitizeRoomText = (text) => {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/\bLAB\s*101\b/gi, 'CC1')
    .replace(/\bLAB\s*102\b/gi, 'CC2')
    .replace(/\bLAB\s*201\b/gi, 'CC6');
};
