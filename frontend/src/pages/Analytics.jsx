import React, { useState } from 'react';
import PageContainer from '../components/layout/PageContainer';
import TemperatureChart from '../components/charts/TemperatureChart';
import HumidityChart from '../components/charts/HumidityChart';
import { useEnvironment, useRoomHistory } from '../hooks/useEnvironment';
import { formatTemp, formatHumidity } from '../utils/formatters';
import { Filter } from 'lucide-react';

const Analytics = () => {
  const { rooms } = useEnvironment();
  const [selectedRoom, setSelectedRoom] = useState('LAB101');

  // Fetch history for selected room from environment_history API
  const { history, loading: historyLoading } = useRoomHistory(selectedRoom, 200);

  // Current room reading from current_environment API
  const currentRoomDoc = rooms.find(r => r.room === selectedRoom) || rooms[0];

  const temps = history.map(h => h.temperature).filter(t => typeof t === 'number' && !isNaN(t));
  const hums = history.map(h => h.humidity).filter(h => typeof h === 'number' && !isNaN(h));

  const avgTemp = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : currentRoomDoc?.temperature;
  const minTemp = temps.length > 0 ? Math.min(...temps) : currentRoomDoc?.temperature;
  const maxTemp = temps.length > 0 ? Math.max(...temps) : currentRoomDoc?.temperature;

  const avgHum = hums.length > 0 ? hums.reduce((a, b) => a + b, 0) / hums.length : currentRoomDoc?.humidity;
  const minHum = hums.length > 0 ? Math.min(...hums) : currentRoomDoc?.humidity;
  const maxHum = hums.length > 0 ? Math.max(...hums) : currentRoomDoc?.humidity;

  return (
    <PageContainer>
      <div className="card-section" style={{ marginBottom: '20px' }}>
        <div className="card-section-header">
          <div>
            <h2 className="card-section-title">Environmental Telemetry Analytics</h2>
            <span className="card-section-subtitle">Statistical insights and threshold analysis</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} style={{ color: 'var(--text-secondary)' }} />
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Select Zone:</span>
            <select 
              className="filter-select"
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
            >
              {rooms.length > 0 ? (
                rooms.map(r => (
                  <option key={r._id || r.room} value={r.room}>{r.room}</option>
                ))
              ) : (
                <option value="LAB101">LAB101</option>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Temperature Analytics Breakdown */}
      <div className="card-section">
        <div className="card-section-header">
          <h3 className="card-section-title" style={{ fontSize: '18px', color: '#202925' }}>
            Temperature Overview (°C) - {selectedRoom}
          </h3>
        </div>
        <div className="card-section-body">
          <div className="summary-cards-grid" style={{ marginBottom: '24px' }}>
            <div className="summary-card" style={{ padding: '18px' }}>
              <span className="summary-card-title">Current</span>
              <div className="summary-card-value" style={{ fontSize: '24px' }}>{formatTemp(currentRoomDoc?.temperature)}</div>
            </div>
            <div className="summary-card" style={{ padding: '18px' }}>
              <span className="summary-card-title">Average</span>
              <div className="summary-card-value" style={{ fontSize: '24px' }}>{formatTemp(avgTemp)}</div>
            </div>
            <div className="summary-card" style={{ padding: '18px' }}>
              <span className="summary-card-title">Minimum</span>
              <div className="summary-card-value" style={{ fontSize: '24px', color: '#55705B' }}>{formatTemp(minTemp)}</div>
            </div>
            <div className="summary-card" style={{ padding: '18px' }}>
              <span className="summary-card-title">Maximum</span>
              <div className="summary-card-value" style={{ fontSize: '24px', color: '#C65C5C' }}>{formatTemp(maxTemp)}</div>
            </div>
          </div>

          <TemperatureChart data={history} loading={historyLoading} />
        </div>
      </div>

      {/* Humidity Analytics Breakdown */}
      <div className="card-section">
        <div className="card-section-header">
          <h3 className="card-section-title" style={{ fontSize: '18px', color: '#202925' }}>
            Humidity Overview (%) - {selectedRoom}
          </h3>
        </div>
        <div className="card-section-body">
          <div className="summary-cards-grid" style={{ marginBottom: '24px' }}>
            <div className="summary-card" style={{ padding: '18px' }}>
              <span className="summary-card-title">Current</span>
              <div className="summary-card-value" style={{ fontSize: '24px' }}>{formatHumidity(currentRoomDoc?.humidity)}</div>
            </div>
            <div className="summary-card" style={{ padding: '18px' }}>
              <span className="summary-card-title">Average</span>
              <div className="summary-card-value" style={{ fontSize: '24px' }}>{formatHumidity(avgHum)}</div>
            </div>
            <div className="summary-card" style={{ padding: '18px' }}>
              <span className="summary-card-title">Minimum</span>
              <div className="summary-card-value" style={{ fontSize: '24px', color: '#55705B' }}>{formatHumidity(minHum)}</div>
            </div>
            <div className="summary-card" style={{ padding: '18px' }}>
              <span className="summary-card-title">Maximum</span>
              <div className="summary-card-value" style={{ fontSize: '24px', color: '#C77B45' }}>{formatHumidity(maxHum)}</div>
            </div>
          </div>

          <HumidityChart data={history} loading={historyLoading} />
        </div>
      </div>
    </PageContainer>
  );
};

export default Analytics;
