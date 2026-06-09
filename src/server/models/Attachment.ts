import mongoose, { type Document, Schema, type Model, type Types } from 'mongoose';
import type { AttachmentSource } from '../types.js';

export interface IAttachment extends Document {
  appId: string;
  externalUserId: string;
  conversationId?: Types.ObjectId;
  messageId?: Types.ObjectId | null;
  originalName: string;
  mimeType: string;
  size: number;
  storagePath: string;
  source: AttachmentSource;
  createdAt: Date;
}

const attachmentSchema = new Schema<IAttachment>(
  {
    appId: { type: String, required: true },
    externalUserId: { type: String, required: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation' },
    messageId: { type: Schema.Types.ObjectId, ref: 'Message', default: null },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    storagePath: { type: String, required: true },
    source: { type: String, enum: ['web', 'telegram'], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Attachment: Model<IAttachment> = mongoose.model<IAttachment>('Attachment', attachmentSchema);
