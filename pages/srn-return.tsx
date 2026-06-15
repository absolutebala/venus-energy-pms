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
  const [commentPopup, setCommentPopup] = useState<{text:string;title:string}|null>(null);
  const [srnRejectTarget, setSrnRejectTarget] = useState<any>(null);
  const [srnRejectComment, setSrnRejectComment] = useState('');

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
    if (!received) { setSrnRejectTarget(item); setSrnRejectComment(''); return; }
    setSaving(item.id);
    try {
      const { error } = await sb.from('srn').update({ received: true, pm_comment: null }).eq('id', item.id);
      if (error) throw new Error(error.message);
      setSrnRawItems(prev => prev.map((i:any) => i.id === item.id ? { ...i, received: true, pm_comment: null } : i));
    } catch(err) { console.error(err); }
    finally { setSaving(null); }
  };

  const confirmSrnReject = async () => {
    if (!srnRejectTarget) return;
    if (!srnRejectComment.trim()) return;
    setSaving(srnRejectTarget.id);
    try {
      const { error } = await sb.from('srn').update({ received: false, pm_comment: srnRejectComment.trim() }).eq('id', srnRejectTarget.id);
      if (error) throw new Error(error.message);
      setSrnRawItems(prev => prev.map((i:any) => i.id === srnRejectTarget.id ? { ...i, received: false, pm_comment: srnRejectComment.trim() } : i));
      setSrnRejectTarget(null); setSrnRejectComment('');
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
  const [kpiSubFilter, setKpiSubFilter] = useState<{type:string;status:string}|null>(null);
  const [statusDistFilter, setStatusDistFilter] = useState<{type:string;value:string}|null>(null);
  const [agingDistFilter,  setAgingDistFilter]  = useState<{type:string;bucket:string}|null>(null);
  const toggleKpiSub = (type: string, status: string) => {
    if (kpiSubFilter?.type===type && kpiSubFilter?.status===status) {
      setKpiSubFilter(null);
    } else {
      setKpiSubFilter({ type, status });
      setCardFilter(null); setShowSRN(true); setShowSTN(true); // clear PM/Region filter
    }
  };

  const stnByPM = useMemo(() => {
    const r:Record<string,{total:number;pending:number}> = {};
    const filtered = kpiSubFilter?.type==='stn'
      ? stnAllItems.filter(i => kpiSubFilter.status==='pm_rejected' ? i.utilisedStatus==='pm_rejected' : i.utilisedStatus!=='pm_approved')
      : stnAllItems;
    for (const i of filtered) {
      const proj=(projects as any[]).find(p=>p.id===i.projectId); const pm=proj?.pm||'—';
      const isPend=i.utilisedStatus!=='pm_approved'; if(!r[pm]) r[pm]={total:0,pending:0}; r[pm].total++; if(isPend) r[pm].pending++;
    } return r;
  }, [stnAllItems, projects, kpiSubFilter]);

  const stnByRegion = useMemo(() => {
    const r:Record<string,{total:number;pending:number}> = {};
    const filtered = kpiSubFilter?.type==='stn'
      ? stnAllItems.filter(i => kpiSubFilter.status==='pm_rejected' ? i.utilisedStatus==='pm_rejected' : i.utilisedStatus!=='pm_approved')
      : stnAllItems;
    for (const i of filtered) {
      const proj=(projects as any[]).find(p=>p.id===i.projectId); const reg=proj?.region||'—';
      const isPend=i.utilisedStatus!=='pm_approved'; if(!r[reg]) r[reg]={total:0,pending:0}; r[reg].total++; if(isPend) r[reg].pending++;
    } return r;
  }, [stnAllItems, projects, kpiSubFilter]);

  const srnByPM = useMemo(() => {
    const r:Record<string,{total:number;pending:number}> = {};
    for (const proj of srnGrouped) {
      const pm=proj.pm||'—';
      const items = kpiSubFilter?.type==='srn'
        ? proj.srnItems.filter((i:any) => kpiSubFilter.status==='rejected' ? (i.received===false&&i.pm_comment) : !i.received)
        : proj.srnItems;
      for (const i of items) { const isPend=!i.received; if(!r[pm]) r[pm]={total:0,pending:0}; r[pm].total++; if(isPend) r[pm].pending++; }
    } return r;
  }, [srnGrouped, kpiSubFilter]);

  const srnByRegion = useMemo(() => {
    const r:Record<string,{total:number;pending:number}> = {};
    for (const proj of srnGrouped) {
      const reg=proj.region||'—';
      const items = kpiSubFilter?.type==='srn'
        ? proj.srnItems.filter((i:any) => kpiSubFilter.status==='rejected' ? (i.received===false&&i.pm_comment) : !i.received)
        : proj.srnItems;
      for (const i of items) { const isPend=!i.received; if(!r[reg]) r[reg]={total:0,pending:0}; r[reg].total++; if(isPend) r[reg].pending++; }
    } return r;
  }, [srnGrouped, kpiSubFilter]);
  const stnPendingCount  = stnAllItems.filter(i => i.utilisedStatus !== 'pm_approved').length;
  const stnRejectedCount = stnAllItems.filter(i => i.utilisedStatus === 'pm_rejected').length;
  const srnPendingCount  = srnRawItems.filter((i:any) => !i.received).length;
  const srnRejectedCount = srnRawItems.filter((i:any) => i.received === false && i.pm_comment).length;


  // ── Handle card filter click ─────────────────────────────────────────────
  const handleCardClick = (type: string, field: string, value: string) => {
    if (cardFilter?.type===type && cardFilter?.field===field && cardFilter?.value===value) {
      setCardFilter(null); setShowSRN(true); setShowSTN(true);
    } else {
      setCardFilter({ type, field, value });
      setShowSRN(type === 'srn');
      setShowSTN(type === 'stn');
      setKpiSubFilter(null); // clear rejected/pending filter when switching to PM/Region filter
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
      // Apply statusDistFilter
      if (statusDistFilter) {
        const proj0 = (projects as any[]).find(p => p.id === proj.projectId);
        const ps = proj0?.projectStatus || 'Not Set';
        if (statusDistFilter.type === 'stn' && proj.stnItems.length === 0) return false;
        if (statusDistFilter.type === 'srn' && proj.srnItems.length === 0) return false;
        if (ps !== statusDistFilter.value) return false;
      }
      // Apply agingDistFilter
      if (agingDistFilter) {
        const proj0 = (projects as any[]).find(p => p.id === proj.projectId);
        const aging = (proj0 as any)?.aging || 0;
        const bucket = agingDistFilter.bucket;
        if (agingDistFilter.type === 'stn' && proj.stnItems.length === 0) return false;
        if (agingDistFilter.type === 'srn' && proj.srnItems.length === 0) return false;
        if (bucket === '0-30' && !(aging <= 30)) return false;
        if (bucket === '31-60' && !(aging > 30 && aging <= 60)) return false;
        if (bucket === '61-90' && !(aging > 60 && aging <= 90)) return false;
        if (bucket === '90+' && !(aging > 90)) return false;
      }
      // Apply kpiSubFilter
      if (kpiSubFilter) {
        if (kpiSubFilter.type === 'stn') {
          const match = proj.stnItems.some((i:any) =>
            kpiSubFilter.status === 'pm_rejected' ? i.utilisedStatus === 'pm_rejected' : i.utilisedStatus !== 'pm_approved'
          );
          if (!match) return false;
        } else {
          const match = proj.srnItems.some((i:any) =>
            kpiSubFilter.status === 'rejected' ? (i.received === false && i.pm_comment) : !i.received
          );
          if (!match) return false;
        }
      }
      // Apply search
      if (!search) return true;
      const s = search.toLowerCase();
      return proj.projectId.toLowerCase().includes(s) ||
             proj.projectName.toLowerCase().includes(s) ||
             proj.poNo.toLowerCase().includes(s) ||
             proj.vendor.toLowerCase().includes(s);
    });
  }, [allProjectIds, srnGrouped, stnGrouped, cardFilter, search, kpiSubFilter, statusDistFilter, agingDistFilter, projects]);

  // ── Pagination ───────────────────────────────────────────────────────────
  const PER_PAGE = 10;
  const [page, setPage] = React.useState(1);
  React.useEffect(() => {
    if (!router.isReady) return;
    const hasQuery = Object.keys(router.query).length > 0;
    const saved = !hasQuery ? sessionStorage.getItem('srnFilters') : null;
    if (saved) {
      const params = Object.fromEntries(new URLSearchParams(saved));
      sessionStorage.removeItem('srnFilters');
      if (params.search) setSearch(params.search);
      if (params.page) setPage(Number(params.page));
    } else {
      const p = Number(router.query.page); if(p&&p>0) setPage(p);
    }
  }, [router.isReady]);
  React.useEffect(() => { setPage(1); router.replace({query:{...router.query,page:1}},undefined,{shallow:true}); }, [search, cardFilter, showSRN, showSTN, kpiSubFilter, statusDistFilter, agingDistFilter]);
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
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:16 }}>
              <div style={{ background:Theme.primaryLight, borderRadius:8, padding:'10px 14px' }}>
                <div style={{ fontSize:10, fontWeight:600, color:Theme.textMuted, textTransform:'uppercase' as const, marginBottom:4 }}>Total Items</div>
                <div style={{ fontSize:24, fontWeight:800, color:Theme.primary }}>{stnAllItems.length}</div>
              </div>
              <div onClick={()=>toggleKpiSub('stn','pm_rejected')} style={{ background:kpiSubFilter?.type==='stn'&&kpiSubFilter?.status==='pm_rejected'?'#FEE2E2':'#FEF2F2', borderRadius:8, padding:'10px 14px', cursor:'pointer',
                border:kpiSubFilter?.type==='stn'&&kpiSubFilter?.status==='pm_rejected'?'2px solid #DC2626':'2px solid transparent', transition:'all 0.15s' }}>
                <div style={{ fontSize:10, fontWeight:600, color:'#991B1B', textTransform:'uppercase' as const, marginBottom:4 }}>✗ Rejected by PM</div>
                <div style={{ fontSize:24, fontWeight:800, color:'#DC2626' }}>{stnRejectedCount}</div>
                {kpiSubFilter?.type==='stn'&&kpiSubFilter?.status==='pm_rejected' && <div style={{ fontSize:10, color:'#DC2626', marginTop:2 }}>● Filtered</div>}
              </div>
              <div onClick={()=>toggleKpiSub('stn','pending_approval')} style={{ background:kpiSubFilter?.type==='stn'&&kpiSubFilter?.status==='pending_approval'?'#FEF3C7':'#FFFBEB', borderRadius:8, padding:'10px 14px', cursor:'pointer',
                border:kpiSubFilter?.type==='stn'&&kpiSubFilter?.status==='pending_approval'?'2px solid #D97706':'2px solid transparent', transition:'all 0.15s' }}>
                <div style={{ fontSize:10, fontWeight:600, color:'#92400E', textTransform:'uppercase' as const, marginBottom:4 }}>⏳ Pending Approval</div>
                <div style={{ fontSize:24, fontWeight:800, color:'#D97706' }}>{stnPendingCount}</div>
                {kpiSubFilter?.type==='stn'&&kpiSubFilter?.status==='pending_approval' && <div style={{ fontSize:10, color:'#D97706', marginTop:2 }}>● Filtered</div>}
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
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:16 }}>
              <div style={{ background:Theme.primaryLight, borderRadius:8, padding:'10px 14px' }}>
                <div style={{ fontSize:10, fontWeight:600, color:Theme.textMuted, textTransform:'uppercase' as const, marginBottom:4 }}>Total Items</div>
                <div style={{ fontSize:24, fontWeight:800, color:Theme.primary }}>{srnRawItems.length}</div>
              </div>
              <div onClick={()=>toggleKpiSub('srn','rejected')} style={{ background:kpiSubFilter?.type==='srn'&&kpiSubFilter?.status==='rejected'?'#FEE2E2':'#FEF2F2', borderRadius:8, padding:'10px 14px', cursor:'pointer',
                border:kpiSubFilter?.type==='srn'&&kpiSubFilter?.status==='rejected'?'2px solid #DC2626':'2px solid transparent', transition:'all 0.15s' }}>
                <div style={{ fontSize:10, fontWeight:600, color:'#991B1B', textTransform:'uppercase' as const, marginBottom:4 }}>✗ Rejected by PM</div>
                <div style={{ fontSize:24, fontWeight:800, color:'#DC2626' }}>{srnRejectedCount}</div>
                {kpiSubFilter?.type==='srn'&&kpiSubFilter?.status==='rejected' && <div style={{ fontSize:10, color:'#DC2626', marginTop:2 }}>● Filtered</div>}
              </div>
              <div onClick={()=>toggleKpiSub('srn','pending')} style={{ background:kpiSubFilter?.type==='srn'&&kpiSubFilter?.status==='pending'?'#FEF3C7':'#FFFBEB', borderRadius:8, padding:'10px 14px', cursor:'pointer',
                border:kpiSubFilter?.type==='srn'&&kpiSubFilter?.status==='pending'?'2px solid #D97706':'2px solid transparent', transition:'all 0.15s' }}>
                <div style={{ fontSize:10, fontWeight:600, color:'#92400E', textTransform:'uppercase' as const, marginBottom:4 }}>⏳ Pending Approval</div>
                <div style={{ fontSize:24, fontWeight:800, color:'#D97706' }}>{srnPendingCount}</div>
                {kpiSubFilter?.type==='srn'&&kpiSubFilter?.status==='pending' && <div style={{ fontSize:10, color:'#D97706', marginTop:2 }}>● Filtered</div>}
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

        {/* Project Status + Aging Distribution Cards */}
        {!isLoading && (() => {
          const agingBuckets = [
            { label:'0–30d', bucket:'0-30', color:'#0D9488', fn:(p:any)=>(p?.aging||0)<=30 },
            { label:'31–60d', bucket:'31-60', color:'#D97706', fn:(p:any)=>(p?.aging||0)>30&&(p?.aging||0)<=60 },
            { label:'61–90d', bucket:'61-90', color:'#DC2626', fn:(p:any)=>(p?.aging||0)>60&&(p?.aging||0)<=90 },
            { label:'90d+', bucket:'90+', color:'#7C3AED', fn:(p:any)=>(p?.aging||0)>90 },
          ];
          const statusColors: Record<string,string> = { 'Work Completed':'#16A34A','WCC Raised':'#0D9488','Invoice Submitted':'#2563EB','PO Amendment Done':'#7C3AED','Not Started':'#6B7280','In Progress':'#D97706','Delayed':'#DC2626' };

          // STN projects
          const stnProjects = stnGrouped.map(g => (projects as any[]).find(p => p.id === g.projectId)).filter(Boolean);
          const srnProjects = srnGrouped.map(g => (projects as any[]).find(p => p.id === g.projectId)).filter(Boolean);

          const stnStatusGroups: Record<string,number> = {};
          stnProjects.forEach((p:any) => { const s=p.projectStatus||'Not Set'; stnStatusGroups[s]=(stnStatusGroups[s]||0)+1; });
          const srnStatusGroups: Record<string,number> = {};
          srnProjects.forEach((p:any) => { const s=p.projectStatus||'Not Set'; srnStatusGroups[s]=(srnStatusGroups[s]||0)+1; });

          return (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:14, marginBottom:20 }}>
              {/* STN Status Distribution */}
              <div style={{ ...card, padding:'16px 18px' }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#D97706', marginBottom:12 }}>
                  📦 STN — Project Status
                  {statusDistFilter?.type==='stn' && <span onClick={()=>setStatusDistFilter(null)} style={{ marginLeft:6, fontSize:10, color:'#DC2626', cursor:'pointer' }}>✕</span>}
                </div>
                {Object.entries(stnStatusGroups).sort((a,b)=>b[1]-a[1]).map(([s,n])=>{
                  const c2=statusColors[s]||'#6B7280'; const pct=Math.round(n/(stnProjects.length||1)*100);
                  const isActive=statusDistFilter?.type==='stn'&&statusDistFilter?.value===s;
                  return (
                    <div key={s} onClick={()=>setStatusDistFilter(isActive?null:{type:'stn',value:s})} style={{ marginBottom:8, cursor:'pointer', opacity:statusDistFilter?.type==='stn'&&!isActive?0.5:1 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                        <span style={{ fontSize:11, color:isActive?c2:Theme.text, fontWeight:isActive?700:400 }}>{s}</span>
                        <span style={{ fontSize:11, fontWeight:700, color:c2 }}>{n}</span>
                      </div>
                      <div style={{ height:4, background:Theme.border, borderRadius:2 }}>
                        <div style={{ height:4, width:`${pct}%`, background:c2, borderRadius:2 }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* STN Aging Distribution */}
              <div style={{ ...card, padding:'16px 18px' }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#D97706', marginBottom:12 }}>
                  📦 STN — Aging
                  {agingDistFilter?.type==='stn' && <span onClick={()=>setAgingDistFilter(null)} style={{ marginLeft:6, fontSize:10, color:'#DC2626', cursor:'pointer' }}>✕</span>}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {agingBuckets.map(b=>{
                    const n=stnProjects.filter(b.fn).length; const isActive=agingDistFilter?.type==='stn'&&agingDistFilter?.bucket===b.bucket;
                    return (
                      <div key={b.label} onClick={()=>setAgingDistFilter(isActive?null:{type:'stn',bucket:b.bucket})}
                        style={{ background:isActive?`${b.color}15`:Theme.bg, border:`2px solid ${isActive?b.color:Theme.border}`,
                          borderRadius:8, padding:'10px 12px', cursor:'pointer', opacity:agingDistFilter?.type==='stn'&&!isActive?0.5:1 }}>
                        <div style={{ fontSize:9, fontWeight:600, color:b.color, textTransform:'uppercase' as const, marginBottom:2 }}>{b.label}</div>
                        <div style={{ fontSize:20, fontWeight:800, color:b.color }}>{n}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SRN Status Distribution */}
              <div style={{ ...card, padding:'16px 18px' }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#DC2626', marginBottom:12 }}>
                  🔄 SRN — Project Status
                  {statusDistFilter?.type==='srn' && <span onClick={()=>setStatusDistFilter(null)} style={{ marginLeft:6, fontSize:10, color:'#DC2626', cursor:'pointer' }}>✕</span>}
                </div>
                {Object.entries(srnStatusGroups).sort((a,b)=>b[1]-a[1]).map(([s,n])=>{
                  const c2=statusColors[s]||'#6B7280'; const pct=Math.round(n/(srnProjects.length||1)*100);
                  const isActive=statusDistFilter?.type==='srn'&&statusDistFilter?.value===s;
                  return (
                    <div key={s} onClick={()=>setStatusDistFilter(isActive?null:{type:'srn',value:s})} style={{ marginBottom:8, cursor:'pointer', opacity:statusDistFilter?.type==='srn'&&!isActive?0.5:1 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                        <span style={{ fontSize:11, color:isActive?c2:Theme.text, fontWeight:isActive?700:400 }}>{s}</span>
                        <span style={{ fontSize:11, fontWeight:700, color:c2 }}>{n}</span>
                      </div>
                      <div style={{ height:4, background:Theme.border, borderRadius:2 }}>
                        <div style={{ height:4, width:`${pct}%`, background:c2, borderRadius:2 }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* SRN Aging Distribution */}
              <div style={{ ...card, padding:'16px 18px' }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#DC2626', marginBottom:12 }}>
                  🔄 SRN — Aging
                  {agingDistFilter?.type==='srn' && <span onClick={()=>setAgingDistFilter(null)} style={{ marginLeft:6, fontSize:10, color:'#DC2626', cursor:'pointer' }}>✕</span>}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {agingBuckets.map(b=>{
                    const n=srnProjects.filter(b.fn).length; const isActive=agingDistFilter?.type==='srn'&&agingDistFilter?.bucket===b.bucket;
                    return (
                      <div key={b.label} onClick={()=>setAgingDistFilter(isActive?null:{type:'srn',bucket:b.bucket})}
                        style={{ background:isActive?`${b.color}15`:Theme.bg, border:`2px solid ${isActive?b.color:Theme.border}`,
                          borderRadius:8, padding:'10px 12px', cursor:'pointer', opacity:agingDistFilter?.type==='srn'&&!isActive?0.5:1 }}>
                        <div style={{ fontSize:9, fontWeight:600, color:b.color, textTransform:'uppercase' as const, marginBottom:2 }}>{b.label}</div>
                        <div style={{ fontSize:20, fontWeight:800, color:b.color }}>{n}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

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
                          <tr>{['#','Description','UOM','Qty','Rate','GST%','Amount','Utilised Qty','PM Approved Qty','Comments','Status'].map((h,i)=>(
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
                              <td style={{ ...tdS, fontWeight:700, color:m.utilisedStatus==='pm_approved'?'#0D9488':m.utilisedStatus==='pm_rejected'?'#DC2626':'#D97706' }}>{m.utilisedStatus==='pm_approved'?m.pmApprovedQty:m.utilisedStatus==='pm_rejected'?'Rejected':'Pending'}</td>
                              <td style={{ ...tdS, textAlign:'center' as const }}>
                                <span onClick={()=>setCommentPopup({text: m.pmComment||'', title: m.description})}
                                  style={{ fontSize:11, fontWeight:700, cursor:'pointer',
                                    color:m.pmComment?'#7C3AED':'#9CA3AF',
                                    background:m.pmComment?'#F5F3FF':'#F9FAFB',
                                    padding:'2px 10px', borderRadius:20, whiteSpace:'nowrap' as const }}>
                                  {m.pmComment ? '💬 1' : '—'}
                                </span>
                              </td>
                              <td style={tdS}>
                                <span style={{ fontSize:11, fontWeight:700,
                                  color:m.utilisedStatus==='pm_approved'?'#0D9488':m.utilisedStatus==='pm_rejected'?'#DC2626':m.utilisedStatus==='submitted'?'#2563EB':'#D97706',
                                  background:m.utilisedStatus==='pm_approved'?'#F0FDFA':m.utilisedStatus==='pm_rejected'?'#FEF2F2':m.utilisedStatus==='submitted'?'#EFF6FF':'#FFFBEB',
                                  padding:'2px 8px', borderRadius:20 }}>
                                  {m.utilisedStatus==='pm_approved'?'✓ Approved':m.utilisedStatus==='pm_rejected'?'✗ Rejected':m.utilisedStatus==='submitted'?'📤 Submitted':'⏳ Pending'}
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
                          <tr>{['#','Description','HSN','UOM','Qty','Rate','GST%','Amount','Serial No','Doc No','BOQ Req','Return Qty','Return Date','Received','Comments','Action'].map((h,i)=>(
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
                              <td style={{ ...tdS, textAlign:'center' as const }}>
                                <span onClick={()=>setCommentPopup({text: m.pm_comment||'', title: m.description})}
                                  style={{ fontSize:11, fontWeight:700, cursor:'pointer',
                                    color:m.pm_comment?'#7C3AED':'#9CA3AF',
                                    background:m.pm_comment?'#F5F3FF':'#F9FAFB',
                                    padding:'2px 10px', borderRadius:20, whiteSpace:'nowrap' as const }}>
                                  {m.pm_comment ? '💬 1' : '—'}
                                </span>
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

      {/* Comment Popup */}
      {commentPopup && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000,
          display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={()=>setCommentPopup(null)}>
          <div style={{ background:'#fff', borderRadius:14, padding:28, width:440, boxShadow:'0 8px 40px rgba(0,0,0,0.2)' }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize:15, fontWeight:700, color:'#7C3AED', marginBottom:8 }}>💬 PM Comment</div>
            <div style={{ fontSize:13, fontWeight:600, color:'#374151', marginBottom:10 }}>{commentPopup.title}</div>
            {commentPopup.text ? (
              <div style={{ fontSize:13, color:'#DC2626', background:'#FEF2F2', borderRadius:8, padding:'12px 14px', lineHeight:1.6 }}>
                {commentPopup.text}
              </div>
            ) : (
              <div style={{ fontSize:13, color:'#9CA3AF', background:'#F9FAFB', borderRadius:8, padding:'12px 14px' }}>
                No comments yet.
              </div>
            )}
            <div style={{ marginTop:14, textAlign:'right' as const }}>
              <button onClick={()=>setCommentPopup(null)}
                style={{ padding:'7px 18px', borderRadius:8, border:'1px solid #E5E7EB', background:'#fff', cursor:'pointer', fontSize:13 }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* SRN Reject Modal */}
      {srnRejectTarget && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000,
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:14, padding:28, width:420, boxShadow:'0 8px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize:16, fontWeight:700, color:'#DC2626', marginBottom:8 }}>✗ Mark SRN Not Received</div>
            <div style={{ fontSize:13, color:'#374151', marginBottom:12 }}>
              <strong>{srnRejectTarget.description}</strong>
            </div>
            <label style={{ fontSize:11, fontWeight:600, color:'#6B7280', textTransform:'uppercase' as const }}>Comment *</label>
            <textarea value={srnRejectComment} onChange={e=>setSrnRejectComment(e.target.value)}
              placeholder="Enter reason…" rows={3}
              style={{ width:'100%', marginTop:6, marginBottom:14, border:'1.5px solid #E5E7EB', borderRadius:8,
                padding:'8px 10px', fontSize:13, outline:'none', resize:'vertical' as const, boxSizing:'border-box' as const }} />
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={()=>setSrnRejectTarget(null)}
                style={{ padding:'8px 18px', borderRadius:8, border:'1px solid #E5E7EB', background:'#fff', cursor:'pointer', fontSize:13 }}>Cancel</button>
              <button onClick={confirmSrnReject} disabled={!srnRejectComment.trim()}
                style={{ padding:'8px 18px', borderRadius:8, border:'none', background:'#DC2626', color:'#fff',
                  cursor:srnRejectComment.trim()?'pointer':'not-allowed', fontSize:13, fontWeight:600, opacity:srnRejectComment.trim()?1:0.5 }}>
                ✗ Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </Layout>
  );
}
