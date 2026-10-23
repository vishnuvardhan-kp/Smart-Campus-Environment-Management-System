import React from 'react';
import ProvenanceBadge from '../Common/ProvenanceBadge';
import CampusBotAvatar from '../Avatar/CampusBotAvatar';
import { AlertCircle, Cpu } from 'lucide-react';

export default function MessageBubble({ message }) {
  const isUser = message.sender === 'user';
  const isError = message.isError;

  if (isUser) {
    return (
      <div className="message-row user-row">
        <div className="bubble-wrapper user-wrapper">
          <div className="bubble user-bubble">
            <p className="message-text">{message.text}</p>
          </div>
          <span className="timestamp">{message.timestamp}</span>
        </div>

        <style>{`
          .message-row.user-row {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 12px;
          }
          .bubble-wrapper.user-wrapper {
            max-width: 82%;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
          }
          .user-bubble {
            background-color: var(--campus-forest);
            color: var(--text-inverse);
            padding: 10px 14px;
            border-radius: var(--radius-md) var(--radius-md) 2px var(--radius-md);
            font-size: 0.88rem;
            line-height: 1.45;
            word-break: break-word;
            box-shadow: var(--shadow-sm);
          }
          .timestamp {
            font-size: 0.68rem;
            color: var(--text-muted);
            margin-top: 4px;
            padding: 0 4px;
          }
        `}</style>
      </div>
    );
  }

  // Assistant Message
  return (
    <div className={`message-row bot-row ${isError ? 'error-row' : ''}`}>
      <div className="bot-avatar-col">
        <CampusBotAvatar state={isError ? 'idle' : 'idle'} size="sm" />
      </div>

      <div className="bubble-wrapper bot-wrapper">
        <div className="bot-meta-bar">
          <span className="bot-name">Campus Assistant</span>
          {message.provenance && (
            <ProvenanceBadge provenance={message.provenance} variant="inline" />
          )}
          {message.modelUsed && (
            <span className="model-chip" title={`Synthesized by ${message.modelUsed}`}>
              <Cpu size={10} />
              {message.modelUsed.includes('llama') ? 'NVIDIA Llama 3.1' : 'Rules Engine'}
            </span>
          )}
        </div>

        <div className={`bubble bot-bubble ${isError ? 'error-bubble' : ''}`}>
          {isError && (
            <div className="error-header">
              <AlertCircle size={15} className="error-icon" />
              <span>Database / Telemetry Service Notice</span>
            </div>
          )}

          <p className="message-text">{message.text}</p>

          {/* Structured metrics chips */}
          {message.metrics && message.metrics.length > 0 && (
            <div className="metrics-grid">
              {message.metrics.map((m, idx) => (
                <div key={idx} className={`metric-card status-${m.status || 'normal'}`}>
                  <span className="metric-label">{m.label}</span>
                  <span className="metric-value">{m.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Historical records summary table */}
          {message.recordsSummary && message.recordsSummary.length > 0 && (
            <div className="trend-table-wrapper">
              <div className="table-caption">Recent Historical Telemetry Points (MongoDB)</div>
              <table className="trend-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Temp</th>
                    <th>Humidity</th>
                    <th>IR Events</th>
                    <th>Fan</th>
                  </tr>
                </thead>
                <tbody>
                  {message.recordsSummary.map((t, idx) => (
                    <tr key={idx}>
                      <td>{t.time}</td>
                      <td>{t.temp}°C</td>
                      <td>{t.humidity}%</td>
                      <td>{t.peopleCount}</td>
                      <td>
                        <span className={`actuator-chip ${t.fan === 'ON' ? 'fan-on' : 'fan-off'}`}>
                          {t.fan}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <span className="timestamp">{message.timestamp}</span>
      </div>

      <style>{`
        .message-row.bot-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 14px;
        }

        .bot-avatar-col {
          padding-top: 2px;
          flex-shrink: 0;
        }

        .bubble-wrapper.bot-wrapper {
          max-width: 90%;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .bot-meta-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 4px;
          flex-wrap: wrap;
        }

        .bot-name {
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .model-chip {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 0.64rem;
          padding: 1px 6px;
          border-radius: var(--radius-sm);
          background-color: var(--campus-surface-subtle);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
        }

        .bot-bubble {
          background-color: var(--campus-surface);
          border: 1px solid var(--border-subtle);
          color: var(--text-primary);
          padding: 12px 14px;
          border-radius: 2px var(--radius-md) var(--radius-md) var(--radius-md);
          font-size: 0.88rem;
          line-height: 1.5;
          box-shadow: var(--shadow-sm);
        }

        .bot-bubble.error-bubble {
          border-color: #E7C7AD;
          background-color: #FFFDFB;
        }

        .error-header {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--campus-terracotta);
          font-weight: 600;
          font-size: 0.78rem;
          margin-bottom: 6px;
        }

        .error-icon {
          color: var(--campus-terracotta);
        }

        .message-text {
          white-space: pre-wrap;
          word-break: break-word;
        }

        /* Metrics Grid */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 6px;
          margin-top: 10px;
        }

        .metric-card {
          padding: 6px 8px;
          border-radius: var(--radius-sm);
          display: flex;
          flex-direction: column;
          border: 1px solid var(--border-subtle);
        }

        .metric-card.status-normal {
          background-color: var(--status-normal-bg);
          border-color: #CCE3D0;
        }
        .metric-card.status-warning {
          background-color: var(--status-warning-bg);
          border-color: #F0D5C1;
        }
        .metric-card.status-critical {
          background-color: var(--status-critical-bg);
          border-color: #F1C3C3;
        }
        .metric-card.status-info {
          background-color: var(--status-info-bg);
          border-color: #C8DFEC;
        }

        .metric-label {
          font-size: 0.65rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .metric-value {
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .trend-table-wrapper {
          margin-top: 10px;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          overflow-x: auto;
          background: var(--campus-surface-subtle);
        }

        .table-caption {
          font-size: 0.68rem;
          font-weight: 600;
          color: var(--text-secondary);
          padding: 6px 8px 4px 8px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .trend-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.72rem;
        }

        .trend-table th, .trend-table td {
          padding: 4px 8px;
          text-align: left;
          border-bottom: 1px solid var(--border-subtle);
        }

        .trend-table th {
          background-color: rgba(0,0,0,0.03);
          color: var(--text-secondary);
          font-weight: 600;
        }

        .actuator-chip {
          padding: 1px 4px;
          border-radius: 3px;
          font-weight: 700;
          font-size: 0.65rem;
        }
        .fan-on {
          background-color: #F9EFE7;
          color: #C77B45;
        }
        .fan-off {
          background-color: #ECEFEA;
          color: #6B746E;
        }
      `}</style>
    </div>
  );
}
