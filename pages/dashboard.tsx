import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { T, card, badge } from '@/lib/theme';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const ALL_PROJECTS = [
  { id:'VE-2025-001', projectName:'Chennai Metro Phase II', site:'Chennai North',  client:'Airtel', type:'Tower Erection',    pm:'Arun Kumar',   vendor:'ABC Telecom Services', poValue:1850000, aging:12, status:'in_progress', progress:65,  region:'TN', createdAt:'2025-04-01' },
  { id:'VE-2025-002', projectName:'Bengaluru East Maint.',  site:'Bengaluru East', client:'Jio',    type:'Tower Maintenance',  pm:'Priya Sharma', vendor:'XYZ Infra Solutions',  poValue:420000,  aging:78, status:'delayed',     progress:30,  region:'KA', createdAt:'2025-03-15' },
  { id:'VE-2025-003', projectName:'Hyderabad Component',    site:'Hyderabad',      client:'Vi',     type:'Component Replace',  pm:'Arun Kumar',   vendor:'TowerTech Pvt Ltd',    poValue:760000,  aging:22, status:'completed',   progress:100, region:'TS', createdAt:'2025-04-10' },
  { id:'VE-2025-004', projectName:'Chennai Fiber Network',  site:'Chennai South',  client:'BSNL',   type:'Fiber Installation', pm:'Vijay Kumar',  vendor:null,                   poValue:1230000, aging:12, status:'in_progress', progress:45,  region:'TN', createdAt:'2025-04-20' },
  { id:'VE-2025-005', projectName:'Coimbatore Tower',       site:'Coimbatore',     client:'Airtel', type:'Tower Erection',     pm:'Arun Kumar',   vendor:null,                   poValue:2200000, aging:8,  status:'pending',     progress:10,  region:'TN', createdAt:'2025-05-01' },
  { id:'VE-2025-006', projectName:'Pune Civil Works',       site:'Pune West',      client:'Jio',    type:'Civil Works',        pm:'Pooja Mehta',  vendor:'BuildRight Constructions',poValue:540000,aging:95, status:'delayed',     progress:20,  region:'MH', createdAt:'2025-02-01' },
  { id:'VE-2025-007', projectName:'Mumbai Power Works',     site:'Mumbai Central', client:'Vi',     type:'Power Works',        pm:'Pooja Mehta',  vendor:'PowerSys India',        poValue:890000,  aging:33, status:'billing_review',progress:100,region:'MH', createdAt:'2025-04-05' },
  { id:'VE-2025-008', projectName:'Delhi NCR Maintenance',  site:'Delhi NCR',      client:'Airtel', type:'Tower Maintenance',  pm:'Rajeev Singh', vendor:'XYZ Infra Solutions',   poValue:380000,  aging:18, status:'in_progress', progress:55,  region:'DL', createdAt:'2025-05-01' },
  { id:'VE-2025-009', projectName:'Kochi Component Repl.',  site:'Kochi',          client:'BSNL',   type:'Component Replace',  pm:'Vijay Kumar',  vendor:'TowerTech Pvt Ltd',     poValue:650000,  aging:62, status:'delayed',     progress:40,  region:'KL', createdAt:'2025-03-01' },
  { id:'VE-2025-010', projectName:'Kolkata Fiber Install.',  site:'Kolkata North',  client:'Jio',    type:'Fiber Installation', pm:null,           vendor:null,                    poValue:975000,  aging:5,  status:'pending',     progress:0,   region:'WB', createdAt:'2025-05-10' },
];

const fmt = (v:number) => `₹${(v/100000).toFixed(1)}L`;

const STATUS_DISPLAY: Record<string,string> = { in_progress:'In Progress', pending:'Pending', delayed:'Delayed', completed:'Completed', submitted:'Submitted', pm_approved:'PM Approved', billing_review:'Billing Review' };

const countByStatus = (s:string) => ALL_PROJECTS.filter(p=>p.status===s).length;
const statusData = [
  { name:'In Progress',  value:countByStatus('in_progress'),  color:'#2563EB', status:'in_progress'  },
  { name:'Delayed',      value:countByStatus('delayed'),       color:'#DC2626', status:'delayed'      },
  { name:'Completed',    value:countByStatus('completed'),     color:'#16A34A', status:'completed'    },
  { name:'Pending',      value:countByStatus('pending'),       color:'#D97706', status:'pending'      },
  { name:'Billing',      value:countByStatus('billing_review'),color:'#7C3AED', status:'billing_review'},
];

