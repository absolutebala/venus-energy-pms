import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { T, card, badge, th, td, inputStyle } from '@/lib/theme';

// Vendor sees only projects assigned to them
const vendorProjects = [
  { id:'VE-2025-001', site:'Chennai North',     client:'Airtel', type:'Tower Erection',       scope:'Civil foundation and structure works for Station 3 & 4.', status:'in_progress',  progress:65,  docsUploaded:2, docsRequired:6, deadline:'30/06/2025' },
  { id:'VE-2025-004', site:'Chennai South',     client:'BSNL',   type:'Fiber Installation',   scope:'Fiber laying along Station 5 to 12 route, 4.5km span.',    status:'in_progress',  progress:45,  docsUploaded:0, docsRequired:6, deadline:'15/07/2025' },
  { id:'VE-2025-005', site:'Coimbatore',        client:'Airtel', type:'Tower Erection',       scope:'New tower erection at Coimbatore North industrial zone.',   status:'pending',      progress:10,  docsUploaded:0, docsRequired:6, deadline:'31/08/2025' },
];

const STATUS_LABELS: Record<string,{label:string;color:string;bg:string}> = {
  pending:       { label:'Pending',              color:'#D97706', bg:'#FFFBEB' },
  in_progress:   { label:'In Progress',          color:'#2563EB', bg:'#EFF6FF' },
  submitted:     { label:'Submitted for Review', color:'#7C3AED', bg:'#F5F3FF' },
  rejected:      { label:'Rejected — Action Needed', color:'#DC2626', bg:'#FEF2F2' },
  pm_approved:   { label:'PM Approved',          color:'#0D9488', bg:'#F0FDFA' },
  billing_review:{ label:'Billing Review',       color:'#D97706', bg:'#FFFBEB' },
  completed:     { label:'Completed',            color:'#16A34A', bg:'#F0FDF4' },
  delayed:       { label:'Delayed',              color:'#DC2626', bg:'#FEF2F2' },
};

export default function VendorProjectsPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const [focused, setFocused] = useState(false);

  const filtered = vendorProjects.filter(p =>
    !search || p.site.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="fade-in">
        {/* Welcome banner */}
        <div style={{ ...card, marginBottom:20, background:`linear-gradient(135deg, ${T.primaryLight}, #E0FDF4)`, border:`1px solid ${T.primaryMid}` }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:48, height:48, borderRadius:12, background:`linear-gradient(135deg,${T.primary},#0F766E)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, color:'#fff', flexShrink:0 }}>🏢</div>
            <div>
              <div style={{ fontSize:16, fontWeight:700, color:T.text }}>Welcome, {profile?.full_name || 'Vendor'}</div>
              <div style={{ fontSize:13, color:T.textMuted }}>You have <strong style={{ color:T.primary }}>{vendorProjects.length} projects</strong> assigned to you. Update work status and upload documents to proceed.</div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
          {[
            { label:'Total Projects',  value:vendorProjects.length,                                      color:T.primary, icon:'📁' },
            { label:'In Progress',     value:vendorProjects.filter(p=>p.status==='in_progress').length,  color:T.info,    icon:'⚡' },
            { label:'Pending Action',  value:vendorProjects.filter(p=>p.status==='pending'||p.status==='rejected').length, color:T.warning, icon:'⏳' },
            { label:'Docs Pending',    value:vendorProjects.reduce((a,p)=>a+(p.docsRequired-p.docsUploaded),0), color:T.danger, icon:'📂' },
          ].map((s,i) => (
            <div key={i} style={{ ...card, position:'relative', overflow:'hidden', padding:'16px 18px' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:s.color }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:11, color:T.textMuted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>{s.label}</div>
                  <div style={{ fontSize:26, fontWeight:700, color:T.text }}>{s.value}</div>
                </div>
                <div style={{ fontSize:22 }}>{s.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Projects list */}
        <div style={card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div style={{ fontSize:14, fontWeight:600, color:T.text }}>My Assigned Projects</div>
            <input value={search} onChange={e=>setSearch(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} placeholder="Search…" style={{ ...inputStyle(focused), width:200 }} />
          </div>

          {filtered.map((p, i) => {
            const st = STATUS_LABELS[p.status] || STATUS_LABELS.pending;
            const docPct = Math.round((p.docsUploaded / p.docsRequired) * 100);
            const needsAction = p.status === 'pending' || p.status === 'in_progress' || p.status === 'rejected';

            return (
              <div key={i} onClick={() => router.push(`/vendor/projects/${p.id}`)}
                style={{ border:`1px solid ${needsAction?T.primary:T.border}`, borderRadius:12, padding:18, marginBottom:12, cursor:'pointer', transition:'all 0.15s', background: needsAction ? T.primaryLight : T.surface }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(13,148,136,0.12)'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'}>

                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10, marginBottom:12 }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                      <span style={{ fontSize:15, fontWeight:700, color:T.primary }}>{p.id}</span>
                      <span style={{ background:st.bg, color:st.color, border:`1px solid ${st.color}40`, padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700 }}>{st.label}</span>
                    </div>
                    <div style={{ fontSize:14, fontWeight:600, color:T.text }}>{p.site}</div>
                    <div style={{ fontSize:12, color:T.textMuted }}>{p.client} · {p.type}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Deadline</div>
                    <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{p.deadline}</div>
                  </div>
                </div>

                <div style={{ fontSize:13, color:T.textMuted, marginBottom:12, padding:'8px 12px', background:'rgba(255,255,255,0.7)', borderRadius:8 }}>
                  📋 {p.scope}
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:T.textMuted, marginBottom:4 }}>
                      <span>Work Progress</span><span style={{ fontWeight:700, color:T.primary }}>{p.progress}%</span>
                    </div>
                    <div style={{ height:6, background:T.border, borderRadius:3 }}>
                      <div style={{ height:'100%', width:`${p.progress}%`, background:T.primary, borderRadius:3 }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:T.textMuted, marginBottom:4 }}>
                      <span>Documents</span><span style={{ fontWeight:700, color:docPct===100?T.success:T.warning }}>{p.docsUploaded}/{p.docsRequired} uploaded</span>
                    </div>
                    <div style={{ height:6, background:T.border, borderRadius:3 }}>
                      <div style={{ height:'100%', width:`${docPct}%`, background:docPct===100?T.success:T.warning, borderRadius:3 }} />
                    </div>
                  </div>
                </div>

                {needsAction && (
                  <div style={{ marginTop:12, display:'flex', justifyContent:'flex-end' }}>
                    <span style={{ fontSize:12, color:T.primary, fontWeight:600 }}>Click to update work status & upload documents →</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
