import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useProjects } from '@/context/ProjectContext';
import { useAuth } from '@/context/AuthContext';
import { T, fmtINR as fmt } from '@/lib/theme';
import { createClient } from '@/lib/supabase';


const card: React.CSSProperties = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '16px 20px', marginBottom: 16 };
const th: React.CSSProperties = { padding: '8px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, color: T.primary, background: T.primaryLight, textAlign: 'left' as const, borderBottom: `2px solid ${T.primaryMid}`, whiteSpace: 'nowrap' as const };
const td: React.CSSProperties = { padding: '8px 10px', fontSize: 12, borderBottom: `1px solid ${T.border}`, verticalAlign: 'middle' as const };

const REPORTS = [
  { key:'executive', label:'Executive Summary',   icon:'📊', desc:'KPIs, billing, payments' },
  { key:'financial', label:'Financial Summary',   icon:'💰', desc:'PO value, billed, paid by region' },
  { key:'status',    label:'Project Status',      icon:'📁', desc:'Status distribution across projects' },
  { key:'pm',        label:'PM Performance',      icon:'👤', desc:'Leaderboard & drill-down' },
  { key:'vendor',    label:'Vendor Performance',  icon:'🏢', desc:'Completion rate, delays per vendor' },
];

const PIE_COLORS = ['#2563EB','#DC2626','#16A34A','#D97706','#7C3AED','#6B7280','#0D9488','#EC4899','#F97316','#84CC16'];
const PER_PAGE = 10;

const MetricRow = ({ label, value, color }: { label: string; value: any; color?: string }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${T.border}` }}>
    <span style={{ fontSize: 13, color: T.textMuted }}>{label}</span>
    <span style={{ fontSize: 13, fontWeight: 700, color: color || T.text }}>{value}</span>
  </div>
);

export default function PMDetailPage() {
  const router = useRouter();
  const { name } = router.query;
  const pmName = decodeURIComponent((name as string) || '');
  const { projects: allProjects } = useProjects();
  const sb = createClient();

  const [stnItems, setStnItems] = useState<any[]>([]);
  const [srnItems, setSrnItems] = useState<any[]>([]);
  const [ptwItems, setPtwItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [projPage, setProjPage] = useState(1);
  const [stnSrnPage, setStnSrnPage] = useState(1);

  const pmProjects = React.useMemo(() =>
    (allProjects as any[]).filter(p => p.pm === pmName),
    [allProjects, pmName]
  );
  const projectIds = React.useMemo(() => pmProjects.map(p => p.id), [pmProjects]);

  const fetchData = useCallback(async () => {
    if (!projectIds.length) { setLoading(false); return; }
    setLoading(true);
    const [stnRes, srnRes, ptwRes] = await Promise.all([
      sb.from('po_items').select('*').in('project_id', projectIds),
      sb.from('srn').select('*').in('project_id', projectIds),
      sb.from('ptw_items').select('*').in('project_id', projectIds),
    ]);
    setStnItems(stnRes.data || []);
    setSrnItems(srnRes.data || []);
    setPtwItems(ptwRes.data || []);
    setLoading(false);
  }, [projectIds.join(',')]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Project Status breakdown for pie chart
  const statusGroups = React.useMemo(() => {
    const g: Record<string, number> = {};
    pmProjects.forEach(p => { const s = (p as any).projectStatus || 'Not Set'; g[s] = (g[s] || 0) + 1; });
    return Object.entries(g).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [pmProjects]);

  // STN metrics
  const stnMetrics = React.useMemo(() => ({
    totalLifted:  stnItems.reduce((a, i) => a + Number(i.issued_qty || 0), 0),
    totalUsed:    stnItems.reduce((a, i) => a + Number(i.utilised_qty || 0), 0),
    totalPending: stnItems.reduce((a, i) => a + Math.max(0, Number(i.issued_qty || 0) - Number(i.pm_approved_qty || i.utilised_qty || 0)), 0),
    totalReturn:  stnItems.reduce((a, i) => a + Number(i.return_qty || 0), 0),
    totalValue:   stnItems.reduce((a, i) => a + Number(i.amount || 0), 0),
    pendingValue: stnItems.filter(i => !i.utilised_status || i.utilised_status === 'pending').reduce((a, i) => a + Number(i.amount || 0), 0),
    avgAging:     pmProjects.length ? Math.round(pmProjects.reduce((a, p) => a + (p.aging || 0), 0) / pmProjects.length) : 0,
  }), [stnItems, pmProjects]);

  // SRN metrics
  const srnMetrics = React.useMemo(() => ({
    totalLifted:  srnItems.reduce((a, i) => a + Number(i.quantity || 0), 0),
    totalUsed:    srnItems.filter(i => i.received === true).reduce((a, i) => a + Number(i.quantity || 0), 0),
    totalPending: srnItems.filter(i => !i.received).reduce((a, i) => a + Number(i.quantity || 0), 0),
    totalReturn:  srnItems.reduce((a, i) => a + Number(i.return_qty || 0), 0),
    totalValue:   srnItems.reduce((a, i) => a + Number(i.amount || 0), 0),
    pendingValue: srnItems.filter(i => !i.received).reduce((a, i) => a + Number(i.amount || 0), 0),
    avgAging:     pmProjects.length ? Math.round(pmProjects.reduce((a, p) => a + (p.aging || 0), 0) / pmProjects.length) : 0,
  }), [srnItems, pmProjects]);

  // PTW metrics
  const ptwMetrics = React.useMemo(() => ({
    total:    pmProjects.length,
    raised:   new Set(ptwItems.map(p => p.project_id)).size,
    notRaised: pmProjects.length - new Set(ptwItems.map(p => p.project_id)).size,
  }), [ptwItems, pmProjects]);

  // STN/SRN table data (projects that have either STN or SRN)
  const stnSrnTableData = React.useMemo(() =>
    pmProjects.filter(p => {
      const hasStn = stnItems.some(s => s.project_id === p.id);
      const hasSrn = srnItems.some(s => s.project_id === p.id);
      return hasStn || hasSrn;
    }),
    [pmProjects, stnItems, srnItems]
  );

  // Pagination
  const projTotalPages = Math.max(1, Math.ceil(pmProjects.length / PER_PAGE));
  const projPaginated = pmProjects.slice((projPage - 1) * PER_PAGE, projPage * PER_PAGE);
  const stnSrnTotalPages = Math.max(1, Math.ceil(stnSrnTableData.length / PER_PAGE));
  const stnSrnPaginated = stnSrnTableData.slice((stnSrnPage - 1) * PER_PAGE, stnSrnPage * PER_PAGE);

  const Pagination = ({ page, total, setPage }: { page: number; total: number; setPage: (p: number) => void }) => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }}>
      <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
        style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${T.border}`, background: page === 1 ? T.bg : '#fff', cursor: page === 1 ? 'default' : 'pointer', fontSize: 12 }}>← Prev</button>
      <span style={{ padding: '4px 10px', fontSize: 12, color: T.textMuted }}>Page {page} of {total}</span>
      <button onClick={() => setPage(Math.min(total, page + 1))} disabled={page === total}
        style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${T.border}`, background: page === total ? T.bg : '#fff', cursor: page === total ? 'default' : 'pointer', fontSize: 12 }}>Next →</button>
    </div>
  );

  if (!pmName) return null;

  return (
    <Layout>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => router.push('/reports?section=pm')}
              style={{ background: 'none', border: 'none', color: T.primary, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              ← PM Performance
            </button>
            <span style={{ color: T.textDim }}>/</span>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: T.text, margin: 0 }}>👤 {pmName}</h1>
          </div>
          <div style={{ fontSize: 13, color: T.textMuted, marginTop: 4 }}>
            {loading ? 'Loading...' : `${pmProjects.length} projects · ${stnItems.length} STN items · ${srnItems.length} SRN items`}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16 }}>
        {/* Left nav */}
        <div>
          {REPORTS.map(r => (
            <div key={r.key}
              onClick={() => router.push(`/reports?section=${r.key}`)}
              style={{ padding: '10px 12px', borderRadius: 9, marginBottom: 6, cursor: 'pointer',
                border: `1.5px solid ${r.key === 'pm' ? T.primary : T.border}`,
                background: r.key === 'pm' ? T.primaryLight : T.surface }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: r.key === 'pm' ? T.primary : T.text }}>{r.icon} {r.label}</div>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{r.desc}</div>
            </div>
          ))}
        </div>

        {/* Main content */}
        <div>
          {loading ? (
            <div style={{ ...card, textAlign: 'center' as const, padding: 40, color: T.textMuted }}>Loading data...</div>
          ) : pmProjects.length === 0 ? (
            <div style={{ ...card, textAlign: 'center' as const, padding: 40, color: T.textMuted }}>No projects found for {pmName}</div>
          ) : (
            <>
              {/* 1. Project Status (pie) left + PTW, STN, SRN metrics right */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 0 }}>
                {/* Left: Project Status list */}
                <div style={card}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 12 }}>📁 Project Status <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 400 }}>({pmProjects.length} total)</span></div>
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                    {statusGroups.map(({ name: sName, value }, i) => (
                      <div key={sName} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: T.bg, borderRadius: 8, borderLeft: `4px solid ${PIE_COLORS[i % PIE_COLORS.length]}` }}>
                        <span style={{ fontSize: 12, color: T.text, fontWeight: 500 }}>{sName}</span>
                        <span style={{ fontSize: 14, fontWeight: 800, color: PIE_COLORS[i % PIE_COLORS.length] }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Right: PTW + STN + SRN stacked */}
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
                  {/* PTW */}
                  <div style={card}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 8 }}>🔐 PTW Status</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                      {[
                        { label: 'Total PTEs', value: ptwMetrics.total, color: T.primary },
                        { label: 'Raised', value: ptwMetrics.raised, color: T.success },
                        { label: 'Not Raised', value: ptwMetrics.notRaised, color: ptwMetrics.notRaised > 0 ? T.danger : T.success },
                      ].map(m => (
                        <div key={m.label} style={{ background: T.bg, borderRadius: 8, padding: '8px 10px', textAlign: 'center' as const }}>
                          <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 600, marginBottom: 3 }}>{m.label}</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: m.color }}>{m.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* STN */}
                  <div style={card}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#D97706', marginBottom: 8 }}>📦 STN Status <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 400 }}>({stnItems.length} items)</span></div>
                    <MetricRow label="Total Qty Lifted"       value={stnMetrics.totalLifted} />
                    <MetricRow label="Total Qty Used"         value={stnMetrics.totalUsed} />
                    <MetricRow label="Pending Qty"            value={stnMetrics.totalPending} color={stnMetrics.totalPending > 0 ? T.warning : T.success} />
                    <MetricRow label="Return Qty"             value={stnMetrics.totalReturn} />
                    <MetricRow label="Material Value"         value={fmt(stnMetrics.totalValue)} color={T.primary} />
                    <MetricRow label="Material Pending Value" value={fmt(stnMetrics.pendingValue)} color={stnMetrics.pendingValue > 0 ? T.danger : T.success} />
                    <MetricRow label="Avg Aging Days"         value={`${stnMetrics.avgAging}d`} color={stnMetrics.avgAging > 90 ? T.danger : stnMetrics.avgAging > 60 ? T.warning : T.success} />
                  </div>
                  {/* SRN */}
                  <div style={card}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#DC2626', marginBottom: 8 }}>🔄 SRN Status <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 400 }}>({srnItems.length} items)</span></div>
                    <MetricRow label="Total Qty Lifted"       value={srnMetrics.totalLifted} />
                    <MetricRow label="Total Qty Used"         value={srnMetrics.totalUsed} />
                    <MetricRow label="Pending Qty"            value={srnMetrics.totalPending} color={srnMetrics.totalPending > 0 ? T.warning : T.success} />
                    <MetricRow label="Return Qty"             value={srnMetrics.totalReturn} />
                    <MetricRow label="Material Value"         value={fmt(srnMetrics.totalValue)} color={T.primary} />
                    <MetricRow label="Material Pending Value" value={fmt(srnMetrics.pendingValue)} color={srnMetrics.pendingValue > 0 ? T.danger : T.success} />
                    <MetricRow label="Avg Aging Days"         value={`${srnMetrics.avgAging}d`} color={srnMetrics.avgAging > 90 ? T.danger : srnMetrics.avgAging > 60 ? T.warning : T.success} />
                  </div>
                </div>
              </div>

              {/* 3. STN/SRN Detail Table with pagination */}
              <div style={card}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 12 }}>📦 STN / SRN Detail by Project <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 400 }}>({stnSrnTableData.length} projects)</span></div>
                <div style={{ overflowX: 'auto' as const }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 12 }}>
                    <thead>
                      <tr>{['#','PO Number','Indus ID','Region','STN Total','STN Received','STN Return','SRN Total','SRN Return'].map((h,i) => (
                        <th key={i} style={th}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {stnSrnPaginated.map((p, i) => {
                        const pStn = stnItems.filter(s => s.project_id === p.id);
                        const pSrn = srnItems.filter(s => s.project_id === p.id);
                        const absIdx = (stnSrnPage - 1) * PER_PAGE + i + 1;
                        return (
                          <tr key={p.id} style={{ background: i % 2 === 0 ? '#fff' : T.bg }}>
                            <td style={{ ...td, color: T.textMuted }}>{absIdx}</td>
                            <td style={{ ...td, fontWeight: 700, color: T.primary }}>{(p as any).poNo || '—'}</td>
                            <td style={{ ...td, color: T.textMuted }}>{(p as any).indusId || '—'}</td>
                            <td style={td}>{(p as any).region || '—'}</td>
                            <td style={{ ...td, textAlign: 'center' as const, fontWeight: 600 }}>{pStn.reduce((a,s)=>a+Number(s.issued_qty||0),0)||'—'}</td>
                            <td style={{ ...td, textAlign: 'center' as const, color: T.success }}>{pStn.reduce((a,s)=>a+Number(s.pm_approved_qty||0),0)||'—'}</td>
                            <td style={{ ...td, textAlign: 'center' as const }}>{pStn.reduce((a,s)=>a+Number(s.return_qty||0),0)||'—'}</td>
                            <td style={{ ...td, textAlign: 'center' as const, fontWeight: 600 }}>{pSrn.reduce((a,s)=>a+Number(s.quantity||0),0)||'—'}</td>
                            <td style={{ ...td, textAlign: 'center' as const }}>{pSrn.reduce((a,s)=>a+Number(s.return_qty||0),0)||'—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {stnSrnTotalPages > 1 && <Pagination page={stnSrnPage} total={stnSrnTotalPages} setPage={setStnSrnPage} />}
              </div>

              {/* 4. Project List — last section with pagination */}
              <div style={card}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 12 }}>📋 Project List <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 400 }}>({pmProjects.length} projects)</span></div>
                <div style={{ overflowX: 'auto' as const }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 12 }}>
                    <thead>
                      <tr>{['#','PO Number','Indus ID','Region','Status','PM','RM','Vendor'].map((h,i) => (
                        <th key={i} style={th}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {projPaginated.map((p, i) => {
                        const absIdx = (projPage - 1) * PER_PAGE + i + 1;
                        return (
                          <tr key={p.id} onClick={() => router.push(`/projects/${p.id}`)}
                            style={{ background: i % 2 === 0 ? '#fff' : T.bg, cursor: 'pointer' }}
                            onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = T.primaryLight}
                            onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = i % 2 === 0 ? '#fff' : T.bg}>
                            <td style={{ ...td, color: T.textMuted }}>{absIdx}</td>
                            <td style={{ ...td, fontWeight: 700, color: T.primary }}>{(p as any).poNo || '—'}</td>
                            <td style={{ ...td, color: T.textMuted }}>{(p as any).indusId || '—'}</td>
                            <td style={td}>{(p as any).region || '—'}</td>
                            <td style={td}><span style={{ fontSize: 10, fontWeight: 600, color: '#6B7280', background: '#F3F4F6', padding: '2px 8px', borderRadius: 10 }}>{(p as any).projectStatus || '—'}</span></td>
                            <td style={td}>{(p as any).pm || '—'}</td>
                            <td style={td}>{(p as any).rm || '—'}</td>
                            <td style={td}>{(p as any).vendor || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {projTotalPages > 1 && <Pagination page={projPage} total={projTotalPages} setPage={setProjPage} />}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
