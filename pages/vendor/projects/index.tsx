import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useProjects } from '@/context/ProjectContext';
import { useAuth } from '@/context/AuthContext';
import { useWorkDocs } from '@/context/WorkDocContext';
import { T, card, inputStyle } from '@/lib/theme';


const STATUS_COLOR: Record<string,string> = {
  not_started:'#6B7280', in_progress:'#2563EB', delayed:'#DC2626', on_hold:'#7C3AED',
  submitted:'#7C3AED', under_review:'#7C3AED', pm_approved:'#0D9488',
  billing_review:'#D97706', completed:'#16A34A',
};
const STATUS_LABEL: Record<string,string> = {
  not_started:'Not Started', in_progress:'In Progress', delayed:'Delayed', on_hold:'On Hold',
  submitted:'Submitted', under_review:'Under Review', pm_approved:'PM Approved',
  billing_review:'Pending Invoice', completed:'Completed',
};
const PROGRESS_MAP: Record<string,number> = {
  not_started:0, pending:5, in_progress:45, delayed:40, submitted:70,
  under_review:75, pm_approved:85, billing_review:90, completed:100,
};
const fmtDate = (d: string) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); }
  catch { return d; }
};
const fmtL = (v: number) => v ? '₹'+Number(v/100000).toFixed(1)+'L' : '—';
const getAging = (startDate: string) => startDate
  ? Math.floor((Date.now() - new Date(startDate).getTime()) / 86400000) : 0;

const STATUS_LABELS: Record<string,{label:string;color:string;bg:string}> = {
  not_started:    { label:'Not Started',    color:'#6B7280', bg:'#F9FAFB' },
  pending:        { label:'Pending',        color:'#D97706', bg:'#FFFBEB' },
  in_progress:    { label:'In Progress',    color:'#2563EB', bg:'#EFF6FF' },
  delayed:        { label:'Delayed',        color:'#DC2626', bg:'#FEF2F2' },
  submitted:      { label:'Submitted',      color:'#7C3AED', bg:'#F5F3FF' },
  pm_approved:    { label:'PM Approved',    color:'#0D9488', bg:'#F0FDFA' },
  billing_review: { label:'Billing Review', color:'#D97706', bg:'#FFFBEB' },
  completed:      { label:'Completed',      color:'#16A34A', bg:'#F0FDF4' },
};

const DOC_KEYS = ['safety_photos','site_photos','jmr_document','ac_certificate','noc_document','drawing_document','ptw_document'];

