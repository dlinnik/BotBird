import { Router } from 'express';
import mongoose from 'mongoose';
import { checkDiskWritable } from '../services/fileStorage.js';

const router = Router();

router.get('/', async (_req, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  const diskOk = await checkDiskWritable();

  if (mongoOk && diskOk) {
    res.json({ ok: true });
    return;
  }

  res.status(503).json({
    ok: false,
    mongo: mongoOk,
    disk: diskOk,
  });
});

export default router;
