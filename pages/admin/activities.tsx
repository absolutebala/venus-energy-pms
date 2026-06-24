import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useProjects } from '@/context/ProjectContext';
import { createClient } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { T, card } from '@/lib/theme';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export default function ActivitiesPage() {
  const { profile, loading: authLoading } = useAuth();
  const { projects, loading: projLoading } = useProjects();
  const sb = createClient();

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(todayStr());
  const [dateTo, setDateTo] = useState(todayStr());
  const maxDate = todayStr();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    const fromTs = `${dateFrom}T00:00:00`;
    const toTs = `${dateTo}T23:59:59`;
    const { data, error } = await sb.from('activity_log').select('*')
      .gte('created_at', fromTs).lte('created_at', toTs)
      .order('created_at', { ascending: false });
    setRows(error ? [] : (data || []));
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);
  useEffect(() => { setPage(1); }, [dateFrom, dateTo, perPage]);

  const enriched = useMemo(() => {
    return rows.map((r: any) => {
      const proj = (projects as any[]).find(p => p.id === r.project_id);
      return {
        id: r.id,
        indusId: proj?.indusId || '—',
        site: proj?.site || proj?.projectName || '—',
        projectName: proj?.type || '—',
        projectId: proj?.projectId || '—',
        poNo: proj?.poNo || '—',
        pm: proj?.pm || '—',
        previousStatus: r.previous_status || '—',
        currentStatus: r.current_status || '—',
        circle: proj?.region || '—',
        action: r.action || '—',
        byName: r.by_name || '—',
        byRole: r.by_role || '—',
        createdAt: r.created_at,
        isStatusChange: Boolean(r.current_status),
      };
    });
  }, [rows, projects]);

  const totalPages = Math.max(1, Math.ceil(enriched.length / perPage));
  const paginated = enriched.slice((page - 1) * perPage, page * perPage);

  const isLoading = authLoading || projLoading || loading;
  const isSuperAdmin = !authLoading && profile?.role === 'super_admin';

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const periodLabel = `${dateFrom} to ${dateTo}`;
    const exportRows = enriched.map((e, i) => ({
      'S.No': i + 1,
      'Period': periodLabel,
      'Indus ID': e.indusId,
      'Site Name': e.site,
      'Project Name': e.projectName,
      'Project ID': e.projectId,
      'PO No': e.poNo,
      'PM Name': e.pm,
      'Previous Status': e.previousStatus,
      'Current Status': e.currentStatus,
      'Circle': e.circle,
      'Action': e.action,
      'By': e.byName,
      'Role': e.byRole,
      'Date': e.createdAt ? new Date(e.createdAt).toLocaleString('en-IN') : '—',
    }));
    const ws = XLSX.utils.json_to_sheet(exportRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Activities');
    XLSX.writeFile(wb, `Activities_${dateFrom}_to_${dateTo}.xlsx`);
  };

  if (!authLoading && !isSuperAdmin) {
    return (
      <Layout>
        <div style={{ ...card, padding: 40, textAlign: 'center' as const, color: T.textMuted }}>
          You don't have access to this page.
        </div>
      </Layout>
    );
  }

  const thS: React.CSSProperties = { padding: '9px 12px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, color: T.primary, background: T.primaryLight, textAlign: 'left' as const, borderBottom: `2px solid ${T.primaryMid}`, whiteSpace: 'nowrap' as const };
  const tdS: React.CSSProperties = { padding: '9px 12px', fontSize: 12, borderBottom: `1px solid ${T.border}`, verticalAlign: 'middle' as const };

  return (
    <Layout>
      <div className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' as const, gap: 12 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.text }}>Activities</div>
            <div style={{ fontSize: 13, color: T.textMuted, marginTop: 2 }}>
              {isLoading ? 'Loading...' : `${enriched.length} activities`}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 12, color: T.textMuted, fontWeight: 600 }}>From</label>
              <input type="date" value={dateFrom} max={maxDate}
                onChange={e => setDateFrom(e.target.value)}
                style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 10px', fontSize: 13, outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 12, color: T.textMuted, fontWeight: 600 }}>To</label>
              <input type="date" value={dateTo} max={maxDate}
                onChange={e => setDateTo(e.target.value)}
                style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 10px', fontSize: 13, outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 12, color: T.textMuted, fontWeight: 600 }}>Rows</label>
              <select value={perPage} onChange={e => setPerPage(Number(e.target.value))}
                style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 10px', fontSize: 13, outline: 'none', cursor: 'pointer', background: '#fff' }}>
                {[10, 25, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <button onClick={exportToExcel}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', fontSize: 12, fontWeight: 600,
                color: '#166534', background: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: 7, cursor: 'pointer' }}>
              📥 Excel
            </button>
          </div>
        </div>

        {isLoading && <div style={{ ...card, textAlign: 'center' as const, padding: 40, color: T.textMuted }}>Loading...</div>}

        {!isLoading && enriched.length === 0 && (
          <div style={{ ...card, textAlign: 'center' as const, padding: 40, color: T.textMuted }}>
            No activities found for the selected period.
          </div>
        )}

        {!isLoading && enriched.length > 0 && (
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' as const }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
                <thead>
                  <tr>
                    {['Indus ID', 'Site Name', 'Project Name', 'Project ID', 'PO No', 'PM Name', 'Previous Status', 'Current Status', 'Circle', 'Action', 'By', 'Date'].map((h, i) => (
                      <th key={i} style={thS}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((e, idx) => (
                    <tr key={e.id} style={{ background: e.isStatusChange ? '#FFFBEB' : (idx % 2 === 0 ? '#fff' : T.bg) }}>
                      <td style={tdS}>{e.indusId}</td>
                      <td style={{ ...tdS, fontWeight: 600 }}>{e.site}</td>
                      <td style={tdS}>{e.projectName}</td>
                      <td style={tdS}>{e.projectId}</td>
                      <td style={tdS}>{e.poNo}</td>
                      <td style={tdS}>{e.pm}</td>
                      <td style={{ ...tdS, color: e.isStatusChange ? '#92400E' : T.textMuted }}>{e.previousStatus}</td>
                      <td style={{ ...tdS, fontWeight: e.isStatusChange ? 700 : 400, color: e.isStatusChange ? '#D97706' : T.textMuted }}>{e.currentStatus}</td>
                      <td style={tdS}>{e.circle}</td>
                      <td style={tdS}>{e.action}</td>
                      <td style={tdS}>{e.byName}{e.byRole ? ` (${e.byRole.replace(/_/g,' ')})` : ''}</td>
                      <td style={{ ...tdS, whiteSpace: 'nowrap' as const }}>
                        {e.createdAt ? new Date(e.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!isLoading && enriched.length > 0 && totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, padding: '10px 4px' }}>
            <div style={{ fontSize: 12, color: T.textMuted }}>
              Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, enriched.length)} of {enriched.length} activities
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${T.border}`, background: '#fff',
                  cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 12, color: page === 1 ? '#9CA3AF' : T.text, opacity: page === 1 ? 0.5 : 1 }}>← Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                .reduce((acc: number[], n, i, arr) => { if (i > 0 && n - arr[i - 1] > 1) acc.push(-1); acc.push(n); return acc; }, [] as number[])
                .map((n, i) => n === -1
                  ? <span key={`e${i}`} style={{ fontSize: 12, color: '#9CA3AF', padding: '0 4px' }}>…</span>
                  : <button key={n} onClick={() => setPage(n)}
                      style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${page === n ? T.primary : T.border}`,
                        background: page === n ? T.primary : '#fff', color: page === n ? '#fff' : T.text,
                        cursor: 'pointer', fontSize: 12, fontWeight: page === n ? 700 : 400, minWidth: 32 }}>{n}</button>
                )}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${T.border}`, background: '#fff',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: 12, color: page === totalPages ? '#9CA3AF' : T.text, opacity: page === totalPages ? 0.5 : 1 }}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
