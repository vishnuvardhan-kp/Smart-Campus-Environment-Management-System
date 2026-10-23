import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

export default function MessageList({ messages = [], isLoading = false }) {
  const messagesEndRef = useRef(null);

  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages, isLoading]);

  return (
    <div className="message-list-viewport" role="log" aria-live="polite">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {isLoading && <TypingIndicator />}

      <div ref={messagesEndRef} aria-hidden="true" />

      <style>{`
        .message-list-viewport {
          flex: 1 1 0%;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background-color: var(--campus-bg, #F5F6F2);
          scroll-behavior: smooth;
          box-sizing: border-box;
        }

        /* Scrollbar styling */
        .message-list-viewport::-webkit-scrollbar {
          width: 6px;
        }
        .message-list-viewport::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.02);
        }
        .message-list-viewport::-webkit-scrollbar-thumb {
          background-color: var(--border-medium, #D0D7D0);
          border-radius: 9999px;
        }
        .message-list-viewport::-webkit-scrollbar-thumb:hover {
          background-color: var(--campus-sage, #7A9474);
        }
      `}</style>
    </div>
  );
}
