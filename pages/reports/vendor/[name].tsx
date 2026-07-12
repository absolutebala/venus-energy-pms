import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useProjects } from '@/context/ProjectContext';
import { T, fmtINR as fmt } from '@/lib/theme';
import { createClient } from '@/lib/supabase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

const card: React.CSSProperties = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '16px 20px', marginBottom: 16 };
const th: React.CSSProperties = { padding: '8px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, color: T.primary, background: T.primaryLight, textAlign: 'left' as const, borderBottom: `2px solid ${T.primaryMid}`, whiteSpace: 'nowrap' as const };
const td: React.CSSProperties = { padding: '8px 10px', fontSize: 12, borderBottom: `1px solid ${T.border}`, verticalAlign: 'middle' as const };
const PIE_COLORS = ['#2563EB','#DC2626','#16A34A','#D97706','#7C3AED','#6B7280','#0D9488','#EC4899','#F97316','#84CC16'];
const PER_PAGE_DEFAULT = 10;

const REPORTS = [
  { key:'executive', label:'Executive Summary',   icon:'📊', desc:'KPIs, billing, payments' },
  { key:'financial', label:'Financial Summary',   icon:'💰', desc:'PO value, billed, paid by region' },
  { key:'status',    label:'Project Status',      icon:'📁', desc:'Status distribution' },
  { key:'pm',        label:'PM Performance',      icon:'👤', desc:'Leaderboard & drill-down' },
  { key:'vendor',    label:'Vendor Performance',  icon:'🏢', desc:'Leaderboard & drill-down' },
];

const MetricRow = ({ label, value, color }: { label: string; value: any; color?: string }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${T.border}` }}>
    <span style={{ fontSize: 13, color: T.textMuted }}>{label}</span>
    <span style={{ fontSize: 13, fontWeight: 700, color: color || T.text }}>{value}</span>
  </div>
);

export default function VendorDetailPage() {
  const router = useRouter();
  const { name } = router.query;
  const vendorName = decodeURIComponent((name as string) || '');
  const { projects: allProjects } = useProjects();
  const sb = createClient();

  const [stnItems, setStnItems] = useState<any[]>([]);
  const [srnItems, setSrnItems] = useState<any[]>([]);
  const [ptwItems, setPtwItems] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [projPage, setProjPage] = useState(1);
  const [projPerPage, setProjPerPage] = useState(PER_PAGE_DEFAULT);
  const [stnSrnPage, setStnSrnPage] = useState(1);
  const [stnSrnPerPage, setStnSrnPerPage] = useState(PER_PAGE_DEFAULT);
  const [selectedStatus, setSelectedStatus] = useState<string|null>(null);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [isFiltering, startFilterTransition] = React.useTransition();
  const contentRef = React.useRef<HTMLDivElement>(null);

  const vendorProjects = React.useMemo(() =>
    (allProjects as any[]).filter(p => p.vendor === vendorName),
    [allProjects, vendorName]
  );
  const projectIds = React.useMemo(() => vendorProjects.map(p => p.id), [vendorProjects]);

  const fetchData = useCallback(async () => {
    if (!projectIds.length) { setLoading(false); return; }
    setLoading(true);
    const [stnRes, srnRes, ptwRes, expRes] = await Promise.all([
      sb.from('po_items').select('*').in('project_id', projectIds),
      sb.from('srn').select('*').in('project_id', projectIds),
      sb.from('ptw_items').select('*').in('project_id', projectIds),
      sb.from('expenses').select('id,project_id,paid_at,status,amount').in('project_id', projectIds).eq('status','paid').not('paid_at','is',null),
    ]);
    setStnItems(stnRes.data || []);
    setSrnItems(srnRes.data || []);
    setPtwItems(ptwRes.data || []);
    setExpenses(expRes.data || []);
    setLoading(false);
  }, [projectIds.join(',')]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredProjects = React.useMemo(() => {
    if (!selectedStatus) return vendorProjects;
    return vendorProjects.filter(p => ((p as any).projectStatus || 'Not Set') === selectedStatus);
  }, [vendorProjects, selectedStatus]);

  const filteredProjectIds = React.useMemo(() => new Set(filteredProjects.map(p => p.id)), [filteredProjects]);
  const filteredStnItems = React.useMemo(() => stnItems.filter(i => filteredProjectIds.has(i.project_id)), [stnItems, filteredProjectIds]);
  const filteredSrnItems = React.useMemo(() => srnItems.filter(i => filteredProjectIds.has(i.project_id)), [srnItems, filteredProjectIds]);
  const filteredPtwItems = React.useMemo(() => ptwItems.filter(i => filteredProjectIds.has(i.project_id)), [ptwItems, filteredProjectIds]);

  const statusGroups = React.useMemo(() => {
    const g: Record<string, number> = {};
    filteredProjects.forEach(p => { const s = (p as any).projectStatus || 'Not Set'; g[s] = (g[s] || 0) + 1; });
    return Object.entries(g).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [filteredProjects]);

  const stnMetrics = React.useMemo(() => ({
    totalLifted:  filteredStnItems.reduce((a, i) => a + Number(i.issued_qty || 0), 0),
    totalUsed:    filteredStnItems.reduce((a, i) => a + Number(i.utilised_qty || 0), 0),
    totalPending: filteredStnItems.reduce((a, i) => a + Math.max(0, Number(i.issued_qty || 0) - Number(i.pm_approved_qty || i.utilised_qty || 0)), 0),
    totalReturn:  filteredStnItems.reduce((a, i) => a + Number(i.return_qty || 0), 0),
    totalValue:   filteredStnItems.reduce((a, i) => a + Number(i.amount || 0), 0),
    pendingValue: filteredStnItems.filter(i => !i.utilised_status || i.utilised_status === 'pending').reduce((a, i) => a + Number(i.amount || 0), 0),
    avgAging:     filteredProjects.length ? Math.round(filteredProjects.reduce((a, p) => a + (p.aging || 0), 0) / filteredProjects.length) : 0,
  }), [filteredStnItems, filteredProjects]);

  const srnMetrics = React.useMemo(() => ({
    totalLifted:  filteredSrnItems.reduce((a, i) => a + Number(i.quantity || 0), 0),
    totalUsed:    filteredSrnItems.filter(i => i.received === true).reduce((a, i) => a + Number(i.quantity || 0), 0),
    totalPending: filteredSrnItems.filter(i => !i.received).reduce((a, i) => a + Number(i.quantity || 0), 0),
    totalReturn:  filteredSrnItems.reduce((a, i) => a + Number(i.return_qty || 0), 0),
    totalValue:   filteredSrnItems.reduce((a, i) => a + Number(i.amount || 0), 0),
    pendingValue: filteredSrnItems.filter(i => !i.received).reduce((a, i) => a + Number(i.amount || 0), 0),
    avgAging:     filteredProjects.length ? Math.round(filteredProjects.reduce((a, p) => a + (p.aging || 0), 0) / filteredProjects.length) : 0,
  }), [filteredSrnItems, filteredProjects]);

  const ptwMetrics = React.useMemo(() => ({
    total:     filteredProjects.length,
    raised:    new Set(filteredPtwItems.map(p => p.project_id)).size,
    notRaised: filteredProjects.length - new Set(filteredPtwItems.map(p => p.project_id)).size,
  }), [filteredPtwItems, filteredProjects]);

  const WCC_DONE = ['WCC Raised','Work Completed / Approval Pending','Invoice Submitted – Payment Pending','Invoice Submitted – Payment Received','Billing Shared','Already Billed with Another PO'];
  const today = new Date();

  const wccAlert = React.useMemo(() => filteredProjects.filter(p => {
    if (WCC_DONE.some(s => (p as any).projectStatus === s)) return false;
    const projExp = expenses.filter((e:any) => e.project_id === p.id && e.paid_at);
    if (!projExp.length) return false;
    const firstPaid = new Date(projExp.sort((a:any,b:any)=>new Date(a.paid_at).getTime()-new Date(b.paid_at).getTime())[0].paid_at);
    return Math.floor((today.getTime()-firstPaid.getTime())/(1000*60*60*24)) > 15;
  }).map(p => {
    const projExp = expenses.filter((e:any) => e.project_id === p.id && e.paid_at);
    const firstPaid = new Date(projExp.sort((a:any,b:any)=>new Date(a.paid_at).getTime()-new Date(b.paid_at).getTime())[0].paid_at);
    const days = Math.floor((today.getTime()-firstPaid.getTime())/(1000*60*60*24));
    return { ...p, firstPaidDate: firstPaid.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}), days };
  }).sort((a:any,b:any)=>b.days-a.days), [filteredProjects, expenses]);

  const negProj = React.useMemo(() => filteredProjects.filter(p => {
    const b = Number((p as any).billedAmount||0); const pd = Number((p as any).paidAmount||0);
    return b > 0 && (b - pd) < 0;
  }), [filteredProjects]);

  const nearlyComp = React.useMemo(() => filteredProjects.filter(p =>
    (p as any).projectStatus === 'Work Completed / Approval Pending' &&
    filteredStnItems.some(m => m.project_id === p.id && m.utilised_status !== 'pm_approved')
  ), [filteredProjects, filteredStnItems]);

  const stnSrnTableData = React.useMemo(() =>
    filteredProjects.filter(p => stnItems.some(s=>s.project_id===p.id) || srnItems.some(s=>s.project_id===p.id)),
    [filteredProjects, stnItems, srnItems]
  );

  const projTotalPages = Math.max(1, Math.ceil(filteredProjects.length / projPerPage));
  const projPaginated  = filteredProjects.slice((projPage-1)*projPerPage, projPage*projPerPage);
  const stnSrnTotalPages = Math.max(1, Math.ceil(stnSrnTableData.length / stnSrnPerPage));
  const stnSrnPaginated  = stnSrnTableData.slice((stnSrnPage-1)*stnSrnPerPage, stnSrnPage*stnSrnPerPage);

  const Pagination = ({ page, total, setPage, perPage, setPerPage, totalRecords }: any) => (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <span style={{ fontSize:12, color:T.textMuted }}>Rows:</span>
        {[10,50,100,'All'].map(n=>(
          <button key={n} onClick={()=>{setPerPage(n==='All'?99999:Number(n));setPage(1);}}
            style={{ padding:'3px 10px', borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer',
              border:`1px solid ${perPage===(n==='All'?99999:Number(n))?T.primary:T.border}`,
              background:perPage===(n==='All'?99999:Number(n))?T.primary:'#fff',
              color:perPage===(n==='All'?99999:Number(n))?'#fff':T.textMuted }}>{n}</button>
        ))}
        <span style={{ fontSize:11, color:T.textMuted }}>({totalRecords} total)</span>
      </div>
      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
        <button onClick={()=>setPage(Math.max(1,page-1))} disabled={page===1}
          style={{ padding:'4px 10px', borderRadius:6, border:`1px solid ${T.border}`, background:page===1?T.bg:'#fff', cursor:page===1?'default':'pointer', fontSize:12 }}>← Prev</button>
        <span style={{ fontSize:12, color:T.textMuted }}>Page {page} of {total}</span>
        <button onClick={()=>setPage(Math.min(total,page+1))} disabled={page===total}
          style={{ padding:'4px 10px', borderRadius:6, border:`1px solid ${T.border}`, background:page===total?T.bg:'#fff', cursor:page===total?'default':'pointer', fontSize:12 }}>Next →</button>
      </div>
    </div>
  );

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
      { Metric:'Vendor', Value:vendorName },
      { Metric:'Total Projects', Value:vendorProjects.length },
      { Metric:'STN Items', Value:stnItems.length },
      { Metric:'SRN Items', Value:srnItems.length },
      { Metric:'', Value:'' },
      { Metric:'STN Total Qty Lifted', Value:stnMetrics.totalLifted },
      { Metric:'STN Total Qty Used', Value:stnMetrics.totalUsed },
      { Metric:'STN Pending Qty', Value:stnMetrics.totalPending },
      { Metric:'STN Return Qty', Value:stnMetrics.totalReturn },
      { Metric:'STN Material Value', Value:stnMetrics.totalValue },
      { Metric:'STN Material Pending Value', Value:stnMetrics.pendingValue },
      { Metric:'', Value:'' },
      { Metric:'SRN Total Qty Lifted', Value:srnMetrics.totalLifted },
      { Metric:'SRN Total Qty Used', Value:srnMetrics.totalUsed },
      { Metric:'SRN Pending Qty', Value:srnMetrics.totalPending },
      { Metric:'SRN Return Qty', Value:srnMetrics.totalReturn },
      { Metric:'PTW Total', Value:ptwMetrics.total },
      { Metric:'PTW Raised', Value:ptwMetrics.raised },
      { Metric:'PTW Not Raised', Value:ptwMetrics.notRaised },
    ]), 'Summary');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(statusGroups.map(s=>({ 'Status':s.name,'Count':s.value,'%':vendorProjects.length?Math.round(s.value/vendorProjects.length*100):0 }))), 'Project Status');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vendorProjects.map((p,i)=>({ '#':i+1,'PO Number':(p as any).poNo||'—','Indus ID':(p as any).indusId||'—','Region':(p as any).region||'—','Status':(p as any).projectStatus||'—','PM':(p as any).pm||'—','RM':(p as any).rm||'—','Vendor':(p as any).vendor||'—','Aging':(p as any).aging||0 }))), 'Projects');
    XLSX.writeFile(wb, `Vendor_Report_${vendorName.replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const exportToPDF = async () => {
    if (!contentRef.current) return;
    setExportingPDF(true);
    await new Promise(r => setTimeout(r, 400));
    try {
      const canvas = await html2canvas(contentRef.current, { scale:1.5, useCORS:true, backgroundColor:'#ffffff', logging:false });
      const pdf = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
      const pw=pdf.internal.pageSize.getWidth(), ph=pdf.internal.pageSize.getHeight();
      const margin=8, footerH=9, usableH=ph-margin-footerH;
      const imgW=pw-margin*2, imgH=(canvas.height*imgW)/canvas.width;
      let page=1, remaining=imgH, srcYPx=0;
      const addFooter=(p:number)=>{
        pdf.setFillColor(13,148,136); pdf.rect(0,ph-footerH,pw,footerH,'F');
        pdf.setFontSize(7.5); pdf.setTextColor(255,255,255);
        pdf.setFont('helvetica','bold'); pdf.text(`Vendor: ${vendorName}`,margin,ph-footerH+5.5);
        pdf.setFont('helvetica','normal'); pdf.text(`Page ${p}`,pw/2,ph-footerH+5.5,{align:'center'});
        pdf.setFont('helvetica','italic');
        const brand='Generated by iDataOne — www.idataone.com';
        pdf.text(brand,pw-margin-pdf.getTextWidth(brand),ph-footerH+5.5);
        pdf.setTextColor(0,0,0);
      };
      while (remaining>0) {
        const sliceH=Math.min(usableH,remaining);
        const sc=document.createElement('canvas'); sc.width=canvas.width; sc.height=Math.ceil(sliceH*(canvas.height/imgH));
        const ctx=sc.getContext('2d');
        if(ctx){ctx.drawImage(canvas,0,srcYPx,canvas.width,sc.height,0,0,canvas.width,sc.height);pdf.addImage(sc.toDataURL('image/png'),'PNG',margin,margin,imgW,sliceH);}
        addFooter(page); remaining-=sliceH; srcYPx+=sc.height;
        if(remaining>0){pdf.addPage();page++;}
      }
      pdf.save(`Vendor_Report_${vendorName.replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch(e){console.error(e);}
    setExportingPDF(false);
  };

  if (!vendorName) return null;

  return (
    <Layout>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button onClick={()=>router.push('/reports?section=vendor')}
              style={{ background:'none', border:'none', color:T.primary, cursor:'pointer', fontSize:13, fontWeight:600 }}>
              ← Vendor Performance
            </button>
            <span style={{ color:T.textDim }}>/</span>
            <h1 style={{ fontSize:20, fontWeight:800, color:T.text, margin:0 }}>🏢 {vendorName}</h1>
          </div>
          <div style={{ fontSize:13, color:T.textMuted, marginTop:4 }}>
            {loading ? 'Loading...' : isFiltering ? '⏳ Filtering...' : `${filteredProjects.length}${selectedStatus?' (filtered)':''} projects · ${filteredStnItems.length} STN items · ${filteredSrnItems.length} SRN items`}
          </div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {selectedStatus && (
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 10px', background:T.primaryLight,
              borderRadius:7, border:`1px solid ${T.primaryMid}`, fontSize:12, fontWeight:600, color:T.primary }}>
              Filtered: {selectedStatus}
              <span onClick={()=>{startFilterTransition(()=>{setSelectedStatus(null);setProjPage(1);});}}
                style={{ cursor:'pointer', color:T.danger, fontWeight:800, marginLeft:4 }}>✕</span>
            </div>
          )}
          <button onClick={exportToExcel} disabled={loading}
            style={{ display:'flex', alignItems:'center', gap:4, padding:'7px 14px', fontSize:12, fontWeight:600,
              color:'#166534', background:'#DCFCE7', border:'1px solid #86EFAC', borderRadius:7, cursor:'pointer' }}>
            📥 Excel
          </button>
          <button onClick={exportToPDF} disabled={exportingPDF||loading}
            style={{ display:'flex', alignItems:'center', gap:4, padding:'7px 14px', fontSize:12, fontWeight:600,
              color:'#1E40AF', background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:7,
              cursor:exportingPDF?'not-allowed':'pointer', opacity:exportingPDF?0.7:1 }}>
            {exportingPDF?'⏳ Generating PDF…':'📄 Export PDF'}
          </button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:16 }}>
        <div>
          {REPORTS.map(r=>(
            <div key={r.key} onClick={()=>router.push(`/reports?section=${r.key}`)}
              style={{ padding:'10px 12px', borderRadius:9, marginBottom:6, cursor:'pointer',
                border:`1.5px solid ${r.key==='vendor'?T.primary:T.border}`,
                background:r.key==='vendor'?T.primaryLight:T.surface }}>
              <div style={{ fontSize:13, fontWeight:600, color:r.key==='vendor'?T.primary:T.text }}>{r.icon} {r.label}</div>
              <div style={{ fontSize:11, color:T.textMuted, marginTop:2 }}>{r.desc}</div>
            </div>
          ))}
        </div>

        <div ref={contentRef}>
          {exportingPDF && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px',
              background:'linear-gradient(135deg, #0D9488, #0F766E)', color:'#fff', marginBottom:16, borderRadius:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:10, background:'rgba(255,255,255,0.2)',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>⚡</div>
                <div>
                  <div style={{ fontSize:18, fontWeight:800 }}>Venus Energy</div>
                  <div style={{ fontSize:10, opacity:0.8, textTransform:'uppercase', letterSpacing:1 }}>Project Control</div>
                </div>
              </div>
              <div style={{ textAlign:'right' as const }}>
                <div style={{ fontSize:16, fontWeight:700 }}>Vendor Performance Report</div>
                <div style={{ fontSize:13, opacity:0.85, marginTop:3 }}>
                  <strong>{vendorName}</strong> · {filteredProjects.length} Projects · {filteredStnItems.length} STN · {filteredSrnItems.length} SRN
                </div>
                <div style={{ fontSize:11, opacity:0.75, marginTop:2 }}>Generated on {new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ ...card, textAlign:'center' as const, padding:40, color:T.textMuted }}>Loading data...</div>
          ) : vendorProjects.length === 0 ? (
            <div style={{ ...card, textAlign:'center' as const, padding:40, color:T.textMuted }}>No projects found for {vendorName}</div>
          ) : (
            <>
              {/* Project Status + PTW */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div style={card}>
                  <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:12 }}>📁 Project Status <span style={{ fontSize:12, color:T.textMuted, fontWeight:400 }}>({filteredProjects.length} total)</span></div>
                  <div style={{ display:'flex', flexDirection:'column' as const, gap:6 }}>
                    {statusGroups.map(({name:sName,value},i)=>{
                      const pct=vendorProjects.length?Math.round(value/vendorProjects.length*100):0;
                      const isActive=selectedStatus===sName;
                      return (
                        <div key={sName} onClick={()=>{startFilterTransition(()=>{setSelectedStatus(isActive?null:sName);setProjPage(1);});}}
                          style={{ padding:'8px 12px', background:isActive?`${PIE_COLORS[i%PIE_COLORS.length]}18`:T.bg,
                            borderRadius:8, borderLeft:`4px solid ${PIE_COLORS[i%PIE_COLORS.length]}`,
                            cursor:'pointer', border:isActive?`1px solid ${PIE_COLORS[i%PIE_COLORS.length]}`:'1px solid transparent' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
                            <span style={{ fontSize:12, color:T.text, fontWeight:isActive?700:500 }}>{sName}</span>
                            <span style={{ fontSize:14, fontWeight:800, color:PIE_COLORS[i%PIE_COLORS.length] }}>{value} <span style={{ fontSize:11, color:T.textMuted }}>({pct}%)</span></span>
                          </div>
                          <div style={{ height:4, background:T.border, borderRadius:2 }}>
                            <div style={{ height:'100%', width:`${pct}%`, background:PIE_COLORS[i%PIE_COLORS.length], borderRadius:2 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column' as const, gap:10 }}>
                  <div style={card}>
                    <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:8 }}>🔐 PTW Status</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                      {[{label:'Total PTEs',value:ptwMetrics.total,color:T.primary},{label:'Raised',value:ptwMetrics.raised,color:T.success},{label:'Not Raised',value:ptwMetrics.notRaised,color:ptwMetrics.notRaised>0?T.danger:T.success}].map(m=>(
                        <div key={m.label} style={{ background:T.bg, borderRadius:8, padding:'8px 10px', textAlign:'center' as const }}>
                          <div style={{ fontSize:10, color:T.textMuted, marginBottom:3 }}>{m.label}</div>
                          <div style={{ fontSize:20, fontWeight:800, color:m.color }}>{m.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={card}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#D97706', marginBottom:8 }}>📦 STN Status <span style={{ fontSize:11, color:T.textMuted, fontWeight:400 }}>({filteredStnItems.length} items)</span></div>
                    <MetricRow label="Total Qty Lifted" value={stnMetrics.totalLifted} />
                    <MetricRow label="Total Qty Used" value={stnMetrics.totalUsed} />
                    <MetricRow label="Pending Qty" value={stnMetrics.totalPending} color={stnMetrics.totalPending>0?T.warning:T.success} />
                    <MetricRow label="Return Qty" value={stnMetrics.totalReturn} />
                    <MetricRow label="Material Value" value={fmt(stnMetrics.totalValue)} color={T.primary} />
                    <MetricRow label="Material Pending Value" value={fmt(stnMetrics.pendingValue)} color={stnMetrics.pendingValue>0?T.danger:T.success} />
                    <MetricRow label="Avg Aging Days" value={`${stnMetrics.avgAging}d`} color={stnMetrics.avgAging>90?T.danger:stnMetrics.avgAging>60?T.warning:T.success} />
                  </div>
                  <div style={card}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#DC2626', marginBottom:8 }}>🔄 SRN Status <span style={{ fontSize:11, color:T.textMuted, fontWeight:400 }}>({filteredSrnItems.length} items)</span></div>
                    <MetricRow label="Total Qty Lifted" value={srnMetrics.totalLifted} />
                    <MetricRow label="Total Qty Used" value={srnMetrics.totalUsed} />
                    <MetricRow label="Pending Qty" value={srnMetrics.totalPending} color={srnMetrics.totalPending>0?T.warning:T.success} />
                    <MetricRow label="Return Qty" value={srnMetrics.totalReturn} />
                    <MetricRow label="Material Value" value={fmt(srnMetrics.totalValue)} color={T.primary} />
                    <MetricRow label="Material Pending Value" value={fmt(srnMetrics.pendingValue)} color={srnMetrics.pendingValue>0?T.danger:T.success} />
                    <MetricRow label="Avg Aging Days" value={`${srnMetrics.avgAging}d`} color={srnMetrics.avgAging>90?T.danger:srnMetrics.avgAging>60?T.warning:T.success} />
                  </div>
                </div>
              </div>

              {/* WCC Aging Alert */}
              <div style={card}>
                <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:12 }}>⏱️ WCC Aging Alert <span style={{ fontSize:12, color:T.textMuted, fontWeight:400 }}>({wccAlert.length} projects)</span></div>
                {wccAlert.length===0 ? <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:8, padding:'12px 16px', color:'#166534', fontSize:13, fontWeight:600 }}>✅ No projects pending WCC beyond 15 days.</div> : (
                  <table style={{ width:'100%', borderCollapse:'collapse' as const, fontSize:12 }}>
                    <thead><tr>{['PO Number','Indus ID','Region','Status','First Expense Paid','Days Elapsed'].map((h,i)=><th key={i} style={th}>{h}</th>)}</tr></thead>
                    <tbody>{wccAlert.map((p:any,i:number)=>(
                      <tr key={p.id} onClick={()=>router.push(`/projects/${p.id}`)} style={{ background:i%2===0?'#fff':T.bg, cursor:'pointer' }}>
                        <td style={{ ...td, fontWeight:700, color:T.primary }}>{p.poNo||'—'}</td>
                        <td style={{ ...td, color:T.textMuted }}>{p.indusId||'—'}</td>
                        <td style={td}>{p.region||'—'}</td>
                        <td style={td}><span style={{ fontSize:10, background:'#F3F4F6', padding:'2px 8px', borderRadius:10 }}>{p.projectStatus||'—'}</span></td>
                        <td style={td}>{p.firstPaidDate}</td>
                        <td style={{ ...td, fontWeight:700, color:p.days>30?T.danger:T.warning }}>{p.days}d</td>
                      </tr>
                    ))}</tbody>
                  </table>
                )}
              </div>

              {/* Negative Projection */}
              <div style={card}>
                <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:12 }}>📉 Negative Projection <span style={{ fontSize:12, color:T.textMuted, fontWeight:400 }}>({negProj.length} projects)</span></div>
                {negProj.length===0 ? <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:8, padding:'12px 16px', color:'#166534', fontSize:13, fontWeight:600 }}>✅ No projects with negative projection.</div> : (
                  <table style={{ width:'100%', borderCollapse:'collapse' as const, fontSize:12 }}>
                    <thead><tr>{['PO Number','Indus ID','Region','Billed','Paid','Projection'].map((h,i)=><th key={i} style={th}>{h}</th>)}</tr></thead>
                    <tbody>{negProj.map((p:any,i:number)=>{
                      const b=Number(p.billedAmount||0),pd=Number(p.paidAmount||0);
                      return <tr key={p.id} onClick={()=>router.push(`/projects/${p.id}`)} style={{ background:i%2===0?'#fff':T.bg, cursor:'pointer' }}>
                        <td style={{ ...td, fontWeight:700, color:T.primary }}>{p.poNo||'—'}</td>
                        <td style={{ ...td, color:T.textMuted }}>{p.indusId||'—'}</td>
                        <td style={td}>{p.region||'—'}</td>
                        <td style={td}>{fmt(b)}</td><td style={td}>{fmt(pd)}</td>
                        <td style={{ ...td, fontWeight:700, color:T.danger }}>{fmt(b-pd)}</td>
                      </tr>;
                    })}</tbody>
                  </table>
                )}
              </div>

              {/* Nearly Completing */}
              <div style={card}>
                <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:12 }}>🏁 Nearly Completing — Pending STN <span style={{ fontSize:12, color:T.textMuted, fontWeight:400 }}>({nearlyComp.length} projects)</span></div>
                {nearlyComp.length===0 ? <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:8, padding:'12px 16px', color:'#166534', fontSize:13, fontWeight:600 }}>✅ No pending STN items for nearly completing projects.</div> : (
                  <table style={{ width:'100%', borderCollapse:'collapse' as const, fontSize:12 }}>
                    <thead><tr>{['PO Number','Indus ID','Region','Pending STN'].map((h,i)=><th key={i} style={th}>{h}</th>)}</tr></thead>
                    <tbody>{nearlyComp.map((p:any,i:number)=>{
                      const ps=filteredStnItems.filter(m=>m.project_id===p.id&&m.utilised_status!=='pm_approved').length;
                      return <tr key={p.id} onClick={()=>router.push(`/projects/${p.id}`)} style={{ background:i%2===0?'#fff':T.bg, cursor:'pointer' }}>
                        <td style={{ ...td, fontWeight:700, color:T.primary }}>{p.poNo||'—'}</td>
                        <td style={{ ...td, color:T.textMuted }}>{p.indusId||'—'}</td>
                        <td style={td}>{p.region||'—'}</td>
                        <td style={{ ...td, fontWeight:700, color:T.warning }}>{ps}</td>
                      </tr>;
                    })}</tbody>
                  </table>
                )}
              </div>

              {/* STN/SRN Detail */}
              <div style={card}>
                <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:12 }}>📦 STN / SRN Detail by Project <span style={{ fontSize:12, color:T.textMuted, fontWeight:400 }}>({stnSrnTableData.length} projects)</span></div>
                <div style={{ overflowX:'auto' as const }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' as const, fontSize:12 }}>
                    <thead><tr>{['#','PO Number','Indus ID','Region','STN Total','STN Received','STN Return','SRN Total','SRN Return'].map((h,i)=><th key={i} style={th}>{h}</th>)}</tr></thead>
                    <tbody>{stnSrnPaginated.map((p,i)=>{
                      const pStn=stnItems.filter(s=>s.project_id===p.id);
                      const pSrn=srnItems.filter(s=>s.project_id===p.id);
                      const absIdx=(stnSrnPage-1)*stnSrnPerPage+i+1;
                      return <tr key={p.id} style={{ background:i%2===0?'#fff':T.bg }}>
                        <td style={{ ...td, color:T.textMuted }}>{absIdx}</td>
                        <td style={{ ...td, fontWeight:700, color:T.primary }}>{(p as any).poNo||'—'}</td>
                        <td style={{ ...td, color:T.textMuted }}>{(p as any).indusId||'—'}</td>
                        <td style={td}>{(p as any).region||'—'}</td>
                        <td style={{ ...td, textAlign:'center' as const, fontWeight:600 }}>{pStn.reduce((a,s)=>a+Number(s.issued_qty||0),0)||'—'}</td>
                        <td style={{ ...td, textAlign:'center' as const, color:T.success }}>{pStn.reduce((a,s)=>a+Number(s.pm_approved_qty||0),0)||'—'}</td>
                        <td style={{ ...td, textAlign:'center' as const }}>{pStn.reduce((a,s)=>a+Number(s.return_qty||0),0)||'—'}</td>
                        <td style={{ ...td, textAlign:'center' as const, fontWeight:600 }}>{pSrn.reduce((a,s)=>a+Number(s.quantity||0),0)||'—'}</td>
                        <td style={{ ...td, textAlign:'center' as const }}>{pSrn.reduce((a,s)=>a+Number(s.return_qty||0),0)||'—'}</td>
                      </tr>;
                    })}</tbody>
                  </table>
                </div>
                <Pagination page={stnSrnPage} total={stnSrnTotalPages} setPage={setStnSrnPage} perPage={stnSrnPerPage} setPerPage={setStnSrnPerPage} totalRecords={stnSrnTableData.length} />
              </div>

              {/* Project List */}
              <div style={card}>
                <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:12 }}>📋 Project List <span style={{ fontSize:12, color:T.textMuted, fontWeight:400 }}>({filteredProjects.length} projects)</span></div>
                <div style={{ overflowX:'auto' as const }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' as const, fontSize:12 }}>
                    <thead><tr>{['#','PO Number','Indus ID','Region','Status','PM','RM','Vendor'].map((h,i)=><th key={i} style={th}>{h}</th>)}</tr></thead>
                    <tbody>{projPaginated.map((p,i)=>{
                      const absIdx=(projPage-1)*projPerPage+i+1;
                      return <tr key={p.id} onClick={()=>router.push(`/projects/${p.id}`)} style={{ background:i%2===0?'#fff':T.bg, cursor:'pointer' }}>
                        <td style={{ ...td, color:T.textMuted }}>{absIdx}</td>
                        <td style={{ ...td, fontWeight:700, color:T.primary }}>{(p as any).poNo||'—'}</td>
                        <td style={{ ...td, color:T.textMuted }}>{(p as any).indusId||'—'}</td>
                        <td style={td}>{(p as any).region||'—'}</td>
                        <td style={td}><span style={{ fontSize:10, fontWeight:600, color:'#6B7280', background:'#F3F4F6', padding:'2px 8px', borderRadius:10 }}>{(p as any).projectStatus||'—'}</span></td>
                        <td style={td}>{(p as any).pm||'—'}</td>
                        <td style={td}>{(p as any).rm||'—'}</td>
                        <td style={td}>{(p as any).vendor||'—'}</td>
                      </tr>;
                    })}</tbody>
                  </table>
                </div>
                <Pagination page={projPage} total={projTotalPages} setPage={setProjPage} perPage={projPerPage} setPerPage={setProjPerPage} totalRecords={filteredProjects.length} />
              </div>

              {/* Signature section for PDF */}
              {exportingPDF && (
                <div style={{ marginTop:48, paddingTop:20, borderTop:`2px solid ${T.border}` }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:60 }}>
                    <div style={{ textAlign:'center' as const }}>
                      <div style={{ height:60, borderBottom:`1.5px solid ${T.text}`, marginBottom:8 }} />
                      <div style={{ fontSize:12, fontWeight:700, color:T.text }}>Authorized Signatory</div>
                      <div style={{ fontSize:11, color:T.textMuted, marginTop:2 }}>Date: _______________</div>
                    </div>
                    <div style={{ textAlign:'center' as const }}>
                      <div style={{ height:60, borderBottom:`1.5px solid ${T.text}`, marginBottom:8 }} />
                      <div style={{ fontSize:12, fontWeight:700, color:T.text }}>Vendor Representative</div>
                      <div style={{ fontSize:11, color:T.textMuted, marginTop:2 }}>Name: {vendorName}</div>
                      <div style={{ fontSize:11, color:T.textMuted }}>Date: _______________</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', justifyContent:'flex-end', marginTop:24, paddingTop:12, borderTop:`1px solid ${T.border}` }}>
                    <div style={{ fontSize:11, color:T.textMuted }}>Generated by <span style={{ fontWeight:700 }}>ஐDataOne</span> — <a href="https://www.idataone.com" style={{ color:T.primary }}>www.idataone.com</a></div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
