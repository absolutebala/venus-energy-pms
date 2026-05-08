import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { T, card, badge, th, td, btnPrimary, btnSecondary, inputStyle } from '@/lib/theme';

const fmt = (v: number) => `₹${(v / 100000).toFixed(2)}L`;

const ALL_PROJECTS = [
  { id:'VE-2025-001', site:'Chennai North',     client:'Airtel', type:'Tower Erection',       vendor:'ABC Telecom Svcs',         poValue:1850000, aging:12, status:'in_progress', progress:65,  region:'TN' },
  { id:'VE-2025-002', site:'Bengaluru East',    client:'Jio',    type:'Tower Maintenance',     vendor:'XYZ Infra Solutions',      poValue:420000,  aging:78, status:'delayed',     progress:30,  region:'KA' },
  { id:'VE-2025-003', site:'Hyderabad Central', client:'Vi',     type:'Component Replacement', vendor:'TowerTech Pvt Ltd',        poValue:760000,  aging:22, status:'completed',   progress:100, region:'TS' },
  { id:'VE-2025-004', site:'Chennai South',     client:'BSNL',   type:'Fiber Installation',    vendor:'NetConnect Services',      poValue:1230000, aging:12, status:'in_progress', progress:45,  region:'TN' },
  { id:'VE-2025-005', site:'Coimbatore',        client:'Airtel', type:'Tower Erection',        vendor:'ABC Telecom Svcs',         poValue:2200000, aging:8,  status:'pending',     progress:10,  region:'TN' },
  { id:'VE-2025-006', site:'Pune West',         client:'Jio',    type:'Civil Works',           vendor:'BuildRight Constructions', poValue:540000,  aging:95, status:'delayed',     progress:20,  region:'MH' },
  { id:'VE-2025-007', site:'Mumbai Central',    client:'Vi',     type:'Power Works',           vendor:'PowerSys India',           poValue:890000,  aging:33, status:'in_progress', progress:75,  region:'MH' },
  { id:'VE-2025-008', site:'Delhi NCR',         client:'Airtel', type:'Tower Maintenance',     vendor:'XYZ Infra Solutions',      poValue:380000,  aging:18, status:'in_progress', progress:55,  region:'DL' },
  { id:'VE-2025-009', site:'Kochi',             client:'BSNL',   type:'Component Replacement', vendor:'TowerTech Pvt Ltd',        poValue:650000,  aging:62, status:'delayed',     progress:40,  region:'KL' },
  { id:'VE-2025-010', site:'Kolkata North',     client:'Jio',    type:'Fiber Installation',    vendor:'NetConnect Services',      poValue:975000,  aging:5,  status:'pending',     progress:0,   region:'WB' },
];

const MOCK_DRAFTS = [
  { id:'DRAFT-001', projectName:'Mysuru Tower Erection Phase 1', savedAt:'07/05/2025 10:15 AM', region:'Karnataka', type:'Tower Erection' },
  { id:'DRAFT-002', projectName:'Vizag Fiber Installation',       savedAt:'06/05/2025 03:42 PM', region:'Andhra Pradesh', type:'Fiber Installation' },
];

const STATUS_MAP: Record<string,string> = {
  in_progress:'in_progress', delayed:'delayed', completed:'completed', pending:'pending',
  'In Progress':'in_progress', Delayed:'delayed', Completed:'completed', Pending:'pending',
};

const STATUS_DISPLAY: Record<string,string> = {
  in_progress:'In Progress', delayed:'Delayed', completed:'Completed', pending:'Pending',
  submitted:'Submitted for Review', pm_approved:'PM Approved', billing_review:'Billing Review',
};

const STATUSES_FILTER = ['All','In Progress','Delayed','Completed','Pending'];
const TYPES = ['All','Tower Erection','Tower Maintenance','Component Replacement','Fiber Installation','Civil Works','Power Works'];

