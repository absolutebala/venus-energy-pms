import React, { useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useMaterial } from '@/context/MaterialContext';
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
  const { allItems, loading: matLoading } = useMaterial();
  const { projects, loading: projLoading } = useProjects();
  const role = profile?.role || 'viewer';

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
    return Object.entries(map).map(([projectId, materials]) => {
      const proj = (projects as any[]).find(p => p.id === projectId);
      return {
        projectId,
        projectName: proj?.site || projectId,
        poNo:  proj?.poNo  || '—',
        vendor: proj?.vendor || '—',
        pm:    proj?.pm    || '—',
        materials,
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
  const totalApproved = allItems.filter(m => m.utilisedStatus === 'pm_approved').length;
  const totalPending  = allItems.filter(m => getBalance(m) > 0 && (m.returnQty??0) < getBalance(m)).length;

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
            { label:'Projects with Materials', value:grouped.length,  color:Theme.primary },
            { label:'Total Items',             value:totalItems,      color:Theme.info    },
            { label:'Items Approved',          value:totalApproved,   color:Theme.success },
            { label:'Pending Return',          value:totalPending,    color:Theme.danger  },
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
          const materials    = project.materials || [];
          const totalIssued  = materials.reduce((a:number,m:any)=>a+(m.issuedQty??0),0);
          const totalReturn  = materials.reduce((a:number,m:any)=>a+(m.returnQty??0),0);
          const totalBalance = materials.reduce((a:number,m:any)=>a+getBalance(m),0);
          const allDone      = materials.every((m:any)=>getBalance(m)===0||(m.returnQty??0)>=getBalance(m));

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
                    {[['ISSUED',totalIssued,Theme.text],['RETURNED',totalReturn,Theme.success],
                      ['BALANCE',totalBalance,totalBalance>0?Theme.danger:Theme.success]].map(([label,val,color])=>(
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
                        {['Code','Description','UOM','Issued','Utilised','Balance','Returned','Return Status','Approval'].map((h,i)=>(
                          <th key={h} style={{ ...thS, textAlign:i>=3&&i<=6?'right' as const:'left' as const }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {materials.map((m: any, idx: number) => {
                        const bal      = getBalance(m);
                        const rs       = getReturnStatus(m);
                        const approved = m.utilisedStatus === 'pm_approved';
                        const STATUS: Record<string,{color:string;bg:string;label:string}> = {
                          pending:     { color:'#6B7280', bg:'#F9FAFB', label:'Pending'   },
                          submitted:   { color:'#2563EB', bg:'#EFF6FF', label:'Submitted' },
                          pm_approved: { color:'#0D9488', bg:'#F0FDFA', label:'Approved'  },
                          pm_rejected: { color:'#DC2626', bg:'#FEF2F2', label:'Rejected'  },
                        };
                        const badge = STATUS[m.utilisedStatus] || STATUS.pending;
                        return (
                          <tr key={m.id} style={{ background:idx%2===0?'#fff':Theme.bg }}>
                            <td style={{ ...tdS, fontWeight:700, color:Theme.primary }}>{m.code}</td>
                            <td style={tdS}>{m.description}</td>
                            <td style={{ ...tdS, color:Theme.textMuted }}>{m.uom}</td>
                            <td style={{ ...tdS, textAlign:'right' as const, fontWeight:600 }}>{fmt(m.issuedQty??0)}</td>
                            <td style={{ ...tdS, textAlign:'right' as const, color:Theme.info }}>
                              {m.utilisedQty!==null&&m.utilisedQty!==undefined ? fmt(m.utilisedQty) : '—'}
                            </td>
                            <td style={{ ...tdS, textAlign:'right' as const, fontWeight:600,
                              color:bal>0?Theme.danger:Theme.success }}>{m.utilisedQty!==null&&m.utilisedQty!==undefined?fmt(bal):'—'}</td>
                            <td style={{ ...tdS, textAlign:'right' as const, color:Theme.success, fontWeight:600 }}>
                              {(m.returnQty||0)>0?fmt(m.returnQty):'—'}
                            </td>
                            <td style={tdS}>
                              <span style={{ fontSize:11, fontWeight:700, color:rs.color, background:rs.bg,
                                padding:'2px 8px', borderRadius:20, whiteSpace:'nowrap' as const }}>{rs.label}</span>
                            </td>
                            <td style={tdS}>
                              <span style={{ fontSize:11, fontWeight:700, color:badge.color, background:badge.bg,
                                padding:'2px 8px', borderRadius:20, whiteSpace:'nowrap' as const }}>{badge.label}</span>
                            </td>
                          </tr>
                        );
                      })}
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
