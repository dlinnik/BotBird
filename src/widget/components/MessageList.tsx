import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Empty, Result, Spin } from 'antd';
import type { ListState, MessageDto, PendingMessage } from '../types';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  state: ListState;
  messages: MessageDto[];
  pending: PendingMessage | null;
  token: string;
  panelOpen: boolean;
  onRetry: () => void;
  onNewMessagesBadge?: boolean;
  onScrollToBottom?: () => void;
}

const SCROLL_THRESHOLD = 50;

export const MessageList: React.FC<MessageListProps> = ({
  state,
  messages,
  pending,
  token,
  panelOpen,
  onRetry,
  onNewMessagesBadge,
  onScrollToBottom,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showBadge, setShowBadge] = useState(false);
  const isAtBottomRef = useRef(true);

  const checkAtBottom = useCallback((): boolean => {
    const el = containerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= SCROLL_THRESHOLD;
  }, []);

  const scrollToBottom = useCallback((smooth = false): void => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    setShowBadge(false);
    onScrollToBottom?.();
  }, [onScrollToBottom]);

  useEffect(() => {
    if (state === 'ready' && isAtBottomRef.current) {
      scrollToBottom();
    }
  }, [messages.length, pending, state, scrollToBottom]);

  useEffect(() => {
    if (!onNewMessagesBadge || !panelOpen) return;

    if (checkAtBottom()) {
      scrollToBottom(true);
    } else {
      setShowBadge(true);
    }
  }, [onNewMessagesBadge, panelOpen, checkAtBottom, scrollToBottom]);

  const handleScroll = (): void => {
    const atBottom = checkAtBottom();
    if (panelOpen && atBottom && !isAtBottomRef.current) {
      onScrollToBottom?.();
    }
    isAtBottomRef.current = atBottom;
    if (atBottom) setShowBadge(false);
  };

  if (state === 'loading') {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin tip="Загрузка..." />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Result
          status="error"
          title="Не удалось загрузить сообщения"
          extra={
            <a onClick={onRetry} role="button" tabIndex={0}>
              Повторить
            </a>
          }
        />
      </div>
    );
  }

  if (state === 'empty' && !pending) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Empty description="Задайте вопрос — поддержка ответит в ближайшее время" />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{ height: '100%', overflowY: 'auto', padding: 16 }}
      >
        {messages.map((msg) => (
          <MessageItem key={msg.id} message={msg} token={token} />
        ))}
        {pending && <MessageItem message={pending} token={token} isPending />}
      </div>
      {showBadge && (
        <button
          type="button"
          onClick={() => scrollToBottom(true)}
          style={{
            position: 'absolute',
            bottom: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1890ff',
            color: '#fff',
            border: 'none',
            borderRadius: 16,
            padding: '6px 16px',
            cursor: 'pointer',
            fontSize: 13,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          Новые сообщения
        </button>
      )}
    </div>
  );
};
