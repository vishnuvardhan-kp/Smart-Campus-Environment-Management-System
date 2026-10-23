import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

const MAX_CHAR_LIMIT = 500;

export default function ChatInput({ onSendMessage, isLoading = false, placeholder = 'Ask about campus environment...' }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  const trimmed = text.trim();
  const isSendDisabled = isLoading || trimmed.length === 0;

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (isSendDisabled) return;

    onSendMessage(trimmed);
    setText('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e) => {
    const val = e.target.value;
    if (val.length <= MAX_CHAR_LIMIT) {
      setText(val);
      // Auto-grow height up to 100px
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`;
      }
    }
  };

  return (
    <form className="chat-input-form" onSubmit={handleSubmit}>
      <div className="input-box-wrapper">
        <textarea
          ref={textareaRef}
          className="chat-textarea"
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={isLoading}
          aria-label="Message input"
        />

        <div className="input-footer">
          {text.length > 350 && (
            <span className="char-counter">
              {text.length}/{MAX_CHAR_LIMIT}
            </span>
          )}

          <button
            type="submit"
            className="send-button"
            disabled={isSendDisabled}
            title={isSendDisabled ? 'Enter a message to send' : 'Send message (Enter)'}
            aria-label="Send message"
          >
            <Send size={15} />
          </button>
        </div>
      </div>

      <style>{`
        .chat-input-form {
          padding: 10px 12px;
          background-color: var(--campus-surface, #FFFFFF);
          border-top: 1px solid var(--border-subtle, #E3E8E3);
          border-bottom-left-radius: inherit;
          border-bottom-right-radius: inherit;
          flex-shrink: 0;
          box-sizing: border-box;
        }

        .input-box-wrapper {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          background-color: var(--campus-surface-subtle, #F9FAF8);
          border: 1px solid var(--border-medium, #D0D7D0);
          border-radius: var(--radius-md, 10px);
          padding: 6px 8px 6px 12px;
          box-sizing: border-box;
          transition: border-color 150ms ease, box-shadow 150ms ease, background-color 150ms ease;
        }

        .input-box-wrapper:focus-within {
          border-color: var(--campus-sage, #7A9474);
          box-shadow: 0 0 0 2px rgba(122, 148, 116, 0.2);
          background-color: var(--campus-surface, #FFFFFF);
        }

        .chat-textarea {
          flex: 1;
          border: none;
          background: transparent;
          font-family: inherit;
          font-size: 0.86rem;
          color: var(--text-primary, #202925);
          resize: none;
          padding: 4px 0;
          line-height: 1.4;
          max-height: 80px;
          outline: none;
          box-sizing: border-box;
        }

        .chat-textarea::placeholder {
          color: var(--text-muted, #8E9690);
        }

        .input-footer {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .char-counter {
          font-size: 0.65rem;
          color: var(--text-muted, #8E9690);
        }

        .send-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: var(--radius-sm, 6px);
          background-color: var(--campus-sage, #7A9474);
          color: var(--text-inverse, #FFFFFF);
          border: none;
          cursor: pointer;
          transition: background-color 150ms ease, transform 150ms ease;
        }

        .send-button:hover:not(:disabled) {
          background-color: var(--campus-sage-dark, #5A7454);
          transform: translateY(-1px);
        }

        .send-button:disabled {
          background-color: var(--border-medium, #D0D7D0);
          color: var(--text-muted, #8E9690);
          cursor: not-allowed;
          transform: none;
        }
      `}</style>
    </form>
  );
}
