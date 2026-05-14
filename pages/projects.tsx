import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { T, card, badge, th, td, btnPrimary, btnSecondary, inputStyle } from '@/lib/theme';
import { MOCK_PROJECTS } from '@/lib/projectData';

const fmt = (v: number) => `₹${(v / 100000).toFixed(2)}L`;

const STATUS_DISPLAY: Record<string,string> = {
  in_progress:'In Progress', delayed:'Delayed', completed:'Completed', pending:'Pending',
  submitted:'Submitted', pm_approved:'PM Approved', billing_review:'Billing Review',
};

const STATUSES_FILTER = ['All','In Progress','Delayed','Completed','Pending','Billing Review'];
const TYPES = ['All','Tower Erection','Tower Maintenance','Component Replacement','Fiber Installation','Civil Works','Power Works'];

const MOCK_DRAFTS = [
  { id:'DRAFT-001', projectName:'Mysuru Tower Erection Phase 1', poNo:'PO-2025-006', indusId:'IND-2001', savedAt:'07/05/2025 10:15 AM', region:'Karnataka',      type:'Tower Erection'    },
  { id:'DRAFT-002', projectName:'Vizag Fiber Installation',       poNo:'PO-2025-007', indusId:'IND-2002', savedAt:'06/05/2025 03:42 PM', region:'Andhra Pradesh', type:'Fiber Installation' },
];

