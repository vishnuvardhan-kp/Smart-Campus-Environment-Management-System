import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import ChatContainer from './ChatContainer';
import CampusBotAvatar from './CampusBotAvatar';

export default function AssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();

  // If user is already on the dedicated full-page assistant view, do not show floating widget
  if (location && location.pathname === '/assistant') {
    return null;
  }

  return (
    <aside className="campus-assistant-widget-host" aria-label="Campus AI Assistant Widget">
      {isOpen ? (
        <div 
          className={`assistant-window-floating ${isExpanded ? 'is-expanded' : 'is-compact'}`}
          role="dialog"
          aria-label="Smart Campus AI Assistant Window"
        >
          <ChatContainer
            isExpanded={isExpanded}
            onToggleExpand={() => setIsExpanded(!isExpanded)}
            onClose={() => setIsOpen(false)}
          />
        </div>
      ) : (
        <button
          type="button"
          className="assistant-floating-launcher"
          onClick={() => setIsOpen(true)}
          aria-label="Open Smart Campus Assistant"
          title="Open Smart Campus Assistant (Database-Grounded)"
        >
          <CampusBotAvatar state="idle" size="sm" />
          <span className="launcher-text">AI Assistant</span>
          <span className="launcher-pulse-dot" aria-hidden="true"></span>
        </button>
      )}

      <style>{`
        .campus-assistant-widget-host {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 1000;
          pointer-events: none;
        }

        .assistant-floating-launcher {
          pointer-events: auto;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 16px 8px 10px;
          background: linear-gradient(135deg, #202925 0%, #2E3833 100%);
          color: #FFFFFF;
          border-radius: 9999px;
          box-shadow: 0 10px 25px rgba(32, 41, 37, 0.28), 0 2px 6px rgba(0, 0, 0, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.18);
          cursor: pointer;
          transition: transform 180ms ease, box-shadow 180ms ease, background 180ms ease;
          user-select: none;
        }

        .assistant-floating-launcher:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 32px rgba(32, 41, 37, 0.38), 0 4px 10px rgba(0, 0, 0, 0.16);
          background: linear-gradient(135deg, #151C18 0%, #202925 100%);
        }

        .assistant-floating-launcher:active {
          transform: translateY(0);
        }

        .launcher-text {
          font-size: 0.85rem;
          font-weight: 600;
          letter-spacing: -0.01em;
          color: #FFFFFF;
          white-space: nowrap;
        }

        .launcher-pulse-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background-color: #8CE084;
          box-shadow: 0 0 8px #8CE084;
          display: inline-block;
          animation: assistantPulseGlow 2s infinite ease-in-out;
        }

        @keyframes assistantPulseGlow {
          0%, 100% { opacity: 0.8; transform: scale(0.95); }
          50% { opacity: 1; transform: scale(1.15); box-shadow: 0 0 12px #8CE084; }
        }

        .assistant-window-floating {
          pointer-events: auto;
          display: flex;
          flex-direction: column;
          background-color: #FFFFFF;
          border-radius: 16px;
          border: 1px solid #D0D7D0;
          box-shadow: 0 18px 48px rgba(32, 41, 37, 0.26), 0 4px 12px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          transition: width 220ms cubic-bezier(0.16, 1, 0.3, 1), height 220ms cubic-bezier(0.16, 1, 0.3, 1);
          animation: assistantFloatIn 200ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .assistant-window-floating.is-compact {
          width: 390px;
          height: 580px;
          max-width: calc(100vw - 32px);
          max-height: calc(100vh - 48px);
        }

        .assistant-window-floating.is-expanded {
          width: 540px;
          height: 700px;
          max-width: calc(100vw - 32px);
          max-height: calc(100vh - 48px);
        }

        @keyframes assistantFloatIn {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 640px) {
          .campus-assistant-widget-host {
            bottom: 12px;
            right: 12px;
            left: 12px;
          }

          .assistant-window-floating.is-compact,
          .assistant-window-floating.is-expanded {
            width: 100% !important;
            max-width: 100% !important;
            height: calc(100vh - 24px) !important;
            max-height: calc(100vh - 24px) !important;
            border-radius: 14px;
          }
        }
      `}</style>
    </aside>
  );
}
