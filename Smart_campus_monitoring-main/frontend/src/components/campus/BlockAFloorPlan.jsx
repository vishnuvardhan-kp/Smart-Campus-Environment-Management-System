import React, { useState } from 'react';
import { isSensorOnline } from '../../utils/thresholds';
import { formatTemp, formatHumidity, formatTimeAgo } from '../../utils/formatters';
import { getBuildingColorTheme } from './CampusMap';
import { 
  Fan, 
  Lightbulb, 
  Users, 
  MapPin, 
  AlertCircle, 
  Radio, 
  Activity, 
  Compass, 
  ShieldCheck 
} from 'lucide-react';
import '../../styles/campusMap.css';

// Supported Block A structural rooms
const BLOCK_A_LAYOUT = [
  {
    id: 'LAB101',
    name: 'CC1',
    subtitle: 'Physics & IoT Research Lab',
    wing: 'North Wing',
    type: 'Laboratory',
    x: 40,
    y: 40,
    width: 270,
    height: 190,
    doorX: 160,
    doorY: 230
  },
  {
    id: 'LAB102',
    name: 'CC2',
    subtitle: 'Advanced Computing Systems',
    wing: 'North Wing',
    type: 'Laboratory',
    x: 325,
    y: 40,
    width: 270,
    height: 190,
    doorX: 445,
    doorY: 230
  },
  {
    id: 'SERVER_ROOM',
    name: 'CC3',
    subtitle: 'Telecom & Network Data Center',
    wing: 'North Wing',
    type: 'Infrastructure',
    x: 610,
    y: 40,
    width: 290,
    height: 190,
    doorX: 740,
    doorY: 230
  },
  {
    id: 'SEMINAR_HALL',
    name: 'CC4',
    subtitle: 'Lecture Auditorium & Presentation',
    wing: 'South Wing',
    type: 'Auditorium',
    x: 40,
    y: 310,
    width: 410,
    height: 200,
    doorX: 225,
    doorY: 300
  },
  {
    id: 'LIBRARY',
    name: 'LIBRARY',
    subtitle: 'Technical Archive & Study Center',
    wing: 'South Wing',
    type: 'Library',
    x: 465,
    y: 310,
    width: 435,
    height: 200,
    doorX: 665,
    doorY: 300
  }
];

