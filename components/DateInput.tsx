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

const today = () => new Date().toISOString().split('T')[0];

function toDisplay(iso: string): string {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length !== 3 || parts[0].length !== 4) return iso;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function toISO(display: string): string {
  if (!display) return '';
  const parts = display.split('-');
  if (parts.length !== 3) return '';
  const [dd, mm, yyyy] = parts;
  if (dd.length !== 2 || mm.length !== 2 || yyyy.length !== 4) return '';
  return `${yyyy}-${mm}-${dd}`;
}

function isValidDate(display: string): boolean {
  if (!display) return true;
  if (!/^\d{2}-\d{2}-\d{4}$/.test(display)) return false;
  const iso = toISO(display);
  if (!iso) return false;
  const [dd, mm, yyyy] = display.split('-').map(Number);
  if (mm < 1 || mm > 12) return false;
  if (dd < 1 || dd > new Date(yyyy, mm, 0).getDate()) return false;
  const dt = new Date(iso);
  return !isNaN(dt.getTime());
}

// Format raw digits into DD-MM-YYYY
function formatDigits(digits: string): string {
  const d = digits.slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0,2)}-${d.slice(2)}`;
  return `${d.slice(0,2)}-${d.slice(2,4)}-${d.slice(4)}`;
}

export default function DateInput({ value, onChange, placeholder = 'DD-MM-YYYY', style, max, min, disabled }: DateInputProps) {
  const maxDate = max || today();
  const [display, setDisplay] = useState(toDisplay(value));
  const [error, setError] = useState(false);
  const pickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplay(toDisplay(value));
    setError(false);
  }, [value]);

  const processInput = (raw: string) => {
    // Strip everything except digits and dashes
    // Support pasted formats: DD-MM-YYYY, DD/MM/YYYY, DDMMYYYY, YYYY-MM-DD
    let cleaned = raw.trim();

    // If pasted in YYYY-MM-DD format, convert to DD-MM-YYYY
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
      const parts = cleaned.split('-');
      cleaned = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    // If pasted as DD/MM/YYYY
    else if (/^\d{2}\/\d{2}\/\d{4}$/.test(cleaned)) {
      cleaned = cleaned.replace(/\//g, '-');
    }
    // Otherwise extract digits and format
    else {
      const digits = cleaned.replace(/\D/g, '');
      cleaned = formatDigits(digits);
    }

    // Limit to 10 chars
    cleaned = cleaned.slice(0, 10);
    setDisplay(cleaned);

    if (cleaned.length === 0) {
      setError(false);
      onChange('');
      return;
    }

    if (cleaned.length === 10) {
      const valid = isValidDate(cleaned);
      const iso = toISO(cleaned);
      const isFuture = iso > maxDate;
      const isTooEarly = min && iso < min;
      if (valid && iso && !isFuture && !isTooEarly) {
        setError(false);
        onChange(iso);
      } else {
        setError(true);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processInput(e.target.value);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    processInput(pasted);
  };

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const iso = e.target.value;
    if (!iso) return;
    // Enforce max on picker too
    if (iso > maxDate) {
      setError(true);
      setDisplay(toDisplay(iso));
      return;
    }
    setDisplay(toDisplay(iso));
    setError(false);
    onChange(iso);
  };

  const baseStyle: React.CSSProperties = {
    border: `1px solid ${error ? '#DC2626' : T.border}`,
    borderRadius: 7,
    padding: '6px 32px 6px 10px',
    fontSize: 13,
    outline: 'none',
    background: disabled ? T.bg : '#fff',
    color: T.text,
    width: '100%',
    boxSizing: 'border-box' as const,
    ...style,
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
      <input
        type="text"
        value={display}
        onChange={handleChange}
        onPaste={handlePaste}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={10}
        style={baseStyle}
      />
      <input
        ref={pickerRef}
        type="date"
        value={value || ''}
        max={maxDate}
        min={min}
        onChange={handlePickerChange}
        tabIndex={-1}
        style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          opacity: 0, pointerEvents: 'none',
        }}
      />
      <button
        type="button"
        onClick={() => pickerRef.current?.showPicker?.()}
        disabled={disabled}
        style={{
          position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: disabled ? 'default' : 'pointer',
          padding: 0, color: T.textMuted, fontSize: 13, lineHeight: 1,
        }}
        title="Pick date"
      >📅</button>
      {error && (
        <div style={{ fontSize: 10, color: '#DC2626', marginTop: 2 }}>
          Invalid or future date not allowed
        </div>
      )}
    </div>
  );
}
