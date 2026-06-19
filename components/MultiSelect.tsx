import React, { useState, useRef, useEffect } from 'react';
import { T } from '@/lib/theme';

interface MultiSelectProps {
  options: string[];
  value: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

export default function MultiSelect({ options, value, onChange, placeholder = 'All', style }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const toggle = (opt: string) => {
    const next = value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt];
    onChange(next);
  };

  const label = value.length === 0 ? placeholder : value.length === 1 ? value[0] : `${value.length} selected`;

  const baseStyle: React.CSSProperties = {
    border: `1px solid ${T.border}`,
    borderRadius: 8,
    padding: '7px 32px 7px 10px',
    fontSize: 13,
    background: '#fff',
    cursor: 'pointer',
    outline: 'none',
    minWidth: 120,
    position: 'relative' as const,
    userSelect: 'none' as const,
    color: value.length > 0 ? T.text : T.textMuted,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    ...style,
  };

  return (
    <div ref={ref} style={{ position: 'relative' as const, display: 'inline-block' }}>
      <div onClick={() => setOpen(o => !o)} style={baseStyle}>
        {label}
        <span style={{ position: 'absolute' as const, right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: T.textMuted, pointerEvents: 'none' }}>
          {open ? '▲' : '▼'}
        </span>
      </div>
      {value.length > 0 && (
        <span onClick={e => { e.stopPropagation(); onChange([]); }}
          style={{ position: 'absolute' as const, right: 24, top: '50%', transform: 'translateY(-50%)',
            fontSize: 13, color: '#DC2626', cursor: 'pointer', zIndex: 1, fontWeight: 700, lineHeight: '1' }}>
          ×
        </span>
      )}
      {open && (
        <div style={{
          position: 'absolute' as const, top: '100%', left: 0, zIndex: 1000,
          background: '#fff', border: `1px solid ${T.border}`, borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: '100%', maxWidth: 280,
          maxHeight: 240, overflowY: 'auto' as const, marginTop: 4,
        }}>
          {options.length === 0 && <div style={{ padding: '8px 12px', fontSize: 12, color: T.textMuted }}>No options</div>}
          {options.map(opt => (
            <div key={opt} onClick={() => toggle(opt)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                background: value.includes(opt) ? T.primaryLight : '#fff', color: value.includes(opt) ? T.primary : T.text }}>
              <div style={{ width: 15, height: 15, borderRadius: 4, flexShrink: 0,
                border: `2px solid ${value.includes(opt) ? T.primary : T.border}`,
                background: value.includes(opt) ? T.primary : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {value.includes(opt) && <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>✓</span>}
              </div>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{opt}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
