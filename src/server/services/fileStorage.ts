import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';
import { sanitizeFilename, isPathInside } from '../utils/sanitize.js';

export async function ensureUploadDir(): Promise<void> {
  await fs.mkdir(config.uploadDir, { recursive: true });
}

export function buildStoragePath(
  appId: string,
  attachmentId: string,
  originalName: string
): { relativePath: string; absolutePath: string } {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const sanitized = sanitizeFilename(originalName);
  const filename = `${attachmentId}_${sanitized}`;
  const relativePath = path.join(appId, yyyy, mm, filename);
  const absolutePath = path.join(config.uploadDir, relativePath);
  return { relativePath, absolutePath };
}

export async function saveBuffer(
  appId: string,
  attachmentId: string,
  originalName: string,
  buffer: Buffer
): Promise<string> {
  const { relativePath, absolutePath } = buildStoragePath(appId, attachmentId, originalName);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer);
  return relativePath;
}

export async function readFileSafe(storagePath: string): Promise<Buffer> {
  const absolutePath = path.join(config.uploadDir, storagePath);
  if (!isPathInside(config.uploadDir, absolutePath)) {
    throw new Error('Invalid storage path');
  }
  return fs.readFile(absolutePath);
}

export async function deleteFileSafe(storagePath: string): Promise<void> {
  const absolutePath = path.join(config.uploadDir, storagePath);
  if (!isPathInside(config.uploadDir, absolutePath)) {
    throw new Error('Invalid storage path');
  }
  try {
    await fs.unlink(absolutePath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
}

export async function checkDiskWritable(): Promise<boolean> {
  try {
    await ensureUploadDir();
    const testFile = path.join(config.uploadDir, '.health-check');
    await fs.writeFile(testFile, 'ok');
    await fs.unlink(testFile);
    return true;
  } catch {
    return false;
  }
}
