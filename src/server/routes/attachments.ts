import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { Types } from 'mongoose';
import { config } from '../config.js';
import { BIRDBOT_SCOPE } from '../constants.js';
import { authMiddleware } from '../middleware/auth.js';
import { Attachment } from '../models/Attachment.js';
import { getOrCreateConversation } from '../services/conversationService.js';
import {
  deleteFileSafe,
  readFileSafe,
  saveBuffer,
} from '../services/fileStorage.js';
import { toAttachmentDto } from '../utils/serializers.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxFileSize },
});

router.use(authMiddleware);

router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    const auth = req.auth!;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const conversation = await getOrCreateConversation(auth);
    const attachmentId = new Types.ObjectId();
    const storagePath = await saveBuffer(
      BIRDBOT_SCOPE,
      attachmentId.toString(),
      file.originalname,
      file.buffer
    );

    const attachment = await Attachment.create({
      _id: attachmentId,
      appId: BIRDBOT_SCOPE,
      externalUserId: auth.externalUserId,
      conversationId: conversation._id,
      messageId: null,
      originalName: file.originalname,
      mimeType: file.mimetype || 'application/octet-stream',
      size: file.size,
      storagePath,
      source: 'web',
    });

    res.status(201).json(toAttachmentDto(attachment));
  } catch (err) {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'File too large' });
      return;
    }
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const auth = req.auth!;
    const { id } = req.params;

    if (!id || !Types.ObjectId.isValid(id)) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const attachment = await Attachment.findOne({
      _id: id,
      appId: BIRDBOT_SCOPE,
      externalUserId: auth.externalUserId,
    });

    if (!attachment) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const buffer = await readFileSafe(attachment.storagePath);
    const isImage = attachment.mimeType.startsWith('image/');

    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader(
      'Content-Disposition',
      `${isImage ? 'inline' : 'attachment'}; filename="${encodeURIComponent(attachment.originalName)}"`
    );
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const auth = req.auth!;
    const { id } = req.params;

    if (!id || !Types.ObjectId.isValid(id)) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const attachment = await Attachment.findOne({
      _id: id,
      appId: BIRDBOT_SCOPE,
      externalUserId: auth.externalUserId,
      messageId: null,
    });

    if (!attachment) {
      res.status(404).json({ error: 'Not found or already linked' });
      return;
    }

    await deleteFileSafe(attachment.storagePath);
    await attachment.deleteOne();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
