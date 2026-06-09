import { Router } from 'express';
import { Types } from 'mongoose';
import { config } from '../config.js';
import { BIRDBOT_SCOPE } from '../constants.js';
import { authMiddleware } from '../middleware/auth.js';
import { messageRateLimit } from '../middleware/rateLimit.js';
import { Attachment } from '../models/Attachment.js';
import { Message, type IMessage } from '../models/Message.js';
import {
  getOrCreateConversation,
  loadAttachmentsForMessages,
} from '../services/conversationService.js';
import { forwardUserMessageToTelegram } from '../services/telegramOutbound.js';
import type { CreateMessageBody } from '../types.js';
import { toAttachmentDto, toMessageDto } from '../utils/serializers.js';
import { extractLinkUrl } from '../utils/extractLinkUrl.js';

const router = Router();

router.use(authMiddleware);

async function buildMessageDtos(messages: IMessage[]) {
  const ids = messages.map((m) => m._id);
  const attMap = await loadAttachmentsForMessages(ids);
  return messages.map((m) => {
    const atts = (attMap.get(m._id.toString()) ?? []).map(toAttachmentDto);
    return toMessageDto(m, atts);
  });
}

router.get('/', async (req, res, next) => {
  try {
    const auth = req.auth!;
    const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10) || 50, 100);
    const before = req.query.before as string | undefined;

    const conversation = await getOrCreateConversation(auth);

    const filter: Record<string, unknown> = { conversationId: conversation._id };

    if (before && Types.ObjectId.isValid(before)) {
      const beforeMsg = await Message.findOne({
        _id: before,
        conversationId: conversation._id,
      });
      if (beforeMsg) {
        filter.createdAt = { $lt: beforeMsg.createdAt };
      }
    }

    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();

    const dtos = await buildMessageDtos(messages.reverse());
    res.json({ messages: dtos });
  } catch (err) {
    next(err);
  }
});

router.get('/poll', async (req, res, next) => {
  try {
    const auth = req.auth!;
    const since = req.query.since as string | undefined;

    const conversation = await getOrCreateConversation(auth);
    const filter: Record<string, unknown> = {
      conversationId: conversation._id,
      role: 'operator',
    };

    if (since && Types.ObjectId.isValid(since)) {
      const sinceMsg = await Message.findOne({
        _id: since,
        conversationId: conversation._id,
      });
      if (sinceMsg) {
        filter.createdAt = { $gt: sinceMsg.createdAt };
      }
    }

    const messages = await Message.find(filter).sort({ createdAt: 1 }).exec();
    const dtos = await buildMessageDtos(messages);
    res.json({ messages: dtos });
  } catch (err) {
    next(err);
  }
});

router.post('/', messageRateLimit, async (req, res, next) => {
  try {
    const auth = req.auth!;
    const body = req.body as CreateMessageBody;
    const text = (body.text ?? '').trim();
    const attachmentIds = body.attachmentIds ?? [];
    const context = body.context;

    if (!text && attachmentIds.length === 0) {
      res.status(400).json({ error: 'Message must have text or attachments' });
      return;
    }

    if (text.length > config.maxMessageLength) {
      res.status(400).json({ error: `Text exceeds ${config.maxMessageLength} characters` });
      return;
    }

    if (attachmentIds.length > config.maxAttachmentsPerMessage) {
      res.status(400).json({ error: `Maximum ${config.maxAttachmentsPerMessage} attachments` });
      return;
    }

    const conversation = await getOrCreateConversation(auth);

    const validIds = attachmentIds.filter((id) => Types.ObjectId.isValid(id));
    const attachments = await Attachment.find({
      _id: { $in: validIds },
      appId: BIRDBOT_SCOPE,
      externalUserId: auth.externalUserId,
      messageId: null,
    });

    if (attachments.length !== validIds.length) {
      res.status(400).json({ error: 'Invalid or already linked attachments' });
      return;
    }

    const messageContext = context ?? conversation.lastContext;
    const linkUrl = extractLinkUrl(messageContext);

    const message = await Message.create({
      conversationId: conversation._id,
      role: 'user',
      text,
      attachmentIds: attachments.map((a) => a._id),
      linkUrl,
      context: messageContext,
      meta: { source: 'web' },
    });

    await Attachment.updateMany(
      { _id: { $in: attachments.map((a) => a._id) } },
      { messageId: message._id, conversationId: conversation._id }
    );

    conversation.lastMessageAt = message.createdAt;
    if (context && typeof context === 'object') {
      conversation.lastContext = context;
    }
    await conversation.save();

    try {
      await forwardUserMessageToTelegram(conversation, message, attachments);
    } catch (err) {
      console.error('[Telegram] Failed to forward message:', err instanceof Error ? err.message : err);
    }

    const dto = toMessageDto(message, attachments.map(toAttachmentDto));
    res.status(201).json(dto);
  } catch (err) {
    next(err);
  }
});

export default router;
