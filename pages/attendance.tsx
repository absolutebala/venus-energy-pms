import React from 'react';
import Layout from '@/components/Layout';
import { useRouter } from 'next/router';
import { ATTENDANCE_ENABLED } from '@/lib/featureFlags';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase';
import * as XLSX from 'xlsx';

const supabase = createClient();

const T = {
  primary: '#0D9488', primaryLight: '#F0FDFA', bg: '#F8FAFC', text: '#1E293B',
  textMuted: '#64748B', border: '#E2E8F0', danger: '#DC2626', dangerLight: '#FEF2F2',
  warning: '#D97706', warningLight: '#FFFBEB', success: '#16A34A', successLight: '#F0FDF4',
  leave: '#7C3AED', leaveLight: '#F5F3FF',
};

const card: React.CSSProperties = { background: '#fff', border: `1px solid ${T.border}`, borderRadius: 12, padding: 18 };
const btn: React.CSSProperties = { border: `1px solid ${T.border}`, background: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', color: T.text };
const btnActive: React.CSSProperties = { ...btn, background: T.primary, color: '#fff', border: `1px solid ${T.primary}` };

// toISOString() converts to UTC — for IST (UTC+5:30), local midnight becomes 18:30 the PREVIOUS
// day in UTC, silently shifting every day-row's match-key back by one day. This broke matching
// against real attendance_logs rows (which store the correct local date) for every user in IST.
function fmtDate(d: Date): string { return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); }
function fmtDayLabel(d: Date): string { return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }); }
function isSameDay(a: Date, b: Date): boolean { return fmtDate(a) === fmtDate(b); }
function startOfWeek(d: Date): Date { const r = new Date(d); const day = r.getDay(); r.setDate(r.getDate() - day); r.setHours(0,0,0,0); return r; }
function startOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), 1); }
function daysInMonth(d: Date): number { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }
function fmtWhen(iso: string): string { return new Date(iso).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }); }
function fmtClock(iso: string): string { return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }); }

interface AttLog {
  id: string; user_id: string; log_date: string; check_in_at: string | null; check_out_at: string | null;
  work_mode: 'office' | 'home' | null; wfh_status: 'pending' | 'approved' | 'rejected' | null;
}
interface AttReq {
  id: string; user_id: string; request_date: string; requested_status: 'present' | 'absent' | 'leave';
  reason: string | null; status: 'pending' | 'approved' | 'rejected'; source: 'user' | 'admin';
  requested_by: string; approved_by: string | null; approved_at: string | null;
}

function hoursFor(log?: AttLog): string {
  if (!log?.check_in_at) return '';
  const end = log.check_out_at ? new Date(log.check_out_at).getTime() : Date.now();
  const secs = Math.max(0, Math.floor((end - new Date(log.check_in_at).getTime()) / 1000));
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60);
  return `${h}h ${m}m`;
}

const SIX_HOURS_SECONDS = 6 * 60 * 60;
// "Present" once checked in; "Present (Early Checkout)" if they checked out under 6 hours
function presenceLabel(log: AttLog): string {
  if (!log.check_in_at || !log.check_out_at) return 'Present';
  const secs = Math.max(0, Math.floor((new Date(log.check_out_at).getTime() - new Date(log.check_in_at).getTime()) / 1000));
  return secs < SIX_HOURS_SECONDS ? 'Present (Early Checkout)' : 'Present';
}

interface CellInfo {
  label: string; bg: string; color: string; log?: AttLog; pendingWfh?: AttLog;
  pendingRequest?: AttReq; approvedRequest?: AttReq; isFuture: boolean; isWeeklyOff: boolean; hoursLabel?: string; timesLabel?: string;
}

