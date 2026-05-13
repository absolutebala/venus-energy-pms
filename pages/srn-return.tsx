import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { T, card, badge, inputStyle } from '@/lib/theme';
import { STN_SRN_DATA, getVendorMaterials, getPMMaterials, getOverdueProjects, getPendingReturns, ProjectSTNSRN } from '@/lib/stnSrnData';

const STATUS_LABEL: Record<string,string> = {
  in_progress:'In Progress', delayed:'Delayed', completed:'Completed',
  billing_review:'Billing Review', pending:'Pending', submitted:'Submitted',
};

const RETURN_COLOR: Record<string,string> = {
  'Fully Returned':     T.success,
  'Partially Returned': '#D97706',
  'Pending Return':     '#DC2626',
  'Not Required':       T.textDim,
};

export default function STNSRNPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const role = profile?.role || 'viewer';

  const [search,      setSearch]      = useState('');
  const [focused,     setFocused]     = useState(false);
  const [expandedId,  setExpandedId]  = useState<string|null>(null);
  const [activeTab,   setActiveTab]   = useState<'ongoing'|'completed'>('ongoing');

  // Role-scoped data
  const scopedData = (() => {
    if (role === 'vendor') return getVendorMaterials('ABC Telecom Services'); // mock vendor
    if (role === 'project_manager') return getPMMaterials(profile?.full_name || 'Arun Kumar');
    if (role === 'site_engineer') return STN_SRN_DATA.filter(p => p.region === 'Tamil Nadu');
    return STN_SRN_DATA; // SA, RM, Accounting, Viewer see all
  })();

  const filtered = scopedData.filter(p =>
    !search ||
    p.projectId.toLowerCase().includes(search.toLowerCase()) ||
    p.projectName.toLowerCase().includes(search.toLowerCase()) ||
    p.poNo.toLowerCase().includes(search.toLowerCase()) ||
    p.vendor.toLowerCase().includes(search.toLowerCase())
  );

  const ongoingProjects   = filtered.filter(p => !['completed','billing_review'].includes(p.status));
  const completedProjects = filtered.filter(p => ['completed','billing_review'].includes(p.status));
  const overdueCount      = filtered.filter(p => p.isOverdue).length;
  const pendingReturnCount= filtered.reduce((a,p) => a + p.materials.filter(m=>m.returnQty>0).length, 0);

  const totalSTN = filtered.reduce((a,p) => a + p.materials.reduce((b,m)=>b+m.stnQty,0), 0);
  const totalSRN = filtered.reduce((a,p) => a + p.materials.reduce((b,m)=>b+m.srnQty,0), 0);

  const SectionTitle = ({ label }: { label:string }) => (
    <div style={{ fontSize:14, fontWeight:700, color:T.primary, marginBottom:16, paddingBottom:8, borderBottom:`2px solid ${T.primaryMid}`, display:'flex', alignItems:'center', gap:8 }}>
      {label}
    </div>
  );

  const MaterialTable = ({ project }: { project: ProjectSTNSRN }) => (
    <div style={{ marginTop:12, overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
        <thead>
          <tr style={{ background:T.bg }}>
            {['Item Code','Description','UOM','STN Qty (Issued)','SRN Qty (Returned)','Balance (Pending)','Return Status'].map(h=>(
              <th key={h} style={{ padding:'8px 10px', fontWeight:700, textTransform:'uppercase', fontSize:10, color:T.textMuted, textAlign:'left', borderBottom:`2px solid ${T.border}`, whiteSpace:'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {project.materials.map((m,i) => (
            <tr key={i} style={{ borderBottom:`1px solid ${T.border}` }}>
              <td style={{ padding:'9px 10px', color:T.primary, fontWeight:600 }}>{m.code}</td>
              <td style={{ padding:'9px 10px', color:T.text }}>{m.description}</td>
              <td style={{ padding:'9px 10px', color:T.textMuted }}>{m.uom}</td>
              <td style={{ padding:'9px 10px', fontWeight:600, color:T.text, textAlign:'right' }}>{m.stnQty.toLocaleString()}</td>
              <td style={{ padding:'9px 10px', fontWeight:600, color:T.success, textAlign:'right' }}>{m.srnQty.toLocaleString()}</td>
              <td style={{ padding:'9px 10px', fontWeight:700, color:m.returnQty>0?T.danger:T.success, textAlign:'right' }}>
                {m.returnQty.toLocaleString()}
                {m.returnQty > 0 && <span style={{ fontSize:10, marginLeft:4 }}>⚠️</span>}
              </td>
              <td style={{ padding:'9px 10px' }}>
                <span style={{ fontSize:11, fontWeight:600, color:RETURN_COLOR[m.returnStatus], background:`${RETURN_COLOR[m.returnStatus]}18`, padding:'3px 10px', borderRadius:20 }}>
                  {m.returnStatus}
                </span>
              </td>
            </tr>
          ))}
          {/* Totals row */}
          <tr style={{ background:T.bg, borderTop:`2px solid ${T.border}` }}>
            <td colSpan={3} style={{ padding:'9px 10px', fontWeight:700, color:T.text }}>Total</td>
            <td style={{ padding:'9px 10px', fontWeight:700, color:T.text, textAlign:'right' }}>{project.materials.reduce((a,m)=>a+m.stnQty,0).toLocaleString()}</td>
            <td style={{ padding:'9px 10px', fontWeight:700, color:T.success, textAlign:'right' }}>{project.materials.reduce((a,m)=>a+m.srnQty,0).toLocaleString()}</td>
            <td style={{ padding:'9px 10px', fontWeight:700, color:T.danger, textAlign:'right' }}>{project.materials.reduce((a,m)=>a+m.returnQty,0).toLocaleString()}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const ProjectRow = ({ project, showVendor = true }: { project: ProjectSTNSRN; showVendor?: boolean }) => {
    const isExpanded = expandedId === project.projectId;
    const pendingItems = project.materials.filter(m=>m.returnQty>0).length;
    const allReturned  = project.materials.every(m=>m.returnQty===0);

    return (
      <div style={{ border:`1.5px solid ${project.isOverdue?T.danger:allReturned?T.success:T.border}`, borderRadius:12, marginBottom:12, overflow:'hidden', transition:'all 0.15s' }}>
        <div onClick={()=>setExpandedId(isExpanded?null:project.projectId)}
          style={{ padding:'14px 18px', cursor:'pointer', background:isExpanded?T.primaryLight:T.surface, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
              <span style={{ fontSize:13, fontWeight:700, color:T.primary }}>{project.projectId}</span>
              <span style={{ fontSize:11, background:T.primaryLight, color:T.primary, padding:'1px 8px', borderRadius:10 }}>{project.poNo}</span>
              {project.isOverdue && <span style={{ fontSize:11, fontWeight:700, color:'#fff', background:T.danger, padding:'2px 8px', borderRadius:10 }}>⚠️ OVERDUE</span>}
            </div>
            <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{project.projectName}</div>
            {showVendor && <div style={{ fontSize:12, color:T.textMuted, marginTop:2 }}>Vendor: {project.vendor} · PM: {project.pm}</div>}
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:10, color:T.textDim, marginBottom:2 }}>STN Date</div>
              <div style={{ fontSize:12, fontWeight:600, color:T.text }}>{project.stnDate}</div>
            </div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:10, color:T.textDim, marginBottom:2 }}>SRN Date</div>
              <div style={{ fontSize:12, fontWeight:600, color:project.srnDate?T.success:T.danger }}>{project.srnDate || 'Pending'}</div>
            </div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:10, color:T.textDim, marginBottom:2 }}>Pending Items</div>
              <div style={{ fontSize:16, fontWeight:700, color:pendingItems>0?T.danger:T.success }}>{pendingItems}</div>
            </div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:10, color:T.textDim, marginBottom:2 }}>Status</div>
              <span style={{ fontSize:11, fontWeight:700, color:allReturned?T.success:pendingItems>0?T.danger:'#D97706', background:allReturned?T.successBg:pendingItems>0?'#FEF2F2':'#FFFBEB', padding:'3px 10px', borderRadius:20 }}>
                {allReturned ? '✅ All Returned' : pendingItems > 0 ? `${pendingItems} Pending` : 'Partial'}
              </span>
            </div>
            <div style={{ fontSize:18, color:T.textDim }}>{isExpanded?'▲':'▼'}</div>
          </div>
        </div>

        {isExpanded && (
          <div style={{ padding:'0 18px 18px', background:T.surface }}>
            <MaterialTable project={project} />
          </div>
        )}
      </div>
    );
  };

  const tabStyle = (t: string) => ({
    padding:'8px 20px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13,
    fontWeight:activeTab===t?700:400,
    background:activeTab===t?T.primary:'transparent',
    color:activeTab===t?'#fff':T.textMuted,
  });

  return (
    <Layout>
      <div className="fade-in">
        {/* Summary cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
          {[
            { label:'Total Projects Tracked', value:scopedData.length,     color:T.primary, icon:'📦' },
            { label:'Overdue Returns',         value:overdueCount,          color:T.danger,  icon:'⚠️' },
            { label:'Items Pending Return',    value:pendingReturnCount,    color:T.warning, icon:'⏳' },
            { label:'Total STN vs SRN',        value:`${totalSTN} / ${totalSRN}`, color:T.info, icon:'🔄' },
          ].map((s,i)=>(
            <div key={i} style={{ ...card, position:'relative', overflow:'hidden', padding:'16px 18px' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:s.color }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:10, color:T.textMuted, textTransform:'uppercase', letterSpacing:0.4, marginBottom:4 }}>{s.label}</div>
                  <div style={{ fontSize:22, fontWeight:700, color:s.color }}>{s.value}</div>
                </div>
                <div style={{ fontSize:22 }}>{s.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Overdue alert banner */}
        {overdueCount > 0 && (
          <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderLeft:`4px solid ${T.danger}`, borderRadius:8, padding:'12px 16px', marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:T.danger, marginBottom:2 }}>⚠️ {overdueCount} Project(s) with Overdue Material Returns</div>
              <div style={{ fontSize:12, color:T.textMuted }}>Materials from Indus have not been returned. This may affect vendor payment clearance.</div>
            </div>
            <span style={{ background:T.danger, color:'#fff', borderRadius:20, padding:'4px 14px', fontSize:13, fontWeight:700, flexShrink:0, marginLeft:12 }}>{overdueCount} Overdue</span>
          </div>
        )}

        {/* Search + Tabs */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
          <div style={{ display:'flex', gap:4, background:T.bg, padding:4, borderRadius:10 }}>
            <button onClick={()=>setActiveTab('ongoing')}   style={tabStyle('ongoing')}>Ongoing Projects ({ongoingProjects.length})</button>
            <button onClick={()=>setActiveTab('completed')} style={tabStyle('completed')}>Completed Projects ({completedProjects.length})</button>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
            placeholder="Search project, PO number, vendor…" style={{ ...inputStyle(focused), width:280 }} />
        </div>

        {activeTab === 'ongoing' && (
          <div>
            <div style={{ fontSize:13, color:T.textMuted, marginBottom:14 }}>
              📦 Materials currently held by vendors — issued from Indus via STN, pending SRN return.
            </div>
            {ongoingProjects.length === 0
              ? <div style={{ ...card, textAlign:'center', padding:60, color:T.textDim }}>No ongoing projects with material tracking.</div>
              : ongoingProjects.map(p => <ProjectRow key={p.projectId} project={p} showVendor={role !== 'vendor'} />)
            }
          </div>
        )}

        {activeTab === 'completed' && (
          <div>
            <div style={{ fontSize:13, color:T.textMuted, marginBottom:14 }}>
              ✅ Completed projects — full STN/SRN reconciliation. Verify all materials returned to Indus before releasing vendor payment.
            </div>
            {completedProjects.length === 0
              ? <div style={{ ...card, textAlign:'center', padding:60, color:T.textDim }}>No completed projects to show.</div>
              : completedProjects.map(p => <ProjectRow key={p.projectId} project={p} showVendor={role !== 'vendor'} />)
            }

            {/* Reconciliation summary for accounting */}
            {(role === 'super_admin' || role === 'accounting_team') && completedProjects.length > 0 && (
              <div style={{ ...card, border:`1.5px solid #7C3AED`, marginTop:20 }}>
                <div style={{ fontSize:14, fontWeight:700, color:'#7C3AED', marginBottom:14 }}>💳 Payment Clearance Summary</div>
                <table style={{ width:'100%' }}>
                  <thead>
                    <tr>{['Project','Vendor','STN Total','SRN Returned','Balance','Materials Cleared','Payment Status'].map(h=>(
                      <th key={h} style={{ padding:'8px 10px', fontSize:10, fontWeight:700, textTransform:'uppercase', color:T.textMuted, textAlign:'left', borderBottom:`2px solid ${T.border}` }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {completedProjects.map((p,i)=>{
                      const stn = p.materials.reduce((a,m)=>a+m.stnQty,0);
                      const srn = p.materials.reduce((a,m)=>a+m.srnQty,0);
                      const bal = p.materials.reduce((a,m)=>a+m.returnQty,0);
                      const cleared = bal === 0;
                      return (
                        <tr key={i} style={{ borderBottom:`1px solid ${T.border}` }}>
                          <td style={{ padding:'9px 10px', color:T.primary, fontWeight:700, fontSize:12 }}>{p.projectId}</td>
                          <td style={{ padding:'9px 10px', fontSize:12 }}>{p.vendor}</td>
                          <td style={{ padding:'9px 10px', textAlign:'right', fontWeight:600 }}>{stn}</td>
                          <td style={{ padding:'9px 10px', textAlign:'right', fontWeight:600, color:T.success }}>{srn}</td>
                          <td style={{ padding:'9px 10px', textAlign:'right', fontWeight:700, color:bal>0?T.danger:T.success }}>{bal}</td>
                          <td style={{ padding:'9px 10px' }}>
                            <span style={{ fontSize:11, fontWeight:700, color:cleared?T.success:T.danger, background:cleared?T.successBg:'#FEF2F2', padding:'3px 10px', borderRadius:20 }}>
                              {cleared ? '✅ Cleared' : '⚠️ Pending'}
                            </span>
                          </td>
                          <td style={{ padding:'9px 10px' }}>
                            <span style={{ fontSize:11, fontWeight:700, color:cleared?T.success:T.danger, background:cleared?T.successBg:'#FEF2F2', padding:'3px 10px', borderRadius:20 }}>
                              {cleared ? '✅ Release OK' : '🚫 Hold Payment'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
