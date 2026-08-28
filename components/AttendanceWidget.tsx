import React from 'react';
import { useAttendance } from '@/context/AttendanceContext';

const T = {
  primary: '#0D9488',
  primaryLight: '#F0FDFA',
  bg: '#F8FAFC',
  border: '#E2E8F0',
  text: '#1E293B',
  textMuted: '#64748B',
  danger: '#DC2626',
  dangerLight: '#FEF2F2',
  warning: '#D97706',
  warningLight: '#FFFBEB',
};

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function AttendanceWidget() {
  const { todayLog, loading, checkingIn, checkingOut, checkIn, checkOut } = useAttendance();
  const [now, setNow] = React.useState(Date.now());
  const [error, setError] = React.useState<string | null>(null);
  const [justCheckedOutHours, setJustCheckedOutHours] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!todayLog?.checkInAt || todayLog?.checkOutAt) return;
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, [todayLog?.checkInAt, todayLog?.checkOutAt]);

  if (loading) return null;

  const isCheckedIn = !!todayLog?.checkInAt && !todayLog?.checkOutAt;
  const isDoneForDay = !!todayLog?.checkOutAt;

  const elapsedSeconds = todayLog?.checkInAt
    ? Math.max(0, Math.floor((now - new Date(todayLog.checkInAt).getTime()) / 1000))
    : 0;

  const totalSecondsForDay = todayLog?.checkInAt && todayLog?.checkOutAt
    ? Math.max(0, Math.floor((new Date(todayLog.checkOutAt).getTime() - new Date(todayLog.checkInAt).getTime()) / 1000))
    : 0;

  const handleCheckIn = async () => {
    setError(null);
    const res = await checkIn();
    if (!res.success) setError(res.error || 'Check-in failed');
  };

  const handleCheckOut = async () => {
    setError(null);
    const res = await checkOut();
    if (!res.success) { setError(res.error || 'Check-out failed'); return; }
    setJustCheckedOutHours(formatElapsed(elapsedSeconds));
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
      {error && (
        <div style={{ position: 'absolute', top: 42, right: 0, background: T.dangerLight, border: `1px solid #FECACA`,
          borderRadius: 8, padding: '8px 12px', fontSize: 11, color: T.danger, zIndex: 200, maxWidth: 260, whiteSpace: 'normal' as const }}>
          {error}
        </div>
      )}

      {isDoneForDay ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: T.bg, border: `1px solid ${T.border}`,
          borderRadius: 8, padding: '6px 12px', fontSize: 12, color: T.textMuted }}>
          <span>✅</span>
          <span>Checked out — {formatElapsed(totalSecondsForDay)} logged</span>
        </div>
      ) : isCheckedIn ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: T.primaryLight, border: `1px solid ${T.primary}`,
            borderRadius: 8, padding: '6px 10px', fontSize: 11, color: T.primary, fontWeight: 600 }}>
            <span>{todayLog?.workMode === 'office' ? '🏢' : '🏠'}</span>
            <span>{todayLog?.workMode === 'office' ? 'Office' : 'Home'}{todayLog?.workMode === 'home' && todayLog?.wfhStatus === 'pending' ? ' (pending)' : ''}</span>
            <span style={{ color: T.textMuted, fontWeight: 400 }}>·</span>
            <span>{formatElapsed(elapsedSeconds)}</span>
          </div>
          <button onClick={handleCheckOut} disabled={checkingOut}
            style={{ background: T.danger, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px',
              fontSize: 12, fontWeight: 600, cursor: checkingOut ? 'not-allowed' : 'pointer', opacity: checkingOut ? 0.7 : 1, whiteSpace: 'nowrap' }}>
            {checkingOut ? 'Checking out…' : '⏹ Check Out'}
          </button>
        </>
      ) : (
        <button onClick={handleCheckIn} disabled={checkingIn}
          style={{ background: T.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px',
            fontSize: 12, fontWeight: 600, cursor: checkingIn ? 'not-allowed' : 'pointer', opacity: checkingIn ? 0.7 : 1, whiteSpace: 'nowrap' }}>
          {checkingIn ? 'Checking in…' : '▶ Check In'}
        </button>
      )}
    </div>
  );
}
