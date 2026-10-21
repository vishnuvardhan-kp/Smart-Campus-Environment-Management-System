import React from 'react';
import PageContainer from '../components/layout/PageContainer';
import { useEnvironment } from '../hooks/useEnvironment';
import { formatTemp, formatHumidity, formatTimeAgo } from '../utils/formatters';
import { THRESHOLDS } from '../utils/thresholds';
import { Bell, CheckCircle2 } from 'lucide-react';

const Alerts = () => {
  const { rooms, loading, now } = useEnvironment();

  // Compute active alerts dynamically from current_environment room data
  const alertsList = [];

  rooms.forEach(room => {
    // Temp checks
    if (typeof room.temperature === 'number') {
      if (room.temperature > THRESHOLDS.TEMPERATURE.WARNING_MAX) {
        const isCritical = room.temperature > THRESHOLDS.TEMPERATURE.WARNING_MAX;
        alertsList.push({
          id: `${room.room}-temp`,
          severity: isCritical ? 'CRITICAL' : 'WARNING',
          room: room.room,
          parameter: 'Temperature',
          value: formatTemp(room.temperature),
          message: isCritical 
            ? `Critical temperature threshold exceeded (${THRESHOLDS.TEMPERATURE.WARNING_MAX}°C)`
            : `Temperature above recommended comfortable level`,
          lastUpdated: room.lastUpdated,
        });
      }
    }

    // Humidity checks
    if (typeof room.humidity === 'number') {
      if (room.humidity > THRESHOLDS.HUMIDITY.NORMAL_MAX || room.humidity < THRESHOLDS.HUMIDITY.NORMAL_MIN) {
        const isCritical = room.humidity > THRESHOLDS.HUMIDITY.WARNING_MAX;
        alertsList.push({
          id: `${room.room}-hum`,
          severity: isCritical ? 'CRITICAL' : 'WARNING',
          room: room.room,
          parameter: 'Humidity',
          value: formatHumidity(room.humidity),
          message: room.humidity > THRESHOLDS.HUMIDITY.NORMAL_MAX
            ? `High relative humidity detected (Threshold: ${THRESHOLDS.HUMIDITY.NORMAL_MAX}%)`
            : `Low relative humidity detected (Threshold: ${THRESHOLDS.HUMIDITY.NORMAL_MIN}%)`,
          lastUpdated: room.lastUpdated,
        });
      }
    }
  });

  return (
    <PageContainer>
      <div className="card-section">
        <div className="card-section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bell size={20} style={{ color: 'var(--primary)' }} />
            <div>
              <h2 className="card-section-title">Environmental Threshold Alerts</h2>
              <span className="card-section-subtitle">Real-time alert notifications computed from live telemetry</span>
            </div>
          </div>
        </div>

        <div className="card-section-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="state-container">
              <span className="state-title">Loading live alert status...</span>
            </div>
          ) : alertsList.length === 0 ? (
            <div className="state-container" style={{ padding: '48px 24px' }}>
              <CheckCircle2 size={40} style={{ color: '#4F8058', marginBottom: '12px' }} />
              <span className="state-title" style={{ fontSize: '16px', color: '#202925' }}>All Environmental Parameters Normal</span>
              <span className="state-desc">
                No active threshold violations detected across monitored campus zones.
              </span>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table alerts-table">
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>Room</th>
                    <th>Parameter</th>
                    <th>Value</th>
                    <th>Description</th>
                    <th>Detected</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {alertsList.map(alert => (
                    <tr key={alert.id}>
                      <td>
                        <span className={`alert-severity-pill ${alert.severity === 'CRITICAL' ? 'severity-critical' : 'severity-warning'}`}>
                          {alert.severity}
                        </span>
                      </td>
                      <td>
                        <strong>{alert.room}</strong>
                      </td>
                      <td>{alert.parameter}</td>
                      <td style={{ fontWeight: 600 }}>{alert.value}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{alert.message}</td>
                      <td>{formatTimeAgo(alert.lastUpdated, now)}</td>
                      <td>
                        <span className="status-badge status-warning">
                          <span className="dot" />
                          <span>Active</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
};

export default Alerts;
