import React, { useState, useRef, useEffect } from 'react';
import { T } from '@/lib/theme';

interface DateInputProps {
  value: string;           // YYYY-MM-DD (internal format)
  onChange: (val: string) => void; // returns YYYY-MM-DD
  placeholder?: string;
  style?: React.CSSProperties;
  max?: string;            // YYYY-MM-DD, defaults to today
  min?: string;            // YYYY-MM-DD
  disabled?: boolean;
}

// Convert YYYY-MM-DD → DD-MM-YYYY for display
function toDisplay(iso: string): string {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

// Convert DD-MM-YYYY → YYYY-MM-DD for storage
function toISO(display: string): string {
  if (!display) return '';
  const parts = display.split('-');
  if (parts.length !== 3) return '';
  const [dd, mm, yyyy] = parts;
  if (dd.length !== 2 || mm.length !== 2 || yyyy.length !== 4) return '';
  return `${yyyy}-${mm}-${dd}`;
}

function isValidDate(display: string): boolean {
  if (!display) return true; // empty is valid
  if (!/^\d{2}-\d{2}-\d{4}$/.test(display)) return false;
  const iso = toISO(display);
  if (!iso) return false;
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return false;
  // Check day/month are in range
  const [dd, mm, yyyy] = display.split('-').map(Number);
  if (mm < 1 || mm > 12) return false;
  if (dd < 1 || dd > new Date(yyyy, mm, 0).getDate()) return false;
  return true;
}

export default function DateInput({ value, onChange, placeholder = 'DD-MM-YYYY', style, max, min, disabled }: DateInputProps) {
  const today = new Date().toISOString().split('T')[0];
  const maxDate = max || today;

  const [display, setDisplay] = useState(toDisplay(value));
  const [error, setError] = useState(false);
  const pickerRef = useRef<HTMLInputElement>(null);

  // Sync display when value changes externally
  useEffect(() => {
    setDisplay(toDisplay(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplay(raw);

    // Auto-insert dashes
    let formatted = raw.replace(/[^\d]/g, '');
    if (formatted.length >= 3) formatted = formatted.slice(0,2) + '-' + formatted.slice(2);
    if (formatted.length >= 6) formatted = formatted.slice(0,5) + '-' + formatted.slice(5);
    formatted = formatted.slice(0, 10);

    if (formatted !== raw) {
      setDisplay(formatted);
    }

    // Validate and emit
    if (formatted.length === 10) {
      const valid = isValidDate(formatted);
      const iso = toISO(formatted);
      const isFuture = maxDate && iso > maxDate;
      if (valid && iso && !isFuture) {
        setError(false);
        onChange(iso);
      } else {
        setError(true);
      }
    } else if (formatted.length === 0) {
      setError(false);
      onChange('');
    }
  };

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const iso = e.target.value; // YYYY-MM-DD
    if (iso) {
      setDisplay(toDisplay(iso));
      setError(false);
      onChange(iso);
    }
  };

  const baseStyle: React.CSSProperties = {
    border: `1px solid ${error ? '#DC2626' : T.border}`,
    borderRadius: 7,
    padding: '6px 36px 6px 10px',
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
        placeholder={placeholder}
        disabled={disabled}
        maxLength={10}
        style={baseStyle}
      />
      {/* Hidden native date picker triggered by calendar icon */}
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
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: disabled ? 'default' : 'pointer',
          padding: 0, color: T.textMuted, fontSize: 14, display: 'flex', alignItems: 'center',
        }}
        title="Pick date"
      >
        📅
      </button>
      {error && (
        <div style={{ fontSize: 10, color: '#DC2626', marginTop: 2 }}>
          Invalid date or future date not allowed
        </div>
      )}
    </div>
  );
}
