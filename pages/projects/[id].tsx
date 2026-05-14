// v-fix-braces
import React, { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import CreatableSelect from '@/components/CreatableSelect';
import Toast from '@/components/Toast';
import { useAuth } from '@/context/AuthContext';
import { useUpload } from '@/lib/useUpload';
import { T, card, badge, btnPrimary, btnSecondary, inputStyle } from '@/lib/theme';
import { STN_SRN_DATA } from '@/lib/stnSrnData';
import { getPaidAmount, getProjectTransactions, PAYMENT_TRANSACTIONS, PaymentTransaction } from '@/lib/expensesData';

// ── Mock project data ────────────────────────────────────────────
const PROJECT_DB: Record<string,any> = {
  'VE-2025-001': { id:'VE-2025-001', ptwTicketId:'PTW-2025-1001', ptwSupervisor:'Rajesh Kumar', ptwDateFrom:'2025-04-01', ptwDateTo:'2025-06-30', projectName:'Chennai Metro Phase II', poNo:'PO-2025-001', indusId:'IND-1001', site:'Chennai North', region:'Tamil Nadu', type:'Tower Erection', status:'in_progress', progress:65, poValue:1850000, billedAmount:1200000, paidAmount:950000, startDate:'2025-04-01', endDate:'2025-06-30', rm:'Ramesh Kumar', pm:'Arun Kumar', vendor:'ABC Telecom Services', vendorContact:'Rajesh Kumar', vendorPhone:'+91 98765 43210', vendorEmail:'rajesh@abctelecom.com', workScope:'Civil foundation and structure works for Station 3 & 4.', remarks:'Foundation work in progress.' },
  'VE-2025-002': { id:'VE-2025-002', ptwTicketId:'PTW-2025-1002', ptwSupervisor:'Vikram Singh', ptwDateFrom:'2025-03-01', ptwDateTo:'2025-04-30', projectName:'Bengaluru East Maint.',  poNo:'PO-2025-001', indusId:'IND-1002', site:'Bengaluru East', region:'Karnataka',  type:'Tower Maintenance', status:'delayed', progress:30, poValue:420000, billedAmount:150000, paidAmount:100000, startDate:'2025-03-01', endDate:'2025-04-30', rm:'Amit Sharma', pm:'Priya Sharma', vendor:'XYZ Infra Solutions', vendorContact:'Priya Sharma', vendorPhone:'+91 98765 43211', vendorEmail:'priya@xyzinfra.com', workScope:'Antenna replacement and tower painting.', remarks:'Delayed due to material shortage.' },
  'VE-2025-003': { id:'VE-2025-003', ptwTicketId:'PTW-2025-1003', ptwSupervisor:'Arun Singh', ptwDateFrom:'2025-04-10', ptwDateTo:'2025-05-20', projectName:'Hyderabad Component',    poNo:'PO-2025-002', indusId:'IND-1003', site:'Hyderabad',      region:'Tamil Nadu', type:'Component Replace', status:'billing_review', progress:100, poValue:760000, billedAmount:760000, paidAmount:600000, startDate:'2025-04-10', endDate:'2025-05-20', rm:'Ramesh Kumar', pm:'Arun Kumar', vendor:'TowerTech Pvt Ltd', vendorContact:'Arun Singh', vendorPhone:'+91 98765 43212', vendorEmail:'arun@towertech.com', workScope:'RRU replacement and fiber termination.', remarks:'PM approved. Pending billing.' },
  'VE-2025-004': { id:'VE-2025-004', ptwTicketId:'', ptwSupervisor:'', ptwDateFrom:'', ptwDateTo:'', projectName:'Chennai Fiber Network',  poNo:'PO-2025-002', indusId:'IND-1004', site:'Chennai South', region:'Tamil Nadu', type:'Fiber Installation', status:'in_progress', progress:45, poValue:1230000, billedAmount:500000, paidAmount:400000, startDate:'2025-04-20', endDate:'2025-07-15', rm:'Ramesh Kumar', pm:'Vijay Kumar', vendor:'', vendorContact:'', vendorPhone:'', vendorEmail:'', workScope:'Fiber laying along Station 5-12.', remarks:'Vendor not assigned yet.' },
  'VE-2025-005': { id:'VE-2025-005', ptwTicketId:'', ptwSupervisor:'', ptwDateFrom:'', ptwDateTo:'', projectName:'Coimbatore Tower',       poNo:'PO-2025-003', indusId:'IND-1005', site:'Coimbatore',   region:'Tamil Nadu', type:'Tower Erection',    status:'pending', progress:10, poValue:2200000, billedAmount:0, paidAmount:0, startDate:'2025-05-01', endDate:'2025-08-31', rm:'Ramesh Kumar', pm:'Arun Kumar', vendor:'', vendorContact:'', vendorPhone:'', vendorEmail:'', workScope:'New tower erection at Coimbatore North.', remarks:'Site survey completed.' },
  'VE-2025-006': { id:'VE-2025-006', ptwTicketId:'', ptwSupervisor:'', ptwDateFrom:'', ptwDateTo:'', projectName:'Pune Civil Works',       poNo:'PO-2025-003', indusId:'IND-1006', site:'Pune West',     region:'Maharashtra', type:'Civil Works',     status:'delayed', progress:20, poValue:540000, billedAmount:100000, paidAmount:80000, startDate:'2025-02-01', endDate:'2025-04-30', rm:'Amit Sharma', pm:'Pooja Mehta', vendor:'BuildRight Constructions', vendorContact:'Vikram Patel', vendorPhone:'+91 98765 43214', vendorEmail:'vikram@buildright.com', workScope:'RCC foundation and retaining wall.', remarks:'Severely delayed.' },
  'VE-2025-007': { id:'VE-2025-007', ptwTicketId:'', ptwSupervisor:'', ptwDateFrom:'', ptwDateTo:'', projectName:'Mumbai Power Works',     poNo:'PO-2025-004', indusId:'IND-1007', site:'Mumbai Central', region:'Maharashtra', type:'Power Works',   status:'billing_review', progress:100, poValue:890000, billedAmount:890000, paidAmount:700000, startDate:'2025-04-05', endDate:'2025-05-31', rm:'Amit Sharma', pm:'Pooja Mehta', vendor:'PowerSys India', vendorContact:'Sunita Reddy', vendorPhone:'+91 98765 43215', vendorEmail:'sunita@powersys.com', workScope:'DG set installation and power cabling.', remarks:'Completed. Billing review pending.' },
  'VE-2025-008': { id:'VE-2025-008', ptwTicketId:'', ptwSupervisor:'', ptwDateFrom:'', ptwDateTo:'', projectName:'Delhi NCR Maintenance',  poNo:'PO-2025-004', indusId:'IND-1008', site:'Delhi NCR',     region:'Delhi',      type:'Tower Maintenance', status:'in_progress', progress:55, poValue:380000, billedAmount:200000, paidAmount:180000, startDate:'2025-05-01', endDate:'2025-05-31', rm:'Amit Sharma', pm:'Rajeev Singh', vendor:'XYZ Infra Solutions', vendorContact:'Priya Sharma', vendorPhone:'+91 98765 43211', vendorEmail:'priya@xyzinfra.com', workScope:'Tower antenna realignment.', remarks:'In progress.' },
  'VE-2025-009': { id:'VE-2025-009', ptwTicketId:'', ptwSupervisor:'', ptwDateFrom:'', ptwDateTo:'', projectName:'Kochi Component Repl.', poNo:'PO-2025-005', indusId:'IND-1009', site:'Kochi',         region:'Kerala',     type:'Component Replace', status:'delayed', progress:40, poValue:650000, billedAmount:250000, paidAmount:200000, startDate:'2025-03-01', endDate:'2025-04-30', rm:'Ramesh Kumar', pm:'Vijay Kumar', vendor:'TowerTech Pvt Ltd', vendorContact:'Arun Singh', vendorPhone:'+91 98765 43212', vendorEmail:'arun@towertech.com', workScope:'Feeder cable replacement.', remarks:'Delayed — parts awaited.' },
  'VE-2025-010': { id:'VE-2025-010', ptwTicketId:'', ptwSupervisor:'', ptwDateFrom:'', ptwDateTo:'', projectName:'Kolkata Fiber Install.', poNo:'PO-2025-005', indusId:'IND-1010', site:'Kolkata North', region:'West Bengal', type:'Fiber Installation', status:'pending', progress:0, poValue:975000, billedAmount:0, paidAmount:0, startDate:'2025-06-01', endDate:'2025-08-31', rm:'Ramesh Kumar', pm:'Arun Kumar', vendor:'', vendorContact:'', vendorPhone:'', vendorEmail:'', workScope:'Underground fiber ducting.', remarks:'Not started.' },
};


const VENDOR_LIST = [
  { name:'ABC Telecom Services',     contact:'Rajesh Kumar',  phone:'+91 98765 43210', email:'rajesh@abctelecom.com'  },
  { name:'XYZ Infra Solutions',      contact:'Priya Sharma',  phone:'+91 98765 43211', email:'priya@xyzinfra.com'     },
  { name:'TowerTech Pvt Ltd',        contact:'Arun Singh',    phone:'+91 98765 43212', email:'arun@towertech.com'     },
  { name:'NetConnect Services',      contact:'Deepa Nair',    phone:'+91 98765 43213', email:'deepa@netconnect.com'   },
  { name:'PowerSys India',           contact:'Sunita Reddy',  phone:'+91 98765 43215', email:'sunita@powersys.com'    },
  { name:'BuildRight Constructions', contact:'Vikram Patel',  phone:'+91 98765 43214', email:'vikram@buildright.com'  },
];

const VENDORS = ['ABC Telecom Services','XYZ Infra Solutions','TowerTech Pvt Ltd','NetConnect Services','PowerSys India','BuildRight Constructions'];
const REGIONS  = ['Tamil Nadu','Karnataka','Telangana','Maharashtra','Delhi','Kerala','West Bengal'];
const TYPES    = ['Tower Erection','Tower Maintenance','Component Replacement','Fiber Installation','Civil Works','Power Works'];

const DOC_TYPES = [
  { key:'safety_photos',   label:'Safety Photos',   icon:'📷', accept:'image/*'           },
  { key:'site_photos',     label:'Site Photos',     icon:'🏗',  accept:'image/*'           },
  { key:'jmr_document',   label:'JMR Document',    icon:'📄', accept:'.pdf,.doc,.docx'    },
  { key:'ac_certificate', label:'AC Certificate',  icon:'🏅', accept:'.pdf,.doc,.docx'    },
  { key:'noc_document',   label:'NOC Document',    icon:'📋', accept:'.pdf,.doc,.docx'    },
  { key:'drawing_document',label:'Drawing Document',icon:'📐', accept:'.pdf,.dwg,.png,.jpg'},
];

const MOCK_DOCS: Record<string, { name:string; size:string; url:string; isImage:boolean }[]> = {
  safety_photos:    [{ name:'safety_site_01.jpg', size:'1.2 MB', url:'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400', isImage:true },{ name:'safety_ppe.jpg', size:'980 KB', url:'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400', isImage:true }],
  site_photos:      [{ name:'site_progress.jpg', size:'2.1 MB', url:'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=400', isImage:true }],
  jmr_document:     [{ name:'JMR_VE2025001.pdf', size:'456 KB', url:'', isImage:false }],
  ac_certificate:   [],
  noc_document:     [],
  drawing_document: [{ name:'AsBuilt_Drawing_v2.pdf', size:'1.8 MB', url:'', isImage:false }],
};

const STATUS_FLOW = ['pending','in_progress','submitted','under_review','pm_approved','billing_review','completed','delayed'];
const STATUS_LABELS: Record<string,string> = { pending:'Pending', in_progress:'In Progress', submitted:'Submitted', under_review:'Under Review', pm_approved:'PM Approved', billing_review:'Billing Review', completed:'Completed', delayed:'Delayed' };
const STATUS_COLOR: Record<string,string>  = { pending:'#D97706', in_progress:'#2563EB', submitted:'#7C3AED', under_review:'#7C3AED', pm_approved:'#0D9488', billing_review:'#D97706', completed:'#16A34A', delayed:'#DC2626' };

// Activity log is combined with payment transactions
const BASE_ACTIVITY_LOG = [
  { date:'20/05/2025 04:45 PM', action:'Site Photos uploaded by vendor', by:'ABC Telecom Services', role:'Vendor'  },
  { date:'19/05/2025 05:00 PM', action:'Vendor assigned to project',     by:'Arun Kumar',           role:'PM'      },
  { date:'18/05/2025 03:00 PM', action:'PM review notes added',          by:'Arun Kumar',           role:'PM'      },
  { date:'17/05/2025 10:00 AM', action:'Invoice INV-2025-012 submitted', by:'Finance Team',         role:'Billing' },
  { date:'15/05/2025 09:00 AM', action:'Project created',                by:'Ramesh Kumar',         role:'RM'      },
];

const fmt = (v:number) => `₹${v.toLocaleString('en-IN')}`;

export default function ProjectDetailPage() {
  const router  = useRouter();
  const { id }  = router.query;
  const { profile, can, loading } = useAuth();
  const { upload } = useUpload();

  const role       = profile?.role || 'viewer';
  // Show Edit button if user can edit ANY section
  const canEditDetails = !loading && can('sec_project_details',   'edit');
  const canEdit        = !loading && (
    can('sec_project_details',   'edit') ||
    can('sec_vendor_assignment', 'edit') ||
    can('sec_ptw',               'edit') ||
    can('sec_financial',         'edit')
  );
  const canEditFin = !loading && can('sec_financial', 'edit');
  const isBilling  = !loading && can('sec_billing_review', 'edit');

  // Section visibility from permissions
  const showFinancial     = !loading && can('sec_financial',        'read');
  const showVendor        = !loading && can('sec_vendor_assignment', 'read');
  const showDocs          = !loading && can('sec_work_documents',   'read');
  const showSTNSRN        = !loading && can('sec_stn_srn',          'read');
  const showBillingReview = !loading && can('sec_billing_review',   'read');
  const showActivityLog   = !loading && can('sec_activity_log',     'read');
  const canEditVendor     = !loading && can('sec_vendor_assignment', 'edit');
  const canEditPTW        = !loading && can('sec_ptw',              'edit');

  const showPTW           = !loading && can('sec_ptw',              'read');

  const [projects, setProjects] = useState(PROJECT_DB);
  const [allTransactions, setAllTransactions] = React.useState(PAYMENT_TRANSACTIONS);
  const [editMode, setEditMode] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState<{msg:string;type:'success'|'error'|'info'}|null>(null);

  // Preview modal
  const [previewDoc, setPreviewDoc] = useState<{name:string;url:string;isImage:boolean}|null>(null);

  // Billing checklist
  const [checklist, setChecklist] = useState({ stn:false, srn:false, ptw:false, materials:false });
  const [billingNotes, setBillingNotes] = useState('');

  // PM review
  const [reviewNotes,  setReviewNotes]  = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showReject,   setShowReject]   = useState(false);

  if (!router.isReady) return (
    <Layout>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', flexDirection:'column', gap:16 }}>
        <div className="spinner" style={{ width:32, height:32, borderTopColor:T.primary, borderColor:`${T.primary}30` }} />
        <div style={{ fontSize:14, color:T.textMuted }}>Loading project…</div>
      </div>
    </Layout>
  );

  const project = id ? projects[id as string] : null;
  if (!project) return (
    <Layout>
      <div style={{ ...card, textAlign:'center', padding:60, margin:20 }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🔍</div>
        <h2 style={{ fontSize:20, fontWeight:700, color:T.text, marginBottom:12 }}>Project Not Found</h2>
        <Link href="/projects" style={{ background:T.primary, color:'#fff', borderRadius:8, padding:'10px 20px', textDecoration:'none', fontSize:13, fontWeight:600 }}>← Back to Projects</Link>
      </div>
    </Layout>
  );

  const p = project;
  const isCompleted = ['completed','billing_review'].includes(p.status);
  const stnData = STN_SRN_DATA.find(s => s.projectId === p.id);
  const st = STATUS_COLOR[p.status] || '#64748B';

  // Edit form state
  const [form, setForm] = useState({ ...p });
  const F = (label:string, key:string, type='text', options?:string[], readOnly=false, sectionCanEdit=canEditDetails) => (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:'block', fontSize:12, fontWeight:600, color:T.textMuted, marginBottom:5, textTransform:'uppercase', letterSpacing:0.3 }}>{label}</label>
      {editMode && !readOnly && sectionCanEdit ? (
        options ? (
          <select value={(form as any)[key]} onChange={e=>setForm((f:any)=>({...f,[key]:e.target.value}))} style={{ ...inputStyle(), width:'100%' }}>
            {options.map(o=><option key={o}>{o}</option>)}
          </select>
        ) : (
          <input type={type} value={(form as any)[key]||''} onChange={e=>setForm((f:any)=>({...f,[key]:e.target.value}))}
            style={{ ...inputStyle(), width:'100%', boxSizing:'border-box' as const }} />
        )
      ) : (
        <div style={{ fontSize:14, fontWeight:600, color:T.text, padding:'8px 0', borderBottom:`1px solid ${T.border}` }}>
          {(p as any)[key] || '—'}
        </div>
      )}
    </div>
  );

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setProjects(prev => ({ ...prev, [p.id]: { ...prev[p.id], ...form } }));
      setSaving(false);
      setEditMode(false);
      setToast({ msg:'Project updated successfully!', type:'success' });
    }, 600);
  };

  const updateStatus = (newStatus: string, msg: string) => {
    setProjects(prev => ({ ...prev, [p.id]: { ...prev[p.id], status:newStatus } }));
    setToast({ msg, type:'success' });
  };

  const handleBillingDone = () => {
    if (!checklist.stn || !checklist.srn || !checklist.ptw || !checklist.materials) {
      setToast({ msg:'All 4 checklist items must be completed before releasing payment.', type:'error' });
      return;
    }
    updateStatus('completed', '✅ Billing complete! Project marked as Completed.');
  };

  const sectionTitle = (icon:string, title:string, extra?:React.ReactNode) => (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, paddingBottom:10, borderBottom:`2px solid ${T.primaryMid}` }}>
      <div style={{ fontSize:15, fontWeight:700, color:T.primary }}>{icon} {title}</div>
      {extra}
    </div>
  );

  const roleColor: Record<string,string> = { Vendor:T.info, PM:T.primary, RM:T.success, Billing:'#7C3AED', Payment:T.success };
  const projectTxns = allTransactions.filter(t => t.projectId === p.id);
  const txnLogs = projectTxns.map(t => ({
    date: t.addedAt,
    action: `Payment of ${fmt(t.amount)} — Txn: ${t.txnNumber}`,
    by: t.addedBy,
    role: 'Payment' as const,
  }));
  const ACTIVITY_LOG = [...txnLogs, ...BASE_ACTIVITY_LOG];

  return (
    <Layout>
      <div className="fade-in">
        {/* ── Header ── */}
        <div style={{ ...card, marginBottom:20, padding:'20px 24px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12, marginBottom:16 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                <Link href="/projects" style={{ color:T.textMuted, textDecoration:'none', fontSize:13 }}>← Projects</Link>
                <span style={{ color:T.textDim }}>/</span>
                <h1 style={{ fontSize:20, fontWeight:800, color:T.text, margin:0 }}>{p.id}</h1>
                <span style={{ background:`${st}18`, color:st, border:`1px solid ${st}40`, padding:'3px 12px', borderRadius:20, fontSize:12, fontWeight:700 }}>{STATUS_LABELS[p.status]||p.status}</span>
              </div>
              <div style={{ fontSize:14, color:T.textMuted }}>{p.projectName} · {p.site} · {p.region}</div>
              <div style={{ fontSize:13, color:T.textDim, marginTop:2 }}>PO: {p.poNo} · Indus ID: {p.indusId}</div>
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {canEdit && !editMode && (
                <button onClick={()=>{ setForm({...p}); setEditMode(true); }} style={{ ...btnSecondary, fontSize:13 }}>✏️ Edit Project</button>
              )}
              {editMode && (
                <>
                  <button onClick={()=>setEditMode(false)} style={{ ...btnSecondary, fontSize:13 }}>Cancel</button>
                  <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, fontSize:13, opacity:saving?0.8:1 }}>
                    {saving?'Saving…':'💾 Save Changes'}
                  </button>
                </>
              )}
              {/* PM Review actions */}
              {canEdit && (p.status==='submitted'||p.status==='under_review') && (
                <>
                  <button onClick={()=>updateStatus('pm_approved','Project approved and sent to billing!')} style={{ ...btnPrimary, background:T.success, fontSize:13 }}>✅ Approve</button>
                  <button onClick={()=>setShowReject(true)} style={{ ...btnSecondary, borderColor:T.danger, color:T.danger, fontSize:13 }}>❌ Reject</button>
                </>
              )}
            </div>
          </div>
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:T.textMuted, marginBottom:5 }}>
              <span>Overall Progress</span>
              <span style={{ fontWeight:700, color:p.progress===100?T.success:st }}>{p.progress}%</span>
            </div>
            <div style={{ height:8, background:T.border, borderRadius:4 }}>
              <div style={{ height:'100%', width:`${p.progress}%`, background:p.progress===100?T.success:p.status==='delayed'?T.danger:T.primary, borderRadius:4, transition:'width 0.5s' }} />
            </div>
          </div>
        </div>

        {/* ── 1. Project Details + Financial ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
          <div style={card}>
            {sectionTitle('📋','Project Details')}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
              {F('Project No',       'id',          'text', undefined, true)}
              {F('PO Number',        'poNo',        'text', undefined, true)}
              {F('Indus ID',         'indusId',     'text', undefined, true)}
              {F('Site Name',        'site')}
              {F('Region',           'region',      'text', REGIONS)}
              {F('Job Type',         'type',        'text', TYPES)}
              {F('Start Date',       'startDate',   'date')}
              {F('End Date',         'endDate',     'date')}
              {F('Region Manager',   'rm',          'text', undefined, true)}
              {F('Project Manager',  'pm')}
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:T.textMuted, marginBottom:5, textTransform:'uppercase', letterSpacing:0.3 }}>Remarks</label>
              {editMode && canEdit
                ? <textarea value={form.remarks||''} onChange={e=>setForm((f:any)=>({...f,remarks:e.target.value}))} rows={3} style={{ ...inputStyle(), width:'100%', resize:'vertical', boxSizing:'border-box' as const }} />
                : <div style={{ fontSize:13, color:T.text, padding:'8px 0', borderBottom:`1px solid ${T.border}` }}>{p.remarks||'—'}</div>
              }
            </div>
          </div>

          {showFinancial && <div style={card}>
            {sectionTitle('💰','Financial Summary', canEditFin && !editMode ? <button onClick={()=>{ setForm({...p}); setEditMode(true); }} style={{ background:T.primaryLight, border:`1px solid ${T.primaryMid}`, borderRadius:7, padding:'4px 12px', color:T.primary, cursor:'pointer', fontSize:12, fontWeight:600 }}>Edit</button> : undefined)}
            {[
              { label:'PO Value',      key:'poValue',      color:T.text    },
              { label:'Billed Amount', key:'billedAmount', color:T.info    },
              { label:'Paid Amount',   key:null,           color:T.success, computed: getPaidAmount(p.id, allTransactions) },
              { label:'Pending',       key:null,           color:T.warning, computed: p.billedAmount - getPaidAmount(p.id, allTransactions) },
            ].map((r,i)=>(
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:`1px solid ${T.border}` }}>
                <span style={{ fontSize:13, color:T.textMuted }}>{r.label}</span>
                {editMode && canEditFin && r.key ? (
                  <input type="number" value={(form as any)[r.key]||0} onChange={e=>setForm((f:any)=>({...f,[r.key!]:Number(e.target.value)}))}
                    style={{ ...inputStyle(), width:160, textAlign:'right' as const }} />
                ) : (
                  <span style={{ fontSize:14, fontWeight:700, color:r.color }}>{fmt(r.computed !== undefined ? r.computed : (p as any)[r.key!])}</span>
                )}
              </div>
            ))}
            <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 14px', background:T.primaryLight, borderRadius:8, marginTop:12 }}>
              <span style={{ fontSize:13, fontWeight:700, color:T.primary }}>PO Aging</span>
              <span style={{ fontSize:14, fontWeight:800, color:T.primary }}>
                {Math.floor((Date.now() - new Date(p.startDate).getTime()) / 86400000)} days
              </span>
            </div>
          </div>}
        </div>

        {/* ── 2. Vendor Assignment ── */}
        {showVendor && <div style={{ ...card, marginBottom:16, opacity:isCompleted&&!editMode?0.8:1 }}>
          {sectionTitle('🏢','Vendor Assignment', isCompleted ? <span style={{ fontSize:11, color:T.textDim, background:T.bg, border:`1px solid ${T.border}`, borderRadius:20, padding:'3px 12px' }}>🔒 Locked — Project Completed</span> : undefined)}
          {/* Vendor selection with auto-populate */}
          {editMode && canEditVendor && !isCompleted ? (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
              <div style={{ gridColumn:'1/-1' }}>
                <CreatableSelect
                  label="Vendor Name *"
                  value={form.vendor||''}
                  options={VENDOR_LIST.map(v=>v.name)}
                  placeholder="Select or create vendor…"
                  onChange={v => {
                    const found = VENDOR_LIST.find(vl => vl.name === v);
                    setForm((f:any) => ({
                      ...f,
                      vendor:        v,
                      vendorContact: found?.contact || f.vendorContact,
                      vendorPhone:   found?.phone   || f.vendorPhone,
                      vendorEmail:   found?.email   || f.vendorEmail,
                    }));
                  }}
                  onCreateNew={v => setForm((f:any) => ({ ...f, vendor:v, vendorContact:'', vendorPhone:'', vendorEmail:'' }))}
                />
              </div>
              {[['Contact Person','vendorContact'],['Phone','vendorPhone'],['Email','vendorEmail']].map(([label,key])=>(
                <div key={key} style={{ marginBottom:14 }}>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:T.textMuted, marginBottom:5, textTransform:'uppercase', letterSpacing:0.3 }}>{label}</label>
                  <input value={(form as any)[key]||''} onChange={e=>setForm((f:any)=>({...f,[key]:e.target.value}))}
                    style={{ ...inputStyle(), width:'100%', boxSizing:'border-box' as const }} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0 16px' }}>
              {[
                ['Vendor Name','vendor'],['Contact Person','vendorContact'],
                ['Phone','vendorPhone'],['Email','vendorEmail'],
              ].map(([label,key])=>(
                <div key={key} style={{ marginBottom:14 }}>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:T.textMuted, marginBottom:5, textTransform:'uppercase', letterSpacing:0.3 }}>{label}</label>
                  <div style={{ fontSize:14, fontWeight:600, color:p[key]?T.text:T.textDim, padding:'8px 0', borderBottom:`1px solid ${T.border}` }}>
                    {(p as any)[key]||'—'}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginBottom:14 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:T.textMuted, marginBottom:5, textTransform:'uppercase', letterSpacing:0.3 }}>Work Scope</label>
            {editMode && canEditVendor && !isCompleted
              ? <textarea value={form.workScope||''} onChange={e=>setForm((f:any)=>({...f,workScope:e.target.value}))} rows={2} style={{ ...inputStyle(), width:'100%', resize:'vertical', boxSizing:'border-box' as const }} />
              : <div style={{ fontSize:13, color:T.text, padding:'8px 0', borderBottom:`1px solid ${T.border}` }}>{p.workScope||'—'}</div>
            }
          </div>
        </div>}

        {/* ── 3. Work Documents ── */}
        {showDocs && <div style={{ ...card, marginBottom:16 }}>
          {sectionTitle('📂','Work Documents')}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
            {DOC_TYPES.map(doc => {
              const docs = MOCK_DOCS[doc.key] || [];
              const uploaded = docs.length > 0;
              return (
                <div key={doc.key} style={{ border:`1.5px solid ${uploaded?T.success:T.border}`, borderRadius:10, padding:14, background:uploaded?T.successBg:'#fff' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                    <span style={{ fontSize:18 }}>{doc.icon}</span>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{doc.label}</div>
                      <div style={{ fontSize:11, color:T.textDim }}>{docs.length} file(s)</div>
                    </div>
                    {uploaded && <span style={{ marginLeft:'auto', fontSize:10, fontWeight:700, color:T.success, background:T.successBg, padding:'2px 8px', borderRadius:10 }}>✓ Uploaded</span>}
                  </div>

                  {/* Thumbnails */}
                  {docs.length > 0 && (
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' as const, marginBottom:6 }}>
                      {docs.map((d,i) => (
                        <div key={i} onClick={()=>setPreviewDoc(d)}
                          style={{ width:56, height:56, borderRadius:6, overflow:'hidden', cursor:'pointer', border:`1px solid ${T.border}`, background:T.bg, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' as const }}
                          title={d.name}>
                          {d.isImage && d.url
                            ? <img src={d.url} alt={d.name} style={{ width:'100%', height:'100%', objectFit:'cover' as const }} onError={e=>(e.currentTarget.style.display='none')} />
                            : <span style={{ fontSize:22 }}>📄</span>
                          }
                          <div style={{ position:'absolute' as const, inset:0, background:'rgba(0,0,0,0)', transition:'all 0.2s' }} className="doc-hover" />
                        </div>
                      ))}
                    </div>
                  )}

                  {docs.length === 0 && (
                    <div style={{ textAlign:'center', padding:'12px 0', color:T.textDim, fontSize:12 }}>No files uploaded</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>}

        {/* ── 4. STN/SRN Materials ── */}
        {showSTNSRN && <div style={{ ...card, marginBottom:16 }}>
          {sectionTitle('📦','STN/SRN — Materials Tracking (Indus)')}
          {stnData ? (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:14 }}>
                {[
                  { label:'STN Date',   value:stnData.stnDate,      color:T.primary },
                  { label:'SRN Date',   value:stnData.srnDate||'Pending', color:stnData.srnDate?T.success:T.danger },
                  { label:'Items Issued',  value:stnData.materials.reduce((a,m)=>a+m.stnQty,0), color:T.text },
                  { label:'Balance Pending', value:stnData.materials.reduce((a,m)=>a+m.returnQty,0), color:stnData.materials.some(m=>m.returnQty>0)?T.danger:T.success },
                ].map((s,i)=>(
                  <div key={i} style={{ background:T.bg, borderRadius:8, padding:'10px 14px' }}>
                    <div style={{ fontSize:11, color:T.textDim, marginBottom:3 }}>{s.label}</div>
                    <div style={{ fontSize:14, fontWeight:700, color:s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
                <thead>
                  <tr style={{ background:T.bg }}>
                    {['Item Code','Description','UOM','STN Issued','SRN Returned','Balance','Status'].map(h=>(
                      <th key={h} style={{ padding:'8px 10px', fontSize:10, fontWeight:700, textTransform:'uppercase', color:T.textMuted, textAlign:'left', borderBottom:`2px solid ${T.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stnData.materials.map((m,i)=>(
                    <tr key={i} style={{ borderBottom:`1px solid ${T.border}` }}>
                      <td style={{ padding:'9px 10px', color:T.primary, fontWeight:600, fontSize:12 }}>{m.code}</td>
                      <td style={{ padding:'9px 10px', fontSize:13 }}>{m.description}</td>
                      <td style={{ padding:'9px 10px', fontSize:12, color:T.textMuted }}>{m.uom}</td>
                      <td style={{ padding:'9px 10px', fontWeight:600, textAlign:'right' as const }}>{m.stnQty}</td>
                      <td style={{ padding:'9px 10px', fontWeight:600, color:T.success, textAlign:'right' as const }}>{m.srnQty}</td>
                      <td style={{ padding:'9px 10px', fontWeight:700, color:m.returnQty>0?T.danger:T.success, textAlign:'right' as const }}>{m.returnQty}</td>
                      <td style={{ padding:'9px 10px' }}>
                        <span style={{ fontSize:11, fontWeight:600, color:m.returnQty===0?T.success:m.utilisedStatus==='pm_approved'?'#D97706':T.danger, background:m.returnQty===0?T.successBg:m.utilisedStatus==='pm_approved'?'#FFFBEB':'#FEF2F2', padding:'2px 8px', borderRadius:10 }}>
                          {m.returnQty===0?'Fully Returned':m.utilisedStatus==='pm_approved'?'Partially Returned':'Pending Return'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <div style={{ textAlign:'center', padding:30, color:T.textDim }}>No STN/SRN records for this project yet.</div>
          )}
        </div>}


        {/* ── Admin Utilisation Review (SA only) ── */}
        {role === 'super_admin' && (() => {
          const stnD = id ? STN_SRN_DATA.find(s => s.projectId === id) : null;
          if (!stnD) return null;
          const reviewItems = stnD.materials.filter(m => m.utilisedStatus === 'submitted' || m.utilisedStatus === 'pm_approved' || m.utilisedStatus === 'pm_rejected');
          if (reviewItems.length === 0) return null;
          return (
            <div style={{ ...card, marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:6, paddingBottom:10, borderBottom:`2px solid ${T.primaryMid}` }}>
                🔍 Utilisation Review (Admin)
              </div>
              <div style={{ fontSize:12, color:T.textMuted, marginBottom:16 }}>
                Vendor utilisation submissions — you can approve or reject each item.
              </div>
              <div style={{ display:'flex', flexDirection:'column' as const, gap:12 }}>
                {stnD.materials.map((item: any) => {
                  const BADGE: Record<string,{color:string;bg:string;label:string}> = {
                    pending:     { color:'#64748B', bg:'#F1F5F9', label:'Pending Input'   },
                    submitted:   { color:'#2563EB', bg:'#EFF6FF', label:'Submitted to PM' },
                    pm_approved: { color:'#16A34A', bg:'#F0FDF4', label:'PM Approved'     },
                    pm_rejected: { color:'#DC2626', bg:'#FEF2F2', label:'PM Rejected'     },
                  };
                  const b = BADGE[item.utilisedStatus] || BADGE.pending;
                  return (
                    <div key={item.code} style={{ border:`1.5px solid ${item.utilisedStatus==='pm_approved'?T.success:item.utilisedStatus==='pm_rejected'?T.danger:item.utilisedStatus==='submitted'?T.info:T.border}`, borderRadius:10, padding:14 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                        <div>
                          <div style={{ fontSize:11, fontWeight:700, color:T.primary }}>{item.code}</div>
                          <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{item.description}</div>
                          <div style={{ fontSize:11, color:T.textMuted }}>STN: {item.stnQty} {item.uom} | Vendor Input: {item.utilisedQty ?? 'Not submitted'} {item.uom}</div>
                        </div>
                        <span style={{ fontSize:11, fontWeight:700, color:b.color, background:b.bg, padding:'3px 10px', borderRadius:20 }}>{b.label}</span>
                      </div>
                      {item.utilisedStatus === 'submitted' && (
                        <div style={{ display:'flex', gap:10, marginTop:8 }}>
                          <button onClick={()=>{ setToast({ msg:`${item.description} approved!`, type:'success' }); }}
                            style={{ ...btnPrimary, background:T.success, fontSize:12, padding:'6px 14px' }}>✅ Approve</button>
                          <button onClick={()=>{ setToast({ msg:`${item.description} rejected.`, type:'info' }); }}
                            style={{ ...btnSecondary, borderColor:T.danger, color:T.danger, fontSize:12, padding:'6px 14px' }}>❌ Reject</button>
                        </div>
                      )}
                      {item.utilisedStatus === 'pm_approved' && (
                        <div style={{ fontSize:12, color:T.success }}>✅ Approved — Return Qty: {item.returnQty} {item.uom}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
        {/* ── 5. Billing Review Checklist ── */}
        {showBillingReview && (isBilling || canEdit) && (
          <div style={{ ...card, marginBottom:16, border:`1.5px solid ${!isCompleted?T.border:'#7C3AED'}`, opacity:!['pm_approved','billing_review','completed'].includes(p.status)?0.5:1, position:'relative' as const }}>
            {sectionTitle('💳','Billing Review Checklist')}
            {!['pm_approved','billing_review','completed'].includes(p.status) && (
              <div style={{ position:'absolute' as const, inset:0, background:'rgba(255,255,255,0.7)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', zIndex:5 }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:28, marginBottom:8 }}>🔒</div>
                  <div style={{ fontSize:13, fontWeight:600, color:T.text }}>Available after PM approves the project</div>
                </div>
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12, marginBottom:16 }}>
              {[
                { key:'stn',       label:'STN Done',                desc:'Store Transfer Note completed with Indus' },
                { key:'srn',       label:'SRN Done',                desc:'Store Return Note completed with Indus'   },
                { key:'ptw',       label:'PTW Done',                desc:'Permit to Work completed'                 },
                { key:'materials', label:'Materials Returned to Indus', desc:'All materials from STN returned via SRN — MANDATORY', important:true },
              ].map(item=>{
                const checked = checklist[item.key as keyof typeof checklist];
                return (
                  <div key={item.key} onClick={()=>isBilling&&setChecklist(c=>({...c,[item.key]:!c[item.key as keyof typeof c]}))}
                    style={{ padding:14, borderRadius:10, border:`2px solid ${checked?item.important?T.primary:T.success:item.important?'#EF4444':T.border}`, background:checked?item.important?T.primaryLight:T.successBg:'#fff', cursor:isBilling?'pointer':'default', transition:'all 0.15s' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:22, height:22, borderRadius:6, border:`2px solid ${checked?item.important?T.primary:T.success:T.border}`, background:checked?item.important?T.primary:T.success:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        {checked && <span style={{ color:'#fff', fontSize:13, fontWeight:700 }}>✓</span>}
                      </div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:T.text }}>
                          {item.label}
                          {item.important && <span style={{ fontSize:10, color:T.danger, marginLeft:6 }}>MANDATORY</span>}
                        </div>
                        <div style={{ fontSize:11, color:T.textMuted }}>{item.desc}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:6 }}>Invoice Reference / Billing Notes</label>
              <textarea value={billingNotes} onChange={e=>setBillingNotes(e.target.value)} placeholder="Enter invoice reference number or billing notes…" rows={2}
                style={{ ...inputStyle(), width:'100%', resize:'vertical', boxSizing:'border-box' as const }} />
            </div>

            {isBilling && ['pm_approved','billing_review'].includes(p.status) && (
              <button onClick={handleBillingDone}
                style={{ ...btnPrimary, background:Object.values(checklist).every(Boolean)?T.success:T.border, cursor:Object.values(checklist).every(Boolean)?'pointer':'not-allowed' }}>
                ✅ Mark Billing Done — Release Payment
              </button>
            )}

            {p.status === 'completed' && (
              <div style={{ background:T.successBg, border:`1px solid #BBF7D0`, borderRadius:8, padding:'10px 14px', fontSize:13, color:T.success, fontWeight:600 }}>
                ✅ Billing complete. Payment released.
              </div>
            )}
          </div>
        )}

        {/* ── 6. Activity Log ── */}
        {showActivityLog && <div style={card}>
          {sectionTitle('📝','Activity Log')}
          <div style={{ position:'relative' as const }}>
            <div style={{ position:'absolute' as const, left:12, top:0, bottom:0, width:2, background:T.border }} />
            {ACTIVITY_LOG.map((log,i)=>{
              const c = roleColor[log.role] || T.textDim;
              return (
                <div key={i} style={{ display:'flex', gap:14, marginBottom:16, paddingLeft:8 }}>
                  <div style={{ width:22, height:22, borderRadius:'50%', background:c, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, zIndex:1, marginTop:2 }}>
                    <span style={{ color:'#fff', fontSize:9, fontWeight:700 }}>{log.role[0]}</span>
                  </div>
                  <div style={{ flex:1, background:T.bg, borderRadius:10, padding:'10px 14px', border:`1px solid ${T.border}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
                      <span style={{ fontSize:13, fontWeight:600, color:T.text }}>{log.action}</span>
                      <span style={{ fontSize:10, background:`${c}20`, color:c, padding:'2px 8px', borderRadius:20, fontWeight:600 }}>{log.role}</span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <span style={{ fontSize:12, color:T.textMuted }}>{log.by}</span>
                      <span style={{ fontSize:11, color:T.textDim }}>{log.date}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>}

        {/* Document Preview Modal */}
        {previewDoc && (
          <Modal title={previewDoc.name} onClose={()=>setPreviewDoc(null)} width={700}>
            {previewDoc.isImage && previewDoc.url ? (
              <img src={previewDoc.url} alt={previewDoc.name} style={{ width:'100%', borderRadius:8, maxHeight:'70vh', objectFit:'contain' as const }} />
            ) : (
              <div style={{ textAlign:'center', padding:40 }}>
                <div style={{ fontSize:64, marginBottom:16 }}>📄</div>
                <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:12 }}>{previewDoc.name}</div>
                <a href={previewDoc.url||'#'} target="_blank" rel="noopener noreferrer"
                  style={{ background:T.primary, color:'#fff', borderRadius:8, padding:'10px 20px', textDecoration:'none', fontSize:13, fontWeight:600 }}>
                  Open PDF in New Tab ↗
                </a>
              </div>
            )}
          </Modal>
        )}

        {/* Reject Modal */}
        {showReject && (
          <Modal title="❌ Reject Project" onClose={()=>setShowReject(false)} width={460}>
            <p style={{ fontSize:13, color:T.textMuted, marginBottom:16 }}>Provide reason for rejection — this will be sent to the vendor.</p>
            <textarea value={rejectReason} onChange={e=>setRejectReason(e.target.value)} placeholder="e.g. Missing NOC document, safety photos unclear…" rows={4}
              style={{ ...inputStyle(), width:'100%', resize:'vertical', boxSizing:'border-box' as const, marginBottom:16 }} />
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
              <button onClick={()=>setShowReject(false)} style={btnSecondary}>Cancel</button>
              <button onClick={()=>{ if(!rejectReason.trim()){setToast({msg:'Reason required.',type:'error'});return;} updateStatus('delayed',`Rejected: ${rejectReason}`); setShowReject(false); }} style={{ ...btnPrimary, background:T.danger }}>❌ Reject & Notify</button>
            </div>
          </Modal>
        )}

        {toast && <Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
      </div>
    </Layout>
  );
}
