import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useProjects } from '@/context/ProjectContext';
import { usePOItems } from '@/context/POItemContext';
import { createClient } from '@/lib/supabase';
import { T as Theme, card } from '@/lib/theme';

export default function SRNReturnPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { projects, loading: projLoading } = useProjects();
  const { items: stnAllItems, loading: stnLoading } = usePOItems();
  const sb = createClient();

  const [srnRawItems, setSrnRawItems] = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState<string|null>(null);
  const [search,      setSearch]      = useState('');
  const [expandedSRN, setExpandedSRN] = useState<string|null>(null);
  const [expandedSTN, setExpandedSTN] = useState<string|null>(null);

  // View toggles + card filter
  const [showSRN, setShowSRN] = useState(true);
  const [showSTN, setShowSTN] = useState(true);
  // cardFilter: { type:'stn'|'srn', field:'pm'|'region', value:string } | null
  const [cardFilter, setCardFilter] = useState<{type:string;field:string;value:string}|null>(null);

  const role       = profile?.role || 'viewer';
  const isPM       = ['project_manager','super_admin','region_manager'].includes(role);
  const showVendor = ['super_admin','region_manager','project_manager'].includes(role);

  const fetchSRN = useCallback(async () => {
    setLoading(true);
    const { data } = await sb.from('srn').select('*').order('project_id').order('sort_order').order('created_at');
    setSrnRawItems(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSRN(); }, [fetchSRN]);

  const markReceived = async (item: any, received: boolean) => {
    setSaving(item.id);
    try {
      const { error } = await sb.from('srn').update({ received }).eq('id', item.id);
      if (error) throw new Error(error.message);
      setSrnRawItems(prev => prev.map((i:any) => i.id === item.id ? { ...i, received } : i));
    } catch(err) { console.error(err); }
    finally { setSaving(null); }
  };

  // ── SRN grouped by project ───────────────────────────────────────────────
  const srnGrouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const item of srnRawItems) {
      if (!map[item.project_id]) map[item.project_id] = [];
      map[item.project_id].push(item);
    }
    return Object.entries(map).map(([projectId, srnItems]) => {
      const proj = (projects as any[]).find(p => p.id === projectId);
      return { projectId, projectName: proj?.site || proj?.projectName || projectId,
        poNo: proj?.poNo || '—', vendor: proj?.vendor || '—',
        pm: proj?.pm || '—', region: proj?.region || '—', srnItems };
    });
  }, [srnRawItems, projects]);

  // ── STN grouped by project ───────────────────────────────────────────────
  const stnGrouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const item of stnAllItems) {
      if (!map[item.projectId]) map[item.projectId] = [];
      map[item.projectId].push(item);
    }
    return Object.entries(map).map(([projectId, stnItems]) => {
      const proj = (projects as any[]).find(p => p.id === projectId);
      return { projectId, projectName: proj?.site || proj?.projectName || projectId,
        poNo: proj?.poNo || '—', vendor: proj?.vendor || '—',
        pm: proj?.pm || '—', region: proj?.region || '—', stnItems };
    });
  }, [stnAllItems, projects]);

  // ── KPI aggregations ─────────────────────────────────────────────────────
  const stnByPM     = useMemo(() => { const r:Record<string,{total:number;pending:number}> = {}; for (const i of stnAllItems) { const proj=(projects as any[]).find(p=>p.id===i.projectId); const pm=proj?.pm||'—'; const isPend=i.pmApprovedQty===null||i.pmApprovedQty===undefined; if(!r[pm]) r[pm]={total:0,pending:0}; r[pm].total++; if(isPend) r[pm].pending++; } return r; }, [stnAllItems, projects]);
  const stnByRegion = useMemo(() => { const r:Record<string,{total:number;pending:number}> = {}; for (const i of stnAllItems) { const proj=(projects as any[]).find(p=>p.id===i.projectId); const reg=proj?.region||'—'; const isPend=i.pmApprovedQty===null||i.pmApprovedQty===undefined; if(!r[reg]) r[reg]={total:0,pending:0}; r[reg].total++; if(isPend) r[reg].pending++; } return r; }, [stnAllItems, projects]);
  const srnByPM     = useMemo(() => { const r:Record<string,{total:number;pending:number}> = {}; for (const proj of srnGrouped) { const pm=proj.pm||'—'; for (const i of proj.srnItems) { const isPend=!i.received; if(!r[pm]) r[pm]={total:0,pending:0}; r[pm].total++; if(isPend) r[pm].pending++; } } return r; }, [srnGrouped]);
  const srnByRegion = useMemo(() => { const r:Record<string,{total:number;pending:number}> = {}; for (const proj of srnGrouped) { const reg=proj.region||'—'; for (const i of proj.srnItems) { const isPend=!i.received; if(!r[reg]) r[reg]={total:0,pending:0}; r[reg].total++; if(isPend) r[reg].pending++; } } return r; }, [srnGrouped]);
  const stnPendingCount = stnAllItems.filter(i => i.pmApprovedQty === null || i.pmApprovedQty === undefined).length;
  const srnPendingCount = srnRawItems.filter((i:any) => !i.received).length;

  // ── Handle card filter click ─────────────────────────────────────────────
  const handleCardClick = (type: string, field: string, value: string) => {
    if (cardFilter?.type===type && cardFilter?.field===field && cardFilter?.value===value) {
      setCardFilter(null); setShowSRN(true); setShowSTN(true);
    } else {
      setCardFilter({ type, field, value });
      setShowSRN(type === 'srn');
      setShowSTN(type === 'stn');
    }
  };
  const clearCardFilter = () => { setCardFilter(null); setShowSRN(true); setShowSTN(true); };

  // ── Combined project list for display ────────────────────────────────────
  const allProjectIds = useMemo(() => {
    const ids = new Set<string>();
    if (showSRN) srnGrouped.forEach(p => ids.add(p.projectId));
    if (showSTN) stnGrouped.forEach(p => ids.add(p.projectId));
    return Array.from(ids);
  }, [srnGrouped, stnGrouped, showSRN, showSTN]);

  const filteredProjects = useMemo(() => {
    return allProjectIds.map(projectId => {
      const srnProj = srnGrouped.find(p => p.projectId === projectId);
      const stnProj = stnGrouped.find(p => p.projectId === projectId);
      const proj = srnProj || stnProj!;
      return { ...proj, srnItems: srnProj?.srnItems || [], stnItems: stnProj?.stnItems || [] };
    }).filter(proj => {
      // Apply card filter
      if (cardFilter) {
        const val = cardFilter.field === 'pm' ? proj.pm : proj.region;
        if (val !== cardFilter.value) return false;
      }
      // Apply search
      if (!search) return true;
      const s = search.toLowerCase();
      return proj.projectId.toLowerCase().includes(s) ||
             proj.projectName.toLowerCase().includes(s) ||
             proj.poNo.toLowerCase().includes(s) ||
             proj.vendor.toLowerCase().includes(s);
    });
  }, [allProjectIds, srnGrouped, stnGrouped, cardFilter, search]);

  // ── Pagination ───────────────────────────────────────────────────────────
  const PER_PAGE = 20;
  const [page, setPage] = React.useState(1);
  React.useEffect(() => { if (router.isReady) { const p=Number(router.query.page); if(p&&p>0) setPage(p); } }, [router.isReady]);
  React.useEffect(() => { setPage(1); router.replace({query:{...router.query,page:1}},undefined,{shallow:true}); }, [search, cardFilter, showSRN, showSTN]);
  const totalPages = Math.ceil(filteredProjects.length / PER_PAGE);
  const paginated  = filteredProjects.slice((page-1)*PER_PAGE, page*PER_PAGE);
  const isLoading  = loading || projLoading || stnLoading;

  const thS: React.CSSProperties = { padding:'9px 12px', fontSize:10, fontWeight:700, textTransform:'uppercase', color:Theme.primary, background:Theme.primaryLight, textAlign:'left' as const, borderBottom:`2px solid ${Theme.primaryMid}`, whiteSpace:'nowrap' as const };
  const tdS: React.CSSProperties = { padding:'10px 12px', fontSize:12, borderBottom:`1px solid ${Theme.border}`, verticalAlign:'middle' as const };

  // ── Breakdown table component ─────────────────────────────────────────────
  const BreakdownTable = ({ data, color, type, field }: { data:Record<string,{total:number;pending:number}>; color:string; type:string; field:string }) => (
    <table style={{ width:'100%', borderCollapse:'collapse' as const, fontSize:11 }}>
      <thead>
        <tr>
          <th style={{ textAlign:'left' as const, padding:'4px 6px', color:Theme.textMuted, fontWeight:600, borderBottom:`1px solid ${Theme.border}` }}>Name</th>
          <th style={{ textAlign:'right' as const, padding:'4px 6px', color:Theme.textMuted, fontWeight:600, borderBottom:`1px solid ${Theme.border}` }}>Total</th>
          <th style={{ textAlign:'right' as const, padding:'4px 6px', color:Theme.textMuted, fontWeight:600, borderBottom:`1px solid ${Theme.border}` }}>Pending</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(data).sort((a,b)=>b[1].pending-a[1].pending).map(([name,v])=>{
          const isActive = cardFilter?.type===type && cardFilter?.field===field && cardFilter?.value===name;
          return (
            <tr key={name} onClick={()=>handleCardClick(type, field, name)}
              style={{ cursor:'pointer', background:isActive?`${color}15`:'transparent', transition:'background 0.1s' }}
              onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background=`${color}10`}
              onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background=isActive?`${color}15`:'transparent'}>
              <td style={{ padding:'4px 6px', color:isActive?color:Theme.text, fontWeight:isActive?700:500 }}>{name}{isActive?' ●':''}</td>
              <td style={{ padding:'4px 6px', textAlign:'right' as const, color:Theme.textMuted }}>{v.total}</td>
              <td style={{ padding:'4px 6px', textAlign:'right' as const, fontWeight:700, color:v.pending>0?color:Theme.textMuted }}>{v.pending}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <Layout>
      <div className="fade-in">
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <div style={{ fontSize:22, fontWeight:800, color:Theme.text }}>STN / SRN Status</div>
            <div style={{ fontSize:13, color:Theme.textMuted, marginTop:2 }}>
              {isLoading ? 'Loading...' : `${filteredProjects.length} projects · ${stnAllItems.length} STN items · ${srnRawItems.length} SRN items`}
            </div>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search project, vendor, PO…"
            style={{ border:`1px solid ${Theme.border}`, borderRadius:8, padding:'8px 14px', fontSize:13, outline:'none', width:260 }} />
        </div>

        {/* KPI Cards */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
          {/* STN Card */}
          <div style={{ ...card, padding:'18px 20px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
              <span style={{ fontSize:18 }}>📦</span>
              <span style={{ fontSize:14, fontWeight:700, color:Theme.primary }}>STN — Store Transfer Note</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
              <div style={{ background:Theme.primaryLight, borderRadius:8, padding:'10px 14px' }}>
                <div style={{ fontSize:10, fontWeight:600, color:Theme.textMuted, textTransform:'uppercase' as const, marginBottom:4 }}>Total Items</div>
                <div style={{ fontSize:24, fontWeight:800, color:Theme.primary }}>{stnAllItems.length}</div>
              </div>
              <div style={{ background:'#FFFBEB', borderRadius:8, padding:'10px 14px' }}>
                <div style={{ fontSize:10, fontWeight:600, color:'#92400E', textTransform:'uppercase' as const, marginBottom:4 }}>Pending PM Approval</div>
                <div style={{ fontSize:24, fontWeight:800, color:'#D97706' }}>{stnPendingCount}</div>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:Theme.textMuted, textTransform:'uppercase' as const, marginBottom:6 }}>By PM</div>
                <BreakdownTable data={stnByPM} color="#D97706" type="stn" field="pm" />
              </div>
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:Theme.textMuted, textTransform:'uppercase' as const, marginBottom:6 }}>By Region</div>
                <BreakdownTable data={stnByRegion} color="#D97706" type="stn" field="region" />
              </div>
            </div>
          </div>

          {/* SRN Card */}
          <div style={{ ...card, padding:'18px 20px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
              <span style={{ fontSize:18 }}>🔄</span>
              <span style={{ fontSize:14, fontWeight:700, color:Theme.primary }}>SRN — Store Return Note</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
              <div style={{ background:Theme.primaryLight, borderRadius:8, padding:'10px 14px' }}>
                <div style={{ fontSize:10, fontWeight:600, color:Theme.textMuted, textTransform:'uppercase' as const, marginBottom:4 }}>Total Items</div>
                <div style={{ fontSize:24, fontWeight:800, color:Theme.primary }}>{srnRawItems.length}</div>
              </div>
              <div style={{ background:'#FEF2F2', borderRadius:8, padding:'10px 14px' }}>
                <div style={{ fontSize:10, fontWeight:600, color:'#991B1B', textTransform:'uppercase' as const, marginBottom:4 }}>Pending PM Approval</div>
                <div style={{ fontSize:24, fontWeight:800, color:'#DC2626' }}>{srnPendingCount}</div>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:Theme.textMuted, textTransform:'uppercase' as const, marginBottom:6 }}>By PM</div>
                <BreakdownTable data={srnByPM} color="#DC2626" type="srn" field="pm" />
              </div>
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:Theme.textMuted, textTransform:'uppercase' as const, marginBottom:6 }}>By Region</div>
                <BreakdownTable data={srnByRegion} color="#DC2626" type="srn" field="region" />
              </div>
            </div>
          </div>
        </div>

        {/* Toggle bar */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div style={{ fontSize:13, color:Theme.textMuted }}>
            {filteredProjects.length} project{filteredProjects.length!==1?'s':''}
            {cardFilter && (
              <span style={{ marginLeft:10, background:Theme.primaryLight, color:Theme.primary,
                fontSize:11, fontWeight:600, padding:'2px 10px', borderRadius:20 }}>
                {cardFilter.type.toUpperCase()} · {cardFilter.field}: {cardFilter.value}
                <span onClick={clearCardFilter}
                  style={{ marginLeft:6, cursor:'pointer', color:'#DC2626', fontWeight:700 }}>✕</span>
              </span>
            )}
          </div>
          <div style={{ display:'flex', gap:16, alignItems:'center' }}>
            <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, fontWeight:600,
              color:showSTN?Theme.primary:Theme.textMuted, cursor:cardFilter?'not-allowed':'pointer',
              opacity:cardFilter?0.5:1 }}>
              <input type="checkbox" checked={showSTN} disabled={!!cardFilter}
                onChange={e=>setShowSTN(e.target.checked)}
                style={{ accentColor:Theme.primary, width:15, height:15 }} />
              📦 STN
            </label>
            <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, fontWeight:600,
              color:showSRN?'#DC2626':Theme.textMuted, cursor:cardFilter?'not-allowed':'pointer',
              opacity:cardFilter?0.5:1 }}>
              <input type="checkbox" checked={showSRN} disabled={!!cardFilter}
                onChange={e=>setShowSRN(e.target.checked)}
                style={{ accentColor:'#DC2626', width:15, height:15 }} />
              🔄 SRN
            </label>
          </div>
        </div>

        {isLoading && <div style={{ ...card, textAlign:'center', padding:40, color:Theme.textMuted }}>Loading data...</div>}

        {!isLoading && filteredProjects.length === 0 && (
          <div style={{ ...card, textAlign:'center', padding:40, color:Theme.textMuted }}>
            No records found.
          </div>
        )}

        {!isLoading && paginated.map((project: any) => {
          const srnItems = project.srnItems || [];
          const stnItems = project.stnItems || [];
          const srnReceived = srnItems.filter((i:any)=>i.received===true).length;
          const stnApproved = stnItems.filter((i:any)=>i.pmApprovedQty!==null&&i.pmApprovedQty!==undefined).length;
          const srnAllDone  = srnItems.length > 0 && srnItems.every((i:any)=>i.received===true);
          const stnAllDone  = stnItems.length > 0 && stnItems.every((i:any)=>i.pmApprovedQty!==null&&i.pmApprovedQty!==undefined);

          return (
            <div key={project.projectId} style={{ ...card, marginBottom:12, padding:0, overflow:'hidden' }}>
              {/* Project header */}
              <div style={{ padding:'14px 18px', background:Theme.surface, borderBottom:`1px solid ${Theme.border}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:4 }}>
                      <Link href={`/projects/${project.projectId}`}
                        style={{ fontWeight:700, color:Theme.primary, fontSize:14, textDecoration:'none' }}>
                        {project.projectId}
                      </Link>
                      <span style={{ fontSize:12, color:Theme.textMuted }}>{project.poNo}</span>
                    </div>
                    <div style={{ fontSize:14, fontWeight:600, color:Theme.text }}>{project.projectName}</div>
                    {showVendor && <div style={{ fontSize:12, color:Theme.textMuted, marginTop:2 }}>Vendor: {project.vendor} · PM: {project.pm} · Region: {project.region}</div>}
                  </div>
                  <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                    {showSTN && stnItems.length > 0 && <span style={{ fontSize:11, fontWeight:700, color:stnAllDone?'#0D9488':'#D97706', background:stnAllDone?'#F0FDFA':'#FFFBEB', padding:'3px 10px', borderRadius:20 }}>📦 STN: {stnApproved}/{stnItems.length}</span>}
                    {showSRN && srnItems.length > 0 && <span style={{ fontSize:11, fontWeight:700, color:srnAllDone?'#0D9488':'#DC2626', background:srnAllDone?'#F0FDFA':'#FEF2F2', padding:'3px 10px', borderRadius:20 }}>🔄 SRN: {srnReceived}/{srnItems.length}</span>}
                  </div>
                </div>
              </div>

              {/* STN Section */}
              {showSTN && stnItems.length > 0 && (
                <div style={{ borderBottom:`1px solid ${Theme.border}` }}>
                  <div onClick={()=>setExpandedSTN(expandedSTN===project.projectId?null:project.projectId)}
                    style={{ padding:'10px 18px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center',
                      background:expandedSTN===project.projectId?'#FFFBEB':'#FAFAFA' }}>
                    <span style={{ fontSize:12, fontWeight:700, color:'#D97706' }}>📦 STN Items ({stnItems.length})</span>
                    <span style={{ color:Theme.textMuted, fontSize:14 }}>{expandedSTN===project.projectId?'▲':'▼'}</span>
                  </div>
                  {expandedSTN === project.projectId && (
                    <div style={{ overflowX:'auto' as const }}>
                      <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
                        <thead>
                          <tr>{['#','Description','UOM','Qty','Rate','GST%','Amount','Utilised Qty','PM Approved Qty','Status'].map((h,i)=>(
                            <th key={i} style={{ ...thS }}>{h}</th>
                          ))}</tr>
                        </thead>
                        <tbody>
                          {stnItems.map((m:any, idx:number)=>(
                            <tr key={m.id} style={{ background:idx%2===0?'#fff':'#FFFBEB' }}>
                              <td style={tdS}>{idx+1}</td>
                              <td style={{ ...tdS, fontWeight:600 }}>{m.description}</td>
                              <td style={tdS}>{m.uom||'—'}</td>
                              <td style={tdS}>{m.quantity||'—'}</td>
                              <td style={tdS}>{m.rate||'—'}</td>
                              <td style={tdS}>{m.gstRate}%</td>
                              <td style={{ ...tdS, fontWeight:600 }}>{Number(m.amount||0).toLocaleString('en-IN')}</td>
                              <td style={tdS}>{m.utilisedQty??'—'}</td>
                              <td style={{ ...tdS, fontWeight:700, color:m.pmApprovedQty!=null&&m.pmApprovedQty>0?'#0D9488':m.pmApprovedQty===0?'#DC2626':'#D97706' }}>{m.pmApprovedQty!=null&&m.pmApprovedQty>0?m.pmApprovedQty:m.pmApprovedQty===0?'Rejected':'Pending'}</td>
                              <td style={tdS}>
                                <span style={{ fontSize:11, fontWeight:700,
                                  color:m.pmApprovedQty!=null&&m.pmApprovedQty>0?'#0D9488':m.pmApprovedQty===0?'#DC2626':'#D97706',
                                  background:m.pmApprovedQty!=null&&m.pmApprovedQty>0?'#F0FDFA':m.pmApprovedQty===0?'#FEF2F2':'#FFFBEB',
                                  padding:'2px 8px', borderRadius:20 }}>
                                  {m.pmApprovedQty!=null&&m.pmApprovedQty>0?'✓ Approved':m.pmApprovedQty===0?'✗ Rejected':'⏳ Pending'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* SRN Section */}
              {showSRN && srnItems.length > 0 && (
                <div>
                  <div onClick={()=>setExpandedSRN(expandedSRN===project.projectId?null:project.projectId)}
                    style={{ padding:'10px 18px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center',
                      background:expandedSRN===project.projectId?'#FEF2F2':'#FAFAFA' }}>
                    <span style={{ fontSize:12, fontWeight:700, color:'#DC2626' }}>🔄 SRN Items ({srnItems.length})</span>
                    <span style={{ color:Theme.textMuted, fontSize:14 }}>{expandedSRN===project.projectId?'▲':'▼'}</span>
                  </div>
                  {expandedSRN === project.projectId && (
                    <div style={{ overflowX:'auto' as const }}>
                      <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
                        <thead>
                          <tr>{['#','Description','HSN','UOM','Qty','Rate','GST%','Amount','Serial No','Doc No','BOQ Req','Return Qty','Return Date','Received','Action'].map((h,i)=>(
                            <th key={i} style={{ ...thS }}>{h}</th>
                          ))}</tr>
                        </thead>
                        <tbody>
                          {srnItems.map((m:any, idx:number)=>(
                            <tr key={m.id} style={{ background:idx%2===0?'#fff':Theme.bg }}>
                              <td style={{ ...tdS, color:Theme.textMuted }}>{idx+1}</td>
                              <td style={{ ...tdS, fontWeight:600 }}>{m.description}</td>
                              <td style={{ ...tdS, color:Theme.textMuted }}>{m.hsn_code||'—'}</td>
                              <td style={{ ...tdS, color:Theme.textMuted }}>{m.uom||'—'}</td>
                              <td style={{ ...tdS, textAlign:'right' as const }}>{m.quantity||'—'}</td>
                              <td style={{ ...tdS, textAlign:'right' as const }}>{m.rate||'—'}</td>
                              <td style={{ ...tdS, textAlign:'right' as const }}>{m.gst_rate}%</td>
                              <td style={{ ...tdS, textAlign:'right' as const, fontWeight:600 }}>{Number(m.amount||0).toLocaleString('en-IN')}</td>
                              <td style={{ ...tdS, color:Theme.textMuted }}>{m.serial_no||'—'}</td>
                              <td style={{ ...tdS, color:Theme.textMuted }}>{m.document_no||'—'}</td>
                              <td style={{ ...tdS, color:Theme.textMuted }}>{m.boq_req_no||'—'}</td>
                              <td style={{ ...tdS, fontWeight:600, color:Theme.primary }}>{m.return_qty||'—'}</td>
                              <td style={{ ...tdS, color:Theme.textMuted, whiteSpace:'nowrap' as const }}>
                                {m.return_date ? new Date(m.return_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'}
                              </td>
                              <td style={tdS}>
                                {m.received
                                  ? <span style={{ fontSize:11, fontWeight:700, color:'#0D9488', background:'#F0FDFA', padding:'2px 10px', borderRadius:20 }}>✓ Yes</span>
                                  : <span style={{ fontSize:11, fontWeight:700, color:'#DC2626', background:'#FEF2F2', padding:'2px 10px', borderRadius:20 }}>✗ No</span>}
                              </td>
                              <td style={{ ...tdS, whiteSpace:'nowrap' as const }}>
                                {isPM && !m.received && (
                                  <div style={{ display:'flex', gap:4 }}>
                                    <button onClick={()=>markReceived(m, true)} disabled={saving===m.id}
                                      style={{ background:'#0D9488', color:'#fff', border:'none', borderRadius:6, padding:'4px 10px', fontSize:11, cursor:'pointer', fontWeight:600 }}>✓ Yes</button>
                                    <button onClick={()=>markReceived(m, false)} disabled={saving===m.id}
                                      style={{ background:'#DC2626', color:'#fff', border:'none', borderRadius:6, padding:'4px 10px', fontSize:11, cursor:'pointer', fontWeight:600 }}>✗ No</button>
                                  </div>
                                )}
                                {m.received && <span style={{ fontSize:11, color:'#0D9488', fontWeight:700 }}>✓ Done</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:16, padding:'10px 4px' }}>
            <div style={{ fontSize:12, color:'#6B7280' }}>
              Showing {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE, filteredProjects.length)} of {filteredProjects.length} projects
            </div>
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              <button onClick={()=>{ const n=Math.max(1,page-1); setPage(n); router.push({query:{...router.query,page:n}},undefined,{shallow:true}); }} disabled={page===1}
                style={{ padding:'5px 12px', borderRadius:6, border:`1px solid #E5E7EB`, background:'#fff', cursor:page===1?'not-allowed':'pointer', fontSize:12, color:page===1?'#9CA3AF':'#374151', opacity:page===1?0.5:1 }}>← Prev</button>
              {Array.from({length:totalPages},(_,i)=>i+1).filter(n=>n===1||n===totalPages||Math.abs(n-page)<=1).reduce((acc:number[],n,i,arr)=>{ if(i>0&&n-arr[i-1]>1) acc.push(-1); acc.push(n); return acc; },[] as number[]).map((n,i)=>
                n===-1
                  ? <span key={`e${i}`} style={{ fontSize:12, color:'#9CA3AF', padding:'0 4px' }}>…</span>
                  : <button key={n} onClick={()=>{ setPage(n); router.push({query:{...router.query,page:n}},undefined,{shallow:true}); }}
                      style={{ padding:'5px 10px', borderRadius:6, border:`1px solid ${page===n?'#0D9488':'#E5E7EB'}`, background:page===n?'#0D9488':'#fff', color:page===n?'#fff':'#374151', cursor:'pointer', fontSize:12, fontWeight:page===n?700:400, minWidth:32 }}>{n}</button>
              )}
              <button onClick={()=>{ const n=Math.min(totalPages,page+1); setPage(n); router.push({query:{...router.query,page:n}},undefined,{shallow:true}); }} disabled={page===totalPages}
                style={{ padding:'5px 12px', borderRadius:6, border:`1px solid #E5E7EB`, background:'#fff', cursor:page===totalPages?'not-allowed':'pointer', fontSize:12, color:page===totalPages?'#9CA3AF':'#374151', opacity:page===totalPages?0.5:1 }}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
