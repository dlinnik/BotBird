import React, { useEffect, useState } from 'react';
import { Button, Modal, Spin } from 'antd';
import { PaperClipOutlined } from '@ant-design/icons';
import type { AttachmentDto } from '../types';
import { attachmentUrl } from '../api/client';
import { formatFileSize } from '../utils/formatTime';

interface AttachmentPreviewProps {
  attachment: AttachmentDto;
  token: string;
}

async function fetchAuthenticatedBlob(url: string, token: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error('Failed to load attachment');
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({
  attachment,
  token,
}) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isImage = attachment.mimeType.startsWith('image/');
  const url = attachmentUrl(attachment.id);

  useEffect(() => {
    if (!isImage) return;
    let objectUrl: string | null = null;
    let cancelled = false;

    setLoading(true);
    void fetchAuthenticatedBlob(url, token)
      .then((u) => {
        if (!cancelled) {
          objectUrl = u;
          setBlobUrl(u);
        }
      })
      .catch(() => {
        if (!cancelled) setBlobUrl(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, token, isImage]);

  const handleDownload = async (): Promise<void> => {
    const blob = await fetchAuthenticatedBlob(url, token);
    const link = document.createElement('a');
    link.href = blob;
    link.download = attachment.originalName;
    link.click();
    URL.revokeObjectURL(blob);
  };

  if (isImage) {
    if (loading) return <Spin size="small" />;
    if (!blobUrl) return <span>{attachment.originalName}</span>;

    return (
      <>
        <img
          src={blobUrl}
          alt={attachment.originalName}
          style={{
            maxWidth: 200,
            maxHeight: 150,
            borderRadius: 8,
            cursor: 'pointer',
            display: 'block',
            marginTop: 4,
          }}
          onClick={() => setPreviewOpen(true)}
        />
        <Modal
          visible={previewOpen}
          footer={null}
          onCancel={() => setPreviewOpen(false)}
          width="90vw"
          centered
          bodyStyle={{ padding: 0, textAlign: 'center' }}
        >
          <img
            src={blobUrl}
            alt={attachment.originalName}
            style={{ maxWidth: '100%', maxHeight: '85vh' }}
          />
        </Modal>
      </>
    );
  }

  return (
    <Button
      type="link"
      icon={<PaperClipOutlined />}
      onClick={() => void handleDownload()}
      style={{ padding: 0 }}
    >
      {attachment.originalName} ({formatFileSize(attachment.size)})
    </Button>
  );
};
