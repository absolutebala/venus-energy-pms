import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { T, card, badge } from '@/lib/theme';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// ── Shared mock data ──────────────────────────────────────────────
const ALL_PROJECTS = [
  { id:'VE-2025-001', projectName:'Chennai Metro Phase II', site:'Chennai North',  client:'Airtel', type:'Tower Erection',    pm:'Arun Kumar',   rm:'Ramesh Kumar', vendor:'ABC Telecom Services',    poValue:1850000, aging:12, status:'in_progress',   progress:65,  region:'Tamil Nadu',  createdAt:'2025-04-01', assignedAt:'2025-05-10', vendorAssigned:true  },
  { id:'VE-2025-002', projectName:'Bengaluru East Maint.',  site:'Bengaluru East', client:'Jio',    type:'Tower Maintenance', pm:'Priya Sharma', rm:'Amit Sharma',  vendor:'XYZ Infra Solutions',    poValue:420000,  aging:78, status:'delayed',        progress:30,  region:'Karnataka',   createdAt:'2025-03-15', assignedAt:'2025-04-01', vendorAssigned:true  },
  { id:'VE-2025-003', projectName:'Hyderabad Component',   site:'Hyderabad',      client:'Vi',     type:'Component Replace', pm:'Arun Kumar',   rm:'Ramesh Kumar', vendor:'TowerTech Pvt Ltd',      poValue:760000,  aging:22, status:'billing_review', progress:100, region:'Tamil Nadu',  createdAt:'2025-04-10', assignedAt:'2025-04-15', vendorAssigned:true  },
  { id:'VE-2025-004', projectName:'Chennai Fiber Network', site:'Chennai South',  client:'BSNL',   type:'Fiber Installation',pm:'Vijay Kumar',  rm:'Ramesh Kumar', vendor:null,                     poValue:1230000, aging:12, status:'in_progress',   progress:45,  region:'Tamil Nadu',  createdAt:'2025-04-20', assignedAt:'2025-05-08', vendorAssigned:false },
  { id:'VE-2025-005', projectName:'Coimbatore Tower',      site:'Coimbatore',     client:'Airtel', type:'Tower Erection',    pm:'Arun Kumar',   rm:'Ramesh Kumar', vendor:null,                     poValue:2200000, aging:8,  status:'pending',        progress:10,  region:'Tamil Nadu',  createdAt:'2025-05-01', assignedAt:'2025-05-11', vendorAssigned:false },
  { id:'VE-2025-006', projectName:'Pune Civil Works',      site:'Pune West',      client:'Jio',    type:'Civil Works',       pm:'Pooja Mehta',  rm:'Amit Sharma',  vendor:'BuildRight Constructions',poValue:540000,  aging:95, status:'delayed',        progress:20,  region:'Maharashtra', createdAt:'2025-02-01', assignedAt:'2025-03-01', vendorAssigned:true  },
  { id:'VE-2025-007', projectName:'Mumbai Power Works',    site:'Mumbai Central', client:'Vi',     type:'Power Works',       pm:'Pooja Mehta',  rm:'Amit Sharma',  vendor:'PowerSys India',         poValue:890000,  aging:33, status:'billing_review', progress:100, region:'Maharashtra', createdAt:'2025-04-05', assignedAt:'2025-04-20', vendorAssigned:true  },
  { id:'VE-2025-008', projectName:'Delhi NCR Maintenance', site:'Delhi NCR',      client:'Airtel', type:'Tower Maintenance', pm:'Rajeev Singh', rm:'Amit Sharma',  vendor:'XYZ Infra Solutions',    poValue:380000,  aging:18, status:'in_progress',   progress:55,  region:'Delhi',       createdAt:'2025-05-01', assignedAt:'2025-05-09', vendorAssigned:true  },
  { id:'VE-2025-009', projectName:'Kochi Component Repl.', site:'Kochi',          client:'BSNL',   type:'Component Replace', pm:'Vijay Kumar',  rm:'Ramesh Kumar', vendor:'TowerTech Pvt Ltd',      poValue:650000,  aging:62, status:'delayed',        progress:40,  region:'Kerala',      createdAt:'2025-03-01', assignedAt:'2025-04-10', vendorAssigned:true  },
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
      <td style={{ padding:'9px 10px', fontSize:13 }}>{p.projectName}</td>
      <td style={{ padding:'9px 10px', fontSize:12, color:T.textMuted }}>{p.site}</td>
      <td style={{ padding:'9px 10px', fontWeight:600, whiteSpace:'nowrap' as const }}>{fmt(p.poValue)}</td>
      <td style={{ padding:'9px 10px' }}><span style={{ color:p.aging>60?T.danger:p.aging>30?T.warning:T.success, fontWeight:700 }}>{p.aging}d</span></td>
      <td style={{ padding:'9px 10px' }}><span style={badge(STATUS_DISPLAY[p.status]||p.status)}>{STATUS_DISPLAY[p.status]||p.status}</span></td>
    </tr>
  );
};