export default function ProjectsPage() {
  const router = useRouter();
  const { profile, can, loading } = useAuth();
  const isAdmin = !loading && (can('projects', 'create') || can('projects', 'delete'));

  const [projects, setProjects] = useState(MOCK_PROJECTS);
  const [drafts, setDrafts]     = useState(MOCK_DRAFTS);
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter,   setTypeFilter]   = useState('All');
  const [search,       setSearch]       = useState('');
  const [focused,      setFocused]      = useState(false);
  const [ageMin,       setAgeMin]       = useState<number|null>(null);
  const [ageMax,       setAgeMax]       = useState<number|null>(null);
  const [pmFilter,     setPmFilter]     = useState('');
  const [vendorFilter, setVendorFilter] = useState('');

  // Redirect PM
  useEffect(() => {
    if (profile?.role === 'project_manager') router.replace('/pm/projects');
  }, [profile?.role]);

  useEffect(() => {
    if (!router.isReady) return;
    const { status, ageMin: qMin, ageMax: qMax } = router.query;
    if (status && typeof status === 'string') {
      const mapped = STATUS_DISPLAY[status] || status;
      if (STATUSES_FILTER.includes(mapped)) setStatusFilter(mapped);
    }
    if (qMin) setAgeMin(Number(qMin));
    if (qMax) setAgeMax(Number(qMax));
    if (router.query.pm) setPmFilter(decodeURIComponent(router.query.pm as string));
    if (router.query.vendor) setVendorFilter(decodeURIComponent(router.query.vendor as string));
  }, [router.isReady, router.query]);

  const searchMatch = (p: typeof MOCK_PROJECTS[0]) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.id.toLowerCase().includes(s) ||
           p.projectName.toLowerCase().includes(s) ||
           p.site.toLowerCase().includes(s) ||
           p.poNo.toLowerCase().includes(s) ||
           p.indusId.toLowerCase().includes(s) ||
           (p.vendor||'').toLowerCase().includes(s);
  };

  const filtered = projects.filter(p => {
    const displayStatus = STATUS_DISPLAY[p.status] || p.status;
    if (statusFilter !== 'All' && displayStatus !== statusFilter) return false;
    if (typeFilter !== 'All' && p.type !== typeFilter) return false;
    if (ageMin !== null && p.aging < ageMin) return false;
    if (ageMax !== null && ageMax < 999 && p.aging > ageMax) return false;
    if (pmFilter && (p as any).pm !== pmFilter) return false;
    if (vendorFilter && (p as any).vendor !== vendorFilter) return false;
    return searchMatch(p);
  });

  const counts = {
    total: projects.length,
    inProgress: projects.filter(p=>p.status==='in_progress').length,
    delayed: projects.filter(p=>p.status==='delayed').length,
    completed: projects.filter(p=>p.status==='completed').length,
  };

  // Check if a PO number has multiple project records
  const poCount = (poNo: string) => projects.filter(p=>p.poNo===poNo).length;

  return (
    <Layout>
      <div className="fade-in">
        {/* Drafts */}
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
                      <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:2 }}>{d.projectName}</div>
                      <div style={{ fontSize:11, color:T.textDim }}>{d.type} · {d.region}</div>
                      <div style={{ fontSize:11, color:T.textMuted, marginTop:2 }}>PO: {d.poNo} · {d.indusId}</div>
                    </div>
                    <span style={{ background:T.warningBg, color:T.warning, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>Draft</span>
                  </div>
                  <div style={{ fontSize:11, color:T.textDim, marginBottom:12 }}>Saved: {d.savedAt}</div>
                  <div style={{ display:'flex', gap:6 }}>
                    <Link href={`/projects/new?draft=${d.id}`} style={{ textDecoration:'none', flex:1 }}>
                      <button style={{ ...btnSecondary, width:'100%', justifyContent:'center', fontSize:12, padding:'6px 0' }}>✏️ Continue</button>
                    </Link>
                    <button onClick={()=>setDrafts(p=>p.filter(x=>x.id!==d.id))} style={{ background:T.primaryLight, border:`1px solid ${T.primaryMid}`, borderRadius:8, padding:'6px 12px', color:T.primary, cursor:'pointer', fontSize:12, fontWeight:600 }}>📤 Submit</button>
                    {isAdmin && <button onClick={()=>setDrafts(p=>p.filter(x=>x.id!==d.id))} style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, padding:'6px 10px', color:T.danger, cursor:'pointer', fontSize:13 }}>🗑</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PM / Vendor filter banner */}
        {(pmFilter || vendorFilter) && (
          <div style={{ background:T.primaryLight, border:`1.5px solid ${T.primaryMid}`, borderRadius:12, padding:'16px 20px', marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:T.primary, marginBottom:4 }}>
                  {pmFilter ? `📋 Projects assigned to: ${pmFilter}` : `🏢 Projects for vendor: ${vendorFilter}`}
                </div>
                <div style={{ display:'flex', gap:12, flexWrap:'wrap' as const }}>
                  <span style={{ fontSize:12, color:T.textMuted }}>{filtered.length} project(s)</span>
                  <span style={{ fontSize:12, color:T.textMuted }}>
                    PO Value: <strong style={{ color:T.text }}>₹{(filtered.reduce((a,p)=>{const pp=p as any;return a+(pp.poValue||0);},0)/100000).toFixed(1)}L</strong>
                  </span>
                  <span style={{ fontSize:12, color:T.danger }}>
                    Delayed: <strong>{filtered.filter((p:any)=>p.status==='delayed').length}</strong>
                  </span>
                  <span style={{ fontSize:12, color:T.success }}>
                    Completed: <strong>{filtered.filter((p:any)=>p.status==='completed'||p.status==='billing_review').length}</strong>
                  </span>
                </div>
              </div>
              <button onClick={()=>{ setPmFilter(''); setVendorFilter(''); router.push('/projects'); }}
                style={{ background:T.primary, border:'none', borderRadius:8, padding:'7px 16px', color:'#fff', cursor:'pointer', fontSize:12, fontWeight:600, flexShrink:0, marginLeft:12 }}>
                × Clear Filter
              </button>
            </div>
          </div>
        )}
        {/* Summary cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
          {[
            { label:'Total Projects', value:counts.total,      color:T.primary, icon:'📁', filter:'All'          },
            { label:'In Progress',    value:counts.inProgress, color:T.info,    icon:'⚡', filter:'In Progress'  },
            { label:'Delayed',        value:counts.delayed,    color:T.danger,  icon:'⚠️', filter:'Delayed'      },
            { label:'Completed',      value:counts.completed,  color:T.success, icon:'✅', filter:'Completed'    },
          ].map((s,i)=>(
            <div key={i} onClick={()=>{ setStatusFilter(statusFilter===s.filter?'All':s.filter); setAgeMin(null); setAgeMax(null); }}
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

        {/* Active filters */}
        {(ageMin !== null || statusFilter !== 'All') && (
          <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
            {ageMin !== null && (
              <div style={{ background:T.primaryLight, border:`1px solid ${T.primaryMid}`, borderRadius:20, padding:'4px 14px', fontSize:12, color:T.primary, fontWeight:600, display:'flex', alignItems:'center', gap:8 }}>
                ⏰ Aging: {ageMin}–{ageMax&&ageMax<999?ageMax+'d':'90+d'}
                <button onClick={()=>{ setAgeMin(null); setAgeMax(null); }} style={{ background:'none', border:'none', cursor:'pointer', color:T.primary, fontWeight:700, fontSize:14 }}>×</button>
              </div>
            )}
            {statusFilter !== 'All' && (
              <div style={{ background:T.primaryLight, border:`1px solid ${T.primaryMid}`, borderRadius:20, padding:'4px 14px', fontSize:12, color:T.primary, fontWeight:600, display:'flex', alignItems:'center', gap:8 }}>
                Status: {statusFilter}
                <button onClick={()=>setStatusFilter('All')} style={{ background:'none', border:'none', cursor:'pointer', color:T.primary, fontWeight:700, fontSize:14 }}>×</button>
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
            placeholder="Search project, PO number, Indus ID, site, vendor…"
            style={{ ...inputStyle(focused), width:320 }} />
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            {STATUSES_FILTER.map(f=>(
              <button key={f} onClick={()=>{ setStatusFilter(f); setAgeMin(null); setAgeMax(null); }}
                style={{ padding:'6px 12px', borderRadius:6, border:'1px solid', borderColor:statusFilter===f?T.primary:T.border, background:statusFilter===f?T.primaryLight:'#fff', color:statusFilter===f?T.primary:T.textMuted, fontSize:12, cursor:'pointer', fontWeight:statusFilter===f?600:400 }}>{f}</button>
            ))}
          </div>
          <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={{ ...inputStyle(), width:'auto', marginLeft:'auto' }}>
            {TYPES.map(t=><option key={t}>{t}</option>)}
          </select>
          <button onClick={()=>router.push('/projects/new')} style={btnPrimary}>+ New Project</button>
        </div>

        <div style={card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div style={{ fontSize:14, fontWeight:600, color:T.text }}>
              {statusFilter==='All'&&ageMin===null?'All Projects':`Filtered Projects`} · {filtered.length} records
            </div>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%' }}>
              <thead>
                <tr>{['#','Project No','PO Number','Indus ID','Site / Region','Job Type','Vendor','PO Value','Aging','Progress','Status','Actions'].map(h=><th key={h} style={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.length===0 ? (
                  <tr><td colSpan={12} style={{ ...td, textAlign:'center', padding:40, color:T.textDim }}>No projects match the current filter.</td></tr>
                ) : filtered.map((p,i)=>(
                  <tr key={i} onClick={()=>router.push(`/projects/${p.id}`)} style={{ cursor:'pointer' }}
                    onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background=T.primaryLight}
                    onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background='transparent'}>
                    <td style={{ ...td, color:T.textDim }}>{i+1}</td>
                    <td style={{ ...td, color:T.primary, fontWeight:700 }}>{p.projectNo}</td>
                    <td style={{ ...td }}>
                      <div style={{ fontWeight:600, color:T.text }}>{p.poNo}</div>
                      {poCount(p.poNo) > 1 && (
                        <div style={{ fontSize:10, color:T.info, marginTop:2 }}>+{poCount(p.poNo)-1} more project(s)</div>
                      )}
                    </td>
                    <td style={{ ...td, fontSize:12, color:T.textMuted }}>{p.indusId}</td>
                    <td style={td}><div style={{ fontWeight:500, color:T.text }}>{p.site}</div><div style={{ fontSize:11, color:T.textDim }}>{p.region}</div></td>
                    <td style={td}><span style={{ fontSize:11, background:T.primaryLight, color:T.primary, padding:'2px 8px', borderRadius:5, fontWeight:500, whiteSpace:'nowrap' }}>{p.type}</span></td>
                    <td style={{ ...td, fontSize:12 }}>{p.vendor || <span style={{ color:T.danger, fontSize:11 }}>⚠️ Not assigned</span>}</td>
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
                        <Link href={`/projects/${p.id}`} style={{ textDecoration:'none' }}>
                          <button style={{ background:T.primaryLight, border:'none', borderRadius:5, padding:'4px 8px', color:T.primary, cursor:'pointer', fontSize:12 }}>👁</button>
                        </Link>
                        {isAdmin && <button onClick={()=>setProjects(prev=>prev.filter(x=>x.id!==p.id))} style={{ background:'#FEF2F2', border:'none', borderRadius:5, padding:'4px 8px', color:T.danger, cursor:'pointer', fontSize:12 }}>🗑</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding:'10px 0', borderTop:`1px solid ${T.border}`, fontSize:11, color:T.textDim, marginTop:4 }}>
            Showing {filtered.length} of {projects.length} projects · PO Number can be shared across multiple projects
          </div>
        </div>
      </div>
    </Layout>
  );
}
