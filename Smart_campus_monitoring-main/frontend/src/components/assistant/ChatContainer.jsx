import React, { useState, useEffect } from 'react';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import SuggestedQuestions from './SuggestedQuestions';
import ChatInput from './ChatInput';
import ProvenanceBadge from './ProvenanceBadge';
import { INITIAL_ASSISTANT_MESSAGE } from '../../data/initialPrompts';
import { checkBackendHealth, sendChatMessage } from '../../services/assistantService';

export default function ChatContainer({
  isExpanded = false,
  onToggleExpand,
  onClose,
  className = ''
}) {
  const [messages, setMessages] = useState([INITIAL_ASSISTANT_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [avatarState, setAvatarState] = useState('idle');
  const [isOnline, setIsOnline] = useState(true);
  const [dbStatus, setDbStatus] = useState({ connected: true, name: 'smart_campus' });
  const [latestProvenance, setLatestProvenance] = useState(INITIAL_ASSISTANT_MESSAGE.provenance);

  // Health check: Poll backend and MongoDB connectivity
  useEffect(() => {
    let isMounted = true;

    const runHealthCheck = async () => {
      const result = await checkBackendHealth();
      if (isMounted) {
        setIsOnline(result.isOnline);
        if (result.isOnline && result.data?.database) {
          setDbStatus({
            connected: result.data.database.connected,
            name: result.data.database.name || 'smart_campus',
            currentRecords: result.data.database.currentEnvironmentRecords,
            historyRecords: result.data.database.historyRecords
          });
        } else {
          setDbStatus({ connected: false, name: null });
        }
      }
    };

    runHealthCheck();
    const intervalId = setInterval(runHealthCheck, 10000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const handleSendMessage = async (text) => {
    if (!text || !text.trim() || isLoading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setAvatarState('thinking');

    try {
      const response = await sendChatMessage(text.trim());

      const botMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: response.reply,
        metrics: response.metrics || [],
        recordsSummary: response.recordsSummary || [],
        provenance: response.provenance || null,
        modelUsed: response.modelUsed || null,
        notice: response.notice || null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      if (response.provenance) {
        setLatestProvenance(response.provenance);
      }

      setMessages((prev) => [...prev, botMessage]);
      setIsOnline(true);

      // Transition avatar to responding state for 2.4s
      setAvatarState('responding');
      setTimeout(() => {
        setAvatarState('idle');
      }, 2400);
    } catch (err) {
      console.warn('[Assistant Service Error]:', err.message);

      const errorMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        isError: true,
        text: `Unable to retrieve sensor data: ${err.message}.\n\nNotice: Data integrity protection is active. No environmental readings are fabricated while the database service is unavailable.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, errorMessage]);
      setIsOnline(false);
      setAvatarState('idle');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        ...INITIAL_ASSISTANT_MESSAGE,
        id: `msg-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setAvatarState('idle');
  };

  return (
    <div className={`chat-container-root ${isExpanded ? 'is-expanded' : 'is-compact'} ${className}`}>
      <ChatHeader
        avatarState={avatarState}
        isOnline={isOnline}
        dbStatus={dbStatus}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
        onClearChat={handleClearChat}
        onClose={onClose}
        hasMessages={messages.length > 1}
      />

      <ProvenanceBadge provenance={latestProvenance} variant="banner" />

      <MessageList messages={messages} isLoading={isLoading} />

      <SuggestedQuestions onSelect={handleSendMessage} disabled={isLoading} />

      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />

      <style>{`
        .chat-container-root {
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
          min-height: 0;
          background-color: var(--campus-surface, #FFFFFF);
          border-radius: inherit;
          overflow: hidden;
          position: relative;
          box-sizing: border-box;
          isolation: isolate;
        }

        .chat-container-root.full-page-chat {
          border: 1px solid var(--border-color, #E2E6E1);
          border-radius: 12px;
          box-shadow: 0 4px 16px rgba(32, 41, 37, 0.05);
        }
      `}</style>
    </div>
  );
}
