import React from 'react';
import { RotateCcw, Maximize2, Minimize2, X, Database, Sparkles } from 'lucide-react';
import CampusBotAvatar from '../Avatar/CampusBotAvatar';

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
              {dbStatus.connected ? 'MongoDB Grounded' : 'DB Reconnecting'}
            </span>
          </div>
          <p className="chat-subtitle">NVIDIA NIM • Real-Time Environmental Telemetry</p>
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
          background: linear-gradient(135deg, var(--campus-forest) 0%, var(--campus-forest-soft) 100%);
          color: var(--text-inverse);
          border-top-left-radius: inherit;
          border-top-right-radius: inherit;
        }

        .chat-header-identity {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .chat-header-text {
          display: flex;
          flex-direction: column;
        }

        .chat-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .chat-title {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-inverse);
          letter-spacing: -0.01em;
        }

        .chat-subtitle {
          font-size: 0.72rem;
          color: rgba(255, 255, 255, 0.7);
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 1px 6px;
          border-radius: var(--radius-full);
          font-size: 0.65rem;
          font-weight: 500;
          letter-spacing: 0.03em;
        }

        .status-pill.online {
          background-color: rgba(122, 148, 116, 0.35);
          color: #A8D5A2;
        }

        .status-pill.offline {
          background-color: rgba(199, 123, 69, 0.35);
          color: #F5B895;
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
        }

        .action-icon-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: var(--radius-sm);
          color: rgba(255, 255, 255, 0.75);
          background: transparent;
        }

        .action-icon-btn:hover {
          color: #FFFFFF;
          background: rgba(255, 255, 255, 0.12);
        }

        .action-icon-btn:focus-visible {
          outline: 2px solid #A8D5A2;
        }
      `}</style>
    </header>
  );
}
