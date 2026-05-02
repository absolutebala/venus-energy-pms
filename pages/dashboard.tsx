import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { T, card, badge, th, td } from '@/lib/theme';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const fmt = (v: number) => `₹${(v / 100000).toFixed(2)}L`;

const kpis = [
  { label:'Total PO Value',  value:'₹12.45 Cr', icon:'📋', color:T.primary, trend:'+12%', up:true,  link:'/projects'                },
  { label:'Pending Billing', value:'₹2.35 Cr',  icon:'⏳', color:T.warning, trend:'-5%',  up:false, link:'/billing?status=submitted' },
  { label:'Active Projects', value:'48',          icon:'⚡', color:T.success, trend:'+3',   up:true,  link:'/projects?status=in_progress' },
  { label:'PO Aging >30d',   value:'16',          icon:'⏰', color:T.danger,  trend:'+2',   up:false, link:'/projects?aging=overdue'  },
  { label:'Total Expenses',  value:'₹1.25 Cr',  icon:'💰', color:T.purple,  trend:'+8%',  up:false, link:'/site-expenses'           },
];

const statusData = [
  { name:'Completed',   value:19, color:'#16A34A', status:'completed'   },
  { name:'In Progress', value:14, color:'#2563EB', status:'in_progress' },
  { name:'Pending',     value:10, color:'#D97706', status:'pending'     },
  { name:'Delayed',     value: 8, color:'#DC2626', status:'delayed'     },
];

const agingData = [
  { range:'0–30d',  count:26, fill:'#16A34A', link:'/projects?aging=0-30'  },
  { range:'31–60d', count:14, fill:'#2563EB', link:'/projects?aging=31-60' },
  { range:'61–90d', count: 6, fill:'#D97706', link:'/projects?aging=61-90' },
  { range:'90+d',   count: 4, fill:'#DC2626', link:'/projects?aging=90+'   },
];

const recentProjects = [
  { id:'VE-2025-001', site:'Chennai North',     type:'Tower Erection',       client:'Airtel', po:1850000, aging:12, status:'In Progress' },
  { id:'VE-2025-002', site:'Bengaluru East',    type:'Tower Maintenance',    client:'Jio',    po:420000,  aging:78, status:'Delayed'     },
  { id:'VE-2025-003', site:'Hyderabad Central', type:'Component Replacement',client:'Vi',     po:760000,  aging:22, status:'Completed'   },
  { id:'VE-2025-004', site:'Chennai South',     type:'Fiber Installation',   client:'BSNL',   po:1230000, aging:12, status:'In Progress' },
  { id:'VE-2025-005', site:'Coimbatore',        type:'Tower Erection',       client:'Airtel', po:2200000, aging:8,  status:'Pending'     },
];

const alerts = [
  { type:'danger', title:'Delayed Projects (>60d)', count:3,  msg:'VE-002, 006, 009 — critical overdue', link:'/projects?status=delayed'         },
  { type:'warn',   title:'Safety Cert. Expiring',   count:5,  msg:'5 certificates expire within 7 days', link:'/safety-compliance'               },
  { type:'info',   title:'Pending Billing',          count:12, msg:'12 invoices awaiting approval',       link:'/billing?status=submitted'        },
  { type:'warn',   title:'SRN Material Return',      count:7,  msg:'7 material returns outstanding',      link:'/srn-return?status=pending'       },
];

const alertColors: Record<string,string> = { danger:T.danger, warn:T.warning, info:T.info };
const alertBgs:    Record<string,string> = { danger:T.dangerBg, warn:T.warningBg, info:T.infoBg };

