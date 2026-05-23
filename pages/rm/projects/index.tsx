import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useProjects } from '@/context/ProjectContext';
import { useAuth } from '@/context/AuthContext';
import { T, card, btnPrimary, inputStyle, badge } from '@/lib/theme';


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

export default function RMProjectsPage() {
  const router = useRouter();
  const { projects: allProjects, loading } = useProjects();
  const { profile } = useAuth();
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [focused,      setFocused]      = useState(false);

  const rmName = profile?.full_name || '';
  const allRM  = (allProjects as any[]).filter(p => p.rm === rmName);

  const filtered = allRM.filter(p => {
    const s = search.toLowerCase();
    const matchSearch = !search ||
      (p.site||'').toLowerCase().includes(s) ||
      (p.id||'').toLowerCase().includes(s) ||
      (p.poNo||'').toLowerCase().includes(s);
    const matchStatus = statusFilter === 'All' || STATUS_LABEL[p.status] === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    total:      allRM.length,
    inProgress: allRM.filter(p=>p.status==='in_progress').length,
    delayed:    allRM.filter(p=>p.status==='delayed').length,
    completed:  allRM.filter(p=>p.status==='completed').length,
  };

  if (loading) return <Layout><div style={{ padding:40, textAlign:'center', color:T.textMuted }}>Loading…</div></Layout>;

  return (
    <Layout>
      <div className="fade-in">
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:22, fontWeight:800, color:T.text }}>Hello, {profile?.full_name||'RM'} 🗺️</div>
          <div style={{ fontSize:13, color:T.textMuted }}>Your region projects overview.</div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
          {[
            { label:'My Projects', value:counts.total,      color:T.primary, icon:'📁' },
            { label:'In Progress', value:counts.inProgress, color:T.info,    icon:'⚡' },
            { label:'Delayed',     value:counts.delayed,    color:T.danger,  icon:'⚠️' },
            { label:'Completed',   value:counts.completed,  color:T.success, icon:'🏁' },
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

        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:16, flexWrap:'wrap' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
            placeholder="Search project, PO number…" style={{ ...inputStyle(focused), width:240 }} />
          {['All','In Progress','Delayed','Completed','Billing Review'].map(f=>(
            <button key={f} onClick={()=>setStatusFilter(f)}
              style={{ padding:'6px 12px', borderRadius:6, border:'1px solid', cursor:'pointer', fontSize:12,
                borderColor:statusFilter===f?T.primary:T.border,
                background:statusFilter===f?T.primaryLight:'#fff',
                color:statusFilter===f?T.primary:T.textMuted,
                fontWeight:statusFilter===f?600:400 }}>{f}</button>
          ))}
        </div>

        {rmName === '' && (
          <div style={{ ...card, padding:16, color:T.danger, fontWeight:600, marginBottom:16 }}>
            ⚠️ Profile not loaded — cannot filter by RM name.
          </div>
        )}

        <div style={card}>
          <div style={{ overflowX:'auto' as const }}>
            <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
              <thead>
                <tr>{['#','Project','Site','PM','PO Value','Aging','Status','Actions'].map(h=>(
                  <th key={h} style={{ padding:'10px 12px', fontSize:11, fontWeight:700, textTransform:'uppercase',
                    color:T.primary, textAlign:'left', borderBottom:`2px solid ${T.primaryMid}`,
                    background:T.primaryLight, whiteSpace:'nowrap' as const }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {filtered.length===0 ? (
                  <tr><td colSpan={8} style={{ padding:40, textAlign:'center', color:T.textDim }}>No projects found.</td></tr>
                ) : filtered.map((p,i)=>{
                  const aging = getAging(p.startDate);
                  return (
                    <tr key={p.id} onClick={()=>router.push(`/rm/projects/${p.id}`)}
                      style={{ cursor:'pointer', background:i%2===0?'#fff':T.bg }}
                      onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background=T.primaryLight}
                      onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background=i%2===0?'#fff':T.bg}>
                      <td style={{ padding:'10px 12px', color:T.textMuted, fontSize:12 }}>{i+1}</td>
                      <td style={{ padding:'10px 12px' }}>
                        <div style={{ fontWeight:700, color:T.primary }}>{p.id}</div>
                        <div style={{ fontSize:10, color:T.textMuted }}>{p.poNo}</div>
                      </td>
                      <td style={{ padding:'10px 12px', fontWeight:500, color:T.text }}>{p.site}</td>
                      <td style={{ padding:'10px 12px', fontSize:12 }}>{p.pm||'—'}</td>
                      <td style={{ padding:'10px 12px', fontWeight:600 }}>{fmtL(p.poValue)}</td>
                      <td style={{ padding:'10px 12px' }}>
                        <span style={{ color:aging>90?T.danger:aging>60?'#D97706':T.success, fontWeight:700 }}>{aging}d</span>
                      </td>
                      <td style={{ padding:'10px 12px' }}>
                        <span style={{ fontSize:11, fontWeight:700, color:STATUS_COLOR[p.status]||T.textMuted,
                          background:`${STATUS_COLOR[p.status]||T.textMuted}18`, padding:'2px 8px', borderRadius:20 }}>
                          {STATUS_LABEL[p.status]||p.status}
                        </span>
                      </td>
                      <td style={{ padding:'10px 12px' }} onClick={e=>e.stopPropagation()}>
                        <button onClick={()=>router.push(`/rm/projects/${p.id}`)}
                          style={{ background:T.primary, color:'#fff', border:'none', borderRadius:6,
                            padding:'5px 14px', fontSize:12, cursor:'pointer', fontWeight:600 }}>View →</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
