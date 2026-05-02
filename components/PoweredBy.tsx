import React from 'react';
import { T } from '@/lib/theme';

interface Props {
  center?: boolean;
  light?: boolean;
}

export default function PoweredBy({ center = false, light = false }: Props) {
  return (
    <div style={{
      textAlign: center ? 'center' : 'left',
      fontSize: 11,
      color: light ? 'rgba(255,255,255,0.5)' : T.textDim,
      lineHeight: 1.6,
    }}>
      Powered by{' '}
      <a
        href="https://www.absoluteapplabs.com"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: light ? 'rgba(255,255,255,0.8)' : T.primary,
          fontWeight: 600,
          textDecoration: 'none',
        }}
        onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
        onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
      >
        Absolute App Labs
      </a>
    </div>
  );
}
