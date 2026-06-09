import type { Types } from 'mongoose';

export type MessageRole = 'user' | 'operator';
export type MessageSource = 'web' | 'telegram';
export type TelegramLinkType = 'text' | 'photo' | 'document';

export interface TelegramMessageEntity {
  type: 'bold' | 'text_link';
  offset: number;
  length: number;
  url?: string;
}
export type AttachmentSource = 'web' | 'telegram';

export interface AuthContext {
  externalUserId: string;
}

export interface MessageMetaDto {
  source?: MessageSource;
  telegramMessageId?: number;
  replyToTelegramMessageId?: number;
  replyToMessageId?: string;
  operatorTelegramId?: number;
  operatorUsername?: string;
  operatorName?: string;
}

export interface AttachmentDto {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface MessageDto {
  id: string;
  role: MessageRole;
  text: string;
  attachments: AttachmentDto[];
  context?: Record<string, unknown>;
  meta?: MessageMetaDto;
  createdAt: string;
}

export interface ConversationDto {
  id: string;
  appId: string;
  externalUserId: string;
  lastContext: Record<string, unknown>;
  lastMessageAt: string | null;
  createdAt: string;
}

export interface CreateMessageBody {
  text?: string;
  attachmentIds?: string[];
  context?: Record<string, unknown>;
}

export interface TelegramUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: { id: number | string };
  text?: string;
  caption?: string;
  photo?: Array<{ file_id: string; file_size?: number }>;
  document?: {
    file_id: string;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
  };
  reply_to_message?: TelegramMessage;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
      conversation?: {
        _id: Types.ObjectId;
        appId: string;
        externalUserId: string;
        lastContext: Record<string, unknown>;
      };
    }
  }
}
