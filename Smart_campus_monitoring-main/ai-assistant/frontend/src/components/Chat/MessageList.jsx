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
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          background-color: var(--campus-bg);
          scroll-behavior: smooth;
        }

        /* Scrollbar styling */
        .message-list-viewport::-webkit-scrollbar {
          width: 6px;
        }
        .message-list-viewport::-webkit-scrollbar-track {
          background: transparent;
        }
        .message-list-viewport::-webkit-scrollbar-thumb {
          background-color: var(--border-medium);
          border-radius: var(--radius-full);
        }
      `}</style>
    </div>
  );
}
