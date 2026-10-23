import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageContainer from '../components/layout/PageContainer';
import RoomStatus from '../components/dashboard/RoomStatus';
import SummaryCard from '../components/dashboard/SummaryCard';
import EnvironmentalConditionCard from '../components/dashboard/EnvironmentalConditionCard';
import EnvironmentalTrendCard from '../components/dashboard/EnvironmentalTrendCard';
import TemperatureChart from '../components/charts/TemperatureChart';
import HumidityChart from '../components/charts/HumidityChart';
import { useRoomCurrent, useRoomHistory } from '../hooks/useEnvironment';
import { formatTemp, formatHumidity, formatTimeAgo, formatDateTime, getRoomDisplayName } from '../utils/formatters';
import { 
  getTemperatureStatus, 
  getHumidityStatus, 
  isSensorOnline,
  getHardwareStatusMeta,
  getFaultSeverityMeta,
  getFaultTypeLabel 
} from '../utils/thresholds';
import { 
  ArrowLeft, 
  Thermometer, 
  Droplets, 
  Clock, 
  RefreshCw, 
  Users, 
  Lightbulb, 
  Fan, 
  Radio,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  Activity
} from 'lucide-react';

const RoomDetails = () => {
  const { room } = useParams();
  const roomName = room || 'LAB101';

  const [timeRange, setTimeRange] = useState('1H');

  // Live telemetry for current metrics card from current_environment
  const { roomData, loading: currentLoading, now, refetch: refetchCurrent } = useRoomCurrent(roomName);

  // Historical telemetry for Recharts charts from environment_history
  const { history, loading: historyLoading, refetch: refetchHistory } = useRoomHistory(roomName, 200);

  // Filter history based on timeRange selector
  const filteredHistory = useMemo(() => {
    if (!history || history.length === 0) return [];
    
    const currentTime = Date.now();
    let cutoffMs = 60 * 60 * 1000; // 1 hour default

    if (timeRange === '6H') cutoffMs = 6 * 60 * 60 * 1000;
    else if (timeRange === '24H') cutoffMs = 24 * 60 * 60 * 1000;
    else if (timeRange === '7D') cutoffMs = 7 * 24 * 60 * 60 * 1000;

    return history.filter(item => {
      const itemTime = new Date(item.timestamp).getTime();
      return (currentTime - itemTime) <= cutoffMs;
    });
  }, [history, timeRange]);

  const isOnline = isSensorOnline(roomData?.lastUpdated, now);
  const tempStatusKey = getTemperatureStatus(roomData?.temperature);
  const humStatusKey = getHumidityStatus(roomData?.humidity);

  const tempStatusType = tempStatusKey === 'normal' ? 'positive' : tempStatusKey === 'warning' ? 'warning' : 'critical';
  const humStatusType = humStatusKey === 'normal' ? 'positive' : humStatusKey === 'warning' ? 'warning' : 'critical';

  const tempBadgeText = tempStatusKey === 'normal' ? 'Optimal' : tempStatusKey === 'warning' ? 'Elevated' : 'High Temp';
  const humBadgeText = humStatusKey === 'normal' ? 'Comfortable' : humStatusKey === 'warning' ? 'Suboptimal' : 'Warning';

  const peopleCount = roomData?.peopleCount !== undefined ? roomData.peopleCount : 0;
  const lightStatus = roomData?.light || 'OFF';
  const fanStatus = roomData?.fan || 'OFF';

  const rawStatus = roomData?.systemStatus || '';
  const compactSystemStatus = isOnline || /connected/i.test(rawStatus) ? 'CONNECTED' : 'OFFLINE';

  return (
    <PageContainer>
      {/* Back Link */}
      <div style={{ marginBottom: '14px' }}>
        <Link to="/monitoring" className="table-action-link" style={{ fontSize: '13px' }}>
          <ArrowLeft size={15} />
          <span>Back to Live Monitoring</span>
        </Link>
      </div>

      {/* Room Title & Header Card */}
      <div className="card-section" style={{ marginBottom: '18px' }}>
        <div className="card-section-header" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
                  {getRoomDisplayName(roomName)}
                </h1>
                <span style={{ fontSize: '11px', background: 'var(--border-light)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  IT Park • Software Complex
                </span>
                <RoomStatus 
                  temperature={roomData?.temperature} 
                  humidity={roomData?.humidity} 
                  lastUpdated={roomData?.lastUpdated}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                <Clock size={13} />
                <span>
                  Last updated: {formatTimeAgo(roomData?.lastUpdated, now)} ({formatDateTime(roomData?.lastUpdated)})
                </span>
              </div>
            </div>
          </div>

          <button className="btn-secondary" onClick={() => { refetchCurrent(); refetchHistory(); }}>
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Real-Time Rule-Based Environmental Condition Assessment */}
      <EnvironmentalConditionCard 
        assessment={roomData?.assessment}
        temperature={roomData?.temperature}
        humidity={roomData?.humidity}
        fan={roomData?.fan}
        room={getRoomDisplayName(roomName)}
      />

      {/* Real-Time Environmental Trend Detection */}
      <EnvironmentalTrendCard 
        trend={roomData?.trend}
        temperature={roomData?.temperature}
        humidity={roomData?.humidity}
        room={getRoomDisplayName(roomName)}
      />

      {/* Sensor Hardware Health & Anomaly Diagnostics */}
      {roomData?.sensorHealth && (
        <div className="card-section" style={{ marginBottom: '22px' }}>
          <div className="card-section-header" style={{ backgroundColor: 'var(--bg-main)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={18} style={{ color: 'var(--primary)' }} />
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Sensor Diagnostics & Hardware Health
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Node telemetry integrity, connection timeout, and anomaly detection
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={`status-badge ${getHardwareStatusMeta(roomData.sensorHealth.status).class}`}>
                <span className="dot" />
                <span>{getHardwareStatusMeta(roomData.sensorHealth.status).label}</span>
              </span>
            </div>
          </div>

          <div className="card-section-body">
            {/* Active Faults List if any */}
            {roomData.sensorHealth.activeFaults && roomData.sensorHealth.activeFaults.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {roomData.sensorHealth.activeFaults.map((fault) => {
                  const sevMeta = getFaultSeverityMeta(fault.severity);
                  const isPrediction = fault.faultType === 'THRESHOLD_PREDICTION';

                  return (
                    <div 
                      key={fault.id || fault.faultType}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        gap: '12px', 
                        padding: '12px 14px', 
                        borderRadius: '8px', 
                        backgroundColor: isPrediction ? '#FEF9C3' : sevMeta.bg,
                        border: `1px solid ${isPrediction ? '#FDE047' : sevMeta.border}` 
                      }}
                    >
                      {isPrediction ? (
                        <TrendingUp size={20} style={{ color: '#854D0E', marginTop: '2px', flexShrink: 0 }} />
                      ) : (
                        <AlertTriangle size={20} style={{ color: sevMeta.color, marginTop: '2px', flexShrink: 0 }} />
                      )}

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ 
                            fontSize: '11px', 
                            fontWeight: 700, 
                            padding: '2px 6px', 
                            borderRadius: '4px', 
                            backgroundColor: sevMeta.bg, 
                            color: sevMeta.color, 
                            border: `1px solid ${sevMeta.border}` 
                          }}>
                            {fault.severity}
                          </span>
                          <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                            {getFaultTypeLabel(fault.faultType)}
                          </strong>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            • Detected {formatTimeAgo(fault.firstSeen || fault.lastSeen, now)}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                          {fault.message}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#4F8058', fontSize: '13px' }}>
                <ShieldCheck size={18} />
                <span>
                  <strong>All Sensor Systems Healthy:</strong> Telemetry packet timing normal, no signal freezing, and values within plausible physical bounds.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unified 6-Metric Telemetry Cards Grid */}
      <div className="summary-cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', marginBottom: '22px' }}>
        <SummaryCard 
          category="ENVIRONMENT"
          title="Current Temperature"
          value={currentLoading ? '...' : formatTemp(roomData?.temperature)}
          subtitle="DHT11 Sensor • Realtime"
          icon={Thermometer}
          badgeText={currentLoading ? null : tempBadgeText}
          status={tempStatusType}
        />
        <SummaryCard 
          category="ENVIRONMENT"
          title="Relative Humidity"
          value={currentLoading ? '...' : formatHumidity(roomData?.humidity)}
          subtitle="Ambient Humidity Level"
          icon={Droplets}
          badgeText={currentLoading ? null : humBadgeText}
          status={humStatusType}
        />
        <SummaryCard 
          category="SENSORS"
          title="IR Detections"
          value={currentLoading ? '...' : peopleCount}
          subtitle="Motion Count • IR Sensor"
          icon={Users}
          badgeText={peopleCount > 0 ? 'Active' : 'Idle'}
          status={peopleCount > 0 ? 'positive' : 'neutral'}
        />
        <SummaryCard 
          category="SYSTEM"
          title="Hardware Status"
          value={currentLoading ? '...' : compactSystemStatus}
          subtitle="ESP32 Telemetry • HiveMQ"
          icon={Radio}
          badgeText={compactSystemStatus === 'CONNECTED' ? 'Online' : 'Offline'}
          status={compactSystemStatus === 'CONNECTED' ? 'positive' : 'neutral'}
        />
        <SummaryCard 
          category="ACTUATOR"
          title="Light (Relay 1)"
          value={currentLoading ? '...' : lightStatus}
          subtitle={lightStatus === 'ON' ? 'Relay 1 Active (Occupied)' : 'Relay 1 Inactive (Power Saving)'}
          icon={Lightbulb}
          badgeText={lightStatus === 'ON' ? 'Active' : 'Inactive'}
          status={lightStatus === 'ON' ? 'active-light' : 'neutral'}
        />
        <SummaryCard 
          category="ACTUATOR"
          title="Fan (Relay 2)"
          value={currentLoading ? '...' : fanStatus}
          subtitle={fanStatus === 'ON' ? 'Relay 2 Active (Temp ≥ 28°C)' : 'Relay 2 Inactive (Below 28°C)'}
          icon={Fan}
          badgeText={fanStatus === 'ON' ? 'Cooling' : 'Inactive'}
          status={fanStatus === 'ON' ? 'active-fan' : 'neutral'}
        />
      </div>

      {/* Charts Section Header & Controls */}
      <div className="chart-card">
        <div className="chart-header">
          <div>
            <h2 className="chart-title">Temperature History (°C)</h2>
            <span className="card-section-subtitle">Real telemetry recorded from environment_history</span>
          </div>

          {/* Time Range Selector */}
          <div className="chart-controls">
            {['1H', '6H', '24H', '7D'].map((range) => (
              <button 
                key={range}
                className={`time-range-btn ${timeRange === range ? 'active' : ''}`}
                onClick={() => setTimeRange(range)}
              >
                {range === '1H' ? '1 Hour' : range === '6H' ? '6 Hours' : range === '24H' ? '24 Hours' : '7 Days'}
              </button>
            ))}
          </div>
        </div>

        <TemperatureChart data={filteredHistory} loading={historyLoading} />
      </div>

      <div className="chart-card">
        <div className="chart-header">
          <div>
            <h2 className="chart-title">Humidity History (%)</h2>
            <span className="card-section-subtitle">Real telemetry recorded from environment_history</span>
          </div>

          <div className="chart-controls">
            {['1H', '6H', '24H', '7D'].map((range) => (
              <button 
                key={range}
                className={`time-range-btn ${timeRange === range ? 'active' : ''}`}
                onClick={() => setTimeRange(range)}
              >
                {range === '1H' ? '1 Hour' : range === '6H' ? '6 Hours' : range === '24H' ? '24 Hours' : '7 Days'}
              </button>
            ))}
          </div>
        </div>

        <HumidityChart data={filteredHistory} loading={historyLoading} />
      </div>
    </PageContainer>
  );
};

export default RoomDetails;
