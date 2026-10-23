import React from 'react';
import CampusBotAvatar from './CampusBotAvatar';

export default function TypingIndicator() {
  return (
    <div className="typing-indicator-row" role="status" aria-live="polite">
      <div className="typing-avatar">
        <CampusBotAvatar state="thinking" size="sm" />
      </div>

      <div className="typing-bubble">
        <span className="typing-label">Analyzing campus telemetry</span>
        <div className="dots-container" aria-hidden="true">
          <span className="dot dot-1"></span>
          <span className="dot dot-2"></span>
          <span className="dot dot-3"></span>
        </div>
      </div>

      <style>{`
        .typing-indicator-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
          animation: fadeIn 0.2s ease-in;
        }

        .typing-avatar {
          flex-shrink: 0;
        }

        .typing-bubble {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background-color: var(--campus-surface, #FFFFFF);
          border: 1px solid var(--border-subtle, #E3E8E3);
          border-radius: var(--radius-md, 10px);
          box-shadow: 0 1px 3px rgba(32, 41, 37, 0.06);
        }

        .typing-label {
          font-size: 0.76rem;
          color: var(--text-secondary, #6B746E);
          font-style: italic;
        }

        .dots-container {
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }

        .dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background-color: var(--campus-sage, #7A9474);
          animation: dotBounce 1.2s infinite ease-in-out both;
        }

        .dot-1 { animation-delay: -0.32s; }
        .dot-2 { animation-delay: -0.16s; }
        .dot-3 { animation-delay: 0s; }

        @keyframes dotBounce {
          0%, 80%, 100% {
            transform: scale(0.6);
            opacity: 0.4;
          }
          40% {
            transform: scale(1.15);
            opacity: 1;
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(3px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .dot {
            animation: none !important;
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
}