export default function VendorProjectsPage() {
  const router = useRouter();
  const { projects: allProjects, loading } = useProjects();
  const { profile } = useAuth();
  const { getDocStatus } = useWorkDocs();
  const [search,  setSearch]  = useState('');
  const [focused, setFocused] = useState(false);

  const vendorName = profile?.full_name || '';
  const myProjects = (allProjects as any[]).filter(p => p.vendor === vendorName);

  const filtered = myProjects.filter(p => {
    const s = search.toLowerCase();
    return !search ||
      (p.site||'').toLowerCase().includes(s) ||
      (p.id||'').toLowerCase().includes(s) ||
      (p.poNo||'').toLowerCase().includes(s);
  });

  const counts = {
    total:      myProjects.length,
    inProgress: myProjects.filter(p=>p.status==='in_progress').length,
    pending:    myProjects.filter(p=>['pending','not_started'].includes(p.status)).length,
    docsPending: myProjects.reduce((a,p) => {
      const ds = getDocStatus(p.id);
      return a + DOC_KEYS.filter(k => !ds[k]).length;
    }, 0),
  };

  if (loading) return <Layout><div style={{ padding:40, textAlign:'center', color:T.textMuted }}>Loading…</div></Layout>;

  return (
    <Layout>
      <div className="fade-in">
        <div style={{ ...card, marginBottom:20, background:`linear-gradient(135deg, ${T.primaryLight}, #E0FDF4)`, border:`1px solid ${T.primaryMid}` }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:48, height:48, borderRadius:12, background:`linear-gradient(135deg,${T.primary},#0F766E)`,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, color:'#fff', flexShrink:0 }}>🏢</div>
            <div>
              <div style={{ fontSize:16, fontWeight:700, color:T.text }}>Welcome, {vendorName||'Vendor'}</div>
              <div style={{ fontSize:13, color:T.textMuted }}>
                You have <strong style={{ color:T.primary }}>{myProjects.length} project{myProjects.length!==1?'s':''}</strong> assigned.
                Upload documents and update work status to proceed.
              </div>
            </div>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
          {[
            { label:'Total Projects',  value:counts.total,      color:T.primary, icon:'📁' },
            { label:'In Progress',     value:counts.inProgress, color:T.info,    icon:'⚡' },
            { label:'Pending Action',  value:counts.pending,    color:T.warning, icon:'⏳' },
            { label:'Docs Pending',    value:counts.docsPending,color:T.danger,  icon:'📂' },
          ].map((s,i)=>(
            <div key={i} style={{ ...card, position:'relative', overflow:'hidden', padding:'16px 18px' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:s.color }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:11, color:T.textMuted, textTransform:'uppercase', marginBottom:4 }}>{s.label}</div>
                  <div style={{ fontSize:26, fontWeight:700, color:T.text }}>{s.value}</div>
                </div>
                <div style={{ fontSize:22 }}>{s.icon}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div style={{ fontSize:14, fontWeight:700, color:T.text }}>My Assigned Projects</div>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
            placeholder="Search…" style={{ ...inputStyle(focused), width:200 }} />
        </div>

        {vendorName === '' && (
          <div style={{ ...card, padding:16, color:T.danger, fontWeight:600, marginBottom:16 }}>
            ⚠️ Profile not loaded — cannot filter by vendor name.
          </div>
        )}

        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign:'center', padding:40, color:T.textDim }}>
            <div style={{ fontSize:36, marginBottom:12 }}>📭</div>
            <div>No projects assigned to {vendorName||'you'}.</div>
          </div>
        ) : filtered.map((p, i) => {
          const st = STATUS_LABELS[p.status] || STATUS_LABELS.pending;
          const docStatus = getDocStatus(p.id);
          const docsUploaded = DOC_KEYS.filter(k => docStatus[k]).length;
          const docsRequired = DOC_KEYS.length;
          const docPct = Math.round((docsUploaded / docsRequired) * 100);
          const progress = PROGRESS_MAP[p.status] || 0;
          const needsAction = ['pending','in_progress','not_started'].includes(p.status);
          const aging = getAging(p.startDate);

          return (
            <div key={p.id} onClick={() => router.push(`/vendor/projects/${p.id}`)}
              style={{ border:`1px solid ${needsAction?T.primary:T.border}`, borderRadius:12, padding:18,
                marginBottom:12, cursor:'pointer', background:needsAction?T.primaryLight:T.surface }}
              onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.boxShadow='0 4px 16px rgba(13,148,136,0.12)'}
              onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.boxShadow='none'}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10, marginBottom:12 }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                    <span style={{ fontSize:15, fontWeight:700, color:T.primary }}>{p.id}</span>
                    <span style={{ background:st.bg, color:st.color, border:`1px solid ${st.color}40`,
                      padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700 }}>{st.label}</span>
                  </div>
                  <div style={{ fontSize:14, fontWeight:600, color:T.text }}>{p.site}</div>
                  <div style={{ fontSize:12, color:T.textMuted }}>{p.region} · {p.jobType||'—'} · Aging: {aging}d</div>
                </div>
                <div style={{ textAlign:'right' as const }}>
                  <div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>Delivery Date</div>
                  <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{fmtDate(p.endDate)}</div>
                  <div style={{ fontSize:11, color:T.textMuted, marginTop:4 }}>PO: {fmtL(p.poValue)}</div>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:T.textMuted, marginBottom:4 }}>
                    <span>Work Progress</span><span style={{ fontWeight:700, color:T.primary }}>{progress}%</span>
                  </div>
                  <div style={{ height:6, background:T.border, borderRadius:3 }}>
                    <div style={{ height:'100%', width:`${progress}%`, background:T.primary, borderRadius:3 }} />
                  </div>
                </div>
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:T.textMuted, marginBottom:4 }}>
                    <span>Documents</span>
                    <span style={{ fontWeight:700, color:docPct===100?T.success:T.warning }}>{docsUploaded}/{docsRequired} uploaded</span>
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
    </Layout>
  );
}
