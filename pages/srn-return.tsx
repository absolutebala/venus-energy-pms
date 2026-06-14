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
  const { items: stnItems, loading: stnLoading } = usePOItems();
  const sb = createClient();

  const [items,      setItems]      = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState<string|null>(null);
  const [search,     setSearch]     = useState('');
  const [kpiFilter,  setKpiFilter]  = useState<string|null>(null);
  const [expandedId, setExpandedId] = useState<string|null>(null);

  const role    = profile?.role || 'viewer';
  const isPM    = ['project_manager','super_admin','region_manager'].includes(role);
  const showVendor = ['super_admin','region_manager','project_manager'].includes(role);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data } = await sb.from('srn').select('*').order('project_id').order('sort_order').order('created_at');
    setItems(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const markReceived = async (item: any, received: boolean) => {
    setSaving(item.id);
    try {
      const { error } = await sb.from('srn').update({ received }).eq('id', item.id);
      if (error) throw new Error(error.message);
      setItems(prev => prev.map((i:any) => i.id === item.id ? { ...i, received } : i));
    } catch(err) { console.error(err); }
    finally { setSaving(null); }
  };

  // Group by project
  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const item of items) {
      if (!map[item.project_id]) map[item.project_id] = [];
      map[item.project_id].push(item);
    }
    return Object.entries(map).map(([projectId, srnItems]) => {
      const proj = (projects as any[]).find(p => p.id === projectId);
      return {
        projectId,
        projectName: proj?.site || proj?.projectName || projectId,
        poNo:   proj?.poNo   || '—',
        vendor: proj?.vendor || '—',
        pm:     proj?.pm     || '—',
        region: proj?.region || '—',
        srnItems,
      };
    });
  }, [items, projects]);

  const kpiFiltered = kpiFilter ? grouped.map(p => ({
    ...p,
    srnItems: p.srnItems.filter((i:any) => {
      if (kpiFilter === 'received')     return i.received === true;
      if (kpiFilter === 'not_received') return i.received === false;
      return true;
    })
  })).filter((p:any) => p.srnItems.length > 0) : grouped;

  const filtered = kpiFiltered.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.projectId.toLowerCase().includes(s) ||
           p.projectName.toLowerCase().includes(s) ||
           p.poNo.toLowerCase().includes(s) ||
           p.vendor.toLowerCase().includes(s);
  });

  const thS: React.CSSProperties = {
    padding:'9px 12px', fontSize:10, fontWeight:700, textTransform:'uppercase',
    color:Theme.primary, background:Theme.primaryLight, textAlign:'left' as const,
    borderBottom:`2px solid ${Theme.primaryMid}`, whiteSpace:'nowrap' as const,
  };
  const tdS: React.CSSProperties = {
    padding:'10px 12px', fontSize:12, borderBottom:`1px solid ${Theme.border}`, verticalAlign:'middle' as const,
  };

  const PER_PAGE = 20;
  const [page, setPage] = React.useState(1);

  // Sync page from URL on load
  React.useEffect(() => {
    if (router.isReady) {
      const p = Number(router.query.page);
      if (p && p > 0) setPage(p);
    }
  }, [router.isReady]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setPage(1);
    router.replace({ query: { ...router.query, page: 1 } }, undefined, { shallow: true });
  }, [search, kpiFilter]);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  const isLoading = loading || projLoading || stnLoading;

  return (
    <Layout>
      <div className="fade-in">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <div style={{ fontSize:22, fontWeight:800, color:Theme.text }}>SRN Status</div>
            <div style={{ fontSize:13, color:Theme.textMuted, marginTop:2 }}>
              {isLoading ? 'Loading...' : `${filtered.length} projects · ${items.length} SRN items`}
            </div>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search project, vendor, PO…"
            style={{ border:`1px solid ${Theme.border}`, borderRadius:8, padding:'8px 14px', fontSize:13, outline:'none', width:260 }} />
        </div>

        {/* KPI Cards */}
        {(() => {
          // STN aggregations
          const stnPending = stnItems.filter(i => i.pmApprovedQty === null || i.pmApprovedQty === undefined);
          const stnByPM: Record<string,{total:number;pending:number}> = {};
          const stnByRegion: Record<string,{total:number;pending:number}> = {};
          for (const i of stnItems) {
            const proj = (projects as any[]).find(p => p.id === i.projectId);
            const pm = proj?.pm || '—'; const region = proj?.region || '—';
            const isPend = i.pmApprovedQty === null || i.pmApprovedQty === undefined;
            if (!stnByPM[pm])     stnByPM[pm]     = {total:0,pending:0};
            if (!stnByRegion[region]) stnByRegion[region] = {total:0,pending:0};
            stnByPM[pm].total++;     if (isPend) stnByPM[pm].pending++;
            stnByRegion[region].total++; if (isPend) stnByRegion[region].pending++;
          }
          // SRN aggregations
          const srnPending = items.filter((i:any) => !i.received);
          const srnByPM: Record<string,{total:number;pending:number}> = {};
          const srnByRegion: Record<string,{total:number;pending:number}> = {};
          for (const proj of grouped) {
            const pm = proj.pm || '—'; const region = proj.region || '—';
            for (const i of proj.srnItems) {
              const isPend = !i.received;
              if (!srnByPM[pm])     srnByPM[pm]     = {total:0,pending:0};
              if (!srnByRegion[region]) srnByRegion[region] = {total:0,pending:0};
              srnByPM[pm].total++;     if (isPend) srnByPM[pm].pending++;
              srnByRegion[region].total++; if (isPend) srnByRegion[region].pending++;
            }
          }

          const BreakdownTable = ({ data, color }: { data: Record<string,{total:number;pending:number}>; color: string }) => (
            <table style={{ width:'100%', borderCollapse:'collapse' as const, fontSize:11 }}>
              <thead>
                <tr>
                  <th style={{ textAlign:'left' as const, padding:'4px 6px', color:Theme.textMuted, fontWeight:600, borderBottom:`1px solid ${Theme.border}` }}>Name</th>
                  <th style={{ textAlign:'right' as const, padding:'4px 6px', color:Theme.textMuted, fontWeight:600, borderBottom:`1px solid ${Theme.border}` }}>Total</th>
                  <th style={{ textAlign:'right' as const, padding:'4px 6px', color:Theme.textMuted, fontWeight:600, borderBottom:`1px solid ${Theme.border}` }}>Pending</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data).sort((a,b)=>b[1].pending-a[1].pending).map(([name,v])=>(
                  <tr key={name}>
                    <td style={{ padding:'4px 6px', color:Theme.text, fontWeight:500 }}>{name}</td>
                    <td style={{ padding:'4px 6px', textAlign:'right' as const, color:Theme.textMuted }}>{v.total}</td>
                    <td style={{ padding:'4px 6px', textAlign:'right' as const, fontWeight:700, color:v.pending>0?color:Theme.textMuted }}>{v.pending}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          );

          return (
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
                    <div style={{ fontSize:24, fontWeight:800, color:Theme.primary }}>{stnItems.length}</div>
                  </div>
                  <div style={{ background:'#FFFBEB', borderRadius:8, padding:'10px 14px' }}>
                    <div style={{ fontSize:10, fontWeight:600, color:'#92400E', textTransform:'uppercase' as const, marginBottom:4 }}>Pending PM Approval</div>
                    <div style={{ fontSize:24, fontWeight:800, color:'#D97706' }}>{stnPending.length}</div>
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:Theme.textMuted, textTransform:'uppercase' as const, marginBottom:6 }}>By PM</div>
                    <BreakdownTable data={stnByPM} color="#D97706" />
                  </div>
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:Theme.textMuted, textTransform:'uppercase' as const, marginBottom:6 }}>By Region</div>
                    <BreakdownTable data={stnByRegion} color="#D97706" />
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
                    <div style={{ fontSize:24, fontWeight:800, color:Theme.primary }}>{items.length}</div>
                  </div>
                  <div style={{ background:'#FEF2F2', borderRadius:8, padding:'10px 14px' }}>
                    <div style={{ fontSize:10, fontWeight:600, color:'#991B1B', textTransform:'uppercase' as const, marginBottom:4 }}>Pending PM Approval</div>
                    <div style={{ fontSize:24, fontWeight:800, color:'#DC2626' }}>{srnPending.length}</div>
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:Theme.textMuted, textTransform:'uppercase' as const, marginBottom:6 }}>By PM</div>
                    <BreakdownTable data={srnByPM} color="#DC2626" />
                  </div>
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:Theme.textMuted, textTransform:'uppercase' as const, marginBottom:6 }}>By Region</div>
                    <BreakdownTable data={srnByRegion} color="#DC2626" />
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {isLoading && <div style={{ ...card, textAlign:'center', padding:40, color:Theme.textMuted }}>Loading SRN data...</div>}

        {!isLoading && filtered.length === 0 && (
          <div style={{ ...card, textAlign:'center', padding:40, color:Theme.textMuted }}>
            {items.length === 0 ? 'No SRN items added yet. Add them from the project detail page.' : 'No records match your search.'}
          </div>
        )}

        {!isLoading && paginated.map((project: any) => {
          const isExpanded  = expandedId === project.projectId;
          const srnItems    = project.srnItems || [];
          const totalReceived = srnItems.filter((i:any)=>i.received===true).length;
          const allDone     = srnItems.length > 0 && srnItems.every((i:any)=>i.received===true);

          return (
            <div key={project.projectId} style={{ ...card, marginBottom:12, padding:0, overflow:'hidden' }}>
              <div onClick={()=>setExpandedId(isExpanded?null:project.projectId)}
                style={{ padding:'14px 18px', cursor:'pointer',
                  background:isExpanded?Theme.primaryLight:Theme.surface,
                  borderBottom:isExpanded?`1px solid ${Theme.border}`:'none' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:4 }}>
                      <Link href={`/projects/${project.projectId}`} onClick={e=>e.stopPropagation()}
                        style={{ fontWeight:700, color:Theme.primary, fontSize:14, textDecoration:'none' }}>
                        {project.projectId}
                      </Link>
                      <span style={{ fontSize:12, color:Theme.textMuted }}>{project.poNo}</span>
                    </div>
                    <div style={{ fontSize:14, fontWeight:600, color:Theme.text }}>{project.projectName}</div>
                    {showVendor && (
                      <div style={{ fontSize:12, color:Theme.textMuted, marginTop:2 }}>
                        Vendor: {project.vendor} · PM: {project.pm}
                      </div>
                    )}
                  </div>
                  <div style={{ display:'flex', gap:16, alignItems:'center' }}>
                    {[
                      ['ITEMS',    srnItems.length,  Theme.text],
                      ['RECEIVED', totalReceived,    '#0D9488'],
                      ['PENDING',  srnItems.length - totalReceived, '#D97706'],
                    ].map(([label,val,color])=>(
                      <div key={label as string} style={{ textAlign:'center' as const }}>
                        <div style={{ fontSize:10, color:Theme.textMuted, marginBottom:2 }}>{label}</div>
                        <div style={{ fontSize:16, fontWeight:700, color:color as string }}>{val as number}</div>
                      </div>
                    ))}
                    <span style={{ fontSize:11, fontWeight:700,
                      color:allDone?'#0D9488':'#D97706',
                      background:allDone?'#F0FDFA':'#FFFBEB',
                      padding:'4px 12px', borderRadius:20 }}>
                      {allDone ? '✅ All Done' : '⏳ Pending'}
                    </span>
                    <span style={{ color:Theme.textMuted, fontSize:16 }}>{isExpanded?'▲':'▼'}</span>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div style={{ padding:'0 0 14px 0' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
                    <thead>
                      <tr>
                        {['#','Description','HSN','UOM','Qty','Rate','GST%','Amount','Serial No','Doc No','BOQ Req','Return Qty','Return Date','Received','Action'].map((h,i)=>(
                          <th key={i} style={{ ...thS, textAlign:i>=4&&i<=7?'right' as const:'left' as const }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {srnItems.map((m: any, idx: number) => (
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
                          <td style={{ ...tdS }}>
                            {m.received
                              ? <span style={{ fontSize:11, fontWeight:700, color:'#0D9488', background:'#F0FDFA', padding:'2px 10px', borderRadius:20 }}>✓ Yes</span>
                              : <span style={{ fontSize:11, fontWeight:700, color:'#DC2626', background:'#FEF2F2', padding:'2px 10px', borderRadius:20 }}>✗ No</span>}
                          </td>
                          <td style={{ ...tdS, whiteSpace:'nowrap' as const }}>
                            {isPM && !m.received && (
                              <div style={{ display:'flex', gap:4 }}>
                                <button onClick={()=>markReceived(m, true)} disabled={saving===m.id}
                                  style={{ background:'#0D9488', color:'#fff', border:'none', borderRadius:6, padding:'4px 10px', fontSize:11, cursor:'pointer', fontWeight:600 }}>
                                  ✓ Yes
                                </button>
                                <button onClick={()=>markReceived(m, false)} disabled={saving===m.id}
                                  style={{ background:'#DC2626', color:'#fff', border:'none', borderRadius:6, padding:'4px 10px', fontSize:11, cursor:'pointer', fontWeight:600 }}>
                                  ✗ No
                                </button>
                              </div>
                            )}
                            {m.received && (
                              <span style={{ fontSize:11, color:'#0D9488', fontWeight:700 }}>✓ Done</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
        {/* ── Pagination ── */}
        {!isLoading && totalPages > 1 && (
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:16, padding:'10px 4px' }}>
            <div style={{ fontSize:12, color:'#6B7280' }}>
              Showing {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE, filtered.length)} of {filtered.length} projects
            </div>
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              <button onClick={()=>{ const n=Math.max(1,page-1); setPage(n); router.push({query:{...router.query,page:n}},undefined,{shallow:true}); }} disabled={page===1}
                style={{ padding:'5px 12px', borderRadius:6, border:`1px solid #E5E7EB`, background:'#fff',
                  cursor:page===1?'not-allowed':'pointer', fontSize:12, color:page===1?'#9CA3AF':'#374151', opacity:page===1?0.5:1 }}>
                ← Prev
              </button>
              {Array.from({length:totalPages},(_,i)=>i+1).filter(n=>n===1||n===totalPages||Math.abs(n-page)<=1).reduce((acc:number[],n,i,arr)=>{
                if(i>0&&n-arr[i-1]>1) acc.push(-1);
                acc.push(n); return acc;
              },[] as number[]).map((n,i)=>
                n===-1
                  ? <span key={`e${i}`} style={{ fontSize:12, color:'#9CA3AF', padding:'0 4px' }}>…</span>
                  : <button key={n} onClick={()=>{ setPage(n); router.push({query:{...router.query,page:n}},undefined,{shallow:true}); }}
                      style={{ padding:'5px 10px', borderRadius:6, border:`1px solid ${page===n?'#0D9488':'#E5E7EB'}`,
                        background:page===n?'#0D9488':'#fff', color:page===n?'#fff':'#374151',
                        cursor:'pointer', fontSize:12, fontWeight:page===n?700:400, minWidth:32 }}>
                      {n}
                    </button>
              )}
              <button onClick={()=>{ const n=Math.min(totalPages,page+1); setPage(n); router.push({query:{...router.query,page:n}},undefined,{shallow:true}); }} disabled={page===totalPages}
                style={{ padding:'5px 12px', borderRadius:6, border:`1px solid #E5E7EB`, background:'#fff',
                  cursor:page===totalPages?'not-allowed':'pointer', fontSize:12, color:page===totalPages?'#9CA3AF':'#374151', opacity:page===totalPages?0.5:1 }}>
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
