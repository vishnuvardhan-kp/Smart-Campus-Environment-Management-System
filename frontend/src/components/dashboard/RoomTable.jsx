import React from 'react';
import { Link } from 'react-router-dom';
import RoomStatus from './RoomStatus';
import { formatTemp, formatHumidity, formatTimeAgo } from '../../utils/formatters';
import { useEnvironment } from '../../hooks/useEnvironment';
import { ArrowRight, Users } from 'lucide-react';

const RoomTable = ({ rooms = [], loading = false }) => {
  const { now } = useEnvironment();

  if (loading) {
    return (
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Room</th>
              <th>Temperature</th>
              <th>Humidity</th>
              <th>IR Detections</th>
              <th>Light (Relay 1)</th>
              <th>Fan (Relay 2)</th>
              <th>Status</th>
              <th>Last Updated</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2].map((idx) => (
              <tr key={idx}>
                <td><div className="skeleton skeleton-text" style={{ width: '80px' }} /></td>
                <td><div className="skeleton skeleton-text" style={{ width: '50px' }} /></td>
                <td><div className="skeleton skeleton-text" style={{ width: '50px' }} /></td>
                <td><div className="skeleton skeleton-text" style={{ width: '40px' }} /></td>
                <td><div className="skeleton skeleton-text" style={{ width: '45px' }} /></td>
                <td><div className="skeleton skeleton-text" style={{ width: '45px' }} /></td>
                <td><div className="skeleton skeleton-text" style={{ width: '65px' }} /></td>
                <td><div className="skeleton skeleton-text" style={{ width: '85px' }} /></td>
                <td style={{ textAlign: 'right' }}><div className="skeleton skeleton-text" style={{ width: '45px', marginLeft: 'auto' }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!rooms || rooms.length === 0) {
    return (
      <div className="state-container" style={{ margin: '16px' }}>
        <span className="state-title">No environmental data available.</span>
        <span className="state-desc">Ensure sensor devices are connected and publishing to the MQTT broker.</span>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="data-table">
        <thead>
          <tr>
            <th>Room</th>
            <th>Temperature</th>
            <th>Humidity</th>
            <th>IR Detections</th>
            <th>Light (Relay 1)</th>
            <th>Fan (Relay 2)</th>
            <th>Status</th>
            <th>Last Updated</th>
            <th style={{ textAlign: 'right' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map((roomItem) => (
            <tr key={roomItem._id || roomItem.room}>
              <td>
                <div className="room-cell">
                  <strong className="room-cell-name">{roomItem.room}</strong>
                  <span className="room-cell-sub">Block A • Science Wing</span>
                </div>
              </td>
              <td>
                <span className="metric-table-val">{formatTemp(roomItem.temperature)}</span>
              </td>
              <td>
                <span className="metric-table-val">{formatHumidity(roomItem.humidity)}</span>
              </td>
              <td>
                <span className="people-table-badge">
                  <Users size={12} />
                  <span>{roomItem.peopleCount !== undefined ? roomItem.peopleCount : 0}</span>
                </span>
              </td>
              <td>
                <span className={`card-badge ${roomItem.light === 'ON' ? 'card-badge-active-light' : 'card-badge-neutral'}`}>
                  <span className="badge-dot" />
                  <span>{roomItem.light || 'OFF'}</span>
                </span>
              </td>
              <td>
                <span className={`card-badge ${roomItem.fan === 'ON' ? 'card-badge-active-fan' : 'card-badge-neutral'}`}>
                  <span className="badge-dot" />
                  <span>{roomItem.fan || 'OFF'}</span>
                </span>
              </td>
              <td>
                <RoomStatus 
                  temperature={roomItem.temperature} 
                  humidity={roomItem.humidity}
                  lastUpdated={roomItem.lastUpdated}
                />
              </td>
              <td>
                <span className="table-time-text">{formatTimeAgo(roomItem.lastUpdated, now)}</span>
              </td>
              <td style={{ textAlign: 'right' }}>
                <Link 
                  to={`/monitoring/${roomItem.room}`}
                  className="table-action-link"
                >
                  <span>View</span>
                  <ArrowRight size={13} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RoomTable;
