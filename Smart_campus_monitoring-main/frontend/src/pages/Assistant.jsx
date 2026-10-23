import React from 'react';
import ChatContainer from '../components/assistant/ChatContainer';
import { Database, Cpu, ShieldCheck, Activity } from 'lucide-react';

export default function AssistantPage() {
  return (
    <div className="assistant-page-container">
      <div className="assistant-page-grid">
        {/* Left Information Pane */}
        <div className="assistant-info-panel">
          <div className="info-card">
            <div className="info-card-header">
              <span className="badge-sage">Live Intelligence</span>
              <h3>Campus Environmental Assistant</h3>
            </div>
            <p className="info-description">
              Intelligent conversational assistant for campus climate analysis, zone occupancy trends, and automated comfort management.
            </p>

            <div className="specs-list">
              <div className="spec-item">
                <Database size={16} className="spec-icon" />
                <div>
                  <strong>Telemetry Source</strong>
                  <span>Campus Sensor Network (Live & Persisted)</span>
                </div>
              </div>
              <div className="spec-item">
                <Cpu size={16} className="spec-icon" />
                <div>
                  <strong>Intelligence</strong>
                  <span>Grounded Environmental Analytics</span>
                </div>
              </div>
              <div className="spec-item">
                <ShieldCheck size={16} className="spec-icon" />
                <div>
                  <strong>Reliability</strong>
                  <span>Verified Sensor Telemetry</span>
                </div>
              </div>
            </div>
          </div>

          <div className="info-card quick-topics">
            <h4>Verified Topic Domains</h4>
            <ul className="topics-list">
              <li><strong>Current Environment:</strong> Ambient temperature, humidity, and comfort ranges across zones.</li>
              <li><strong>IR Detection Sessions:</strong> Cumulative occupancy motion triggers within active sessions.</li>
              <li><strong>Actuators & Controls:</strong> Automated fan cooling and smart lighting states.</li>
              <li><strong>Historical Drift:</strong> Diurnal trajectory, min/max values, and thermal peaks.</li>
            </ul>
          </div>
        </div>

        {/* Right Main Chat Dock */}
        <div className="assistant-chat-panel">
          <ChatContainer
            isExpanded={true}
            onToggleExpand={null}
            onClose={null}
            className="full-page-chat"
          />
        </div>
      </div>

      <style>{`
        .assistant-page-container {
          padding: 24px;
          height: calc(100vh - 80px);
          overflow-y: auto;
        }

        .assistant-page-grid {
          display: grid;
          grid-template-columns: 360px 1fr;
          gap: 24px;
          height: 100%;
          max-width: 1400px;
          margin: 0 auto;
        }

        @media (max-width: 960px) {
          .assistant-page-grid {
            grid-template-columns: 1fr;
            height: auto;
          }
        }

        .assistant-info-panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .info-card {
          background-color: var(--bg-surface, #FFFFFF);
          border: 1px solid var(--border-color, #E2E6E1);
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(32, 41, 37, 0.05);
        }

        .badge-sage {
          display: inline-block;
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 2px 8px;
          border-radius: 4px;
          background-color: #E8EEE5;
          color: #55705B;
          margin-bottom: 8px;
        }

        .info-card-header h3 {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--primary-dark, #202925);
          margin-bottom: 8px;
        }

        .info-description {
          font-size: 0.82rem;
          color: var(--text-secondary, #6B746E);
          line-height: 1.5;
          margin-bottom: 16px;
        }

        .specs-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .spec-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          background-color: #F8F9F6;
          border-radius: 8px;
          font-size: 0.78rem;
        }

        .spec-icon {
          color: #7A9474;
          flex-shrink: 0;
        }

        .spec-item strong {
          display: block;
          color: #202925;
          font-size: 0.76rem;
        }

        .spec-item span {
          color: #6B746E;
          font-size: 0.72rem;
        }

        .quick-topics h4 {
          font-size: 0.88rem;
          font-weight: 700;
          color: #202925;
          margin-bottom: 12px;
        }

        .topics-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .topics-list li {
          font-size: 0.78rem;
          color: #55625B;
          line-height: 1.4;
          padding-left: 12px;
          border-left: 2px solid #7A9474;
        }

        .topics-list strong {
          color: #202925;
        }

        .assistant-chat-panel {
          height: 100%;
          min-height: 580px;
        }

        .full-page-chat {
          width: 100% !important;
          height: 100% !important;
          max-height: 100% !important;
        }
      `}</style>
    </div>
  );
}
