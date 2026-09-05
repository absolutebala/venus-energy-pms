import React from 'react';
import { useAttendance } from '@/context/AttendanceContext';
import { createClient } from '@/lib/supabase';

const supabase = createClient();

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
  leave: '#7C3AED',
  leaveLight: '#F5F3FF',
};

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatElapsedWithSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}

function formatClockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

const SIX_HOURS_SECONDS = 6 * 60 * 60;

function todayIST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export default function AttendanceWidget() {
  const { todayLog, loading, checkingIn, checkingOut, checkIn, checkOut } = useAttendance();
  const [now, setNow] = React.useState(Date.now());
  const [error, setError] = React.useState<string | null>(null);
  const [leaveModalOpen, setLeaveModalOpen] = React.useState(false);
  const [leaveDates, setLeaveDates] = React.useState<string[]>([todayIST()]);
  const [leaveReason, setLeaveReason] = React.useState('');
  const [submittingLeave, setSubmittingLeave] = React.useState(false);
  const [leaveToast, setLeaveToast] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!todayLog?.checkInAt || todayLog?.checkOutAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
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
  };

  const openLeaveModal = () => {
    setLeaveDates([todayIST()]);
    setLeaveReason('');
    setLeaveModalOpen(true);
  };

  const addLeaveDate = () => setLeaveDates(prev => [...prev, todayIST()]);
  const updateLeaveDate = (i: number, v: string) => setLeaveDates(prev => prev.map((d, idx) => idx === i ? v : d));
  const removeLeaveDate = (i: number) => setLeaveDates(prev => prev.filter((_, idx) => idx !== i));

  const submitLeave = async () => {
    if (leaveDates.length === 0 || !leaveReason.trim()) return;
    setSubmittingLeave(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/attendance/apply-leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ dates: leaveDates, reason: leaveReason.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { setLeaveToast('❌ ' + (json.error || 'Failed to submit leave')); return; }
      setLeaveToast('✅ Leave request submitted for approval');
      setLeaveModalOpen(false);
    } finally {
      setSubmittingLeave(false);
      setTimeout(() => setLeaveToast(null), 4000);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
      {error && (
        <div style={{ position: 'absolute', top: 42, right: 0, background: T.dangerLight, border: `1px solid #FECACA`,
          borderRadius: 8, padding: '8px 12px', fontSize: 11, color: T.danger, zIndex: 200, maxWidth: 260, whiteSpace: 'normal' as const }}>
          {error}
        </div>
      )}
      {leaveToast && (
        <div style={{ position: 'absolute', top: 42, right: 0, background: '#D1FAE5', border: '1px solid #6EE7B7',
          borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#059669', zIndex: 200, maxWidth: 280, whiteSpace: 'normal' as const }}>
          {leaveToast}
        </div>
      )}

      {isDoneForDay ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, background: T.bg, border: `1px solid ${T.border}`,
          borderRadius: 8, padding: '6px 12px', fontSize: 11, color: T.textMuted }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <span>✅ In: {todayLog?.checkInAt ? formatClockTime(todayLog.checkInAt) : '—'}</span>
            <span>Out: {todayLog?.checkOutAt ? formatClockTime(todayLog.checkOutAt) : '—'}</span>
          </div>
          <div style={{ fontWeight: 700, color: T.text, fontSize: 12 }}>
            {totalSecondsForDay < SIX_HOURS_SECONDS ? 'Present (Early Checkout)' : 'Present'}
          </div>
          <div>Total Working Hours: {formatElapsed(totalSecondsForDay)}</div>
        </div>
      ) : isCheckedIn ? (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, background: T.primaryLight, border: `1px solid ${T.primary}`,
            borderRadius: 8, padding: '6px 10px', fontSize: 11, color: T.primary, fontWeight: 600 }}>
            <span>{todayLog?.workMode === 'office' ? '🏢' : '🏠'} Present{todayLog?.workMode === 'home' && todayLog?.wfhStatus === 'pending' ? ' (pending)' : ''}</span>
            <span style={{ fontWeight: 400 }}>{formatElapsedWithSeconds(elapsedSeconds)}</span>
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

      <button onClick={openLeaveModal}
        style={{ background: '#fff', color: T.leave, border: `1px solid ${T.leave}`, borderRadius: 8, padding: '7px 14px',
          fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
        🗓 Apply Leave
      </button>

      {leaveModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setLeaveModalOpen(false)}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, width: 380, boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 4 }}>Apply Leave</div>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 14 }}>Select one or more dates. This will be sent to your manager and Super Admin for approval.</div>

            {leaveDates.map((d, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <input type="date" value={d} onChange={e => updateLeaveDate(i, e.target.value)}
                  style={{ flex: 1, border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 10px', fontSize: 13 }} />
                {leaveDates.length > 1 && (
                  <button onClick={() => removeLeaveDate(i)}
                    style={{ background: 'none', border: 'none', color: T.danger, cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>✕</button>
                )}
              </div>
            ))}
            <button onClick={addLeaveDate}
              style={{ background: 'none', border: 'none', color: T.leave, cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0, marginBottom: 14 }}>
              + Add another date
            </button>

            <textarea value={leaveReason} onChange={e => setLeaveReason(e.target.value)} placeholder="Reason for leave..."
              rows={3} style={{ width: '100%', border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 10px', fontSize: 12,
                marginBottom: 14, boxSizing: 'border-box' as const, resize: 'vertical' as const, fontFamily: 'inherit' }} />

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setLeaveModalOpen(false)}
                style={{ border: `1px solid ${T.border}`, background: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer', color: T.text }}>
                Cancel
              </button>
              <button onClick={submitLeave} disabled={submittingLeave || !leaveReason.trim() || leaveDates.some(d => !d)}
                style={{ background: T.leave, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', opacity: submittingLeave || !leaveReason.trim() || leaveDates.some(d => !d) ? 0.6 : 1 }}>
                {submittingLeave ? 'Submitting…' : 'Submit Leave Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