export default function ProjectsPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'region_manager';

  const [projects, setProjects] = useState(ALL_PROJECTS);
  const [drafts, setDrafts]     = useState(MOCK_DRAFTS);

  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter]     = useState('All');
  const [search, setSearch]             = useState('');
  const [focused, setFocused]           = useState(false);
  const [ageMin, setAgeMin]             = useState<number|null>(null);
  const [ageMax, setAgeMax]             = useState<number|null>(null);

  useEffect(() => {
    if (!router.isReady) return;
    const { status, ageMin: qMin, ageMax: qMax } = router.query;
    if (status && typeof status === 'string') {
      const mapped = STATUS_MAP[status];
      if (mapped) setStatusFilter(STATUS_DISPLAY[mapped] || mapped);
    }
    if (qMin && typeof qMin === 'string') setAgeMin(Number(qMin));
    if (qMax && typeof qMax === 'string') setAgeMax(Number(qMax));
  }, [router.isReady, router.query]);

  const filtered = projects.filter(p => {
    const displayStatus = STATUS_DISPLAY[p.status] || p.status;
    if (statusFilter !== 'All' && displayStatus !== statusFilter) return false;
    if (typeFilter !== 'All' && p.type !== typeFilter) return false;
    if (ageMin !== null && p.aging < ageMin) return false;
    if (ageMax !== null && ageMax < 999 && p.aging > ageMax) return false;
    if (search) {
      const s = search.toLowerCase();
      return p.site.toLowerCase().includes(s) || p.id.toLowerCase().includes(s) || p.client.toLowerCase().includes(s);
    }
    return true;
  });

  // Summary counts from source data
  const counts = {
    total: projects.length,
    inProgress: projects.filter(p => p.status === 'in_progress').length,
    delayed: projects.filter(p => p.status === 'delayed').length,
    completed: projects.filter(p => p.status === 'completed').length,
  };

  const deleteDraft = (id: string) => setDrafts(prev => prev.filter(d => d.id !== id));
  const submitDraft = (id: string) => {
    setDrafts(prev => prev.filter(d => d.id !== id));
  };

  return (
    <Layout>
      <div className="fade-in">

        {/* ── Draft Projects Section ── */}
        {drafts.length > 0 && (
          <div style={{ marginBottom:24 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <div style={{ fontSize:14, fontWeight:700, color:T.text }}>📝 Draft Projects</div>
              <span style={{ background:T.warningBg, color:T.warning, border:`1px solid #FDE68A`, fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:20 }}>{drafts.length}</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:`repeat(${Math.min(drafts.length,3)},1fr)`, gap:12 }}>
              {drafts.map((d) => (
                <div key={d.id} style={{ background:T.surface, border:`1.5px dashed ${T.warning}`, borderRadius:12, padding:16 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:3 }}>{d.projectName}</div>
                      <div style={{ fontSize:11, color:T.textDim }}>{d.type} · {d.region}</div>
                    </div>
                    <span style={{ background:T.warningBg, color:T.warning, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, flexShrink:0 }}>Draft</span>
                  </div>
                  <div style={{ fontSize:11, color:T.textDim, marginBottom:12 }}>Saved: {d.savedAt}</div>
                  <div style={{ display:'flex', gap:6 }}>
                    <Link href={`/projects/new?draft=${d.id}`} style={{ textDecoration:'none', flex:1 }}>
                      <button style={{ ...btnSecondary, width:'100%', justifyContent:'center', fontSize:12, padding:'6px 0' }}>✏️ Continue</button>
                    </Link>
                    <button onClick={() => submitDraft(d.id)} style={{ background:T.primaryLight, border:`1px solid ${T.primaryMid}`, borderRadius:8, padding:'6px 12px', color:T.primary, cursor:'pointer', fontSize:12, fontWeight:600 }}>
                      📤 Submit
                    </button>
                    {isAdmin && (
                      <button onClick={() => deleteDraft(d.id)} style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, padding:'6px 10px', color:T.danger, cursor:'pointer', fontSize:13 }} title="Delete draft">
                        🗑
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
          {[
            { label:'Total Projects', value:counts.total,      color:T.primary, icon:'📁', filter:'All'         },
            { label:'In Progress',    value:counts.inProgress, color:T.info,    icon:'⚡', filter:'In Progress' },
            { label:'Delayed',        value:counts.delayed,    color:T.danger,  icon:'⚠️', filter:'Delayed'     },
            { label:'Completed',      value:counts.completed,  color:T.success, icon:'✅', filter:'Completed'   },
          ].map((s,i) => (
            <div key={i} onClick={() => { setStatusFilter(statusFilter===s.filter?'All':s.filter); setAgeMin(null); setAgeMax(null); }}
              style={{ ...card, position:'relative', overflow:'hidden', padding:'16px 18px', cursor:'pointer', borderColor:statusFilter===s.filter?s.color:T.border, transition:'all 0.15s' }}
              onMouseEnter={e=>{ const el=e.currentTarget as HTMLDivElement; el.style.transform='translateY(-1px)'; el.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'; }}
              onMouseLeave={e=>{ const el=e.currentTarget as HTMLDivElement; el.style.transform='translateY(0)'; el.style.boxShadow='0 1px 3px rgba(0,0,0,0.06)'; }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:s.color }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:11, color:T.textMuted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>{s.label}</div>
                  <div style={{ fontSize:28, fontWeight:700, color:T.text }}>{s.value}</div>
                </div>
                <div style={{ fontSize:22 }}>{s.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Active filters indicator */}
        {(ageMin !== null || statusFilter !== 'All') && (
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, flexWrap:'wrap' }}>
            {ageMin !== null && (
              <div style={{ background:T.primaryLight, border:`1px solid ${T.primaryMid}`, borderRadius:20, padding:'4px 14px', fontSize:12, color:T.primary, fontWeight:600, display:'flex', alignItems:'center', gap:8 }}>
                ⏰ PO Aging: {ageMin}–{ageMax && ageMax<999?ageMax+'d':'90+d'}
                <button onClick={()=>{ setAgeMin(null); setAgeMax(null); }} style={{ background:'none', border:'none', cursor:'pointer', color:T.primary, fontWeight:700, fontSize:14, lineHeight:1 }}>×</button>
              </div>
            )}
            {statusFilter !== 'All' && (
              <div style={{ background:T.primaryLight, border:`1px solid ${T.primaryMid}`, borderRadius:20, padding:'4px 14px', fontSize:12, color:T.primary, fontWeight:600, display:'flex', alignItems:'center', gap:8 }}>
                Status: {statusFilter}
                <button onClick={()=>setStatusFilter('All')} style={{ background:'none', border:'none', cursor:'pointer', color:T.primary, fontWeight:700, fontSize:14, lineHeight:1 }}>×</button>
              </div>
            )}
          </div>
        )}

        {/* Filters + Table */}
        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} placeholder="Search site, project ID, client…" style={{ ...inputStyle(focused), width:240 }} />
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            {STATUSES_FILTER.map(f => (
              <button key={f} onClick={()=>{ setStatusFilter(f); setAgeMin(null); setAgeMax(null); }} style={{ padding:'6px 12px', borderRadius:6, border:'1px solid', borderColor:statusFilter===f?T.primary:T.border, background:statusFilter===f?T.primaryLight:'#fff', color:statusFilter===f?T.primary:T.textMuted, fontSize:12, cursor:'pointer', fontWeight:statusFilter===f?600:400 }}>{f}</button>
            ))}
          </div>
          <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={{ ...inputStyle(), width:'auto', marginLeft:'auto' }}>
            {TYPES.map(t=><option key={t}>{t}</option>)}
          </select>
          <button onClick={() => router.push('/projects/new')} style={btnPrimary}>+ New Project</button>
        </div>

        <div style={card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div style={{ fontSize:14, fontWeight:600, color:T.text }}>
              {statusFilter==='All' && ageMin===null ? 'All Projects' : statusFilter!=='All' ? `${statusFilter} Projects` : `PO Aging ${ageMin}–${ageMax&&ageMax<999?ageMax+'d':'90+d'}`} · {filtered.length} records
            </div>
            <div style={{ display:'flex', gap:6 }}>
              {[{c:T.danger,l:`${projects.filter(p=>p.aging>60).length} critical`},{c:T.warning,l:`${counts.delayed} delayed`},{c:T.success,l:`${counts.completed} done`}].map((s,i)=>(
                <span key={i} style={{ fontSize:11, color:s.c, background:`${s.c}15`, padding:'3px 10px', borderRadius:20 }}>{s.l}</span>
              ))}
            </div>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%' }}>
              <thead>
                <tr>{['#','Project ID','Site / Region','Job Type','Client','Vendor','PO Value','Aging','Progress','Status','Actions'].map(h=><th key={h} style={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.length===0 ? (
                  <tr><td colSpan={11} style={{ ...td, textAlign:'center', padding:40, color:T.textDim }}>No projects match the current filter.</td></tr>
                ) : filtered.map((p,i) => (
                  <tr key={i} onClick={() => router.push(`/projects/${p.id}`)} style={{ cursor:'pointer' }}
                    onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background=T.primaryLight}
                    onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background='transparent'}>
                    <td style={{ ...td, color:T.textDim }}>{i+1}</td>
                    <td style={{ ...td, color:T.primary, fontWeight:700 }}>{p.id}</td>
                    <td style={td}><div style={{ fontWeight:500, color:T.text }}>{p.site}</div><div style={{ fontSize:11, color:T.textDim }}>{p.region}</div></td>
                    <td style={td}><span style={{ fontSize:11, background:T.primaryLight, color:T.primary, padding:'2px 8px', borderRadius:5, fontWeight:500, whiteSpace:'nowrap' }}>{p.type}</span></td>
                    <td style={td}>{p.client}</td>
                    <td style={{ ...td, fontSize:12 }}>{p.vendor}</td>
                    <td style={{ ...td, fontWeight:600, color:T.text, whiteSpace:'nowrap' }}>{fmt(p.poValue)}</td>
                    <td style={td}><span style={{ color:p.aging>60?T.danger:p.aging>30?T.warning:T.success, fontWeight:700 }}>{p.aging}d</span></td>
                    <td style={{ ...td, minWidth:120 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <div style={{ flex:1, height:5, background:T.border, borderRadius:3 }}>
                          <div style={{ height:'100%', width:`${p.progress}%`, background:p.progress===100?T.success:p.status==='delayed'?T.danger:T.primary, borderRadius:3 }} />
                        </div>
                        <span style={{ fontSize:11, color:T.textDim, minWidth:28 }}>{p.progress}%</span>
                      </div>
                    </td>
                    <td style={td}><span style={badge(STATUS_DISPLAY[p.status]||p.status)}>{STATUS_DISPLAY[p.status]||p.status}</span></td>
                    <td style={td} onClick={e=>e.stopPropagation()}>
                      <div style={{ display:'flex', gap:4 }}>
                        <Link href={`/projects/${p.id}`} style={{ textDecoration:'none' }} onClick={e=>e.stopPropagation()}>
                          <button style={{ background:T.primaryLight, border:'none', borderRadius:5, padding:'4px 8px', color:T.primary, cursor:'pointer', fontSize:12 }}>👁</button>
                        </Link>
                        <button style={{ background:T.primaryLight, border:'none', borderRadius:5, padding:'4px 8px', color:T.primary, cursor:'pointer', fontSize:12 }}>✏️</button>
                        {isAdmin && <button onClick={()=>setProjects(prev=>prev.filter(x=>x.id!==p.id))} style={{ background:'#FEF2F2', border:'none', borderRadius:5, padding:'4px 8px', color:T.danger, cursor:'pointer', fontSize:12 }}>🗑</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding:'10px 0', borderTop:`1px solid ${T.border}`, fontSize:11, color:T.textDim, marginTop:4 }}>
            Showing {filtered.length} of {projects.length} projects · Click any row to view details
          </div>
        </div>
      </div>
    </Layout>
  );
}
