import mongoose, { type Document, Schema, type Model, type Types } from 'mongoose';
import type { TelegramLinkType } from '../types.js';

export interface ITelegramLink extends Document {
  appId: string;
  conversationId: Types.ObjectId;
  birdbotMessageId: Types.ObjectId;
  telegramChatId: string;
  telegramMessageId: number;
  linkType: TelegramLinkType;
  createdAt: Date;
}

const telegramLinkSchema = new Schema<ITelegramLink>(
  {
    appId: { type: String, required: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    birdbotMessageId: { type: Schema.Types.ObjectId, ref: 'Message', required: true },
    telegramChatId: { type: String, required: true },
    telegramMessageId: { type: Number, required: true },
    linkType: { type: String, enum: ['text', 'photo', 'document'], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

telegramLinkSchema.index({ telegramChatId: 1, telegramMessageId: 1 }, { unique: true });

export const TelegramLink: Model<ITelegramLink> = mongoose.model<ITelegramLink>(
  'TelegramLink',
  telegramLinkSchema
);
