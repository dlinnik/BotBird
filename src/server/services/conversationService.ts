import type { Types } from 'mongoose';
import { Conversation } from '../models/Conversation.js';
import { Attachment, type IAttachment } from '../models/Attachment.js';
import type { AuthContext } from '../types.js';
import { BIRDBOT_SCOPE } from '../constants.js';

export async function getOrCreateConversation(auth: AuthContext) {
  let conversation = await Conversation.findOne({
    appId: BIRDBOT_SCOPE,
    externalUserId: auth.externalUserId,
  });

  if (!conversation) {
    conversation = await Conversation.create({
      appId: BIRDBOT_SCOPE,
      externalUserId: auth.externalUserId,
      lastContext: {},
    });
  }

  return conversation;
}

export async function loadAttachmentsForMessages(
  messageIds: Types.ObjectId[]
): Promise<Map<string, IAttachment[]>> {
  const attachments = await Attachment.find({
    messageId: { $in: messageIds },
  });

  const map = new Map<string, IAttachment[]>();
  for (const att of attachments) {
    const key = att.messageId?.toString();
    if (!key) continue;
    const list = map.get(key) ?? [];
    list.push(att);
    map.set(key, list);
  }
  return map;
}
