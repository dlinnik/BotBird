import type { AttachmentDto, MessageDto } from '../types';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(options.headers as Record<string, string> | undefined),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function patchConversation(
  token: string,
  context: Record<string, unknown>
): Promise<void> {
  await request('/conversation', token, {
    method: 'PATCH',
    body: JSON.stringify({ context }),
  });
}

export async function fetchMessages(token: string): Promise<MessageDto[]> {
  const data = await request<{ messages: MessageDto[] }>('/conversation/messages', token);
  return data.messages;
}

export async function pollMessages(token: string, since?: string): Promise<MessageDto[]> {
  const qs = since ? `?since=${encodeURIComponent(since)}` : '';
  const data = await request<{ messages: MessageDto[] }>(
    `/conversation/messages/poll${qs}`,
    token
  );
  return data.messages;
}

export async function sendMessage(
  token: string,
  payload: { text: string; attachmentIds: string[]; context: Record<string, unknown> }
): Promise<MessageDto> {
  return request<MessageDto>('/conversation/messages', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function uploadAttachment(
  token: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<AttachmentDto> {
  const form = new FormData();
  form.append('file', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/attachments`);

    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as AttachmentDto);
        return;
      }
      let message = `HTTP ${xhr.status}`;
      try {
        const body = JSON.parse(xhr.responseText) as { error?: string };
        if (body.error) message = body.error;
      } catch {
        /* ignore */
      }
      reject(new ApiError(message, xhr.status));
    };

    xhr.onerror = () => reject(new ApiError('Network error', 0));
    xhr.send(form);
  });
}

export async function deleteAttachment(token: string, id: string): Promise<void> {
  await request<void>(`/attachments/${id}`, token, { method: 'DELETE' });
}

export function attachmentUrl(id: string): string {
  return `${API_BASE}/attachments/${id}`;
}
