import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useProjects } from '@/context/ProjectContext';
import { useAuth } from '@/context/AuthContext';
import { T, card, btnPrimary, inputStyle } from '@/lib/theme';


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

export default function PMProjectsPage() {
  const router  = useRouter();
  const { projects: allProjects, loading } = useProjects();
  const { profile } = useAuth();
  const [search,    setSearch]    = useState('');
  const [focused,   setFocused]   = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');

  useEffect(() => {
    if (!router.isReady) return;
    const { status } = router.query;
    if (status) setActiveTab(`status:${status}`);
  }, [router.isReady, router.query]);

  const pmName = profile?.full_name || '';
  const myProjects = (allProjects as any[]).filter(p => p.pm === pmName);

  const enrich = (p: any) => ({
    ...p,
    vendorAssigned: !!p.vendor,
    aging:    getAging(p.startDate),
    deadline: fmtDate(p.endDate),
    progress: PROGRESS_MAP[p.status] || 0,
    poValueFmt: fmtL(p.poValue),
  });

  const enriched = myProjects.map(enrich);

  const groups = {
    unassigned: enriched.filter(p => !p.vendorAssigned),
    assigned:   enriched.filter(p => p.vendorAssigned && !['billing_review','completed'].includes(p.status)),
    billing:    enriched.filter(p => p.status === 'billing_review'),
    completed:  enriched.filter(p => p.status === 'completed'),
  };

  const filtered = enriched.filter(p => {
    const s = search.toLowerCase();
    const matchSearch = !search ||
      (p.site||'').toLowerCase().includes(s) ||
      (p.id||'').toLowerCase().includes(s) ||
      (p.poNo||'').toLowerCase().includes(s) ||
      (p.indusId||'').toLowerCase().includes(s);
    if (!matchSearch) return false;
    if (activeTab === 'all')        return true;
    if (activeTab === 'unassigned') return !p.vendorAssigned;
    if (activeTab === 'assigned')   return p.vendorAssigned && !['billing_review','completed'].includes(p.status);
    if (activeTab === 'billing')    return p.status === 'billing_review';
    if (activeTab === 'completed')  return p.status === 'completed';
    if (activeTab.startsWith('status:')) return p.status === activeTab.replace('status:','');
    return true;
  });

  const tabStyle = (t: string) => ({
    padding:'7px 14px', borderRadius:7, border:'none', cursor:'pointer', fontSize:12,
    fontWeight: activeTab===t ? 700 : 400,
    background: activeTab===t ? T.primary : 'transparent',
    color: activeTab===t ? '#fff' : T.textMuted,
  });

  const ProjectCard = ({ p }: { p: any }) => {
    const st = STATUS_COLOR[p.status] || T.textDim;
    return (
      <div onClick={() => router.push(`/pm/projects/${p.id}`)}
        style={{ background:T.surface, border:`1.5px solid ${!p.vendorAssigned?T.danger:T.border}`, borderRadius:12, padding:18, cursor:'pointer' }}
        onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.boxShadow='0 4px 16px rgba(0,0,0,0.1)'}
        onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.boxShadow='none'}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:T.primary, marginBottom:3 }}>{p.id}</div>
            <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:2 }}>{p.site}</div>
            <div style={{ fontSize:11, color:T.textMuted }}>{p.vendor||'No vendor'} · {p.jobType||p.type||'—'}</div>
          </div>
          <span style={{ background:`${st}18`, color:st, border:`1px solid ${st}40`, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, whiteSpace:'nowrap' as const }}>
            {STATUS_LABEL[p.status]||p.status}
          </span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8, marginBottom:10 }}>
          <div style={{ fontSize:11, color:T.textMuted }}>PO: <strong style={{ color:T.text }}>{p.poValueFmt}</strong></div>
          <div style={{ fontSize:11, color:T.textMuted }}>Aging: <strong style={{ color:p.aging>60?T.danger:T.success }}>{p.aging}d</strong></div>
          <div style={{ fontSize:11, color:T.textMuted }}>Due: <strong style={{ color:T.text }}>{p.deadline}</strong></div>
          <div style={{ fontSize:11, color:T.textMuted }}>Progress: <strong style={{ color:T.primary }}>{p.progress}%</strong></div>
        </div>
        <div style={{ height:4, background:T.border, borderRadius:2, marginBottom:10 }}>
          <div style={{ height:'100%', width:`${p.progress}%`, background:p.status==='delayed'?T.danger:p.status==='completed'?T.success:T.primary, borderRadius:2 }} />
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          {p.vendorAssigned
            ? <span style={{ fontSize:11, color:T.textMuted }}>Vendor: <strong style={{ color:T.text }}>{p.vendor}</strong></span>
            : <span style={{ fontSize:11, color:T.danger, fontWeight:600 }}>⚠️ No vendor assigned</span>}
          <span style={{ fontSize:11, fontWeight:600, color:p.vendorAssigned?T.success:T.danger,
            background:p.vendorAssigned?T.successBg:'#FEF2F2', padding:'2px 8px', borderRadius:10 }}>
            {p.vendorAssigned ? '✓ Assigned' : 'Action Required'}
          </span>
        </div>
      </div>
    );
  };

  if (loading) return <Layout><div style={{ padding:40, textAlign:'center', color:T.textMuted }}>Loading projects…</div></Layout>;

  return (
    <Layout>
      <div className="fade-in">
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:22, fontWeight:800, color:T.text }}>Hello, {profile?.full_name||'PM'} 📋</div>
          <div style={{ fontSize:13, color:T.textMuted, marginTop:2 }}>Your assigned projects and action items.</div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:20 }}>
          {[
            { label:'My Projects',    value:enriched.length,          color:T.primary, icon:'📁', tab:'all'        },
            { label:'Vendor Required',value:groups.unassigned.length, color:T.danger,  icon:'⚠️', tab:'unassigned' },
            { label:'Active',         value:groups.assigned.length,   color:T.success, icon:'✅', tab:'assigned'   },
            { label:'Pending Invoice',value:groups.billing.length,    color:'#7C3AED', icon:'💳', tab:'billing'    },
            { label:'Completed',      value:groups.completed.length,  color:T.info,    icon:'🏁', tab:'completed'  },
          ].map((s,i)=>(
            <div key={i} onClick={()=>setActiveTab(s.tab)}
              style={{ ...card, position:'relative', overflow:'hidden', padding:'14px 16px', cursor:'pointer',
                borderColor:activeTab===s.tab?s.color:T.border }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:s.color }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:10, color:T.textMuted, textTransform:'uppercase', marginBottom:4 }}>{s.label}</div>
                  <div style={{ fontSize:24, fontWeight:700, color:activeTab===s.tab?s.color:T.text }}>{s.value}</div>
                </div>
                <div style={{ fontSize:20 }}>{s.icon}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
          <div style={{ display:'flex', gap:4, background:T.bg, padding:4, borderRadius:10, flexWrap:'wrap' }}>
            {[
              { key:'all',        label:`All (${enriched.length})`                    },
              { key:'unassigned', label:`Action Required (${groups.unassigned.length})` },
              { key:'assigned',   label:`Active (${groups.assigned.length})`           },
              { key:'billing',    label:`Pending Invoice (${groups.billing.length})`   },
              { key:'completed',  label:`Completed (${groups.completed.length})`       },
            ].map(t=>(
              <button key={t.key} onClick={()=>setActiveTab(t.key)} style={tabStyle(t.key)}>{t.label}</button>
            ))}
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
            placeholder="Search project, PO number…" style={{ ...inputStyle(focused), width:220 }} />
        </div>

        {pmName === '' && (
          <div style={{ ...card, padding:20, color:T.danger, fontWeight:600, marginBottom:16 }}>
            ⚠️ Profile not loaded — cannot filter projects by PM.
          </div>
        )}

        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign:'center', padding:60, color:T.textDim }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
            <div style={{ fontSize:14 }}>No projects in this category.</div>
            <button onClick={()=>setActiveTab('all')} style={{ ...btnPrimary, marginTop:16, fontSize:13 }}>Show All</button>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:14 }}>
            {filtered.map(p => <ProjectCard key={p.id} p={p} />)}
          </div>
        )}
      </div>
    </Layout>
  );
}
