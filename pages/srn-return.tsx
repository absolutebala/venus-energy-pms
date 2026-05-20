import React, { useState } from 'react';
import Layout from '@/components/Layout';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { STN_SRN_DATA, ProjectSTNSRN } from '@/lib/stnSrnData';

// Inline theme to avoid import conflict
import { T as Theme, card } from '@/lib/theme';

const fmt = (n: number) => Number(n).toLocaleString('en-IN');
const getBalance = (m: any) => Math.max(0, (m.issuedQty??0) - (m.pmApprovedQty??m.utilisedQty??0));
const getReturnStatus = (m: any) => {
  const bal = getBalance(m);
  if (bal === 0) return { label:'Not Applicable', color:'#9CA3AF', bg:'#F9FAFB' };
  const ret = m.returnQty??0;
  if (ret >= bal)   return { label:'Fully Returned',    color:'#0D9488', bg:'#F0FDFA' };
  if (ret > 0)      return { label:'Partially Returned', color:'#D97706', bg:'#FFFBEB' };
  return               { label:'Pending Return',      color:'#DC2626', bg:'#FEF2F2' };
};

export default function SRNReturnPage() {
  const { profile, can, loading } = useAuth();
  const role = profile?.role || 'viewer';
  const [tab,        setTab]        = useState<'ongoing'|'completed'>('ongoing');
  const [search,     setSearch]     = useState('');
  const [expandedId, setExpandedId] = useState<string|null>(null);

  const showVendor = ['super_admin','region_manager','project_manager'].includes(role);

  const filtered = STN_SRN_DATA.filter((p: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.projectId?.toLowerCase().includes(s) ||
           p.projectName?.toLowerCase().includes(s) ||
           p.poNo?.toLowerCase().includes(s) ||
           p.vendor?.toLowerCase().includes(s);
  });

  const thStyle: React.CSSProperties = {
    padding:'9px 12px', fontSize:10, fontWeight:700, textTransform:'uppercase',
    color:Theme.primary, background:Theme.primaryLight, textAlign:'left' as const,
    borderBottom:`2px solid ${Theme.primaryMid}`, whiteSpace:'nowrap' as const,
  };
  const tdStyle: React.CSSProperties = {
    padding:'10px 12px', fontSize:13, borderBottom:`1px solid ${Theme.border}`, verticalAlign:'middle' as const,
  };

  return (
    <Layout>
      <div className="fade-in">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <div style={{ fontSize:22, fontWeight:800, color:Theme.text }}>STN / SRN Status</div>
            <div style={{ fontSize:13, color:Theme.textMuted, marginTop:2 }}>Material utilisation and return tracking</div>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search project, vendor, PO…"
            style={{ border:`1px solid ${Theme.border}`, borderRadius:8, padding:'8px 14px', fontSize:13, outline:'none', width:260 }} />
        </div>

        {/* Summary */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
          {[
            { label:'Total Projects', value:STN_SRN_DATA.length,  color:Theme.primary },
            { label:'Total Items',    value:STN_SRN_DATA.reduce((a:number,p:any)=>a+p.materials.length,0), color:Theme.info },
            { label:'Items Approved', value:STN_SRN_DATA.reduce((a:number,p:any)=>a+p.materials.filter((m:any)=>m.utilisedStatus==='pm_approved').length,0), color:Theme.success },
            { label:'Pending Return', value:STN_SRN_DATA.reduce((a:number,p:any)=>a+p.materials.filter((m:any)=>getBalance(m)>0&&(m.returnQty??0)<getBalance(m)).length,0), color:Theme.danger },
          ].map(s=>(
            <div key={s.label} style={{ ...card, padding:'14px 16px' }}>
              <div style={{ fontSize:11, color:Theme.textMuted, fontWeight:600, textTransform:'uppercase', marginBottom:4 }}>{s.label}</div>
              <div style={{ fontSize:22, fontWeight:800, color:s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Info banner */}
        <div style={{ background:'#F0FDFA', border:`1px solid #99F6E4`, borderRadius:10, padding:'10px 16px', marginBottom:16, fontSize:12, color:Theme.primary }}>
          📦 Materials issued from Indus via STN — vendor submits utilisation → PM approves → excess returned via SRN
        </div>

        {/* Project cards */}
        {filtered.length === 0 && (
          <div style={{ ...card, textAlign:'center', padding:40, color:Theme.textDim }}>No STN/SRN records found</div>
        )}
        {filtered.map((project: any) => {
          const isExpanded   = expandedId === project.projectId;
          const materials    = project.materials || [];
          const totalIssued  = materials.reduce((a:number,m:any)=>a+(m.issuedQty??0),0);
          const totalReturn  = materials.reduce((a:number,m:any)=>a+(m.returnQty??0),0);
          const totalBalance = materials.reduce((a:number,m:any)=>a+getBalance(m),0);
          const allDone      = materials.every((m:any)=>getBalance(m)===0||(m.returnQty??0)>=getBalance(m));

          return (
            <div key={project.projectId} style={{ ...card, marginBottom:12, padding:0, overflow:'hidden' }}>
              {/* Header */}
              <div onClick={()=>setExpandedId(isExpanded?null:project.projectId)}
                style={{ padding:'14px 18px', cursor:'pointer', background:isExpanded?Theme.primaryLight:Theme.surface, borderBottom:isExpanded?`1px solid ${Theme.border}`:'none' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:4 }}>
                      <Link href={`/projects/${project.projectId}`} onClick={e=>e.stopPropagation()}
                        style={{ fontWeight:700, color:Theme.primary, fontSize:14, textDecoration:'none' }}>
                        {project.projectId}
                      </Link>
                      <span style={{ fontSize:12, color:Theme.textMuted }}>{project.poNo}</span>
                    </div>
                    <div style={{ fontSize:14, fontWeight:600, color:Theme.text }}>{project.projectName||project.projectId}</div>
                    {showVendor && <div style={{ fontSize:12, color:Theme.textMuted, marginTop:2 }}>Vendor: {project.vendor} · PM: {project.pm}</div>}
                  </div>
                  <div style={{ display:'flex', gap:16, alignItems:'center' }}>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontSize:10, color:Theme.textMuted, marginBottom:2 }}>ISSUED</div>
                      <div style={{ fontSize:16, fontWeight:700, color:Theme.text }}>{totalIssued}</div>
                    </div>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontSize:10, color:Theme.textMuted, marginBottom:2 }}>RETURNED</div>
                      <div style={{ fontSize:16, fontWeight:700, color:Theme.success }}>{totalReturn}</div>
                    </div>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontSize:10, color:Theme.textMuted, marginBottom:2 }}>BALANCE</div>
                      <div style={{ fontSize:16, fontWeight:700, color:totalBalance>0?Theme.danger:Theme.success }}>{totalBalance}</div>
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, color:allDone?Theme.success:Theme.warning,
                      background:allDone?Theme.successBg:Theme.warningBg, padding:'4px 12px', borderRadius:20 }}>
                      {allDone ? '✅ All Done' : '⏳ Pending'}
                    </span>
                    <span style={{ color:Theme.textMuted, fontSize:16 }}>{isExpanded?'▲':'▼'}</span>
                  </div>
                </div>
              </div>

              {/* Material table */}
              {isExpanded && (
                <div style={{ padding:'0 0 14px 0' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Item Code</th>
                        <th style={thStyle}>Description</th>
                        <th style={thStyle}>UOM</th>
                        <th style={{ ...thStyle, textAlign:'right' as const }}>STN Qty (Issued)</th>
                        <th style={{ ...thStyle, textAlign:'right' as const }}>Utilised</th>
                        <th style={{ ...thStyle, textAlign:'right' as const }}>Balance</th>
                        <th style={{ ...thStyle, textAlign:'right' as const }}>Returned</th>
                        <th style={thStyle}>Return Status</th>
                        <th style={thStyle}>Approval</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materials.map((m: any, idx: number) => {
                        const bal   = getBalance(m);
                        const rs    = getReturnStatus(m);
                        const approved = m.utilisedStatus === 'pm_approved';
                        return (
                          <tr key={m.id} style={{ background:idx%2===0?'#fff':Theme.bg }}>
                            <td style={{ ...tdStyle, fontWeight:700, color:Theme.primary }}>{m.code}</td>
                            <td style={tdStyle}>{m.description}</td>
                            <td style={{ ...tdStyle, color:Theme.textMuted }}>{m.uom}</td>
                            <td style={{ ...tdStyle, textAlign:'right' as const, fontWeight:600 }}>{fmt(m.issuedQty??0)}</td>
                            <td style={{ ...tdStyle, textAlign:'right' as const, color:Theme.info }}>{m.utilisedQty!==null&&m.utilisedQty!==undefined ? fmt(m.utilisedQty) : '—'}</td>
                            <td style={{ ...tdStyle, textAlign:'right' as const, fontWeight:600, color:bal>0?Theme.danger:Theme.success }}>{fmt(bal)}</td>
                            <td style={{ ...tdStyle, textAlign:'right' as const, color:Theme.textMuted }}>{fmt(m.returnQty??0)}</td>
                            <td style={tdStyle}>
                              <span style={{ fontSize:11, fontWeight:600, color:rs.color, background:rs.bg, padding:'2px 10px', borderRadius:20 }}>{rs.label}</span>
                            </td>
                            <td style={tdStyle}>
                              <span style={{ fontSize:11, fontWeight:600,
                                color: approved ? Theme.success : m.utilisedStatus==='pm_rejected' ? Theme.danger : Theme.warning,
                                background: approved ? Theme.successBg : m.utilisedStatus==='pm_rejected' ? '#FEF2F2' : Theme.warningBg,
                                padding:'2px 10px', borderRadius:20 }}>
                                {approved ? '✅ Approved' : m.utilisedStatus==='pm_rejected' ? '❌ Rejected' : m.utilisedStatus==='submitted' ? '🔄 Submitted' : '⏳ Pending'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background:Theme.primaryLight, fontWeight:700 }}>
                        <td colSpan={3} style={{ ...tdStyle, color:Theme.primary }}>Total</td>
                        <td style={{ ...tdStyle, textAlign:'right' as const, color:Theme.primary }}>{fmt(totalIssued)}</td>
                        <td style={{ ...tdStyle, textAlign:'right' as const, color:Theme.info }}>
                          {fmt(materials.reduce((a:number,m:any)=>a+(m.utilisedQty??0),0))}
                        </td>
                        <td style={{ ...tdStyle, textAlign:'right' as const, color:totalBalance>0?Theme.danger:Theme.success }}>{fmt(totalBalance)}</td>
                        <td style={{ ...tdStyle, textAlign:'right' as const, color:Theme.textMuted }}>{fmt(totalReturn)}</td>
                        <td colSpan={2} style={tdStyle}></td>
                      </tr>
                    </tfoot>
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
