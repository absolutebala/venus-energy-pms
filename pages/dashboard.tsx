import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { T, card, badge } from '@/lib/theme';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// ── Shared mock data ──────────────────────────────────────────────
const ALL_PROJECTS = [
  { id:'VE-2025-001', projectName:'Chennai Metro Phase II', site:'Chennai North',  poNo:'PO-2025-001', indusId:'IND-1001', type:'Tower Erection',    pm:'Arun Kumar',   rm:'Ramesh Kumar', vendor:'ABC Telecom Services',    poValue:1850000, aging:12, status:'in_progress',   progress:65,  region:'Tamil Nadu',  createdAt:'2025-04-01', assignedAt:'2025-05-10', vendorAssigned:true  },
  { id:'VE-2025-002', projectName:'Bengaluru East Maint.',  site:'Bengaluru East', poNo:'PO-2025-001', indusId:'IND-1002', type:'Tower Maintenance', pm:'Priya Sharma', rm:'Amit Sharma',  vendor:'XYZ Infra Solutions',    poValue:420000,  aging:78, status:'delayed',        progress:30,  region:'Karnataka',   createdAt:'2025-03-15', assignedAt:'2025-04-01', vendorAssigned:true  },
  { id:'VE-2025-003', projectName:'Hyderabad Component',   site:'Hyderabad',      poNo:'PO-2025-002', indusId:'IND-1003', type:'Component Replace', pm:'Arun Kumar',   rm:'Ramesh Kumar', vendor:'TowerTech Pvt Ltd',      poValue:760000,  aging:22, status:'billing_review', progress:100, region:'Tamil Nadu',  createdAt:'2025-04-10', assignedAt:'2025-04-15', vendorAssigned:true  },
  { id:'VE-2025-004', projectName:'Chennai Fiber Network', site:'Chennai South',  poNo:'PO-2025-002', indusId:'IND-1004', type:'Fiber Installation',pm:'Vijay Kumar',  rm:'Ramesh Kumar', vendor:null,                     poValue:1230000, aging:12, status:'in_progress',   progress:45,  region:'Tamil Nadu',  createdAt:'2025-04-20', assignedAt:'2025-05-08', vendorAssigned:false },
  { id:'VE-2025-005', projectName:'Coimbatore Tower',      site:'Coimbatore',     poNo:'PO-2025-003', indusId:'IND-1005', type:'Tower Erection',    pm:'Arun Kumar',   rm:'Ramesh Kumar', vendor:null,                     poValue:2200000, aging:8,  status:'pending',        progress:10,  region:'Tamil Nadu',  createdAt:'2025-05-01', assignedAt:'2025-05-11', vendorAssigned:false },
  { id:'VE-2025-006', projectName:'Pune Civil Works',      site:'Pune West',      poNo:'PO-2025-003', indusId:'IND-1006', type:'Civil Works',       pm:'Pooja Mehta',  rm:'Amit Sharma',  vendor:'BuildRight Constructions',poValue:540000,  aging:95, status:'delayed',        progress:20,  region:'Maharashtra', createdAt:'2025-02-01', assignedAt:'2025-03-01', vendorAssigned:true  },
  { id:'VE-2025-007', projectName:'Mumbai Power Works',    site:'Mumbai Central', poNo:'PO-2025-004', indusId:'IND-1007', type:'Power Works',       pm:'Pooja Mehta',  rm:'Amit Sharma',  vendor:'PowerSys India',         poValue:890000,  aging:33, status:'billing_review', progress:100, region:'Maharashtra', createdAt:'2025-04-05', assignedAt:'2025-04-20', vendorAssigned:true  },
  { id:'VE-2025-008', projectName:'Delhi NCR Maintenance', site:'Delhi NCR',      poNo:'PO-2025-004', indusId:'IND-1008', type:'Tower Maintenance', pm:'Rajeev Singh', rm:'Amit Sharma',  vendor:'XYZ Infra Solutions',    poValue:380000,  aging:18, status:'in_progress',   progress:55,  region:'Delhi',       createdAt:'2025-05-01', assignedAt:'2025-05-09', vendorAssigned:true  },
  { id:'VE-2025-009', projectName:'Kochi Component Repl.', site:'Kochi',          poNo:'PO-2025-005', indusId:'IND-1009', type:'Component Replace', pm:'Vijay Kumar',  rm:'Ramesh Kumar', vendor:'TowerTech Pvt Ltd',      poValue:650000,  aging:62, status:'delayed',        progress:40,  region:'Kerala',      createdAt:'2025-03-01', assignedAt:'2025-04-10', vendorAssigned:true  },
  { id:'VE-2025-010', projectName:'Kolkata Fiber Install.', site:'Kolkata North',  client:'Jio',    type:'Fiber Installation',pm:'Arun Kumar',   rm:'Ramesh Kumar', vendor:null,                     poValue:975000,  aging:5,  status:'pending',        progress:0,   region:'West Bengal', createdAt:'2025-05-10', assignedAt:'2025-05-11', vendorAssigned:false },
];

const INVOICES = [
  { id:'INV-2025-012', project:'VE-2025-001', vendor:'ABC Telecom Services',  amount:925000,  gst:166500, total:1091500, status:'Approved',     due:'19/06/2025' },
  { id:'INV-2025-011', project:'VE-2025-004', vendor:'NetConnect Services',   amount:615000,  gst:110700, total:725700,  status:'Submitted',    due:'14/06/2025' },
  { id:'INV-2025-010', project:'VE-2025-007', vendor:'PowerSys India',        amount:445000,  gst:80100,  total:525100,  status:'Under Review', due:'09/06/2025' },
  { id:'INV-2025-009', project:'VE-2025-002', vendor:'XYZ Infra Solutions',   amount:210000,  gst:37800,  total:247800,  status:'Rejected',     due:'04/06/2025' },
  { id:'INV-2025-008', project:'VE-2025-003', vendor:'TowerTech Pvt Ltd',     amount:380000,  gst:68400,  total:448400,  status:'Approved',     due:'27/05/2025' },
];

const EXPENSES = [
  { project:'VE-2025-001', vendor:'ABC Telecom Services', type:'Labour',    amount:45000, date:'18/05/2025', status:'Approved'  },
  { project:'VE-2025-001', vendor:'ABC Telecom Services', type:'Material',  amount:82000, date:'17/05/2025', status:'Approved'  },
  { project:'VE-2025-002', vendor:'XYZ Infra Solutions',  type:'Transport', amount:12000, date:'15/05/2025', status:'Pending'   },
  { project:'VE-2025-007', vendor:'PowerSys India',       type:'Equipment', amount:35000, date:'20/05/2025', status:'Approved'  },
];

const TIMELINE = [
  { date:'20/05/2025 04:45 PM', action:'Safety Photos uploaded',              by:'ABC Telecom Services', role:'Vendor'  },
  { date:'19/05/2025 05:00 PM', action:'Vendor assigned by Project Manager',  by:'Arun Kumar',           role:'PM'      },
  { date:'18/05/2025 11:00 AM', action:'PM Review notes added',               by:'Arun Kumar',           role:'PM'      },
  { date:'17/05/2025 03:00 PM', action:'Invoice INV-2025-012 submitted',      by:'Finance Team',         role:'Billing' },
  { date:'15/05/2025 10:00 AM', action:'Project created and assigned to RM',  by:'Ramesh Kumar',         role:'RM'      },
];

const fmt    = (v:number) => `₹${(v/100000).toFixed(2)}L`;
const fmtCr  = (v:number) => `₹${(v/10000000).toFixed(2)} Cr`;
const STATUS_DISPLAY: Record<string,string> = {
  in_progress:'In Progress', pending:'Pending', delayed:'Delayed',
  completed:'Completed', submitted:'Submitted', pm_approved:'PM Approved',
  billing_review:'Billing Review',
};

// ── Shared sub-components ─────────────────────────────────────────
const KpiCard = ({ label, value, icon, color, onClick }: any) => (
  <div onClick={onClick} style={{ ...card, position:'relative', overflow:'hidden', padding:'16px 18px', cursor:onClick?'pointer':'default', transition:'all 0.15s' }}
    onMouseEnter={e=>{ if(onClick)(e.currentTarget as HTMLDivElement).style.transform='translateY(-1px)'; }}
    onMouseLeave={e=>{ if(onClick)(e.currentTarget as HTMLDivElement).style.transform='translateY(0)'; }}>
    <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:color }} />
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
      <div>
        <div style={{ fontSize:11, color:T.textMuted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:5 }}>{label}</div>
        <div style={{ fontSize:24, fontWeight:700, color:T.text }}>{value}</div>
      </div>
      <div style={{ fontSize:24 }}>{icon}</div>
    </div>
  </div>
);

