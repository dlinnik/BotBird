import rateLimit from 'express-rate-limit';
import { config } from '../config.js';

export const messageRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: config.rateLimitMessages,
  keyGenerator: (req) => {
    const auth = req.auth;
    if (auth) return auth.externalUserId;
    return req.ip ?? 'unknown';
  },
  message: { error: 'Too many messages, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
