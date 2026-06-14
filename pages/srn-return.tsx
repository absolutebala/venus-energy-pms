import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Layout from '@/components/Layout';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useProjects } from '@/context/ProjectContext';
import { createClient } from '@/lib/supabase';
import { T as Theme, card } from '@/lib/theme';

export default function SRNReturnPage() {
  const { profile } = useAuth();
  const { projects, loading: projLoading } = useProjects();
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
  React.useEffect(() => { setPage(1); }, [search, kpiFilter]);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  const isLoading = loading || projLoading;

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

        {/* Summary cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
          {[
            { label:'Total SRN Items',  value:items.length,                                  color:Theme.primary, filter:null            },
            { label:'Received',         value:items.filter((i:any)=>i.received===true).length,  color:'#0D9488',    filter:'received'      },
            { label:'Pending',          value:items.filter((i:any)=>!i.received).length,        color:'#D97706',    filter:'not_received'  },
          ].map(s=>(
            <div key={s.label} onClick={()=>setKpiFilter(kpiFilter===s.filter?null:s.filter)}
              style={{ ...card, padding:'14px 16px', cursor:'pointer',
                borderColor:kpiFilter===s.filter?s.color:Theme.border,
                boxShadow:kpiFilter===s.filter?`0 0 0 2px ${s.color}30`:'none', transition:'all 0.15s' }}>
              <div style={{ fontSize:11, color:kpiFilter===s.filter?s.color:Theme.textMuted, fontWeight:600, textTransform:'uppercase' as const, marginBottom:4 }}>{s.label}</div>
              <div style={{ fontSize:22, fontWeight:800, color:s.color }}>{s.value}</div>
              {kpiFilter===s.filter && <div style={{ fontSize:10, color:s.color, marginTop:2 }}>● Filtered</div>}
            </div>
          ))}
        </div>

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
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
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
                  : <button key={n} onClick={()=>setPage(n)}
                      style={{ padding:'5px 10px', borderRadius:6, border:`1px solid ${page===n?'#0D9488':'#E5E7EB'}`,
                        background:page===n?'#0D9488':'#fff', color:page===n?'#fff':'#374151',
                        cursor:'pointer', fontSize:12, fontWeight:page===n?700:400, minWidth:32 }}>
                      {n}
                    </button>
              )}
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
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
