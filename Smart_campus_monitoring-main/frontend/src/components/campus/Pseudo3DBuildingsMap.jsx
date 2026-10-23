import React, { useState } from 'react';
import { CAMPUS_BUILDINGS, getBuildingSummary } from '../../data/campusBuildings';
import { formatTemp, formatHumidity } from '../../utils/formatters';
import { 
  Building2, 
  MapPin, 
  ArrowRight, 
  Radio, 
  ShieldCheck, 
  Activity, 
  Layers3, 
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';

/**
 * Color palettes for building status in pseudo-3D
 */
const STATUS_STYLES = {
  NORMAL: {
    roofTop: '#E2EFE3',
    wallLeft: '#9BB89F',
    wallRight: '#B7CEBA',
    accent: '#4F8058',
    glow: 'rgba(79, 128, 88, 0.4)',
    badgeBg: '#D1E7DD',
    badgeText: '#2D5A34',
    label: 'Optimal Comfort'
  },
  WARNING: {
    roofTop: '#FDF0E4',
    wallLeft: '#E2AA83',
    wallRight: '#ECC2A4',
    accent: '#C77B45',
    glow: 'rgba(199, 123, 69, 0.4)',
    badgeBg: '#FCE8E6',
    badgeText: '#9C4221',
    label: 'Suboptimal / Warning'
  },
  CRITICAL: {
    roofTop: '#FDEAEA',
    wallLeft: '#E59292',
    wallRight: '#F0B2B2',
    accent: '#C65C5C',
    glow: 'rgba(198, 92, 92, 0.4)',
    badgeBg: '#FBD5D5',
    badgeText: '#9B1C1C',
    label: 'Critical Condition'
  },
  OFFLINE: {
    roofTop: '#EDF0F3',
    wallLeft: '#A8B3C0',
    wallRight: '#CBD5E1',
    accent: '#64748B',
    glow: 'rgba(100, 116, 139, 0.25)',
    badgeBg: '#E2E8F0',
    badgeText: '#475569',
    label: 'No Sensors / Offline'
  }
};

export default function Pseudo3DBuildingsMap({
  rooms = [],
  now = Date.now(),
  selectedBuildingId = 'IT_PARK',
  onSelectBuilding
}) {
  const [hoveredBuildingId, setHoveredBuildingId] = useState(null);

  // Compute building-level summaries
  const buildingsSummaries = CAMPUS_BUILDINGS.map(b => getBuildingSummary(b, rooms, now));

  // Sort buildings by isoCoords.y ascending for correct isometric z-order (background to foreground)
  const sortedBuildings = [...buildingsSummaries].sort((a, b) => a.isoCoords.y - b.isoCoords.y);

  return (
    <div className="pseudo3d-campus-container">
      {/* Viewport Header */}
      <div className="pseudo3d-top-bar">
        <div className="pseudo3d-title-group">
          <div className="pseudo3d-icon-badge">
            <Layers3 size={18} />
          </div>
          <div>
            <h3 className="pseudo3d-main-title">Pseudo-3D Campus Buildings View</h3>
            <span className="pseudo3d-subtitle">
              Interactive isometric campus twin • 5 Monitored Facilities • Click any building to open its architectural floor plan
            </span>
          </div>
        </div>

        <div className="pseudo3d-legend-bar">
          <div className="legend-chip">
            <span className="legend-swatch" style={{ backgroundColor: '#4F8058' }} />
            <span>Optimal (22–26°C)</span>
          </div>
          <div className="legend-chip">
            <span className="legend-swatch" style={{ backgroundColor: '#C77B45' }} />
            <span>Attention (27–29°C)</span>
          </div>
          <div className="legend-chip">
            <span className="legend-swatch" style={{ backgroundColor: '#C65C5C' }} />
            <span>Critical (≥30°C)</span>
          </div>
          <div className="legend-chip">
            <span className="legend-swatch" style={{ backgroundColor: '#94A3B8' }} />
            <span>Offline / Unmonitored</span>
          </div>
        </div>
      </div>

      {/* Isometric 3D SVG Canvas */}
      <div className="pseudo3d-canvas-wrapper">
        <svg 
          viewBox="0 0 1100 620" 
          className="pseudo3d-svg"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Pseudo-3D Campus Map"
        >
          <defs>
            {/* Ground grid pattern */}
            <pattern id="isoGridPattern" width="40" height="24" patternUnits="userSpaceOnUse">
              <path d="M 0 12 L 20 0 L 40 12 L 20 24 Z" fill="none" stroke="#E2E8DF" strokeWidth="0.8" opacity="0.6" />
            </pattern>

            {/* Drop shadows */}
            <filter id="buildingShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="18" stdDeviation="12" floodColor="#1B2B20" floodOpacity="0.14" />
            </filter>
            <filter id="hoverShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="28" stdDeviation="16" floodColor="#1B2B20" floodOpacity="0.22" />
            </filter>
            <filter id="pillShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#0F172A" floodOpacity="0.15" />
            </filter>
          </defs>

          {/* Isometric Ground Plane Diamond */}
          <polygon 
            points="550,40 1050,310 550,580 50,310" 
            fill="#F6F9F5" 
            stroke="#DCE5D9" 
            strokeWidth="1.5"
          />
          <polygon 
            points="550,40 1050,310 550,580 50,310" 
            fill="url(#isoGridPattern)" 
          />

          {/* Campus Pathways (Isometric Ribbon Network Connecting All 5 Facilities) */}
          <g className="campus-pathways" stroke="#D7E1D4" strokeWidth="1" fill="#EDF2EB">
            {/* North-South Spine */}
            <path d="M 550 200 L 550 560" stroke="#DCE5D9" strokeWidth="8" strokeLinecap="round" fill="none" />

            {/* Path to IT Park (West) */}
            <path d="M 550 290 L 260 230" stroke="#DCE5D9" strokeWidth="6" strokeLinecap="round" fill="none" />

            {/* Path to Central Library (East) */}
            <path d="M 550 290 L 840 230" stroke="#DCE5D9" strokeWidth="6" strokeLinecap="round" fill="none" />

            {/* Path to Trust Office (Southwest) */}
            <path d="M 550 330 L 370 410" stroke="#DCE5D9" strokeWidth="6" strokeLinecap="round" fill="none" />

            {/* Path to Administrative Block (Southeast) */}
            <path d="M 550 330 L 730 405" stroke="#DCE5D9" strokeWidth="6" strokeLinecap="round" fill="none" />
          </g>

          {/* Campus Central Courtyard Feature */}
          <polygon 
            points="550,265 600,290 550,315 500,290" 
            fill="#E0EBE1" 
            stroke="#7A9474" 
            strokeWidth="1.5"
          />
          <circle cx="550" cy="290" r="6" fill="#4F8058" />

          {/* PASS 1: Render 3D Extruded Buildings (Sorted from back to front) */}
          {sortedBuildings.map((b) => {
            const isHovered = hoveredBuildingId === b.id;
            const isSelected = selectedBuildingId === b.id || selectedBuildingId === b.legacyId;
            const style = STATUS_STYLES[b.overallStatus] || STATUS_STYLES.OFFLINE;

            const { x, y } = b.isoCoords;
            const { width: w, depth: d, height: h } = b.dimensions;
            const lift = isHovered ? 10 : 0;
            const effectiveY = y - lift;

            // Base vertices
            const pBaseLeft = { x: x - w * 0.5, y: effectiveY + d * 0.25 };
            const pBaseBottom = { x: x, y: effectiveY + d * 0.5 };
            const pBaseRight = { x: x + w * 0.5, y: effectiveY + d * 0.25 };
            const pBaseCenter = { x: x, y: effectiveY };

            // Top vertices (lifted by height h)
            const pTopLeft = { x: pBaseLeft.x, y: pBaseLeft.y - h };
            const pTopBottom = { x: pBaseBottom.x, y: pBaseBottom.y - h };
            const pTopRight = { x: pBaseRight.x, y: pBaseRight.y - h };
            const pTopCenter = { x: pBaseCenter.x, y: pBaseCenter.y - h };

            return (
              <g 
                key={`bldg-geo-${b.id}`} 
                className={`pseudo3d-building-group ${isSelected ? 'is-selected' : ''} ${isHovered ? 'is-hovered' : ''}`}
                onMouseEnter={() => setHoveredBuildingId(b.id)}
                onMouseLeave={() => setHoveredBuildingId(null)}
                onClick={() => onSelectBuilding && onSelectBuilding(b.id)}
                role="button"
                tabIndex={0}
                aria-label={`${b.name}: ${b.subtitle}`}
              >
                <title>{b.name}: {b.subtitle} ({b.totalRooms} Rooms)</title>

                {/* Ground Shadow */}
                <ellipse 
                  cx={x} 
                  cy={y + 15} 
                  rx={w * 0.55} 
                  ry={d * 0.35} 
                  fill="#1E2B22" 
                  opacity={isHovered ? 0.28 : 0.16}
                  style={{ transition: 'all 0.3s ease' }}
                />

                {/* 3D Extrusion - Left Wall (Darker shade) */}
                <polygon 
                  points={`${pBaseLeft.x},${pBaseLeft.y} ${pBaseBottom.x},${pBaseBottom.y} ${pTopBottom.x},${pTopBottom.y} ${pTopLeft.x},${pTopLeft.y}`}
                  fill={style.wallLeft}
                  stroke="#2D3B31"
                  strokeWidth={isSelected ? 2 : 1}
                  strokeOpacity="0.3"
                />

                {/* Left Wall Floor Striping */}
                {Array.from({ length: b.floors - 1 }).map((_, fIdx) => {
                  const frac = (fIdx + 1) / b.floors;
                  const fyLeft = pBaseLeft.y - h * frac;
                  const fyBottom = pBaseBottom.y - h * frac;
                  return (
                    <line 
                      key={`f-left-${fIdx}`}
                      x1={pBaseLeft.x} y1={fyLeft}
                      x2={pBaseBottom.x} y2={fyBottom}
                      stroke="#FFFFFF"
                      strokeWidth="1.2"
                      strokeOpacity="0.4"
                    />
                  );
                })}

                {/* 3D Extrusion - Right Wall (Medium shade) */}
                <polygon 
                  points={`${pBaseBottom.x},${pBaseBottom.y} ${pBaseRight.x},${pBaseRight.y} ${pTopRight.x},${pTopRight.y} ${pTopBottom.x},${pTopBottom.y}`}
                  fill={style.wallRight}
                  stroke="#2D3B31"
                  strokeWidth={isSelected ? 2 : 1}
                  strokeOpacity="0.3"
                />

                {/* Right Wall Floor Striping */}
                {Array.from({ length: b.floors - 1 }).map((_, fIdx) => {
                  const frac = (fIdx + 1) / b.floors;
                  const fyBottom = pBaseBottom.y - h * frac;
                  const fyRight = pBaseRight.y - h * frac;
                  return (
                    <line 
                      key={`f-right-${fIdx}`}
                      x1={pBaseBottom.x} y1={fyBottom}
                      x2={pBaseRight.x} y2={fyRight}
                      stroke="#FFFFFF"
                      strokeWidth="1.2"
                      strokeOpacity="0.4"
                    />
                  );
                })}

                {/* 3D Roof (Top highlight surface) */}
                <polygon 
                  points={`${pTopLeft.x},${pTopLeft.y} ${pTopCenter.x},${pTopCenter.y} ${pTopRight.x},${pTopRight.y} ${pTopBottom.x},${pTopBottom.y}`}
                  fill={style.roofTop}
                  stroke={isSelected ? '#202925' : style.accent}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                />

                {/* Roof Architectural Penthouse / HVAC Pod */}
                <polygon 
                  points={`${x - 20},${pTopCenter.y + 12} ${x},${pTopCenter.y + 4} ${x + 20},${pTopCenter.y + 12} ${x},${pTopCenter.y + 20}`}
                  fill="#FFFFFF"
                  stroke="#CBD5E1"
                  strokeWidth="1"
                />

                {/* Pulsing Status Beacon on Roof Top */}
                <circle 
                  cx={x} 
                  cy={pTopCenter.y + 4} 
                  r="9" 
                  fill={style.accent} 
                  opacity="0.25"
                  className="beacon-pulse-wave"
                />
                <circle 
                  cx={x} 
                  cy={pTopCenter.y + 4} 
                  r="4" 
                  fill={style.accent} 
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />

                {/* Selection Highlight Ring */}
                {isSelected && (
                  <ellipse 
                    cx={x} 
                    cy={pTopBottom.y + 8} 
                    rx={w * 0.45} 
                    ry={d * 0.25} 
                    fill="none" 
                    stroke="#2D5A34" 
                    strokeWidth="2.5" 
                    strokeDasharray="4 3" 
                  />
                )}
              </g>
            );
          })}

          {/* PASS 2: Floating Info Badges Layer (Rendered on top so labels are never occluded) */}
          <g className="pseudo3d-floating-labels">
            {sortedBuildings.map((b) => {
              const isHovered = hoveredBuildingId === b.id;
              const isSelected = selectedBuildingId === b.id || selectedBuildingId === b.legacyId;
              const style = STATUS_STYLES[b.overallStatus] || STATUS_STYLES.OFFLINE;

              const { x, y } = b.isoCoords;
              const { height: h } = b.dimensions;
              const lift = isHovered ? 10 : 0;
              const effectiveY = y - lift;
              const pTopCenterY = effectiveY - h;
              const labelY = pTopCenterY - 24;

              return (
                <g 
                  key={`bldg-label-${b.id}`}
                  transform={`translate(${x}, ${labelY})`}
                  className={`pseudo3d-label-group ${isSelected ? 'is-selected' : ''}`}
                  onMouseEnter={() => setHoveredBuildingId(b.id)}
                  onMouseLeave={() => setHoveredBuildingId(null)}
                  onClick={() => onSelectBuilding && onSelectBuilding(b.id)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Floating Glass Pill */}
                  <rect 
                    x="-108" 
                    y="-18" 
                    width="216" 
                    height="36" 
                    rx="18" 
                    fill="#FFFFFF" 
                    stroke={isSelected ? '#202925' : '#D1D5DB'}
                    strokeWidth={isSelected ? 2 : 1}
                    filter="url(#pillShadow)"
                  />

                  {/* Status Indicator Dot */}
                  <circle cx="-91" cy="0" r="5" fill={style.accent} />

                  {/* Building Title (Clearly readable & ample space) */}
                  <text 
                    x="-78" 
                    y="-2" 
                    fontSize="12" 
                    fontWeight="700" 
                    fill="#1E293B" 
                    fontFamily="system-ui, -apple-system, sans-serif"
                  >
                    {b.name}
                  </text>

                  {/* Room count / temp */}
                  <text 
                    x="-78" 
                    y="10" 
                    fontSize="9.5" 
                    fontWeight="500" 
                    fill="#64748B" 
                    fontFamily="system-ui, -apple-system, sans-serif"
                  >
                    {b.totalRooms} Zones • {b.avgTemp !== null ? `${formatTemp(b.avgTemp)}` : 'Offline'}
                  </text>

                  {/* Mode badge chip on the right */}
                  {b.hasLiveHardware && (
                    <g transform="translate(38, -9)">
                      <rect width="60" height="18" rx="4" fill="#D1E7DD" />
                      <text 
                        x="30" 
                        y="12.5" 
                        fontSize="8" 
                        fontWeight="800" 
                        fill="#2D5A34" 
                        textAnchor="middle"
                        letterSpacing="0.4"
                      >
                        LIVE ESP32
                      </text>
                    </g>
                  )}
                  {b.isEntirelyUnmonitored && (
                    <g transform="translate(36, -9)">
                      <rect width="64" height="18" rx="4" fill="#F1F5F9" />
                      <text 
                        x="32" 
                        y="12.5" 
                        fontSize="7" 
                        fontWeight="700" 
                        fill="#64748B" 
                        textAnchor="middle"
                      >
                        NO SENSORS
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Interactive Quick Buildings Strip (All 5 Buildings Gridded Neatly) */}
      <div className="pseudo3d-cards-strip">
        {buildingsSummaries.map((b) => {
          const isSelected = selectedBuildingId === b.id || selectedBuildingId === b.legacyId;
          const statusStyle = STATUS_STYLES[b.overallStatus] || STATUS_STYLES.OFFLINE;

          return (
            <div 
              key={b.id} 
              className={`building-selector-card ${isSelected ? 'active' : ''}`}
              onClick={() => onSelectBuilding && onSelectBuilding(b.id)}
              role="button"
              tabIndex={0}
            >
              <div className="selector-card-top">
                <div className="selector-card-name-group">
                  <div className="selector-icon" style={{ backgroundColor: `${statusStyle.accent}15`, color: statusStyle.accent }}>
                    <Building2 size={16} />
                  </div>
                  <div>
                    <h4 className="selector-name">{b.name}</h4>
                    <span className="selector-sub">{b.subtitle}</span>
                  </div>
                </div>

                <span 
                  className="selector-status-badge"
                  style={{ backgroundColor: statusStyle.badgeBg, color: statusStyle.badgeText }}
                >
                  {statusStyle.label}
                </span>
              </div>

              <div className="selector-metrics-row">
                <div className="selector-metric">
                  <span className="metric-lbl">Avg Temp</span>
                  <span className="metric-num">
                    {b.avgTemp !== null ? formatTemp(b.avgTemp) : '—'}
                  </span>
                </div>

                <div className="selector-metric">
                  <span className="metric-lbl">Avg Humidity</span>
                  <span className="metric-num">
                    {b.avgHum !== null ? formatHumidity(b.avgHum) : '—'}
                  </span>
                </div>

                <div className="selector-metric">
                  <span className="metric-lbl">Monitored Zones</span>
                  <span className="metric-num">{b.totalRooms} Rooms</span>
                </div>

                <div className="selector-metric">
                  <span className="metric-lbl">Telemetry Mode</span>
                  <span className="metric-num" style={{ fontSize: '11.5px' }}>
                    {b.hasLiveHardware ? (
                      <span style={{ color: '#2D5A34', fontWeight: 700 }}>🟢 ESP32 Live</span>
                    ) : b.isEntirelyUnmonitored ? (
                      <span style={{ color: '#64748B', fontWeight: 600 }}>⚪ No Sensors</span>
                    ) : (
                      <span style={{ color: '#2D5A34', fontWeight: 600 }}>🟢 Active Stream</span>
                    )}
                  </span>
                </div>
              </div>

              <div className="selector-card-action">
                <span>View 3D Room Floor Plan</span>
                <ArrowRight size={14} />
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .pseudo3d-campus-container {
          background-color: var(--bg-surface, #FFFFFF);
          border: 1px solid var(--border-color, #E2E6E1);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          margin-bottom: 24px;
        }

        .pseudo3d-top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-color, #E2E6E1);
          background-color: #FAFCF9;
        }

        .pseudo3d-title-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .pseudo3d-icon-badge {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background-color: #E8EEE5;
          color: #4F8058;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pseudo3d-main-title {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary, #202925);
        }

        .pseudo3d-subtitle {
          font-size: 12px;
          color: var(--text-secondary, #525C56);
        }

        .pseudo3d-legend-bar {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }

        .legend-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          color: var(--text-secondary, #525C56);
          font-weight: 500;
        }

        .legend-swatch {
          width: 10px;
          height: 10px;
          border-radius: 2px;
        }

        .pseudo3d-canvas-wrapper {
          position: relative;
          width: 100%;
          background: linear-gradient(180deg, #F9FAF8 0%, #F1F4EE 100%);
          border-bottom: 1px solid var(--border-color, #E2E6E1);
          overflow: hidden;
        }

        .pseudo3d-svg {
          width: 100%;
          height: auto;
          display: block;
        }

        .pseudo3d-building-group {
          cursor: pointer;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .pseudo3d-building-group:hover {
          filter: drop-shadow(0 12px 20px rgba(32, 41, 37, 0.16));
        }

        .pseudo3d-label-group {
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes beaconPulse {
          0% { r: 4; opacity: 0.9; }
          70% { r: 12; opacity: 0; }
          100% { r: 12; opacity: 0; }
        }

        .beacon-pulse-wave {
          animation: beaconPulse 2s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
        }

        /* Bottom Selection Strip (5 Columns on Desktop) */
        .pseudo3d-cards-strip {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(195px, 1fr));
          gap: 12px;
          padding: 16px;
          background-color: #FAFCF9;
        }

        @media (min-width: 1100px) {
          .pseudo3d-cards-strip {
            grid-template-columns: repeat(5, 1fr);
          }
        }

        .building-selector-card {
          background-color: #FFFFFF;
          border: 1px solid var(--border-color, #E2E6E1);
          border-radius: 10px;
          padding: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .building-selector-card:hover {
          border-color: #4F8058;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .building-selector-card.active {
          border-color: #4F8058;
          border-width: 1.5px;
          background-color: #F8FAF7;
          box-shadow: 0 4px 12px rgba(79, 128, 88, 0.1);
        }

        .selector-card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
        }

        .selector-card-name-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .selector-icon {
          width: 30px;
          height: 30px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .selector-name {
          margin: 0;
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary, #202925);
        }

        .selector-sub {
          font-size: 11px;
          color: var(--text-muted, #8E9690);
          display: block;
        }

        .selector-status-badge {
          font-size: 10px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 4px;
          white-space: nowrap;
        }

        .selector-metrics-row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 6px;
          padding: 8px 0;
          border-top: 1px solid #F1F4EE;
          border-bottom: 1px solid #F1F4EE;
        }

        .selector-metric {
          display: flex;
          flex-direction: column;
        }

        .metric-lbl {
          font-size: 9.5px;
          color: var(--text-muted, #8E9690);
          text-transform: uppercase;
          font-weight: 600;
        }

        .metric-num {
          font-size: 12.5px;
          font-weight: 700;
          color: var(--text-primary, #202925);
        }

        .selector-card-action {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11.5px;
          font-weight: 600;
          color: #4F8058;
          padding-top: 2px;
        }
      `}</style>
    </div>
  );
}
