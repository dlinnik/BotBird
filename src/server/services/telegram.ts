import fs from 'fs';
import path from 'path';
import { fetch as undiciFetch, ProxyAgent, type Dispatcher, type RequestInit as UndiciRequestInit } from 'undici';
import { config, maskHttpProxyUrl } from '../config.js';
import type { TelegramApiResponse, TelegramMessage, TelegramMessageEntity, TelegramUpdate } from '../types.js';

let httpProxyDispatcher: Dispatcher | undefined;

function getTelegramBaseUrl(): string {
  if (config.telegram.proxyUrl) {
    return config.telegram.proxyUrl.replace(/\/$/, '');
  }
  return 'https://api.telegram.org';
}

function getHttpProxyDispatcher(): Dispatcher | undefined {
  if (!config.telegram.httpProxy) return undefined;
  if (!httpProxyDispatcher) {
    httpProxyDispatcher = new ProxyAgent(config.telegram.httpProxy);
  }
  return httpProxyDispatcher;
}

async function telegramFetch(url: string, init?: UndiciRequestInit): Promise<Awaited<ReturnType<typeof undiciFetch>>> {
  const dispatcher = getHttpProxyDispatcher();
  return undiciFetch(url, dispatcher ? { ...init, dispatcher } : init);
}

function buildApiUrl(method: string): string {
  return `${getTelegramBaseUrl()}/bot${config.telegram.botToken}/${method}`;
}

async function telegramRequest<T>(
  method: string,
  body?: Record<string, unknown> | FormData,
  requestTimeoutMs = config.telegram.requestTimeoutMs,
  externalSignal?: AbortSignal
): Promise<T> {
  const url = buildApiUrl(method);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  const onExternalAbort = (): void => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  let lastError: Error | null = null;

  try {
    for (let attempt = 0; attempt < config.telegram.retryCount; attempt++) {
      try {
        const isFormData = body instanceof FormData;
        const response = await telegramFetch(url, {
          method: 'POST',
          body: (isFormData ? body : body ? JSON.stringify(body) : undefined) as UndiciRequestInit['body'],
          headers: isFormData ? undefined : { 'Content-Type': 'application/json' },
          signal: controller.signal,
        });

        const data = (await response.json()) as TelegramApiResponse<T>;
        if (!data.ok) {
          throw new Error(data.description ?? `Telegram API error: ${method}`);
        }
        if (data.result === undefined) {
          throw new Error(`Telegram API returned no result for ${method}`);
        }
        return data.result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < config.telegram.retryCount - 1) {
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        }
      }
    }
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }

  throw lastError ?? new Error(`Telegram request failed: ${method}`);
}

export function isTelegramConfigured(): boolean {
  return Boolean(config.telegram.botToken && config.telegram.groupId);
}

export function logTelegramStatus(): void {
  if (!isTelegramConfigured()) {
    console.warn('[Telegram] Bot token or group ID not configured — outgoing/incoming disabled');
    return;
  }

  const apiBase = config.telegram.proxyUrl
    ? `mirror (${config.telegram.proxyUrl.replace(/\/$/, '')})`
    : 'direct (api.telegram.org)';

  const httpProxy = config.telegram.httpProxy
    ? `HTTP proxy ${maskHttpProxyUrl(config.telegram.httpProxy)}`
    : 'no HTTP proxy';

  console.log(
    `[Telegram] Configured, API: ${apiBase}, ${httpProxy}, group: ${config.telegram.groupId}`
  );
}

export async function getMe(): Promise<{ username?: string }> {
  return telegramRequest<{ username?: string }>('getMe');
}

export async function sendTextMessage(
  chatId: string,
  text: string,
  replyToMessageId?: number,
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2',
  entities?: TelegramMessageEntity[]
): Promise<TelegramMessage> {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
  };
  if (replyToMessageId !== undefined) {
    body.reply_to_message_id = replyToMessageId;
  }
  if (entities && entities.length > 0) {
    body.entities = entities;
  } else if (parseMode) {
    body.parse_mode = parseMode;
  }
  return telegramRequest<TelegramMessage>('sendMessage', body);
}

export async function sendPhoto(
  chatId: string,
  filePath: string,
  caption?: string,
  replyToMessageId?: number
): Promise<TelegramMessage> {
  const form = new FormData();
  form.append('chat_id', chatId);
  if (caption) form.append('caption', caption);
  if (replyToMessageId !== undefined) {
    form.append('reply_to_message_id', String(replyToMessageId));
  }
  const buffer = await fs.promises.readFile(filePath);
  const blob = new Blob([buffer]);
  form.append('photo', blob, path.basename(filePath));

  return telegramRequest<TelegramMessage>('sendPhoto', form);
}

export async function sendDocument(
  chatId: string,
  filePath: string,
  caption?: string,
  replyToMessageId?: number
): Promise<TelegramMessage> {
  const form = new FormData();
  form.append('chat_id', chatId);
  if (caption) form.append('caption', caption);
  if (replyToMessageId !== undefined) {
    form.append('reply_to_message_id', String(replyToMessageId));
  }
  const buffer = await fs.promises.readFile(filePath);
  const blob = new Blob([buffer]);
  form.append('document', blob, path.basename(filePath));

  return telegramRequest<TelegramMessage>('sendDocument', form);
}

export async function getWebhookInfo(): Promise<{ url: string; has_custom_certificate: boolean }> {
  return telegramRequest<{ url: string; has_custom_certificate: boolean }>('getWebhookInfo');
}

export async function deleteWebhook(): Promise<boolean> {
  return telegramRequest<boolean>('deleteWebhook', { drop_pending_updates: false });
}

/** Webhook and long polling cannot run together — clear webhook before getUpdates. */
export async function ensurePollingReady(): Promise<void> {
  const info = await getWebhookInfo();
  if (info.url) {
    console.warn(`[Telegram] Active webhook detected (${info.url}) — removing for long polling`);
    await deleteWebhook();
    console.log('[Telegram] Webhook removed');
  }
}

export async function getUpdates(
  offset: number,
  pollTimeoutSec = 30,
  signal?: AbortSignal
): Promise<TelegramUpdate[]> {
  // HTTP timeout must exceed Telegram long-poll duration (+ proxy/network buffer).
  const requestTimeoutMs = (pollTimeoutSec + 20) * 1000;
  return telegramRequest<TelegramUpdate[]>(
    'getUpdates',
    {
      offset,
      timeout: pollTimeoutSec,
      allowed_updates: ['message'],
    },
    requestTimeoutMs,
    signal
  );
}

export async function getFile(fileId: string): Promise<{ file_path: string }> {
  return telegramRequest<{ file_path: string }>('getFile', { file_id: fileId });
}

export async function downloadFile(filePath: string): Promise<Buffer> {
  const url = `${getTelegramBaseUrl()}/file/bot${config.telegram.botToken}/${filePath}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.telegram.requestTimeoutMs);

  try {
    const response = await telegramFetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Failed to download Telegram file: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timeout);
  }
}

export function getOperatorDisplayName(from: {
  first_name?: string;
  last_name?: string;
  username?: string;
}): string {
  const parts = [from.first_name, from.last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  if (from.username) return from.username;
  return 'Поддержка';
}
