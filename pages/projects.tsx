import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { T, card, badge, th, td, btnPrimary, btnSecondary, inputStyle } from '@/lib/theme';
import { MOCK_PROJECTS } from '@/lib/projectData';
import { PROJ_START_MAP } from '@/lib/seedData';

const fmt = (v: number) => `₹${(v / 100000).toFixed(2)}L`;

const STATUS_DISPLAY: Record<string,string> = {
  in_progress:'In Progress', delayed:'Delayed', completed:'Completed', pending:'Pending',
  submitted:'Submitted', pm_approved:'PM Approved', billing_review:'Billing Review',
};

const STATUSES_FILTER = ['All','In Progress','Aging','Delayed','Completed','Pending','Billing Review'];
const TYPES = ['All','Tower Erection','Tower Maintenance','Component Replacement','Fiber Installation','Civil Works','Power Works'];

const MOCK_DRAFTS = [
  { id:'DRAFT-001', projectName:'Mysuru Tower Erection Phase 1', poNo:'PO-2025-006', indusId:'IND-2001', savedAt:'07/05/2025 10:15 AM', region:'Karnataka',      type:'Tower Erection'    },
  { id:'DRAFT-002', projectName:'Vizag Fiber Installation',       poNo:'PO-2025-007', indusId:'IND-2002', savedAt:'06/05/2025 03:42 PM', region:'Andhra Pradesh', type:'Fiber Installation' },
];

 
const DOC_COLS_P = [
  { key:'safety_photos',    label:'Safety'     },
  { key:'site_photos',      label:'Site Photos' },
  { key:'jmr_document',    label:'JMR'         },
  { key:'ac_certificate',  label:'AC Cert'     },
  { key:'noc_document',    label:'NOC'         },
  { key:'drawing_document',label:'Drawing'     },
  { key:'ptw_document',    label:'PTW'         },
];
const PROJ_DOC_STATUS: Record<string, Record<string, boolean>> = {
  'VE-2025-001': { safety_photos:true,  site_photos:true,  jmr_document:false, ac_certificate:true,  noc_document:false, drawing_document:true,  ptw_document:true  },
  'VE-2025-002': { safety_photos:true,  site_photos:true,  jmr_document:true,  ac_certificate:true,  noc_document:true,  drawing_document:true,  ptw_document:false },
  'VE-2025-003': { safety_photos:true,  site_photos:false, jmr_document:false, ac_certificate:true,  noc_document:false, drawing_document:false, ptw_document:false },
  'VE-2025-004': { safety_photos:false, site_photos:false, jmr_document:false, ac_certificate:false, noc_document:false, drawing_document:false, ptw_document:false },
  'VE-2025-005': { safety_photos:true,  site_photos:true,  jmr_document:true,  ac_certificate:true,  noc_document:true,  drawing_document:true,  ptw_document:true  },
  'VE-2025-006': { safety_photos:false, site_photos:false, jmr_document:false, ac_certificate:false, noc_document:false, drawing_document:false, ptw_document:false },
  'VE-2025-007': { safety_photos:true,  site_photos:true,  jmr_document:false, ac_certificate:true,  noc_document:true,  drawing_document:false, ptw_document:false },
  'VE-2025-008': { safety_photos:true,  site_photos:false, jmr_document:false, ac_certificate:false, noc_document:false, drawing_document:false, ptw_document:false },
  'VE-2025-009': { safety_photos:false, site_photos:false, jmr_document:false, ac_certificate:false, noc_document:false, drawing_document:false, ptw_document:false },
  'VE-2025-010': { safety_photos:true,  site_photos:true,  jmr_document:true,  ac_certificate:true,  noc_document:true,  drawing_document:true,  ptw_document:true  },
};
const PROJ_DELIVERY: Record<string,string> = {
  'VE-2025-001':'2025-07-30','VE-2025-002':'2025-08-31','VE-2025-003':'2025-09-15',
  'VE-2025-004':'2025-10-31','VE-2025-005':'2025-03-31','VE-2025-006':'2025-09-30',
  'VE-2025-007':'2025-08-15','VE-2025-008':'2025-11-30','VE-2025-009':'2025-12-31',
  'VE-2025-010':'2025-04-30',
};
// PROJ_START now derived from seedData
const PROJ_START_OLD: Record<string,string> = {
  'VE-2025-001':'2025-01-15','VE-2025-002':'2025-02-01','VE-2025-003':'2025-02-10',
  'VE-2025-004':'2025-03-01','VE-2025-005':'2024-12-01','VE-2025-006':'2025-03-15',
  'VE-2025-007':'2025-02-20','VE-2025-008':'2025-04-01','VE-2025-009':'2025-04-15',
  'VE-2025-010':'2024-11-01',
};
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
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;
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

  const agingThreshold = 60; // days
  const getAgeDays = (id: string) => { const p = mapped.find((x:any)=>x.id===id); return p?.startDate ? Math.floor((new Date().getTime() - new Date(p.startDate).getTime()) / 86400000) : (p?.aging||0); };
  const filtered = projects.filter(p => {
    const displayStatus = STATUS_DISPLAY[p.status] || p.status;
    if (statusFilter === 'Aging') return getAgeDays(p.id) > agingThreshold;
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
    aging: projects.filter((p:any)=>getAgeDays(p.id)>agingThreshold).length,
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
            { label:'Aging (60d+)',   value:counts.aging,      color:'#D97706', icon:'⏱',  filter:'Aging'        },
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
            <div style={{ overflowX:'auto' as const, borderRadius:10, border:`1px solid ${T.border}` }}>
            <table style={{ width:'100%', borderCollapse:'collapse' as const, minWidth:1400 }}>
              <thead>
                <tr>
                  {['#','Project No','Site / Project','Work Status','Delivery Date','Aging',
                    ...DOC_COLS_P.map(d=>d.label),
                    'STN Return','Last Updated'].map((h,i)=>(
                    <th key={i} style={{ padding:'10px 12px', fontSize:10, fontWeight:700, textTransform:'uppercase' as const,
                      color:T.primary, textAlign:'left' as const, borderBottom:`2px solid ${T.primaryMid}`,
                      whiteSpace:'nowrap' as const, background:T.primaryLight }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={16} style={{ padding:32, textAlign:'center' as const, color:T.textDim }}>No projects found</td></tr>
                )}
                {filtered.map((p:any, idx:number) => {
                  const docs    = PROJ_DOC_STATUS[p.id] || {};
                  const delDate = PROJ_DELIVERY[p.id];
                  const delDt   = delDate ? new Date(delDate) : null;
                  const isPast  = delDt ? delDt < new Date() : false;
                  const ageDays = getAgeDays(p.id);
                  const ageColor= ageDays > 90 ? '#DC2626' : ageDays > 60 ? '#D97706' : '#0D9488';
                  const ageBg   = ageDays > 90 ? '#FEF2F2' : ageDays > 60 ? '#FFFBEB' : '#F0FDFA';
                  const ws = STATUS_DISPLAY[p.status as keyof typeof STATUS_DISPLAY] || { label: p.status, color: T.textMuted };
                  return (
                    <tr key={p.id} style={{ background:idx%2===0?'#fff':T.bg, cursor:'pointer' }}
                      onClick={()=>router.push(`/projects/${p.id}`)}
                      onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background=T.primaryLight}
                      onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background=idx%2===0?'#fff':T.bg}>
                      <td style={{ padding:'10px 12px', color:T.textMuted, fontSize:12, borderBottom:`1px solid ${T.border}` }}>{(page-1)*PER_PAGE+idx+1}</td>
                      <td style={{ padding:'10px 12px', borderBottom:`1px solid ${T.border}` }}>
                        <div style={{ fontWeight:700, color:T.primary, fontSize:13 }}>{p.id}</div>
                        {p.poNo && <div style={{ fontSize:10, color:T.textMuted }}>{p.poNo}</div>}
                      </td>
                      <td style={{ padding:'10px 12px', borderBottom:`1px solid ${T.border}` }}>
                        <div style={{ fontWeight:600, color:T.text, fontSize:13 }}>{p.site}</div>
                        <div style={{ fontSize:11, color:T.textMuted }}>{p.pm}</div>
                      </td>
                      <td style={{ padding:'10px 12px', borderBottom:`1px solid ${T.border}` }}>
                        <span style={{ fontSize:11, fontWeight:700, color:(ws as any).color, background:`${(ws as any).color}15`, padding:'3px 10px', borderRadius:20, whiteSpace:'nowrap' as const }}>{(ws as any).label}</span>
                      </td>
                      <td style={{ padding:'10px 12px', borderBottom:`1px solid ${T.border}`, whiteSpace:'nowrap' as const }}>
                        {delDt ? <span style={{ fontSize:12, color:isPast?'#DC2626':'#374151', fontWeight:isPast?600:400 }}>
                          {delDt.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
                          {isPast && <span style={{ fontSize:10, display:'block', color:'#DC2626' }}>Overdue</span>}
                        </span> : <span style={{ color:T.textDim }}>—</span>}
                      </td>
                      <td style={{ padding:'10px 12px', borderBottom:`1px solid ${T.border}` }}>
                        <span style={{ fontSize:12, fontWeight:600, color:ageColor, background:ageBg, padding:'2px 8px', borderRadius:10 }}>{ageDays}d</span>
                      </td>
                      {DOC_COLS_P.map(d=>(
                        <td key={d.key} style={{ padding:'10px 12px', borderBottom:`1px solid ${T.border}`, textAlign:'center' as const }}>
                          <span style={{ fontSize:16 }} title={docs[d.key]?'Completed':'Pending'}>{docs[d.key]?'✅':'⏳'}</span>
                        </td>
                      ))}
                      <td style={{ padding:'10px 12px', borderBottom:`1px solid ${T.border}`, textAlign:'center' as const }}>
                        <span style={{ fontSize:16 }}>{['completed','billing_review'].includes(p.status)?'✅':'⏳'}</span>
                      </td>
                      <td style={{ padding:'10px 12px', borderBottom:`1px solid ${T.border}`, fontSize:12, color:T.textMuted, whiteSpace:'nowrap' as const }}>
                        {new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </div>
          <div style={{ padding:'10px 0', borderTop:`1px solid ${T.border}`, fontSize:11, color:T.textDim, marginTop:4 }}>
            Showing {filtered.length} of {projects.length} projects · PO Number can be shared across multiple projects
          </div>
        </div>
      </div>
    </Layout>
  );
}
