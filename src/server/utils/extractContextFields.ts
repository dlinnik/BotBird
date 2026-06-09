const MAX_STRING_LENGTH = 256;

function readContextString(context: unknown, keys: string[]): string | null {
  if (!context || typeof context !== 'object') return null;

  const record = context as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > MAX_STRING_LENGTH) continue;
    return trimmed;
  }
  return null;
}

export function extractUserDisplayName(context: unknown, fallback: string): string {
  return (
    readContextString(context, ['name', 'userName', 'displayName', 'fullName']) ??
    fallback
  );
}

export function extractLinkLabel(context: unknown): string {
  return readContextString(context, ['linkLabel', 'linkText']) ?? 'ссылка на страницу';
}
