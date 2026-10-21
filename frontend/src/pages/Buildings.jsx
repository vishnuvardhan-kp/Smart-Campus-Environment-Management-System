import React from 'react';
import { Link } from 'react-router-dom';
import PageContainer from '../components/layout/PageContainer';
import RoomStatus from '../components/dashboard/RoomStatus';
import { useEnvironment } from '../hooks/useEnvironment';
import { isSensorOnline } from '../utils/thresholds';
import { Building2, MapPin } from 'lucide-react';

const Buildings = () => {
  const { rooms, loading, now } = useEnvironment();

  const blockARooms = rooms;
  const onlineCount = blockARooms.filter(r => isSensorOnline(r.lastUpdated, now)).length;

  return (
    <PageContainer>
      <div className="card-section" style={{ marginBottom: '20px' }}>
        <div className="card-section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Building2 size={20} style={{ color: 'var(--primary)' }} />
            <div>
              <h2 className="card-section-title">Campus Buildings & Infrastructure</h2>
              <span className="card-section-subtitle">Structural zones and building environmental status</span>
            </div>
          </div>
        </div>
      </div>

      {/* Buildings Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Block A Card */}
        <div className="card-section" style={{ marginBottom: 0 }}>
          <div className="card-section-header" style={{ backgroundColor: 'var(--bg-main)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="summary-card-icon">
                <Building2 size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Block A</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Science & Engineering Facility</span>
              </div>
            </div>

            <RoomStatus customStatus={onlineCount > 0 ? "normal" : "offline"} />
          </div>

          <div className="card-section-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Rooms Monitored:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{loading ? '...' : blockARooms.length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#6B746E' }}>Online Devices:</span>
                <strong style={{ color: onlineCount > 0 ? '#4F8058' : '#6B746E' }}>
                  {loading ? '...' : `${onlineCount} / ${blockARooms.length}`}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#6B746E' }}>Environmental Status:</span>
                <span style={{ color: onlineCount > 0 ? '#4F8058' : '#6B746E', fontWeight: 600 }}>
                  {onlineCount > 0 ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #E2E6E1', paddingTop: '16px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#6B746E', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Monitored Rooms:
              </span>
              <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {blockARooms.map(r => (
                  <Link key={r._id || r.room} to={`/monitoring/${r.room}`} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                    <MapPin size={12} style={{ color: '#7A9474' }} />
                    <span>{r.room}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Future Block B Placeholder */}
        <div className="card-section" style={{ marginBottom: 0, opacity: 0.75, borderStyle: 'dashed' }}>
          <div className="card-section-header" style={{ backgroundColor: '#F8F9F6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="summary-card-icon" style={{ backgroundColor: '#E8EEE5', color: '#6B746E' }}>
                <Building2 size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Block B</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Administrative Complex</span>
              </div>
            </div>
            <span className="status-badge status-offline">
              <span className="dot" />
              <span>Planned</span>
            </span>
          </div>

          <div className="card-section-body" style={{ textAlign: 'center', padding: '32px 20px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Expansion zone. Node sensors scheduled for future phase deployment.
            </span>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default Buildings;
