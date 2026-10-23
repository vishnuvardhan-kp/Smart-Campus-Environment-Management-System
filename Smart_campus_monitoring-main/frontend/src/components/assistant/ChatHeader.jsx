import React from 'react';
import { RotateCcw, Maximize2, Minimize2, X, Database, Sparkles } from 'lucide-react';
import CampusBotAvatar from './CampusBotAvatar';

export default function ChatHeader({
  avatarState = 'idle',
  isOnline = true,
  dbStatus = { connected: true, name: 'smart_campus' },
  isExpanded = false,
  onToggleExpand,
  onClearChat,
  onClose,
  hasMessages = false
}) {
  return (
    <header className="chat-header">
      <div className="chat-header-identity">
        <CampusBotAvatar state={avatarState} size="sm" />
        <div className="chat-header-text">
          <div className="chat-title-row">
            <h2 className="chat-title">Smart Campus Assistant</h2>
            <span className={`status-pill ${isOnline && dbStatus.connected ? 'online' : 'offline'}`}>
              <span className="status-dot" aria-hidden="true"></span>
              {dbStatus.connected ? 'Telemetry Connected' : 'Reconnecting...'}
            </span>
          </div>
          <p className="chat-subtitle">Real-Time Environmental & Telemetry Intelligence</p>
        </div>
      </div>

      <div className="chat-header-actions">
        {hasMessages && (
          <button
            type="button"
            className="action-icon-btn"
            onClick={onClearChat}
            title="Reset conversation"
            aria-label="Reset conversation"
          >
            <RotateCcw size={15} />
          </button>
        )}

        {onToggleExpand && (
          <button
            type="button"
            className="action-icon-btn"
            onClick={onToggleExpand}
            title={isExpanded ? 'Dock to widget' : 'Expand full view'}
            aria-label={isExpanded ? 'Dock to widget' : 'Expand full view'}
          >
            {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        )}

        {onClose && (
          <button
            type="button"
            className="action-icon-btn close-btn"
            onClick={onClose}
            title="Minimize assistant"
            aria-label="Minimize assistant"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <style>{`
        .chat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: linear-gradient(135deg, var(--campus-forest, #202925) 0%, var(--campus-forest-soft, #2E3833) 100%);
          color: var(--text-inverse, #FFFFFF);
          border-top-left-radius: inherit;
          border-top-right-radius: inherit;
          flex-shrink: 0;
          box-sizing: border-box;
        }

        .chat-header-identity {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          overflow: hidden;
        }

        .chat-header-text {
          display: flex;
          flex-direction: column;
          min-width: 0;
          overflow: hidden;
        }

        .chat-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .chat-title {
          font-size: 0.92rem;
          font-weight: 600;
          color: var(--text-inverse, #FFFFFF);
          letter-spacing: -0.01em;
          white-space: nowrap;
        }

        .chat-subtitle {
          font-size: 0.70rem;
          color: rgba(255, 255, 255, 0.72);
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 1px 7px;
          border-radius: var(--radius-full, 9999px);
          font-size: 0.65rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          white-space: nowrap;
        }

        .status-pill.online {
          background-color: rgba(122, 148, 116, 0.35);
          color: #A8D5A2;
          border: 1px solid rgba(140, 224, 132, 0.25);
        }

        .status-pill.offline {
          background-color: rgba(199, 123, 69, 0.35);
          color: #F5B895;
          border: 1px solid rgba(229, 169, 125, 0.25);
        }

        .status-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
        }

        .status-pill.online .status-dot {
          background-color: #8CE084;
          box-shadow: 0 0 6px #8CE084;
        }

        .status-pill.offline .status-dot {
          background-color: #E5A97D;
        }

        .chat-header-actions {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }

        .action-icon-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: var(--radius-sm, 6px);
          color: rgba(255, 255, 255, 0.75);
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all var(--transition-fast, 150ms ease);
        }

        .action-icon-btn:hover {
          color: #FFFFFF;
          background: rgba(255, 255, 255, 0.16);
        }

        .action-icon-btn:focus-visible {
          outline: 2px solid #A8D5A2;
        }
      `}</style>
    </header>
  );
}
