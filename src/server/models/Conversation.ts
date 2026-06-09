import mongoose, { type Document, Schema, type Model, type Types } from 'mongoose';

export interface IConversation extends Document {
  appId: string;
  externalUserId: string;
  lastContext: Record<string, unknown>;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    appId: { type: String, required: true },
    externalUserId: { type: String, required: true },
    lastContext: { type: Schema.Types.Mixed, default: {} },
    lastMessageAt: { type: Date },
  },
  { timestamps: true }
);

conversationSchema.index({ appId: 1, externalUserId: 1 }, { unique: true });

export const Conversation: Model<IConversation> = mongoose.model<IConversation>(
  'Conversation',
  conversationSchema
);

export type ConversationLean = {
  _id: Types.ObjectId;
  appId: string;
  externalUserId: string;
  lastContext: Record<string, unknown>;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};
