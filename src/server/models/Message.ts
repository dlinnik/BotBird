import mongoose, { type Document, Schema, type Model, type Types } from 'mongoose';
import type { MessageRole, MessageSource } from '../types.js';

export interface IMessageMeta {
  source?: MessageSource;
  telegramMessageId?: number;
  replyToTelegramMessageId?: number;
  replyToMessageId?: Types.ObjectId;
  operatorTelegramId?: number;
  operatorUsername?: string;
  operatorName?: string;
}

export interface IMessage extends Document {
  conversationId: Types.ObjectId;
  role: MessageRole;
  text: string;
  attachmentIds: Types.ObjectId[];
  linkUrl?: string | null;
  context?: Record<string, unknown>;
  meta?: IMessageMeta;
  createdAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    role: { type: String, enum: ['user', 'operator'], required: true },
    text: { type: String, default: '' },
    attachmentIds: [{ type: Schema.Types.ObjectId, ref: 'Attachment' }],
    linkUrl: { type: String, default: null },
    context: { type: Schema.Types.Mixed },
    meta: {
      source: { type: String, enum: ['web', 'telegram'] },
      telegramMessageId: Number,
      replyToTelegramMessageId: Number,
      replyToMessageId: Schema.Types.ObjectId,
      operatorTelegramId: Number,
      operatorUsername: String,
      operatorName: String,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ 'meta.telegramMessageId': 1 }, { unique: true, sparse: true });

export const Message: Model<IMessage> = mongoose.model<IMessage>('Message', messageSchema);