const AlertBanner = ({ count, msg, color, link }: any) => count > 0 ? (
  <Link href={link} style={{ textDecoration:'none' }}>
    <div style={{ background:`${color}15`, border:`1px solid ${color}40`, borderLeft:`4px solid ${color}`, borderRadius:8, padding:'10px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }}>
      <span style={{ fontSize:13, fontWeight:600, color:T.text }}>{msg}</span>
      <span style={{ background:color, color:'#fff', borderRadius:20, padding:'2px 10px', fontSize:12, fontWeight:700 }}>{count}</span>
    </div>
  </Link>
) : null;

const ProjectRow = ({ p, href }: { p:any; href:string }) => {
  const router = useRouter();
  return (
    <tr onClick={()=>router.push(href)} style={{ cursor:'pointer' }}
      onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background=T.primaryLight}
      onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background='transparent'}>
      <td style={{ padding:'9px 10px', color:T.primary, fontWeight:700, fontSize:12 }}>{p.id}</td>
      <td style={{ padding:'9px 10px', fontSize:12, fontWeight:600, color:T.text }}>{(p as any).poNo||'—'}</td>
      <td style={{ padding:'9px 10px', fontSize:11, color:T.textMuted }}>{(p as any).indusId||'—'}</td>
      <td style={{ padding:'9px 10px', fontSize:12, color:T.textMuted }}>{p.site}</td>
      <td style={{ padding:'9px 10px', fontWeight:600, whiteSpace:'nowrap' as const }}>{fmt(p.poValue)}</td>
      <td style={{ padding:'9px 10px' }}><span style={{ color:p.aging>60?T.danger:p.aging>30?T.warning:T.success, fontWeight:700 }}>{p.aging}d</span></td>
      <td style={{ padding:'9px 10px' }}><span style={badge(STATUS_DISPLAY[p.status]||p.status)}>{STATUS_DISPLAY[p.status]||p.status}</span></td>
    </tr>
  );
};

const TableHead = () => (
  <thead><tr>{['Project ID','PO No','Indus ID','Site','PO Value','Aging','Status'].map(h=>(
    <th key={h} style={{ padding:'8px 10px', fontSize:11, fontWeight:700, textTransform:'uppercase', color:T.textMuted, textAlign:'left', borderBottom:`2px solid ${T.border}` }}>{h}</th>
  ))}</tr></thead>
);

// ── 1. SUPER ADMIN DASHBOARD ─────────────────────────────────────

// ── Project Status Table ──────────────────────────────────────────────────────
const DOC_COLS = [
  { key:'safety_photos',    label:'Safety'    },
  { key:'site_photos',      label:'Site Photos'},
  { key:'jmr_document',    label:'JMR'        },
  { key:'ac_certificate',  label:'AC Cert'    },
  { key:'noc_document',    label:'NOC'        },
  { key:'drawing_document',label:'Drawing'    },
  { key:'ptw_document',    label:'PTW'        },
];

