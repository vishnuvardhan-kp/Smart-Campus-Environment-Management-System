import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import PageContainer from '../components/layout/PageContainer';
import { useEnvironment } from '../hooks/useEnvironment';
import { useSensorHealth } from '../hooks/useSensorHealth';
import { faultApi } from '../services/api';
import { formatTemp, formatHumidity, formatTimeAgo, formatDateTime, getRoomDisplayName } from '../utils/formatters';
import { THRESHOLDS, getFaultSeverityMeta, getFaultTypeLabel } from '../utils/thresholds';
import { 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  Activity, 
  WifiOff, 
  TrendingUp, 
  Clock, 
  Radio, 
  RotateCw, 
  Filter, 
  ShieldAlert, 
  History 
} from 'lucide-react';

const Alerts = () => {
  const { rooms, loading: envLoading, now, refetch: refetchEnv } = useEnvironment();
  const { healthData, activeFaults, loading: healthLoading, error: healthError, refetch: refetchHealth } = useSensorHealth();

  const [activeTab, setActiveTab] = useState('ACTIVE_ALL'); // 'ACTIVE_ALL', 'HARDWARE', 'ENVIRONMENTAL', 'HISTORY'
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');

  // Fetch resolved fault history when user switches to the history tab
  const fetchFaultHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const res = await faultApi.getFaultHistory({ limit: 100 });
      if (res && res.success) {
        setHistoryList(res.data || []);
      }
    } catch (err) {
      console.warn('[Alerts] Error fetching fault history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'HISTORY') {
      fetchFaultHistory();
    }
  }, [activeTab, fetchFaultHistory]);

  // 1. Compute dynamic environmental threshold breaches
  const environmentalAlerts = [];
  rooms.forEach(room => {
    if (typeof room.temperature === 'number') {
      if (room.temperature > THRESHOLDS.TEMPERATURE.WARNING_MAX) {
        const isCritical = room.temperature > THRESHOLDS.TEMPERATURE.WARNING_MAX;
        environmentalAlerts.push({
          id: `env-${room.room}-temp`,
          category: 'ENVIRONMENTAL',
          severity: isCritical ? 'CRITICAL' : 'HIGH',
          room: room.room,
          faultType: 'HIGH_TEMPERATURE',
          label: 'High Temperature Threshold',
          value: formatTemp(room.temperature),
          message: isCritical 
            ? `Critical temperature exceeded (${THRESHOLDS.TEMPERATURE.WARNING_MAX}°C threshold)` 
            : `Temperature is above recommended comfortable ceiling`,
          firstSeen: room.lastUpdated,
          lastSeen: room.lastUpdated,
          status: 'ACTIVE'
        });
      }
    }

    if (typeof room.humidity === 'number') {
      if (room.humidity > THRESHOLDS.HUMIDITY.NORMAL_MAX || room.humidity < THRESHOLDS.HUMIDITY.NORMAL_MIN) {
        const isCritical = room.humidity > THRESHOLDS.HUMIDITY.WARNING_MAX;
        environmentalAlerts.push({
          id: `env-${room.room}-hum`,
          category: 'ENVIRONMENTAL',
          severity: isCritical ? 'CRITICAL' : 'HIGH',
          room: room.room,
          faultType: 'HUMIDITY_OUT_OF_BOUNDS',
          label: 'Humidity Deviation',
          value: formatHumidity(room.humidity),
          message: room.humidity > THRESHOLDS.HUMIDITY.NORMAL_MAX
            ? `High relative humidity detected (Threshold: ${THRESHOLDS.HUMIDITY.NORMAL_MAX}%)`
            : `Low relative humidity detected (Threshold: ${THRESHOLDS.HUMIDITY.NORMAL_MIN}%)`,
          firstSeen: room.lastUpdated,
          lastSeen: room.lastUpdated,
          status: 'ACTIVE'
        });
      }
    }
  });

  // 2. Format active hardware faults from fault engine
  const hardwareFaultsFormatted = (activeFaults || []).map(f => ({
    id: f._id || `fault-${f.room}-${f.faultType}`,
    category: 'HARDWARE',
    severity: f.severity || 'MEDIUM',
    room: f.room,
    faultType: f.faultType,
    label: getFaultTypeLabel(f.faultType),
    value: f.metric || 'Telemetry',
    message: f.message,
    firstSeen: f.firstSeen,
    lastSeen: f.lastSeen,
    status: f.status || 'ACTIVE'
  }));

  // Aggregate stats
  const totalHardwareAnomalies = hardwareFaultsFormatted.length;
  const totalEnvAlerts = environmentalAlerts.length;
  const offlineNodesCount = healthData?.connectivity?.offline || 0;
  const onlineNodesCount = healthData?.connectivity?.online || 0;

  // Build the active filtered list
  let displayList = [];
  if (activeTab === 'ACTIVE_ALL') {
    displayList = [...hardwareFaultsFormatted, ...environmentalAlerts];
  } else if (activeTab === 'HARDWARE') {
    displayList = hardwareFaultsFormatted;
  } else if (activeTab === 'ENVIRONMENTAL') {
    displayList = environmentalAlerts;
  } else if (activeTab === 'HISTORY') {
    displayList = historyList.map(h => ({
      id: h._id,
      category: 'HARDWARE',
      severity: h.severity || 'MEDIUM',
      room: h.room,
      faultType: h.faultType,
      label: getFaultTypeLabel(h.faultType),
      value: h.metric || 'Audit Log',
      message: h.message,
      firstSeen: h.firstSeen,
      lastSeen: h.lastSeen,
      resolvedAt: h.resolvedAt,
      status: h.status || 'RESOLVED'
    }));
  }

  // Filter by severity if selected
  if (selectedSeverity !== 'ALL') {
    displayList = displayList.filter(item => item.severity === selectedSeverity);
  }

  const handleRefresh = () => {
    refetchEnv();
    refetchHealth();
    if (activeTab === 'HISTORY') fetchFaultHistory();
  };

  const isLoading = envLoading || healthLoading || (activeTab === 'HISTORY' && historyLoading);

  return (
    <PageContainer>
      {/* KPI Diagnostic Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div className="summary-card" style={{ padding: '16px 18px', borderLeft: '4px solid var(--accent-terracotta)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Hardware Anomalies</span>
            <ShieldAlert size={18} style={{ color: 'var(--accent-terracotta)' }} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '6px' }}>
            {totalHardwareAnomalies}
          </div>
          <span style={{ fontSize: '12px', color: totalHardwareAnomalies > 0 ? 'var(--status-critical-dot)' : 'var(--status-normal-dot)', fontWeight: 500 }}>
            {totalHardwareAnomalies === 0 ? 'All sensors reporting healthy' : `${totalHardwareAnomalies} active diagnostic fault(s)`}
          </span>
        </div>

        <div className="summary-card" style={{ padding: '16px 18px', borderLeft: '4px solid #C65C5C' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Environmental Alerts</span>
            <Bell size={18} style={{ color: '#C65C5C' }} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '6px' }}>
            {totalEnvAlerts}
          </div>
          <span style={{ fontSize: '12px', color: totalEnvAlerts > 0 ? '#C65C5C' : '#4F8058', fontWeight: 500 }}>
            {totalEnvAlerts === 0 ? 'Comfort thresholds optimal' : `${totalEnvAlerts} threshold violation(s)`}
          </span>
        </div>

        <div className="summary-card" style={{ padding: '16px 18px', borderLeft: '4px solid #4F8058' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Connected Nodes</span>
            <Radio size={18} style={{ color: '#4F8058' }} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '6px' }}>
            {onlineNodesCount}
          </div>
          <span style={{ fontSize: '12px', color: '#4F8058', fontWeight: 500 }}>
            Active telemetry received
          </span>
        </div>

        <div className="summary-card" style={{ padding: '16px 18px', borderLeft: '4px solid #6B746E' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Offline Nodes</span>
            <WifiOff size={18} style={{ color: '#6B746E' }} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '6px' }}>
            {offlineNodesCount}
          </div>
          <span style={{ fontSize: '12px', color: offlineNodesCount > 0 ? '#C65C5C' : '#6B746E', fontWeight: 500 }}>
            {offlineNodesCount === 0 ? 'Zero nodes offline' : `${offlineNodesCount} silent node(s) (>45s)`}
          </span>
        </div>
      </div>

      {/* Main Alert Management Card */}
      <div className="card-section">
        <div className="card-section-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={20} style={{ color: 'var(--accent-terracotta)' }} />
            <div>
              <h2 className="card-section-title">Campus Anomaly & Alert Center</h2>
              <span className="card-section-subtitle">Real-time sensor diagnostics, threshold alarms, and fault history</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn-secondary" onClick={handleRefresh}>
              <RotateCw size={13} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* View Switcher Tabs & Filter Bar */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', backgroundColor: 'var(--bg-section)' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button 
              className={`btn-secondary ${activeTab === 'ACTIVE_ALL' ? 'active' : ''}`}
              onClick={() => setActiveTab('ACTIVE_ALL')}
              style={{ fontSize: '12.5px', padding: '6px 12px', fontWeight: activeTab === 'ACTIVE_ALL' ? 700 : 500 }}
            >
              All Active Issues ({totalHardwareAnomalies + totalEnvAlerts})
            </button>

            <button 
              className={`btn-secondary ${activeTab === 'HARDWARE' ? 'active' : ''}`}
              onClick={() => setActiveTab('HARDWARE')}
              style={{ fontSize: '12.5px', padding: '6px 12px', fontWeight: activeTab === 'HARDWARE' ? 700 : 500 }}
            >
              Hardware Faults ({totalHardwareAnomalies})
            </button>

            <button 
              className={`btn-secondary ${activeTab === 'ENVIRONMENTAL' ? 'active' : ''}`}
              onClick={() => setActiveTab('ENVIRONMENTAL')}
              style={{ fontSize: '12.5px', padding: '6px 12px', fontWeight: activeTab === 'ENVIRONMENTAL' ? 700 : 500 }}
            >
              Environmental ({totalEnvAlerts})
            </button>

            <button 
              className={`btn-secondary ${activeTab === 'HISTORY' ? 'active' : ''}`}
              onClick={() => setActiveTab('HISTORY')}
              style={{ fontSize: '12.5px', padding: '6px 12px', fontWeight: activeTab === 'HISTORY' ? 700 : 500 }}
            >
              <History size={13} style={{ marginRight: '4px' }} />
              Fault History
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={15} style={{ color: 'var(--text-muted)' }} />
            <select 
              className="filter-select"
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              style={{ padding: '6px 10px', fontSize: '12px' }}
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="HIGH">High Severity</option>
              <option value="MEDIUM">Medium Severity</option>
              <option value="LOW">Low Severity</option>
            </select>
          </div>
        </div>

        {/* Content Body */}
        <div className="card-section-body" style={{ padding: 0 }}>
          {isLoading && displayList.length === 0 ? (
            <div className="state-container" style={{ padding: '48px 24px' }}>
              <RotateCw className="spin" size={28} style={{ color: 'var(--sage)', marginBottom: '12px' }} />
              <span className="state-title">Loading diagnostic alerts...</span>
            </div>
          ) : displayList.length === 0 ? (
            <div className="state-container" style={{ padding: '48px 24px' }}>
              <CheckCircle2 size={42} style={{ color: '#4F8058', marginBottom: '12px' }} />
              <span className="state-title" style={{ fontSize: '16px', color: '#202925' }}>
                {activeTab === 'HISTORY' ? 'No Historical Fault Records' : 'All Systems & Environmental Parameters Normal'}
              </span>
              <span className="state-desc">
                {activeTab === 'HISTORY' 
                  ? 'No past fault logs match the selected filter.' 
                  : 'Zero active hardware faults or environmental threshold violations detected across all campus rooms.'}
              </span>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table alerts-table">
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>Room</th>
                    <th>Category</th>
                    <th>Fault / Anomaly Type</th>
                    <th>Description</th>
                    <th>Detected</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayList.map((item) => {
                    const sevMeta = getFaultSeverityMeta(item.severity);
                    const isResolved = item.status === 'RESOLVED';

                    return (
                      <tr key={item.id}>
                        <td>
                          <span 
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              padding: '3px 8px', 
                              borderRadius: '4px', 
                              fontSize: '11px', 
                              fontWeight: 700, 
                              backgroundColor: sevMeta.bg, 
                              color: sevMeta.color, 
                              border: `1px solid ${sevMeta.border}` 
                            }}
                          >
                            {item.severity}
                          </span>
                        </td>
                        <td>
                          <Link 
                            to={`/monitoring/${item.room}`} 
                            style={{ fontWeight: 700, color: 'var(--primary-dark)', textDecoration: 'none' }}
                          >
                            {getRoomDisplayName(item.room)}
                          </Link>
                        </td>
                        <td>
                          <span style={{ 
                            fontSize: '11px', 
                            padding: '2px 6px', 
                            borderRadius: '4px', 
                            fontWeight: 600,
                            backgroundColor: item.category === 'HARDWARE' ? '#E8EEE5' : '#F5E9DF',
                            color: item.category === 'HARDWARE' ? '#4F8058' : '#A96132'
                          }}>
                            {item.category}
                          </span>
                        </td>
                        <td>
                          <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                            {item.label}
                          </strong>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', maxWidth: '420px', fontSize: '12.5px' }}>
                          {item.message}
                          {isResolved && item.resolvedAt && (
                            <div style={{ fontSize: '11px', color: '#4F8058', marginTop: '3px' }}>
                              Resolved at {formatDateTime(item.resolvedAt)}
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {formatTimeAgo(item.lastSeen || item.firstSeen, now)}
                        </td>
                        <td>
                          {isResolved ? (
                            <span className="status-badge status-normal" style={{ fontSize: '11px' }}>
                              <CheckCircle2 size={11} style={{ marginRight: '3px' }} />
                              <span>Resolved</span>
                            </span>
                          ) : (
                            <span className="status-badge status-warning" style={{ fontSize: '11px' }}>
                              <span className="dot" style={{ backgroundColor: sevMeta.color }} />
                              <span>Active</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
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
