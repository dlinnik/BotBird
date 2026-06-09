import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

function resolveTelegramHttpProxy(): string {
  const direct = process.env.TELEGRAM_HTTP_PROXY?.trim();
  if (direct) return direct;

  const host = process.env.TELEGRAM_HTTP_PROXY_HOST?.trim();
  if (!host) return '';

  const port = process.env.TELEGRAM_HTTP_PROXY_PORT?.trim() || '8080';
  const user = process.env.TELEGRAM_HTTP_PROXY_USER?.trim();
  const password = process.env.TELEGRAM_HTTP_PROXY_PASSWORD?.trim();

  if (user && password) {
    return `http://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}`;
  }
  return `http://${host}:${port}`;
}

function looksLikeHttpConnectProxy(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:') return false;
    // HTTP CONNECT proxy: host:port, optional auth — not a Telegram API mirror path.
    if (parsed.username || parsed.password) return true;
    return parsed.pathname === '' || parsed.pathname === '/';
  } catch {
    return false;
  }
}

function resolveTelegramProxySettings(): { proxyUrl: string; httpProxy: string } {
  const rawMirror = process.env.TELEGRAM_PROXY_URL?.trim() ?? '';
  let httpProxy = resolveTelegramHttpProxy();
  let proxyUrl = rawMirror;

  if (!httpProxy && rawMirror && looksLikeHttpConnectProxy(rawMirror)) {
    httpProxy = rawMirror;
    proxyUrl = '';
    console.warn(
      '[Telegram] TELEGRAM_PROXY_URL looks like an HTTP proxy — using it as TELEGRAM_HTTP_PROXY. ' +
        'Set TELEGRAM_HTTP_PROXY instead and leave TELEGRAM_PROXY_URL empty.'
    );
  }

  return { proxyUrl, httpProxy };
}

export function maskHttpProxyUrl(proxyUrl: string): string {
  try {
    const parsed = new URL(proxyUrl);
    if (parsed.password) parsed.password = '***';
    if (parsed.username) parsed.username = '***';
    return parsed.toString();
  } catch {
    return '(invalid proxy url)';
  }
}

export interface AppConfig {
  port: number;
  mongoUrl: string;
  uploadDir: string;
  jwt: {
    secret: string;
    userIdClaim: string;
  };
  demo: {
    token: string;
  };
  static: {
    widgetDir: string;
    embedDir: string;
    demoDir: string;
  };
  maxFileSize: number;
  maxAttachmentsPerMessage: number;
  maxMessageLength: number;
  rateLimitMessages: number;
  telegram: {
    botToken: string;
    groupId: string;
    /** Alternative HTTPS base instead of api.telegram.org (mirror/gateway). */
    proxyUrl: string;
    /** HTTP CONNECT proxy, e.g. http://user:pass@host:port */
    httpProxy: string;
    requestTimeoutMs: number;
    retryCount: number;
  };
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT ?? '4100', 10),
  mongoUrl: process.env.MONGO_URL ?? 'mongodb://localhost:27017/birdbot',
  uploadDir: process.env.UPLOAD_DIR ?? './data/uploads',
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    userIdClaim: process.env.JWT_USER_ID_CLAIM ?? 'id',
  },
  demo: {
    token: process.env.DEMO_JWT ?? '',
  },
  static: {
    widgetDir: process.env.WIDGET_DIR ?? path.join(repoRoot, 'dist', 'widget'),
    embedDir: process.env.EMBED_DIR ?? path.join(repoRoot, 'dist', 'embed'),
    demoDir: process.env.DEMO_DIR ?? path.join(repoRoot, 'demo'),
  },
  maxFileSize: 10 * 1024 * 1024,
  maxAttachmentsPerMessage: 5,
  maxMessageLength: 4000,
  rateLimitMessages: 30,
  telegram: (() => {
    const { proxyUrl, httpProxy } = resolveTelegramProxySettings();
    return {
      botToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
      groupId: process.env.TELEGRAM_GROUP_ID ?? '',
      proxyUrl,
      httpProxy,
      requestTimeoutMs: parseInt(process.env.TELEGRAM_REQUEST_TIMEOUT_MS ?? '30000', 10),
      retryCount: parseInt(process.env.TELEGRAM_RETRY_COUNT ?? '3', 10),
    };
  })(),
};
