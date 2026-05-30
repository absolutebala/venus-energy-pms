import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { T, card, badge, th, td, btnPrimary, btnSecondary, inputStyle } from '@/lib/theme';
import { useProjects } from '@/context/ProjectContext';
import { createClient } from '@/lib/supabase';
import { useWorkDocs } from '@/context/WorkDocContext';
import { MOCK_PROJECTS } from '@/lib/projectData';

const fmt = (v: number) => `₹${(v / 100000).toFixed(2)}L`;

const STATUS_DISPLAY: Record<string,string> = {
  in_progress:'In Progress', delayed:'Delayed', completed:'Completed', pending:'Pending',
  submitted:'Submitted', pm_approved:'PM Approved', billing_review:'Billing Review',
};

const WORK_STATUS_CFG: Record<string,{label:string;color:string;bg:string}> = {
  not_started:    { label:'Not Started',    color:'#6B7280', bg:'#F9FAFB' },
  in_progress:    { label:'In Progress',    color:'#D97706', bg:'#FFFBEB' },
  delayed:        { label:'Delayed',        color:'#DC2626', bg:'#FEF2F2' },
  on_hold:        { label:'On Hold',        color:'#7C3AED', bg:'#F5F3FF' },
  submitted:      { label:'Submitted',      color:'#2563EB', bg:'#EFF6FF' },
  under_review:   { label:'Under Review',   color:'#7C3AED', bg:'#F5F3FF' },
  pm_approved:    { label:'PM Approved',    color:'#0D9488', bg:'#F0FDFA' },
  billing_review: { label:'Billing Review', color:'#D97706', bg:'#FFFBEB' },
  completed:      { label:'Completed',      color:'#16A34A', bg:'#F0FDF4' },
};
const STATUSES_FILTER = ['All','In Progress','Aging','Delayed','Completed','Pending','Billing Review'];
const TYPES = ['All','Tower Erection','Tower Maintenance','Component Replacement','Fiber Installation','Civil Works','Power Works'];

// Drafts loaded from Supabase

 
const DOC_COLS_P = [
  { key:'safety_photos',    label:'Safety'     },
  { key:'site_photos',      label:'Site Photos' },
  { key:'jmr_document',    label:'JMR'         },
  { key:'at_certificate',  label:'AT Cert'     },
  { key:'noc_document',    label:'NOC'         },
  { key:'drawing_document',label:'Drawing'     },
  { key:'ptw_document',    label:'PTW'         },
];
const STN_RETURN_MAP: Record<string,boolean> = {}; /*
  ([] as any[]).map(proj => {
    const allReturned = proj.materials.every((m:any) =>
      Math.max(0,(m.issuedQty??0)-(m.pmApprovedQty??m.utilisedQty??0)) === 0 ||
      (m.returnQty??0) >= Math.max(0,(m.issuedQty??0)-(m.pmApprovedQty??m.utilisedQty??0))
    );
    return [proj.projectId, allReturned];
  })
); */
// PROJ_START now derived from seedData

