import React from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase';

const supabase = createClient();

const T = {
  primary: '#0D9488', primaryLight: '#F0FDFA', bg: '#F8FAFC', text: '#1E293B',
  textMuted: '#64748B', border: '#E2E8F0', danger: '#DC2626', dangerLight: '#FEF2F2',
  warning: '#D97706', warningLight: '#FFFBEB', success: '#16A34A', successLight: '#F0FDF4',
};

const card: React.CSSProperties = { background: '#fff', border: `1px solid ${T.border}`, borderRadius: 12, padding: 18 };
const btn: React.CSSProperties = { border: `1px solid ${T.border}`, background: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', color: T.text };
const btnActive: React.CSSProperties = { ...btn, background: T.primary, color: '#fff', border: `1px solid ${T.primary}` };

function fmtDate(d: Date): string { return d.toISOString().split('T')[0]; }
function fmtDayLabel(d: Date): string { return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }); }
function isSameDay(a: Date, b: Date): boolean { return fmtDate(a) === fmtDate(b); }
function startOfWeek(d: Date): Date { const r = new Date(d); const day = r.getDay(); r.setDate(r.getDate() - day); r.setHours(0,0,0,0); return r; }
function startOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), 1); }
function daysInMonth(d: Date): number { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }

interface AttLog {
  id: string; user_id: string; log_date: string; check_in_at: string | null; check_out_at: string | null;
  work_mode: 'office' | 'home' | null; wfh_status: 'pending' | 'approved' | 'rejected' | null;
}

