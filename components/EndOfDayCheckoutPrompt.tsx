import React from 'react';
import { useAttendance } from '@/context/AttendanceContext';

const T = {
  primary: '#0D9488',
  border: '#E2E8F0',
  text: '#1E293B',
  textMuted: '#64748B',
  danger: '#DC2626',
  dangerLight: '#FEF2F2',
};

function currentISTParts(): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
  return { hour, minute };
}

export default function EndOfDayCheckoutPrompt() {
  const { todayLog, loading, checkOut, checkingOut } = useAttendance();
  const [now, setNow] = React.useState(Date.now());
  const [dismissedUntil, setDismissedUntil] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  // Check every 30s — frequent enough to catch the 5:30 PM cutoff promptly without excessive re-renders
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  if (loading) return null;
  const isCheckedIn = !!todayLog?.checkInAt && !todayLog?.checkOutAt;
  if (!isCheckedIn) return null;
  if (now < dismissedUntil) return null;

  const { hour, minute } = currentISTParts();
  const pastCutoff = hour > 17 || (hour === 17 && minute >= 30);
  if (!pastCutoff) return null;

  const handleCheckOut = async () => {
    setError(null);
    const res = await checkOut();
    if (!res.success) setError(res.error || 'Check-out failed');
  };

  const handleSnooze = () => setDismissedUntil(Date.now() + 15 * 60 * 1000);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 26, width: '100%', maxWidth: 380, boxShadow: '0 12px 40px rgba(0,0,0,0.25)', textAlign: 'center' as const }}>
        <div style={{ fontSize: 34, marginBottom: 10 }}>⏰</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 6 }}>Wrapping up for today?</div>
        <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 20, lineHeight: 1.5 }}>
          It's past 5:30 PM — let us know if you're done for the day.
        </div>
        {error && (
          <div style={{ background: T.dangerLight, color: T.danger, borderRadius: 8, padding: '8px 12px', fontSize: 12, marginBottom: 14, textAlign: 'left' as const }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleSnooze}
            style={{ flex: 1, background: '#fff', border: `1px solid ${T.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, fontWeight: 600, color: T.text, cursor: 'pointer' }}>
            Remind Me in 15 Min
          </button>
          <button onClick={handleCheckOut} disabled={checkingOut}
            style={{ flex: 1, background: T.primary, border: 'none', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontWeight: 700, color: '#fff',
              cursor: checkingOut ? 'not-allowed' : 'pointer', opacity: checkingOut ? 0.7 : 1 }}>
            {checkingOut ? 'Checking out…' : 'Check Out Now'}
          </button>
        </div>
      </div>
    </div>
  );
}
