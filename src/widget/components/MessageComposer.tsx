import React, { useRef, useState, useCallback } from 'react';
import { Button, Input, message, Progress, Tooltip } from 'antd';
import { PaperClipOutlined, CloseOutlined, SendOutlined } from '@ant-design/icons';
import type { DraftAttachment } from '../types';
import { deleteAttachment, uploadAttachment } from '../api/client';
import { formatFileSize } from '../utils/formatTime';

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TEXT = 4000;

interface MessageComposerProps {
  token: string;
  onSend: (text: string, attachmentIds: string[]) => Promise<void>;
  disabled?: boolean;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  token,
  onSend,
  disabled,
  textareaRef,
}) => {
  const [text, setText] = useState('');
  const [drafts, setDrafts] = useState<DraftAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const localTextareaRef = useRef<HTMLTextAreaElement>(null);
  const ref = textareaRef ?? localTextareaRef;

  const isUploading = drafts.some((d) => d.uploading);
  const canSend = (text.trim().length > 0 || drafts.length > 0) && !isUploading && !sending && !disabled;

  const handleUpload = async (file: File): Promise<void> => {
    if (file.size > MAX_FILE_SIZE) {
      message.error('Файл слишком большой');
      return;
    }
    if (drafts.length >= MAX_FILES) {
      message.warning('Не более 5 файлов');
      return;
    }

    const tempId = `temp-${Date.now()}-${Math.random()}`;
    setDrafts((prev) => [
      ...prev,
      {
        id: tempId,
        originalName: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        uploading: true,
        uploadProgress: 0,
      },
    ]);

    try {
      const result = await uploadAttachment(token, file, (percent) => {
        setDrafts((prev) =>
          prev.map((d) => (d.id === tempId ? { ...d, uploadProgress: percent } : d))
        );
      });
      setDrafts((prev) =>
        prev.map((d) =>
          d.id === tempId
            ? { ...d, id: result.id, uploading: false, uploadProgress: undefined }
            : d
        )
      );
    } catch {
      setDrafts((prev) => prev.filter((d) => d.id !== tempId));
      message.error('Не удалось загрузить файл');
    }
  };

  const handleRemoveDraft = async (draft: DraftAttachment): Promise<void> => {
    if (!draft.id.startsWith('temp-')) {
      try {
        await deleteAttachment(token, draft.id);
      } catch {
        message.error('Не удалось удалить файл');
        return;
      }
    }
    setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
  };

  const handleSend = async (): Promise<void> => {
    const trimmed = text.trim();
    if (trimmed.length > MAX_TEXT) {
      message.error(`Максимум ${MAX_TEXT} символов`);
      return;
    }
    if (!canSend) return;

    setSending(true);
    try {
      const ids = drafts.filter((d) => !d.uploading && !d.id.startsWith('temp-')).map((d) => d.id);
      await onSend(trimmed, ids);
      setText('');
      setDrafts([]);
    } catch {
      message.error('Не удалось отправить сообщение');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((f) => void handleUpload(f));
    }
    e.target.value = '';
  };

  const onDrop = useCallback((e: React.DragEvent): void => {
    e.preventDefault();
    Array.from(e.dataTransfer.files).forEach((f) => void handleUpload(f));
  }, [token, drafts.length]);

  const onPaste = useCallback((e: React.ClipboardEvent): void => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item?.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) void handleUpload(file);
      }
    }
  }, [token, drafts.length]);

  return (
    <div
      style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0', background: '#fff' }}
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {drafts.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {drafts.map((draft) => (
            <div
              key={draft.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: '#fafafa',
                borderRadius: 6,
                padding: '4px 8px',
                fontSize: 12,
              }}
            >
              {draft.mimeType.startsWith('image/') ? '🖼' : '📄'}{' '}
              {draft.originalName} ({formatFileSize(draft.size)})
              {draft.uploading && draft.uploadProgress !== undefined && (
                <Progress percent={draft.uploadProgress} size="small" style={{ width: 60 }} />
              )}
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                onClick={() => void handleRemoveDraft(draft)}
                disabled={draft.uploading}
              />
            </div>
          ))}
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={onFileChange}
      />
      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
        <Input.TextArea
          ref={ref as React.RefObject<HTMLTextAreaElement>}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={onPaste}
          placeholder="Опишите ваш вопрос..."
          autoSize={{ minRows: 3, maxRows: 6 }}
          style={{ flex: 1, minHeight: 72, maxHeight: 150, resize: 'none' }}
          disabled={sending}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            justifyContent: 'flex-end',
            flexShrink: 0,
          }}
        >
          <Tooltip title="Прикрепить файл" placement="left">
            <Button
              icon={<PaperClipOutlined />}
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || isUploading}
              aria-label="Прикрепить файл"
            />
          </Tooltip>
          <Tooltip title="Отправить" placement="left">
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={() => void handleSend()}
              disabled={!canSend}
              loading={sending}
              aria-label="Отправить"
            />
          </Tooltip>
        </div>
      </div>
    </div>
  );
};
