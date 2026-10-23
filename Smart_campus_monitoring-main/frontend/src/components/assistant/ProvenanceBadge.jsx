import React from 'react';
import { Database, CheckCircle, Clock, ShieldCheck } from 'lucide-react';

export default function ProvenanceBadge({ provenance, variant = 'inline', className = '' }) {
  if (!provenance) {
    return (
      <span className={`db-provenance-tag ${className}`} title="Verified telemetry source">
        <ShieldCheck size={11} aria-hidden="true" />
        Verified Reading
      </span>
    );
  }

  const isFresh = provenance.isFresh;

  if (variant === 'banner') {
    return (
      <aside
        className={`provenance-banner ${className}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 14px',
          backgroundColor: isFresh ? 'var(--status-normal-bg, #E8EEE5)' : 'var(--campus-terracotta-light, #F9EFE7)',
          borderBottom: `1px solid ${isFresh ? '#CCE3D0' : '#EED4C2'}`,
          fontSize: '0.72rem',
          color: isFresh ? 'var(--status-normal, #4F8058)' : '#8A4A1C',
          fontWeight: 600,
          flexShrink: 0,
          boxOrigin: 'border-box'
        }}
        aria-label="Data provenance notice"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShieldCheck size={13} style={{ flexShrink: 0 }} aria-hidden="true" />
          <span>Campus Sensor Network</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', fontWeight: 500 }}>
          {isFresh ? (
            <>
              <CheckCircle size={12} style={{ color: 'var(--status-normal)' }} />
              <span>Live Reading</span>
            </>
          ) : (
            <>
              <Clock size={12} style={{ color: '#C77B45' }} />
              <span>{provenance.age ? `Logged ${provenance.age}` : 'Persisted Telemetry'}</span>
            </>
          )}
        </div>
      </aside>
    );
  }

  return (
    <span
      className={`db-provenance-tag ${isFresh ? 'fresh' : 'persisted'} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 7px',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: isFresh ? 'var(--status-normal-bg)' : 'var(--campus-terracotta-light)',
        border: `1px solid ${isFresh ? '#CCE3D0' : '#EED4C2'}`,
        fontSize: '0.66rem',
        fontWeight: 600,
        color: isFresh ? 'var(--status-normal)' : '#8A4A1C'
      }}
      title={`Source: Campus Sensors (${provenance.timestamp || 'persisted'})`}
    >
      <ShieldCheck size={10} aria-hidden="true" />
      {isFresh ? 'Live Reading' : 'Persisted Telemetry'}
    </span>
  );
}
