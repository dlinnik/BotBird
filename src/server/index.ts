import express from 'express';
import mongoose from 'mongoose';
import { config } from './config.js';
import { corsMiddleware } from './middleware/cors.js';
import conversationRoutes from './routes/conversation.js';
import messageRoutes from './routes/messages.js';
import attachmentRoutes from './routes/attachments.js';
import healthRoutes from './routes/health.js';
import { ensureUploadDir } from './services/fileStorage.js';
import * as telegram from './services/telegram.js';
import { startTelegramWorker, stopTelegramWorker } from './services/telegramWorker.js';
import { setupStatic } from './static.js';

const app = express();

app.use(corsMiddleware);
app.use(express.json({ limit: '1mb' }));

app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/conversation', conversationRoutes);
app.use('/api/v1/conversation/messages', messageRoutes);
app.use('/api/v1/attachments', attachmentRoutes);

setupStatic(app);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

async function bootstrap(): Promise<void> {
  await ensureUploadDir();
  await mongoose.connect(config.mongoUrl);
  console.log('[MongoDB] Connected');

  telegram.logTelegramStatus();
  if (telegram.isTelegramConfigured()) {
    try {
      const me = await telegram.getMe();
      console.log(`[Telegram] Bot @${me.username ?? 'unknown'} ready`);
      await telegram.ensurePollingReady();
    } catch (err) {
      console.error('[Telegram] Bot check failed:', err instanceof Error ? err.message : err);
    }
    startTelegramWorker();
  }

  const host = process.env.HOST ?? '127.0.0.1';
  app.listen(config.port, host, () => {
    const base = `http://${host === '0.0.0.0' ? 'localhost' : host}:${config.port}`;
    console.log(`[BirdBot] Listening on ${host}:${config.port}`);
    console.log(`  API:    ${base}/api/v1/health`);
    console.log(`  Widget: ${base}/widget/`);
    console.log(`  Embed:  ${base}/embed/v1.js`);
    console.log(`  Demo:   ${base}/demo/`);
  });
}

bootstrap().catch((err) => {
  console.error('[BirdBot] Failed to start:', err);
  process.exit(1);
});

process.on('SIGTERM', () => {
  stopTelegramWorker();
  void mongoose.disconnect();
});

process.on('SIGINT', () => {
  stopTelegramWorker();
  void mongoose.disconnect();
});
