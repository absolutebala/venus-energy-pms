import React, { useState, useRef, useEffect } from 'react';
import { T } from '@/lib/theme';

interface DateInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  max?: string;
  min?: string;
  disabled?: boolean;
}

const todayISO = () => new Date().toISOString().split('T')[0];

function toDisplay(iso: string): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function toISO(display: string): string {
  const m = display.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!m) return '';
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function isValidISO(iso: string): boolean {
  if (!iso) return false;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const [, yyyy, mm, dd] = m.map(Number);
  if (mm < 1 || mm > 12) return false;
  if (dd < 1 || dd > new Date(yyyy, mm, 0).getDate()) return false;
  return true;
}

function normalizeInput(raw: string): string {
  const t = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) { const [y,mo,d]=t.split('-'); return `${d}-${mo}-${y}`; }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(t)) return t.replace(/\//g,'-');
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(t)) return t.replace(/\./g,'-');
  if (/^\d{8}$/.test(t)) return `${t.slice(0,2)}-${t.slice(2,4)}-${t.slice(4)}`;
  if (/^\d{2}-\d{2}-\d{4}$/.test(t)) return t;
  const digits = t.replace(/\D/g,'').slice(0,8);
  if (digits.length<=2) return digits;
  if (digits.length<=4) return `${digits.slice(0,2)}-${digits.slice(2)}`;
  return `${digits.slice(0,2)}-${digits.slice(2,4)}-${digits.slice(4)}`;
}

export default function DateInput({ value, onChange, placeholder='DD-MM-YYYY', style, max, min, disabled }: DateInputProps) {
  const maxDate = max ?? todayISO();
  const [text, setText] = useState(toDisplay(value));
  const [error, setError] = useState('');
  const pickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setText(toDisplay(value)); setError(''); }, [value]);

  const validate = (display: string) => {
    if (!display) { setError(''); onChange(''); return; }
    const iso = toISO(display);
    if (!iso || !isValidISO(iso)) { setError('Invalid date'); return; }
    if (iso > maxDate) { setError('Future date not allowed'); return; }
    if (min && iso < min) { setError('Date too early'); return; }
    setError('');
    onChange(iso);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g,'').slice(0,8);
    let f = digits;
    if (digits.length > 2) f = `${digits.slice(0,2)}-${digits.slice(2)}`;
    if (digits.length > 4) f = `${digits.slice(0,2)}-${digits.slice(2,4)}-${digits.slice(4)}`;
    setText(f);
    if (f.length === 10) validate(f);
    else if (f.length === 0) { setError(''); onChange(''); }
    else setError('');
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const norm = normalizeInput(e.clipboardData.getData('text'));
    setText(norm);
    if (norm.length === 10) validate(norm);
  };

  const handleBlur = () => { if (text.length > 0 && text.length < 10) setError('Incomplete date'); };

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const iso = e.target.value;
    if (!iso) return;
    if (iso > maxDate) { setError('Future date not allowed'); setText(toDisplay(iso)); return; }
    setText(toDisplay(iso)); setError(''); onChange(iso);
  };

  const inpStyle: React.CSSProperties = {
    border: `1px solid ${error ? '#DC2626' : T.border}`,
    borderRadius: 7, padding: '6px 30px 6px 10px', fontSize: 13,
    outline: 'none', background: disabled ? '#F9FAFB' : '#fff',
    color: T.text, width: '100%', boxSizing: 'border-box' as const,
    ...style,
    ...(error ? { border: '1px solid #DC2626' } : {}),
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input type="text" value={text} onChange={handleChange} onPaste={handlePaste}
        onBlur={handleBlur} placeholder={placeholder} disabled={disabled}
        maxLength={10} style={inpStyle} />
      <input ref={pickerRef} type="date" max={maxDate} min={min}
        onChange={handlePickerChange} tabIndex={-1}
        style={{ position:'absolute', top:0, right:0, width:28, height:'100%', opacity:0, cursor:'pointer', zIndex:2 }} />
      <span style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', fontSize:13, pointerEvents:'none', zIndex:1 }}>📅</span>
      {error && <div style={{ fontSize:10, color:'#DC2626', marginTop:2 }}>{error}</div>}
    </div>
  );
}