const agingData = [
  { range:'0–30d', count:ALL_PROJECTS.filter(p=>p.aging<=30).length,              fill:'#16A34A', min:0,  max:30  },
  { range:'31–60d',count:ALL_PROJECTS.filter(p=>p.aging>30&&p.aging<=60).length,  fill:'#2563EB', min:31, max:60  },
  { range:'61–90d',count:ALL_PROJECTS.filter(p=>p.aging>60&&p.aging<=90).length,  fill:'#D97706', min:61, max:90  },
  { range:'90+d',  count:ALL_PROJECTS.filter(p=>p.aging>90).length,               fill:'#DC2626', min:91, max:999 },
];

const alerts = [
  { type:'danger', title:'Delayed Projects (>60d)', count:ALL_PROJECTS.filter(p=>p.aging>60).length,    msg:'Critical overdue projects',        link:'/projects?status=delayed'  },
  { type:'warn',   title:'Unassigned Projects',     count:ALL_PROJECTS.filter(p=>!p.pm).length,         msg:'No PM assigned yet',               link:'/projects'                 },
  { type:'info',   title:'Pending Billing Review',  count:ALL_PROJECTS.filter(p=>p.status==='billing_review').length, msg:'Awaiting billing clearance', link:'/billing' },
  { type:'warn',   title:'Vendor Not Assigned',     count:ALL_PROJECTS.filter(p=>!p.vendor).length,     msg:'Projects without vendor',          link:'/vendors'                  },
];

const REGIONS = ['All Regions','Tamil Nadu','Karnataka','Telangana','Maharashtra','Delhi','Kerala','West Bengal'];
const PROJECT_TYPES = ['All Types','Tower Erection','Tower Maintenance','Component Replacement','Fiber Installation','Civil Works','Power Works'];

