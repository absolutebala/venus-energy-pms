import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { T, card, badge, th, td } from '@/lib/theme';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const fmt = (v: number) => `₹${(v / 100000).toFixed(2)}L`;

const kpis = [
  { label:'Total PO Value',  value:'₹12.45 Cr', icon:'📋', color:T.primary, trend:'+12%', up:true,  link:'/projects' },
  { label:'PO Aging >30d',   value:'16',          icon:'⏰', color:T.danger,  trend:'+2',   up:false, link:'/projects?aging=overdue' },
  { label:'Total Expenses',  value:'₹1.25 Cr',  icon:'💰', color:T.purple,  trend:'+8%',  up:false, link:'/site-expenses' },
];

const ALL_PROJECTS_DATA = [
  { status:'in_progress' }, { status:'delayed'     }, { status:'completed'   },
  { status:'in_progress' }, { status:'pending'     }, { status:'delayed'     },
  { status:'in_progress' }, { status:'in_progress' }, { status:'delayed'     },
  { status:'pending'     },
];
const countByStatus = (s: string) => ALL_PROJECTS_DATA.filter(p => p.status === s).length;
const statusData = [
  { name:'In Progress', value:countByStatus('in_progress'), color:'#2563EB', status:'in_progress' },
  { name:'Delayed',     value:countByStatus('delayed'),     color:'#DC2626', status:'delayed'     },
  { name:'Completed',   value:countByStatus('completed'),   color:'#16A34A', status:'completed'   },
  { name:'Pending',     value:countByStatus('pending'),     color:'#D97706', status:'pending'     },
];

const agingData = [
  { range:'0–30d',  count:26, fill:'#16A34A', min:0,  max:30  },
  { range:'31–60d', count:14, fill:'#2563EB', min:31, max:60  },
  { range:'61–90d', count: 6, fill:'#D97706', min:61, max:90  },
  { range:'90+d',   count: 4, fill:'#DC2626', min:91, max:999 },
];

const projectSummary = [
  { id:'VE-2025-001', site:'Chennai North',     pm:'Arun Kumar',   poValue:1850000, aging:12, status:'In Progress' },
  { id:'VE-2025-002', site:'Bengaluru East',    pm:'Priya Sharma', poValue:420000,  aging:78, status:'Delayed'     },
  { id:'VE-2025-003', site:'Hyderabad Central', pm:'Arun Kumar',   poValue:760000,  aging:22, status:'Completed'   },
  { id:'VE-2025-004', site:'Chennai South',     pm:'Vijay Kumar',  poValue:1230000, aging:12, status:'In Progress' },
  { id:'VE-2025-005', site:'Coimbatore',        pm:'Arun Kumar',   poValue:2200000, aging:8,  status:'Pending'     },
];

const workProgress = [
  { id:'VE-2025-001', workStatus:'In Progress', poStatus:'Partially Received', lastUpdate:'20 May 2025' },
  { id:'VE-2025-002', workStatus:'Delayed',     poStatus:'Pending',            lastUpdate:'18 May 2025' },
  { id:'VE-2025-003', workStatus:'In Progress', poStatus:'Partially Received', lastUpdate:'20 May 2025' },
  { id:'VE-2025-004', workStatus:'Completed',   poStatus:'Fully Received',     lastUpdate:'19 May 2025' },
  { id:'VE-2025-005', workStatus:'In Progress', poStatus:'Partially Received', lastUpdate:'20 May 2025' },
];

const alerts = [
  { type:'danger', title:'Delayed Projects (>60d)', count:3,  msg:'VE-002, 006, 009 — critical overdue', link:'/projects?status=delayed'  },
  { type:'warn',   title:'Safety Cert. Expiring',   count:5,  msg:'5 certificates expire within 7 days', link:'/safety-compliance'          },
  { type:'info',   title:'Pending Billing',          count:12, msg:'12 invoices awaiting approval',       link:'/billing?status=submitted'   },
  { type:'warn',   title:'SRN Material Return',      count:7,  msg:'7 material returns outstanding',      link:'/srn-return'                 },
];

const alertColors: Record<string,string> = { danger:T.danger, warn:T.warning, info:T.info };
const alertBgs:    Record<string,string> = { danger:T.dangerBg, warn:T.warningBg, info:T.infoBg };

const REGIONS = ['All Regions','Tamil Nadu','Karnataka','Telangana','Maharashtra','Delhi','Kerala','West Bengal'];
const PROJECT_TYPES = ['All Types','Tower Erection','Tower Maintenance','Component Replacement','Fiber Installation','Civil Works','Power Works'];

