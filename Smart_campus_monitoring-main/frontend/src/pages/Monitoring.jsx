import React, { useState, useMemo } from 'react';
import PageContainer from '../components/layout/PageContainer';
import RoomTable from '../components/dashboard/RoomTable';
import { useEnvironment } from '../hooks/useEnvironment';
import { getRoomStatus, isSensorOnline } from '../utils/thresholds';
import { getRoomDisplayName } from '../utils/formatters';
import { Search, Filter, ArrowUpDown, ShieldCheck } from 'lucide-react';

const Monitoring = () => {
  const { rooms, loading, now } = useEnvironment();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [hwFilter, setHwFilter] = useState('ALL'); // ALL, HEALTHY, ANOMALY, OFFLINE
  const [sortBy, setSortBy] = useState('NONE'); // NONE, TEMP_ASC, TEMP_DESC, HUM_ASC, HUM_DESC

  const filteredRooms = useMemo(() => {
    let result = [...rooms];

    // 1. Search filter (supports both internal identifier and CC display name)
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(r => {
        const display = getRoomDisplayName(r.room).toLowerCase();
        return r.room.toLowerCase().includes(term) || display.includes(term);
      });
    }

    // 2. Environmental status filter
    if (statusFilter !== 'ALL') {
      result = result.filter(r => {
        const status = getRoomStatus(r.temperature, r.humidity, r.lastUpdated, now);
        return status.toUpperCase() === statusFilter;
      });
    }

    // 3. Hardware health diagnostic filter
    if (hwFilter !== 'ALL') {
      result = result.filter(r => {
        const isOnline = isSensorOnline(r.lastUpdated, now);
        const hwStatus = r.sensorHealth?.status || (isOnline ? 'HEALTHY' : 'OFFLINE');
        if (hwFilter === 'HEALTHY') return hwStatus === 'HEALTHY';
        if (hwFilter === 'ANOMALY') return hwStatus === 'FAULT' || hwStatus === 'DEGRADED';
        if (hwFilter === 'OFFLINE') return hwStatus === 'OFFLINE';
        return true;
      });
    }

    // 4. Sorting
    if (sortBy === 'TEMP_ASC') {
      result.sort((a, b) => (a.temperature || 0) - (b.temperature || 0));
    } else if (sortBy === 'TEMP_DESC') {
      result.sort((a, b) => (b.temperature || 0) - (a.temperature || 0));
    } else if (sortBy === 'HUM_ASC') {
      result.sort((a, b) => (a.humidity || 0) - (b.humidity || 0));
    } else if (sortBy === 'HUM_DESC') {
      result.sort((a, b) => (b.humidity || 0) - (a.humidity || 0));
    }

    return result;
  }, [rooms, searchTerm, statusFilter, hwFilter, sortBy, now]);

  return (
    <PageContainer>
      <div className="card-section">
        <div className="card-section-header">
          <div>
            <h2 className="card-section-title">Live Environmental Monitoring</h2>
            <span className="card-section-subtitle">Real-time room telemetry stream and hardware health status</span>
          </div>
        </div>

        <div className="card-section-body" style={{ padding: '16px 20px 0 20px' }}>
          {/* Controls Bar */}
          <div className="filter-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: '1 1 200px' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="search-input" 
                placeholder="Search room (e.g. CC1)..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '32px', width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={16} style={{ color: 'var(--text-muted)' }} />
              <select 
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Environments</option>
                <option value="NORMAL">Normal</option>
                <option value="WARNING">Warning</option>
                <option value="CRITICAL">Critical</option>
                <option value="OFFLINE">Offline</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} style={{ color: 'var(--text-muted)' }} />
              <select 
                className="filter-select"
                value={hwFilter}
                onChange={(e) => setHwFilter(e.target.value)}
              >
                <option value="ALL">All Hardware</option>
                <option value="HEALTHY">Healthy Sensors</option>
                <option value="ANOMALY">Anomalies / Faults</option>
                <option value="OFFLINE">Offline Nodes</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ArrowUpDown size={16} style={{ color: 'var(--text-muted)' }} />
              <select 
                className="filter-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="NONE">Default Order</option>
                <option value="TEMP_DESC">Temperature: High to Low</option>
                <option value="TEMP_ASC">Temperature: Low to High</option>
                <option value="HUM_DESC">Humidity: High to Low</option>
                <option value="HUM_ASC">Humidity: Low to High</option>
              </select>
            </div>
          </div>
        </div>

        {/* Flush Edge-to-Edge Table */}
        <RoomTable rooms={filteredRooms} loading={loading} />
      </div>
    </PageContainer>
  );
};

export default Monitoring;