const MOCK_DOC_STATUS: Record<string, Record<string, boolean>> = {
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

const MOCK_STN_RETURN: Record<string, boolean> = {
  'VE-2025-001':false,'VE-2025-002':true,'VE-2025-003':false,'VE-2025-004':false,
  'VE-2025-005':true, 'VE-2025-006':false,'VE-2025-007':false,'VE-2025-008':false,
  'VE-2025-009':false,'VE-2025-010':true,
};

const MOCK_UPDATED: Record<string,{date:string;by:string}> = {
  'VE-2025-001':{date:'15-05-2025',by:'Arun Kumar'},   'VE-2025-002':{date:'14-05-2025',by:'Priya Sharma'},
  'VE-2025-003':{date:'13-05-2025',by:'Arun Kumar'},   'VE-2025-004':{date:'12-05-2025',by:'Ramesh Kumar'},
  'VE-2025-005':{date:'11-05-2025',by:'Arun Kumar'},   'VE-2025-006':{date:'10-05-2025',by:'Priya Sharma'},
  'VE-2025-007':{date:'09-05-2025',by:'Arun Kumar'},   'VE-2025-008':{date:'08-05-2025',by:'Ramesh Kumar'},
  'VE-2025-009':{date:'07-05-2025',by:'Priya Sharma'}, 'VE-2025-010':{date:'06-05-2025',by:'Arun Kumar'},
};
const MOCK_DELIVERY: Record<string,string> = {
  'VE-2025-001':'2025-07-30','VE-2025-002':'2025-08-31','VE-2025-003':'2025-09-15',
  'VE-2025-004':'2025-10-31','VE-2025-005':'2025-03-31','VE-2025-006':'2025-09-30',
  'VE-2025-007':'2025-08-15','VE-2025-008':'2025-11-30','VE-2025-009':'2025-12-31',
  'VE-2025-010':'2025-04-30',
};
const MOCK_START: Record<string,string> = {
  'VE-2025-001':'2025-01-15','VE-2025-002':'2025-02-01','VE-2025-003':'2025-02-10',
  'VE-2025-004':'2025-03-01','VE-2025-005':'2024-12-01','VE-2025-006':'2025-03-15',
  'VE-2025-007':'2025-02-20','VE-2025-008':'2025-04-01','VE-2025-009':'2025-04-15',
  'VE-2025-010':'2024-11-01',
};

const WORK_STATUS_CFG: Record<string,{label:string;color:string;bg:string}> = {
  in_progress:    { label:'In Progress',    color:'#D97706', bg:'#FFFBEB' },
  completed:      { label:'Completed',      color:'#0D9488', bg:'#F0FDFA' },
  delayed:        { label:'Delayed',        color:'#DC2626', bg:'#FEF2F2' },
  not_started:    { label:'Not Started',    color:'#6B7280', bg:'#F9FAFB' },
  billing_review: { label:'Billing Review', color:'#7C3AED', bg:'#F5F3FF' },
  pm_approved:    { label:'PM Approved',    color:'#0D9488', bg:'#F0FDFA' },
  submitted:      { label:'Submitted',      color:'#2563EB', bg:'#EFF6FF' },
  under_review:   { label:'Under Review',   color:'#2563EB', bg:'#EFF6FF' },
  on_hold:        { label:'On Hold',        color:'#6B7280', bg:'#F9FAFB' },
};



function StatusBadge({ done }: { done: boolean }) {
  return (
    <span style={{ fontSize:16, lineHeight:1 }} title={done ? 'Completed' : 'Pending'}>
      {done ? '✅' : '⏳'}
    </span>
  );
}

function ProjectStatusTable({ projects }: { projects: any[] }) {
  const router = useRouter();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const PER_PAGE = 8;

  const filtered = projects.filter(p =>
    p.id.toLowerCase().includes(search.toLowerCase()) ||
    p.site.toLowerCase().includes(search.toLowerCase()) ||
    p.pm.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  const thStyle: React.CSSProperties = {
    padding:'10px 12px', fontSize:10, fontWeight:700, textTransform:'uppercase',
    color:'#0D9488', textAlign:'left' as const, borderBottom:'2px solid #99F6E4',
    whiteSpace:'nowrap' as const, background:'#F0FDFA',
  };
  const tdStyle: React.CSSProperties = {
    padding:'10px 12px', fontSize:12, borderBottom:'1px solid #E5E7EB', verticalAlign:'middle' as const,
  };

  return (
    <div>
      {/* Search */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div style={{ fontSize:13, color:'#6B7280' }}>
          Showing <strong>{Math.min((page-1)*PER_PAGE+1, filtered.length)}–{Math.min(page*PER_PAGE, filtered.length)}</strong> of <strong>{filtered.length}</strong> projects
        </div>
        <input
          value={search} onChange={e=>{ setSearch(e.target.value); setPage(1); }}
          placeholder="Search project, site, PM…"
          style={{ border:'1px solid #E5E7EB', borderRadius:8, padding:'6px 14px', fontSize:13, outline:'none', width:220, color:'#111827' }}
        />
      </div>

      {/* Table */}
      <div style={{ overflowX:'auto' as const, borderRadius:10, border:'1px solid #E5E7EB' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' as const, minWidth:1200 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width:36 }}>#</th>
              <th style={thStyle}>Project No</th>
              <th style={thStyle}>Site / Project</th>
              <th style={thStyle}>Work Status</th>
              <th style={thStyle}>Delivery Date</th>
              <th style={thStyle}>Aging</th>
              {DOC_COLS.map(d => <th key={d.key} style={thStyle}>{d.label}</th>)}
              <th style={thStyle}>STN Return</th>
              <th style={thStyle}>Last Updated</th>

            </tr>
          </thead>
          <tbody>
            {paged.map((p, idx) => {
              const wsCfg = WORK_STATUS_CFG[p.status] || WORK_STATUS_CFG.not_started;
              const docs  = MOCK_DOC_STATUS[p.id] || {};
              const upd   = MOCK_UPDATED[p.id] || { date:'—', by:'—' };
              return (
                <tr key={p.id} style={{ background: idx%2===0 ? '#fff' : '#FAFAFA' }}
                  onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background='#F0FDFA'}
                  onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background=idx%2===0?'#fff':'#FAFAFA'}>
                  <td style={{ ...tdStyle, color:'#9CA3AF', fontWeight:600 }}>{(page-1)*PER_PAGE+idx+1}</td>
                  <td style={{ ...tdStyle }}>
                    <a href={`/projects/${p.id}`} style={{ color:'#0D9488', fontWeight:700, textDecoration:'none', fontSize:13 }}>{p.id}</a>
                    {p.poNo && <div style={{ fontSize:10, color:'#9CA3AF', marginTop:2 }}>{p.poNo}</div>}
                  </td>
                  <td style={{ ...tdStyle }}>
                    <div style={{ fontWeight:600, color:'#111827', fontSize:13 }}>{p.site}</div>
                    <div style={{ fontSize:11, color:'#9CA3AF' }}>{p.pm}</div>
                  </td>
                  <td style={{ ...tdStyle }}>
                    <span style={{ fontSize:11, fontWeight:700, color:wsCfg.color, background:wsCfg.bg, padding:'3px 10px', borderRadius:20, whiteSpace:'nowrap' as const, border:`1px solid ${wsCfg.color}30` }}>
                      {wsCfg.label}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, whiteSpace:'nowrap' as const }}>
                    {(() => {
                      const d = MOCK_DELIVERY[p.id];
                      if (!d) return <span style={{ color:'#9CA3AF' }}>—</span>;
                      const dt = new Date(d);
                      const isPast = dt < new Date();
                      return <span style={{ fontSize:12, color:isPast?'#DC2626':'#374151', fontWeight:isPast?600:400 }}>
                        {dt.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
                        {isPast && <span style={{ fontSize:10, color:'#DC2626', display:'block' }}>Overdue</span>}
                      </span>;
                    })()}
                  </td>
                  <td style={{ ...tdStyle }}>
                    {(() => {
                      const start = MOCK_START[p.id];
                      if (!start) return <span style={{ color:'#9CA3AF' }}>—</span>;
                      const days = Math.floor((new Date().getTime() - new Date(start).getTime()) / 86400000);
                      const color = days > 90 ? '#DC2626' : days > 60 ? '#D97706' : '#0D9488';
                      const bg    = days > 90 ? '#FEF2F2' : days > 60 ? '#FFFBEB' : '#F0FDFA';
                      return <span style={{ fontSize:12, fontWeight:600, color, background:bg, padding:'2px 8px', borderRadius:10, whiteSpace:'nowrap' as const }}>{days}d</span>;
                    })()}
                  </td>
                  {DOC_COLS.map(d => (
                    <td key={d.key} style={{ ...tdStyle }}>
                      <StatusBadge done={!!docs[d.key]} />
                    </td>
                  ))}
                  <td style={{ ...tdStyle }}>
                    <StatusBadge done={!!MOCK_STN_RETURN[p.id]} />
                  </td>
                  <td style={{ ...tdStyle, color:'#6B7280', whiteSpace:'nowrap' as const }}>{upd.date}</td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', gap:6, marginTop:14 }}>
          <button onClick={()=>setPage(1)} disabled={page===1} style={{ ...pgBtn, opacity:page===1?0.4:1 }}>⟪</button>
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{ ...pgBtn, opacity:page===1?0.4:1 }}>‹</button>
          {Array.from({length:totalPages},(_,i)=>i+1).filter(n=>Math.abs(n-page)<=2).map(n=>(
            <button key={n} onClick={()=>setPage(n)}
              style={{ ...pgBtn, background:n===page?'#0D9488':'#fff', color:n===page?'#fff':'#374151', border:`1px solid ${n===page?'#0D9488':'#E5E7EB'}`, fontWeight:n===page?700:400 }}>
              {n}
            </button>
          ))}
          <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} style={{ ...pgBtn, opacity:page===totalPages?0.4:1 }}>›</button>
          <button onClick={()=>setPage(totalPages)} disabled={page===totalPages} style={{ ...pgBtn, opacity:page===totalPages?0.4:1 }}>⟫</button>
        </div>
      )}
    </div>
  );
}
const pgBtn: React.CSSProperties = {
  width:32, height:32, borderRadius:6, border:'1px solid #E5E7EB', background:'#fff',
  cursor:'pointer', fontSize:13, color:'#374151', display:'flex', alignItems:'center',
  justifyContent:'center', fontWeight:500,
};


// ── STN/SRN Summary Data ──────────────────────────────────────────────────────
const VENDOR_PROJECT_DATA: Record<string, any[]> = {
  'ABC Telecom Services': [
    { id:'VE-2025-001', name:'Andheri Tower Site',    status:'in_progress', deliveryDate:'30 Jul 2025', issued:12, utilised:10, pendingReturn:2, approvalStatus:'Pending'  },
    { id:'VE-2025-007', name:'Dadar Junction Node',   status:'in_progress', deliveryDate:'15 Aug 2025', issued:8,  utilised:5,  pendingReturn:1, approvalStatus:'Pending'  },
    { id:'VE-2025-010', name:'Versova Tower',         status:'completed',   deliveryDate:'30 Apr 2025', issued:4,  utilised:4,  pendingReturn:0, approvalStatus:'Yes'      },
  ],
  'XYZ Infra Solutions': [
    { id:'VE-2025-002', name:'Bandra Roof Site',      status:'in_progress', deliveryDate:'31 Aug 2025', issued:16, utilised:12, pendingReturn:2, approvalStatus:'Pending'  },
    { id:'VE-2025-008', name:'Santacruz Hub',         status:'delayed',     deliveryDate:'30 Jun 2025', issued:6,  utilised:3,  pendingReturn:1, approvalStatus:'Rejected' },
  ],
  'TowerTech Pvt Ltd': [
    { id:'VE-2025-003', name:'Kurla Junction Tower',  status:'in_progress', deliveryDate:'15 Sep 2025', issued:14, utilised:11, pendingReturn:3, approvalStatus:'Pending'  },
    { id:'VE-2025-004', name:'Ghatkopar Site A',      status:'in_progress', deliveryDate:'31 Oct 2025', issued:10, utilised:6,  pendingReturn:2, approvalStatus:'Pending'  },
    { id:'VE-2025-005', name:'Mulund Tower',          status:'completed',   deliveryDate:'28 Feb 2025', issued:8,  utilised:8,  pendingReturn:0, approvalStatus:'Yes'      },
    { id:'VE-2025-009', name:'Thane Central Node',    status:'on_hold',     deliveryDate:'30 Nov 2025', issued:6,  utilised:2,  pendingReturn:1, approvalStatus:'Pending'  },
  ],
  'NetConnect Services': [
    { id:'VE-2025-006', name:'Pune Kharadi Site',     status:'in_progress', deliveryDate:'30 Sep 2025', issued:8,  utilised:5,  pendingReturn:1, approvalStatus:'Pending'  },
  ],
  'PowerSys India': [
    { id:'VE-2025-011', name:'Chennai Hub Site',      status:'in_progress', deliveryDate:'31 Oct 2025', issued:10, utilised:7,  pendingReturn:2, approvalStatus:'Pending'  },
    { id:'VE-2025-012', name:'Coimbatore Tower',      status:'in_progress', deliveryDate:'15 Nov 2025', issued:8,  utilised:4,  pendingReturn:1, approvalStatus:'Pending'  },
  ],
  'BuildRight Constructions': [
    { id:'VE-2025-013', name:'Bangalore MG Road',     status:'completed',   deliveryDate:'30 Apr 2025', issued:6,  utilised:6,  pendingReturn:0, approvalStatus:'Yes'      },
  ],
};

const SITE_SUMMARY = [
  { name:'Andheri Tower Site',   region:'Maharashtra', issued:12, utilised:10, balance:2, returned:8,  approvalStatus:'Pending'  },
  { name:'Bandra Roof Site',     region:'Maharashtra', issued:8,  utilised:6,  balance:2, returned:4,  approvalStatus:'Pending'  },
  { name:'Kurla Junction Tower', region:'Maharashtra', issued:10, utilised:8,  balance:2, returned:6,  approvalStatus:'Pending'  },
  { name:'Chennai Hub Site',     region:'Tamil Nadu',  issued:14, utilised:12, balance:2, returned:10, approvalStatus:'Yes'      },
  { name:'Bangalore Central',    region:'Karnataka',   issued:9,  utilised:7,  balance:2, returned:5,  approvalStatus:'Yes'      },
  { name:'Hyderabad Node',       region:'Telangana',   issued:6,  utilised:4,  balance:2, returned:2,  approvalStatus:'Pending'  },
  { name:'Kochi Tower A',        region:'Kerala',      issued:8,  utilised:6,  balance:2, returned:4,  approvalStatus:'Rejected' },
  { name:'Delhi NCR Site',       region:'Delhi',       issued:6,  utilised:6,  balance:0, returned:6,  approvalStatus:'Yes'      },
];

function ApprovalBadge({ status }: { status: string }) {
  const cfg: Record<string,{color:string;bg:string;border:string;icon:string}> = {
    'Yes':      { color:'#0D9488', bg:'#F0FDFA', border:'#99F6E4', icon:'✅' },
    'Pending':  { color:'#D97706', bg:'#FFFBEB', border:'#FDE68A', icon:'⏳' },
    'Rejected': { color:'#DC2626', bg:'#FEF2F2', border:'#FECACA', icon:'❌' },
  };
  const c = cfg[status] || cfg['Pending'];
  return (
    <span style={{ fontSize:11, fontWeight:700, color:c.color, background:c.bg, border:`1px solid ${c.border}`, padding:'3px 10px', borderRadius:20, whiteSpace:'nowrap' as const }}>
      {c.icon} {status}
    </span>
  );
}

function STNSRNSummary() {
  const [view,          setView]         = React.useState<'vendor'|'site'>('vendor');

  // Track selected project per vendor
  const [selectedProj, setSelectedProj] = React.useState<Record<string,string>>(() => {
    const defaults: Record<string,string> = {};
    Object.entries(VENDOR_PROJECT_DATA).forEach(([vendor, projects]) => {
      const active = (projects as any[]).find(p => p.status === 'in_progress') || (projects as any[])[0];
      if (active) defaults[vendor] = active.id;
    });
    return defaults;
  });

  const tabBtn = (v: 'vendor'|'site', label: string) => (
    <button onClick={()=>setView(v)} style={{
      padding:'6px 20px', borderRadius:20, fontSize:13, fontWeight:600, cursor:'pointer', border:'none',
      background: view===v ? T.primary : T.bg,
      color: view===v ? '#fff' : T.textMuted,
      transition:'all 0.15s',
    }}>{label}</button>
  );

  const pct = (a:number, b:number) => b===0 ? 0 : Math.round((a/b)*100);

  const ProgressBar = ({ value }: { value:number }) => (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ flex:1, height:6, background:'#E5E7EB', borderRadius:3, overflow:'hidden' }}>
        <div style={{ width:`${value}%`, height:'100%', borderRadius:3, transition:'width 0.3s',
          background: value===100?'#0D9488':value>60?'#D97706':'#DC2626' }} />
      </div>
      <span style={{ fontSize:11, fontWeight:600, width:32, textAlign:'right' as const,
        color: value===100?'#0D9488':value>60?'#D97706':'#DC2626' }}>{value}%</span>
    </div>
  );

  const thS: React.CSSProperties = {
    padding:'10px 12px', fontSize:10, fontWeight:700, textTransform:'uppercase',
    color:T.primary, textAlign:'left' as const, borderBottom:`2px solid ${T.primaryMid}`,
    background:T.primaryLight, whiteSpace:'nowrap' as const,
  };
  const tdS: React.CSSProperties = {
    padding:'10px 12px', fontSize:12, borderBottom:`1px solid ${T.border}`, verticalAlign:'middle' as const,
  };

  const numBadge = (n:number, color:string, bg:string) => (
    <span style={{ fontSize:12, fontWeight:700, color, background:bg, padding:'2px 10px', borderRadius:12 }}>{n}</span>
  );

  return (
    <div>
      {/* Toggle */}
      <div style={{ display:'flex', gap:8, marginBottom:16, background:T.bg, padding:4, borderRadius:24, width:'fit-content' }}>
        {tabBtn('vendor','🏢 Vendor-wise')}
        {tabBtn('site',  '📍 Site-wise'  )}
      </div>

      {/* Vendor View */}
      {view==='vendor' && (
        <div style={{ overflowX:'auto' as const }}>
          <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
            <thead>
              <tr>
                <th style={thS}>#</th>
                <th style={thS}>Vendor</th>
                <th style={thS}>Project</th>
                <th style={thS}>PO Delivery</th>
                <th style={{ ...thS, textAlign:'center' as const }}>Issued</th>
                <th style={{ ...thS, textAlign:'center' as const }}>Utilised</th>
                <th style={{ ...thS, textAlign:'center' as const }}>Pending Return</th>
                <th style={thS}>Approval Status</th>
                <th style={{ ...thS, minWidth:130 }}>Completion</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(VENDOR_PROJECT_DATA).map(([vendor, projects], i) => {
                const selId  = selectedProj[vendor] || (projects as any[])[0]?.id;
                const proj   = (projects as any[]).find(p => p.id === selId) || (projects as any[])[0];
                const compPct = pct(proj?.utilised||0, proj?.issued||1);
                return (
                  <tr key={vendor} style={{ background:i%2===0?'#fff':T.bg }}
                    onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background=T.primaryLight}
                    onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background=i%2===0?'#fff':T.bg}>
                    <td style={{ ...tdS, color:T.textMuted, width:32 }}>{i+1}</td>
                    <td style={{ ...tdS }}>
                      <div style={{ fontWeight:600, color:T.text, fontSize:13 }}>{vendor}</div>
                      <div style={{ fontSize:11, color:T.textMuted }}>{(projects as any[]).length} project{(projects as any[]).length>1?'s':''}</div>
                    </td>
                    <td style={{ ...tdS, minWidth:200 }}>
                      <select value={selId}
                        onChange={e=>setSelectedProj(p=>({...p,[vendor]:e.target.value}))}
                        style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'5px 8px', fontSize:12, color:T.text, background:'#fff', cursor:'pointer', width:'100%', outline:'none' }}>
                        {(projects as any[]).map(p=>(
                          <option key={p.id} value={p.id}>{p.id} — {p.name}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ ...tdS, whiteSpace:'nowrap' as const, color:T.textMuted, fontSize:12 }}>{proj?.deliveryDate||'—'}</td>
                    <td style={{ ...tdS, textAlign:'center' as const, fontWeight:700, color:T.text }}>{proj?.issued||0}</td>
                    <td style={{ ...tdS, textAlign:'center' as const }}>{numBadge(proj?.utilised||0,'#2563EB','#EFF6FF')}</td>
                    <td style={{ ...tdS, textAlign:'center' as const }}>
                      {numBadge(proj?.pendingReturn||0, (proj?.pendingReturn||0)>0?'#D97706':'#0D9488', (proj?.pendingReturn||0)>0?'#FFFBEB':'#F0FDFA')}
                    </td>
                    <td style={{ ...tdS }}><ApprovalBadge status={proj?.approvalStatus||'Pending'} /></td>
                    <td style={{ ...tdS, minWidth:130 }}><ProgressBar value={compPct} /></td>
                  </tr>
                  );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Site View */}
      {view==='site' && (
        <div style={{ overflowX:'auto' as const }}>
          <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
            <thead>
              <tr>
                <th style={thS}>#</th>
                <th style={thS}>Site Name</th>
                <th style={thS}>Region</th>
                <th style={{ ...thS, textAlign:'center' as const }}>Issued</th>
                <th style={{ ...thS, textAlign:'center' as const }}>Utilised</th>
                <th style={{ ...thS, textAlign:'center' as const }}>Balance</th>
                <th style={{ ...thS, textAlign:'center' as const }}>Returned</th>
                <th style={thS}>Approval Status</th>
                <th style={{ ...thS, minWidth:130 }}>Progress</th>
              </tr>
            </thead>
            <tbody>
              {SITE_SUMMARY.map((s, i) => {
                const appPct = pct(s.returned, s.issued);
                return (
                  <tr key={s.name} style={{ background:i%2===0?'#fff':T.bg }}
                    onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background=T.primaryLight}
                    onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background=i%2===0?'#fff':T.bg}>
                    <td style={{ ...tdS, color:T.textMuted, width:32 }}>{i+1}</td>
                    <td style={{ ...tdS, fontWeight:600, color:T.text }}>{s.name}</td>
                    <td style={{ ...tdS }}>
                      <span style={{ fontSize:11, color:T.primary, background:T.primaryLight, padding:'2px 8px', borderRadius:10 }}>{s.region}</span>
                    </td>
                    <td style={{ ...tdS, textAlign:'center' as const, fontWeight:700 }}>{s.issued}</td>
                    <td style={{ ...tdS, textAlign:'center' as const }}>{numBadge(s.utilised,'#2563EB','#EFF6FF')}</td>
                    <td style={{ ...tdS, textAlign:'center' as const }}>
                      {numBadge(s.balance,s.balance>0?'#D97706':'#0D9488',s.balance>0?'#FFFBEB':'#F0FDFA')}
                    </td>
                    <td style={{ ...tdS, textAlign:'center' as const }}>{numBadge(s.returned,'#7C3AED','#F5F3FF')}</td>
                    <td style={{ ...tdS }}><ApprovalBadge status={s.approvalStatus} /></td>
                    <td style={{ ...tdS, minWidth:130 }}><ProgressBar value={appPct} /></td>
                  </tr>
                  </tr>;
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── 2. REGION MANAGER DASHBOARD ──────────────────────────────────

function SuperAdminDashboard({ projects }: { projects: any[] }) {
  const router = useRouter();
  const statusData = [
    { name:'Not Started',    value: projects.filter(p=>p.status==='not_started').length,     color:'#9CA3AF', status:'not_started'     },
    { name:'In Progress',    value: projects.filter(p=>p.status==='in_progress').length,    color:'#3B82F6', status:'in_progress'    },
    { name:'Completed',      value: projects.filter(p=>p.status==='completed').length,       color:'#10B981', status:'completed'       },
    { name:'Delayed',        value: projects.filter(p=>p.status==='delayed').length,         color:'#EF4444', status:'delayed'         },
    { name:'Billing Review', value: projects.filter(p=>p.status==='billing_review').length,  color:'#8B5CF6', status:'billing_review'  },
    { name:'PM Approved',    value: projects.filter(p=>p.status==='pm_approved').length,     color:'#0D9488', status:'pm_approved'     },
    { name:'On Hold',        value: projects.filter(p=>p.status==='on_hold').length,         color:'#6B7280', status:'on_hold'         },
    { name:'Not Started',    value: projects.filter(p=>p.status==='not_started').length,     color:'#9CA3AF', status:'not_started'     },
  ].filter(d=>d.value>0);

  const pmGroups = projects.reduce((acc:any,p)=>{ acc[p.pm]=(acc[p.pm]||[]); acc[p.pm].push(p); return acc; },{});
  const vendorGroups = projects.reduce((acc:any,p)=>{ if(p.vendor){ acc[p.vendor]=(acc[p.vendor]||[]); acc[p.vendor].push(p); } return acc; },{});

  return (
    <div>
      {/* ── 3-col summary row ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginBottom:20 }}>
        {/* Status Distribution */}
        <div style={card}>
          <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:12 }}>Status Distribution</div>
          <div style={{ display:'flex', justifyContent:'center', marginBottom:10 }}>
            <ResponsiveContainer width={110} height={110}>
              <PieChart><Pie data={statusData} cx="50%" cy="50%" innerRadius={28} outerRadius={50} dataKey="value" paddingAngle={3}
                onClick={(e:any)=>router.push(`/projects?status=${e.status}`)}>
                {statusData.map((d:any,i:number)=><Cell key={i} fill={d.color} cursor="pointer" />)}
              </Pie><Tooltip contentStyle={{ fontSize:12 }} /></PieChart>
            </ResponsiveContainer>
          </div>
          {statusData.map((d:any,i:number)=>(
            <div key={i} onClick={()=>router.push(`/projects?status=${d.status}`)}
              style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7, cursor:'pointer', padding:'3px 5px', borderRadius:5 }}
              onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background=T.bg}
              onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background='transparent'}>
              <div style={{ width:8, height:8, borderRadius:2, background:d.color, flexShrink:0 }} />
              <span style={{ fontSize:12, color:T.textMuted, flex:1 }}>{d.name}</span>
              <span style={{ fontSize:12, fontWeight:700, color:T.text }}>{d.value}</span>
            </div>
          ))}
        </div>
        {/* Projects by PM */}
        <div style={card}>
          <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:12 }}>Projects by PM</div>
          <div style={{ display:'flex', flexDirection:'column' as const, gap:6 }}>
            {Object.entries(pmGroups).slice(0,5).map(([pm,ps]:any)=>(
              <div key={pm} onClick={()=>router.push(`/projects?pm=${encodeURIComponent(pm)}`)}
                style={{ padding:'9px 11px', background:T.bg, borderRadius:8, cursor:'pointer', transition:'all 0.15s' }}
                onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background=T.primaryLight}
                onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background=T.bg}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:T.text }}>{pm}</span>
                  <span style={{ fontSize:11, fontWeight:700, color:T.primary, background:T.primaryLight, padding:'2px 8px', borderRadius:10 }}>{(ps as any[]).length} →</span>
                </div>
                <div style={{ display:'flex', gap:5, flexWrap:'wrap' as const }}>
                  {(ps as any[]).filter((p:any)=>p.status==='in_progress').length>0 && <span style={{ fontSize:10, color:T.info, background:`${T.info}15`, padding:'1px 7px', borderRadius:8 }}>{(ps as any[]).filter((p:any)=>p.status==='in_progress').length} active</span>}
                  {(ps as any[]).filter((p:any)=>p.status==='delayed').length>0 && <span style={{ fontSize:10, color:T.danger, background:`${T.danger}15`, padding:'1px 7px', borderRadius:8 }}>{(ps as any[]).filter((p:any)=>p.status==='delayed').length} delayed</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Projects by Vendor */}
        <div style={card}>
          <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:12 }}>Projects by Vendor</div>
          <div style={{ display:'flex', flexDirection:'column' as const, gap:6 }}>
            {Object.entries(vendorGroups).slice(0,5).map(([v,ps]:any)=>(
              <div key={v} onClick={()=>router.push(`/projects?vendor=${encodeURIComponent(v)}`)}
                style={{ padding:'9px 11px', background:T.bg, borderRadius:8, cursor:'pointer', transition:'all 0.15s' }}
                onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background=T.primaryLight}
                onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background=T.bg}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                  <span style={{ fontSize:12, fontWeight:600, color:T.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const, maxWidth:160 }}>{v}</span>
                  <span style={{ fontSize:11, fontWeight:700, color:T.primary, background:T.primaryLight, padding:'2px 8px', borderRadius:10, flexShrink:0 }}>{(ps as any[]).length} →</span>
                </div>
                <div style={{ fontSize:11, color:T.textMuted }}>₹{((ps as any[]).reduce((a:number,p:any)=>a+p.poValue,0)/100000).toFixed(1)}L total PO</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Project Status Table */}
      <div style={{ ...card, marginBottom:20 }}>
        <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:14 }}>📊 Project Status</div>
        <ProjectStatusTable projects={projects} />
      </div>

      {/* STN/SRN Summary */}
      <div style={{ ...card, marginBottom:20, marginTop:8 }}>
        <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:14 }}>📦 STN / SRN Summary</div>
        <STNSRNSummary />
      </div>
    </div>
  );
}

