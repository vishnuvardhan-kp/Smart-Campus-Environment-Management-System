import React, { useState } from 'react';
import { CAMPUS_BUILDINGS, resolveRoomTelemetry } from '../../data/campusBuildings';
import { formatTemp, formatHumidity, formatTimeAgo, formatDateTime } from '../../utils/formatters';
import { 
  Building2, 
  ArrowLeft, 
  Thermometer, 
  Droplets, 
  Users, 
  Lightbulb, 
  Fan, 
  Radio, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  Compass, 
  Sparkles,
  ArrowRight,
  Info
} from 'lucide-react';
import { Link } from 'react-router-dom';

const ROOM_STATUS_COLORS = {
  NORMAL: {
    bg: '#EBF3EC',
    border: '#7A9474',
    borderSide: '#5F7959',
    accent: '#4F8058',
    text: '#2D5A34',
    badgeBg: '#D1E7DD',
    badgeText: '#2D5A34',
    label: 'Optimal Comfort'
  },
  WARNING: {
    bg: '#FDF2E9',
    border: '#E8A374',
    borderSide: '#C77B45',
    accent: '#C77B45',
    text: '#9C4221',
    badgeBg: '#FCE8E6',
    badgeText: '#9C4221',
    label: 'Warning / Elevated'
  },
  CRITICAL: {
    bg: '#FDEAEA',
    border: '#F09B9B',
    borderSide: '#C65C5C',
    accent: '#C65C5C',
    text: '#9B1C1C',
    badgeBg: '#FBD5D5',
    badgeText: '#9B1C1C',
    label: 'Critical Condition'
  },
  OFFLINE: {
    bg: '#F1F5F9',
    border: '#CBD5E1',
    borderSide: '#94A3B8',
    accent: '#64748B',
    text: '#475569',
    badgeBg: '#E2E8F0',
    badgeText: '#475569',
    label: 'No Sensor Connected'
  }
};

