import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useProjects } from '@/context/ProjectContext';
import { useAuth } from '@/context/AuthContext';
import { T, fmtINR as fmt } from '@/lib/theme';
import { createClient } from '@/lib/supabase';
import * as XLSX from 'xlsx';

const card: React.CSSProperties = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '16px 20px', marginBottom: 16 };
const th: React.CSSProperties = { padding: '8px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, color: T.primary, background: T.primaryLight, textAlign: 'left' as const, borderBottom: `2px solid ${T.primaryMid}`, whiteSpace: 'nowrap' as const };
const td: React.CSSProperties = { padding: '8px 10px', fontSize: 12, borderBottom: `1px solid ${T.border}`, verticalAlign: 'middle' as const };

export default function PMDetailPage() {
  const router = useRouter();
  const { name } = router.query;
  const pmName = decodeURIComponent((name as string) || '');
  const { projects: allProjects } = useProjects();
  const { profile } = useAuth();
  const sb = createClient();

  const [stnItems, setStnItems] = useState<any[]>([]);
  const [srnItems, setSrnItems] = useState<any[]>([]);
  const [ptwItems, setPtwItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Project Status breakdown
  const statusGroups = React.useMemo(() => {
    const g: Record<string, number> = {};
    pmProjects.forEach(p => { const s = (p as any).projectStatus || 'Not Set'; g[s] = (g[s] || 0) + 1; });
    return Object.entries(g).sort((a, b) => b[1] - a[1]);
  }, [pmProjects]);

  // STN metrics
  const stnMetrics = React.useMemo(() => {
    const totalLifted  = stnItems.reduce((a, i) => a + Number(i.issued_qty || 0), 0);
    const totalUsed    = stnItems.reduce((a, i) => a + Number(i.utilised_qty || 0), 0);
    const totalPending = stnItems.reduce((a, i) => a + Math.max(0, Number(i.issued_qty || 0) - Number(i.pm_approved_qty || i.utilised_qty || 0)), 0);
    const totalReturn  = stnItems.reduce((a, i) => a + Number(i.return_qty || 0), 0);
    const totalValue   = stnItems.reduce((a, i) => a + Number(i.amount || 0), 0);
    const pendingValue = stnItems.filter(i => !i.utilised_status || i.utilised_status === 'pending').reduce((a, i) => a + Number(i.amount || 0), 0);
    const avgAging     = pmProjects.length ? Math.round(pmProjects.reduce((a, p) => a + (p.aging || 0), 0) / pmProjects.length) : 0;
    return { totalLifted, totalUsed, totalPending, totalReturn, totalValue, pendingValue, avgAging };
  }, [stnItems, pmProjects]);

  // SRN metrics
  const srnMetrics = React.useMemo(() => {
    const totalLifted  = srnItems.reduce((a, i) => a + Number(i.quantity || 0), 0);
    const totalUsed    = srnItems.filter(i => i.received === true).reduce((a, i) => a + Number(i.quantity || 0), 0);
    const totalPending = srnItems.filter(i => !i.received).reduce((a, i) => a + Number(i.quantity || 0), 0);
    const totalReturn  = srnItems.reduce((a, i) => a + Number(i.return_qty || 0), 0);
    const totalValue   = srnItems.reduce((a, i) => a + Number(i.amount || 0), 0);
    const pendingValue = srnItems.filter(i => !i.received).reduce((a, i) => a + Number(i.amount || 0), 0);
    const avgAging     = pmProjects.length ? Math.round(pmProjects.reduce((a, p) => a + (p.aging || 0), 0) / pmProjects.length) : 0;
    return { totalLifted, totalUsed, totalPending, totalReturn, totalValue, pendingValue, avgAging };
  }, [srnItems, pmProjects]);

  // PTW metrics
  const ptwMetrics = React.useMemo(() => {
    const total   = projectIds.length;
    const raised  = ptwItems.length;
    const notRaised = total - raised;
    return { total, raised, notRaised };
  }, [ptwItems, projectIds]);

  const REPORTS = [
    { key:'executive', label:'Executive Summary', icon:'📊' },
    { key:'financial', label:'Financial Summary',  icon:'💰' },
    { key:'pm',        label:'PM Performance',     icon:'👤' },
    { key:'vendor',    label:'Vendor Performance', icon:'🏢' },
    { key:'aging',     label:'PO Aging',           icon:'⏳' },
    { key:'stnsrn',    label:'STN / SRN',          icon:'📦' },
  ];

  const MetricRow = ({ label, value, color }: { label: string; value: any; color?: string }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${T.border}` }}>
      <span style={{ fontSize: 13, color: T.textMuted }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: color || T.text }}>{value}</span>
    </div>
  );

  if (!pmName) return null;

  return (
    <Layout>
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16 }}>
        {/* Left nav — same as reports page */}
        <div>
          {REPORTS.map(r => (
            <div key={r.key} onClick={() => router.push(`/reports?report=${r.key}`)}
              style={{ padding: '10px 12px', borderRadius: 9, marginBottom: 6, cursor: 'pointer',
                border: `1.5px solid ${T.border}`, background: T.surface }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{r.icon} {r.label}</div>
            </div>
          ))}
        </div>

        {/* Main content */}
        <div>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => router.push('/reports?report=pm')}
                  style={{ background: 'none', border: 'none', color: T.primary, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  ← Reports
                </button>
                <span style={{ color: T.textDim }}>/</span>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: T.text, margin: 0 }}>👤 {pmName}</h1>
              </div>
              <div style={{ fontSize: 13, color: T.textMuted, marginTop: 4 }}>
                {loading ? 'Loading...' : `${pmProjects.length} projects · ${stnItems.length} STN items · ${srnItems.length} SRN items`}
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ ...card, textAlign: 'center' as const, padding: 40, color: T.textMuted }}>Loading data...</div>
          ) : (
            <>
              {/* Project Status Card */}
              <div style={card}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 12 }}>📁 Project Status</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                  <div style={{ background: T.primaryLight, borderRadius: 8, padding: '12px 14px', gridColumn: 'span 1' }}>
                    <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 600, textTransform: 'uppercase' as const, marginBottom: 4 }}>Total Projects</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: T.primary }}>{pmProjects.length}</div>
                  </div>
                  {statusGroups.slice(0, 3).map(([status, count]) => (
                    <div key={status} style={{ background: T.bg, borderRadius: 8, padding: '12px 14px' }}>
                      <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 600, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{status}</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: T.text }}>{count}</div>
                    </div>
                  ))}
                </div>
                {statusGroups.length > 3 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8, marginTop: 10 }}>
                    {statusGroups.slice(3).map(([status, count]) => (
                      <span key={status} style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', background: '#F3F4F6', padding: '3px 10px', borderRadius: 20 }}>
                        {status}: {count}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* STN / SRN Status Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                <div style={card}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#D97706', marginBottom: 12 }}>📦 STN Status</div>
                  <MetricRow label="1. STN Total Qty Lifted"       value={stnMetrics.totalLifted} />
                  <MetricRow label="2. STN Total Qty Used"         value={stnMetrics.totalUsed} />
                  <MetricRow label="3. STN Pending Qty"            value={stnMetrics.totalPending} color={stnMetrics.totalPending > 0 ? T.warning : T.success} />
                  <MetricRow label="4. STN Return Qty"             value={stnMetrics.totalReturn} />
                  <MetricRow label="5. STN Material Value"         value={fmt(stnMetrics.totalValue)} color={T.primary} />
                  <MetricRow label="6. STN Material Pending Value" value={fmt(stnMetrics.pendingValue)} color={stnMetrics.pendingValue > 0 ? T.danger : T.success} />
                  <MetricRow label="7. Avg Aging Days"             value={`${stnMetrics.avgAging}d`} color={stnMetrics.avgAging > 90 ? T.danger : stnMetrics.avgAging > 60 ? T.warning : T.success} />
                </div>
                <div style={card}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#DC2626', marginBottom: 12 }}>🔄 SRN Status</div>
                  <MetricRow label="1. SRN Total Qty Lifted"       value={srnMetrics.totalLifted} />
                  <MetricRow label="2. SRN Total Qty Used"         value={srnMetrics.totalUsed} />
                  <MetricRow label="3. SRN Pending Qty"            value={srnMetrics.totalPending} color={srnMetrics.totalPending > 0 ? T.warning : T.success} />
                  <MetricRow label="4. SRN Return Qty"             value={srnMetrics.totalReturn} />
                  <MetricRow label="5. SRN Material Value"         value={fmt(srnMetrics.totalValue)} color={T.primary} />
                  <MetricRow label="6. SRN Material Pending Value" value={fmt(srnMetrics.pendingValue)} color={srnMetrics.pendingValue > 0 ? T.danger : T.success} />
                  <MetricRow label="7. Avg Aging Days"             value={`${srnMetrics.avgAging}d`} color={srnMetrics.avgAging > 90 ? T.danger : srnMetrics.avgAging > 60 ? T.warning : T.success} />
                </div>
              </div>

              {/* PTW Status */}
              <div style={card}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 12 }}>🔐 PTW Status</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                  {[
                    { label: '1. Total PTEs', value: ptwMetrics.total, color: T.primary },
                    { label: '2. Raised PTEs', value: ptwMetrics.raised, color: T.success },
                    { label: '3. Not Raised PTEs', value: ptwMetrics.notRaised, color: ptwMetrics.notRaised > 0 ? T.danger : T.success },
                  ].map(m => (
                    <div key={m.label} style={{ background: T.bg, borderRadius: 8, padding: '12px 14px' }}>
                      <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, marginBottom: 4 }}>{m.label}</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: m.color }}>{m.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Project List */}
              <div style={card}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 12 }}>📋 Project List</div>
                <div style={{ overflowX: 'auto' as const }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 12 }}>
                    <thead>
                      <tr>{['#','PO Number','Indus ID','Region','Status','PM','RM','Vendor'].map((h,i) => (
                        <th key={i} style={th}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {pmProjects.map((p, i) => (
                        <tr key={p.id} onClick={() => router.push(`/projects/${p.id}`)}
                          style={{ background: i % 2 === 0 ? '#fff' : T.bg, cursor: 'pointer' }}
                          onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = T.primaryLight}
                          onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = i % 2 === 0 ? '#fff' : T.bg}>
                          <td style={{ ...td, color: T.textMuted }}>{i + 1}</td>
                          <td style={{ ...td, fontWeight: 700, color: T.primary }}>{(p as any).poNo || '—'}</td>
                          <td style={{ ...td, color: T.textMuted }}>{(p as any).indusId || '—'}</td>
                          <td style={td}>{(p as any).region || '—'}</td>
                          <td style={td}><span style={{ fontSize: 10, fontWeight: 600, color: '#6B7280', background: '#F3F4F6', padding: '2px 8px', borderRadius: 10 }}>{(p as any).projectStatus || '—'}</span></td>
                          <td style={td}>{(p as any).pm || '—'}</td>
                          <td style={td}>{(p as any).rm || '—'}</td>
                          <td style={td}>{(p as any).vendor || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* STN/SRN Detail Table */}
              <div style={card}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 12 }}>📦 STN / SRN Detail by Project</div>
                <div style={{ overflowX: 'auto' as const }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 12 }}>
                    <thead>
                      <tr>{['#','PO Number','Indus ID','Region','STN Total','STN Received Qty','STN Return Qty','SRN Total','SRN Return Qty'].map((h,i) => (
                        <th key={i} style={th}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {pmProjects.map((p, i) => {
                        const pStn = stnItems.filter(s => s.project_id === p.id);
                        const pSrn = srnItems.filter(s => s.project_id === p.id);
                        const stnTotal    = pStn.reduce((a, s) => a + Number(s.issued_qty || 0), 0);
                        const stnReceived = pStn.reduce((a, s) => a + Number(s.pm_approved_qty || 0), 0);
                        const stnReturn   = pStn.reduce((a, s) => a + Number(s.return_qty || 0), 0);
                        const srnTotal    = pSrn.reduce((a, s) => a + Number(s.quantity || 0), 0);
                        const srnReturn   = pSrn.reduce((a, s) => a + Number(s.return_qty || 0), 0);
                        if (stnTotal === 0 && srnTotal === 0) return null;
                        return (
                          <tr key={p.id} style={{ background: i % 2 === 0 ? '#fff' : T.bg, borderBottom: `1px solid ${T.border}` }}>
                            <td style={{ ...td, color: T.textMuted }}>{i + 1}</td>
                            <td style={{ ...td, fontWeight: 700, color: T.primary }}>{(p as any).poNo || '—'}</td>
                            <td style={{ ...td, color: T.textMuted }}>{(p as any).indusId || '—'}</td>
                            <td style={td}>{(p as any).region || '—'}</td>
                            <td style={{ ...td, textAlign: 'center' as const, fontWeight: 600 }}>{stnTotal || '—'}</td>
                            <td style={{ ...td, textAlign: 'center' as const, color: T.success }}>{stnReceived || '—'}</td>
                            <td style={{ ...td, textAlign: 'center' as const }}>{stnReturn || '—'}</td>
                            <td style={{ ...td, textAlign: 'center' as const, fontWeight: 600 }}>{srnTotal || '—'}</td>
                            <td style={{ ...td, textAlign: 'center' as const }}>{srnReturn || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
