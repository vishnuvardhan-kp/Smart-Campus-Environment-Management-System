import React, { useState, useEffect } from 'react';
import { Menu, Clock, Radio, AlertTriangle } from 'lucide-react';
import { formatDateTime, formatTimeAgo } from '../../utils/formatters';
import { useEnvironment } from '../../hooks/useEnvironment';

const Header = ({ title, subtitle, onToggleSidebar }) => {
  const { lastSyncTime, apiConnected, now } = useEnvironment();
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="app-header">
      <div className="header-left">
        <button 
          className="sidebar-toggle-btn" 
          onClick={onToggleSidebar}
          aria-label="Toggle Sidebar"
        >
          <Menu size={20} />
        </button>

        <div className="header-title-area">
          <h1 className="header-title">{title}</h1>
          {subtitle && <span className="header-subtitle">{subtitle}</span>}
        </div>
      </div>

      <div className="header-right">
        <div className="header-time">
          <Clock size={14} />
          <span>{formatDateTime(currentDate)}</span>
        </div>

        {/* API Live / Sync Status Indicator */}
        <div className={`system-status-indicator ${!apiConnected ? 'status-critical' : ''}`}>
          <span 
            className="status-dot-pulse" 
            style={{ backgroundColor: apiConnected ? '#4F8058' : '#C65C5C' }} 
          />
          {apiConnected ? (
            <span>Live | Sync: {lastSyncTime ? formatTimeAgo(lastSyncTime, now) : 'syncing...'}</span>
          ) : (
            <span>Sync Lost | Last: {lastSyncTime ? formatTimeAgo(lastSyncTime, now) : 'never'}</span>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
