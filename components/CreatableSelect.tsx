import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { T, inputStyle } from '@/lib/theme';

interface Props {
  label?: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  onCreateNew?: (val: string) => void;
  placeholder?: string;
  required?: boolean;
  compact?: boolean; // for use inside table cells
}

export default function CreatableSelect({
  label, value, options, onChange, onCreateNew,
  placeholder = 'Select or create…', required, compact,
}: Props) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');
  const triggerRef = useRef<HTMLDivElement>(null);
  const searchRef  = useRef<HTMLInputElement>(null);
  const [dropPos, setDropPos] = useState({ top:0, left:0, width:0 });

  const filtered   = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));
  const showCreate = query.trim() && !options.some(o => o.toLowerCase() === query.toLowerCase());

  // Position dropdown relative to trigger
  const updatePos = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setDropPos({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX, width: Math.max(r.width, 180) });
  }, []);

  const handleOpen = () => {
    updatePos();
    setOpen(true);
    setTimeout(() => searchRef.current?.focus(), 30);
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      // Check if click is inside the portal dropdown
      const portal = document.getElementById('creatable-portal');
      if (portal?.contains(target)) return;
      setOpen(false); setQuery('');
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Reposition on scroll/resize
  useEffect(() => {
    if (!open) return;
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => { window.removeEventListener('scroll', updatePos, true); window.removeEventListener('resize', updatePos); };
  }, [open, updatePos]);

  const select = (opt: string) => { onChange(opt); setOpen(false); setQuery(''); };
  const create = () => {
    if (!query.trim()) return;
    onCreateNew?.(query.trim());
    select(query.trim());
  };

  const triggerStyle: React.CSSProperties = {
    ...inputStyle(open),
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    cursor: 'pointer', userSelect: 'none',
    width: '100%', boxSizing: 'border-box',
    minHeight: compact ? 34 : 38,
    padding: compact ? '5px 8px' : '9px 12px',
    fontSize: compact ? 12 : 14,
  };

  const dropdown = open ? createPortal(
    <div id="creatable-portal" style={{
      position: 'absolute',
      top: dropPos.top,
      left: dropPos.left,
      width: dropPos.width,
      background: T.surface,
      border: `1.5px solid ${T.primary}`,
      borderRadius: 10,
      zIndex: 9999,
      boxShadow: '0 8px 28px rgba(0,0,0,0.14)',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '7px 8px', borderBottom: `1px solid ${T.border}` }}>
        <input
          ref={searchRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { if (filtered.length === 1) select(filtered[0]); else if (showCreate) create(); }
            if (e.key === 'Escape') { setOpen(false); setQuery(''); }
          }}
          placeholder="Type to search or create…"
          style={{ ...inputStyle(true), width: '100%', boxSizing: 'border-box', fontSize: 12, padding: '5px 8px' }}
        />
      </div>
      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
        {filtered.length === 0 && !showCreate && (
          <div style={{ padding: '12px 14px', fontSize: 13, color: T.textDim, textAlign: 'center' }}>No options found</div>
        )}
        {filtered.map((opt, i) => (
          <div key={i} onMouseDown={() => select(opt)}
            style={{ padding: '9px 14px', fontSize: 13, cursor: 'pointer', color: opt === value ? T.primary : T.text, fontWeight: opt === value ? 600 : 400, background: opt === value ? T.primaryLight : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = opt === value ? T.primaryLight : T.bg}
            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = opt === value ? T.primaryLight : 'transparent'}>
            {opt}
            {opt === value && <span style={{ fontSize: 12, color: T.primary }}>✓</span>}
          </div>
        ))}
        {showCreate && (
          <div onMouseDown={create}
            style={{ padding: '9px 14px', fontSize: 13, cursor: 'pointer', color: T.primary, fontWeight: 600, background: T.primaryLight, display: 'flex', alignItems: 'center', gap: 8, borderTop: `1px solid ${T.primaryMid}` }}
            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#CCFBF1'}
            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = T.primaryLight}>
            <span style={{ fontSize: 15 }}>➕</span>
            <span>Create <strong>"{query}"</strong></span>
          </div>
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div style={{ marginBottom: label ? 16 : 0 }}>
      {label && (
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 6 }}>
          {label}{required && <span style={{ color: T.danger }}> *</span>}
        </label>
      )}
      <div ref={triggerRef} onClick={handleOpen} style={triggerStyle}>
        <span style={{ color: value ? T.text : T.textDim, fontSize: compact ? 12 : 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || placeholder}
        </span>
        <span style={{ fontSize: 9, color: T.textDim, flexShrink: 0, marginLeft: 4 }}>{open ? '▲' : '▼'}</span>
      </div>
      {dropdown}
    </div>
  );
}