function cellFor(userId: string, day: Date, logs: AttLog[], requests: AttReq[]): CellInfo {
  const today = new Date(); today.setHours(0,0,0,0);
  const dayStart = new Date(day); dayStart.setHours(0,0,0,0);
  const dateStr = fmtDate(day);
  const isFuture = dayStart > today;
  const isWeeklyOff = day.getDay() === 0;

  const dayRequests = requests.filter(r => r.user_id === userId && r.request_date === dateStr);
  const approvedRequest = dayRequests.find(r => r.status === 'approved');
  const pendingRequest = dayRequests.find(r => r.status === 'pending');

  if (isFuture) return { label: '—', bg: 'transparent', color: T.textMuted, isFuture, isWeeklyOff };
  if (isWeeklyOff) return { label: 'Weekly Off', bg: T.bg, color: T.textMuted, isFuture, isWeeklyOff };

  if (approvedRequest) {
    const underlyingLog = logs.find(l => l.user_id === userId && l.log_date === dateStr);
    if (approvedRequest.requested_status === 'leave') {
      return { label: 'Leave', bg: T.leaveLight, color: T.leave, approvedRequest,
        hoursLabel: underlyingLog ? hoursFor(underlyingLog) : undefined, isFuture, isWeeklyOff };
    }
    const label = approvedRequest.requested_status === 'present' ? 'Present (marked)' : 'Absent (marked)';
    return { label, bg: approvedRequest.requested_status === 'present' ? T.successLight : T.dangerLight,
      color: approvedRequest.requested_status === 'present' ? T.success : T.danger, approvedRequest,
      hoursLabel: underlyingLog ? hoursFor(underlyingLog) : undefined, isFuture, isWeeklyOff };
  }

  const log = logs.find(l => l.user_id === userId && l.log_date === dateStr);
  // A PAST day (not today) with a check-in but no check-out is incomplete — without this, hoursFor()
  // computes elapsed time as (now - checkInAt) with no upper bound, so a forgotten checkout just keeps
  // accumulating across calendar days (e.g. "79h 54m" for a Monday check-in never closed out by Thursday).
  // Treat it exactly like Absent instead — same styling, same Request-for-Present eligibility — so the
  // employee has to explicitly get it corrected/approved rather than it silently running forever.
  const isPastDay = dayStart < today;
  const isIncomplete = !!log?.check_in_at && !log?.check_out_at && isPastDay;
  if (!log || isIncomplete) {
    if (pendingRequest) {
      const label = pendingRequest.requested_status === 'leave' ? 'Leave (Pending)' : 'Absent (Request Pending)';
      return { label, bg: T.warningLight, color: T.warning, pendingRequest, isFuture, isWeeklyOff };
    }
    return { label: 'Absent', bg: T.dangerLight, color: T.danger, isFuture, isWeeklyOff };
  }
  const timesLabel = log.check_in_at ? `In: ${fmtClock(log.check_in_at)}${log.check_out_at ? ` · Out: ${fmtClock(log.check_out_at)}` : ''}` : undefined;
  if (log.work_mode === 'office') return { label: presenceLabel(log), hoursLabel: hoursFor(log), timesLabel, bg: T.successLight, color: T.success, log, isFuture, isWeeklyOff };
  if (log.work_mode === 'home') {
    if (log.wfh_status === 'approved') return { label: presenceLabel(log), hoursLabel: hoursFor(log), timesLabel, bg: '#EFF6FF', color: '#2563EB', log, isFuture, isWeeklyOff };
    if (log.wfh_status === 'rejected') return { label: 'Leave (WFH rejected)', bg: T.dangerLight, color: T.danger, log, isFuture, isWeeklyOff };
    return { label: 'WFH (Pending)', hoursLabel: hoursFor(log), bg: T.warningLight, color: T.warning, log, pendingWfh: log, isFuture, isWeeklyOff };
  }
  return { label: 'Absent', bg: T.dangerLight, color: T.danger, isFuture, isWeeklyOff };
}

