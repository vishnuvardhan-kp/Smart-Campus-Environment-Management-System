import React from 'react';
import PageContainer from '../components/layout/PageContainer';
import SummaryCard from '../components/dashboard/SummaryCard';
import EnvironmentalConditionCard from '../components/dashboard/EnvironmentalConditionCard';
import EnvironmentalTrendCard from '../components/dashboard/EnvironmentalTrendCard';
import RoomTable from '../components/dashboard/RoomTable';
import CampusOverview from '../components/dashboard/CampusOverview';
import { useEnvironment } from '../hooks/useEnvironment';
import { isSensorOnline, getTemperatureStatus, getHumidityStatus } from '../utils/thresholds';
import { formatTemp, formatHumidity } from '../utils/formatters';
import { 
  Building2, 
  Thermometer, 
  Droplets, 
  Radio, 
  Users, 
  Lightbulb, 
  Fan, 
  Activity, 
  AlertTriangle, 
  RotateCw 
} from 'lucide-react';

const Dashboard = () => {
  const { rooms, loading, error, apiConnected, now, refetch } = useEnvironment();

  // Primary physical ESP32 room (defaults to LAB101)
  const espRoom = rooms.find(r => r.room?.toUpperCase() === 'LAB101') || rooms[0] || null;

  // Aggregate stats across rooms
  const totalRooms = rooms.length;
  const onlineRoomsCount = rooms.filter(r => isSensorOnline(r.lastUpdated, now)).length;

  const validTemps = rooms.map(r => r.temperature).filter(t => typeof t === 'number' && !isNaN(t));
  const avgTemp = validTemps.length > 0 
    ? validTemps.reduce((a, b) => a + b, 0) / validTemps.length 
    : null;

  const validHums = rooms.map(r => r.humidity).filter(h => typeof h === 'number' && !isNaN(h));
  const avgHum = validHums.length > 0 
    ? validHums.reduce((a, b) => a + b, 0) / validHums.length 
    : null;

  // Live telemetry for LAB101
  const displayTemp = espRoom?.temperature !== null && espRoom?.temperature !== undefined 
    ? formatTemp(espRoom.temperature) 
    : formatTemp(avgTemp);

  const displayHum = espRoom?.humidity !== null && espRoom?.humidity !== undefined 
    ? formatHumidity(espRoom.humidity) 
    : formatHumidity(avgHum);

  const peopleCount = espRoom?.peopleCount !== undefined ? espRoom.peopleCount : 0;
  const lightStatus = espRoom?.light || 'OFF';
  const fanStatus = espRoom?.fan || 'OFF';

  const isEspOnline = isSensorOnline(espRoom?.lastUpdated, now);
  const rawStatus = espRoom?.systemStatus || '';
  const compactSystemStatus = isEspOnline || /connected/i.test(rawStatus) ? 'CONNECTED' : 'OFFLINE';

  // Environmental status badges
  const tempStatusKey = getTemperatureStatus(espRoom?.temperature);
  const humStatusKey = getHumidityStatus(espRoom?.humidity);

  const tempStatusType = tempStatusKey === 'normal' ? 'positive' : tempStatusKey === 'warning' ? 'warning' : 'critical';
  const humStatusType = humStatusKey === 'normal' ? 'positive' : humStatusKey === 'warning' ? 'warning' : 'critical';

  const tempBadgeText = tempStatusKey === 'normal' ? 'Normal' : tempStatusKey === 'warning' ? 'Elevated' : 'High Temp';
  const humBadgeText = humStatusKey === 'normal' ? 'Normal' : humStatusKey === 'warning' ? 'Suboptimal' : 'Warning';

  return (
    <PageContainer>
      {/* Group 1: Live Zone Telemetry (LAB101) */}
      <div className="dashboard-section-header">
        <div className="section-title-wrapper">
          <span className="section-category-badge">LIVE ZONE</span>
          <h2 className="section-heading">LAB101 Environment & Telemetry</h2>
        </div>
        <span className="section-meta-text">Physical Telemetry via DHT11 & IR Sensors</span>
      </div>

      <div className="summary-cards-grid">
        <SummaryCard 
          category="ENVIRONMENT"
          title="Temperature"
          value={loading ? '...' : displayTemp}
          subtitle="DHT11 Sensor • LAB101"
          icon={Thermometer}
          badgeText={loading ? null : tempBadgeText}
          status={tempStatusType}
        />
        <SummaryCard 
          category="ENVIRONMENT"
          title="Humidity"
          value={loading ? '...' : displayHum}
          subtitle="Relative Humidity Level"
          icon={Droplets}
          badgeText={loading ? null : humBadgeText}
          status={humStatusType}
        />
        <SummaryCard 
          category="SENSORS"
          title="IR Detections"
          value={loading ? '...' : peopleCount}
          subtitle="Motion Count • IR Sensor"
          icon={Users}
          badgeText={peopleCount > 0 ? 'Active' : 'Idle'}
          status={peopleCount > 0 ? 'positive' : 'neutral'}
        />
        <SummaryCard 
          category="SYSTEM"
          title="System Status"
          value={loading ? '...' : compactSystemStatus}
          subtitle="ESP32 Telemetry • HiveMQ"
          icon={Radio}
          badgeText={compactSystemStatus === 'CONNECTED' ? 'Online' : 'Offline'}
          status={compactSystemStatus === 'CONNECTED' ? 'positive' : 'neutral'}
        />
      </div>

      {/* Real-Time Rule-Based Environmental Condition Assessment */}
      <EnvironmentalConditionCard 
        assessment={espRoom?.assessment}
        temperature={espRoom?.temperature}
        humidity={espRoom?.humidity}
        fan={espRoom?.fan}
        room={espRoom?.room || 'LAB101'}
      />

      {/* Real-Time Environmental Trend Detection */}
      <EnvironmentalTrendCard 
        trend={espRoom?.trend}
        temperature={espRoom?.temperature}
        humidity={espRoom?.humidity}
        room={espRoom?.room || 'LAB101'}
      />

      {/* Group 2: Actuators & Campus Network */}
      <div className="dashboard-section-header">
        <div className="section-title-wrapper">
          <span className="section-category-badge">CONTROLS & NETWORK</span>
          <h2 className="section-heading">Actuators & Infrastructure Status</h2>
        </div>
        <span className="section-meta-text">Relay Automation & Device Health</span>
      </div>

      <div className="summary-cards-grid">
        <SummaryCard 
          category="ACTUATOR"
          title="Light (Relay 1)"
          value={loading ? '...' : lightStatus}
          subtitle={lightStatus === 'ON' ? 'Relay 1 Active (Occupied)' : 'Relay 1 Inactive (Power Saving)'}
          icon={Lightbulb}
          badgeText={lightStatus === 'ON' ? 'Active' : 'Inactive'}
          status={lightStatus === 'ON' ? 'active-light' : 'neutral'}
        />
        <SummaryCard 
          category="ACTUATOR"
          title="Fan (Relay 2)"
          value={loading ? '...' : fanStatus}
          subtitle={fanStatus === 'ON' ? 'Relay 2 Active (Temp ≥ 28°C)' : 'Relay 2 Inactive (Below 28°C)'}
          icon={Fan}
          badgeText={fanStatus === 'ON' ? 'Cooling' : 'Inactive'}
          status={fanStatus === 'ON' ? 'active-fan' : 'neutral'}
        />
        <SummaryCard 
          category="FACILITY"
          title="Monitored Rooms"
          value={loading ? '...' : totalRooms}
          subtitle={totalRooms === 1 ? '1 active zone registered' : `${totalRooms} active zones registered`}
          icon={Building2}
          badgeText="Active"
          status="positive"
        />
        <SummaryCard 
          category="SYSTEM"
          title="Online Devices"
          value={loading ? '...' : `${onlineRoomsCount} / ${totalRooms}`}
          subtitle={onlineRoomsCount === totalRooms && totalRooms > 0 ? 'All nodes reporting' : `${totalRooms - onlineRoomsCount} node(s) offline`}
          icon={Activity}
          badgeText={onlineRoomsCount === totalRooms && totalRooms > 0 ? 'Healthy' : 'Degraded'}
          status={onlineRoomsCount === totalRooms && totalRooms > 0 ? 'positive' : 'warning'}
        />
      </div>

      {/* Global API Error / Retry Banner */}
      {!apiConnected && (
        <div className="state-container" style={{ borderColor: 'var(--status-critical-border)', backgroundColor: 'var(--status-critical-bg)' }}>
          <AlertTriangle size={28} style={{ color: 'var(--status-critical-dot)' }} />
          <span className="state-title" style={{ color: 'var(--status-critical-text)' }}>
            Unable to fetch live environment data. Retrying...
          </span>
          <span className="state-desc">
            Please check that the backend server is running on port 5000. Last valid sensor readings are preserved below.
          </span>
          <button className="btn-primary" onClick={refetch} style={{ marginTop: '12px' }}>
            <RotateCw size={13} />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* Campus Overview Section */}
      <div className="card-section">
        <div className="card-section-header">
          <div>
            <h2 className="card-section-title">Campus Environment Overview</h2>
            <span className="card-section-subtitle">Real-time status by building block</span>
          </div>
        </div>
        <div className="card-section-body">
          <CampusOverview rooms={rooms} />
        </div>
      </div>

      {/* Room Monitoring Table */}
      <div className="card-section">
        <div className="card-section-header">
          <div>
            <h2 className="card-section-title">Room Telemetry Monitoring</h2>
            <span className="card-section-subtitle">Live environmental sensors & actuator status list</span>
          </div>
        </div>
        <div className="card-section-body" style={{ padding: 0 }}>
          <RoomTable rooms={rooms} loading={loading} />
        </div>
      </div>
    </PageContainer>
  );
};

export default Dashboard;
