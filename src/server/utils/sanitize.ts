import path from 'path';

export function sanitizeFilename(name: string): string {
  const base = path.basename(name || 'file');
  const cleaned = base.replace(/[^\w.\-()а-яА-ЯёЁ ]/g, '_').slice(0, 200);
  return cleaned || 'file';
}

export function isPathInside(base: string, target: string): boolean {
  const resolvedBase = path.resolve(base);
  const resolvedTarget = path.resolve(target);
  return resolvedTarget.startsWith(resolvedBase + path.sep) || resolvedTarget === resolvedBase;
}