export default function ProjectsPage() {
  const router = useRouter();
  const [creating,    setCreating]    = React.useState(false);
  const [extracting,  setExtracting]  = React.useState(false);
  const poFileRef = useRef<HTMLInputElement>(null);

  const handlePOUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') { alert('Only PDF files are accepted.'); return; }
    setExtracting(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload/extract-po', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token||''}` },
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) { alert(json.error || 'Extraction failed'); return; }
      const d = json.data;

      // Create new project — sequential ID same as createNewProject
      const sb2 = createClient();
      const year = new Date().getFullYear();
      const { data: existing } = await sb2.from('projects').select('id').order('id', { ascending:false }).limit(1);
      let nextNum = 1;
      if (existing?.length) {
        const parts = existing[0].id.split('-');
        nextNum = parseInt(parts[parts.length-1]) + 1;
      }
      const newId = `VE-${year}-${String(nextNum).padStart(3,'0')}`;
      const { error: insertErr } = await sb2.from('projects').insert({
        id:         newId,
        project_id: d.project_no  || '',
        po_no:      d.po_no       || '',
        po_date:    d.po_date     || null,
        po_value:   d.po_value    || 0,
        indus_id:   d.indus_id    || '',
        region:     d.region      || '',
        site:       d.indus_id    || 'TBD',
        type:       'Tower Erection',
        pm: '', rm: '', vendor: d.vendor_name || '',
        status: 'not_started', progress: 0,
        billed_amount: 0, paid_amount: 0,
      });
      if (insertErr) { alert('Failed to create project: ' + insertErr.message); return; }

      // Save extracted items to localStorage for project detail page to pick up
      if (d.items?.length) {
        localStorage.setItem('pending_po_items_' + newId, JSON.stringify(d.items));
      }

      // Refresh projects list before navigating so project detail page finds it
      await refreshProjects();
      router.push('/projects/' + newId);
    } catch(err: any) {
      alert('Failed: ' + err.message);
    } finally {
      setExtracting(false);
      if (poFileRef.current) poFileRef.current.value = '';
    }
  };

  const createNewProject = async () => {
    setCreating(true);
    try {
      const sb = createClient();
      // Generate next project ID
      const year = new Date().getFullYear();
      const { data: existing } = await sb.from('projects').select('id').order('id', { ascending: false }).limit(1);
      let nextNum = 1;
      if (existing && existing.length > 0) {
        const lastId = existing[0].id; // e.g. VE-2025-015
        const parts = lastId.split('-');
        nextNum = parseInt(parts[parts.length - 1]) + 1;
      }
      const newId = `VE-${year}-${String(nextNum).padStart(3,'0')}`;
      // Insert blank project
      const { error } = await sb.from('projects').insert({
        id: newId, po_no: '', site: '', status: 'not_started', po_value: 0,
      });
      if (error) throw new Error(error.message);
      await refreshProjects();
      router.push(`/projects/${newId}`);
    } catch(err: any) {
      alert('Failed to create project: ' + err.message);
      setCreating(false);
    }
  };
  const { projects: dbProjects, refreshProjects, loading: projLoading } = useProjects();
  const { getDocStatus } = useWorkDocs();
  const { profile, can, loading } = useAuth();
  const isAdmin = !loading && (can('projects', 'create') || can('projects', 'delete'));

  const projects = dbProjects as any[];

  // Role-based project filtering
  const roleFilteredProjects = React.useMemo(() => {
    const role = profile?.role;
    const name = profile?.full_name || '';
    if (role === 'project_manager')  return projects.filter((p:any) => p.pm === name);
    if (role === 'region_manager')   return projects.filter((p:any) => p.rm === name);
    if (role === 'vendor')           return projects.filter((p:any) => p.vendor === name);
    return projects; // super_admin, accounting_team, site_engineer see all
  }, [projects, profile]);
  const getDocStatusForProject = (id: string) => getDocStatus(id);
  const [drafts, setDrafts] = useState<any[]>([]);
  useEffect(() => {
    const sb = createClient();
    sb.from('project_drafts').select('*').order('updated_at', { ascending: false })
      .then(({ data }) => { if (data) setDrafts(data); });
  }, []);
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
    // Role-based filtering handled below
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

  const searchMatch = (p: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.id.toLowerCase().includes(s) ||
           p.site.toLowerCase().includes(s) ||
           p.site.toLowerCase().includes(s) ||
           p.poNo.toLowerCase().includes(s) ||
           p.indusId.toLowerCase().includes(s) ||
           (p.vendor||'').toLowerCase().includes(s);
  };

  const agingThreshold = 60; // days
  const getAgeDays = (id: string) => {
    const p = (projects as any[]).find((x:any)=>x.id===id);
    if (!p) return 0;
    if (p.status === 'not_started') return 0;
    if (p.status === 'completed') {
      // Show project duration (start to end) not days till today
      if (p.startDate && p.endDate) return Math.floor((new Date(p.endDate).getTime() - new Date(p.startDate).getTime()) / 86400000);
      return 0;
    }
    return p.startDate ? Math.floor((new Date().getTime() - new Date(p.startDate).getTime()) / 86400000) : (p.aging||0);
  };
  const filtered = roleFilteredProjects.filter(p => {
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
    inProgress: roleFilteredProjects.filter((p:any)=>p.status==='in_progress').length,
    aging: roleFilteredProjects.filter((p:any)=>!['completed','not_started'].includes(p.status)&&getAgeDays(p.id)>agingThreshold).length,
    completed: roleFilteredProjects.filter((p:any)=>p.status==='completed').length,
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
                    <button onClick={()=>router.push(`/projects/new?draft=${d.id}`)} style={{ background:T.primaryLight, border:`1px solid ${T.primaryMid}`, borderRadius:8, padding:'6px 12px', color:T.primary, cursor:'pointer', fontSize:12, fontWeight:600 }}>✏️ Continue</button>
                    {isAdmin && <button onClick={async ()=>{
                        if (!window.confirm('Delete this draft? This cannot be undone.')) return;
                        const sb = createClient();
                        const { error } = await sb.from('project_drafts').delete().eq('id', d.id);
                        if (!error) setDrafts(p=>p.filter(x=>x.id!==d.id));
                      }} style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, padding:'6px 10px', color:T.danger, cursor:'pointer', fontSize:13 }}>🗑</button>}
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
            { label: profile?.role === 'super_admin' || profile?.role === 'accounting_team' ? 'Total Projects' : 'My Projects', value:counts.total,      color:T.primary, icon:'📁', filter:'All'          },
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
          <input ref={poFileRef} type="file" accept=".pdf,application/pdf" onChange={handlePOUpload} style={{ display:'none' }} />
          <button onClick={()=>poFileRef.current?.click()} disabled={extracting}
            style={{ ...btnSecondary, display:'flex', alignItems:'center', gap:6, opacity:extracting?0.7:1, cursor:extracting?'not-allowed':'pointer' }}>
            {extracting
              ? <><div style={{ width:13,height:13,border:'2px solid #CBD5E1',borderTopColor:T.primary,borderRadius:'50%',animation:'spin 0.7s linear infinite' }} />Extracting…</>
              : '📎 Upload PO'}
          </button>
          <button onClick={createNewProject} disabled={creating} style={{ ...btnPrimary, opacity:creating?0.7:1 }}>{creating?'Creating…':'+ New Project'}</button>
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
                  const docs    = getDocStatusForProject(p.id) || {};
                  const delDate = p.endDate;
                  const delDt   = delDate ? new Date(delDate) : null;
                  const isPast  = delDt && !['completed','not_started'].includes(p.status) ? delDt < new Date() : false;
                  const ageDays = getAgeDays(p.id);
                  const ageColor= ageDays > 90 ? '#DC2626' : ageDays > 60 ? '#D97706' : '#0D9488';
                  const ageBg   = ageDays > 90 ? '#FEF2F2' : ageDays > 60 ? '#FFFBEB' : '#F0FDFA';
                  const ws = WORK_STATUS_CFG[p.status] || { label: p.status||'—', color:'#6B7280', bg:'#F9FAFB' };
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
                        <span style={{ fontSize:11, fontWeight:600, color:'#0369A1', background:'#E0F2FE', padding:'3px 10px', borderRadius:20, whiteSpace:'nowrap' as const }}>{(p as any).projectStatus || '—'}</span>
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
