import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Layout } from 'antd';
import type { ListState, MessageDto, PendingMessage, WidgetAuth } from '../types';
import {
  fetchMessages,
  patchConversation,
  pollMessages,
  sendMessage,
} from '../api/client';
import { WidgetHeader } from './WidgetHeader';
import { MessageList } from './MessageList';
import { MessageComposer } from './MessageComposer';
import {
  playIncomingMessageSound,
  unlockMessageNotificationSound,
} from '../utils/messageNotificationSound';
import { notifyHostUnread } from '../utils/notifyHostUnread';

const POLL_INTERVAL_MS = 8000;

interface WidgetShellProps {
  auth: WidgetAuth;
  panelOpen: boolean;
}

export const WidgetShell: React.FC<WidgetShellProps> = ({ auth, panelOpen }) => {
  const [listState, setListState] = useState<ListState>('loading');
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [pending, setPending] = useState<PendingMessage | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [newPollFlag, setNewPollFlag] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contextRef = useRef<Record<string, unknown>>({});
  const panelOpenRef = useRef(panelOpen);
  const token = auth.token;

  contextRef.current = auth.context;
  panelOpenRef.current = panelOpen;

  const loadMessages = useCallback(async (): Promise<void> => {
    setListState('loading');
    try {
      await patchConversation(token, contextRef.current);
      const data = await fetchMessages(token);
      setMessages(data);
      setListState(data.length === 0 ? 'empty' : 'ready');
    } catch {
      setListState('error');
    }
  }, [token]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (panelOpen) {
      void unlockMessageNotificationSound();
      textareaRef.current?.focus();
      notifyHostUnread(false);
    }
  }, [panelOpen]);

  useEffect(() => {
    if (listState === 'loading' || listState === 'error') return;

    const interval = setInterval(async () => {
      try {
        const lastId = messages.length > 0 ? messages[messages.length - 1]?.id : undefined;
        const newMsgs = await pollMessages(token, lastId);
        if (newMsgs.length > 0) {
          const incoming = newMsgs.filter((m) => m.role === 'operator');
          if (incoming.length > 0) {
            void playIncomingMessageSound();
            if (!panelOpenRef.current) {
              notifyHostUnread(true);
            }
          }

          setMessages((prev) => {
            const ids = new Set(prev.map((m) => m.id));
            const merged = [...prev, ...newMsgs.filter((m) => !ids.has(m.id))];
            return merged;
          });
          setNewPollFlag((v) => !v);
          if (listState === 'empty') setListState('ready');
        }
      } catch {
        /* silent poll errors */
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [listState, messages, token]);

  const handleClose = (): void => {
    window.parent.postMessage({ type: 'birdbot:request-close' }, '*');
  };

  const handleSend = async (text: string, attachmentIds: string[]): Promise<void> => {
    setSendError(null);
    const tempId = `pending-${Date.now()}`;
    setPending({ tempId, text, attachments: [], status: 'sending' });

    try {
      const created = await sendMessage(token, {
        text,
        attachmentIds,
        context: contextRef.current,
      });
      setPending(null);
      setMessages((prev) => [...prev, created]);
      if (listState === 'empty') setListState('ready');
    } catch (err) {
      setPending({ tempId, text, attachments: [], status: 'error', error: 'Ошибка отправки' });
      setSendError('Не удалось отправить сообщение');
      throw err;
    }
  };

  const handleRetrySend = (): void => {
    if (pending?.status === 'error') {
      void handleSend(pending.text, []);
    }
  };

  return (
    <Layout style={{ height: '100vh', background: '#fff' }}>
      <WidgetHeader onClose={handleClose} />
      <Layout.Content style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <MessageList
          state={listState}
          messages={messages}
          pending={pending}
          token={token}
          panelOpen={panelOpen}
          onRetry={() => void loadMessages()}
          onNewMessagesBadge={newPollFlag}
          onScrollToBottom={() => {
            if (panelOpenRef.current) notifyHostUnread(false);
          }}
        />
        {sendError && pending?.status === 'error' && (
          <div style={{ padding: '0 16px' }}>
            <Alert
              type="error"
              message={sendError}
              action={
                <a onClick={handleRetrySend} role="button" tabIndex={0}>
                  Повторить
                </a>
              }
              closable
              onClose={() => setSendError(null)}
            />
          </div>
        )}
        <MessageComposer
          token={token}
          onSend={handleSend}
          textareaRef={textareaRef}
        />
      </Layout.Content>
    </Layout>
  );
};
