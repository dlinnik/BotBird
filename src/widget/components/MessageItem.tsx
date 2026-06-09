import React from 'react';
import { Spin, Tag, Typography } from 'antd';
import type { MessageDto, PendingMessage } from '../types';
import { formatMessageTime } from '../utils/formatTime';
import { AttachmentPreview } from './AttachmentPreview';

interface MessageItemProps {
  message: MessageDto | PendingMessage;
  token: string;
  isPending?: boolean;
}

const threadRowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  marginBottom: 16,
  width: '100%',
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#8c8c8c',
  marginBottom: 4,
};

const bubbleBaseStyle: React.CSSProperties = {
  borderRadius: 8,
  padding: '10px 14px',
  width: '100%',
  fontSize: 14,
  boxSizing: 'border-box',
};

const timeStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#bfbfbf',
  marginTop: 4,
};

function isPendingMessage(msg: MessageDto | PendingMessage): msg is PendingMessage {
  return 'tempId' in msg;
}

function getAgentLabel(message: MessageDto): string {
  if (message.role === 'assistant') {
    return 'Ассистент';
  }
  return 'Техподдержка';
}

function getAgentBubbleStyle(): React.CSSProperties {
  return {
    ...bubbleBaseStyle,
    background: '#f5f5f5',
    border: '1px solid #ebebeb',
  };
}

function getUserBubbleStyle(): React.CSSProperties {
  return {
    ...bubbleBaseStyle,
    background: '#e6f4ff',
    border: '1px solid #d6ebff',
  };
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, token, isPending }) => {
  if (isPending || isPendingMessage(message)) {
    const pending = message as PendingMessage;
    return (
      <div style={threadRowStyle}>
        <span style={labelStyle}>Вы</span>
        <div style={getUserBubbleStyle()}>
          {pending.status === 'sending' ? (
            <span>
              <Spin size="small" style={{ marginRight: 8 }} />
              Отправка...
            </span>
          ) : (
            pending.text || '(вложения)'
          )}
        </div>
      </div>
    );
  }

  if (message.role === 'user') {
    return (
      <div style={threadRowStyle}>
        <span style={labelStyle}>Вы</span>
        <div style={getUserBubbleStyle()}>
          {message.text && (
            <Typography.Paragraph style={{ marginBottom: message.attachments.length ? 8 : 0, whiteSpace: 'pre-wrap' }}>
              {message.text}
            </Typography.Paragraph>
          )}
          {message.attachments.map((att) => (
            <AttachmentPreview key={att.id} attachment={att} token={token} />
          ))}
          <div style={timeStyle}>{formatMessageTime(message.createdAt)}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={threadRowStyle}>
      <span style={labelStyle}>{getAgentLabel(message)}</span>
      <div style={getAgentBubbleStyle()}>
        {message.meta?.replyToMessageId && (
          <Tag style={{ marginBottom: 8 }}>↩ ответ на ваше сообщение</Tag>
        )}
        {message.text && (
          <Typography.Paragraph style={{ marginBottom: message.attachments.length ? 8 : 0, whiteSpace: 'pre-wrap' }}>
            {message.text}
          </Typography.Paragraph>
        )}
        {message.attachments.map((att) => (
          <AttachmentPreview key={att.id} attachment={att} token={token} />
        ))}
        <div style={timeStyle}>{formatMessageTime(message.createdAt)}</div>
      </div>
    </div>
  );
};
