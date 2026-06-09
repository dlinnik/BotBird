import path from 'path';
import { config } from '../config.js';
import { TelegramLink } from '../models/TelegramLink.js';
import type { IAttachment } from '../models/Attachment.js';
import type { IMessage } from '../models/Message.js';
import type { IConversation } from '../models/Conversation.js';
import type { TelegramMessageEntity } from '../types.js';
import { extractLinkLabel, extractUserDisplayName } from '../utils/extractContextFields.js';
import { isTelegramInlineLinkUrl, normalizeLinkUrl } from '../utils/extractLinkUrl.js';
import * as telegram from './telegram.js';

const HEADER_PREFIX = 'BirdBot  ';

function buildTelegramPayload(
  conversation: IConversation,
  message: IMessage,
  hasAttachments: boolean
): { text: string; entities: TelegramMessageEntity[] } {
  const displayName = extractUserDisplayName(message.context, conversation.externalUserId);
  let text = `${HEADER_PREFIX}${displayName}`;
  const entities: TelegramMessageEntity[] = [
    {
      type: 'bold',
      offset: HEADER_PREFIX.length,
      length: displayName.length,
    },
  ];

  const linkUrl = message.linkUrl ? normalizeLinkUrl(message.linkUrl) : null;

  if (linkUrl) {
    const linkLabel = extractLinkLabel(message.context);
    if (isTelegramInlineLinkUrl(linkUrl)) {
      text += `\n${linkLabel}`;
      entities.push({
        type: 'text_link',
        offset: HEADER_PREFIX.length + displayName.length + 1,
        length: linkLabel.length,
        url: linkUrl,
      });
    } else {
      // localhost/private URLs: Telegram rejects text_link; plain URL may still be linkified by client
      text += `\n${linkLabel}\n${linkUrl}`;
    }
  }

  const body = message.text || (hasAttachments ? '(вложения)' : '');
  if (body) {
    text += `\n\n${body}`;
  }

  return { text, entities };
}

export async function forwardUserMessageToTelegram(
  conversation: IConversation,
  message: IMessage,
  attachments: IAttachment[]
): Promise<void> {
  if (!telegram.isTelegramConfigured()) return;

  const chatId = config.telegram.groupId;
  const { text, entities } = buildTelegramPayload(conversation, message, attachments.length > 0);

  const cardMsg = await telegram.sendTextMessage(chatId, text, undefined, undefined, entities);

  await TelegramLink.create({
    appId: conversation.appId,
    conversationId: conversation._id,
    birdbotMessageId: message._id,
    telegramChatId: String(cardMsg.chat.id),
    telegramMessageId: cardMsg.message_id,
    linkType: 'text',
  });

  for (const att of attachments) {
    const filePath = path.join(config.uploadDir, att.storagePath);
    const isImage = att.mimeType.startsWith('image/');
    const caption = att.originalName;

    const tgMsg = isImage
      ? await telegram.sendPhoto(chatId, filePath, caption, cardMsg.message_id)
      : await telegram.sendDocument(chatId, filePath, caption, cardMsg.message_id);

    await TelegramLink.create({
      appId: conversation.appId,
      conversationId: conversation._id,
      birdbotMessageId: message._id,
      telegramChatId: String(tgMsg.chat.id),
      telegramMessageId: tgMsg.message_id,
      linkType: isImage ? 'photo' : 'document',
    });
  }
}
