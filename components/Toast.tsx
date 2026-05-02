import React, { useEffect } from 'react';
import { T } from '@/lib/theme';

interface Props {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: Props) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: { bg: T.successBg, border: '#BBF7D0', color: T.success, icon: '✅' },
    error:   { bg: T.dangerBg,  border: '#FECACA', color: T.danger,  icon: '⚠️' },
    info:    { bg: T.infoBg,    border: '#BFDBFE', color: T.info,    icon: 'ℹ️'  },
  };
  const c = colors[type];

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 10, padding: '12px 18px',
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
      fontSize: 13, color: c.color, fontWeight: 500,
      maxWidth: 360, animation: 'fadeIn 0.2s ease',
    }}>
      <span>{c.icon}</span>
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.color, fontSize: 16, lineHeight: 1 }}>×</button>
    </div>
  );
}
