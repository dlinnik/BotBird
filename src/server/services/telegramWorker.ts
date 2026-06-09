import { Types } from 'mongoose';
import { config } from '../config.js';
import { Attachment } from '../models/Attachment.js';
import { Message } from '../models/Message.js';
import { TelegramLink } from '../models/TelegramLink.js';
import type { TelegramMessage } from '../types.js';
import { saveBuffer } from './fileStorage.js';
import * as telegram from './telegram.js';

let offset = 0;
let running = false;
let pollAbort: AbortController | null = null;
let conflictCount = 0;

async function getConversationExternalUserId(conversationId: Types.ObjectId): Promise<string> {
  const { Conversation } = await import('../models/Conversation.js');
  const conversation = await Conversation.findById(conversationId).lean();
  return conversation?.externalUserId ?? '';
}

async function handlePhotoReply(
  tgMessage: TelegramMessage,
  link: { appId: string; conversationId: Types.ObjectId; birdbotMessageId: Types.ObjectId }
): Promise<void> {
  const photos = tgMessage.photo;
  if (!photos || photos.length === 0) return;

  const largest = photos[photos.length - 1];
  if (!largest) return;

  const fileInfo = await telegram.getFile(largest.file_id);
  const buffer = await telegram.downloadFile(fileInfo.file_path);
  const externalUserId = await getConversationExternalUserId(link.conversationId);

  const attachmentId = new Types.ObjectId();
  const originalName = `photo_${tgMessage.message_id}.jpg`;
  const storagePath = await saveBuffer(link.appId, attachmentId.toString(), originalName, buffer);

  const attachment = await Attachment.create({
    _id: attachmentId,
    appId: link.appId,
    externalUserId,
    conversationId: link.conversationId,
    messageId: null,
    originalName,
    mimeType: 'image/jpeg',
    size: buffer.length,
    storagePath,
    source: 'telegram',
  });

  await createOperatorMessage(tgMessage, link, [attachment._id], tgMessage.caption ?? '');
}

async function handleDocumentReply(
  tgMessage: TelegramMessage,
  link: { appId: string; conversationId: Types.ObjectId; birdbotMessageId: Types.ObjectId }
): Promise<void> {
  const doc = tgMessage.document;
  if (!doc) return;

  const fileInfo = await telegram.getFile(doc.file_id);
  const buffer = await telegram.downloadFile(fileInfo.file_path);
  const originalName = doc.file_name ?? `document_${tgMessage.message_id}`;
  const externalUserId = await getConversationExternalUserId(link.conversationId);

  const attachmentId = new Types.ObjectId();
  const storagePath = await saveBuffer(link.appId, attachmentId.toString(), originalName, buffer);

  const attachment = await Attachment.create({
    _id: attachmentId,
    appId: link.appId,
    externalUserId,
    conversationId: link.conversationId,
    messageId: null,
    originalName,
    mimeType: doc.mime_type ?? 'application/octet-stream',
    size: buffer.length,
    storagePath,
    source: 'telegram',
  });

  await createOperatorMessage(tgMessage, link, [attachment._id], tgMessage.caption ?? '');
}

async function createOperatorMessage(
  tgMessage: TelegramMessage,
  link: { birdbotMessageId: Types.ObjectId; conversationId: Types.ObjectId },
  attachmentIds: Types.ObjectId[],
  text: string
): Promise<void> {
  const from = tgMessage.from;
  const operatorName = from ? telegram.getOperatorDisplayName(from) : 'Поддержка';

  const message = await Message.create({
    conversationId: link.conversationId,
    role: 'operator',
    text,
    attachmentIds,
    meta: {
      source: 'telegram',
      telegramMessageId: tgMessage.message_id,
      replyToTelegramMessageId: tgMessage.reply_to_message?.message_id,
      replyToMessageId: link.birdbotMessageId,
      operatorTelegramId: from?.id,
      operatorUsername: from?.username,
      operatorName,
    },
  });

  if (attachmentIds.length > 0) {
    await Attachment.updateMany({ _id: { $in: attachmentIds } }, { messageId: message._id });
  }

  const { Conversation } = await import('../models/Conversation.js');
  await Conversation.updateOne(
    { _id: link.conversationId },
    { lastMessageAt: message.createdAt }
  );
}

async function processMessage(tgMessage: TelegramMessage): Promise<void> {
  const chatId = String(tgMessage.chat.id);
  if (chatId !== config.telegram.groupId) return;

  const replyTo = tgMessage.reply_to_message;
  if (!replyTo) return;

  const existing = await Message.findOne({ 'meta.telegramMessageId': tgMessage.message_id }).lean();
  if (existing) return;

  const link = await TelegramLink.findOne({
    telegramChatId: chatId,
    telegramMessageId: replyTo.message_id,
  }).lean();

  if (!link) return;

  if (tgMessage.photo && tgMessage.photo.length > 0) {
    await handlePhotoReply(tgMessage, link);
    return;
  }

  if (tgMessage.document) {
    await handleDocumentReply(tgMessage, link);
    return;
  }

  if (tgMessage.text) {
    await createOperatorMessage(tgMessage, link, [], tgMessage.text);
  }
}

function logPollingConflict(): void {
  conflictCount += 1;
  if (conflictCount === 1 || conflictCount % 10 === 0) {
    console.error(
      '[Telegram] Polling conflict — another getUpdates uses this bot token. ' +
        'Stop other BirdBot/npm run dev instances, remote deploys with the same TELEGRAM_BOT_TOKEN, or remove webhook.'
    );
  }
}

async function pollLoop(): Promise<void> {
  while (running) {
    pollAbort = new AbortController();
    try {
      const updates = await telegram.getUpdates(offset, 30, pollAbort.signal);
      conflictCount = 0;
      for (const update of updates) {
        offset = update.update_id + 1;
        if (update.message) {
          await processMessage(update.message);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isAbort =
        err instanceof Error &&
        (err.name === 'AbortError' || message.includes('aborted'));
      const isConflict = message.includes('Conflict');

      if (isConflict) {
        logPollingConflict();
      } else if (!isAbort) {
        console.error('[Telegram] Polling error:', message);
      }

      if (!running) break;

      const delayMs = isAbort ? 500 : isConflict ? 5000 : 3000;
      await new Promise((r) => setTimeout(r, delayMs));
    } finally {
      pollAbort = null;
    }
  }
}

export function startTelegramWorker(): void {
  if (!telegram.isTelegramConfigured()) {
    console.warn('[Telegram] Worker not started — missing configuration');
    return;
  }

  if (running) {
    console.warn('[Telegram] Polling worker already running');
    return;
  }

  running = true;
  void pollLoop();
  console.log('[Telegram] Polling worker started');
}

export function stopTelegramWorker(): void {
  running = false;
  pollAbort?.abort();
}