export default function AttendancePage() {
  const router = useRouter();
  React.useEffect(() => { if (!ATTENDANCE_ENABLED) router.replace('/dashboard'); }, [router]);
  const { profile } = useAuth();
  if (!ATTENDANCE_ENABLED) return null;
  const [tab, setTab] = React.useState<'my' | 'team'>('my');
  const [viewMode, setViewMode] = React.useState<'week' | 'month'>('week');
  const [anchor, setAnchor] = React.useState(new Date());
  const [myLogs, setMyLogs] = React.useState<AttLog[]>([]);
  const [myRequests, setMyRequests] = React.useState<AttReq[]>([]);
  const [teamMembers, setTeamMembers] = React.useState<{ id: string; full_name: string | null; email: string }[]>([]);
  const [teamLogs, setTeamLogs] = React.useState<AttLog[]>([]);
  const [teamRequests, setTeamRequests] = React.useState<AttReq[]>([]);
  const [nameMap, setNameMap] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [popupCell, setPopupCell] = React.useState<{ userId: string; date: string; info: CellInfo; canManage: boolean } | null>(null);
  const [requestModal, setRequestModal] = React.useState<string | null>(null);
  const [requestReason, setRequestReason] = React.useState('');
  const [leaveModal, setLeaveModal] = React.useState<string[] | null>(null);
  const [leaveReason, setLeaveReason] = React.useState('');
  const [toast, setToast] = React.useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const isSuperAdmin = profile?.role === 'super_admin';

  // Default to Team view for Super Admin and Region Manager, once the role is known
  React.useEffect(() => {
    if (profile?.role === 'super_admin' || profile?.role === 'region_manager') {
      setTab('team');
    }
  }, [profile?.role]);

  const days: Date[] = React.useMemo(() => {
    if (viewMode === 'week') {
      const start = startOfWeek(anchor);
      return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
    }
    const start = startOfMonth(anchor);
    const n = daysInMonth(anchor);
    return Array.from({ length: n }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
  }, [anchor, viewMode]);

  const rangeStart = fmtDate(days[0]);
  const rangeEnd = fmtDate(days[days.length - 1]);

  // Name lookup map — fetched ONCE on mount, not on every date-range navigation or after every action
  React.useEffect(() => {
    supabase.from('profiles').select('id,full_name,email').then(({ data }) => {
      const map: Record<string, string> = {};
      (data || []).forEach((p: any) => { map[p.id] = p.full_name || p.email; });
      setNameMap(map);
    });
  }, []);

  const loadData = React.useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);

    // First wave — independent queries run in parallel
    const [ownRes, ownReqRes, membersRes] = await Promise.all([
      supabase.from('attendance_logs').select('*')
        .eq('user_id', profile.id).gte('log_date', rangeStart).lte('log_date', rangeEnd),
      supabase.from('attendance_requests').select('*')
        .eq('user_id', profile.id).gte('request_date', rangeStart).lte('request_date', rangeEnd),
      isSuperAdmin
        ? supabase.from('profiles').select('id,full_name,email').neq('id', profile.id).neq('role', 'vendor').order('full_name')
        : supabase.from('profiles').select('id,full_name,email').eq('manager_id', profile.id).neq('role', 'vendor').order('full_name'),
    ]);

    setMyLogs(ownRes.data || []);
    setMyRequests(ownReqRes.data || []);
    const members = membersRes.data || [];
    setTeamMembers(members);

    // Second wave — depends on the team member ids resolved above
    if (members.length > 0) {
      const ids = members.map((m: any) => m.id);
      const [logsRes, reqsRes] = await Promise.all([
        supabase.from('attendance_logs').select('*')
          .in('user_id', ids).gte('log_date', rangeStart).lte('log_date', rangeEnd),
        supabase.from('attendance_requests').select('*')
          .in('user_id', ids).gte('request_date', rangeStart).lte('request_date', rangeEnd),
      ]);
      setTeamLogs(logsRes.data || []);
      setTeamRequests(reqsRes.data || []);
    } else {
      setTeamLogs([]); setTeamRequests([]);
    }

    setLoading(false);
  }, [profile?.id, isSuperAdmin, rangeStart, rangeEnd]);

  React.useEffect(() => { loadData(); }, [loadData]);

  const hasTeam = teamMembers.length > 0;

  const nav = (dir: -1 | 1) => {
    const d = new Date(anchor);
    if (viewMode === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setAnchor(d);
  };

  const authHeader = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` };
  };

  const submitPresentRequest = async () => {
    if (!requestModal || !requestReason.trim()) return;
    setBusy('request');
    try {
      const res = await fetch('/api/attendance/request-present', {
        method: 'POST', headers: await authHeader(),
        body: JSON.stringify({ requestDate: requestModal, reason: requestReason.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { setToast({ msg: '❌ ' + (json.error || 'Failed'), type: 'error' }); return; }
      setToast({ msg: '✅ Request submitted for approval', type: 'success' });
      setRequestModal(null); setRequestReason('');
      if (json.request) setMyRequests(prev => [...prev, json.request]);
    } finally { setBusy(null); }
  };

  const addLeaveDate = () => setLeaveModal(prev => [...(prev || []), fmtDate(new Date())]);
  const updateLeaveDate = (i: number, v: string) => setLeaveModal(prev => (prev || []).map((d, idx) => idx === i ? v : d));
  const removeLeaveDate = (i: number) => setLeaveModal(prev => (prev || []).filter((_, idx) => idx !== i));

  const submitLeaveRequest = async () => {
    if (!leaveModal || leaveModal.length === 0 || !leaveReason.trim()) return;
    setBusy('leave');
    try {
      const res = await fetch('/api/attendance/apply-leave', {
        method: 'POST', headers: await authHeader(),
        body: JSON.stringify({ dates: leaveModal, reason: leaveReason.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { setToast({ msg: '❌ ' + (json.error || 'Failed'), type: 'error' }); return; }
      setToast({ msg: '✅ Leave request submitted for approval', type: 'success' });
      setLeaveModal(null); setLeaveReason('');
      if (json.requests) setMyRequests(prev => [...prev, ...json.requests]);
    } finally { setBusy(null); }
  };

  const overrideStatus = async (userId: string, date: string, newStatus: 'present' | 'absent' | 'leave') => {
    setBusy('override');
    try {
      const res = await fetch('/api/attendance/override-status', {
        method: 'POST', headers: await authHeader(),
        body: JSON.stringify({ targetUserId: userId, requestDate: date, newStatus }),
      });
      const json = await res.json();
      if (!res.ok) { setToast({ msg: '❌ ' + (json.error || 'Failed'), type: 'error' }); return; }
      setToast({ msg: `✅ Marked ${newStatus === 'present' ? 'Present' : newStatus === 'leave' ? 'Leave' : 'Absent'}`, type: 'success' });
      setPopupCell(null);
      if (json.request) {
        setTeamRequests(prev => [...prev, json.request]);
        if (userId === profile?.id) setMyRequests(prev => [...prev, json.request]);
      }
    } finally { setBusy(null); }
  };

  const handleWfhAction = async (logId: string, action: 'approve' | 'reject') => {
    setBusy('wfh');
    try {
      const res = await fetch('/api/attendance/approve-wfh', {
        method: 'POST', headers: await authHeader(),
        body: JSON.stringify({ logId, action }),
      });
      const json = await res.json();
      if (res.ok && json.log) {
        setToast({ msg: `✅ WFH ${action === 'approve' ? 'approved' : 'rejected'}`, type: 'success' });
        setPopupCell(null);
        setTeamLogs(prev => prev.map(l => l.id === json.log.id ? json.log : l));
        setMyLogs(prev => prev.map(l => l.id === json.log.id ? json.log : l));
      } else if (!res.ok) {
        setToast({ msg: '❌ ' + (json.error || 'Failed'), type: 'error' });
      }
    } finally { setBusy(null); }
  };

  const handleRequestAction = async (requestId: string, action: 'approve' | 'reject') => {
    setBusy('request-action');
    try {
      const res = await fetch('/api/attendance/approve-request', {
        method: 'POST', headers: await authHeader(),
        body: JSON.stringify({ requestId, action }),
      });
      const json = await res.json();
      if (res.ok && json.request) {
        setToast({ msg: `✅ Request ${action === 'approve' ? 'approved' : 'rejected'}`, type: 'success' });
        setPopupCell(null);
        setTeamRequests(prev => prev.map(r => r.id === json.request.id ? json.request : r));
        setMyRequests(prev => prev.map(r => r.id === json.request.id ? json.request : r));
      } else if (!res.ok) {
        setToast({ msg: '❌ ' + (json.error || 'Failed'), type: 'error' });
      }
    } finally { setBusy(null); }
  };

  const exportExcel = () => {
    const rows = teamMembers.map(m => {
      const row: any = { Employee: m.full_name || m.email };
      days.forEach(d => {
        const c = cellFor(m.id, d, teamLogs, teamRequests);
        row[viewMode === 'week' ? fmtDayLabel(d) : String(d.getDate())] = c.label;
      });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    const label = viewMode === 'week' ? `${rangeStart}_to_${rangeEnd}` : anchor.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }).replace(' ', '_');
    XLSX.writeFile(wb, `Attendance_${label}.xlsx`);
  };

  const renderCellDetail = (info: CellInfo) => {
    if (info.approvedRequest) {
      return (
        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 6 }}>
          Marked by {nameMap[info.approvedRequest.approved_by || ''] || '—'} on {info.approvedRequest.approved_at ? fmtWhen(info.approvedRequest.approved_at) : '—'}
        </div>
      );
    }
    return null;
  };

  return (
    <Layout>
      <div className="fade-in">
        {toast && (
          <div style={{ padding: '8px 14px', borderRadius: 8, marginBottom: 10, fontSize: 13, fontWeight: 600,
            background: toast.type === 'success' ? '#D1FAE5' : '#FEE2E2', color: toast.type === 'success' ? '#059669' : '#DC2626', cursor: 'pointer' }}
            onClick={() => setToast(null)}>{toast.msg}</div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.text }}>Attendance</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {hasTeam && tab === 'team' && (
              <button onClick={exportExcel} style={{ ...btn, background: T.primaryLight, color: T.primary, border: `1px solid ${T.primary}` }}>📥 Export Excel</button>
            )}
            {hasTeam && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setTab('my')} style={tab === 'my' ? btnActive : btn}>My Attendance</button>
                <button onClick={() => setTab('team')} style={tab === 'team' ? btnActive : btn}>Team ({teamMembers.length})</button>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setViewMode('week')} style={viewMode === 'week' ? btnActive : btn}>Week</button>
            <button onClick={() => setViewMode('month')} style={viewMode === 'month' ? btnActive : btn}>Month</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => nav(-1)} style={btn}>‹ Previous {viewMode === 'week' ? 'Week' : 'Month'}</button>
            <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
              {viewMode === 'week' ? `${fmtDayLabel(days[0])} – ${fmtDayLabel(days[days.length-1])}` : anchor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={() => nav(1)} style={btn}>Next {viewMode === 'week' ? 'Week' : 'Month'} ›</button>
          </div>
        </div>

        {loading ? (
          <div style={{ ...card, textAlign: 'center', padding: 40, color: T.textMuted }}>Loading...</div>
        ) : tab === 'my' || !hasTeam ? (
          <div style={{ ...card, overflowX: 'auto' as const }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
              <thead>
                <tr>{['Date', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '8px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, color: T.primary, textAlign: 'left' as const, borderBottom: `2px solid ${T.border}` }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {days.map((d, i) => {
                  const c = cellFor(profile?.id || '', d, myLogs, myRequests);
                  const canRequest = !c.isFuture && !c.isWeeklyOff && c.label === 'Absent';
                  return (
                    <tr key={i} style={{ background: isSameDay(d, new Date()) ? T.primaryLight : (i % 2 === 0 ? '#fff' : T.bg) }}>
                      <td style={{ padding: '9px 10px', fontSize: 12, borderBottom: `1px solid ${T.border}` }}>{fmtDayLabel(d)}</td>
                      <td style={{ padding: '9px 10px', borderBottom: `1px solid ${T.border}` }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: c.color, background: c.bg, padding: '3px 10px', borderRadius: 20 }}>{c.label}</span>
                        {c.timesLabel && <div style={{ fontSize: 10, color: T.textMuted, marginTop: 3 }}>{c.timesLabel}</div>}
                        {c.hoursLabel && <div style={{ fontSize: 10, color: T.textMuted, marginTop: 1 }}>{c.hoursLabel} logged</div>}
                        {renderCellDetail(c)}
                      </td>
                      <td style={{ padding: '9px 10px', borderBottom: `1px solid ${T.border}` }}>
                        {canRequest && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => { setRequestModal(fmtDate(d)); setRequestReason(''); }}
                              style={{ ...btn, fontSize: 11, padding: '4px 10px' }}>Request for Present</button>
                            <button onClick={() => { setLeaveModal([fmtDate(d)]); setLeaveReason(''); }}
                              style={{ ...btn, fontSize: 11, padding: '4px 10px', color: T.leave, border: `1px solid ${T.leave}` }}>Apply as Leave</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ ...card, overflowX: 'auto' as const }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, color: T.primary, textAlign: 'left' as const, borderBottom: `2px solid ${T.border}`, position: 'sticky' as const, left: 0, background: '#fff' }}>Employee</th>
                  {days.map((d, i) => (
                    <th key={i} style={{ padding: '8px 10px', fontSize: 10, fontWeight: 700, color: T.primary, textAlign: 'center' as const, borderBottom: `2px solid ${T.border}`, whiteSpace: 'nowrap' as const }}>
                      {viewMode === 'week' ? fmtDayLabel(d) : d.getDate()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((m, mi) => (
                  <tr key={m.id} style={{ background: mi % 2 === 0 ? '#fff' : T.bg }}>
                    <td style={{ padding: '9px 10px', fontSize: 12, fontWeight: 600, color: T.text, borderBottom: `1px solid ${T.border}`, position: 'sticky' as const, left: 0, background: mi % 2 === 0 ? '#fff' : T.bg, whiteSpace: 'nowrap' as const }}>
                      {m.full_name || m.email}
                    </td>
                    {days.map((d, di) => {
                      const c = cellFor(m.id, d, teamLogs, teamRequests);
                      const clickable = !c.isFuture && !c.isWeeklyOff;
                      return (
                        <td key={di} style={{ padding: '6px', borderBottom: `1px solid ${T.border}`, textAlign: 'center' as const }}>
                          <span onClick={() => clickable && setPopupCell({ userId: m.id, date: fmtDate(d), info: c, canManage: true })}
                            style={{ fontSize: 10, fontWeight: 600, color: c.color, background: c.bg, padding: '3px 6px', borderRadius: 6, whiteSpace: 'nowrap' as const, cursor: clickable ? 'pointer' : 'default', display: 'inline-block' }}>
                            {viewMode === 'month' ? c.label.split(' (')[0] : c.label}
                          </span>
                          {viewMode === 'week' && c.timesLabel && <div style={{ fontSize: 9, color: T.textMuted, marginTop: 2 }}>{c.timesLabel}</div>}
                          {viewMode === 'week' && c.hoursLabel && <div style={{ fontSize: 9, color: T.textMuted, marginTop: 1 }}>{c.hoursLabel}</div>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {requestModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
            onClick={() => setRequestModal(null)}>
            <div style={{ ...card, width: 360 }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>Request for Present</div>
              <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 12 }}>{requestModal} — this will be sent to your manager and Super Admin for approval.</div>
              <textarea value={requestReason} onChange={e => setRequestReason(e.target.value)} placeholder="Reason for the request..."
                rows={3} style={{ width: '100%', border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 10px', fontSize: 12, marginBottom: 14, boxSizing: 'border-box' as const, resize: 'vertical' as const, fontFamily: 'inherit' }} />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setRequestModal(null)} style={btn}>Cancel</button>
                <button onClick={submitPresentRequest} disabled={busy === 'request' || !requestReason.trim()}
                  style={{ ...btnActive, opacity: busy === 'request' || !requestReason.trim() ? 0.6 : 1 }}>
                  {busy === 'request' ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        )}

        {leaveModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
            onClick={() => setLeaveModal(null)}>
            <div style={{ ...card, width: 380 }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>Apply Leave</div>
              <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 12 }}>Select one or more dates — this will be sent to your manager and Super Admin for approval.</div>
              {leaveModal.map((d, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <input type="date" value={d} onChange={e => updateLeaveDate(i, e.target.value)}
                    style={{ flex: 1, border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 10px', fontSize: 13 }} />
                  {leaveModal.length > 1 && (
                    <button onClick={() => removeLeaveDate(i)} style={{ background: 'none', border: 'none', color: T.danger, cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>✕</button>
                  )}
                </div>
              ))}
              <button onClick={addLeaveDate} style={{ background: 'none', border: 'none', color: T.leave, cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0, marginBottom: 14 }}>
                + Add another date
              </button>
              <textarea value={leaveReason} onChange={e => setLeaveReason(e.target.value)} placeholder="Reason for leave..."
                rows={3} style={{ width: '100%', border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 10px', fontSize: 12, marginBottom: 14, boxSizing: 'border-box' as const, resize: 'vertical' as const, fontFamily: 'inherit' }} />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setLeaveModal(null)} style={btn}>Cancel</button>
                <button onClick={submitLeaveRequest} disabled={busy === 'leave' || !leaveReason.trim() || leaveModal.some(d => !d)}
                  style={{ background: T.leave, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    opacity: busy === 'leave' || !leaveReason.trim() || leaveModal.some(d => !d) ? 0.6 : 1 }}>
                  {busy === 'leave' ? 'Submitting…' : 'Submit Leave Request'}
                </button>
              </div>
            </div>
          </div>
        )}

        {popupCell && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
            onClick={() => setPopupCell(null)}>
            <div style={{ ...card, width: 340 }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>{nameMap[popupCell.userId] || 'Employee'}</div>
              <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 4 }}>{popupCell.date} · Current: {popupCell.info.label}</div>
              {renderCellDetail(popupCell.info)}

              {popupCell.info.pendingWfh && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 8 }}>Pending WFH Approval</div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => handleWfhAction(popupCell.info.pendingWfh!.id, 'approve')} disabled={busy === 'wfh'}
                      style={{ flex: 1, background: T.success, color: '#fff', border: 'none', borderRadius: 8, padding: '7px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>✓ Approve</button>
                    <button onClick={() => handleWfhAction(popupCell.info.pendingWfh!.id, 'reject')} disabled={busy === 'wfh'}
                      style={{ flex: 1, background: T.danger, color: '#fff', border: 'none', borderRadius: 8, padding: '7px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>✕ Reject</button>
                  </div>
                </div>
              )}

              {popupCell.info.pendingRequest && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 4 }}>
                    Pending {popupCell.info.pendingRequest.requested_status === 'leave' ? 'Leave' : 'Present'} Request
                  </div>
                  {popupCell.info.pendingRequest.reason && <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 8, fontStyle: 'italic' as const }}>"{popupCell.info.pendingRequest.reason}"</div>}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => handleRequestAction(popupCell.info.pendingRequest!.id, 'approve')} disabled={busy === 'request-action'}
                      style={{ flex: 1, background: T.success, color: '#fff', border: 'none', borderRadius: 8, padding: '7px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>✓ Approve</button>
                    <button onClick={() => handleRequestAction(popupCell.info.pendingRequest!.id, 'reject')} disabled={busy === 'request-action'}
                      style={{ flex: 1, background: T.danger, color: '#fff', border: 'none', borderRadius: 8, padding: '7px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>✕ Reject</button>
                  </div>
                </div>
              )}

              <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 8 }}>Set Status Directly</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
                  <button onClick={() => overrideStatus(popupCell.userId, popupCell.date, 'present')} disabled={busy === 'override'}
                    style={{ flex: 1, background: T.successLight, color: T.success, border: `1px solid ${T.success}`, borderRadius: 8, padding: '7px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Mark Present</button>
                  <button onClick={() => overrideStatus(popupCell.userId, popupCell.date, 'leave')} disabled={busy === 'override'}
                    style={{ flex: 1, background: T.leaveLight, color: T.leave, border: `1px solid ${T.leave}`, borderRadius: 8, padding: '7px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Mark Leave</button>
                  <button onClick={() => overrideStatus(popupCell.userId, popupCell.date, 'absent')} disabled={busy === 'override'}
                    style={{ flex: 1, background: T.dangerLight, color: T.danger, border: `1px solid ${T.danger}`, borderRadius: 8, padding: '7px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Mark Absent</button>
                </div>
              </div>

              <button onClick={() => setPopupCell(null)} style={{ ...btn, width: '100%', marginTop: 14 }}>Close</button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
