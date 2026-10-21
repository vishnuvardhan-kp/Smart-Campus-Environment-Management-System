import React from 'react';
import { Link } from 'react-router-dom';
import RoomStatus from './RoomStatus';
import { formatTemp, formatHumidity, formatTimeAgo } from '../../utils/formatters';
import { useEnvironment } from '../../hooks/useEnvironment';
import { Building2, MapPin, ArrowRight } from 'lucide-react';

const CampusOverview = ({ rooms = [] }) => {
  const { now } = useEnvironment();

  return (
    <div className="campus-overview-container">
      <div className="campus-overview-header-row">
        <div className="campus-block-badge">
          <Building2 size={16} />
          <span>Block A — Science & Engineering Facility</span>
        </div>
        <span className="campus-count-tag">
          {rooms.length} {rooms.length === 1 ? 'Zone Monitored' : 'Zones Monitored'}
        </span>
      </div>

      <div className="room-grid">
        {rooms.length > 0 ? (
          rooms.map((r) => (
            <Link 
              key={r._id || r.room} 
              to={`/monitoring/${r.room}`}
              className="room-overview-card-link"
            >
              <div className="room-overview-card">
                <div className="room-overview-header">
                  <div className="room-name-wrapper">
                    <MapPin size={15} style={{ color: 'var(--sage-icon)' }} />
                    <span className="room-name-badge">{r.room}</span>
                  </div>
                  <RoomStatus 
                    temperature={r.temperature} 
                    humidity={r.humidity} 
                    lastUpdated={r.lastUpdated}
                  />
                </div>

                <div className="room-overview-metrics-grid">
                  <div className="room-metric-item">
                    <span className="metric-label">Temp</span>
                    <span className="metric-value">{formatTemp(r.temperature)}</span>
                  </div>
                  <div className="room-metric-item">
                    <span className="metric-label">Humidity</span>
                    <span className="metric-value">{formatHumidity(r.humidity)}</span>
                  </div>
                  <div className="room-metric-item">
                    <span className="metric-label">IR Count</span>
                    <span className="metric-value">{r.peopleCount !== undefined ? r.peopleCount : 0}</span>
                  </div>
                  <div className="room-metric-item">
                    <span className="metric-label">Relays</span>
                    <span className="metric-value-tags">
                      <span className={`mini-relay-tag ${r.light === 'ON' ? 'active-light' : ''}`}>
                        L:{r.light || 'OFF'}
                      </span>
                      <span className={`mini-relay-tag ${r.fan === 'ON' ? 'active-fan' : ''}`}>
                        F:{r.fan || 'OFF'}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="room-overview-footer">
                  <span className="room-sync-time">Updated: {formatTimeAgo(r.lastUpdated, now)}</span>
                  <span className="room-action-hint">
                    <span>Details</span>
                    <ArrowRight size={13} />
                  </span>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="state-container" style={{ margin: 0 }}>
            <span className="state-title">No rooms active in Block A currently.</span>
            <span className="state-desc">Telemetry will appear automatically when sensor packets are received.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampusOverview;
