import React, { useState, useRef, useEffect } from 'react';
import { T, inputStyle } from '@/lib/theme';

interface Props {
  label?: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  onCreateNew?: (val: string) => void;
  placeholder?: string;
  required?: boolean;
  focused?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

export default function CreatableSelect({
  label, value, options, onChange, onCreateNew,
  placeholder = 'Search or create…', required, focused, onFocus, onBlur,
}: Props) {
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));
  const showCreate = query.trim() && !options.some(o => o.toLowerCase() === query.toLowerCase());
  const displayVal = value || '';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (opt: string) => { onChange(opt); setOpen(false); setQuery(''); };
  const create = () => { if (!query.trim()) return; onCreateNew?.(query.trim()); select(query.trim()); };

  return (
    <div style={{ marginBottom: label ? 16 : 0 }}>
      {label && <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:6 }}>
        {label}{required && <span style={{ color:T.danger }}> *</span>}
      </label>}
      <div ref={ref} style={{ position:'relative' }}>
        {/* Trigger */}
        <div
          onClick={() => { setOpen(o => !o); if (!open) onFocus?.(); }}
          style={{
            ...inputStyle(focused || open),
            display:'flex', alignItems:'center', justifyContent:'space-between',
            cursor:'pointer', userSelect:'none',
            width:'100%', boxSizing:'border-box' as const,
            minHeight:38,
          }}>
          <span style={{ color: displayVal ? T.text : T.textDim, fontSize:13, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {displayVal || placeholder}
          </span>
          <span style={{ fontSize:10, color:T.textDim, flexShrink:0, marginLeft:4 }}>{open?'▲':'▼'}</span>
        </div>

        {/* Dropdown */}
        {open && (
          <div style={{
            position:'absolute', top:'calc(100% + 4px)', left:0, right:0,
            background:T.surface, border:`1.5px solid ${T.primary}`,
            borderRadius:10, zIndex:500, overflow:'hidden',
            boxShadow:'0 8px 24px rgba(0,0,0,0.12)',
          }}>
            {/* Search input */}
            <div style={{ padding:'8px 10px', borderBottom:`1px solid ${T.border}` }}>
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key==='Enter' && showCreate) create(); if (e.key==='Escape') { setOpen(false); setQuery(''); } }}
                placeholder="Type to search or create…"
                style={{ ...inputStyle(true), width:'100%', boxSizing:'border-box' as const, fontSize:12, padding:'6px 10px' }}
              />
            </div>

            {/* Options list */}
            <div style={{ maxHeight:200, overflowY:'auto' }}>
              {filtered.length === 0 && !showCreate && (
                <div style={{ padding:'12px 14px', fontSize:13, color:T.textDim, textAlign:'center' }}>No options found</div>
              )}
              {filtered.map((opt,i) => (
                <div key={i} onClick={() => select(opt)}
                  style={{ padding:'9px 14px', fontSize:13, cursor:'pointer', color: opt===value ? T.primary : T.text, fontWeight: opt===value ? 600:400, background: opt===value ? T.primaryLight : 'transparent', display:'flex', alignItems:'center', justifyContent:'space-between' }}
                  onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background = opt===value ? T.primaryLight : T.bg}
                  onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background = opt===value ? T.primaryLight : 'transparent'}>
                  {opt}
                  {opt===value && <span style={{ fontSize:12, color:T.primary }}>✓</span>}
                </div>
              ))}

              {/* Create new option */}
              {showCreate && (
                <div onClick={create}
                  style={{ padding:'9px 14px', fontSize:13, cursor:'pointer', color:T.primary, fontWeight:600, background:T.primaryLight, display:'flex', alignItems:'center', gap:8, borderTop:`1px solid ${T.primaryMid}` }}
                  onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background='#CCFBF1'}
                  onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background=T.primaryLight}>
                  <span style={{ fontSize:15 }}>➕</span>
                  <span>Create <strong>"{query}"</strong></span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
