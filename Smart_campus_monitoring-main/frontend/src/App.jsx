import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { EnvironmentProvider } from './context/EnvironmentContext';
import { getRoomDisplayName } from './utils/formatters';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';

import Dashboard from './pages/Dashboard';
import Monitoring from './pages/Monitoring';
import RoomDetails from './pages/RoomDetails';
import Analytics from './pages/Analytics';
import Alerts from './pages/Alerts';
import Buildings from './pages/Buildings';
import Assistant from './pages/Assistant';
import AssistantWidget from './components/assistant/AssistantWidget';

import './styles/global.css';
import './styles/layout.css';
import './styles/dashboard.css';
import './styles/components.css';

const AppLayout = ({ children }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getPageTitle = (path) => {
    if (path === '/' || path === '/dashboard') {
      return { title: 'Smart Campus Overview', subtitle: 'Live environmental monitoring dashboard' };
    }
    if (path === '/monitoring') {
      return { title: 'Live Room Monitoring', subtitle: 'Real-time room telemetry stream' };
    }
    if (path.startsWith('/monitoring/')) {
      const room = path.split('/')[2];
      return { title: `Room Telemetry - ${getRoomDisplayName(room)}`, subtitle: 'Detailed sensor metrics and history charts' };
    }
    if (path === '/analytics') {
      return { title: 'Environmental Analytics', subtitle: 'Statistical breakdown and historical trends' };
    }
    if (path === '/alerts') {
      return { title: 'Environmental Alerts', subtitle: 'Real-time threshold violation status' };
    }
    if (path === '/buildings') {
      return { title: 'Campus Buildings', subtitle: 'Building infrastructure and zone overview' };
    }
    if (path === '/assistant') {
      return { title: 'AI Campus Assistant', subtitle: 'Database-grounded environmental telemetry assistant' };
    }
    return { title: 'Smart Campus Environment', subtitle: 'Management Platform' };
  };

  const { title, subtitle } = getPageTitle(location.pathname);

  return (
    <div className="app-layout">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      <div className="app-main">
        <Header 
          title={title}
          subtitle={subtitle}
          onToggleSidebar={() => setSidebarOpen(prev => !prev)}
        />
        {children}
        <AssistantWidget />
      </div>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <EnvironmentProvider>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/monitoring" element={<Monitoring />} />
            <Route path="/monitoring/:room" element={<RoomDetails />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/buildings" element={<Buildings />} />
            <Route path="/assistant" element={<Assistant />} />
          </Routes>
        </AppLayout>
      </EnvironmentProvider>
    </BrowserRouter>
  );
}

export default App;