const TableHead = () => (
  <thead><tr>{['Project ID','Name','Site','PO Value','Aging','Status'].map(h=>(
    <th key={h} style={{ padding:'8px 10px', fontSize:11, fontWeight:700, textTransform:'uppercase', color:T.textMuted, textAlign:'left', borderBottom:`2px solid ${T.border}` }}>{h}</th>
  ))}</tr></thead>
);

// ── 1. SUPER ADMIN DASHBOARD ─────────────────────────────────────
function SuperAdminDashboard({ projects }: { projects: typeof ALL_PROJECTS }) {
  const router = useRouter();
  const pmGroups     = projects.filter(p=>p.pm).reduce((acc:any,p)=>{ if(!acc[p.pm!])acc[p.pm!]=[]; acc[p.pm!].push(p); return acc; },{});
  const vendorGroups = projects.filter(p=>p.vendor).reduce((acc:any,p)=>{ if(!acc[p.vendor!])acc[p.vendor!]=[]; acc[p.vendor!].push(p); return acc; },{});
  const unassigned   = projects.filter(p=>!p.pm||!p.vendor);
  const recent       = [...projects].sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()).slice(0,5);

  const statusData = [
    { name:'In Progress', value:projects.filter(p=>p.status==='in_progress').length,  color:'#2563EB', status:'in_progress'  },
    { name:'Delayed',     value:projects.filter(p=>p.status==='delayed').length,       color:'#DC2626', status:'delayed'      },
    { name:'Completed',   value:projects.filter(p=>p.status==='completed').length,     color:'#16A34A', status:'completed'    },
    { name:'Pending',     value:projects.filter(p=>p.status==='pending').length,       color:'#D97706', status:'pending'      },
    { name:'Billing',     value:projects.filter(p=>p.status==='billing_review').length,color:'#7C3AED', status:'billing_review'},
  ];

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
        <KpiCard label="Total Projects"    value={projects.length}                           icon="📁" color={T.primary} onClick={()=>router.push('/projects')} />
        <KpiCard label="Total PO Value"    value={fmtCr(projects.reduce((a,p)=>a+p.poValue,0))} icon="💰" color={T.success} />
        <KpiCard label="PO Aging >30d"     value={projects.filter(p=>p.aging>30).length}    icon="⏰" color={T.danger}  onClick={()=>router.push('/projects?ageMin=31&ageMax=999')} />
        <KpiCard label="Unassigned"        value={unassigned.length}                         icon="⚠️" color={T.warning} onClick={()=>router.push('/projects')} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
        <div style={card}>
          <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:14 }}>Status Distribution</div>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <ResponsiveContainer width={140} height={140}>
              <PieChart><Pie data={statusData} cx="50%" cy="50%" innerRadius={38} outerRadius={62} dataKey="value" paddingAngle={3}
                onClick={(e:any)=>router.push(`/projects?status=${e.status}`)}>
                {statusData.map((d,i)=><Cell key={i} fill={d.color} cursor="pointer" />)}
              </Pie><Tooltip contentStyle={{ fontSize:12 }} /></PieChart>
            </ResponsiveContainer>
            <div style={{ flex:1 }}>
              {statusData.map((d,i)=>(
                <div key={i} onClick={()=>router.push(`/projects?status=${d.status}`)}
                  style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, cursor:'pointer', padding:'2px 4px', borderRadius:5 }}
                  onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background=T.bg}
                  onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background='transparent'}>
                  <div style={{ width:8, height:8, borderRadius:2, background:d.color }} />
                  <span style={{ fontSize:12, color:T.textMuted, flex:1 }}>{d.name}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:T.text }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={card}>
          <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:14 }}>Projects by PM</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {Object.entries(pmGroups).slice(0,5).map(([pm,ps]:any)=>(
              <div key={pm} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 10px', background:T.bg, borderRadius:8 }}>
                <span style={{ fontSize:13, fontWeight:500, color:T.text }}>{pm}</span>
                <div style={{ display:'flex', gap:6 }}>
                  <span style={{ fontSize:11, color:T.info, background:`${T.info}18`, padding:'2px 8px', borderRadius:10 }}>{ps.filter((p:any)=>p.status==='in_progress').length} active</span>
                  {ps.filter((p:any)=>p.status==='delayed').length>0 && <span style={{ fontSize:11, color:T.danger, background:`${T.danger}18`, padding:'2px 8px', borderRadius:10 }}>{ps.filter((p:any)=>p.status==='delayed').length} delayed</span>}
                  <span style={{ fontSize:11, fontWeight:700, color:T.primary }}>{ps.length} total</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {unassigned.length > 0 && (
        <div style={{ ...card, border:`1.5px solid ${T.warning}`, marginBottom:20 }}>
          <div style={{ fontSize:14, fontWeight:700, color:T.warning, marginBottom:12 }}>⚠️ Unassigned Projects ({unassigned.length})</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            {unassigned.map((p,i)=>(
              <div key={i} onClick={()=>router.push(`/projects/${p.id}`)} style={{ background:T.warningBg, border:`1px solid #FDE68A`, borderRadius:9, padding:12, cursor:'pointer' }}>
                <div style={{ fontSize:12, fontWeight:700, color:T.primary }}>{p.id}</div>
                <div style={{ fontSize:12, color:T.text, margin:'3px 0' }}>{p.projectName}</div>
                <div style={{ display:'flex', gap:6 }}>
                  {!p.pm     && <span style={{ fontSize:10, background:'#FEF2F2', color:T.danger, padding:'2px 7px', borderRadius:10, fontWeight:600 }}>No PM</span>}
                  {!p.vendor && <span style={{ fontSize:10, background:'#FEF2F2', color:T.danger, padding:'2px 7px', borderRadius:10, fontWeight:600 }}>No Vendor</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
        <div style={card}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ fontSize:14, fontWeight:600, color:T.text }}>Recent Projects</div>
            <Link href="/projects" style={{ fontSize:12, color:T.primary, textDecoration:'none' }}>View All →</Link>
          </div>
          <table style={{ width:'100%' }}><TableHead /><tbody>{recent.map(p=><ProjectRow key={p.id} p={p} href={`/projects/${p.id}`} />)}</tbody></table>
        </div>
        <div style={card}>
          <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:12 }}>Projects by Vendor</div>
          {Object.entries(vendorGroups).slice(0,5).map(([v,ps]:any)=>(
            <div key={v} style={{ display:'flex', justifyContent:'space-between', padding:'8px 10px', background:T.bg, borderRadius:8, marginBottom:6 }}>
              <span style={{ fontSize:12, color:T.text, fontWeight:500 }}>{v}</span>
              <span style={{ fontSize:12, fontWeight:700, color:T.primary }}>{ps.length} projects · {fmt(ps.reduce((a:number,p:any)=>a+p.poValue,0))}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:14 }}>🔔 Alerts</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
          {[
            { type:T.danger,  title:'Delayed >60d',       count:projects.filter(p=>p.aging>60).length,             link:'/projects?status=delayed' },
            { type:T.warning, title:'No PM Assigned',      count:projects.filter(p=>!p.pm).length,                  link:'/projects'                },
            { type:'#7C3AED', title:'Pending Billing',     count:projects.filter(p=>p.status==='billing_review').length, link:'/billing'             },
            { type:T.warning, title:'No Vendor Assigned',  count:projects.filter(p=>!p.vendor).length,              link:'/vendors'                 },
          ].map((a,i)=>(
            <Link key={i} href={a.link} style={{ textDecoration:'none' }}>
              <div style={{ padding:14, borderLeft:`4px solid ${a.type}`, background:`${a.type}12`, borderRadius:8, cursor:'pointer' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ fontSize:12, fontWeight:600, color:T.text }}>{a.title}</span>
                  <span style={{ background:a.type, color:'#fff', borderRadius:12, padding:'2px 8px', fontSize:11, fontWeight:700 }}>{a.count}</span>
                </div>
                <span style={{ fontSize:11, color:a.type, fontWeight:600 }}>View →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 2. REGION MANAGER DASHBOARD ──────────────────────────────────
function RegionManagerDashboard({ projects }: { projects: typeof ALL_PROJECTS }) {
  const router = useRouter();
  const [globalView, setGlobalView] = useState(false);
  const myProjects = globalView ? projects : projects.filter(p=>p.rm==='Ramesh Kumar');
  const myPMs = [...new Set(myProjects.map(p=>p.pm).filter(Boolean))];

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
