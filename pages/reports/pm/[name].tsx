import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useProjects } from '@/context/ProjectContext';
import { useAuth } from '@/context/AuthContext';
import { T, fmtINR as fmt } from '@/lib/theme';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { createClient } from '@/lib/supabase';



const printStyle = `
@keyframes spin { to { transform: rotate(360deg); } }

@media print {
  nav, button, .no-print { display: none !important; }
  body { font-size: 11px; }
  * { box-shadow: none !important; }
  @page { margin: 1cm; size: A4; }
}
`;
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
const PER_PAGE_DEFAULT = 10;

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
  const [projPerPage, setProjPerPage] = useState(PER_PAGE_DEFAULT);
  const [stnSrnPage, setStnSrnPage] = useState(1);
  const [stnSrnPerPage, setStnSrnPerPage] = useState(PER_PAGE_DEFAULT);
  const [isFiltering, startFilterTransition] = React.useTransition();
  const [selectedStatus, setSelectedStatus] = useState<string|null>(null);

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

  // Date-filtered projects
  const filteredPmProjects = React.useMemo(() => {
    if (!selectedStatus) return pmProjects;
    return pmProjects.filter(p => ((p as any).projectStatus || 'Not Set') === selectedStatus);
  }, [pmProjects, selectedStatus]);

  // Project Status breakdown for pie chart
  const statusGroups = React.useMemo(() => {
    const g: Record<string, number> = {};
    filteredPmProjects.forEach(p => { const s = (p as any).projectStatus || 'Not Set'; g[s] = (g[s] || 0) + 1; });
    return Object.entries(g).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [filteredPmProjects]);

  // Filtered STN/SRN items based on date-filtered projects
  const filteredProjectIds = React.useMemo(() => new Set(filteredPmProjects.map(p => p.id)), [filteredPmProjects]);
  const filteredStnItems = React.useMemo(() => stnItems.filter(i => filteredProjectIds.has(i.project_id)), [stnItems, filteredProjectIds]);
  const filteredSrnItems = React.useMemo(() => srnItems.filter(i => filteredProjectIds.has(i.project_id)), [srnItems, filteredProjectIds]);
  const filteredPtwItems = React.useMemo(() => ptwItems.filter(i => filteredProjectIds.has(i.project_id)), [ptwItems, filteredProjectIds]);

  // STN metrics
  const stnMetrics = React.useMemo(() => ({
    totalLifted:  filteredStnItems.reduce((a, i) => a + Number(i.issued_qty || 0), 0),
    totalUsed:    filteredStnItems.reduce((a, i) => a + Number(i.utilised_qty || 0), 0),
    totalPending: filteredStnItems.reduce((a, i) => a + Math.max(0, Number(i.issued_qty || 0) - Number(i.pm_approved_qty || i.utilised_qty || 0)), 0),
    totalReturn:  filteredStnItems.reduce((a, i) => a + Number(i.return_qty || 0), 0),
    totalValue:   filteredStnItems.reduce((a, i) => a + Number(i.amount || 0), 0),
    pendingValue: filteredStnItems.filter(i => !i.utilised_status || i.utilised_status === 'pending').reduce((a, i) => a + Number(i.amount || 0), 0),
    avgAging:     filteredPmProjects.length ? Math.round(filteredPmProjects.reduce((a, p) => a + (p.aging || 0), 0) / filteredPmProjects.length) : 0,
  }), [filteredStnItems, filteredPmProjects]);

  // SRN metrics
  const srnMetrics = React.useMemo(() => ({
    totalLifted:  filteredSrnItems.reduce((a, i) => a + Number(i.quantity || 0), 0),
    totalUsed:    filteredSrnItems.filter(i => i.received === true).reduce((a, i) => a + Number(i.quantity || 0), 0),
    totalPending: filteredSrnItems.filter(i => !i.received).reduce((a, i) => a + Number(i.quantity || 0), 0),
    totalReturn:  filteredSrnItems.reduce((a, i) => a + Number(i.return_qty || 0), 0),
    totalValue:   filteredSrnItems.reduce((a, i) => a + Number(i.amount || 0), 0),
    pendingValue: filteredSrnItems.filter(i => !i.received).reduce((a, i) => a + Number(i.amount || 0), 0),
    avgAging:     filteredPmProjects.length ? Math.round(filteredPmProjects.reduce((a, p) => a + (p.aging || 0), 0) / filteredPmProjects.length) : 0,
  }), [filteredSrnItems, filteredPmProjects]);

  // PTW metrics
  const ptwMetrics = React.useMemo(() => ({
    total:     filteredPmProjects.length,
    raised:    new Set(filteredPtwItems.map(p => p.project_id)).size,
    notRaised: filteredPmProjects.length - new Set(filteredPtwItems.map(p => p.project_id)).size,
  }), [filteredPtwItems, filteredPmProjects]);

  // STN/SRN table data (projects that have either STN or SRN)
  const stnSrnTableData = React.useMemo(() =>
    filteredPmProjects.filter(p => {
      const hasStn = stnItems.some(s => s.project_id === p.id);
      const hasSrn = srnItems.some(s => s.project_id === p.id);
      return hasStn || hasSrn;
    }),
    [pmProjects, stnItems, srnItems]
  );

  // Pagination
  const projTotalPages = Math.max(1, Math.ceil(filteredPmProjects.length / projPerPage));
  const projPaginated = filteredPmProjects.slice((projPage - 1) * projPerPage, projPage * projPerPage);
  const stnSrnTotalPages = Math.max(1, Math.ceil(stnSrnTableData.length / stnSrnPerPage));
  const stnSrnPaginated = stnSrnTableData.slice((stnSrnPage - 1) * stnSrnPerPage, stnSrnPage * stnSrnPerPage);

  const Pagination = ({ page, total, setPage, perPage, setPerPage, totalRecords }: {
    page: number; total: number; setPage: (p: number) => void;
    perPage: number; setPerPage: (n: number) => void; totalRecords: number;
  }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 12, color: T.textMuted }}>Rows per page:</span>
        {[10, 50, 100].map(n => (
          <button key={n} onClick={() => { setPerPage(n); setPage(1); }}
            style={{ padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${perPage === n ? T.primary : T.border}`,
              background: perPage === n ? T.primary : '#fff',
              color: perPage === n ? '#fff' : T.textMuted }}>
            {n}
          </button>
        ))}
        <span style={{ fontSize: 11, color: T.textMuted, marginLeft: 4 }}>({totalRecords} total)</span>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
          style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${T.border}`, background: page === 1 ? T.bg : '#fff', cursor: page === 1 ? 'default' : 'pointer', fontSize: 12 }}>← Prev</button>
        <span style={{ padding: '4px 10px', fontSize: 12, color: T.textMuted }}>Page {page} of {total}</span>
        <button onClick={() => setPage(Math.min(total, page + 1))} disabled={page === total}
          style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${T.border}`, background: page === total ? T.bg : '#fff', cursor: page === total ? 'default' : 'pointer', fontSize: 12 }}>Next →</button>
      </div>
    </div>
  );

  const contentRef = React.useRef<HTMLDivElement>(null);
  const [exportingPDF, setExportingPDF] = React.useState(false);

  const exportToPDF = async () => {
    if (!contentRef.current) return;
    setExportingPDF(true);
    // Wait for React to re-render the header/footer/signature sections before capturing
    await new Promise(resolve => setTimeout(resolve, 400));
    try {
      const canvas = await html2canvas(contentRef.current, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth  = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin     = 8;
      const footerH    = 10; // reserve space at bottom for footer
      const usableH    = pageHeight - margin - footerH;
      const imgWidth   = pageWidth - margin * 2;
      const imgHeight  = (canvas.height * imgWidth) / canvas.width;

      let pageNum = 1;
      let remaining = imgHeight;
      let srcYPx = 0;

      const addFooter = (page: number) => {
        const footerH = 9;
        const footerY = pageHeight - footerH;
        // Teal background bar
        pdf.setFillColor(13, 148, 136);
        pdf.rect(0, footerY, pageWidth, footerH, 'F');
        pdf.setFontSize(7.5);
        pdf.setTextColor(255, 255, 255);
        // Left: PM name (bold)
        pdf.setFont('helvetica', 'bold');
        pdf.text(`PM: ${pmName}`, margin, footerY + 5.5);
        // Center: page number (normal)
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Page ${page}`, pageWidth / 2, footerY + 5.5, { align: 'center' });
        // Right: branding — jsPDF can't render Tamil, use 'i' prefix instead
        pdf.setFont('helvetica', 'italic');
        const brandText = `Generated by iDataOne — www.idataone.com`;
        const tw = pdf.getTextWidth(brandText);
        pdf.text(brandText, pageWidth - margin - tw, footerY + 5.5);
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'normal');
      };

      while (remaining > 0) {
        const sliceImgH   = Math.min(usableH, remaining);
        const sliceCanvasH = sliceImgH * (canvas.height / imgHeight);
        const sliceCanvas  = document.createElement('canvas');
        sliceCanvas.width  = canvas.width;
        sliceCanvas.height = Math.ceil(sliceCanvasH);
        const ctx = sliceCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(canvas, 0, srcYPx, canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);
          pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', margin, margin, imgWidth, sliceImgH);
        }
        addFooter(pageNum);
        remaining -= sliceImgH;
        srcYPx    += sliceCanvas.height;
        if (remaining > 0) { pdf.addPage(); pageNum++; }
      }
      pdf.save(`PM_Report_${pmName.replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
    }
    setExportingPDF(false);
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryRows = [
      { Metric: 'PM Name', Value: pmName },
      { Metric: 'Total Projects', Value: pmProjects.length },
      { Metric: 'STN Items', Value: stnItems.length },
      { Metric: 'SRN Items', Value: srnItems.length },
      { Metric: '', Value: '' },
      { Metric: '--- STN Metrics ---', Value: '' },
      { Metric: 'STN Total Qty Lifted', Value: stnMetrics.totalLifted },
      { Metric: 'STN Total Qty Used', Value: stnMetrics.totalUsed },
      { Metric: 'STN Pending Qty', Value: stnMetrics.totalPending },
      { Metric: 'STN Return Qty', Value: stnMetrics.totalReturn },
      { Metric: 'STN Material Value', Value: stnMetrics.totalValue },
      { Metric: 'STN Material Pending Value', Value: stnMetrics.pendingValue },
      { Metric: 'STN Avg Aging Days', Value: stnMetrics.avgAging },
      { Metric: '', Value: '' },
      { Metric: '--- SRN Metrics ---', Value: '' },
      { Metric: 'SRN Total Qty Lifted', Value: srnMetrics.totalLifted },
      { Metric: 'SRN Total Qty Used', Value: srnMetrics.totalUsed },
      { Metric: 'SRN Pending Qty', Value: srnMetrics.totalPending },
      { Metric: 'SRN Return Qty', Value: srnMetrics.totalReturn },
      { Metric: 'SRN Material Value', Value: srnMetrics.totalValue },
      { Metric: 'SRN Material Pending Value', Value: srnMetrics.pendingValue },
      { Metric: 'SRN Avg Aging Days', Value: srnMetrics.avgAging },
      { Metric: '', Value: '' },
      { Metric: '--- PTW Metrics ---', Value: '' },
      { Metric: 'Total PTEs', Value: ptwMetrics.total },
      { Metric: 'Raised PTEs', Value: ptwMetrics.raised },
      { Metric: 'Not Raised PTEs', Value: ptwMetrics.notRaised },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Summary');

    // Sheet 2: Project Status
    const statusRows = statusGroups.map(({ name: s, value }) => ({
      'Project Status': s,
      'Count': value,
      'Percentage (%)': pmProjects.length ? Math.round(value / pmProjects.length * 100) : 0,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(statusRows), 'Project Status');

    // Sheet 3: Project List
    const projRows = pmProjects.map((p, i) => ({
      'S.No': i + 1,
      'PO Number': (p as any).poNo || '—',
      'Indus ID': (p as any).indusId || '—',
      'Region': (p as any).region || '—',
      'Project Status': (p as any).projectStatus || '—',
      'PM': (p as any).pm || '—',
      'RM': (p as any).rm || '—',
      'Vendor': (p as any).vendor || '—',
      'Aging (days)': (p as any).aging || 0,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(projRows), 'Projects');

    // Sheet 4: STN/SRN Detail
    const stnSrnRows = pmProjects.map((p, i) => {
      const pStn = stnItems.filter(s => s.project_id === p.id);
      const pSrn = srnItems.filter(s => s.project_id === p.id);
      return {
        'S.No': i + 1,
        'PO Number': (p as any).poNo || '—',
        'Indus ID': (p as any).indusId || '—',
        'Region': (p as any).region || '—',
        'STN Total Qty': pStn.reduce((a, s) => a + Number(s.issued_qty || 0), 0),
        'STN Received Qty': pStn.reduce((a, s) => a + Number(s.pm_approved_qty || 0), 0),
        'STN Return Qty': pStn.reduce((a, s) => a + Number(s.return_qty || 0), 0),
        'SRN Total Qty': pSrn.reduce((a, s) => a + Number(s.quantity || 0), 0),
        'SRN Return Qty': pSrn.reduce((a, s) => a + Number(s.return_qty || 0), 0),
      };
    }).filter(r => r['STN Total Qty'] > 0 || r['SRN Total Qty'] > 0);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stnSrnRows), 'STN-SRN Detail');

    XLSX.writeFile(wb, `PM_Report_${pmName.replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  if (!pmName) return null;

  return (
    <Layout>
      <style dangerouslySetInnerHTML={{ __html: printStyle }} />

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
            {loading ? 'Loading...' : isFiltering ? '⏳ Filtering...' : `${filteredPmProjects.length}${selectedStatus ? ` (filtered)` : ''} projects · ${filteredStnItems.length} STN items · ${filteredSrnItems.length} SRN items`}
          </div>
          {exportingPDF && (
            <div style={{ display:'flex', gap:20, marginTop:8, padding:'10px 16px', background:T.primaryLight, borderRadius:8, border:`1px solid ${T.primaryMid}` }}>
              <span style={{ fontSize:13, fontWeight:700, color:T.primary }}>👤 {pmName}</span>
              <span style={{ fontSize:13, color:T.textMuted }}>📁 {pmProjects.length} Projects</span>
              <span style={{ fontSize:13, color:T.textMuted }}>📦 {stnItems.length} STN Items</span>
              <span style={{ fontSize:13, color:T.textMuted }}>🔄 {srnItems.length} SRN Items</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' as const }}>
          {selectedStatus && (
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 10px', background:T.primaryLight,
              borderRadius:7, border:`1px solid ${T.primaryMid}`, fontSize:12, fontWeight:600, color:T.primary }}>
              Filtered: {selectedStatus}
              <span onClick={() => { startFilterTransition(() => { setSelectedStatus(null); setProjPage(1); }); }}
                style={{ cursor:'pointer', color:T.danger, fontWeight:800, marginLeft:4 }}>✕</span>
            </div>
          )}
          <button onClick={exportToExcel} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', fontSize: 12, fontWeight: 600,
              color: '#166534', background: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: 7, cursor: 'pointer' }}>
            📥 Excel
          </button>
          <button onClick={exportToPDF} disabled={exportingPDF || loading}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', fontSize: 12, fontWeight: 600,
              color: '#1E40AF', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 7,
              cursor: exportingPDF ? 'not-allowed' : 'pointer', opacity: exportingPDF ? 0.7 : 1 }}>
            {exportingPDF ? '⏳ Generating PDF…' : '📄 Export PDF'}
          </button>
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
        <div ref={contentRef}>
          {/* PDF-only header — inside contentRef so html2canvas captures it */}
          {exportingPDF && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px',
              background:'linear-gradient(135deg, #0D9488, #0F766E)', color:'#fff', marginBottom:16, borderRadius:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:10, background:'rgba(255,255,255,0.2)',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>⚡</div>
                <div>
                  <div style={{ fontSize:18, fontWeight:800, letterSpacing:0.5 }}>Venus Energy</div>
                  <div style={{ fontSize:10, opacity:0.8, textTransform:'uppercase', letterSpacing:1 }}>Project Control</div>
                </div>
              </div>
              <div style={{ textAlign:'right' as const }}>
                <div style={{ fontSize:16, fontWeight:700 }}>PM Performance Report</div>
                <div style={{ fontSize:13, opacity:0.85, marginTop:3 }}>
                  <strong>{pmName}</strong> · {filteredPmProjects.length} Projects · {stnItems.length} STN · {srnItems.length} SRN
                </div>
                <div style={{ fontSize:11, opacity:0.75, marginTop:2 }}>
                  {datePreset === 'all' ? 'All Time' : datePreset === 'week' ? 'This Week' : datePreset === 'month' ? 'This Month' : `${dateFrom} to ${dateTo}`}
                  {' · '}Generated on {new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                </div>
              </div>
            </div>
          )}
          {isFiltering && (
            <div style={{ position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(2px)' }}>
              <div style={{ background: '#fff', borderRadius: 12, padding: '20px 32px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 20, height: 20, border: `3px solid ${T.primaryMid}`, borderTop: `3px solid ${T.primary}`,
                  borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Applying filter…</span>
              </div>
            </div>
          )}
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
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 12 }}>📁 Project Status <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 400 }}>({filteredPmProjects.length} total)</span></div>
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                    {statusGroups.map(({ name: sName, value }, i) => {
                      const pct = pmProjects.length ? Math.round(value / pmProjects.length * 100) : 0;
                      const isActive = selectedStatus === sName;
                      return (
                        <div key={sName} onClick={() => { startFilterTransition(() => { setSelectedStatus(isActive ? null : sName); setProjPage(1); }); }}
                          style={{ padding: '8px 12px', background: isActive ? `${PIE_COLORS[i % PIE_COLORS.length]}18` : T.bg,
                            borderRadius: 8, borderLeft: `4px solid ${PIE_COLORS[i % PIE_COLORS.length]}`,
                            cursor: 'pointer', transition: 'all 0.15s',
                            border: isActive ? `1px solid ${PIE_COLORS[i % PIE_COLORS.length]}` : `1px solid transparent` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                            <span style={{ fontSize: 12, color: T.text, fontWeight: isActive ? 700 : 500 }}>{sName}</span>
                            <span style={{ fontSize: 14, fontWeight: 800, color: PIE_COLORS[i % PIE_COLORS.length] }}>{value} <span style={{ fontSize: 11, fontWeight: 600, color: T.textMuted }}>({pct}%)</span></span>
                          </div>
                          <div style={{ height: 4, background: T.border, borderRadius: 2 }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: PIE_COLORS[i % PIE_COLORS.length], borderRadius: 2 }} />
                          </div>
                        </div>
                      );
                    })}
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
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#D97706', marginBottom: 8 }}>📦 STN Status <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 400 }}>({filteredStnItems.length} items)</span></div>
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
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#DC2626', marginBottom: 8 }}>🔄 SRN Status <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 400 }}>({filteredSrnItems.length} items)</span></div>
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
                        const pStn = filteredStnItems.filter(s => s.project_id === p.id);
                        const pSrn = filteredSrnItems.filter(s => s.project_id === p.id);
                        const absIdx = (stnSrnPage - 1) * stnSrnPerPage + i + 1;
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
                <Pagination page={stnSrnPage} total={stnSrnTotalPages} setPage={setStnSrnPage}
                  perPage={stnSrnPerPage} setPerPage={setStnSrnPerPage} totalRecords={stnSrnTableData.length} />
              </div>

              {/* 3b. Nearly Completing — Work Completed / Approval Pending with pending STN/SRN */}
              {(() => {
                const nearlyDone = filteredPmProjects.filter(p => (p as any).projectStatus === 'Work Completed / Approval Pending');
                const withPending = nearlyDone.filter(p => {
                  const hasPendingStn = filteredStnItems.some(s => s.project_id === p.id && s.utilised_status !== 'pm_approved');
                  const hasPendingSrn = filteredSrnItems.some(s => s.project_id === p.id && s.received !== true);
                  return hasPendingStn || hasPendingSrn;
                });
                const allClear = nearlyDone.filter(p => !withPending.find(wp => wp.id === p.id));
                return (
                  <div style={card}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 12 }}>
                      🏁 Nearly Completing Projects <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 400 }}>({nearlyDone.length} projects in Work Completed / Approval Pending)</span>
                    </div>
                    {nearlyDone.length === 0 ? (
                      <div style={{ color: T.textMuted, fontSize: 13 }}>No projects in Work Completed / Approval Pending status.</div>
                    ) : withPending.length === 0 ? (
                      <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '12px 16px', color: '#166534', fontSize: 13, fontWeight: 600 }}>
                        ✅ No pending STN / SRN items for any nearly completing projects. All clear!
                      </div>
                    ) : (
                      <>
                        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 14px', marginBottom: 10, fontSize: 12, color: '#92400E' }}>
                          ⚠️ {withPending.length} of {nearlyDone.length} nearly completing projects still have pending STN/SRN items
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 12 }}>
                          <thead><tr>
                            {['PO Number','Indus ID','Region','Pending STN','Pending SRN'].map((h,i) => <th key={i} style={th}>{h}</th>)}
                          </tr></thead>
                          <tbody>
                            {withPending.map((p, i) => {
                              const pendingStn = filteredStnItems.filter(s => s.project_id === p.id && s.utilised_status !== 'pm_approved').length;
                              const pendingSrn = filteredSrnItems.filter(s => s.project_id === p.id && s.received !== true).length;
                              return (
                                <tr key={p.id} onClick={() => router.push(`/projects/${p.id}`)} style={{ background: i%2===0?'#fff':T.bg, cursor:'pointer' }}>
                                  <td style={{ ...td, fontWeight:700, color:T.primary }}>{(p as any).poNo||'—'}</td>
                                  <td style={{ ...td, color:T.textMuted }}>{(p as any).indusId||'—'}</td>
                                  <td style={td}>{(p as any).region||'—'}</td>
                                  <td style={{ ...td, textAlign:'center' as const, color: pendingStn>0?T.warning:T.success, fontWeight:700 }}>{pendingStn>0?pendingStn:'✓'}</td>
                                  <td style={{ ...td, textAlign:'center' as const, color: pendingSrn>0?T.warning:T.success, fontWeight:700 }}>{pendingSrn>0?pendingSrn:'✓'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        {allClear.length > 0 && (
                          <div style={{ marginTop:8, fontSize:12, color:T.textMuted }}>✅ {allClear.length} projects have no pending STN/SRN items.</div>
                        )}
                      </>
                    )}
                  </div>
                );
              })()}

              {/* 3c. Negative Projection — Billed Amount < Paid Expenses */}
              {(() => {
                const lossProjects = filteredPmProjects.filter(p => {
                  const billed = Number((p as any).billedAmount || 0);
                  const paid   = Number((p as any).paidAmount   || 0);
                  return billed > 0 && (billed - paid) < 0;
                });
                return (
                  <div style={card}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 12 }}>
                      📉 Negative Projection <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 400 }}>(Billed Amount &lt; Paid Expenses)</span>
                    </div>
                    {lossProjects.length === 0 ? (
                      <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '12px 16px', color: '#166534', fontSize: 13, fontWeight: 600 }}>
                        ✅ No projects with negative projection. All projects are financially on track!
                      </div>
                    ) : (
                      <>
                        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', marginBottom: 10, fontSize: 12, color: '#DC2626' }}>
                          ⚠️ {lossProjects.length} project{lossProjects.length > 1 ? 's are' : ' is'} in loss — expenses exceed billed amount
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 12 }}>
                          <thead><tr>
                            {['PO Number','Indus ID','Region','Billed','Paid','Projection'].map((h,i) => <th key={i} style={th}>{h}</th>)}
                          </tr></thead>
                          <tbody>
                            {lossProjects.map((p, i) => {
                              const billed = Number((p as any).billedAmount || 0);
                              const paid   = Number((p as any).paidAmount   || 0);
                              return (
                                <tr key={p.id} onClick={() => router.push(`/projects/${p.id}`)} style={{ background: i%2===0?'#fff':T.bg, cursor:'pointer' }}>
                                  <td style={{ ...td, fontWeight:700, color:T.primary }}>{(p as any).poNo||'—'}</td>
                                  <td style={{ ...td, color:T.textMuted }}>{(p as any).indusId||'—'}</td>
                                  <td style={td}>{(p as any).region||'—'}</td>
                                  <td style={{ ...td, textAlign:'right' as const }}>{fmt(billed)}</td>
                                  <td style={{ ...td, textAlign:'right' as const }}>{fmt(paid)}</td>
                                  <td style={{ ...td, textAlign:'right' as const, fontWeight:700, color:T.danger }}>{fmt(billed-paid)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* 3d. Did Well / Didn't Do Well */}
              {(() => {
                const total = filteredPmProjects.length || 1;
                const wccCount      = filteredPmProjects.filter(p => (p as any).projectStatus === 'WCC Raised').length;
                const wccRate       = Math.round(wccCount / total * 100);
                const delayedCount  = filteredPmProjects.filter(p => p.aging > 90).length;
                const delayRate     = Math.round(delayedCount / total * 100);
                const stnCleared    = filteredStnItems.filter(i => i.utilised_status === 'pm_approved').length;
                const stnTotal      = filteredStnItems.length || 1;
                const stnRate       = Math.round(stnCleared / stnTotal * 100);
                const srnCleared    = filteredSrnItems.filter(i => i.received === true).length;
                const srnTotal      = filteredSrnItems.length || 1;
                const srnRate       = Math.round(srnCleared / srnTotal * 100);

                const didWell    = [];
                const didntWell  = [];

                if (wccRate >= 10)  didWell.push(`✅ ${wccRate}% completion rate (${wccCount} of ${total} projects reached WCC Raised)`);
                else                didntWell.push(`📉 Low completion rate — only ${wccRate}% of projects reached WCC Raised (${wccCount} of ${total})`);

                if (delayRate <= 20) didWell.push(`✅ Low delay rate — only ${delayRate}% of projects are delayed beyond 90 days (${delayedCount} projects)`);
                else                 didntWell.push(`⏰ High delay rate — ${delayRate}% of projects are overdue beyond 90 days (${delayedCount} projects)`);

                if (stnTotal > 1) {
                  if (stnRate >= 70) didWell.push(`✅ STN approval rate at ${stnRate}% (${stnCleared} of ${stnTotal} items approved)`);
                  else               didntWell.push(`📦 Low STN approval rate — only ${stnRate}% approved (${stnTotal - stnCleared} items still pending)`);
                }
                if (srnTotal > 1) {
                  if (srnRate >= 70) didWell.push(`✅ SRN clearance rate at ${srnRate}% (${srnCleared} of ${srnTotal} items received)`);
                  else               didntWell.push(`🔄 Low SRN clearance rate — only ${srnRate}% received (${srnTotal - srnCleared} items pending)`);
                }

                return (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                    <div style={card}>
                      <div style={{ fontSize:14, fontWeight:700, color:'#166534', marginBottom:12 }}>🏆 What {pmName} Did Well</div>
                      {didWell.length === 0
                        ? <div style={{ fontSize:13, color:T.textMuted }}>Not enough data to determine strengths.</div>
                        : didWell.map((item, i) => (
                            <div key={i} style={{ padding:'8px 12px', background:'#F0FDF4', borderRadius:8, marginBottom:6, fontSize:13, color:'#166534', border:'1px solid #BBF7D0' }}>
                              {item}
                            </div>
                          ))
                      }
                    </div>
                    <div style={card}>
                      <div style={{ fontSize:14, fontWeight:700, color:T.danger, marginBottom:12 }}>🔧 Areas to Improve</div>
                      {didntWell.length === 0
                        ? <div style={{ fontSize:13, color:T.textMuted }}>No significant issues found — great performance!</div>
                        : didntWell.map((item, i) => (
                            <div key={i} style={{ padding:'8px 12px', background:'#FEF2F2', borderRadius:8, marginBottom:6, fontSize:13, color:'#DC2626', border:'1px solid #FECACA' }}>
                              {item}
                            </div>
                          ))
                      }
                    </div>
                  </div>
                );
              })()}

              {/* 4. Project List — last section with pagination */}
              <div style={card}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 12 }}>📋 Project List <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 400 }}>({filteredPmProjects.length} projects)</span></div>
                <div style={{ overflowX: 'auto' as const }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 12 }}>
                    <thead>
                      <tr>{['#','PO Number','Indus ID','Region','Status','PM','RM','Vendor'].map((h,i) => (
                        <th key={i} style={th}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {projPaginated.map((p, i) => {
                        const absIdx = (projPage - 1) * projPerPage + i + 1;
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
                <Pagination page={projPage} total={projTotalPages} setPage={setProjPage}
                  perPage={projPerPage} setPerPage={setProjPerPage} totalRecords={filteredPmProjects.length} />
              </div>
            </>
          )}

          {/* Signature section — only shown during PDF export */}
          {exportingPDF && (
            <div style={{ marginTop:48, paddingTop:20, borderTop:`2px solid ${T.border}` }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:60 }}>
                <div style={{ textAlign:'center' as const }}>
                  <div style={{ height:60, borderBottom:`1.5px solid ${T.text}`, marginBottom:8 }} />
                  <div style={{ fontSize:12, fontWeight:700, color:T.text }}>Regional Manager Signature</div>
                  <div style={{ fontSize:11, color:T.textMuted, marginTop:2 }}>Date: _______________</div>
                </div>
                <div style={{ textAlign:'center' as const }}>
                  <div style={{ height:60, borderBottom:`1.5px solid ${T.text}`, marginBottom:8 }} />
                  <div style={{ fontSize:12, fontWeight:700, color:T.text }}>Project Manager Signature</div>
                  <div style={{ fontSize:11, color:T.textMuted, marginTop:2 }}>Name: {pmName}</div>
                  <div style={{ fontSize:11, color:T.textMuted }}>Date: _______________</div>
                </div>
              </div>
              {/* Footer */}
              <div style={{ display:'flex', justifyContent:'flex-end', marginTop:24, paddingTop:12, borderTop:`1px solid ${T.border}` }}>
                <div style={{ fontSize:11, color:T.textMuted }}>
                  Generated by <span style={{ fontWeight:700, color:T.text }}>ஐ</span><span style={{ fontWeight:700, color:T.text }}>DataOne</span>
                  {' — '}<a href="https://www.idataone.com" style={{ color:T.primary, textDecoration:'none' }}>www.idataone.com</a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
