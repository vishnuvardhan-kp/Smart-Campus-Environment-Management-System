import React from 'react';
import { Link } from 'react-router-dom';
import RoomStatus from '../dashboard/RoomStatus';
import { formatTemp, formatHumidity, formatTimeAgo, formatDateTime, getRoomDisplayName } from '../../utils/formatters';
import { isSensorOnline, getHardwareStatusMeta, getFaultSeverityMeta, getFaultTypeLabel } from '../../utils/thresholds';
import { 
  Thermometer, 
  Droplets, 
  Users, 
  Lightbulb, 
  Fan, 
  Radio, 
  Clock, 
  ArrowRight, 
  ShieldCheck, 
  AlertTriangle, 
  TrendingUp, 
  Activity, 
  MapPin, 
  Sparkles 
} from 'lucide-react';
import '../../styles/campusMap.css';

const RoomInspector = ({ roomData, roomInfo, now = Date.now(), onClose }) => {
  if (!roomInfo) return null;

  const isOnline = roomData ? isSensorOnline(roomData.lastUpdated, now) : false;
  const temp = roomData ? roomData.temperature : null;
  const hum = roomData ? roomData.humidity : null;
  const people = roomData && roomData.peopleCount !== undefined ? roomData.peopleCount : 0;
  const light = roomData && roomData.light !== undefined ? roomData.light : null;
  const fan = roomData && roomData.fan !== undefined ? roomData.fan : null;

  const rawHwStatus = roomData?.sensorHealth?.status || (isOnline ? 'HEALTHY' : 'OFFLINE');
  const hwMeta = getHardwareStatusMeta(rawHwStatus);
  const activeFaults = roomData?.sensorHealth?.activeFaults || [];

  return (
    <div className="room-inspector-modal">
      {/* Header */}
      <div className="room-inspector-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="summary-card-icon" style={{ backgroundColor: '#E8EEE5', color: '#4F8058' }}>
            <MapPin size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {roomInfo.name || getRoomDisplayName(roomInfo.id)}
              </h2>
              <span style={{ fontSize: '11.5px', background: 'var(--border-light)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                {roomInfo.wing} • {roomInfo.type}
              </span>
              <RoomStatus 
                temperature={temp} 
                humidity={hum} 
                lastUpdated={roomData?.lastUpdated} 
              />
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', display: 'block' }}>
              {roomInfo.subtitle}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link 
            to={`/monitoring/${roomInfo.id}`} 
            className="btn-primary"
            style={{ fontSize: '12px', padding: '7px 14px', textDecoration: 'none' }}
          >
            <span>Telemetry & Charts</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* 4 Core Metrics Grid */}
      <div className="room-inspector-grid">
        {/* Temperature */}
        <div className="room-inspector-card-box">
          <div className="room-inspector-label">
            <Thermometer size={14} style={{ color: 'var(--accent-terracotta)' }} />
            <span>Temperature</span>
          </div>
          <div className="room-inspector-val">
            {formatTemp(temp)}
          </div>
          <div className="room-inspector-sub">
            {isOnline ? 'DHT11 Physical Telemetry' : 'Device Offline'}
          </div>
        </div>

        {/* Humidity */}
        <div className="room-inspector-card-box">
          <div className="room-inspector-label">
            <Droplets size={14} style={{ color: '#2B6CB0' }} />
            <span>Relative Humidity</span>
          </div>
          <div className="room-inspector-val">
            {formatHumidity(hum)}
          </div>
          <div className="room-inspector-sub">
            Target Range: 40% – 60% RH
          </div>
        </div>

        {/* IR Occupancy */}
        <div className="room-inspector-card-box">
          <div className="room-inspector-label">
            <Users size={14} style={{ color: '#55705B' }} />
            <span>IR Occupancy</span>
          </div>
          <div className="room-inspector-val">
            {people} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>pax</span>
          </div>
          <div className="room-inspector-sub">
            {people > 0 ? 'Zone Occupied (Relay 1 ON)' : 'Zone Idle (Power Saving)'}
          </div>
        </div>

        {/* Hardware Health & Connectivity */}
        <div className="room-inspector-card-box">
          <div className="room-inspector-label">
            <ShieldCheck size={14} style={{ color: '#4F8058' }} />
            <span>Hardware Diagnostics</span>
          </div>
          <div className="room-inspector-val" style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className={`status-badge ${hwMeta.class}`} style={{ fontSize: '11px', padding: '2px 8px' }}>
              <span className="dot" />
              <span>{hwMeta.label}</span>
            </span>
          </div>
          <div className="room-inspector-sub">
            {roomData?.lastUpdated ? `Last packet: ${formatTimeAgo(roomData.lastUpdated, now)}` : 'No packets'}
          </div>
        </div>
      </div>

      {/* Actuator Relay Status Banner */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', padding: '12px 16px', backgroundColor: 'var(--bg-section)', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Lightbulb size={16} style={{ color: light === 'ON' ? '#D97706' : '#6B746E' }} />
          <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>Light (Relay 1):</span>
          <span className={`mini-relay-tag ${light === 'ON' ? 'active-light' : ''}`}>
            {light || 'OFF'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px' }}>
          <Fan size={16} style={{ color: fan === 'ON' ? '#059669' : '#6B746E' }} />
          <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>Fan (Relay 2):</span>
          <span className={`mini-relay-tag ${fan === 'ON' ? 'active-fan' : ''}`}>
            {fan || 'OFF'}
          </span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
          <Clock size={13} />
          <span>Sync: {formatDateTime(roomData?.lastUpdated)}</span>
        </div>
      </div>

      {/* Real-time Trend & Assessment Insights */}
      {roomData?.assessment && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
            <Sparkles size={14} style={{ color: 'var(--sage)' }} />
            <strong style={{ color: 'var(--text-primary)' }}>Deterministic Assessment:</strong>
            <span style={{ color: 'var(--text-secondary)' }}>{roomData.assessment.reason}</span>
          </div>

          {roomData.trend?.summary && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
              <TrendingUp size={14} style={{ color: 'var(--accent-terracotta)' }} />
              <strong style={{ color: 'var(--text-primary)' }}>20-Min Trend:</strong>
              <span style={{ color: 'var(--text-secondary)' }}>{roomData.trend.summary}</span>
            </div>
          )}
        </div>
      )}

      {/* Active Faults & Anomalies */}
      {activeFaults.length > 0 && (
        <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-light)', paddingTop: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9B1C1C', marginBottom: '8px', fontSize: '12px', fontWeight: 700 }}>
            <AlertTriangle size={14} />
            <span>Active Diagnostics ({activeFaults.length}):</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {activeFaults.map(f => {
              const sMeta = getFaultSeverityMeta(f.severity);
              return (
                <div 
                  key={f.id || f.faultType}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    padding: '8px 12px', 
                    borderRadius: '6px', 
                    backgroundColor: sMeta.bg, 
                    border: `1px solid ${sMeta.border}`,
                    fontSize: '12px'
                  }}
                >
                  <span style={{ fontWeight: 700, color: sMeta.color, fontSize: '10.5px' }}>
                    {f.severity}
                  </span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {getFaultTypeLabel(f.faultType)}:
                  </strong>
                  <span style={{ color: 'var(--text-secondary)', flex: 1 }}>
                    {f.message}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomInspector;
