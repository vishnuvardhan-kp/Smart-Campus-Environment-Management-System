import React from 'react';
import { HelpCircle, ChevronRight } from 'lucide-react';
import { SUGGESTED_QUESTIONS } from '../../data/initialPrompts';

export default function SuggestedQuestions({ onSelect, disabled = false }) {
  return (
    <div className="suggested-questions-container" aria-label="Suggested questions">
      <div className="suggested-header">
        <HelpCircle size={13} className="suggested-icon" aria-hidden="true" />
        <span>Suggested Queries (Deterministic Simulation)</span>
      </div>

      <div className="chips-grid">
        {SUGGESTED_QUESTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="suggestion-chip"
            onClick={() => onSelect(item.prompt)}
            disabled={disabled}
            title={item.hint}
          >
            <div className="chip-content">
              <span className="chip-title">{item.title}</span>
              <span className="chip-hint">{item.hint}</span>
            </div>
            <ChevronRight size={13} className="chip-arrow" aria-hidden="true" />
          </button>
        ))}
      </div>

      <style>{`
        .suggested-questions-container {
          padding: 8px 12px;
          border-top: 1px solid var(--border-subtle);
          background-color: var(--campus-surface-subtle);
        }

        .suggested-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.68rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 6px;
        }

        .suggested-icon {
          color: var(--campus-sage);
        }

        .chips-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 6px;
        }

        @media (max-width: 480px) {
          .chips-grid {
            grid-template-columns: 1fr;
          }
        }

        .suggestion-chip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 10px;
          background-color: var(--campus-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          text-align: left;
          transition: all var(--transition-fast);
        }

        .suggestion-chip:hover:not(:disabled) {
          border-color: var(--campus-sage);
          background-color: var(--campus-sage-tint);
          transform: translateY(-1px);
        }

        .chip-content {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .chip-title {
          font-size: 0.74rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
        }

        .chip-hint {
          font-size: 0.64rem;
          color: var(--text-secondary);
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
        }

        .chip-arrow {
          color: var(--text-muted);
          flex-shrink: 0;
          margin-left: 4px;
        }

        .suggestion-chip:hover .chip-arrow {
          color: var(--campus-sage);
        }
      `}</style>
    </div>
  );
}
