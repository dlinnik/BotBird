import React from 'react';
import { Button, Layout } from 'antd';
import { CloseOutlined } from '@ant-design/icons';

const { Header } = Layout;

interface WidgetHeaderProps {
  onClose: () => void;
}

export const WidgetHeader: React.FC<WidgetHeaderProps> = ({ onClose }) => {
  return (
    <Header
      style={{
        height: 48,
        lineHeight: '48px',
        padding: '0 16px',
        background: '#fff',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <span style={{ fontWeight: 600, fontSize: 16 }}>Техподдержка</span>
      <Button
        type="text"
        icon={<CloseOutlined />}
        onClick={onClose}
        aria-label="Закрыть чат"
      />
    </Header>
  );
};
