export type MessageRole = 'user' | 'operator' | 'assistant';

export interface AttachmentDto {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface MessageMetaDto {
  source?: 'web' | 'telegram';
  replyToMessageId?: string;
  operatorName?: string;
  operatorUsername?: string;
}

export interface MessageDto {
  id: string;
  role: MessageRole;
  text: string;
  attachments: AttachmentDto[];
  meta?: MessageMetaDto;
  createdAt: string;
}

export interface HostInitMessage {
  type: 'birdbot:init';
  token: string;
  context: Record<string, unknown>;
}

export interface HostContextMessage {
  type: 'birdbot:context';
  context: Record<string, unknown>;
}

export type HostMessage = HostInitMessage | HostContextMessage;

export interface WidgetAuth {
  token: string;
  context: Record<string, unknown>;
}

export type ListState = 'loading' | 'empty' | 'ready' | 'error';

export interface PendingMessage {
  tempId: string;
  text: string;
  attachments: AttachmentDto[];
  status: 'sending' | 'error';
  error?: string;
}

export interface DraftAttachment {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadProgress?: number;
  uploading: boolean;
}