function hoursFor(log?: AttLog): string {
  if (!log?.check_in_at) return '';
  const end = log.check_out_at ? new Date(log.check_out_at).getTime() : Date.now();
  const secs = Math.max(0, Math.floor((end - new Date(log.check_in_at).getTime()) / 1000));
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function AttendancePage() {
  const { profile } = useAuth();
  const [tab, setTab] = React.useState<'my' | 'team'>('my');
  const [viewMode, setViewMode] = React.useState<'week' | 'month'>('week');
  const [anchor, setAnchor] = React.useState(new Date());
  const [myLogs, setMyLogs] = React.useState<AttLog[]>([]);
  const [teamMembers, setTeamMembers] = React.useState<{ id: string; full_name: string | null; email: string }[]>([]);
  const [teamLogs, setTeamLogs] = React.useState<AttLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [approving, setApproving] = React.useState<string | null>(null);
  const [popupLog, setPopupLog] = React.useState<AttLog | null>(null);

  const isSuperAdmin = profile?.role === 'super_admin';

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

  React.useEffect(() => {
    if (!profile?.id) return;
    setLoading(true);
    (async () => {
      const { data: own } = await supabase.from('attendance_logs').select('*')
        .eq('user_id', profile.id).gte('log_date', rangeStart).lte('log_date', rangeEnd);
      setMyLogs(own || []);

      let members: any[] = [];
      if (isSuperAdmin) {
        const { data } = await supabase.from('profiles').select('id,full_name,email').neq('id', profile.id).order('full_name');
        members = data || [];
      } else {
        const { data } = await supabase.from('profiles').select('id,full_name,email').eq('manager_id', profile.id).order('full_name');
        members = data || [];
      }
      setTeamMembers(members);

      if (members.length > 0) {
        const { data: logs } = await supabase.from('attendance_logs').select('*')
          .in('user_id', members.map(m => m.id)).gte('log_date', rangeStart).lte('log_date', rangeEnd);
        setTeamLogs(logs || []);
      } else {
        setTeamLogs([]);
      }
      setLoading(false);
    })();
  }, [profile?.id, isSuperAdmin, rangeStart, rangeEnd]);

  const hasTeam = teamMembers.length > 0;

  const nav = (dir: -1 | 1) => {
    const d = new Date(anchor);
    if (viewMode === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setAnchor(d);
  };

  const cellFor = (userId: string, day: Date, logs: AttLog[]): { label: string; bg: string; color: string; log?: AttLog } => {
    const today = new Date(); today.setHours(0,0,0,0);
    const dayStart = new Date(day); dayStart.setHours(0,0,0,0);
    if (dayStart > today) return { label: '—', bg: 'transparent', color: T.textMuted };
    if (day.getDay() === 0) return { label: 'Weekly Off', bg: T.bg, color: T.textMuted };
    const log = logs.find(l => l.user_id === userId && l.log_date === fmtDate(day));
    if (!log) return { label: 'Absent', bg: T.dangerLight, color: T.danger };
    if (log.work_mode === 'office') return { label: `Office · ${hoursFor(log)}`, bg: T.successLight, color: T.success, log };
    if (log.work_mode === 'home') {
      if (log.wfh_status === 'approved') return { label: `WFH · ${hoursFor(log)}`, bg: '#EFF6FF', color: '#2563EB', log };
      if (log.wfh_status === 'rejected') return { label: 'Leave (WFH rejected)', bg: T.dangerLight, color: T.danger, log };
      return { label: `WFH · ${hoursFor(log)} (Pending)`, bg: T.warningLight, color: T.warning, log };
    }
    return { label: 'Absent', bg: T.dangerLight, color: T.danger };
  };

  const handleApprove = async (log: AttLog, action: 'approve' | 'reject') => {
    setApproving(log.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/attendance/approve-wfh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ logId: log.id, action }),
      });
      if (res.ok) {
        setTeamLogs(prev => prev.map(l => l.id === log.id ? { ...l, wfh_status: action === 'approve' ? 'approved' : 'rejected' } : l));
        setPopupLog(null);
      }
    } finally {
      setApproving(null);
    }
  };

  return (
    <Layout>
      <div className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.text }}>Attendance</div>
          {hasTeam && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setTab('my')} style={tab === 'my' ? btnActive : btn}>My Attendance</button>
              <button onClick={() => setTab('team')} style={tab === 'team' ? btnActive : btn}>Team ({teamMembers.length})</button>
            </div>
          )}
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
                <tr>{['Date', 'Status'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, color: T.primary, textAlign: 'left' as const, borderBottom: `2px solid ${T.border}` }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {days.map((d, i) => {
                  const c = cellFor(profile?.id || '', d, myLogs);
                  return (
                    <tr key={i} style={{ background: isSameDay(d, new Date()) ? T.primaryLight : (i % 2 === 0 ? '#fff' : T.bg) }}>
                      <td style={{ padding: '9px 10px', fontSize: 12, borderBottom: `1px solid ${T.border}` }}>{fmtDayLabel(d)}</td>
                      <td style={{ padding: '9px 10px', borderBottom: `1px solid ${T.border}` }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: c.color, background: c.bg, padding: '3px 10px', borderRadius: 20 }}>{c.label}</span>
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
                      const c = cellFor(m.id, d, teamLogs);
                      const clickable = c.log?.wfh_status === 'pending';
                      return (
                        <td key={di} style={{ padding: '6px', borderBottom: `1px solid ${T.border}`, textAlign: 'center' as const }}>
                          <span onClick={() => clickable && setPopupLog(c.log!)}
                            style={{ fontSize: 10, fontWeight: 600, color: c.color, background: c.bg, padding: '3px 6px', borderRadius: 6, whiteSpace: 'nowrap' as const, cursor: clickable ? 'pointer' : 'default', display: 'inline-block' }}>
                            {viewMode === 'month' ? c.label.split(' · ')[0].split(' (')[0] : c.label}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {popupLog && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
            onClick={() => setPopupLog(null)}>
            <div style={{ ...card, width: 320 }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 8 }}>Work From Home Approval</div>
              <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 16 }}>
                {popupLog.log_date} · {hoursFor(popupLog)}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => handleApprove(popupLog, 'approve')} disabled={approving === popupLog.id}
                  style={{ flex: 1, background: T.success, color: '#fff', border: 'none', borderRadius: 8, padding: '8px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  ✓ Approve
                </button>
                <button onClick={() => handleApprove(popupLog, 'reject')} disabled={approving === popupLog.id}
                  style={{ flex: 1, background: T.danger, color: '#fff', border: 'none', borderRadius: 8, padding: '8px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  ✕ Reject
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
