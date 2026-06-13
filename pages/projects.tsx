import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { T, card, badge, th, td, btnPrimary, btnSecondary, inputStyle , fmtINR} from '@/lib/theme';
import DateInput from '@/components/DateInput';
import { useProjects } from '@/context/ProjectContext';
import { createClient } from '@/lib/supabase';
import { useWorkDocs } from '@/context/WorkDocContext';
import { MOCK_PROJECTS } from '@/lib/projectData';
import * as XLSX from 'xlsx';

const fmt = fmtINR;

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
const STATUSES_FILTER = ['All','PO Open','PO Closed'];
const TYPES = ['All Types','SMPS Installation','Supply and Service for Tower Strengthening','AC Transportation','Minor','Major','Gate Service','Solar','DISMANLTING','Fence erection','DG REPLACEMENT','Lightening Arrestor','BB Installation','DG Dismantling','Civil','Lithum Ion BB Installation','DG DISMATNLING','New Build','Shelter Dismantling','HPSC','DG CAM','Transportation for Tower Strengthening','TM Service','Transportation Charges for Goods','Shelter Floor Sagging','SP Installation','Cable Replacement Activity','JV for Tower Strengthening','Civil - Earthing Correction activity','dewatering activity','Cable Ladder Installation activity','SRN TRANSPORTATION','SPS & SMPS installation','DG Canopy Rectification','Fuel Filling Charges','DG addition','Survey Charges - UG Cable','UG Cable rectification','Cyclone Preparedness','AC REPLACEMENT','Civil Dismantling Activity','New Build EB Meter Box','Survey charges','BACK FILLING','PU Coating','BB ADDITIONAL','Shelter leakage','Solar panel replacement','Earthing Activity','Solar Reward','POLE INSTALLATION','SPS REPLACEMENT','Zinc Spray for Tower Maintenance','EGB INSTALLATION','Sharing shelter','Cable Tray INSTALLATION','Pole Maintenance','Zinc Spray for Pole Maintenance','Cable Routing LADDER Fallen','COW Tower Dismantling','TCU INSTALLATION','Supply for Tower strengthening','Electrical Activity','DG Installation','Tarpaulin Activity','LA and LA Strip connection activity','Tower Dismantling','LA installation','Survey of COW sites','Survey of Civil','DG RELOCATION','Others'];

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
  const [showNewModal, setShowNewModal] = React.useState(false);
  const [showPoStatusModal, setShowPoStatusModal] = React.useState(false);
  const [poStatusFile, setPoStatusFile] = React.useState<File|null>(null);
  const [poStatusResult, setPoStatusResult] = React.useState<any>(null);
  const [updatingPoStatus, setUpdatingPoStatus] = React.useState(false);
  const poStatusFileRef = React.useRef<HTMLInputElement>(null);
  const [newForm, setNewForm] = React.useState({ projectId:'', poNo:'', poDate:'', indusId:'', site:'', region:'', type:'' });
  const [newFormErrors, setNewFormErrors] = React.useState<Record<string,string>>({});
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
      const { data: existing } = await sb2.from('projects').select('id').like('id', `VE-${year}-%`);
      let nextNum = 1;
      if (existing && existing.length > 0) {
        const nums = existing.map((r: any) => parseInt(r.id.split('-')[2])).filter((n: number) => !isNaN(n));
        if (nums.length > 0) nextNum = Math.max(...nums) + 1;
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

  const openNewProjectModal = () => {
    setNewForm({ projectId:'', poNo:'', poDate:'', indusId:'', site:'', region:'', type:'' });
    setNewFormErrors({});
    setShowNewModal(true);
  };

  const saveNewProject = async () => {
    // Validate mandatory fields
    const errors: Record<string,string> = {};
    if (!newForm.projectId.trim()) errors.projectId = 'Required';
    if (!newForm.poNo.trim())      errors.poNo      = 'Required';
    if (!newForm.poDate.trim())    errors.poDate    = 'Required';
    if (!newForm.indusId.trim())   errors.indusId   = 'Required';
    if (Object.keys(errors).length > 0) { setNewFormErrors(errors); return; }

    setCreating(true);

    try {
      const sb = createClient();
      const year = new Date().getFullYear();

      // Use SQL to get the true numeric max — avoids alphabetic sort issues and race conditions
      const { data: maxData } = await sb.rpc('get_next_project_num', { year_prefix: `VE-${year}-` });
      let nextNum = maxData ?? 1;

      // Retry up to 10 times in case of concurrent inserts
      let inserted = false;
      let lastError = '';
      for (let attempt = 0; attempt < 10; attempt++) {
        const newId = `VE-${year}-${String(nextNum + attempt).padStart(3,'0')}`;
        const { error } = await sb.from('projects').insert({
          id: newId,
          project_id: newForm.projectId.trim(),
          po_no:      newForm.poNo.trim(),
          po_date:    newForm.poDate || null,
          indus_id:   newForm.indusId.trim(),
          site:       newForm.site.trim() || newForm.indusId.trim(),
          region:     newForm.region.trim() || '',
          type:       newForm.type.trim() || '',
          status: 'not_started', po_value: 0,
        });
        if (!error) {
          await refreshProjects();
          setShowNewModal(false);
          router.push(`/projects/${newId}`);
          inserted = true;
          break;
        }
        if (!error.message.includes('projects_pkey')) {
          lastError = error.message;
          break;
        }
        lastError = error.message;
      }
      if (!inserted && lastError) throw new Error(lastError);
    } catch(err: any) {
      alert('Failed to create project: ' + err.message);
    } finally {
      setCreating(false);
    }
  };
  const handlePoStatusUpload = async () => {
    if (!poStatusFile) return;
    setUpdatingPoStatus(true);
    setPoStatusResult(null);
    try {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      const token = session?.access_token;
      const formData = new FormData();
      formData.append('file', poStatusFile);
      const res = await fetch('/api/admin/update-po-status', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      setPoStatusResult(json);
      await refreshProjects();
    } catch (err: any) {
      setPoStatusResult({ error: err.message });
    } finally {
      setUpdatingPoStatus(false);
    }
  };

  const { projects: dbProjects, refreshProjects, loading: projLoading } = useProjects();
  const { getDocStatus } = useWorkDocs();
  const { profile, can, loading } = useAuth();
  const isAdmin = !loading && (can('projects', 'create') || can('projects', 'delete'));

  const projects = dbProjects as any[];

  // Role-based project filtering
  const [vendorName, setVendorName] = useState('');

  // Fetch vendor name for vendor-role users
  React.useEffect(() => {
    if (profile?.role !== 'vendor' || !(profile as any).vendor_id) return;
    const sb = createClient();
    sb.from('vendors').select('name').eq('id', (profile as any).vendor_id).single()
      .then(({ data }) => { if (data?.name) setVendorName(data.name); });
  }, [profile]);

  const roleFilteredProjects = React.useMemo(() => {
    const role = profile?.role;
    const name = profile?.full_name || '';
    if (role === 'project_manager')  return projects.filter((p:any) => p.pm === name);
    if (role === 'region_manager')   return projects.filter((p:any) => p.rm === name);
    if (role === 'vendor')           return projects.filter((p:any) => vendorName ? p.vendor === vendorName : p.vendor === name);
    return projects; // super_admin, accounting_team, site_engineer see all
  }, [projects, profile, vendorName]);
  const getDocStatusForProject = (id: string) => getDocStatus(id);
  const [drafts, setDrafts] = useState<any[]>([]);
  useEffect(() => {
    const sb = createClient();
    sb.from('project_drafts').select('*').order('updated_at', { ascending: false })
      .then(({ data }) => { if (data) setDrafts(data); });
  }, []);
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc');
  const [poPopover, setPoPopover] = useState<string|null>(null);
  const [typeFilter,   setTypeFilter]   = useState('All Types');
  const [search,       setSearch]       = useState('');
  const [focused,      setFocused]      = useState(false);
  const [ageMin,       setAgeMin]       = useState<number|null>(null);
  const [ageMax,       setAgeMax]       = useState<number|null>(null);
  const [page, setPage] = useState(()=>{
    if (typeof window === 'undefined') return 1;
    const p = parseInt(new URLSearchParams(window.location.search).get('page') || '1');
    return p > 0 ? p : 1;
  });
  const PER_PAGE = 10;
  const [pmFilter,     setPmFilter]     = useState('');
  const [vendorFilter,  setVendorFilter]  = useState('');
  const [showFilters,   setShowFilters]   = useState(false);
  const [projectStatusFilter, setProjectStatusFilter] = useState('');
  // filterVendors and filterPMs now computed as cascading useMemos below
  const [regionFilter,  setRegionFilter]  = useState('');
  const [noVendorFilter, setNoVendorFilter] = useState(false);

  // Redirect PM
  useEffect(() => {
    // Role-based filtering handled below
  }, [profile?.role]);

  useEffect(() => {
    // Restore page from sessionStorage when coming back from project detail
    const savedPage = sessionStorage.getItem('projectsPage');
    if (savedPage && !router.query.page) {
      sessionStorage.removeItem('projectsPage');
      setPage(Number(savedPage));
    }
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    const { status, ageMin: qMin, ageMax: qMax } = router.query;
    if (status && typeof status === 'string') {
      const mapped = STATUS_DISPLAY[status] || status;
      setStatusFilter(mapped);
      setPage(1);
    }
    if (qMin) setAgeMin(Number(qMin));
    if (qMax) setAgeMax(Number(qMax));
    if (router.query.pm !== undefined) setPmFilter(decodeURIComponent(router.query.pm as string));
    if (router.query.region) setRegionFilter(decodeURIComponent(router.query.region as string));
    if (router.query.noVendor) setNoVendorFilter(router.query.noVendor === '1');
    if (router.query.vendor) setVendorFilter(decodeURIComponent(router.query.vendor as string));
    if (router.query.page) setPage(Number(router.query.page));
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
    // Aging = days since PO date (or start date, or created_at)
    const ref = p.poDate || p.startDate || p.createdAt;
    if (!ref) return 0;
    return Math.floor((new Date().getTime() - new Date(ref).getTime()) / 86400000);
  };
  const filtered = roleFilteredProjects.filter(p => {
    const displayStatus = STATUS_DISPLAY[p.status] || p.status;
    if (statusFilter === 'PO Open')   return (p as any).poStatus === 'Open';
    if (statusFilter === 'PO Closed') return (p as any).poStatus === 'Closed';
    if (statusFilter === 'Not Set') return !(p as any).projectStatus;
    if (statusFilter !== 'All') return ((p as any).projectStatus || '') === statusFilter;
    if (typeFilter !== 'All Types' && p.type !== typeFilter) return false;
    if (ageMin !== null && p.aging < ageMin) return false;
    if (ageMax !== null && ageMax < 999 && p.aging > ageMax) return false;
    if (pmFilter) { const _pm = (p as any).pm; if (pmFilter === '__unassigned__') { if (_pm) return false; } else if (_pm !== pmFilter) return false; }
    if (projectStatusFilter && ((p as any).projectStatus || '') !== projectStatusFilter) return false;
    if (regionFilter && (p as any).region !== regionFilter) return false;
    if (noVendorFilter && (p as any).vendor) return false;
    if (vendorFilter && (p as any).vendor !== vendorFilter) return false;
    return searchMatch(p);
  });

  const uniqueProjectStatuses = React.useMemo(() =>
    Array.from(new Set(roleFilteredProjects.map((p:any)=>p.projectStatus||'').filter(Boolean))).sort()
  , [roleFilteredProjects]);

  // ── Cascading filter options ──────────────────────────────────────────────
  // Each dropdown shows values available after applying all OTHER active filters

  const projectsForVendorFilter = React.useMemo(() =>
    roleFilteredProjects.filter((p:any) => {
      if (statusFilter !== 'All') {
        if (statusFilter === 'PO Open')   return (p as any).poStatus === 'Open';
        if (statusFilter === 'PO Closed') return (p as any).poStatus === 'Closed';
        if (statusFilter === 'Not Set')   return !(p as any).projectStatus;
        return ((p as any).projectStatus || '') === statusFilter;
      }
      if (typeFilter !== 'All Types' && p.type !== typeFilter) return false;
      if (pmFilter) { const _pm = (p as any).pm; if (pmFilter === '__unassigned__') { if (_pm) return false; } else if (_pm !== pmFilter) return false; }
      if (projectStatusFilter && ((p as any).projectStatus || '') !== projectStatusFilter) return false;
      if (regionFilter && (p as any).region !== regionFilter) return false;
      return true;
    })
  , [roleFilteredProjects, statusFilter, typeFilter, pmFilter, projectStatusFilter, regionFilter]);

  const projectsForPMFilter = React.useMemo(() =>
    roleFilteredProjects.filter((p:any) => {
      if (statusFilter !== 'All') {
        if (statusFilter === 'PO Open')   return (p as any).poStatus === 'Open';
        if (statusFilter === 'PO Closed') return (p as any).poStatus === 'Closed';
        if (statusFilter === 'Not Set')   return !(p as any).projectStatus;
        return ((p as any).projectStatus || '') === statusFilter;
      }
      if (typeFilter !== 'All Types' && p.type !== typeFilter) return false;
      if (vendorFilter && (p as any).vendor !== vendorFilter) return false;
      if (projectStatusFilter && ((p as any).projectStatus || '') !== projectStatusFilter) return false;
      if (regionFilter && (p as any).region !== regionFilter) return false;
      return true;
    })
  , [roleFilteredProjects, statusFilter, typeFilter, vendorFilter, projectStatusFilter, regionFilter]);

  const projectsForRegionFilter = React.useMemo(() =>
    roleFilteredProjects.filter((p:any) => {
      if (statusFilter !== 'All') {
        if (statusFilter === 'PO Open')   return (p as any).poStatus === 'Open';
        if (statusFilter === 'PO Closed') return (p as any).poStatus === 'Closed';
        if (statusFilter === 'Not Set')   return !(p as any).projectStatus;
        return ((p as any).projectStatus || '') === statusFilter;
      }
      if (typeFilter !== 'All Types' && p.type !== typeFilter) return false;
      if (vendorFilter && (p as any).vendor !== vendorFilter) return false;
      if (pmFilter) { const _pm = (p as any).pm; if (pmFilter === '__unassigned__') { if (_pm) return false; } else if (_pm !== pmFilter) return false; }
      if (projectStatusFilter && ((p as any).projectStatus || '') !== projectStatusFilter) return false;
      return true;
    })
  , [roleFilteredProjects, statusFilter, typeFilter, vendorFilter, pmFilter, projectStatusFilter]);

  const projectsForTypeFilter = React.useMemo(() =>
    roleFilteredProjects.filter((p:any) => {
      if (statusFilter !== 'All') {
        if (statusFilter === 'PO Open')   return (p as any).poStatus === 'Open';
        if (statusFilter === 'PO Closed') return (p as any).poStatus === 'Closed';
        if (statusFilter === 'Not Set')   return !(p as any).projectStatus;
        return ((p as any).projectStatus || '') === statusFilter;
      }
      if (vendorFilter && (p as any).vendor !== vendorFilter) return false;
      if (pmFilter) { const _pm = (p as any).pm; if (pmFilter === '__unassigned__') { if (_pm) return false; } else if (_pm !== pmFilter) return false; }
      if (projectStatusFilter && ((p as any).projectStatus || '') !== projectStatusFilter) return false;
      if (regionFilter && (p as any).region !== regionFilter) return false;
      return true;
    })
  , [roleFilteredProjects, statusFilter, vendorFilter, pmFilter, projectStatusFilter, regionFilter]);

  const projectsForStatusFilter = React.useMemo(() =>
    roleFilteredProjects.filter((p:any) => {
      if (typeFilter !== 'All Types' && p.type !== typeFilter) return false;
      if (vendorFilter && (p as any).vendor !== vendorFilter) return false;
      if (pmFilter) { const _pm = (p as any).pm; if (pmFilter === '__unassigned__') { if (_pm) return false; } else if (_pm !== pmFilter) return false; }
      if (regionFilter && (p as any).region !== regionFilter) return false;
      return true;
    })
  , [roleFilteredProjects, typeFilter, vendorFilter, pmFilter, regionFilter]);

  const cascadeVendors    = Array.from(new Set(projectsForVendorFilter.map((p:any)=>p.vendor||'').filter(Boolean))).sort();
  const cascadePMs        = Array.from(new Set(projectsForPMFilter.map((p:any)=>p.pm||'').filter(Boolean))).sort();
  const cascadeRegions    = Array.from(new Set(projectsForRegionFilter.map((p:any)=>p.region||'').filter(Boolean))).sort();
  const cascadeTypes      = Array.from(new Set(projectsForTypeFilter.map((p:any)=>p.type||'').filter(Boolean))).sort();
  const cascadeStatuses   = Array.from(new Set(projectsForStatusFilter.map((p:any)=>p.projectStatus||'').filter(Boolean))).sort();

  const activeFilterCount = [projectStatusFilter, vendorFilter, pmFilter, regionFilter].filter(Boolean).length;

  const counts = {
    total: roleFilteredProjects.length,
    inProgress: roleFilteredProjects.filter((p:any)=>p.status==='in_progress').length,
    aging: roleFilteredProjects.filter((p:any)=>!['completed','not_started'].includes(p.status)&&getAgeDays(p.id)>agingThreshold).length,
    completed: roleFilteredProjects.filter((p:any)=>p.status==='completed').length,
  };

  // Check if a PO number has multiple project records
  const poCount = (poNo: string) => projects.filter(p=>p.poNo===poNo).length;


  // ── Export filtered projects to Excel ──────────────────────────────────────
  const exportToExcel = () => {
    const rows = filtered.map((p: any, idx: number) => ({
      'S.No.':           idx + 1,
      'PO Number':       p.poNo || '',
      'PO Date':         p.poDate ? new Date(p.poDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '',
      'PO Count':        projects.filter((p2: any) => p2.poNo === p.poNo).length,
      'Aging (Days)':    getAgeDays(p.id),
      'PO Status':       p.poStatus || '',
      'Job Type':        p.type || '',
      'Project ID':      p.projectId || '',
      'Indus ID':        p.indusId || '',
      'Site Name':       p.site || '',
      'Project Status':  p.projectStatus || '',
      'Delivery Date':   p.endDate ? new Date(p.endDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    // Force text type for PO Number and ID columns to ensure VLOOKUP compatibility
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    const textCols = ['PO Number', 'Project ID', 'Indus ID'];
    const headerRow = rows.length > 0 ? Object.keys(rows[0]) : [];
    textCols.forEach(colName => {
      const colIdx = headerRow.indexOf(colName);
      if (colIdx < 0) return;
      for (let r = 1; r <= range.e.r; r++) {
        const addr = XLSX.utils.encode_cell({ r, c: colIdx });
        if (ws[addr]) { ws[addr].t = 's'; ws[addr].v = String(ws[addr].v); delete ws[addr].z; }
      }
    });

    // Column widths
    ws['!cols'] = [
      { wch: 6 },   // S.No.
      { wch: 16 },  // PO Number
      { wch: 14 },  // PO Date
      { wch: 9 },   // PO Count
      { wch: 12 },  // Aging
      { wch: 12 },  // PO Status
      { wch: 18 },  // Job Type
      { wch: 16 },  // Project ID
      { wch: 14 },  // Indus ID
      { wch: 22 },  // Site Name
      { wch: 18 },  // Project Status
      { wch: 14 },  // Delivery Date
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Projects');

    const label = statusFilter === 'All' && ageMin === null ? 'All_Projects' : 'Filtered_Projects';
    const date  = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Venus_Energy_${label}_${date}.xlsx`);
  };

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
                  {pmFilter ? `📋 Projects assigned to: ${pmFilter === '__unassigned__' ? 'Unassigned' : pmFilter}` : `🏢 Projects for vendor: ${vendorFilter}`}
                </div>
                <div style={{ display:'flex', gap:12, flexWrap:'wrap' as const }}>
                  <span style={{ fontSize:12, color:T.textMuted }}>{filtered.length} project(s)</span>
                  <span style={{ fontSize:12, color:T.textMuted }}>
                    PO Value: <strong style={{ color:T.text }}>{fmtINR(filtered.reduce((a,p)=>{const pp=p as any;return a+(pp.poValue||0);},0))}</strong>
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
        {(()=>{
          const poOpen   = filtered.filter((p:any)=>(p as any).poStatus==='Open').length;
          const poClosed = filtered.filter((p:any)=>(p as any).poStatus==='Closed').length;
          const totalPOValue = filtered.reduce((a:number,p:any)=>a+(p.poValue||0),0);
          const summaryCards = [
            { label: profile?.role === 'super_admin' || profile?.role === 'accounting_team' ? 'Total Projects' : 'My Projects', value: String(filtered.length), color: T.primary, icon:'📁', filter:'All' as string|null },
            { label:'PO Open',        value: String(poOpen),   color:'#059669', icon:'🟢', filter:'PO Open'  as string|null },
            { label:'PO Closed',      value: String(poClosed), color:'#DC2626', icon:'🔴', filter:'PO Closed' as string|null },
            { label:'Total PO Value', value: fmtINR(totalPOValue), color:'#7C3AED', icon:'💰', filter:null },
          ];
          return (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
              {summaryCards.map((s,i)=>(
                <div key={i} onClick={()=>{ if(s.filter){ setStatusFilter(statusFilter===s.filter?'All':s.filter); setPage(1); } }}
                  style={{ ...card, position:'relative', overflow:'hidden', padding:'16px 18px', cursor:s.filter?'pointer':'default', borderColor:statusFilter===s.filter?s.color:T.border, transition:'all 0.15s' }}
                  onMouseEnter={e=>{ if(s.filter){const el=e.currentTarget as HTMLDivElement; el.style.transform='translateY(-1px)'; el.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)';} }}
                  onMouseLeave={e=>{ if(s.filter){const el=e.currentTarget as HTMLDivElement; el.style.transform='translateY(0)'; el.style.boxShadow='0 1px 3px rgba(0,0,0,0.06)';} }}>
                  <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:s.color }} />
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontSize:11, color:T.textMuted, textTransform:'uppercase' as const, letterSpacing:0.5, marginBottom:4 }}>{s.label}</div>
                      <div style={{ fontSize:28, fontWeight:700, color:T.text }}>{s.value}</div>
                    </div>
                    <div style={{ fontSize:22 }}>{s.icon}</div>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

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
        {(() => {
          const hasFilter = false;
          const _dis = (key: string) => { const m: Record<string,string> = {search,projectStatusFilter,vendorFilter,pmFilter,regionFilter}; return hasFilter && !m[key]; };
          const disStyle = { opacity:0.4, pointerEvents:'none' as const };
          return (
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 1fr auto', gap:8, marginBottom:16, alignItems:'center' }}>
            <input value={search} onChange={e=>{ setSearch(e.target.value); setPage(1); }} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
              placeholder="Project name, PO no, Indus ID, site…"
              style={{ ...inputStyle(focused) }} />
            <select value={projectStatusFilter} onChange={e=>{setProjectStatusFilter(e.target.value);setPage(1);}}
              style={{ ...inputStyle() }}>
              <option value="">All Statuses</option>
              {cascadeStatuses.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <select value={vendorFilter} onChange={e=>{setVendorFilter(e.target.value);setPage(1);}}
              style={{ ...inputStyle() }}>
              <option value="">All Vendors</option>
              {cascadeVendors.map(v=><option key={v} value={v}>{v}</option>)}
            </select>
            <select value={pmFilter} onChange={e=>{setPmFilter(e.target.value);setPage(1);}}
              style={{ ...inputStyle() }}>
              <option value="">All PMs</option>
              {cascadePMs.map(pm=><option key={pm} value={pm}>{pm}</option>)}
            </select>
            <select value={regionFilter} onChange={e=>{setRegionFilter(e.target.value);setPage(1);}}
              style={{ ...inputStyle() }}>
              <option value="">All Regions</option>
              {cascadeRegions.map(r=><option key={r} value={r}>{r}</option>)}
            </select>
            <select value={typeFilter} onChange={e=>{ setTypeFilter(e.target.value); setPage(1); }}
              style={{ ...inputStyle() }}>
              <option value="All Types">All Types</option>
              {cascadeTypes.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
            {hasFilter ? (
              <button onClick={()=>{setSearch('');setProjectStatusFilter('');setVendorFilter('');setPmFilter('');setRegionFilter('');setTypeFilter('All Types');setPage(1);}}
                style={{ background:T.dangerBg, border:`1px solid #FECACA`, borderRadius:8, padding:'8px 14px', color:T.danger, cursor:'pointer', fontSize:12, fontWeight:700, whiteSpace:'nowrap' as const }}>
                ✕ Clear
              </button>
            ) : <div />}
          </div>
          );
        })()}

        <div style={{ display:'flex', gap:8, marginBottom:16, alignItems:'center', justifyContent:'flex-end' }}>
          <input ref={poFileRef} type="file" accept=".pdf,application/pdf" onChange={handlePOUpload} style={{ display:'none' }} />
          {profile?.role === 'super_admin' && <>
            <button onClick={()=>{ setPoStatusResult(null); setPoStatusFile(null); setShowPoStatusModal(true); }}
              style={{ ...btnSecondary, display:'flex', alignItems:'center', gap:6 }}>
              📊 Update PO Status
            </button>
            <button onClick={()=>poFileRef.current?.click()} disabled={extracting}
              style={{ ...btnSecondary, display:'flex', alignItems:'center', gap:6, opacity:extracting?0.7:1, cursor:extracting?'not-allowed':'pointer' }}>
              {extracting
                ? <><div style={{ width:13,height:13,border:'2px solid #CBD5E1',borderTopColor:T.primary,borderRadius:'50%',animation:'spin 0.7s linear infinite' }} />Extracting…</>
                : '📎 Upload PO'}
            </button>
            <button onClick={openNewProjectModal} style={{ ...btnPrimary }}>{'+ New Project'}</button>
          </>}
        </div>

        <div style={card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ fontSize:14, fontWeight:600, color:T.text }}>
                {statusFilter==='All'&&ageMin===null?'All Projects':`Filtered Projects`} · {filtered.length} records
              </div>
              {['super_admin','rm','pm','vendor'].includes(profile?.role ?? '') && filtered.length > 0 && (
                <button
                  onClick={exportToExcel}
                  title="Export to Excel"
                  style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', fontSize:12, fontWeight:600,
                    color:'#166534', background:'#DCFCE7', border:'1px solid #86EFAC', borderRadius:7, cursor:'pointer' }}>
                  📥 Excel
                </button>
              )}
            </div>
          </div>
          <div style={{ overflowX:'auto' }}>
            <div style={{ overflowX:'auto' as const, borderRadius:10, border:`1px solid ${T.border}` }}>
            <table style={{ width:'100%', borderCollapse:'collapse' as const, minWidth:1400 }} onClick={()=>setPoPopover(null)}>
              <thead>
                <tr>
                  <th style={{ padding:'10px 12px', fontSize:10, fontWeight:700, textTransform:'uppercase' as const,
                      color:T.primary, textAlign:'left' as const, borderBottom:`2px solid ${T.primaryMid}`,
                      whiteSpace:'nowrap' as const, background:T.primaryLight, cursor:'pointer' }}
                    onClick={()=>setSortDir(d=>d==='asc'?'desc':'asc')}>
                    S.No. {sortDir==='asc'?'↑':'↓'}
                  </th>
                  {['PO Number','PO Count','Aging','PO Status','Project Name','Project ID','Indus ID','Site Name','Project Status','Delivery Date'].map((h,i)=>(
                    <th key={i} style={{ padding:'10px 12px', fontSize:10, fontWeight:700, textTransform:'uppercase' as const,
                      color:T.primary, textAlign:'left' as const, borderBottom:`2px solid ${T.primaryMid}`,
                      whiteSpace:'nowrap' as const, background:T.primaryLight }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projLoading && (
                  <tr><td colSpan={11} style={{ padding:40, textAlign:'center' as const }}>
                    <div className="spinner" style={{ margin:'0 auto', width:32, height:32, borderTopColor:T.primary, borderColor:`${T.primary}30` }} />
                    <div style={{ fontSize:13, color:T.textMuted, marginTop:10 }}>Loading projects...</div>
                  </td></tr>
                )}
                {!projLoading && filtered.length === 0 && (
                  <tr><td colSpan={11} style={{ padding:32, textAlign:'center' as const, color:T.textDim }}>No projects found</td></tr>
                )}
                {[...filtered].sort((a:any,b:any)=>{ const ai=filtered.indexOf(a), bi=filtered.indexOf(b); return sortDir==='asc'?ai-bi:bi-ai; }).slice((page-1)*PER_PAGE, page*PER_PAGE).map((p:any, idx:number) => {
                  const delDate = p.endDate;
                  const delDt   = delDate ? new Date(delDate) : null;
                  const isPast  = delDt && !['completed','not_started'].includes(p.status) ? delDt < new Date() : false;
                  const ageDays = getAgeDays(p.id);
                  const ageColor= ageDays > 90 ? '#DC2626' : ageDays > 60 ? '#D97706' : '#0D9488';
                  const ageBg   = ageDays > 90 ? '#FEF2F2' : ageDays > 60 ? '#FFFBEB' : '#F0FDFA';
                  return (
                    <tr key={p.id} style={{ background:idx%2===0?'#fff':T.bg, cursor:'pointer' }}
                      onClick={()=>{ sessionStorage.setItem('projectsPage', String(page)); router.push(`/projects/${p.id}`); }}
                      onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background=T.primaryLight}
                      onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background=idx%2===0?'#fff':T.bg}>
                      <td style={{ padding:'10px 12px', color:T.textMuted, fontSize:12, borderBottom:`1px solid ${T.border}` }}>{sortDir==='asc'?(page-1)*PER_PAGE+idx+1:filtered.length-(page-1)*PER_PAGE-idx}</td>
                      <td style={{ padding:'10px 12px', borderBottom:`1px solid ${T.border}` }}>
                        <div style={{ fontWeight:700, color:T.primary, fontSize:13 }}>{p.poNo || '—'}</div>
                        <div style={{ fontSize:10, color:T.textMuted }}>{p.poDate ? new Date(p.poDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</div>
                      </td>
                      <td style={{ padding:'10px 12px', borderBottom:`1px solid ${T.border}`, textAlign:'center' as const, position:'relative' as const }}
                        onClick={ev=>{ ev.stopPropagation(); setPoPopover(poPopover===p.id?null:p.id); }}>
                        {p.poNo && poCount(p.poNo) > 1
                          ? <span style={{ fontSize:12, fontWeight:700, color:'#7C3AED', background:'#F3E8FF', padding:'2px 10px', borderRadius:20, cursor:'pointer' }}>{poCount(p.poNo)}</span>
                          : <span style={{ fontSize:12, color:T.textDim }}>1</span>}
                        {poPopover === p.id && (
                          <div style={{ position:'absolute', top:'100%', left:0, zIndex:200, background:'#fff', border:`1px solid ${T.border}`,
                            borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,0.15)', padding:12, minWidth:180, textAlign:'left' as const }}
                            onClick={ev=>ev.stopPropagation()}>
                            <div style={{ fontSize:11, fontWeight:700, color:T.textMuted, marginBottom:8, textTransform:'uppercase' as const }}>
                              Projects for PO {p.poNo}
                            </div>
                            {projects.filter((p2:any)=>p2.poNo===p.poNo).map((x:any)=>(
                              <div key={x.id} onClick={()=>router.push(`/projects/${x.id}`)}
                                style={{ padding:'5px 8px', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:600, color:T.primary,
                                  marginBottom:2, background: x.id===p.id ? T.primaryLight : 'transparent' }}
                                onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background=T.primaryLight}
                                onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background=x.id===p.id?T.primaryLight:'transparent'}>
                                {x.id}
                                {x.id===p.id && <span style={{ fontSize:10, color:T.textMuted, marginLeft:4 }}>(this)</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td style={{ padding:'10px 12px', borderBottom:`1px solid ${T.border}` }}>
                        <span style={{ fontSize:12, fontWeight:600, color:ageColor, background:ageBg, padding:'2px 8px', borderRadius:10 }}>{ageDays}d</span>
                      </td>
                      <td style={{ padding:'10px 12px', borderBottom:`1px solid ${T.border}` }}>
                        <span style={{ fontSize:11, fontWeight:600, color:(p as any).poStatus==='Closed'?'#DC2626':(p as any).poStatus==='Open'?'#059669':'#6B7280', background:(p as any).poStatus==='Closed'?'#FEF2F2':(p as any).poStatus==='Open'?'#D1FAE5':'#F9FAFB', padding:'3px 10px', borderRadius:20, whiteSpace:'nowrap' as const }}>{(p as any).poStatus || '—'}</span>
                      </td>
                      <td style={{ padding:'10px 12px', borderBottom:`1px solid ${T.border}`, fontSize:12, color:T.text }}>{(p as any).type || '—'}</td>
                      <td style={{ padding:'10px 12px', borderBottom:`1px solid ${T.border}`, fontSize:12, color:T.text }}>{(p as any).projectId || '—'}</td>
                      <td style={{ padding:'10px 12px', borderBottom:`1px solid ${T.border}`, fontSize:12, color:T.text }}>{p.indusId || '—'}</td>
                      <td style={{ padding:'10px 12px', borderBottom:`1px solid ${T.border}`, fontSize:12, color:T.text }}>{p.site || '—'}</td>
                      <td style={{ padding:'10px 12px', borderBottom:`1px solid ${T.border}` }}>
                        <span style={{ fontSize:11, fontWeight:600, color:'#0369A1', background:'#E0F2FE', padding:'3px 10px', borderRadius:20, whiteSpace:'nowrap' as const }}>{(p as any).projectStatus || '—'}</span>
                      </td>
                      <td style={{ padding:'10px 12px', borderBottom:`1px solid ${T.border}`, whiteSpace:'nowrap' as const }}>
                        {delDt ? <span style={{ fontSize:12, color:isPast?'#DC2626':'#374151', fontWeight:isPast?600:400 }}>
                          {delDt.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
                          {isPast && <span style={{ fontSize:10, display:'block', color:'#DC2626' }}>Overdue</span>}
                        </span> : <span style={{ color:T.textDim }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 4px', borderTop:`1px solid ${T.border}`, marginTop:4 }}>
            <div style={{ fontSize:12, color:T.textMuted }}>
              Showing {Math.min((page-1)*PER_PAGE+1, filtered.length)}–{Math.min(page*PER_PAGE, filtered.length)} of {filtered.length} projects
            </div>
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              <button onClick={()=>setPage(p=>{ const n=Math.max(1,p-1); router.replace(`/projects?page=${n}`, undefined, {shallow:true}); return n; })} disabled={page===1}
                style={{ padding:'5px 12px', borderRadius:6, border:`1px solid ${T.border}`, background:'#fff', cursor:page===1?'not-allowed':'pointer', fontSize:12, color:page===1?T.textDim:T.text, opacity:page===1?0.5:1 }}>← Prev</button>
              {Array.from({length:Math.min(5,Math.ceil(filtered.length/PER_PAGE))},(_, i)=>{
                const totalPages = Math.ceil(filtered.length/PER_PAGE);
                const start = Math.max(1, Math.min(page-2, totalPages-4));
                const pg = start+i;
                return pg<=totalPages ? (
                  <button key={pg} onClick={()=>{ setPage(pg); router.replace(`/projects?page=${pg}`, undefined, {shallow:true}); }}
                    style={{ padding:'5px 10px', borderRadius:6, border:`1px solid ${pg===page?T.primary:T.border}`, background:pg===page?T.primaryLight:'#fff', cursor:'pointer', fontSize:12, color:pg===page?T.primary:T.text, fontWeight:pg===page?700:400 }}>{pg}</button>
                ) : null;
              })}
              <button onClick={()=>setPage(p=>{ const n=Math.min(Math.ceil(filtered.length/PER_PAGE),p+1); router.replace(`/projects?page=${n}`, undefined, {shallow:true}); return n; })} disabled={page>=Math.ceil(filtered.length/PER_PAGE)}
                style={{ padding:'5px 12px', borderRadius:6, border:`1px solid ${T.border}`, background:'#fff', cursor:page>=Math.ceil(filtered.length/PER_PAGE)?'not-allowed':'pointer', fontSize:12, color:page>=Math.ceil(filtered.length/PER_PAGE)?T.textDim:T.text, opacity:page>=Math.ceil(filtered.length/PER_PAGE)?0.5:1 }}>Next →</button>
            </div>
          </div>
        </div>
      </div>
      {/* ── Update PO Status Modal ── */}
      {showPoStatusModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:14, padding:28, width:500, maxWidth:'95vw', boxShadow:'0 8px 40px rgba(0,0,0,0.18)' }}>
            <div style={{ fontSize:16, fontWeight:700, marginBottom:6 }}>📊 Update PO Status in Bulk</div>
            <div style={{ fontSize:12, color:'#6B7280', marginBottom:20 }}>Upload an Excel with columns: <strong>PO Number</strong> and <strong>PO Status</strong></div>

            <input ref={poStatusFileRef} type="file" accept=".xlsx,.xls,.csv"
              onChange={e=>{ setPoStatusFile(e.target.files?.[0]||null); setPoStatusResult(null); }}
              style={{ display:'none' }} />

            <div onClick={()=>poStatusFileRef.current?.click()}
              style={{ border:'2px dashed #CBD5E1', borderRadius:8, padding:'20px', textAlign:'center', cursor:'pointer', marginBottom:16, background:'#F8FAFC' }}>
              {poStatusFile
                ? <div style={{ fontSize:13, color:'#0D9488', fontWeight:600 }}>📄 {poStatusFile.name}</div>
                : <div style={{ fontSize:13, color:'#9CA3AF' }}>Click to select Excel file (.xlsx, .xls)</div>}
            </div>

            {poStatusResult && !poStatusResult.error && (
              <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:8, padding:14, marginBottom:16 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#166534', marginBottom:6 }}>✅ Update Complete</div>
                <div style={{ fontSize:12, color:'#166534' }}>{poStatusResult.totalProjectsUpdated} projects updated across {poStatusResult.totalPoNumbers} PO numbers</div>
                {poStatusResult.notFound?.length > 0 && (
                  <div style={{ fontSize:12, color:'#DC2626', marginTop:6 }}>⚠️ Not found: {poStatusResult.notFound.join(', ')}</div>
                )}
              </div>
            )}
            {poStatusResult?.error && (
              <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, padding:12, marginBottom:16, fontSize:12, color:'#DC2626' }}>
                ❌ {poStatusResult.error}
              </div>
            )}

            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={()=>setShowPoStatusModal(false)} style={{ padding:'9px 20px', borderRadius:8, border:'1.5px solid #E5E7EB', background:'#fff', cursor:'pointer', fontSize:13 }}>Close</button>
              <button onClick={handlePoStatusUpload} disabled={!poStatusFile||updatingPoStatus}
                style={{ padding:'9px 20px', borderRadius:8, border:'none', background:'#0D9488', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, opacity:(!poStatusFile||updatingPoStatus)?0.6:1 }}>
                {updatingPoStatus ? 'Updating…' : 'Upload & Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:14, padding:28, width:480, maxWidth:'95vw', boxShadow:'0 8px 40px rgba(0,0,0,0.18)' }}>
            <div style={{ fontSize:16, fontWeight:700, marginBottom:20 }}>🆕 New Project</div>
            {([
              ['Project ID *','projectId','text','e.g. R/RL-8458254'],
              ['PO Number *','poNo','text','e.g. 16030397730'],
              ['PO Date *','poDate','date',''],
              ['Indus ID *','indusId','text','e.g. IN-3460945'],
              ['Site Name','site','text',''],
              ['Region','region','text',''],
            ] as [string,string,string,string][]).map(([label,field,type,ph])=>(
              <div key={field} style={{ marginBottom:14 }}>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#6B7280', marginBottom:4, textTransform:'uppercase' as const }}>{label}</label>
                {type === 'date' ? (
                  <DateInput value={(newForm as any)[field]}
                    onChange={v=>{ setNewForm((f:any)=>({...f,[field]:v})); setNewFormErrors((er:any)=>({...er,[field]:''})); }}
                    style={{ width:'100%', padding:'8px 10px', border:`1.5px solid ${(newFormErrors as any)[field]?'#EF4444':'#E5E7EB'}`, borderRadius:7, fontSize:13, outline:'none', boxSizing:'border-box' as const }} />
                ) : (
                  <input type={type} placeholder={ph} value={(newForm as any)[field]}
                    onChange={e=>{ setNewForm((f:any)=>({...f,[field]:e.target.value})); setNewFormErrors((er:any)=>({...er,[field]:''})); }}
                    style={{ width:'100%', padding:'8px 10px', border:`1.5px solid ${(newFormErrors as any)[field]?'#EF4444':'#E5E7EB'}`, borderRadius:7, fontSize:13, outline:'none', boxSizing:'border-box' as const }} />
                )}
                {(newFormErrors as any)[field] && <div style={{ fontSize:11, color:'#EF4444', marginTop:3 }}>{(newFormErrors as any)[field]}</div>}
              </div>
            ))}
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
              <button onClick={()=>setShowNewModal(false)} style={{ padding:'9px 20px', borderRadius:8, border:'1.5px solid #E5E7EB', background:'#fff', cursor:'pointer', fontSize:13 }}>Cancel</button>
              <button onClick={saveNewProject} disabled={creating} style={{ padding:'9px 20px', borderRadius:8, border:'none', background:'#0D9488', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, opacity:creating?0.7:1 }}>{creating?'Creating…':'Create Project'}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