export default function Dashboard() {
  const router = useRouter();
  const { profile } = useAuth();

  return (
    <Layout>
      <div className="fade-in">
        {/* Welcome */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <h2 style={{ fontSize:16, fontWeight:700, color:T.text }}>Welcome back, {profile?.full_name?.split(' ')[0] || 'User'} 👋</h2>
            <p style={{ fontSize:13, color:T.textMuted }}>Here's what's happening across all your projects today.</p>
          </div>
          <div style={{ fontSize:12, color:T.textDim }}>{new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}</div>
        </div>

        {/* KPI cards — all clickable */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14, marginBottom:20 }}>
          {kpis.map((k,i) => (
            <div key={i} onClick={() => router.push(k.link)} style={{ ...card, position:'relative', overflow:'hidden', padding:'16px 18px', cursor:'pointer', transition:'box-shadow 0.15s, transform 0.15s' }}
              onMouseEnter={e=>{ const el = e.currentTarget as HTMLDivElement; el.style.boxShadow='0 4px 16px rgba(13,148,136,0.15)'; el.style.transform='translateY(-1px)'; }}
              onMouseLeave={e=>{ const el = e.currentTarget as HTMLDivElement; el.style.boxShadow='0 1px 3px rgba(0,0,0,0.06)'; el.style.transform='translateY(0)'; }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:k.color }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontSize:11, color:T.textMuted, fontWeight:500, marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>{k.label}</div>
                  <div style={{ fontSize:22, fontWeight:700, color:T.text, letterSpacing:-0.5 }}>{k.value}</div>
                </div>
                <div style={{ width:36, height:36, background:`${k.color}15`, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>{k.icon}</div>
              </div>
              <div style={{ fontSize:11, color:k.up?T.success:T.danger, marginTop:10, fontWeight:500 }}>
                {k.up?'▲':'▼'} {k.trend} vs last month
              </div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
          {/* Status pie — segments clickable */}
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
                    style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, cursor:'pointer', borderRadius:6, padding:'2px 6px', margin:'0 -6px 10px' }}
                    onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background=T.bg}
                    onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background='transparent'}>
                    <div style={{ width:10, height:10, borderRadius:3, background:d.color, flexShrink:0 }} />
                    <span style={{ fontSize:13, color:T.textMuted, flex:1 }}>{d.name}</span>
                    <span style={{ fontSize:14, fontWeight:700, color:T.text }}>{d.value}</span>
                    <span style={{ fontSize:11, color:T.textDim }}>({Math.round(d.value/51*100)}%)</span>
                    <span style={{ fontSize:11, color:T.primary }}>→</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Aging bar — bars clickable */}
          <div style={card}>
            <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:14 }}>PO Aging Analysis (Days)</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={agingData} barSize={36}>
                <XAxis dataKey="range" tick={{ fontSize:12, fill:T.textMuted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:12, fill:T.textMuted }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, fontSize:12 }} cursor={{ fill:'#F1F5F9' }} />
                <Bar dataKey="count" radius={[5,5,0,0]} cursor="pointer" onClick={(entry: any) => router.push(entry.link)}>
                  {agingData.map((d,i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display:'flex', justifyContent:'center', gap:12, marginTop:8 }}>
              {agingData.map((d,i) => (
                <Link key={i} href={d.link} style={{ textDecoration:'none', fontSize:11, color:d.fill, fontWeight:600, display:'flex', alignItems:'center', gap:3 }}>
                  <span style={{ width:6, height:6, borderRadius:2, background:d.fill, display:'inline-block' }} />
                  {d.range} ({d.count})
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Projects table + Alerts */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:14 }}>
          <div style={card}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:600, color:T.text }}>Recent Projects</div>
              <Link href="/projects" style={{ fontSize:12, color:T.primary, textDecoration:'none', fontWeight:500 }}>View All →</Link>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%' }}>
                <thead>
                  <tr>{['Project ID','Site','Job Type','Client','PO Value','Aging','Status'].map(h=><th key={h} style={th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {recentProjects.map((p,i) => (
                    <tr key={i}
                      onClick={() => router.push(`/projects/${p.id}`)}
                      style={{ cursor:'pointer' }}
                      onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background=T.primaryLight}
                      onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background='transparent'}>
                      <td style={{ ...td, color:T.primary, fontWeight:700 }}>{p.id}</td>
                      <td style={{ ...td, color:T.text, fontWeight:500 }}>{p.site}</td>
                      <td style={td}><span style={{ fontSize:11, background:T.primaryLight, color:T.primary, padding:'2px 8px', borderRadius:5, fontWeight:500, whiteSpace:'nowrap' }}>{p.type}</span></td>
                      <td style={td}>{p.client}</td>
                      <td style={{ ...td, fontWeight:600, color:T.text }}>{fmt(p.po)}</td>
                      <td style={td}><span style={{ color:p.aging>60?T.danger:p.aging>30?T.warning:T.success, fontWeight:700 }}>{p.aging}d</span></td>
                      <td style={td}><span style={badge(p.status)}>{p.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding:'10px 0 0', borderTop:`1px solid ${T.border}`, fontSize:11, color:T.textDim, marginTop:8 }}>
              Click any row to view project details
            </div>
          </div>

          {/* Alerts — all clickable */}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ fontSize:13, fontWeight:600, color:T.text }}>🔔 Alerts & Notifications</div>
            {alerts.map((a,i) => (
              <Link key={i} href={a.link} style={{ textDecoration:'none' }}>
                <div style={{ ...card, padding:12, borderLeft:`3px solid ${alertColors[a.type]}`, background:alertBgs[a.type], cursor:'pointer', transition:'box-shadow 0.15s' }}
                  onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'}
                  onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.boxShadow='none'}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:T.text }}>{a.title}</div>
                    <div style={{ background:alertColors[a.type], color:'#fff', borderRadius:12, padding:'1px 8px', fontSize:10, fontWeight:700 }}>{a.count}</div>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ fontSize:11, color:T.textMuted }}>{a.msg}</div>
                    <span style={{ fontSize:11, color:alertColors[a.type], fontWeight:600, marginLeft:6 }}>→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
