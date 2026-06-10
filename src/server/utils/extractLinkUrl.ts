const MAX_LINK_URL_LENGTH = 2048;

function tryParseHttpUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_LINK_URL_LENGTH) return null;

  const candidates = /^https?:\/\//i.test(trimmed)
    ? [trimmed]
    : [trimmed, `http://${trimmed}`, `https://${trimmed}`];

  for (const candidate of candidates) {
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue;
      return parsed.toString();
    } catch {
      continue;
    }
  }

  return null;
}

export function extractLinkUrl(context: unknown): string | null {
  if (!context || typeof context !== 'object') return null;

  const link = (context as Record<string, unknown>).link;
  if (typeof link !== 'string') return null;

  return tryParseHttpUrl(link);
}

export function normalizeLinkUrl(url: string): string | null {
  return tryParseHttpUrl(url);
}

/** Telegram text_link / inline buttons reject localhost and private IPs. */
export function isTelegramInlineLinkUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

    const hostname = parsed.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname.endsWith('.localhost')) return false;
    if (hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]') return false;

    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      const [octet0, octet1] = hostname.split('.').map(Number);
      if (octet0 === undefined || octet1 === undefined) return false;
      if (octet0 === 10) return false;
      if (octet0 === 192 && octet1 === 168) return false;
      if (octet0 === 172 && octet1 >= 16 && octet1 <= 31) return false;
      if (octet0 === 127) return false;
    }

    return true;
  } catch {
    return false;
  }
}
