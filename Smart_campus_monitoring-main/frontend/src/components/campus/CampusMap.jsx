import React, { useState } from 'react';
import { isSensorOnline } from '../../utils/thresholds';
import { formatTemp, formatHumidity } from '../../utils/formatters';
import { Building2, BookOpen, Compass, Radio, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import '../../styles/campusMap.css';

/**
 * Temperature color threshold resolver as per specifications:
 * - Cool: below 22°C
 * - Normal: 22–26°C
 * - Warning: 27–29°C
 * - Critical: 30°C or above
 * - Offline / Stale / Unavailable: Muted grey
 */
export const getBuildingColorTheme = (temp, isOnline = true) => {
  if (!isOnline || temp === null || temp === undefined || isNaN(temp)) {
    return {
      fill: '#F3F4F6',
      stroke: '#D1D5DB',
      text: '#6B7280',
      badgeBg: '#E5E7EB',
      dotColor: '#9CA3AF',
      statusLabel: 'Offline / Pending'
    };
  }

  if (temp < 22.0) {
    return {
      fill: '#EBF5FF',
      stroke: '#76A9FA',
      text: '#1E429F',
      badgeBg: '#DEF7EC',
      dotColor: '#3F83F8',
      statusLabel: 'Cool (<22°C)'
    };
  }
  if (temp <= 26.0) {
    return {
      fill: '#E8EEE5',
      stroke: '#7A9474',
      text: '#2D5A34',
      badgeBg: '#D1E7DD',
      dotColor: '#4F8058',
      statusLabel: 'Normal (22–26°C)'
    };
  }
  if (temp <= 29.0) {
    return {
      fill: '#FDF2E9',
      stroke: '#F5C6A5',
      text: '#9C4221',
      badgeBg: '#FCE8E6',
      dotColor: '#C77B45',
      statusLabel: 'Warning (27–29°C)'
    };
  }
  return {
    fill: '#FDE8E8',
    stroke: '#F8B4B4',
    text: '#9B1C1C',
    badgeBg: '#FBD5D5',
    dotColor: '#E02424',
    statusLabel: 'Critical (≥30°C)'
  };
};

const CampusMap = ({ rooms = [], now = Date.now(), onOpenBlockAFloorPlan, selectedBuilding = 'BLOCK_A', onSelectBuilding }) => {
  const [hoveredBuilding, setHoveredBuilding] = useState(null);

  // 1. Calculate Aggregate Telemetry for Block A
  const blockARooms = rooms;
  const onlineRooms = blockARooms.filter(r => isSensorOnline(r.lastUpdated, now));
  const isBlockAOnline = onlineRooms.length > 0;

  const validTemps = blockARooms
    .map(r => r.temperature)
    .filter(t => typeof t === 'number' && !isNaN(t));
  const blockAAvgTemp = validTemps.length > 0
    ? validTemps.reduce((a, b) => a + b, 0) / validTemps.length
    : null;

  const validHums = blockARooms
    .map(r => r.humidity)
    .filter(h => typeof h === 'number' && !isNaN(h));
  const blockAAvgHum = validHums.length > 0
    ? validHums.reduce((a, b) => a + b, 0) / validHums.length
    : null;

  const blockATheme = getBuildingColorTheme(blockAAvgTemp, isBlockAOnline);

  // 2. Telemetry for Library (mapped if simulated/registered in rooms)
  const libraryDoc = rooms.find(r => r.room?.toUpperCase() === 'LIBRARY');
  const isLibraryOnline = libraryDoc ? isSensorOnline(libraryDoc.lastUpdated, now) : false;
  const libraryTemp = libraryDoc ? libraryDoc.temperature : null;
  const libraryHum = libraryDoc ? libraryDoc.humidity : null;
  const libraryTheme = getBuildingColorTheme(libraryTemp, isLibraryOnline);

  // 3. CTUG Block: Planned facility (no live sensors, truthful status)
  const blockBTheme = getBuildingColorTheme(null, false);

  const handleBuildingClick = (buildingId) => {
    if (onSelectBuilding) {
      onSelectBuilding(buildingId);
    }
    if (buildingId === 'BLOCK_A' && onOpenBlockAFloorPlan) {
      onOpenBlockAFloorPlan();
    }
  };

  return (
    <div className="campus-map-wrapper">
      {/* Interactive Architectural SVG Campus Map */}
      <svg 
        className="campus-map-svg" 
        viewBox="0 0 960 580" 
        aria-label="Interactive Campus Digital Twin Overview Map"
      >
        <defs>
          {/* Subtle architectural grid pattern */}
          <pattern id="campusGrid" width="30" height="30" patternUnits="userSpaceOnUse">
            <circle cx="15" cy="15" r="0.8" fill="#D9E0D6" />
          </pattern>

          {/* Tree foliage pattern */}
          <radialGradient id="treeGrad" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#C9DBC7" />
            <stop offset="100%" stopColor="#A3BEA0" />
          </radialGradient>

          {/* Quad Lawn Gradient */}
          <linearGradient id="lawnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E9F0E6" />
            <stop offset="100%" stopColor="#DDE7D9" />
          </linearGradient>
        </defs>

        {/* 1. Base Grounds & Architectural Grid */}
        <rect width="960" height="580" fill="#F4F6F1" />
        <rect width="960" height="580" fill="url(#campusGrid)" opacity="0.6" />

        {/* 2. Pedestrian Pathways & Campus Avenues */}
        <path 
          d="M 60,300 L 900,300 M 420,60 L 420,520 M 240,300 L 240,480 M 720,200 L 720,480 M 340,190 L 580,190" 
          stroke="#E2E7DE" 
          strokeWidth="36" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        <path 
          d="M 60,300 L 900,300 M 420,60 L 420,520 M 240,300 L 240,480 M 720,200 L 720,480 M 340,190 L 580,190" 
          stroke="#FFFFFF" 
          strokeWidth="24" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />

        {/* 3. Central Quadrangle (Green Lawn & Plaza) */}
        <g 
          className="map-building-group"
          tabIndex={0}
          role="button"
          aria-label="Central Quad and Green Commons"
          onClick={() => handleBuildingClick('QUAD')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleBuildingClick('QUAD'); }}
          onMouseEnter={() => setHoveredBuilding('QUAD')}
          onMouseLeave={() => setHoveredBuilding(null)}
        >
          <rect 
            x="360" 
            y="230" 
            width="200" 
            height="150" 
            rx="18" 
            fill="url(#lawnGrad)" 
            stroke="#BFCFBC" 
            strokeWidth="1.5"
            className="building-shape"
          />
          <circle cx="460" cy="305" r="28" fill="#F9FAF7" stroke="#D1DDD0" strokeWidth="2" />
          <circle cx="460" cy="305" r="14" fill="#C5D7E8" opacity="0.8" />
          
          {/* Tree Groves */}
          <circle cx="390" cy="260" r="12" fill="url(#treeGrad)" />
          <circle cx="530" cy="260" r="12" fill="url(#treeGrad)" />
          <circle cx="390" cy="350" r="12" fill="url(#treeGrad)" />
          <circle cx="530" cy="350" r="12" fill="url(#treeGrad)" />

          <text x="460" y="348" textAnchor="middle" fontSize="11" fontWeight="700" fill="#4B6349" letterSpacing="0.4">
            CENTRAL QUAD
          </text>
          <text x="460" y="362" textAnchor="middle" fontSize="9.5" fill="#71866F">
            Ambient Green Commons
          </text>
        </g>

        {/* 4. BLOCK A — Science & Engineering Facility (PRIMARY ACTIVE ZONE) */}
        <g 
          className={`map-building-group ${selectedBuilding === 'BLOCK_A' ? 'selected' : ''}`}
          tabIndex={0}
          role="button"
          aria-label="Block A Science and Engineering Facility. Click to inspect floor plan."
          onClick={() => handleBuildingClick('BLOCK_A')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleBuildingClick('BLOCK_A'); }}
          onMouseEnter={() => setHoveredBuilding('BLOCK_A')}
          onMouseLeave={() => setHoveredBuilding(null)}
        >
          {/* Main Building Body */}
          <rect 
            x="70" 
            y="70" 
            width="280" 
            height="200" 
            rx="12" 
            fill={blockATheme.fill} 
            stroke={blockATheme.stroke} 
            strokeWidth={selectedBuilding === 'BLOCK_A' ? "3" : "2"}
            className="building-shape"
          />
          {/* West Wing Extension */}
          <rect 
            x="50" 
            y="110" 
            width="40" 
            height="120" 
            rx="8" 
            fill={blockATheme.fill} 
            stroke={blockATheme.stroke} 
            strokeWidth="1.5"
          />

          {/* Pulsing Beacon if Online */}
          {isBlockAOnline && (
            <g transform="translate(325, 95)">
              <circle cx="0" cy="0" r="12" fill={blockATheme.dotColor} className="beacon-wave" />
              <circle cx="0" cy="0" r="5" fill={blockATheme.dotColor} />
            </g>
          )}

          {/* Building Header / Title */}
          <g transform="translate(100, 115)">
            <rect x="0" y="-18" width="85" height="22" rx="11" fill="rgba(32, 41, 37, 0.08)" />
            <text x="42" y="-3" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--text-primary)">
              BLOCK A
            </text>
            <text x="0" y="22" fontSize="15" fontWeight="700" fill="var(--text-primary)">
              Science & Engineering Wing
            </text>
            <text x="0" y="40" fontSize="12" fill="var(--text-secondary)">
              {blockARooms.length} Monitored Zones • Physical Node
            </text>
          </g>

          {/* Live Telemetry Chips Inside Building */}
          <g transform="translate(100, 185)">
            {/* Temperature Pill */}
            <rect x="0" y="0" width="105" height="32" rx="6" fill="#FFFFFF" stroke={blockATheme.stroke} strokeWidth="1" />
            <text x="12" y="14" fontSize="9.5" fontWeight="600" fill="var(--text-muted)">AVG TEMP</text>
            <text x="12" y="27" fontSize="13" fontWeight="700" fill={blockATheme.text}>
              {formatTemp(blockAAvgTemp)}
            </text>

            {/* Humidity Pill */}
            <rect x="115" y="0" width="105" height="32" rx="6" fill="#FFFFFF" stroke="#E2E6E1" strokeWidth="1" />
            <text x="127" y="14" fontSize="9.5" fontWeight="600" fill="var(--text-muted)">AVG HUM</text>
            <text x="127" y="27" fontSize="13" fontWeight="700" fill="var(--text-primary)">
              {formatHumidity(blockAAvgHum)}
            </text>
          </g>

          {/* Action Callout Pill */}
          <g transform="translate(100, 235)">
            <rect x="0" y="0" width="220" height="22" rx="4" fill="var(--primary-dark)" opacity="0.9" />
            <text x="110" y="15" textAnchor="middle" fontSize="10.5" fontWeight="600" fill="#FFFFFF">
              Click to Open Detailed Floor Plan →
            </text>
          </g>
        </g>

        {/* 5. CENTRAL LIBRARY (NORTH-EAST WING) */}
        <g 
          className={`map-building-group ${selectedBuilding === 'LIBRARY' ? 'selected' : ''}`}
          tabIndex={0}
          role="button"
          aria-label="Central Academic Library"
          onClick={() => handleBuildingClick('LIBRARY')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleBuildingClick('LIBRARY'); }}
          onMouseEnter={() => setHoveredBuilding('LIBRARY')}
          onMouseLeave={() => setHoveredBuilding(null)}
        >
          <rect 
            x="590" 
            y="70" 
            width="290" 
            height="180" 
            rx="12" 
            fill={libraryTheme.fill} 
            stroke={libraryTheme.stroke} 
            strokeWidth={selectedBuilding === 'LIBRARY' ? "3" : "2"}
            className="building-shape"
          />

          {/* Atrium Dome Accent */}
          <ellipse cx="735" cy="115" rx="45" ry="25" fill="#FFFFFF" opacity="0.6" stroke={libraryTheme.stroke} strokeWidth="1" />

          {/* Building Title */}
          <g transform="translate(620, 115)">
            <rect x="0" y="-18" width="75" height="22" rx="11" fill="rgba(32, 41, 37, 0.08)" />
            <text x="37" y="-3" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--text-primary)">
              LIBRARY
            </text>
            <text x="0" y="22" fontSize="15" fontWeight="700" fill="var(--text-primary)">
              Central Academic Library
            </text>
            <text x="0" y="40" fontSize="12" fill="var(--text-secondary)">
              {isLibraryOnline ? '1 Active Sensor Zone' : 'Zone Telemetry Available'}
            </text>
          </g>

          {/* Telemetry or Status Chip */}
          <g transform="translate(620, 180)">
            {libraryDoc ? (
              <g>
                <rect x="0" y="0" width="110" height="32" rx="6" fill="#FFFFFF" stroke={libraryTheme.stroke} strokeWidth="1" />
                <text x="12" y="14" fontSize="9.5" fontWeight="600" fill="var(--text-muted)">LIVE TEMP</text>
                <text x="12" y="27" fontSize="13" fontWeight="700" fill={libraryTheme.text}>
                  {formatTemp(libraryTemp)}
                </text>

                <rect x="120" y="0" width="110" height="32" rx="6" fill="#FFFFFF" stroke="#E2E6E1" strokeWidth="1" />
                <text x="132" y="14" fontSize="9.5" fontWeight="600" fill="var(--text-muted)">HUMIDITY</text>
                <text x="132" y="27" fontSize="13" fontWeight="700" fill="var(--text-primary)">
                  {formatHumidity(libraryHum)}
                </text>
              </g>
            ) : (
              <g>
                <rect x="0" y="0" width="230" height="30" rx="6" fill="#FFFFFF" stroke="#D1D5DB" strokeWidth="1" />
                <text x="15" y="20" fontSize="11" fill="var(--text-secondary)">
                  Telemetry mapped via simulator node
                </text>
              </g>
            )}
          </g>
        </g>

        {/* 6. CTUG Block — Administrative Complex (PLANNED EXPANSION) */}
        <g 
          className={`map-building-group ${selectedBuilding === 'BLOCK_B' ? 'selected' : ''}`}
          tabIndex={0}
          role="button"
          aria-label="CTUG Block Administrative Complex. Expansion zone."
          onClick={() => handleBuildingClick('BLOCK_B')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleBuildingClick('BLOCK_B'); }}
          onMouseEnter={() => setHoveredBuilding('BLOCK_B')}
          onMouseLeave={() => setHoveredBuilding(null)}
        >
          <rect 
            x="590" 
            y="320" 
            width="290" 
            height="190" 
            rx="12" 
            fill="#F9FAF7" 
            stroke="#D1D5DB" 
            strokeWidth="2" 
            strokeDasharray="6 4"
            className="building-shape"
          />

          <g transform="translate(620, 365)">
            <rect x="0" y="-18" width="100" height="22" rx="11" fill="#E5E7EB" />
            <text x="50" y="-3" textAnchor="middle" fontSize="11" fontWeight="700" fill="#6B7280">
              CTUG BLOCK
            </text>
            <text x="0" y="22" fontSize="15" fontWeight="700" fill="#6B7280">
              Administrative Complex
            </text>
            <text x="0" y="42" fontSize="12" fill="#9CA3AF">
              Future Expansion Phase
            </text>
          </g>

          <g transform="translate(620, 435)">
            <rect x="0" y="0" width="230" height="42" rx="8" fill="#F3F4F6" stroke="#E5E7EB" />
            <text x="14" y="18" fontSize="11" fontWeight="600" fill="#4B5563">
              Planned Expansion
            </text>
            <text x="14" y="33" fontSize="10" fill="#9CA3AF">
              Hardware deployment scheduled for Phase 2
            </text>
          </g>
        </g>

        {/* 7. IoT Gateway & Weather Node (South-West) */}
        <g 
          className="map-building-group"
          tabIndex={0}
          role="button"
          aria-label="Campus IoT Gateway and Weather Node"
          onClick={() => handleBuildingClick('GATEWAY')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleBuildingClick('GATEWAY'); }}
        >
          <rect 
            x="110" 
            y="390" 
            width="170" 
            height="110" 
            rx="10" 
            fill="#FFFFFF" 
            stroke="#D8DFD5" 
            strokeWidth="1.5"
            className="building-shape"
          />
          <circle cx="140" cy="425" r="14" fill="#E8EEE5" />
          <Radio size={16} x="132" y="417" color="#55705B" />
          <text x="165" y="430" fontSize="12" fontWeight="700" fill="var(--text-primary)">
            IoT Broker Node
          </text>
          <text x="125" y="460" fontSize="11" fill="var(--text-secondary)">
            HiveMQ MQTT TLS 8883
          </text>
          <text x="125" y="478" fontSize="10" fontWeight="600" fill="#4F8058">
            ● Telemetry Ingestion Active
          </text>
        </g>
      </svg>

      {/* Temperature & Status Legend */}
      <div className="map-legend-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontWeight: 600 }}>
          <Compass size={15} style={{ color: 'var(--sage)' }} />
          <span>Environmental Thermal Scale:</span>
        </div>

        <div className="map-legend-items">
          <div className="map-legend-item">
            <span className="map-legend-swatch" style={{ backgroundColor: '#EBF5FF', borderColor: '#76A9FA' }} />
            <span>Cool (&lt;22°C)</span>
          </div>

          <div className="map-legend-item">
            <span className="map-legend-swatch" style={{ backgroundColor: '#E8EEE5', borderColor: '#7A9474' }} />
            <span>Normal (22–26°C)</span>
          </div>

          <div className="map-legend-item">
            <span className="map-legend-swatch" style={{ backgroundColor: '#FDF2E9', borderColor: '#F5C6A5' }} />
            <span>Warning (27–29°C)</span>
          </div>

          <div className="map-legend-item">
            <span className="map-legend-swatch" style={{ backgroundColor: '#FDE8E8', borderColor: '#F8B4B4' }} />
            <span>Critical (≥30°C)</span>
          </div>

          <div className="map-legend-item">
            <span className="map-legend-swatch" style={{ backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' }} />
            <span>Planned / Offline</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampusMap;
