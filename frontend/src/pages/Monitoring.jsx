import React, { useState, useMemo } from 'react';
import PageContainer from '../components/layout/PageContainer';
import RoomTable from '../components/dashboard/RoomTable';
import { useEnvironment } from '../hooks/useEnvironment';
import { getRoomStatus } from '../utils/thresholds';
import { Search, Filter, ArrowUpDown } from 'lucide-react';

const Monitoring = () => {
  const { rooms, loading, now } = useEnvironment();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('NONE'); // NONE, TEMP_ASC, TEMP_DESC, HUM_ASC, HUM_DESC

  const filteredRooms = useMemo(() => {
    let result = [...rooms];

    // 1. Search filter
    if (searchTerm.trim() !== '') {
      result = result.filter(r => 
        r.room.toLowerCase().includes(searchTerm.toLowerCase().trim())
      );
    }

    // 2. Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter(r => {
        const status = getRoomStatus(r.temperature, r.humidity, r.lastUpdated, now);
        return status.toUpperCase() === statusFilter;
      });
    }

    // 3. Sorting
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
  }, [rooms, searchTerm, statusFilter, sortBy, now]);

  return (
    <PageContainer>
      <div className="card-section">
        <div className="card-section-header">
          <div>
            <h2 className="card-section-title">Live Environmental Monitoring</h2>
            <span className="card-section-subtitle">Real-time room telemetry stream</span>
          </div>
        </div>

        <div className="card-section-body" style={{ padding: '16px 20px 0 20px' }}>
          {/* Controls Bar */}
          <div className="filter-bar">
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="search-input" 
                placeholder="Search room (e.g. LAB101)..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '32px' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={16} style={{ color: 'var(--text-muted)' }} />
              <select 
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="NORMAL">Online / Normal</option>
                <option value="WARNING">Warning</option>
                <option value="CRITICAL">Critical</option>
                <option value="OFFLINE">Offline</option>
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