const BlockAFloorPlan = ({ rooms = [], now = Date.now(), selectedRoom = 'LAB101', onSelectRoom }) => {
  const [hoveredRoom, setHoveredRoom] = useState(null);

  const getRoomDoc = (roomId) => {
    return rooms.find(r => r.room?.toUpperCase() === roomId?.toUpperCase()) || null;
  };

  return (
    <div className="campus-map-wrapper">
      <svg 
        className="campus-map-svg" 
        viewBox="0 0 940 550" 
        aria-label="Block A Architectural Blueprint Floor Plan"
      >
        <defs>
          {/* Subtle blueprint grid */}
          <pattern id="floorGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E6ECE3" strokeWidth="0.8" />
          </pattern>

          {/* Diagonal striped pattern for offline / unavailable rooms */}
          <pattern id="diagonalHatch" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M-1,1 l2,-2 M0,8 l8,-8 M7,9 l2,-2" stroke="#E5E7EB" strokeWidth="1.2" />
          </pattern>
        </defs>

        {/* 1. Base Blueprint Floor Surface */}
        <rect width="940" height="550" fill="#F8FAF7" />
        <rect width="940" height="550" fill="url(#floorGrid)" opacity="0.6" />

        {/* 2. Central Circulation Corridor / Hallway */}
        <g>
          <rect 
            x="40" 
            y="235" 
            width="860" 
            height="70" 
            className="corridor-area" 
            rx="4"
          />
          {/* Hallway Centerline Guide */}
          <line x1="70" y1="270" x2="870" y2="270" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="6 6" />
          
          {/* Corridor Text Labels */}
          <text x="70" y="274" fontSize="11" fontWeight="700" fill="#94A3B8" letterSpacing="0.8">
            WEST ENTRANCE & FOYER
          </text>
          <text x="470" y="274" textAnchor="middle" fontSize="12" fontWeight="700" fill="#64748B" letterSpacing="1">
            CENTRAL CIRCULATION CORRIDOR — LEVEL 1
          </text>
          <text x="870" y="274" textAnchor="end" fontSize="11" fontWeight="700" fill="#94A3B8" letterSpacing="0.8">
            EAST FIRE EXIT
          </text>
        </g>

        {/* 3. Rooms Layout */}
        {BLOCK_A_LAYOUT.map((zone) => {
          const doc = getRoomDoc(zone.id);
          const isSelected = selectedRoom === zone.id;
          const isHovered = hoveredRoom === zone.id;

          const isOnline = doc ? isSensorOnline(doc.lastUpdated, now) : false;
          const temp = doc ? doc.temperature : null;
          const hum = doc ? doc.humidity : null;
          
          // Strict Actuator mapping: Only display if explicitly available, never guess!
          const fanState = doc && doc.fan !== undefined && doc.fan !== null ? String(doc.fan).toUpperCase() : null;
          const lightState = doc && doc.light !== undefined && doc.light !== null ? String(doc.light).toUpperCase() : null;
          const peopleCount = doc && doc.peopleCount !== undefined && doc.peopleCount !== null ? doc.peopleCount : null;

          const colorTheme = getBuildingColorTheme(temp, isOnline);

          return (
            <g
              key={zone.id}
              className={`floor-room-group ${isSelected ? 'selected' : ''}`}
              tabIndex={0}
              role="button"
              aria-label={`${zone.name} - ${zone.subtitle}. Temperature: ${temp ? formatTemp(temp) : 'Unavailable'}`}
              onClick={() => onSelectRoom && onSelectRoom(zone.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onSelectRoom && onSelectRoom(zone.id);
                }
              }}
              onMouseEnter={() => setHoveredRoom(zone.id)}
              onMouseLeave={() => setHoveredRoom(null)}
            >
              {/* Room Boundary Shape */}
              <rect
                x={zone.x}
                y={zone.y}
                width={zone.width}
                height={zone.height}
                rx="10"
                fill={isOnline ? colorTheme.fill : 'url(#diagonalHatch)'}
                stroke={isSelected ? '#151C18' : isHovered ? colorTheme.stroke : colorTheme.stroke}
                strokeWidth={isSelected ? '3' : isHovered ? '2.5' : '1.8'}
                className="room-rect"
              />

              {/* Architectural Door Opening Cutout */}
              <circle 
                cx={zone.doorX} 
                cy={zone.doorY} 
                r="6" 
                fill="#FFFFFF" 
                stroke="#64748B" 
                strokeWidth="1.5" 
              />
              <line 
                x1={zone.doorX - 6} 
                y1={zone.doorY} 
                x2={zone.doorX + 6} 
                y2={zone.doorY} 
                stroke="#FFFFFF" 
                strokeWidth="2.5" 
              />

              {/* Pulsing Status Beacon in corner */}
              {isOnline && (
                <g transform={`translate(${zone.x + zone.width - 20}, ${zone.y + 20})`}>
                  <circle cx="0" cy="0" r="10" fill={colorTheme.dotColor} className="beacon-wave" />
                  <circle cx="0" cy="0" r="4.5" fill={colorTheme.dotColor} />
                </g>
              )}

              {/* Room Header & Labels */}
              <g transform={`translate(${zone.x + 16}, ${zone.y + 28})`}>
                <text fontSize="14" fontWeight="800" fill="var(--text-primary)" letterSpacing="0.4">
                  {zone.name}
                </text>
                <text y="16" fontSize="11" fill="var(--text-secondary)">
                  {zone.subtitle}
                </text>
              </g>

              {/* Live Metric Readouts Display */}
              <g transform={`translate(${zone.x + 16}, ${zone.y + 75})`}>
                {isOnline && typeof temp === 'number' ? (
                  <g>
                    {/* Temperature Pill */}
                    <rect x="0" y="0" width="105" height="36" rx="6" fill="#FFFFFF" stroke={colorTheme.stroke} strokeWidth="1" />
                    <text x="10" y="15" fontSize="9" fontWeight="600" fill="var(--text-muted)">TEMP</text>
                    <text x="10" y="30" fontSize="15" fontWeight="700" fill={colorTheme.text}>
                      {formatTemp(temp)}
                    </text>

                    {/* Humidity Pill */}
                    <rect x="114" y="0" width="105" height="36" rx="6" fill="#FFFFFF" stroke="#E2E6E1" strokeWidth="1" />
                    <text x="124" y="15" fontSize="9" fontWeight="600" fill="var(--text-muted)">HUMIDITY</text>
                    <text x="124" y="30" fontSize="15" fontWeight="700" fill="var(--text-primary)">
                      {formatHumidity(hum)}
                    </text>
                  </g>
                ) : (
                  <g>
                    <rect x="0" y="0" width="220" height="34" rx="6" fill="#FFFFFF" stroke="#D1D5DB" strokeWidth="1" />
                    <text x="12" y="21" fontSize="11.5" fontWeight="500" fill="#6B7280">
                      {doc ? 'Telemetry Stale / Node Offline' : 'Sensor Not Detected'}
                    </text>
                  </g>
                )}
              </g>

              {/* Actuator Relay Status Indicators (Display ONLY when relay state is available!) */}
              <g transform={`translate(${zone.x + 16}, ${zone.y + zone.height - 40})`}>
                <g style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Fan Actuator (Relay 2) */}
                  {fanState !== null && (
                    <g transform="translate(0, 0)">
                      <rect 
                        x="0" 
                        y="0" 
                        width="80" 
                        height="26" 
                        rx="5" 
                        fill={fanState === 'ON' ? '#E8EEE5' : '#F1F4EE'} 
                        stroke={fanState === 'ON' ? '#A3C9A8' : '#D1D5DB'} 
                        strokeWidth="1"
                      />
                      <g 
                        transform="translate(14, 13)" 
                        className={fanState === 'ON' ? 'actuator-fan-spinning' : ''}
                      >
                        <Fan size={13} style={{ color: fanState === 'ON' ? '#2D5A34' : '#6B746E' }} />
                      </g>
                      <text 
                        x="28" 
                        y="17" 
                        fontSize="10" 
                        fontWeight="700" 
                        fill={fanState === 'ON' ? '#2D5A34' : '#6B746E'}
                      >
                        FAN:{fanState}
                      </text>
                    </g>
                  )}

                  {/* Light Actuator (Relay 1) */}
                  {lightState !== null && (
                    <g transform={`translate(${fanState !== null ? 88 : 0}, 0)`}>
                      <rect 
                        x="0" 
                        y="0" 
                        width="80" 
                        height="26" 
                        rx="5" 
                        fill={lightState === 'ON' ? '#FEF9C3' : '#F1F4EE'} 
                        stroke={lightState === 'ON' ? '#FDE047' : '#D1D5DB'} 
                        strokeWidth="1"
                      />
                      <g 
                        transform="translate(14, 13)" 
                        className={lightState === 'ON' ? 'actuator-light-glowing' : ''}
                      >
                        <Lightbulb size={13} style={{ color: lightState === 'ON' ? '#B45309' : '#6B746E' }} />
                      </g>
                      <text 
                        x="28" 
                        y="17" 
                        fontSize="10" 
                        fontWeight="700" 
                        fill={lightState === 'ON' ? '#B45309' : '#6B746E'}
                      >
                        LT:{lightState}
                      </text>
                    </g>
                  )}

                  {/* Occupancy IR Count (if available) */}
                  {peopleCount !== null && (
                    <g transform={`translate(${(fanState !== null ? 88 : 0) + (lightState !== null ? 88 : 0)}, 0)`}>
                      <rect x="0" y="0" width="70" height="26" rx="5" fill="#FFFFFF" stroke="#E2E6E1" strokeWidth="1" />
                      <g transform="translate(10, 13)">
                        <Users size={12} color="#55705B" />
                      </g>
                      <text x="24" y="17" fontSize="10.5" fontWeight="700" fill="var(--text-primary)">
                        {peopleCount} pax
                      </text>
                    </g>
                  )}
                </g>
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default BlockAFloorPlan;
