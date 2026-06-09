import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

function extractBearerToken(header: string | undefined): string | null {
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractBearerToken(req.header('Authorization'));

    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    let decoded: jwt.JwtPayload;
    try {
      decoded = jwt.verify(token, config.jwt.secret) as jwt.JwtPayload;
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    const claim = config.jwt.userIdClaim;
    const externalUserId = decoded[claim];
    if (externalUserId === undefined || externalUserId === null) {
      res.status(401).json({ error: 'Missing user id in token' });
      return;
    }

    req.auth = {
      externalUserId: String(externalUserId),
    };
    next();
  } catch (err) {
    next(err);
  }
}
