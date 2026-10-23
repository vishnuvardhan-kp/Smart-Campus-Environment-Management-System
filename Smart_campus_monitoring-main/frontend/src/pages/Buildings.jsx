import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PageContainer from '../components/layout/PageContainer';
import Pseudo3DBuildingsMap from '../components/campus/Pseudo3DBuildingsMap';
import IsometricRoomInterior from '../components/campus/IsometricRoomInterior';
import { CAMPUS_BUILDINGS, getBuildingSummary } from '../data/campusBuildings';
import { useEnvironment } from '../hooks/useEnvironment';
import { formatTemp, formatHumidity } from '../utils/formatters';
import { 
  Building2, 
  Layers3, 
  LayoutGrid, 
  Compass, 
  MapPin, 
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Info
} from 'lucide-react';

const Buildings = () => {
  const { rooms, loading, now } = useEnvironment();
  // View modes: '3D_CAMPUS' (Pseudo-3D Overview), 'INTERIOR' (Isometric Room Interior), 'CARDS'
  const [viewMode, setViewMode] = useState('3D_CAMPUS');
  const [selectedBuildingId, setSelectedBuildingId] = useState('IT_PARK');

  // Find active building object from configured campus buildings
  const selectedBuilding = CAMPUS_BUILDINGS.find(b => b.id === selectedBuildingId || b.legacyId === selectedBuildingId) || CAMPUS_BUILDINGS[0];

  const handleSelectBuildingFrom3D = (buildingId) => {
    setSelectedBuildingId(buildingId);
    setViewMode('INTERIOR');
  };

  const buildingsSummaries = CAMPUS_BUILDINGS.map(b => getBuildingSummary(b, rooms, now));

  return (
    <PageContainer>
      {/* Page Header with Multi-View Switcher */}
      <div className="card-section" style={{ marginBottom: '20px' }}>
        <div className="card-section-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="summary-card-icon" style={{ backgroundColor: '#E8EEE5', color: '#4F8058' }}>
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="card-section-title">Campus Buildings & Spatial Twin</h2>
              <span className="card-section-subtitle">
                Pseudo-3D architectural model, multi-facility climate tracking, and interactive room interiors
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button 
              type="button"
              className={`btn-secondary ${viewMode === '3D_CAMPUS' ? 'active' : ''}`}
              onClick={() => setViewMode('3D_CAMPUS')}
              style={{ 
                padding: '7px 14px', 
                fontSize: '12.5px', 
                fontWeight: viewMode === '3D_CAMPUS' ? 700 : 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Compass size={15} />
              <span>Pseudo-3D Campus Map</span>
            </button>

            <button 
              type="button"
              className={`btn-secondary ${viewMode === 'INTERIOR' ? 'active' : ''}`}
              onClick={() => setViewMode('INTERIOR')}
              style={{ 
                padding: '7px 14px', 
                fontSize: '12.5px', 
                fontWeight: viewMode === 'INTERIOR' ? 700 : 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Layers3 size={15} />
              <span>Room Interior Blueprint</span>
            </button>

            <button 
              type="button"
              className={`btn-secondary ${viewMode === 'CARDS' ? 'active' : ''}`}
              onClick={() => setViewMode('CARDS')}
              style={{ 
                padding: '7px 14px', 
                fontSize: '12.5px', 
                fontWeight: viewMode === 'CARDS' ? 700 : 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <LayoutGrid size={15} />
              <span>Facility Cards</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: PSEUDO-3D BUILDINGS OVERVIEW (Phase 2) */}
      {viewMode === '3D_CAMPUS' && (
        <Pseudo3DBuildingsMap 
          rooms={rooms}
          now={now}
          selectedBuildingId={selectedBuildingId}
          onSelectBuilding={handleSelectBuildingFrom3D}
        />
      )}

      {/* VIEW 2: INTERACTIVE ISOMETRIC ROOM INTERIOR (Phase 3 & Phase 4) */}
      {viewMode === 'INTERIOR' && (
        <IsometricRoomInterior 
          building={selectedBuilding}
          rooms={rooms}
          now={now}
          onBackToOverview={() => setViewMode('3D_CAMPUS')}
          onSwitchBuilding={(bId) => setSelectedBuildingId(bId)}
        />
      )}

      {/* VIEW 3: CARDS VIEW */}
      {viewMode === 'CARDS' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {buildingsSummaries.map((b) => (
            <div key={b.id} className="card-section" style={{ marginBottom: 0 }}>
              <div className="card-section-header" style={{ backgroundColor: 'var(--bg-main)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="summary-card-icon" style={{ backgroundColor: `${b.accentColor}18`, color: b.accentColor }}>
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{b.name}</h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{b.subtitle}</span>
                  </div>
                </div>

                <span className={`status-badge ${b.overallStatus === 'NORMAL' ? 'status-normal' : b.overallStatus === 'WARNING' ? 'status-warning' : b.overallStatus === 'CRITICAL' ? 'status-critical' : 'status-offline'}`}>
                  <span className="dot" />
                  <span>{b.overallStatus === 'NORMAL' ? 'Optimal' : b.overallStatus === 'WARNING' ? 'Attention' : b.overallStatus === 'CRITICAL' ? 'Critical' : 'Unmonitored'}</span>
                </span>
              </div>

              <div className="card-section-body">
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                  {b.description}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Configured Zones:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{b.totalRooms} Rooms ({b.floors} Floors)</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Average Temperature:</span>
                    <span style={{ fontWeight: 600 }}>{b.avgTemp !== null ? formatTemp(b.avgTemp) : '—'}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Average Humidity:</span>
                    <span style={{ fontWeight: 600 }}>{b.avgHum !== null ? formatHumidity(b.avgHum) : '—'}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Telemetry Mode:</span>
                    <span>
                      {b.hasLiveHardware && <strong style={{ color: '#2D5A34' }}>Live Physical ESP32</strong>}
                      {b.isEntirelyUnmonitored && <span style={{ color: '#64748B' }}>No Sensors Installed</span>}
                      {!b.hasLiveHardware && !b.isEntirelyUnmonitored && <span style={{ color: '#2D5A34', fontWeight: 600 }}>Active Stream</span>}
                    </span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {b.rooms.length} zones available
                  </span>

                  <button 
                    type="button"
                    className="btn-primary" 
                    onClick={() => {
                      setSelectedBuildingId(b.id);
                      setViewMode('INTERIOR');
                    }}
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    <span>Inspect 3D Interior</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
};

export default Buildings;
