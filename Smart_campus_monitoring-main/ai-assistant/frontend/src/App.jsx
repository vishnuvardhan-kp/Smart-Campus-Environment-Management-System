import React, { useState } from 'react';
import ChatContainer from './components/Chat/ChatContainer';
import CampusBotAvatar from './components/Avatar/CampusBotAvatar';
import {
  MessageSquare,
  Layout,
  Database,
  Cpu,
  ShieldCheck,
  Server,
  Sparkles
} from 'lucide-react';

export default function App() {
  const [viewMode, setViewMode] = useState('floating');
  const [isWidgetOpen, setIsWidgetOpen] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="preview-layout">
      {/* Top Banner / Navbar */}
      <header className="preview-nav">
        <div className="nav-brand">
          <div className="nav-icon-badge">
            <Sparkles size={18} />
          </div>
          <div>
            <h1 className="nav-title">Smart Campus Environment Management</h1>
            <p className="nav-tagline">AI Campus Assistant — Grounded in MongoDB & NVIDIA NIM</p>
          </div>
        </div>

        <div className="nav-controls">
          <div className="mode-toggle-group" role="group" aria-label="View mode selector">
            <button
              type="button"
              className={`mode-btn ${viewMode === 'floating' ? 'active' : ''}`}
              onClick={() => { setViewMode('floating'); setIsWidgetOpen(true); }}
            >
              <MessageSquare size={14} />
              Floating Widget
            </button>
            <button
              type="button"
              className={`mode-btn ${viewMode === 'docked' ? 'active' : ''}`}
              onClick={() => { setViewMode('docked'); }}
            >
              <Layout size={14} />
              Docked Split View
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Preview Shell */}
      <main className="preview-main">
        <section className="mock-campus-dashboard">
          <div className="dashboard-hero">
            <div className="hero-text">
              <span className="hero-badge">Database-Grounded Assistant</span>
              <h2>Campus Environmental Intelligence</h2>
              <p>
                The AI Campus Assistant queries genuine sensor telemetry stored in <strong>MongoDB</strong> (<code>smart_campus.current_environment</code> and <code>environment_history</code>). The <strong>NVIDIA NIM LLM</strong> (<code>meta/llama-3.1-8b-instruct</code>) synthesizes clear, conversational answers without hallucinating numbers.
              </p>
            </div>

            <div className="isolation-specs">
              <div className="spec-card">
                <Database size={18} className="spec-icon" />
                <div>
                  <strong>Database Grounding</strong>
                  <span>MongoDB: smart_campus (LAB101)</span>
                </div>
              </div>
              <div className="spec-card">
                <Cpu size={18} className="spec-icon" />
                <div>
                  <strong>LLM Model</strong>
                  <span>NVIDIA NIM (meta/llama-3.1-8b)</span>
                </div>
              </div>
              <div className="spec-card">
                <Server size={18} className="spec-icon" />
                <div>
                  <strong>Assistant API Service</strong>
                  <span>http://localhost:5005</span>
                </div>
              </div>
            </div>
          </div>

          {/* Environmental Telemetry Architecture Highlights */}
          <div className="campus-tiles-grid">
            <div className="tile">
              <span className="tile-title">DHT11 Temperature & Humidity</span>
              <p className="tile-desc">
                Measures ambient temperature (°C) and relative humidity (%). Persisted to MongoDB on MQTT topic updates with automated assessment thresholds.
              </p>
              <div className="tile-footer">
                <span className="tag-ok">Persisted in MongoDB</span>
              </div>
            </div>

            <div className="tile">
              <span className="tile-title">Digital IR Obstacle Sensor (Pin 27)</span>
              <p className="tile-desc">
                Unidirectional beam-break counter debounced at 1000ms. Increments cumulative trigger count on <code>campus/people</code>, reflecting passage events.
              </p>
              <div className="tile-footer">
                <span className="tag-warn">Cumulative Triggers</span>
              </div>
            </div>

            <div className="tile">
              <span className="tile-title">Actuator Controls & History</span>
              <p className="tile-desc">
                Cooling fan and lighting relays triggered by automated environmental conditions. Throttled history logged to <code>environment_history</code> every 60s.
              </p>
              <div className="tile-footer">
                <span className="tag-ok">200+ Historical Points</span>
              </div>
            </div>
          </div>
        </section>

        {/* Docked View Display */}
        {viewMode === 'docked' && (
          <aside className="docked-assistant-pane">
            <ChatContainer
              isExpanded={false}
              onToggleExpand={null}
              onClose={() => setViewMode('floating')}
              className="docked-chat"
            />
          </aside>
        )}
      </main>

      {/* Floating Widget Mode Launcher & Modal */}
      {viewMode === 'floating' && (
        <div className="floating-assistant-host">
          {isWidgetOpen ? (
            <div className="floating-window-wrapper">
              <ChatContainer
                isExpanded={isExpanded}
                onToggleExpand={() => setIsExpanded(!isExpanded)}
                onClose={() => setIsWidgetOpen(false)}
              />
            </div>
          ) : (
            <button
              type="button"
              className="floating-launcher-btn"
              onClick={() => setIsWidgetOpen(true)}
              aria-label="Open Smart Campus Assistant"
              title="Open Smart Campus Assistant"
            >
              <CampusBotAvatar state="idle" size="md" />
              <span className="launcher-label">Campus Assistant</span>
            </button>
          )}
        </div>
      )}

      <style>{`
        .preview-layout {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: var(--campus-bg);
          position: relative;
        }

        .preview-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 24px;
          background-color: var(--campus-surface);
          border-bottom: 1px solid var(--border-subtle);
          position: sticky;
          top: 0;
          z-index: 30;
        }

        .nav-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .nav-icon-badge {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-md);
          background: linear-gradient(135deg, var(--campus-sage) 0%, var(--campus-forest) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .nav-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--campus-forest);
        }

        .nav-tagline {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .mode-toggle-group {
          display: inline-flex;
          background-color: var(--campus-bg);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 3px;
          gap: 2px;
        }

        .mode-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          font-size: 0.78rem;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .mode-btn.active {
          background-color: var(--campus-surface);
          color: var(--campus-forest);
          font-weight: 600;
          box-shadow: var(--shadow-sm);
        }

        .preview-main {
          flex: 1;
          display: flex;
          padding: 24px;
          gap: 24px;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
        }

        .mock-campus-dashboard {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .dashboard-hero {
          background-color: var(--campus-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          flex-wrap: wrap;
        }

        .hero-text {
          max-width: 580px;
        }

        .hero-badge {
          display: inline-block;
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          background-color: var(--campus-sage-light);
          color: var(--campus-sage-dark);
          margin-bottom: 8px;
        }

        .hero-text h2 {
          font-size: 1.4rem;
          font-weight: 700;
          color: var(--campus-forest);
          margin-bottom: 8px;
        }

        .hero-text p {
          font-size: 0.88rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .isolation-specs {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .spec-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background-color: var(--campus-surface-subtle);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          font-size: 0.8rem;
        }

        .spec-icon {
          color: var(--campus-sage);
        }

        .spec-card strong {
          display: block;
          font-weight: 600;
          color: var(--campus-forest);
        }

        .spec-card span {
          color: var(--text-secondary);
          font-family: monospace;
          font-size: 0.76rem;
        }

        .campus-tiles-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
        }

        .tile {
          background-color: var(--campus-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 16px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .tile-title {
          font-size: 0.86rem;
          font-weight: 600;
          color: var(--campus-forest);
          margin-bottom: 8px;
          display: block;
        }

        .tile-desc {
          font-size: 0.78rem;
          color: var(--text-secondary);
          line-height: 1.4;
          margin-bottom: 12px;
        }

        .tile-footer {
          display: flex;
          align-items: center;
          font-size: 0.72rem;
        }

        .tag-warn {
          color: var(--campus-terracotta);
          font-weight: 600;
        }
        .tag-ok {
          color: var(--status-normal);
          font-weight: 600;
        }

        .docked-assistant-pane {
          width: 440px;
          flex-shrink: 0;
        }

        .docked-chat {
          width: 100% !important;
          height: calc(100vh - 120px) !important;
          max-height: 820px !important;
        }

        .floating-assistant-host {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 50;
        }

        .floating-launcher-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 16px 8px 10px;
          background: linear-gradient(135deg, var(--campus-forest) 0%, var(--campus-forest-soft) 100%);
          color: var(--text-inverse);
          border-radius: var(--radius-full);
          box-shadow: var(--shadow-lg);
          transition: transform var(--transition-fast), box-shadow var(--transition-fast);
        }

        .floating-launcher-btn:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-float);
        }

        .launcher-label {
          font-size: 0.88rem;
          font-weight: 600;
          letter-spacing: -0.01em;
        }
      `}</style>
    </div>
  );
}