export default function IsometricRoomInterior({
  building,
  rooms = [],
  now = Date.now(),
  onBackToOverview,
  onSwitchBuilding
}) {
  const [selectedRoomId, setSelectedRoomId] = useState(
    building?.rooms?.[0]?.id || 'LAB101'
  );

  if (!building) return null;

  // Resolve telemetry for all rooms in this building
  const roomsTelemetry = building.rooms.map(r => resolveRoomTelemetry(r, rooms, now));

  // Current selected room telemetry (safely fallback if selected room belongs to another building)
  const currentRoomIds = building.rooms.map(r => r.id);
  const activeRoomId = currentRoomIds.includes(selectedRoomId)
    ? selectedRoomId
    : building.rooms[0]?.id;
  const selectedRoom = roomsTelemetry.find(r => r.id === activeRoomId) || roomsTelemetry[0];
  const selectedStatusStyle = ROOM_STATUS_COLORS[selectedRoom?.statusCategory] || ROOM_STATUS_COLORS.OFFLINE;

  return (
    <div className="iso-interior-wrapper">
      {/* Navigation Header */}
      <div className="iso-interior-header">
        <div className="iso-header-left">
          <button 
            type="button" 
            className="btn-back-overview"
            onClick={onBackToOverview}
            aria-label="Back to campus buildings overview"
          >
            <ArrowLeft size={16} />
            <span>Campus Overview</span>
          </button>

          <div className="iso-header-divider" />

          <div className="iso-building-title-wrap">
            <div className="iso-building-icon" style={{ backgroundColor: `${building.accentColor}18`, color: building.accentColor }}>
              <Building2 size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 className="iso-building-name">{building.name}</h2>
                <span className="iso-building-tag">{building.floors} Floors • {building.rooms.length} Monitored Zones</span>
              </div>
              <span className="iso-building-sub">{building.subtitle}</span>
            </div>
          </div>
        </div>

        {/* Quick building switcher */}
        {onSwitchBuilding && (
          <div className="iso-quick-switcher">
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>SWITCH:</span>
            {CAMPUS_BUILDINGS.map(b => (
              <button
                key={b.id}
                type="button"
                className={`btn-pill-switch ${b.id === building.id || b.legacyId === building.id ? 'active' : ''}`}
                onClick={() => onSwitchBuilding(b.id)}
              >
                {b.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Layout: Isometric Room Tiles Grid (Left) + Detail Inspector (Right) */}
      <div className="iso-interior-body">
        {/* Left Column: 3D Isometric Room Tiles */}
        <div className="iso-tiles-column">
          <div className="iso-column-header">
            <div>
              <h3 className="iso-column-title">Architectural Room Zones</h3>
              <span className="iso-column-sub">Select any room tile to inspect real-time environmental telemetry</span>
            </div>
            <span className="iso-view-pill">Angled 2.5D Isometric Floor Plan</span>
          </div>

          <div className="iso-rooms-grid">
            {roomsTelemetry.map((room) => {
              const isSelected = room.id === activeRoomId;
              const statusStyle = ROOM_STATUS_COLORS[room.statusCategory] || ROOM_STATUS_COLORS.OFFLINE;

              return (
                <div
                  key={room.id}
                  className={`iso-room-tile ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => setSelectedRoomId(room.id)}
                  role="button"
                  tabIndex={0}
                  style={{
                    '--tile-bg': statusStyle.bg,
                    '--tile-border': statusStyle.border,
                    '--tile-border-side': statusStyle.borderSide,
                    '--tile-accent': statusStyle.accent
                  }}
                >
                  {/* 3D Isometric Extruded Box Faces */}
                  <div className="iso-3d-box">
                    {/* Top Floor Plane */}
                    <div className="iso-3d-face-top">
                      {/* Room Header Strip */}
                      <div className="tile-header-strip">
                        <div className="tile-name-group">
                          <strong className="tile-room-name">{room.name}</strong>
                          <span className="tile-room-type">{room.wing} • {room.type}</span>
                        </div>

                        {/* Hardware Provenance Badge */}
                        {room.sourceType === 'LIVE_HARDWARE' && (
                          <span className="tile-source-badge live">
                            <span className="pulse-dot-green" />
                            LIVE ESP32
                          </span>
                        )}
                        {room.sourceType === 'NO_SENSOR' && (
                          <span className="tile-source-badge offline">
                            NO SENSOR
                          </span>
                        )}
                      </div>

                      {/* Main Telemetry Display */}
                      <div className="tile-metrics-body">
                        {room.temperature !== null ? (
                          <div className="tile-metric-main">
                            <div className="tile-temp-wrapper">
                              <Thermometer size={18} style={{ color: statusStyle.accent }} />
                              <span className="tile-temp-val">{formatTemp(room.temperature)}</span>
                            </div>
                            <div className="tile-hum-wrapper">
                              <Droplets size={14} style={{ color: '#2B6CB0' }} />
                              <span className="tile-hum-val">{formatHumidity(room.humidity)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="tile-metric-offline">
                            <Radio size={18} style={{ color: '#94A3B8' }} />
                            <span>Sensor Offline / Unconnected</span>
                          </div>
                        )}

                        {/* Occupancy and Actuator Controls */}
                        <div className="tile-sub-metrics">
                          <div className="tile-sub-item">
                            <Users size={13} style={{ color: '#525C56' }} />
                            <span>
                              {room.peopleCount !== null ? `${room.peopleCount} Events` : '—'}
                            </span>
                          </div>

                          <div className="tile-actuators-strip">
                            <span className={`tile-actuator-chip ${room.light === 'ON' ? 'light-on' : ''}`}>
                              <Lightbulb size={12} />
                              <span>{room.light === 'ON' ? 'L:ON' : 'L:OFF'}</span>
                            </span>

                            <span className={`tile-actuator-chip ${room.fan === 'ON' ? 'fan-on' : ''}`}>
                              <Fan size={12} className={room.fan === 'ON' ? 'spin-icon' : ''} />
                              <span>{room.fan === 'ON' ? 'F:ON' : 'F:OFF'}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Status Row */}
                      <div className="tile-footer-row">
                        <span className="tile-status-tag" style={{ backgroundColor: statusStyle.badgeBg, color: statusStyle.badgeText }}>
                          {statusStyle.label}
                        </span>
                        <span className="tile-inspect-action">
                          <span>Inspect Zone</span>
                          <ArrowRight size={12} />
                        </span>
                      </div>
                    </div>

                    {/* 3D Extruded Front Depth Edge */}
                    <div className="iso-3d-edge-front" />
                    {/* 3D Extruded Right Depth Edge */}
                    <div className="iso-3d-edge-right" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Room Detail Inspector Panel */}
        <div className="iso-inspector-column">
          <div className="inspector-panel-card">
            {/* Inspector Header */}
            <div className="inspector-panel-header">
              <div className="inspector-title-row">
                <h3 className="inspector-room-title">{selectedRoom.name}</h3>
                <span 
                  className="inspector-status-badge"
                  style={{ backgroundColor: selectedStatusStyle.badgeBg, color: selectedStatusStyle.badgeText }}
                >
                  {selectedStatusStyle.label}
                </span>
              </div>
              <span className="inspector-room-subtitle">
                {building.name} • {selectedRoom.wing} • {selectedRoom.type}
              </span>
            </div>

            {/* Telemetry Status Banner */}
            <div className={`telemetry-source-banner ${selectedRoom.sourceType.toLowerCase()}`}>
              <div className="source-banner-icon">
                {selectedRoom.sourceType === 'LIVE_HARDWARE' && <ShieldCheck size={18} />}
                {selectedRoom.sourceType === 'SIMULATED' && <Radio size={18} />}
                {selectedRoom.sourceType === 'NO_SENSOR' && <Info size={18} />}
              </div>
              <div>
                <strong className="source-banner-title">
                  {selectedRoom.sourceType === 'LIVE_HARDWARE' && 'Live Physical ESP32 Hardware'}
                  {selectedRoom.sourceType === 'SIMULATED' && 'Active Environmental Stream'}
                  {selectedRoom.sourceType === 'NO_SENSOR' && 'No Sensor Connected'}
                </strong>
                <span className="source-banner-desc">
                  {selectedRoom.sourceType === 'LIVE_HARDWARE' && 'Directly streaming from ESP32 node with DHT11 temperature/humidity and digital IR obstacle counter on Pin 27.'}
                  {selectedRoom.sourceType === 'SIMULATED' && 'Continuous room climate monitoring tracking ambient temperature, relative humidity, and facility occupancy.'}
                  {selectedRoom.sourceType === 'NO_SENSOR' && 'This room is not currently equipped with an active sensing node. Environmental telemetry is unavailable.'}
                </span>
              </div>
            </div>

            {/* 4 Core Metrics Grid */}
            <div className="inspector-metrics-grid">
              {/* Temperature Box */}
              <div className="inspector-metric-box">
                <div className="metric-box-header">
                  <Thermometer size={15} style={{ color: selectedStatusStyle.accent }} />
                  <span>Temperature</span>
                </div>
                <div className="metric-box-val">
                  {selectedRoom.temperature !== null ? formatTemp(selectedRoom.temperature) : '—'}
                </div>
                <div className="metric-box-sub">
                  {selectedRoom.temperature !== null ? (
                    selectedRoom.temperature > 26 ? 'Above comfort threshold' : 'Optimal range (22–26°C)'
                  ) : 'No reading available'}
                </div>
              </div>

              {/* Humidity Box */}
              <div className="inspector-metric-box">
                <div className="metric-box-header">
                  <Droplets size={15} style={{ color: '#2B6CB0' }} />
                  <span>Relative Humidity</span>
                </div>
                <div className="metric-box-val">
                  {selectedRoom.humidity !== null ? formatHumidity(selectedRoom.humidity) : '—'}
                </div>
                <div className="metric-box-sub">
                  Target: 40% – 60% RH
                </div>
              </div>

              {/* Occupancy Triggers */}
              <div className="inspector-metric-box">
                <div className="metric-box-header">
                  <Users size={15} style={{ color: '#55705B' }} />
                  <span>Passage Events</span>
                </div>
                <div className="metric-box-val">
                  {selectedRoom.peopleCount !== null ? selectedRoom.peopleCount : '—'}
                </div>
                <div className="metric-box-sub">
                  {selectedRoom.peopleCount > 0 ? 'Active session motion detected' : 'Room idle'}
                </div>
              </div>

              {/* Data Freshness */}
              <div className="inspector-metric-box">
                <div className="metric-box-header">
                  <Clock size={15} style={{ color: '#7A9474' }} />
                  <span>Data Freshness</span>
                </div>
                <div className="metric-box-val" style={{ fontSize: '14px', fontWeight: 600 }}>
                  {selectedRoom.lastUpdated ? formatTimeAgo(selectedRoom.lastUpdated, now) : 'N/A'}
                </div>
                <div className="metric-box-sub">
                  {selectedRoom.lastUpdated ? formatDateTime(selectedRoom.lastUpdated) : 'Offline'}
                </div>
              </div>
            </div>

            {/* Actuator Relay Controls Banner */}
            <div className="inspector-actuators-card">
              <span className="actuators-card-title">Automated Actuator Relays:</span>
              <div className="actuators-badges-wrap">
                <div className={`relay-pill ${selectedRoom.light === 'ON' ? 'is-active-light' : ''}`}>
                  <Lightbulb size={14} />
                  <span>Lighting Relay: <strong>{selectedRoom.light || 'OFF'}</strong></span>
                </div>

                <div className={`relay-pill ${selectedRoom.fan === 'ON' ? 'is-active-fan' : ''}`}>
                  <Fan size={14} className={selectedRoom.fan === 'ON' ? 'spin-icon' : ''} />
                  <span>Cooling Fan Relay: <strong>{selectedRoom.fan || 'OFF'}</strong></span>
                </div>
              </div>
            </div>

            {/* Assessment / Condition Advisory */}
            {selectedRoom.assessment && (
              <div className="inspector-advisory-card">
                <div className="advisory-title-row">
                  <Sparkles size={15} style={{ color: '#4F8058' }} />
                  <strong>Environmental Assessment:</strong>
                </div>
                <p className="advisory-text">
                  {selectedRoom.assessment.reason || 'Normal ambient condition.'}
                </p>
                {selectedRoom.assessment.recommendation && (
                  <span className="advisory-rec">
                    Recommendation: {selectedRoom.assessment.recommendation}
                  </span>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="inspector-actions-row">
              <Link 
                to={`/monitoring/${selectedRoom.id}`} 
                className="btn-primary"
                style={{ textDecoration: 'none', width: '100%', justifyContent: 'center' }}
              >
                <span>Open Zone Telemetry & History</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .iso-interior-wrapper {
          background-color: var(--bg-surface, #FFFFFF);
          border: 1px solid var(--border-color, #E2E6E1);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          margin-bottom: 24px;
        }

        .iso-interior-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 14px;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-color, #E2E6E1);
          background-color: #FAFCF9;
        }

        .iso-header-left {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .btn-back-overview {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 14px;
          border-radius: 8px;
          background-color: #FFFFFF;
          border: 1px solid #D1D5DB;
          color: var(--text-primary, #202925);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-back-overview:hover {
          background-color: #F3F4F6;
          border-color: #9CA3AF;
        }

        .iso-header-divider {
          width: 1px;
          height: 28px;
          background-color: #E2E6E1;
        }

        .iso-building-title-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .iso-building-icon {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .iso-building-name {
          margin: 0;
          font-size: 18px;
          font-weight: 800;
          color: var(--text-primary, #202925);
        }

        .iso-building-tag {
          font-size: 11.5px;
          font-weight: 600;
          padding: 2px 8px;
          background-color: #E8EEE5;
          color: #2D5A34;
          border-radius: 4px;
        }

        .iso-building-sub {
          font-size: 12px;
          color: var(--text-secondary, #525C56);
        }

        .iso-quick-switcher {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .btn-pill-switch {
          padding: 5px 10px;
          font-size: 12px;
          border-radius: 6px;
          border: 1px solid #D1D5DB;
          background-color: #FFFFFF;
          color: #525C56;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.15s ease;
        }

        .btn-pill-switch:hover {
          border-color: #4F8058;
          color: #202925;
        }

        .btn-pill-switch.active {
          background-color: #202925;
          color: #FFFFFF;
          border-color: #202925;
          font-weight: 700;
        }

        /* Interior Grid Body */
        .iso-interior-body {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 20px;
          padding: 20px;
          background-color: #F8FAF7;
        }

        @media (max-width: 1040px) {
          .iso-interior-body {
            grid-template-columns: 1fr;
          }
        }

        .iso-tiles-column {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .iso-column-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 12px;
        }

        .iso-column-title {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary, #202925);
        }

        .iso-column-sub {
          font-size: 12px;
          color: var(--text-secondary, #525C56);
        }

        .iso-view-pill {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 4px;
          background-color: #FFFFFF;
          border: 1px solid #D1D5DB;
          color: #525C56;
        }

        /* 3D Isometric Room Tiles Grid */
        .iso-rooms-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 20px;
          perspective: 1000px;
        }

        .iso-room-tile {
          cursor: pointer;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease;
          position: relative;
        }

        .iso-room-tile:hover {
          transform: translateY(-5px);
        }

        .iso-room-tile.is-selected {
          transform: translateY(-6px);
        }

        /* 3D Extruded Tile Box */
        .iso-3d-box {
          position: relative;
        }

        .iso-3d-face-top {
          background-color: var(--tile-bg, #FFFFFF);
          border: 1.5px solid var(--tile-border, #CBD5E1);
          border-radius: 10px;
          padding: 14px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: all 0.2s ease;
        }

        .iso-room-tile.is-selected .iso-3d-face-top {
          border-color: #202925;
          border-width: 2px;
          box-shadow: 0 8px 24px rgba(32, 41, 37, 0.14);
        }

        /* Raised Depth Edges (Pseudo-3D Bottom and Right) */
        .iso-3d-edge-front {
          position: absolute;
          left: 4px;
          right: 4px;
          bottom: -7px;
          height: 10px;
          background-color: var(--tile-border-side, #94A3B8);
          border-radius: 0 0 10px 10px;
          z-index: 1;
          opacity: 0.85;
          transition: all 0.2s ease;
        }

        .iso-room-tile:hover .iso-3d-edge-front,
        .iso-room-tile.is-selected .iso-3d-edge-front {
          bottom: -11px;
          height: 14px;
        }

        .tile-header-strip {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
        }

        .tile-name-group {
          display: flex;
          flex-direction: column;
        }

        .tile-room-name {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary, #202925);
        }

        .tile-room-type {
          font-size: 11px;
          color: var(--text-muted, #8E9690);
        }

        .tile-source-badge {
          font-size: 9.5px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
          letter-spacing: 0.3px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .tile-source-badge.live {
          background-color: #D1E7DD;
          color: #2D5A34;
        }

        .tile-source-badge.demo {
          background-color: #FEF3C7;
          color: #92400E;
        }

        .tile-source-badge.offline {
          background-color: #E2E8F0;
          color: #64748B;
        }

        .pulse-dot-green {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background-color: #2D5A34;
          animation: dotBlink 1.5s infinite;
        }

        @keyframes dotBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .tile-metrics-body {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .tile-metric-main {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .tile-temp-wrapper,
        .tile-hum-wrapper {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .tile-temp-val {
          font-size: 18px;
          font-weight: 800;
          color: var(--text-primary, #202925);
        }

        .tile-hum-val {
          font-size: 14px;
          font-weight: 600;
          color: #2B6CB0;
        }

        .tile-metric-offline {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #64748B;
          font-weight: 600;
          padding: 6px 0;
        }

        .tile-sub-metrics {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11.5px;
          color: #525C56;
          border-top: 1px solid rgba(0, 0, 0, 0.05);
          padding-top: 6px;
        }

        .tile-sub-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 500;
        }

        .tile-actuators-strip {
          display: flex;
          gap: 4px;
        }

        .tile-actuator-chip {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 5px;
          border-radius: 3px;
          background-color: #E2E8F0;
          color: #64748B;
        }

        .tile-actuator-chip.light-on {
          background-color: #FEF3C7;
          color: #B45309;
        }

        .tile-actuator-chip.fan-on {
          background-color: #D1FAE5;
          color: #065F46;
        }

        .spin-icon {
          animation: spin 1.2s linear infinite;
        }

        @keyframes spin {
          100% { transform: rotate(360deg); }
        }

        .tile-footer-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 2px;
        }

        .tile-status-tag {
          font-size: 10.5px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 4px;
        }

        .tile-inspect-action {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 600;
          color: var(--tile-accent, #4F8058);
        }

        /* Right Column Inspector Card */
        .inspector-panel-card {
          background-color: #FFFFFF;
          border: 1px solid var(--border-color, #E2E6E1);
          border-radius: 10px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04);
        }

        .inspector-panel-header {
          display: flex;
          flex-direction: column;
          gap: 4px;
          border-bottom: 1px solid #F1F4EE;
          padding-bottom: 12px;
        }

        .inspector-title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }

        .inspector-room-title {
          margin: 0;
          font-size: 19px;
          font-weight: 800;
          color: var(--text-primary, #202925);
        }

        .inspector-status-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 4px;
        }

        .inspector-room-subtitle {
          font-size: 12px;
          color: var(--text-secondary, #525C56);
        }

        /* Source Banner */
        .telemetry-source-banner {
          display: flex;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 12px;
        }

        .telemetry-source-banner.live_hardware {
          background-color: #E8EEE5;
          border: 1px solid #CCE3D0;
          color: #2D5A34;
        }

        .telemetry-source-banner.simulated,
        .telemetry-source-banner.active_stream {
          background-color: #F0FDF4;
          border: 1px solid #BBF7D0;
          color: #166534;
        }

        .telemetry-source-banner.no_sensor,
        .telemetry-source-banner.offline {
          background-color: #F1F5F9;
          border: 1px solid #CBD5E1;
          color: #475569;
        }

        .source-banner-icon {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .source-banner-title {
          display: block;
          font-weight: 700;
          margin-bottom: 2px;
        }

        .source-banner-desc {
          display: block;
          font-size: 11px;
          line-height: 1.4;
          opacity: 0.9;
        }

        /* 4 Metrics Grid */
        .inspector-metrics-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .inspector-metric-box {
          background-color: #F8FAF7;
          border: 1px solid #E2E6E1;
          border-radius: 8px;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .metric-box-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-secondary, #525C56);
        }

        .metric-box-val {
          font-size: 18px;
          font-weight: 800;
          color: var(--text-primary, #202925);
          margin: 2px 0;
        }

        .metric-box-sub {
          font-size: 10.5px;
          color: var(--text-muted, #8E9690);
        }

        /* Actuators Card */
        .inspector-actuators-card {
          background-color: #F8FAF7;
          border: 1px solid #E2E6E1;
          border-radius: 8px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .actuators-card-title {
          font-size: 11.5px;
          font-weight: 700;
          color: var(--text-primary, #202925);
          text-transform: uppercase;
        }

        .actuators-badges-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .relay-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px;
          border-radius: 6px;
          font-size: 12px;
          background-color: #FFFFFF;
          border: 1px solid #D1D5DB;
          color: #64748B;
        }

        .relay-pill.is-active-light {
          background-color: #FEF3C7;
          border-color: #F59E0B;
          color: #B45309;
        }

        .relay-pill.is-active-fan {
          background-color: #D1FAE5;
          border-color: #10B981;
          color: #065F46;
        }

        /* Advisory card */
        .inspector-advisory-card {
          background-color: #FAFCF9;
          border: 1px solid #DCE5D9;
          border-radius: 8px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .advisory-title-row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--text-primary, #202925);
        }

        .advisory-text {
          margin: 0;
          font-size: 12px;
          color: var(--text-secondary, #525C56);
          line-height: 1.4;
        }

        .advisory-rec {
          font-size: 11.5px;
          color: #4F8058;
          font-weight: 600;
        }

        .inspector-actions-row {
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}