export default function Dashboard() {
  const router = useRouter();
  const { profile } = useAuth();
  const isSuperAdmin = profile?.role === 'super_admin';
  const isPM = profile?.role === 'project_manager';
  const isRM = profile?.role === 'region_manager';

  // Role-aware path helpers
  const projectListPath  = isPM ? '/pm/projects' : isRM ? '/rm/projects' : '/projects';
  const projectDetailPath = (id: string) => isPM ? `/pm/projects/${id}` : isRM ? `/rm/projects/${id}` : `/projects/${id}`;

  const [region,      setRegion]      = useState('All Regions');
  const [projectType, setProjectType] = useState('All Types');
  const [fromDate,    setFromDate]    = useState('');
  const [toDate,      setToDate]      = useState('');

  const selStyle: React.CSSProperties = { background:'#fff', border:`1px solid ${T.border}`, borderRadius:7, padding:'6px 10px', fontSize:12, color:T.text, outline:'none', cursor:'pointer' };

  // PM grouping
  const pmGroups = ALL_PROJECTS.filter(p=>p.pm).reduce((acc:any, p) => {
    if (!acc[p.pm!]) acc[p.pm!] = [];
    acc[p.pm!].push(p);
    return acc;
  }, {} as Record<string, typeof ALL_PROJECTS>);

  // Vendor grouping
  const vendorGroups = ALL_PROJECTS.filter(p=>p.vendor).reduce((acc:any, p) => {
    if (!acc[p.vendor!]) acc[p.vendor!] = [];
    acc[p.vendor!].push(p);
    return acc;
  }, {} as Record<string, typeof ALL_PROJECTS>);

  const unassigned = ALL_PROJECTS.filter(p => !p.pm || !p.vendor);
  const recent     = [...ALL_PROJECTS].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0,5);

  return (
    <Layout>
      <div className="fade-in">
        {/* Filter bar */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18, flexWrap:'wrap', gap:10 }}>
          <div>
            <h2 style={{ fontSize:16, fontWeight:700, color:T.text, margin:0 }}>Welcome back, {profile?.full_name?.split(' ')[0] || 'User'} 👋</h2>
            <p style={{ fontSize:12, color:T.textMuted, margin:0 }}>Here's what's happening across all your projects.</p>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
            <select value={region} onChange={e=>setRegion(e.target.value)} style={selStyle}>
              {REGIONS.map(r=><option key={r}>{r}</option>)}
            </select>
            <select value={projectType} onChange={e=>setProjectType(e.target.value)} style={selStyle}>
              {PROJECT_TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
            <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} style={{ ...selStyle, width:130 }} />
            <span style={{ fontSize:11, color:T.textDim }}>to</span>
            <input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} style={{ ...selStyle, width:130 }} />
          </div>
        </div>

        {/* KPI Cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
          {[
            { label:'Total PO Value',  value:`₹${(ALL_PROJECTS.reduce((a,p)=>a+p.poValue,0)/10000000).toFixed(2)} Cr`, icon:'📋', color:T.primary, link:'/projects' },
            { label:'PO Aging >30d',   value:ALL_PROJECTS.filter(p=>p.aging>30).length, icon:'⏰', color:T.danger, link:'/projects?ageMin=31&ageMax=999' },
            { label:'Total Expenses',  value:'₹1.25 Cr', icon:'💰', color:T.purple, link:'/site-expenses' },
          ].map((k,i)=>(
            <div key={i} onClick={()=>router.push(k.link)}
              style={{ ...card, position:'relative', overflow:'hidden', padding:'18px 20px', cursor:'pointer', transition:'all 0.15s' }}
              onMouseEnter={e=>{ const el=e.currentTarget as HTMLDivElement; el.style.boxShadow='0 4px 16px rgba(13,148,136,0.15)'; el.style.transform='translateY(-1px)'; }}
              onMouseLeave={e=>{ const el=e.currentTarget as HTMLDivElement; el.style.boxShadow='0 1px 3px rgba(0,0,0,0.06)'; el.style.transform='translateY(0)'; }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:k.color }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontSize:11, color:T.textMuted, fontWeight:500, marginBottom:7, textTransform:'uppercase', letterSpacing:0.5 }}>{k.label}</div>
                  <div style={{ fontSize:26, fontWeight:700, color:T.text }}>{k.value}</div>
                </div>
                <div style={{ width:40, height:40, background:`${k.color}15`, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>{k.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
          <div style={card}>
            <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:14 }}>Project Status Distribution</div>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={44} outerRadius={68} dataKey="value" paddingAngle={3}
                    onClick={(entry:any)=>router.push(`${projectListPath}?status=${entry.status}`)}>
                    {statusData.map((d,i)=><Cell key={i} fill={d.color} cursor="pointer" />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize:12, borderRadius:8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex:1 }}>
                {statusData.map((d,i)=>(
                  <div key={i} onClick={()=>router.push(`${projectListPath}?status=${d.status}`)}
                    style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, cursor:'pointer', borderRadius:6, padding:'3px 6px' }}
                    onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background=T.bg}
                    onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background='transparent'}>
                    <div style={{ width:10, height:10, borderRadius:3, background:d.color, flexShrink:0 }} />
                    <span style={{ fontSize:13, color:T.textMuted, flex:1 }}>{d.name}</span>
                    <span style={{ fontSize:14, fontWeight:700, color:T.text }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={card}>
            <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:14 }}>PO Aging Analysis</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={agingData} barSize={36}
                onClick={(data:any)=>{ if(data?.activePayload?.[0]){ const d=data.activePayload[0].payload; router.push(`${projectListPath}?ageMin=${d.min}&ageMax=${d.max}`); } }}>
                <XAxis dataKey="range" tick={{ fontSize:12, fill:T.textMuted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:12, fill:T.textMuted }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, fontSize:12 }} cursor={{ fill:'#F1F5F9' }} />
                <Bar dataKey="count" radius={[5,5,0,0]} cursor="pointer">
                  {agingData.map((d,i)=><Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Super Admin specific cards */}
        {isSuperAdmin && (
          <>
            {/* Projects by PM */}
            <div style={card}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <div style={{ fontSize:14, fontWeight:700, color:T.text }}>📊 Projects by Project Manager</div>
                <Link href={projectListPath} style={{ fontSize:12, color:T.primary, textDecoration:'none' }}>View All →</Link>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                {Object.entries(pmGroups).map(([pm, projects]:any) => (
                  <div key={pm} onClick={()=>router.push(projectListPath)} style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:10, padding:14, cursor:'pointer', transition:'all 0.15s' }}
                    onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.boxShadow='0 2px 8px rgba(0,0,0,0.08)'}
                    onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.boxShadow='none'}>
                    <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:8 }}>{pm}</div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 }}>
                      {(['in_progress','delayed','completed','pending'] as const).map(s => {
                        const c = (projects as any[]).filter((p:any)=>p.status===s).length;
                        if (!c) return null;
                        const colors:Record<string,string> = { in_progress:T.info, delayed:T.danger, completed:T.success, pending:T.warning };
                        const labels:Record<string,string> = { in_progress:'Active', delayed:'Delayed', completed:'Done', pending:'Pending' };
                        return <span key={s} style={{ fontSize:11, fontWeight:600, color:colors[s], background:`${colors[s]}18`, padding:'2px 8px', borderRadius:20 }}>{c} {labels[s]}</span>;
                      })}
                    </div>
                    <div style={{ fontSize:12, color:T.textMuted }}>{(projects as any[]).length} project(s) · Total PO: {fmt((projects as any[]).reduce((a:number,p:any)=>a+p.poValue,0))}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom:16 }} />

            {/* Projects by Vendor */}
            <div style={card}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <div style={{ fontSize:14, fontWeight:700, color:T.text }}>🏢 Projects by Vendor</div>
                <Link href="/vendors" style={{ fontSize:12, color:T.primary, textDecoration:'none' }}>Manage Vendors →</Link>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                {Object.entries(vendorGroups).map(([vendor, projects]:any) => (
                  <div key={vendor} onClick={()=>router.push('/vendors')} style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:10, padding:14, cursor:'pointer', transition:'all 0.15s' }}
                    onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.boxShadow='0 2px 8px rgba(0,0,0,0.08)'}
                    onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.boxShadow='none'}>
                    <div style={{ fontSize:12, fontWeight:700, color:T.text, marginBottom:8 }}>{vendor}</div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:8 }}>
                      {(['in_progress','delayed','completed'] as const).map(s => {
                        const c = (projects as any[]).filter((p:any)=>p.status===s).length;
                        if (!c) return null;
                        const colors:Record<string,string> = { in_progress:T.info, delayed:T.danger, completed:T.success };
                        const labels:Record<string,string> = { in_progress:'Active', delayed:'Delayed', completed:'Done' };
                        return <span key={s} style={{ fontSize:10, fontWeight:600, color:colors[s], background:`${colors[s]}18`, padding:'2px 7px', borderRadius:20 }}>{c} {labels[s]}</span>;
                      })}
                    </div>
                    <div style={{ fontSize:11, color:T.textMuted }}>{(projects as any[]).length} project(s)</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom:16 }} />

            {/* Unassigned Projects */}
            {unassigned.length > 0 && (
              <div style={{ ...card, border:`1.5px solid ${T.warning}`, marginBottom:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:T.warning }}>⚠️ Unassigned Projects ({unassigned.length})</div>
                  <Link href={projectListPath} style={{ fontSize:12, color:T.primary, textDecoration:'none' }}>Assign Now →</Link>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                  {unassigned.map((p,i) => (
                    <div key={i} onClick={()=>router.push(projectDetailPath(p.id))} style={{ background:T.warningBg, border:`1px solid #FDE68A`, borderRadius:9, padding:12, cursor:'pointer' }}
                      onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.boxShadow='0 2px 8px rgba(0,0,0,0.08)'}
                      onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.boxShadow='none'}>
                      <div style={{ fontSize:12, fontWeight:700, color:T.text, marginBottom:4 }}>{p.id}</div>
                      <div style={{ fontSize:12, color:T.text, marginBottom:6 }}>{p.projectName}</div>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        {!p.pm     && <span style={{ fontSize:10, background:'#FEF2F2', color:T.danger, padding:'2px 7px', borderRadius:10, fontWeight:600 }}>No PM</span>}
                        {!p.vendor && <span style={{ fontSize:10, background:'#FEF2F2', color:T.danger, padding:'2px 7px', borderRadius:10, fontWeight:600 }}>No Vendor</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Project Summary + Work Progress */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
          <div style={card}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:13 }}>
              <div style={{ fontSize:14, fontWeight:600, color:T.text }}>Project Summary</div>
              <Link href={projectListPath} style={{ fontSize:12, color:T.primary, textDecoration:'none', fontWeight:500 }}>View All →</Link>
            </div>
            <table style={{ width:'100%' }}>
              <thead><tr>{['Project No','Site','PM','PO Value','Aging','Status'].map(h=><th key={h} style={{ padding:'7px 8px', fontSize:10, fontWeight:700, textTransform:'uppercase', color:T.textMuted, textAlign:'left', borderBottom:`2px solid ${T.border}` }}>{h}</th>)}</tr></thead>
              <tbody>
                {recent.map((p,i)=>(
                  <tr key={i} onClick={()=>router.push(projectDetailPath(p.id))} style={{ cursor:'pointer' }}
                    onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background=T.primaryLight}
                    onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background='transparent'}>
                    <td style={{ padding:'8px', color:T.primary, fontWeight:700, fontSize:12 }}>{p.id}</td>
                    <td style={{ padding:'8px', fontSize:12 }}>{p.site}</td>
                    <td style={{ padding:'8px', fontSize:11, color:T.textMuted }}>{p.pm || '—'}</td>
                    <td style={{ padding:'8px', fontWeight:600, fontSize:12, whiteSpace:'nowrap' }}>{fmt(p.poValue)}</td>
                    <td style={{ padding:'8px' }}><span style={{ color:p.aging>60?T.danger:p.aging>30?T.warning:T.success, fontWeight:700, fontSize:12 }}>{p.aging}d</span></td>
                    <td style={{ padding:'8px' }}><span style={badge(STATUS_DISPLAY[p.status]||p.status)}>{STATUS_DISPLAY[p.status]||p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={card}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:13 }}>
              <div style={{ fontSize:14, fontWeight:600, color:T.text }}>Recently Created Projects</div>
              <Link href={projectListPath} style={{ fontSize:12, color:T.primary, textDecoration:'none', fontWeight:500 }}>View All →</Link>
            </div>
            {recent.map((p,i)=>(
              <div key={i} onClick={()=>router.push(projectDetailPath(p.id))}
                style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:i<recent.length-1?`1px solid ${T.border}`:'', cursor:'pointer' }}
                onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background=T.primaryLight}
                onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background='transparent'}>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:T.primary }}>{p.id}</div>
                  <div style={{ fontSize:12, color:T.text }}>{p.projectName}</div>
                  <div style={{ fontSize:11, color:T.textDim }}>{new Date(p.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:12, fontWeight:600, color:T.text }}>{fmt(p.poValue)}</div>
                  <span style={badge(STATUS_DISPLAY[p.status]||p.status)}>{STATUS_DISPLAY[p.status]||p.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts - bottom */}
        <div style={card}>
          <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:14 }}>🔔 Alerts & Notifications</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
            {alerts.map((a,i)=>{
              const colors:Record<string,string> = { danger:T.danger, warn:T.warning, info:T.info };
              const bgs:Record<string,string>    = { danger:T.dangerBg, warn:T.warningBg, info:T.infoBg };
              return (
                <Link key={i} href={a.link} style={{ textDecoration:'none' }}>
                  <div style={{ padding:14, borderLeft:`4px solid ${colors[a.type]}`, background:bgs[a.type], borderRadius:8, cursor:'pointer', height:'100%', boxSizing:'border-box' as const }}
                    onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'}
                    onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.boxShadow='none'}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:T.text }}>{a.title}</div>
                      <div style={{ background:colors[a.type], color:'#fff', borderRadius:12, padding:'2px 8px', fontSize:10, fontWeight:700 }}>{a.count}</div>
                    </div>
                    <div style={{ fontSize:11, color:T.textMuted, lineHeight:1.5 }}>{a.msg}</div>
                    <div style={{ fontSize:11, color:colors[a.type], fontWeight:600, marginTop:8 }}>View Details →</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}