export default function Dashboard() {
  const router = useRouter();
  const { profile } = useAuth();
  const [region,      setRegion]      = useState('All Regions');
  const [projectType, setProjectType] = useState('All Types');
  const [fromDate,    setFromDate]    = useState('');
  const [toDate,      setToDate]      = useState('');

  const selStyle: React.CSSProperties = {
    background: '#fff', border: `1px solid ${T.border}`, borderRadius: 7,
    padding: '6px 10px', fontSize: 12, color: T.text, outline: 'none',
    cursor: 'pointer',
  };

  const handleAgingClick = (entry: any) => {
    router.push(`/projects?ageMin=${entry.min}&ageMax=${entry.max}`);
  };

  return (
    <Layout>
      <div className="fade-in">
        {/* Filter bar + welcome */}
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
            <div style={{ display:'flex', alignItems:'center', gap:4 }}>
              <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} style={{ ...selStyle, width:130 }} />
              <span style={{ fontSize:11, color:T.textDim }}>to</span>
              <input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} style={{ ...selStyle, width:130 }} />
            </div>
          </div>
        </div>

        {/* KPI cards - 3 only */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
          {kpis.map((k,i) => (
            <div key={i} onClick={() => router.push(k.link)}
              style={{ ...card, position:'relative', overflow:'hidden', padding:'18px 20px', cursor:'pointer', transition:'all 0.15s' }}
              onMouseEnter={e=>{ const el=e.currentTarget as HTMLDivElement; el.style.boxShadow='0 4px 16px rgba(13,148,136,0.15)'; el.style.transform='translateY(-1px)'; }}
              onMouseLeave={e=>{ const el=e.currentTarget as HTMLDivElement; el.style.boxShadow='0 1px 3px rgba(0,0,0,0.06)'; el.style.transform='translateY(0)'; }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:k.color }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontSize:11, color:T.textMuted, fontWeight:500, marginBottom:7, textTransform:'uppercase', letterSpacing:0.5 }}>{k.label}</div>
                  <div style={{ fontSize:26, fontWeight:700, color:T.text, letterSpacing:-0.5 }}>{k.value}</div>
                </div>
                <div style={{ width:40, height:40, background:`${k.color}15`, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>{k.icon}</div>
              </div>
              <div style={{ fontSize:11, color:k.up?T.success:T.danger, marginTop:10, fontWeight:500 }}>
                {k.up?'▲':'▼'} {k.trend} vs last month
              </div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
          {/* Status pie */}
          <div style={card}>
            <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:14 }}>Project Status Distribution</div>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={44} outerRadius={68} dataKey="value" paddingAngle={3}
                    onClick={(entry: any) => router.push(`/projects?status=${entry.status}`)}>
                    {statusData.map((d,i) => <Cell key={i} fill={d.color} cursor="pointer" />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize:12, borderRadius:8, border:`1px solid ${T.border}` }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex:1 }}>
                {statusData.map((d,i) => (
                  <div key={i} onClick={() => router.push(`/projects?status=${d.status}`)}
                    style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10, cursor:'pointer', borderRadius:6, padding:'3px 6px' }}
                    onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background=T.bg}
                    onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background='transparent'}>
                    <div style={{ width:10, height:10, borderRadius:3, background:d.color, flexShrink:0 }} />
                    <span style={{ fontSize:13, color:T.textMuted, flex:1 }}>{d.name}</span>
                    <span style={{ fontSize:14, fontWeight:700, color:T.text }}>{d.value}</span>
                    <span style={{ fontSize:11, color:T.primary }}>→</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Aging bar - fixed click handler */}
          <div style={card}>
            <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:14 }}>PO Aging Analysis (Days)</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={agingData} barSize={36}
                onClick={(data: any) => { if (data?.activePayload?.[0]) { const d = data.activePayload[0].payload; router.push(`/projects?ageMin=${d.min}&ageMax=${d.max}`); } }}>
                <XAxis dataKey="range" tick={{ fontSize:12, fill:T.textMuted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:12, fill:T.textMuted }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, fontSize:12 }} cursor={{ fill:'#F1F5F9', cursor:'pointer' }} />
                <Bar dataKey="count" radius={[5,5,0,0]} cursor="pointer">
                  {agingData.map((d,i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display:'flex', justifyContent:'center', gap:14, marginTop:8 }}>
              {agingData.map((d,i) => (
                <div key={i} onClick={() => router.push(`/projects?ageMin=${d.min}&ageMax=${d.max}`)}
                  style={{ fontSize:11, color:d.fill, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                  <span style={{ width:6, height:6, borderRadius:2, background:d.fill, display:'inline-block' }} />
                  {d.range} ({d.count})
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Project Summary + Work Progress */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 }}>

          {/* Project Summary */}
          <div style={card}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:13 }}>
              <div style={{ fontSize:14, fontWeight:600, color:T.text }}>Project Summary</div>
              <Link href="/projects" style={{ fontSize:12, color:T.primary, textDecoration:'none', fontWeight:500 }}>View All →</Link>
            </div>
            <table style={{ width:'100%' }}>
              <thead>
                <tr>{['Project No','Site Name','Project Mgr','PO Value','Aging','Status'].map(h=><th key={h} style={{ ...th, padding:'7px 8px', fontSize:10 }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {projectSummary.map((p,i) => (
                  <tr key={i} onClick={() => router.push(`/projects/${p.id}`)} style={{ cursor:'pointer' }}
                    onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background=T.primaryLight}
                    onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background='transparent'}>
                    <td style={{ ...td, color:T.primary, fontWeight:700, fontSize:12, padding:'9px 8px' }}>{p.id}</td>
                    <td style={{ ...td, color:T.text, fontSize:12, padding:'9px 8px' }}>{p.site}</td>
                    <td style={{ ...td, fontSize:11, padding:'9px 8px' }}>{p.pm}</td>
                    <td style={{ ...td, fontWeight:600, color:T.text, fontSize:12, padding:'9px 8px', whiteSpace:'nowrap' }}>{fmt(p.poValue)}</td>
                    <td style={{ ...td, padding:'9px 8px' }}><span style={{ color:p.aging>60?T.danger:p.aging>30?T.warning:T.success, fontWeight:700, fontSize:12 }}>{p.aging}d</span></td>
                    <td style={{ ...td, padding:'9px 8px' }}><span style={badge(p.status)}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:10, paddingTop:10, borderTop:`1px solid ${T.border}` }}>
              {[1,2,3,4,5].map(n => <button key={n} style={{ width:26, height:26, borderRadius:5, border:`1px solid ${n===1?T.primary:T.border}`, background:n===1?T.primary:'#fff', color:n===1?'#fff':T.textMuted, fontSize:12, cursor:'pointer' }}>{n}</button>)}
              <button style={{ width:26, height:26, borderRadius:5, border:`1px solid ${T.border}`, background:'#fff', color:T.textMuted, fontSize:12, cursor:'pointer' }}>›</button>
            </div>
          </div>

          {/* Work Progress Overview */}
          <div style={card}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:13 }}>
              <div style={{ fontSize:14, fontWeight:600, color:T.text }}>Work Progress Overview</div>
              <Link href="/projects" style={{ fontSize:12, color:T.primary, textDecoration:'none', fontWeight:500 }}>View All →</Link>
            </div>
            <table style={{ width:'100%' }}>
              <thead>
                <tr>{['Project No','Work Status','PO Status','Last Update'].map(h=><th key={h} style={{ ...th, padding:'7px 8px', fontSize:10 }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {workProgress.map((p,i) => (
                  <tr key={i} onClick={() => router.push(`/projects/${p.id}`)} style={{ cursor:'pointer' }}
                    onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background=T.primaryLight}
                    onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background='transparent'}>
                    <td style={{ ...td, color:T.primary, fontWeight:700, fontSize:12, padding:'9px 8px' }}>{p.id}</td>
                    <td style={{ ...td, padding:'9px 8px' }}><span style={badge(p.workStatus)}>{p.workStatus}</span></td>
                    <td style={{ ...td, padding:'9px 8px' }}>
                      <span style={{ fontSize:11, fontWeight:600, color:p.poStatus==='Fully Received'?T.success:p.poStatus==='Pending'?T.warning:T.primary, background:p.poStatus==='Fully Received'?T.successBg:p.poStatus==='Pending'?T.warningBg:T.primaryLight, padding:'2px 8px', borderRadius:20 }}>{p.poStatus}</span>
                    </td>
                    <td style={{ ...td, fontSize:11, color:T.textMuted, padding:'9px 8px', whiteSpace:'nowrap' }}>{p.lastUpdate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:10, paddingTop:10, borderTop:`1px solid ${T.border}` }}>
              {[1,2,3,4,5].map(n => <button key={n} style={{ width:26, height:26, borderRadius:5, border:`1px solid ${n===1?T.primary:T.border}`, background:n===1?T.primary:'#fff', color:n===1?'#fff':T.textMuted, fontSize:12, cursor:'pointer' }}>{n}</button>)}
              <button style={{ width:26, height:26, borderRadius:5, border:`1px solid ${T.border}`, background:'#fff', color:T.textMuted, fontSize:12, cursor:'pointer' }}>›</button>
            </div>
          </div>
        </div>

        {/* Alerts & Notifications — bottom horizontal row */}
        <div style={card}>
          <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:14 }}>🔔 Alerts & Notifications</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
            {alerts.map((a,i) => (
              <Link key={i} href={a.link} style={{ textDecoration:'none' }}>
                <div style={{ padding:14, borderLeft:`4px solid ${alertColors[a.type]}`, background:alertBgs[a.type], borderRadius:8, cursor:'pointer', height:'100%', boxSizing:'border-box' as const }}
                  onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'}
                  onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.boxShadow='none'}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:T.text }}>{a.title}</div>
                    <div style={{ background:alertColors[a.type], color:'#fff', borderRadius:12, padding:'2px 8px', fontSize:10, fontWeight:700, flexShrink:0, marginLeft:6 }}>{a.count}</div>
                  </div>
                  <div style={{ fontSize:11, color:T.textMuted, lineHeight:1.5 }}>{a.msg}</div>
                  <div style={{ fontSize:11, color:alertColors[a.type], fontWeight:600, marginTop:8 }}>View Details →</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

    </Layout>
  );
}