function RegionManagerDashboard({ projects }: { projects: typeof ALL_PROJECTS }) {
  const router = useRouter();
  const [globalView, setGlobalView] = useState(false);
  const myProjects = globalView ? projects : projects.filter(p=>p.rm==='Ramesh Kumar');
  const myPMs = Array.from(new Set(myProjects.map(p=>p.pm).filter(Boolean))) as string[];

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
        <button onClick={()=>setGlobalView(g=>!g)}
          style={{ background:globalView?T.primary:T.bg, color:globalView?'#fff':T.text, border:`1px solid ${globalView?T.primary:T.border}`, borderRadius:8, padding:'8px 18px', fontSize:13, fontWeight:600, cursor:'pointer', transition:'all 0.15s' }}>
          {globalView ? '📍 My Region' : '🌐 Global View'}
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
        <KpiCard label={globalView?'All Projects':'My Region Projects'} value={myProjects.length}                              icon="📁" color={T.primary} onClick={()=>router.push('/rm/projects')} />
        <KpiCard label="Delayed"              value={myProjects.filter(p=>p.status==='delayed').length}           icon="⚠️" color={T.danger}  onClick={()=>router.push('/rm/projects')} />
        <KpiCard label="Pending Billing"      value={myProjects.filter(p=>p.status==='billing_review').length}    icon="💳" color='#7C3AED'   onClick={()=>router.push('/billing')} />
        <KpiCard label="Active PMs"           value={myPMs.length}                                                icon="👤" color={T.success} />
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
        <AlertBanner count={myProjects.filter(p=>p.aging>60).length}        msg="Projects delayed over 60 days — immediate action needed"  color={T.danger}  link="/rm/projects" />
        <AlertBanner count={myProjects.filter(p=>!p.vendor).length}         msg="Projects with no vendor assigned"                          color={T.warning} link="/rm/projects" />
        <AlertBanner count={myProjects.filter(p=>p.status==='billing_review').length} msg="Projects pending billing clearance"              color='#7C3AED'   link="/billing"     />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
        <div style={card}>
          <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:14 }}>PM Performance</div>
          {myPMs.map(pm=>{
            const ps = myProjects.filter(p=>p.pm===pm);
            return (
              <div key={pm} style={{ padding:'10px 12px', background:T.bg, borderRadius:8, marginBottom:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:T.text }}>{pm}</span>
                  <span style={{ fontSize:12, color:T.primary, fontWeight:700 }}>{ps.length} projects</span>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  {[{s:'in_progress',l:'Active',c:T.info},{s:'delayed',l:'Delayed',c:T.danger},{s:'completed',l:'Done',c:T.success},{s:'billing_review',l:'Billing',c:'#7C3AED'}].map(({s,l,c})=>{
                    const n=ps.filter(p=>p.status===s).length; if(!n) return null;
                    return <span key={s} style={{ fontSize:11, color:c, background:`${c}15`, padding:'2px 8px', borderRadius:10, fontWeight:600 }}>{n} {l}</span>;
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <div style={card}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ fontSize:14, fontWeight:600, color:T.text }}>My Projects</div>
            <Link href="/rm/projects" style={{ fontSize:12, color:T.primary, textDecoration:'none' }}>View All →</Link>
          </div>
          <table style={{ width:'100%' }}><TableHead /><tbody>
            {myProjects.slice(0,5).map(p=><ProjectRow key={p.id} p={p} href={`/rm/projects/${p.id}`} />)}
          </tbody></table>
        </div>
      </div>
    </div>
  );
}

// ── 3. PROJECT MANAGER DASHBOARD ─────────────────────────────────
function ProjectManagerDashboard({ projects }: { projects: typeof ALL_PROJECTS }) {
  const router = useRouter();
  const myProjects = projects.filter(p=>p.pm!==null);
  const noVendor   = myProjects.filter(p=>!p.vendorAssigned);
  const billing    = myProjects.filter(p=>p.status==='billing_review');
  const recent     = [...myProjects].sort((a,b)=>new Date(b.assignedAt).getTime()-new Date(a.assignedAt).getTime()).slice(0,6);

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
        <KpiCard label="My Projects"      value={myProjects.length}                                    icon="📁" color={T.primary} onClick={()=>router.push('/pm/projects')} />
        <KpiCard label="Vendor Required"  value={noVendor.length}                                      icon="⚠️" color={T.danger}  onClick={()=>router.push('/pm/projects?tab=unassigned')} />
        <KpiCard label="In Progress"      value={myProjects.filter(p=>p.status==='in_progress').length} icon="⚡" color={T.info}    onClick={()=>router.push('/pm/projects')} />
        <KpiCard label="Pending Invoice"  value={billing.length}                                        icon="💳" color='#7C3AED'  onClick={()=>router.push('/pm/projects?tab=billing')} />
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
        <AlertBanner count={noVendor.length}  msg={`${noVendor.length} project(s) need a vendor assigned before work can begin`}  color={T.danger}  link="/pm/projects" />
        <AlertBanner count={myProjects.filter(p=>p.status==='delayed').length} msg="Projects are delayed — review and take action" color={T.warning} link="/pm/projects" />
        <AlertBanner count={billing.length}   msg="Projects completed and waiting for billing invoice"                             color='#7C3AED'   link="/pm/projects" />
      </div>

      <div style={card}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
          <div style={{ fontSize:14, fontWeight:600, color:T.text }}>My Projects — Recently Assigned</div>
          <Link href="/pm/projects" style={{ fontSize:12, color:T.primary, textDecoration:'none' }}>View All →</Link>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
          {recent.map((p,i)=>{
            const stColor: Record<string,string> = { in_progress:'#2563EB', delayed:'#DC2626', billing_review:'#7C3AED', completed:'#16A34A', pending:'#D97706' };
            const stLabel: Record<string,string> = { in_progress:'In Progress', delayed:'Delayed', billing_review:'Billing', completed:'Done', pending:'Pending' };
            const c = stColor[p.status]||T.textDim;
            return (
              <div key={i} onClick={()=>router.push(`/pm/projects/${p.id}`)}
                style={{ background:T.bg, border:`1px solid ${!p.vendorAssigned?T.danger:T.border}`, borderRadius:10, padding:14, cursor:'pointer', transition:'all 0.15s' }}
                onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.boxShadow='0 2px 10px rgba(0,0,0,0.08)'}
                onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.boxShadow='none'}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:T.primary }}>{p.id}</span>
                  <span style={{ fontSize:10, background:`${c}18`, color:c, padding:'2px 7px', borderRadius:10, fontWeight:600 }}>{stLabel[p.status]||p.status}</span>
                </div>
                <div style={{ fontSize:13, fontWeight:600, color:T.text, marginBottom:4 }}>{p.projectName}</div>
                <div style={{ fontSize:11, color:T.textMuted, marginBottom:8 }}>{p.site}</div>
                <div style={{ fontSize:11, color:T.textMuted }}>
                  {p.vendorAssigned ? `✅ ${p.vendor}` : '⚠️ No vendor assigned'}
                </div>
                <div style={{ fontSize:11, color:T.textDim, marginTop:4 }}>Assigned: {new Date(p.assignedAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── 4. SITE ENGINEER DASHBOARD ───────────────────────────────────
function SiteEngineerDashboard({ projects }: { projects: typeof ALL_PROJECTS }) {
  const router = useRouter();
  const myRegion   = 'Tamil Nadu';
  const myProjects = projects.filter(p=>p.region===myRegion);
  const today      = new Date().toLocaleDateString('en-IN',{weekday:'long', day:'2-digit', month:'short', year:'numeric'});

  return (
    <div>
      <div style={{ ...card, marginBottom:20, background:`linear-gradient(135deg, ${T.primaryLight}, #E0FDF4)`, border:`1px solid ${T.primaryMid}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:T.text }}>Good day! 👷</div>
            <div style={{ fontSize:13, color:T.textMuted }}>{today} · {myRegion} Region</div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <div style={{ background:T.successBg, border:'1px solid #BBF7D0', borderRadius:8, padding:'8px 16px', textAlign:'center' }}>
              <div style={{ fontSize:10, color:T.textMuted, marginBottom:3 }}>Today's Attendance</div>
              <div style={{ fontSize:13, fontWeight:700, color:T.success }}>✅ Marked</div>
            </div>
            <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:8, padding:'8px 16px', textAlign:'center' }}>
              <div style={{ fontSize:10, color:T.textMuted, marginBottom:3 }}>Safety Check</div>
              <div style={{ fontSize:13, fontWeight:700, color:T.warning }}>⏳ Pending</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
        <KpiCard label="Projects in My Region" value={myProjects.length}                                      icon="📍" color={T.primary} />
        <KpiCard label="In Progress"            value={myProjects.filter(p=>p.status==='in_progress').length} icon="⚡" color={T.info}    />
        <KpiCard label="Delayed"                value={myProjects.filter(p=>p.status==='delayed').length}     icon="⚠️" color={T.danger}  />
      </div>

      <div style={card}>
        <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:14 }}>Projects in {myRegion}</div>
        <table style={{ width:'100%' }}><TableHead /><tbody>
          {myProjects.map(p=><ProjectRow key={p.id} p={p} href={`/projects/${p.id}`} />)}
        </tbody></table>
        {myProjects.length === 0 && <div style={{ textAlign:'center', padding:40, color:T.textDim }}>No projects in your region.</div>}
      </div>
    </div>
  );
}

// ── 5. VENDOR DASHBOARD ──────────────────────────────────────────
function VendorDashboard({ projects }: { projects: typeof ALL_PROJECTS }) {
  const router = useRouter();
  const myVendorName = 'ABC Telecom Services';
  const myProjects   = projects.filter(p=>p.vendor===myVendorName);
  const docsPending  = myProjects.filter(p=>['in_progress','pending'].includes(p.status)).length;
  const submitted    = myProjects.filter(p=>p.status==='submitted').length;

  return (
    <div>
      <div style={{ ...card, marginBottom:20, background:`linear-gradient(135deg, ${T.primaryLight}, #E0FDF4)`, border:`1px solid ${T.primaryMid}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:48, height:48, borderRadius:12, background:`linear-gradient(135deg,${T.primary},#0F766E)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, color:'#fff' }}>🏢</div>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:T.text }}>{myVendorName}</div>
            <div style={{ fontSize:13, color:T.textMuted }}>Vendor Portal — {myProjects.length} active projects assigned</div>
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
        <KpiCard label="My Projects"    value={myProjects.length}                                      icon="📁" color={T.primary} onClick={()=>router.push('/vendor/projects')} />
        <KpiCard label="Docs Pending"   value={docsPending}                                            icon="📂" color={T.warning} onClick={()=>router.push('/vendor/projects')} />
        <KpiCard label="Submitted"      value={submitted}                                              icon="📤" color={T.info}    />
        <KpiCard label="Completed"      value={myProjects.filter(p=>p.status==='completed').length}    icon="✅" color={T.success} />
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
        <AlertBanner count={docsPending} msg="Projects require document uploads to proceed"         color={T.warning} link="/vendor/projects" />
        <AlertBanner count={myProjects.filter(p=>p.status==='rejected').length} msg="Projects were rejected — check PM feedback and resubmit" color={T.danger} link="/vendor/projects" />
      </div>

      <div style={card}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
          <div style={{ fontSize:14, fontWeight:600, color:T.text }}>My Assigned Projects</div>
          <Link href="/vendor/projects" style={{ fontSize:12, color:T.primary, textDecoration:'none' }}>View All →</Link>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {myProjects.map((p,i)=>{
            const stColor: Record<string,string> = { in_progress:'#2563EB', delayed:'#DC2626', billing_review:'#7C3AED', completed:'#16A34A', pending:'#D97706', submitted:'#0D9488' };
            const c = stColor[p.status]||T.textDim;
            return (
              <div key={i} onClick={()=>router.push(`/vendor/projects/${p.id}`)}
                style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', background:T.bg, borderRadius:10, cursor:'pointer', border:`1px solid ${T.border}` }}
                onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.boxShadow='0 2px 8px rgba(0,0,0,0.08)'}
                onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.boxShadow='none'}>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:T.primary }}>{p.id}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{p.projectName}</div>
                  <div style={{ fontSize:11, color:T.textMuted }}>{p.site} · {p.type}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <span style={{ background:`${c}18`, color:c, border:`1px solid ${c}40`, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700 }}>
                    {STATUS_DISPLAY[p.status]||p.status}
                  </span>
                  <div style={{ fontSize:11, color:T.textMuted, marginTop:6 }}>Progress: {p.progress}%</div>
                </div>
              </div>
            );
          })}
          {myProjects.length===0 && <div style={{ textAlign:'center', padding:40, color:T.textDim }}>No projects assigned yet.</div>}
        </div>
      </div>
    </div>
  );
}

// ── 6. VIEWER DASHBOARD ──────────────────────────────────────────
function ViewerDashboard({ projects }: { projects: typeof ALL_PROJECTS }) {
  const router = useRouter();
  const statusData = [
    { name:'In Progress', value:projects.filter(p=>p.status==='in_progress').length,  color:'#2563EB' },
    { name:'Delayed',     value:projects.filter(p=>p.status==='delayed').length,       color:'#DC2626' },
    { name:'Completed',   value:projects.filter(p=>p.status==='completed').length,     color:'#16A34A' },
    { name:'Pending',     value:projects.filter(p=>p.status==='pending').length,       color:'#D97706' },
  ];
  return (
    <div>
      <div style={{ background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:8, padding:'10px 16px', marginBottom:20, fontSize:13, color:'#1D4ED8' }}>
        👁 View-only mode — you can browse all project information but cannot make changes.
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
        <KpiCard label="Total Projects"  value={projects.length}                                       icon="📁" color={T.primary} />
        <KpiCard label="In Progress"     value={projects.filter(p=>p.status==='in_progress').length}   icon="⚡" color={T.info}    />
        <KpiCard label="Delayed"         value={projects.filter(p=>p.status==='delayed').length}       icon="⚠️" color={T.danger}  />
        <KpiCard label="Total PO Value"  value={fmtCr(projects.reduce((a,p)=>a+p.poValue,0))}         icon="💰" color={T.success} />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
        <div style={card}>
          <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:14 }}>Status Distribution</div>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <ResponsiveContainer width={140} height={140}>
              <PieChart><Pie data={statusData} cx="50%" cy="50%" innerRadius={38} outerRadius={62} dataKey="value" paddingAngle={3}>
                {statusData.map((d,i)=><Cell key={i} fill={d.color} />)}
              </Pie><Tooltip contentStyle={{ fontSize:12 }} /></PieChart>
            </ResponsiveContainer>
            <div style={{ flex:1 }}>
              {statusData.map((d,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:d.color }} />
                  <span style={{ fontSize:12, color:T.textMuted, flex:1 }}>{d.name}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:T.text }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={card}>
          <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:14 }}>All Projects Summary</div>
          <table style={{ width:'100%' }}><TableHead /><tbody>
            {projects.slice(0,5).map(p=><ProjectRow key={p.id} p={p} href={`/projects/${p.id}`} />)}
          </tbody></table>
        </div>
      </div>
    </div>
  );
}

// ── 7. ACCOUNTING DASHBOARD ──────────────────────────────────────
function AccountingDashboard({ projects }: { projects: typeof ALL_PROJECTS }) {
  const router = useRouter();
  const [selectedProject, setSelectedProject] = useState<string|null>(null);
  const billingProjects = projects.filter(p=>p.status==='billing_review'||p.status==='completed');
  const totalBilled     = INVOICES.reduce((a,i)=>a+i.total, 0);
  const approved        = INVOICES.filter(i=>i.status==='Approved');
  const pending         = INVOICES.filter(i=>i.status==='Submitted'||i.status==='Under Review');

  const roleColor: Record<string,string> = { Vendor:T.info, PM:T.primary, RM:T.success, Billing:T.warning };

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
        <KpiCard label="Total Invoices"   value={INVOICES.length}         icon="📄" color={T.primary} onClick={()=>router.push('/billing')} />
        <KpiCard label="Pending Review"   value={pending.length}          icon="⏳" color={T.warning} onClick={()=>router.push('/billing')} />
        <KpiCard label="Approved"         value={approved.length}         icon="✅" color={T.success} />
        <KpiCard label="Total Billed"     value={fmt(totalBilled)}        icon="💰" color='#7C3AED'  />
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
        <AlertBanner count={pending.length}         msg="Invoices pending review and approval"      color={T.warning} link="/billing" />
        <AlertBanner count={billingProjects.length} msg="Projects ready for billing clearance"      color='#7C3AED'   link="/billing" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
        <div style={card}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
            <div style={{ fontSize:14, fontWeight:600, color:T.text }}>Invoice Pipeline</div>
            <Link href="/billing" style={{ fontSize:12, color:T.primary, textDecoration:'none' }}>Manage →</Link>
          </div>
          <table style={{ width:'100%' }}>
            <thead><tr>{['Invoice','Project','Amount','Status'].map(h=>(
              <th key={h} style={{ padding:'7px 10px', fontSize:11, fontWeight:700, textTransform:'uppercase', color:T.textMuted, textAlign:'left', borderBottom:`2px solid ${T.border}` }}>{h}</th>
            ))}</tr></thead>
            <tbody>
              {INVOICES.map((inv,i)=>(
                <tr key={i} onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background=T.bg} onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background='transparent'}>
                  <td style={{ padding:'8px 10px', color:T.primary, fontWeight:700, fontSize:12 }}>{inv.id}</td>
                  <td style={{ padding:'8px 10px', fontSize:12 }}>{inv.project}</td>
                  <td style={{ padding:'8px 10px', fontWeight:600, fontSize:12 }}>₹{inv.total.toLocaleString('en-IN')}</td>
                  <td style={{ padding:'8px 10px' }}><span style={badge(inv.status)}>{inv.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={card}>
          <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:14 }}>Projects — Click to View Activity</div>
          {billingProjects.slice(0,5).map((p,i)=>(
            <div key={i} onClick={()=>setSelectedProject(selectedProject===p.id?null:p.id)}
              style={{ padding:'10px 12px', background:selectedProject===p.id?T.primaryLight:T.bg, borderRadius:8, marginBottom:6, cursor:'pointer', border:`1px solid ${selectedProject===p.id?T.primaryMid:T.border}` }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <div>
                  <span style={{ fontSize:12, fontWeight:700, color:T.primary }}>{p.id}</span>
                  <span style={{ fontSize:12, color:T.text, marginLeft:8 }}>{p.projectName}</span>
                </div>
                <span style={badge(STATUS_DISPLAY[p.status]||p.status)}>{STATUS_DISPLAY[p.status]||p.status}</span>
              </div>

              {/* End-to-end timeline */}
              {selectedProject === p.id && (
                <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${T.border}` }}>
                  <div style={{ fontSize:12, fontWeight:600, color:T.text, marginBottom:10 }}>📋 Project Details</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:12 }}>
                    {[['Site',p.site],['Client',p.client],['PM',p.pm||'—'],['Vendor',p.vendor||'—'],['PO Value',fmt(p.poValue)],['Progress',`${p.progress}%`]].map(([l,v])=>(
                      <div key={l} style={{ fontSize:11 }}><span style={{ color:T.textDim }}>{l}: </span><strong style={{ color:T.text }}>{v}</strong></div>
                    ))}
                  </div>
                  <div style={{ fontSize:12, fontWeight:600, color:T.text, marginBottom:8 }}>📂 Documents</div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
                    {['Safety Photos','Site Photos','JMR','AC Certificate','NOC','Drawing'].map(doc=>(
                      <span key={doc} style={{ fontSize:10, background:T.successBg, color:T.success, border:'1px solid #BBF7D0', padding:'2px 8px', borderRadius:10 }}>✓ {doc}</span>
                    ))}
                  </div>
                  <div style={{ fontSize:12, fontWeight:600, color:T.text, marginBottom:8 }}>⏱ Full Timeline</div>
                  <div style={{ position:'relative', paddingLeft:20 }}>
                    <div style={{ position:'absolute', left:7, top:0, bottom:0, width:2, background:T.border }} />
                    {TIMELINE.map((t,ti)=>(
                      <div key={ti} style={{ display:'flex', gap:10, marginBottom:10 }}>
                        <div style={{ width:14, height:14, borderRadius:'50%', background:roleColor[t.role]||T.textDim, flexShrink:0, zIndex:1, marginTop:2, border:'2px solid white' }} />
                        <div>
                          <div style={{ fontSize:11, fontWeight:600, color:T.text }}>{t.action}</div>
                          <div style={{ fontSize:10, color:T.textDim }}>{t.by} · {t.date}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:14 }}>Expenses Summary</div>
        <table style={{ width:'100%' }}>
          <thead><tr>{['Project','Vendor','Type','Amount','Date','Status'].map(h=>(
            <th key={h} style={{ padding:'7px 10px', fontSize:11, fontWeight:700, textTransform:'uppercase', color:T.textMuted, textAlign:'left', borderBottom:`2px solid ${T.border}` }}>{h}</th>
          ))}</tr></thead>
          <tbody>
            {EXPENSES.map((e,i)=>(
              <tr key={i} onMouseEnter={x=>(x.currentTarget as HTMLTableRowElement).style.background=T.bg} onMouseLeave={x=>(x.currentTarget as HTMLTableRowElement).style.background='transparent'}>
                <td style={{ padding:'8px 10px', color:T.primary, fontWeight:700, fontSize:12 }}>{e.project}</td>
                <td style={{ padding:'8px 10px', fontSize:12 }}>{e.vendor}</td>
                <td style={{ padding:'8px 10px', fontSize:12 }}>{e.type}</td>
                <td style={{ padding:'8px 10px', fontWeight:600 }}>₹{e.amount.toLocaleString('en-IN')}</td>
                <td style={{ padding:'8px 10px', fontSize:12, color:T.textDim }}>{e.date}</td>
                <td style={{ padding:'8px 10px' }}><span style={badge(e.status)}>{e.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── MAIN DASHBOARD (role router) ─────────────────────────────────
export default function Dashboard() {
  const { profile } = useAuth();
  const role = profile?.role || 'viewer';
  const name = profile?.full_name?.split(' ')[0] || 'User';

  const greetings: Record<string,string> = {
    super_admin:     `Welcome back, ${name} 👋`,
    region_manager:  `Good day, ${name} 📍`,
    project_manager: `Hello, ${name} 📋`,
    site_engineer:   `Good morning, ${name} 👷`,
    vendor:          `Welcome, ${name} 🏢`,
    viewer:          `Hello, ${name} 👁`,
    accounting_team: `Good day, ${name} 💳`,
  };
  const subtitles: Record<string,string> = {
    super_admin:     'Global overview across all projects and teams.',
    region_manager:  'Your region\'s project performance and team status.',
    project_manager: 'Your assigned projects and action items.',
    site_engineer:   'Projects in your region and today\'s tasks.',
    vendor:          'Your assigned projects and document upload status.',
    viewer:          'Read-only overview of all project activity.',
    accounting_team: 'Billing pipeline, invoices, and project financials.',
  };

  const selStyle: React.CSSProperties = { background:'#fff', border:`1px solid ${T.border}`, borderRadius:7, padding:'6px 10px', fontSize:12, color:T.text, outline:'none', cursor:'pointer' };

  return (
    <Layout>
      <div className="fade-in">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, flexWrap:'wrap', gap:12 }}>
          <div>
            <h2 style={{ fontSize:18, fontWeight:800, color:T.text, margin:0 }}>{greetings[role] || `Welcome, ${name}`}</h2>
            <p style={{ fontSize:13, color:T.textMuted, margin:'4px 0 0' }}>{subtitles[role] || ''}</p>
          </div>
          {/* Filter bar only for admin roles */}
          {['super_admin','region_manager'].includes(role) && (
            <div style={{ display:'flex', gap:8 }}>
              <select style={selStyle}><option>All Regions</option>{['Tamil Nadu','Karnataka','Maharashtra','Delhi','Kerala'].map(r=><option key={r}>{r}</option>)}</select>
              <select style={selStyle}><option>All Types</option>{['Tower Erection','Tower Maintenance','Fiber Installation','Civil Works'].map(t=><option key={t}>{t}</option>)}</select>
              <input type="date" style={{ ...selStyle, width:130 }} />
            </div>
          )}
        </div>

        {role === 'super_admin'     && <SuperAdminDashboard   projects={ALL_PROJECTS} />}
        {role === 'region_manager'  && <RegionManagerDashboard projects={ALL_PROJECTS} />}
        {role === 'project_manager' && <ProjectManagerDashboard projects={ALL_PROJECTS} />}
        {role === 'site_engineer'   && <SiteEngineerDashboard  projects={ALL_PROJECTS} />}
        {role === 'vendor'          && <VendorDashboard         projects={ALL_PROJECTS} />}
        {role === 'viewer'          && <ViewerDashboard         projects={ALL_PROJECTS} />}
        {role === 'accounting_team' && <AccountingDashboard     projects={ALL_PROJECTS} />}
      </div>
    </Layout>
  );
}
