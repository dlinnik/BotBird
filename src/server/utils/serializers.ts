import type { Types } from 'mongoose';
import type { IAttachment } from '../models/Attachment.js';
import type { IMessage } from '../models/Message.js';
import type { IConversation } from '../models/Conversation.js';
import type { AttachmentDto, ConversationDto, MessageDto } from '../types.js';

export function toAttachmentDto(doc: IAttachment | { _id: Types.ObjectId; originalName: string; mimeType: string; size: number }): AttachmentDto {
  return {
    id: doc._id.toString(),
    originalName: doc.originalName,
    mimeType: doc.mimeType,
    size: doc.size,
  };
}

export function toMessageDto(
  doc: IMessage,
  attachments: AttachmentDto[] = []
): MessageDto {
  const meta = doc.meta;
  const metaDto = meta
    ? {
        ...(meta.source !== undefined && { source: meta.source }),
        ...(meta.telegramMessageId !== undefined && { telegramMessageId: meta.telegramMessageId }),
        ...(meta.replyToTelegramMessageId !== undefined && {
          replyToTelegramMessageId: meta.replyToTelegramMessageId,
        }),
        ...(meta.replyToMessageId !== undefined && {
          replyToMessageId: meta.replyToMessageId.toString(),
        }),
      }
    : undefined;

  return {
    id: doc._id.toString(),
    role: doc.role,
    text: doc.text,
    attachments,
    ...(doc.context !== undefined && { context: doc.context as Record<string, unknown> }),
    ...(metaDto && Object.keys(metaDto).length > 0 && { meta: metaDto }),
    createdAt: doc.createdAt.toISOString(),
  };
}

export function toConversationDto(doc: IConversation): ConversationDto {
  return {
    id: doc._id.toString(),
    appId: doc.appId,
    externalUserId: doc.externalUserId,
    lastContext: (doc.lastContext ?? {}) as Record<string, unknown>,
    lastMessageAt: doc.lastMessageAt ? doc.lastMessageAt.toISOString() : null,
    createdAt: doc.createdAt.toISOString(),
  };
}
