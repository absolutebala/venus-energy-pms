import React, { useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePOItems } from '@/context/POItemContext';
import { useProjects } from '@/context/ProjectContext';
import { T as Theme, card } from '@/lib/theme';

const fmt = (n: number) => Number(n).toLocaleString('en-IN');

const getBalance = (m: any) => Math.max(0, (m.issuedQty??0) - (m.pmApprovedQty||m.utilisedQty||0));

const getReturnStatus = (m: any) => {
  const bal = getBalance(m);
  if (bal === 0) return { label:'Not Applicable',    color:'#9CA3AF', bg:'#F9FAFB' };
  const ret = m.returnQty??0;
  if (ret >= bal) return { label:'Fully Returned',   color:'#0D9488', bg:'#F0FDFA' };
  if (ret > 0)    return { label:'Partially Returned',color:'#D97706', bg:'#FFFBEB' };
  return               { label:'Pending Return',     color:'#DC2626', bg:'#FEF2F2' };
};

export default function SRNReturnPage() {
  const { profile, can } = useAuth();
  const { items: allItems, loading: matLoading, updateItem } = usePOItems();
  const [editId,     setEditId]     = React.useState<string|null>(null);
  const [editRow,    setEditRow]    = React.useState<any>({});
  const [saving,     setSaving]     = React.useState(false);
  const [returnMap,  setReturnMap]  = React.useState<Record<string,string>>({});
  const [actSaving,  setActSaving]  = React.useState<string|null>(null);

  const pmAction = async (item: any, approve: boolean) => {
    setActSaving(item.id);
    try {
      await updateItem(item.id, {
        utilisedStatus: approve ? 'pm_approved' : 'pm_rejected',
        pmApprovedQty: approve ? (item.utilisedQty ?? 0) : null,
      } as any);
    } catch(err) { console.error(err); }
    finally { setActSaving(null); }
  };

  const raiseSRN = async (item: any) => {
    const qty = Number(returnMap[item.id] ?? 0);
    if (!qty) return;
    setActSaving(item.id);
    try {
      await updateItem(item.id, {
        returnQty: qty, srnStatus: 'srn_raised',
        srnDate: new Date().toISOString().split('T')[0],
      } as any);
    } catch(err) { console.error(err); }
    finally { setActSaving(null); }
  };

  const markReceived = async (item: any) => {
    setActSaving(item.id);
    try {
      await updateItem(item.id, { srnStatus: 'srn_received' } as any);
    } catch(err) { console.error(err); }
    finally { setActSaving(null); }
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await updateItem(editId!, {
        hsnCode:    editRow.hsnCode,
        description: editRow.description,
        uom:        editRow.uom,
        quantity:   Number(editRow.quantity),
        documentNo: editRow.documentNo,
        boqReqNo:   editRow.boqReqNo,
        serialNo:   editRow.serialNo,
        gstRate:    Number(editRow.gstRate),
        amount:     Number(editRow.amount),
      } as any);
      setEditId(null);
    } catch(err) { console.error(err); }
    finally { setSaving(false); }
  };
  const { projects, loading: projLoading } = useProjects();
  const role    = profile?.role || 'viewer';
  const isPM    = ['project_manager','super_admin','region_manager'].includes(role);
  const isVendor = role === 'vendor';
  const isAdmin  = ['super_admin','accounting_team'].includes(role);

  const [search,     setSearch]     = useState('');
  const [expandedId, setExpandedId] = useState<string|null>(null);

  const showVendor = ['super_admin','region_manager','project_manager'].includes(role);

  // Group materials by projectId
  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const item of allItems) {
      if (!map[item.projectId]) map[item.projectId] = [];
      map[item.projectId].push(item);
    }
    return Object.entries(map).map(([projectId, stnItems]) => {
      const proj = (projects as any[]).find(p => p.id === projectId);
      return {
        projectId,
        projectName: proj?.site || projectId,
        poNo:   proj?.poNo  || '—',
        vendor: proj?.vendor || '—',
        pm:     proj?.pm    || '—',
        stnItems,
      };
    });
  }, [allItems, projects]);

  const filtered = grouped.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.projectId.toLowerCase().includes(s) ||
           p.projectName.toLowerCase().includes(s) ||
           p.poNo.toLowerCase().includes(s) ||
           p.vendor.toLowerCase().includes(s);
  });

  const totalItems    = allItems.length;
  const totalApproved = grouped.length;
  const totalPending  = 0;

  const thS: React.CSSProperties = {
    padding:'9px 12px', fontSize:10, fontWeight:700, textTransform:'uppercase',
    color:Theme.primary, background:Theme.primaryLight, textAlign:'left' as const,
    borderBottom:`2px solid ${Theme.primaryMid}`, whiteSpace:'nowrap' as const,
  };
  const tdS: React.CSSProperties = {
    padding:'10px 12px', fontSize:13, borderBottom:`1px solid ${Theme.border}`, verticalAlign:'middle' as const,
  };

  const loading = matLoading || projLoading;

  return (
    <Layout>
      <div className="fade-in">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <div style={{ fontSize:22, fontWeight:800, color:Theme.text }}>STN / SRN Status</div>
            <div style={{ fontSize:13, color:Theme.textMuted, marginTop:2 }}>
              {loading ? 'Loading...' : `${grouped.length} projects · ${totalItems} material items`}
            </div>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search project, vendor, PO…"
            style={{ border:`1px solid ${Theme.border}`, borderRadius:8, padding:'8px 14px', fontSize:13, outline:'none', width:260 }} />
        </div>

        {/* Summary cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
          {[
            { label:'Total STN Items',  value:allItems.length,                                                                           color:Theme.primary },
            { label:'Submitted',        value:allItems.filter((i:any)=>i.utilisedStatus==='submitted').length,                           color:'#2563EB'     },
            { label:'PM Approved',      value:allItems.filter((i:any)=>i.utilisedStatus==='pm_approved').length,                         color:Theme.success },
            { label:'SRN Received',     value:allItems.filter((i:any)=>(i as any).srnStatus==='srn_received').length,                   color:'#0D9488'     },
          ].map(s=>(
            <div key={s.label} style={{ ...card, padding:'14px 16px' }}>
              <div style={{ fontSize:11, color:Theme.textMuted, fontWeight:600, textTransform:'uppercase', marginBottom:4 }}>{s.label}</div>
              <div style={{ fontSize:22, fontWeight:800, color:s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ background:Theme.primaryLight, border:`1px solid ${Theme.primaryMid}`, borderRadius:10,
          padding:'10px 16px', marginBottom:16, fontSize:12, color:Theme.primary }}>
          📦 Materials issued from Indus via STN — vendor submits utilisation → PM approves → excess returned via SRN
        </div>

        {loading && <div style={{ ...card, textAlign:'center', padding:40, color:Theme.textMuted }}>Loading STN/SRN data...</div>}

        {!loading && filtered.length === 0 && (
          <div style={{ ...card, textAlign:'center', padding:40, color:Theme.textDim }}>No STN/SRN records found</div>
        )}

        {!loading && filtered.map((project: any) => {
          const isExpanded   = expandedId === project.projectId;
          const materials    = project.stnItems || [];
          const totalItemCount = materials.length;
          const totalQty     = materials.reduce((a:number,m:any)=>a+Number(m.quantity||0),0);
          const totalAmount  = materials.reduce((a:number,m:any)=>a+Number(m.amount||0),0);
          const allDone      = materials.length > 0;

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
                      ['ITEMS', totalItemCount, Theme.text],
                      ['SUBMITTED', materials.filter((m:any)=>m.utilisedStatus==='submitted').length, '#2563EB'],
                      ['APPROVED', materials.filter((m:any)=>m.utilisedStatus==='pm_approved').length, Theme.success],
                      ['SRN DONE', materials.filter((m:any)=>(m as any).srnStatus==='srn_received').length, '#0D9488'],
                    ].map(([label,val,color])=>(
                      <div key={label as string} style={{ textAlign:'center' as const }}>
                        <div style={{ fontSize:10, color:Theme.textMuted, marginBottom:2 }}>{label}</div>
                        <div style={{ fontSize:16, fontWeight:700, color:color as string }}>{fmt(val as number)}</div>
                      </div>
                    ))}
                    <span style={{ fontSize:11, fontWeight:700,
                      color:allDone?Theme.success:Theme.warning,
                      background:allDone?Theme.successBg:'#FFFBEB',
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
                        {['#','Item Code','Item Description','UOM','Qty','Util Qty','Util Status','PM Approved','Balance','Return Qty','SRN Status','Action',''].map((h,i)=>(
                          <th key={h} style={{ ...thS }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {materials.map((m: any, idx: number) => (
                          <tr key={m.id} style={{ background:idx%2===0?'#fff':Theme.bg }}>
                            <td style={{ ...tdS, color:Theme.textMuted }}>{idx+1}</td>
                            {editId === m.id ? (
                              <>
                                <td style={tdS}><input value={editRow.hsnCode||''} onChange={e=>setEditRow((p:any)=>({...p,hsnCode:e.target.value}))} style={{ border:`1px solid ${Theme.border}`, borderRadius:4, padding:'3px 6px', fontSize:12, width:'100%' }} /></td>
                                <td style={tdS}><input value={editRow.description||''} onChange={e=>setEditRow((p:any)=>({...p,description:e.target.value}))} style={{ border:`1px solid ${Theme.border}`, borderRadius:4, padding:'3px 6px', fontSize:12, width:'100%' }} /></td>
                                <td style={tdS}><input value={editRow.uom||''} onChange={e=>setEditRow((p:any)=>({...p,uom:e.target.value}))} style={{ border:`1px solid ${Theme.border}`, borderRadius:4, padding:'3px 6px', fontSize:12, width:60 }} /></td>
                                <td style={tdS}><input type="number" value={editRow.quantity||''} onChange={e=>setEditRow((p:any)=>({...p,quantity:e.target.value}))} style={{ border:`1px solid ${Theme.border}`, borderRadius:4, padding:'3px 6px', fontSize:12, width:60 }} /></td>
                                <td style={tdS}><input value={editRow.documentNo||''} onChange={e=>setEditRow((p:any)=>({...p,documentNo:e.target.value}))} style={{ border:`1px solid ${Theme.border}`, borderRadius:4, padding:'3px 6px', fontSize:12, width:'100%' }} /></td>
                                <td style={tdS}><input value={editRow.boqReqNo||''} onChange={e=>setEditRow((p:any)=>({...p,boqReqNo:e.target.value}))} style={{ border:`1px solid ${Theme.border}`, borderRadius:4, padding:'3px 6px', fontSize:12, width:'100%' }} /></td>
                                <td style={tdS}><input value={editRow.serialNo||''} onChange={e=>setEditRow((p:any)=>({...p,serialNo:e.target.value}))} style={{ border:`1px solid ${Theme.border}`, borderRadius:4, padding:'3px 6px', fontSize:12, width:'100%' }} /></td>
                                <td style={tdS}><input type="number" value={editRow.gstRate||18} onChange={e=>setEditRow((p:any)=>({...p,gstRate:e.target.value}))} style={{ border:`1px solid ${Theme.border}`, borderRadius:4, padding:'3px 6px', fontSize:12, width:50 }} /></td>
                                <td style={tdS}><input type="number" value={editRow.amount||''} onChange={e=>setEditRow((p:any)=>({...p,amount:e.target.value}))} style={{ border:`1px solid ${Theme.border}`, borderRadius:4, padding:'3px 6px', fontSize:12, width:80 }} /></td>
                                <td style={{ ...tdS, color:Theme.success, fontWeight:700 }}>₹{(Number(editRow.amount||0)*(1+(Number(editRow.gstRate||0)/100))).toLocaleString('en-IN')}</td>
                                <td style={{ ...tdS, display:'flex', gap:4 }}>
                                  <button onClick={saveEdit} disabled={saving} style={{ background:Theme.primary, color:'#fff', border:'none', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:11 }}>✓</button>
                                  <button onClick={()=>setEditId(null)} style={{ background:'#fff', border:`1px solid ${Theme.border}`, borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:11 }}>✕</button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td style={{ ...tdS, fontWeight:700, color:Theme.primary }}>{m.hsnCode||'—'}</td>
                                <td style={tdS}>{m.description}</td>
                                <td style={{ ...tdS, color:Theme.textMuted }}>{m.uom||'—'}</td>
                                <td style={tdS}>{m.quantity||'—'}</td>
                                <td style={{ ...tdS, textAlign:'center' as const, fontWeight:600 }}>{m.utilisedQty??'—'}</td>
                                <td style={tdS}>
                                  {m.utilisedStatus && m.utilisedStatus!=='pending' ? (
                                    <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20,
                                      color:m.utilisedStatus==='pm_approved'?'#059669':m.utilisedStatus==='submitted'?'#2563EB':'#DC2626',
                                      background:m.utilisedStatus==='pm_approved'?'#D1FAE5':m.utilisedStatus==='submitted'?'#EFF6FF':'#FEF2F2' }}>
                                      {m.utilisedStatus==='pm_approved'?'Approved':m.utilisedStatus==='submitted'?'Submitted':'Rejected'}
                                    </span>
                                  ) : <span style={{ fontSize:11, color:Theme.textMuted }}>Pending</span>}
                                </td>
                                <td style={{ ...tdS, textAlign:'center' as const, color:'#059669', fontWeight:600 }}>{m.pmApprovedQty??'—'}</td>
                                <td style={{ ...tdS, textAlign:'center' as const, fontWeight:700,
                                  color: m.utilisedStatus==='pm_approved' ? (Math.max(0,(m.quantity||0)-(m.pmApprovedQty||0))>0?'#D97706':'#059669') : Theme.textMuted }}>
                                  {m.utilisedStatus==='pm_approved' ? Math.max(0,(m.quantity||0)-(m.pmApprovedQty||0)) : '—'}
                                </td>
                                <td style={{ ...tdS, textAlign:'center' as const }}>{m.returnQty??'—'}</td>
                                <td style={tdS}>
                                  {m.srnStatus && m.srnStatus!=='pending' ? (
                                    <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20,
                                      color:m.srnStatus==='srn_received'?'#059669':'#D97706',
                                      background:m.srnStatus==='srn_received'?'#D1FAE5':'#FFFBEB' }}>
                                      {m.srnStatus==='srn_received'?'Received':'Raised'}
                                    </span>
                                  ) : <span style={{ fontSize:11, color:Theme.textMuted }}>—</span>}
                                </td>
                                <td style={{ ...tdS, whiteSpace:'nowrap' as const }}>
                                  {isPM && m.utilisedStatus==='submitted' && (
                                    <div style={{ display:'flex', gap:4 }}>
                                      <button onClick={()=>pmAction(m,true)} disabled={actSaving===m.id}
                                        style={{ background:'#059669', color:'#fff', border:'none', borderRadius:6, padding:'3px 8px', fontSize:11, cursor:'pointer' }}>✓</button>
                                      <button onClick={()=>pmAction(m,false)} disabled={actSaving===m.id}
                                        style={{ background:'#DC2626', color:'#fff', border:'none', borderRadius:6, padding:'3px 8px', fontSize:11, cursor:'pointer' }}>✗</button>
                                    </div>
                                  )}
                                  {isVendor && m.utilisedStatus==='pm_approved' && Math.max(0,(m.quantity||0)-(m.pmApprovedQty||0))>0 && (!m.srnStatus||m.srnStatus==='pending') && (
                                    <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                                      <input type="number" min={0} max={Math.max(0,(m.quantity||0)-(m.pmApprovedQty||0))}
                                        value={returnMap[m.id]??''}
                                        onChange={e=>setReturnMap(p=>({...p,[m.id]:e.target.value}))}
                                        placeholder="Qty" style={{ width:50, border:`1px solid ${Theme.border}`, borderRadius:4, padding:'3px 5px', fontSize:11 }} />
                                      <button onClick={()=>raiseSRN(m)} disabled={actSaving===m.id||!returnMap[m.id]}
                                        style={{ background:Theme.primary, color:'#fff', border:'none', borderRadius:6, padding:'3px 8px', fontSize:11, cursor:'pointer', opacity:!returnMap[m.id]?0.5:1 }}>SRN</button>
                                    </div>
                                  )}
                                  {isAdmin && m.srnStatus==='srn_raised' && (
                                    <button onClick={()=>markReceived(m)} disabled={actSaving===m.id}
                                      style={{ background:'#059669', color:'#fff', border:'none', borderRadius:6, padding:'3px 8px', fontSize:11, cursor:'pointer' }}>Received</button>
                                  )}
                                  {m.srnStatus==='srn_received' && <span style={{ fontSize:11, color:'#059669', fontWeight:700 }}>✓ Done</span>}
                                  {!isPM && !isVendor && !isAdmin && ['super_admin','accounting_team','region_manager','project_manager'].includes(role) && (
                                    <button onClick={()=>{ setEditId(m.id); setEditRow({...m}); }}
                                      style={{ background:'none', border:`1px solid ${Theme.border}`, borderRadius:6, padding:'3px 8px', cursor:'pointer', fontSize:12, color:Theme.primary }}>✏️</button>
                                  )}
                                </td>
                                <td style={tdS}>
                                  {['super_admin','accounting_team','region_manager','project_manager'].includes(role) && (
                                    <button onClick={()=>{ setEditId(m.id); setEditRow({...m}); }}
                                      style={{ background:'none', border:`1px solid ${Theme.border}`, borderRadius:6, padding:'3px 8px', cursor:'pointer', fontSize:12, color:Theme.primary }}>✏️</button>
                                  )}
                                </td>
                              </>
                            )}
                          </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
