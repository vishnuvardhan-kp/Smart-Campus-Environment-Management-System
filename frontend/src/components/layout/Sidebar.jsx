import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  Activity, 
  BarChart3, 
  Bell, 
  Settings,
  ShieldCheck
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  return (
    <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="brand-icon">SC</div>
        <div className="brand-info">
          <span className="brand-title">SMART CAMPUS</span>
          <span className="brand-subtitle">Environment Management</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">Navigation</div>

        <NavLink 
          to="/" 
          end 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={onClose}
        >
          <LayoutDashboard />
          <span>Overview</span>
        </NavLink>

        <NavLink 
          to="/buildings" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={onClose}
        >
          <Building2 />
          <span>Buildings</span>
        </NavLink>

        <NavLink 
          to="/monitoring" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={onClose}
        >
          <Activity />
          <span>Live Monitoring</span>
        </NavLink>

        <NavLink 
          to="/analytics" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={onClose}
        >
          <BarChart3 />
          <span>Analytics</span>
        </NavLink>

        <NavLink 
          to="/alerts" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={onClose}
        >
          <Bell />
          <span>Alerts</span>
        </NavLink>

        <div className="nav-section-title" style={{ marginTop: '16px' }}>System</div>

        <div className="nav-item" style={{ cursor: 'not-allowed', opacity: 0.7 }}>
          <Settings />
          <span>Settings</span>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#C5CDC7', fontSize: '11px', fontWeight: 500 }}>
          <ShieldCheck size={14} style={{ color: '#7A9474' }} />
          <span>Smart Infrastructure v1.0</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
