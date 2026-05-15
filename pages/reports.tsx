import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { T, card, badge } from '@/lib/theme';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';

const ALL_PROJECTS = [
  { id:'VE-2025-001', pm:'Arun Kumar',   rm:'Ramesh Kumar', vendor:'ABC Telecom Services',    region:'Tamil Nadu',  status:'in_progress',   poValue:1850000, billedAmt:1200000, paidAmt:950000,  aging:12, type:'Tower Erection',    progress:65  },
  { id:'VE-2025-002', pm:'Priya Sharma', rm:'Amit Sharma',  vendor:'XYZ Infra Solutions',    region:'Karnataka',   status:'delayed',        poValue:420000,  billedAmt:150000,  paidAmt:100000,  aging:78, type:'Tower Maintenance', progress:30  },
  { id:'VE-2025-003', pm:'Arun Kumar',   rm:'Ramesh Kumar', vendor:'TowerTech Pvt Ltd',      region:'Tamil Nadu',  status:'billing_review', poValue:760000,  billedAmt:760000,  paidAmt:600000,  aging:22, type:'Component Replace', progress:100 },
  { id:'VE-2025-004', pm:'Vijay Kumar',  rm:'Ramesh Kumar', vendor:null,                     region:'Tamil Nadu',  status:'in_progress',   poValue:1230000, billedAmt:500000,  paidAmt:400000,  aging:12, type:'Fiber Installation', progress:45  },
  { id:'VE-2025-005', pm:'Arun Kumar',   rm:'Ramesh Kumar', vendor:null,                     region:'Tamil Nadu',  status:'pending',        poValue:2200000, billedAmt:0,       paidAmt:0,       aging:8,  type:'Tower Erection',    progress:10  },
  { id:'VE-2025-006', pm:'Pooja Mehta',  rm:'Amit Sharma',  vendor:'BuildRight Constructions',region:'Maharashtra',status:'delayed',        poValue:540000,  billedAmt:100000,  paidAmt:80000,   aging:95, type:'Civil Works',       progress:20  },
  { id:'VE-2025-007', pm:'Pooja Mehta',  rm:'Amit Sharma',  vendor:'PowerSys India',         region:'Maharashtra', status:'billing_review', poValue:890000,  billedAmt:890000,  paidAmt:700000,  aging:33, type:'Power Works',       progress:100 },
  { id:'VE-2025-008', pm:'Rajeev Singh', rm:'Amit Sharma',  vendor:'XYZ Infra Solutions',    region:'Delhi',       status:'in_progress',   poValue:380000,  billedAmt:200000,  paidAmt:180000,  aging:18, type:'Tower Maintenance', progress:55  },
  { id:'VE-2025-009', pm:'Vijay Kumar',  rm:'Ramesh Kumar', vendor:'TowerTech Pvt Ltd',      region:'Kerala',      status:'delayed',        poValue:650000,  billedAmt:250000,  paidAmt:200000,  aging:62, type:'Component Replace', progress:40  },
  { id:'VE-2025-010', pm:'Arun Kumar',   rm:'Ramesh Kumar', vendor:null,                     region:'West Bengal', status:'pending',        poValue:975000,  billedAmt:0,       paidAmt:0,       aging:5,  type:'Fiber Installation', progress:0   },
];

const fmt     = (v:number) => `₹${(v/100000).toFixed(1)}L`;
const fmtCr   = (v:number) => `₹${(v/10000000).toFixed(2)} Cr`;
const PCT_CLR = (v:number) => v>=80?T.success:v>=50?T.info:T.danger;

const REPORTS = [
  { key:'status',     label:'Project Status Report',    icon:'📋', desc:'All projects by status, region, aging'        },
  { key:'aging',      label:'PO Aging Analysis',        icon:'⏰', desc:'Aging buckets, overdue projects'              },
  { key:'financial',  label:'Financial Summary',        icon:'💰', desc:'PO value, billed, paid, pending by PM/region' },
  { key:'vendor',     label:'Vendor Performance',       icon:'🏢', desc:'Completion rate, delays, material compliance' },
  { key:'stnsrn',     label:'STN/SRN Material Report',  icon:'📦', desc:'Utilisation, returns, pending per project'    },
  { key:'ptw',        label:'PTW Compliance Report',    icon:'🔑', desc:'Permits issued, expiry, compliance status'    },
];

const PIE_COLORS = ['#2563EB','#DC2626','#16A34A','#D97706','#7C3AED'];

export default function ReportsPage() {
  const { profile } = useAuth();
  const [active,    setActive]    = useState('executive');
  const [region,    setRegion]    = useState('All');
  const [pmFilter,  setPmFilter]  = useState('All');
  const [fromDate,  setFromDate]  = useState('');
  const [toDate,    setToDate]    = useState('');

  const role = profile?.role || 'viewer';
  const isAccounting = role === 'accounting_team';

  const projects = ALL_PROJECTS;
  const totalPO  = projects.reduce((a,p)=>a+p.poValue,0);
  const totalBilled = projects.reduce((a,p)=>a+p.billedAmt,0);
  const totalPaid   = projects.reduce((a,p)=>a+p.paidAmt,0);
  const totalPending= totalBilled - totalPaid;

  const statusData = [
    { name:'In Progress', value:projects.filter(p=>p.status==='in_progress').length,   color:'#2563EB' },
    { name:'Delayed',     value:projects.filter(p=>p.status==='delayed').length,        color:'#DC2626' },
    { name:'Completed',   value:projects.filter(p=>p.status==='completed').length,      color:'#16A34A' },
    { name:'Pending',     value:projects.filter(p=>p.status==='pending').length,        color:'#D97706' },
    { name:'Billing',     value:projects.filter(p=>p.status==='billing_review').length, color:'#7C3AED' },
  ];

  const agingData = [
    { range:'0–30d',  count:projects.filter(p=>p.aging<=30).length,              color:T.success },
    { range:'31–60d', count:projects.filter(p=>p.aging>30&&p.aging<=60).length,  color:T.info    },
    { range:'61–90d', count:projects.filter(p=>p.aging>60&&p.aging<=90).length,  color:T.warning },
    { range:'90+d',   count:projects.filter(p=>p.aging>90).length,               color:T.danger  },
  ];

  // PM performance data
  const pms = Array.from(new Set(projects.map(p=>p.pm).filter(Boolean))) as string[];
  const pmData = pms.map(pm => {
    const ps = projects.filter(p=>p.pm===pm);
    return {
      name: pm,
      total: ps.length,
      delayed: ps.filter(p=>p.status==='delayed').length,
      completed: ps.filter(p=>['completed','billing_review'].includes(p.status)).length,
      onTime: Math.round(100 - (ps.filter(p=>p.status==='delayed').length / ps.length * 100)),
    };
  });

  // Vendor performance
  const vendors = Array.from(new Set(projects.map(p=>p.vendor).filter(Boolean))) as string[] as string[];
  const vendorData = vendors.map(v => {
    const ps = projects.filter(p=>p.vendor===v);
    const completed = ps.filter(p=>['completed','billing_review'].includes(p.status)).length;
    return {
      name: v.length > 20 ? v.substring(0,18)+'…' : v,
      fullName: v,
      total: ps.length,
      completed,
      delayed: ps.filter(p=>p.status==='delayed').length,
      completionRate: Math.round(completed/ps.length*100),
    };
  });

  // Region financial data
  const regions = Array.from(new Set(projects.map(p=>p.region))) as string[];
  const regionFinancial = regions.map(r => ({
    region: r.length > 12 ? r.substring(0,10)+'…' : r,
    poValue: projects.filter(p=>p.region===r).reduce((a,p)=>a+p.poValue,0)/100000,
    billed:  projects.filter(p=>p.region===r).reduce((a,p)=>a+p.billedAmt,0)/100000,
    paid:    projects.filter(p=>p.region===r).reduce((a,p)=>a+p.paidAmt,0)/100000,
  }));

  const selStyle: React.CSSProperties = { background:'#fff', border:`1px solid ${T.border}`, borderRadius:7, padding:'6px 10px', fontSize:12, color:T.text, outline:'none' };

  const KPI = ({ label, value, sub, color }: any) => (
    <div style={{ ...card, padding:'16px 18px' }}>
      <div style={{ fontSize:11, color:T.textMuted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:5 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:700, color:color||T.text }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:T.textDim, marginTop:3 }}>{sub}</div>}
    </div>
  );

  const printReport = () => window.print();

  return (
    <Layout>
      <div className="fade-in">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:12 }}>
          <div>
            <h2 style={{ fontSize:16, fontWeight:700, color:T.text, margin:0 }}>Management Reports</h2>
            <p style={{ fontSize:12, color:T.textMuted, margin:'2px 0 0' }}>Venus Energy Pvt. Ltd. · Telecom Infrastructure</p>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <select value={region} onChange={e=>setRegion(e.target.value)} style={selStyle}>
              <option>All</option>{regions.map(r=><option key={r}>{r}</option>)}
            </select>
            <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} style={{ ...selStyle, width:130 }} />
            <input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} style={{ ...selStyle, width:130 }} />
            <button onClick={printReport} style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:8, padding:'7px 14px', fontSize:12, cursor:'pointer', color:T.text, fontWeight:500 }}>🖨 Print</button>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:16 }}>
          {/* Report list */}
          <div>
            {REPORTS.filter(r => {
              if (role === 'vendor') return false;
              if (role === 'site_engineer') return ['executive','status'].includes(r.key);
              if (isAccounting) return ['executive','financial','stnsrn','vendor'].includes(r.key);
              return true;
            }).map(r=>(
              <div key={r.key} onClick={()=>setActive(r.key)}
                style={{ padding:'10px 12px', borderRadius:9, marginBottom:6, cursor:'pointer', border:`1.5px solid ${active===r.key?T.primary:T.border}`, background:active===r.key?T.primaryLight:T.surface, transition:'all 0.15s' }}>
                <div style={{ fontSize:13, fontWeight:600, color:active===r.key?T.primary:T.text }}>{r.icon} {r.label}</div>
                <div style={{ fontSize:11, color:T.textMuted, marginTop:2 }}>{r.desc}</div>
              </div>
            ))}
          </div>

          {/* Report content */}
          <div>
            {/* ── Executive Summary ── */}
            {active === 'executive' && (
              <div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
                  <KPI label="Total Projects"    value={projects.length}                                              color={T.primary} />
                  <KPI label="Total PO Value"    value={fmtCr(totalPO)}                                               color={T.text}    />
                  <KPI label="Delayed Projects"  value={projects.filter(p=>p.status==='delayed').length}              color={T.danger}  sub="Needs attention" />
                  <KPI label="On-Time Rate"      value={`${Math.round(projects.filter(p=>!['delayed'].includes(p.status)).length/projects.length*100)}%`} color={T.success} />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
                  <KPI label="Total Billed"      value={fmt(totalBilled)}     color={T.info}    />
                  <KPI label="Total Paid"        value={fmt(totalPaid)}       color={T.success} />
                  <KPI label="Pending Payment"   value={fmt(totalPending)}    color={T.warning} />
                  <KPI label="No Vendor Assigned" value={projects.filter(p=>!p.vendor).length} color={T.danger} sub="Action required" />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                  <div style={card}>
                    <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:14 }}>Status Distribution</div>
                    <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                      <ResponsiveContainer width={130} height={130}>
                        <PieChart><Pie data={statusData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" paddingAngle={3}>
                          {statusData.map((d,i)=><Cell key={i} fill={d.color} />)}
                        </Pie><Tooltip contentStyle={{ fontSize:12 }} /></PieChart>
                      </ResponsiveContainer>
                      <div style={{ flex:1 }}>
                        {statusData.map((d,i)=>(
                          <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                            <div style={{ width:8, height:8, borderRadius:2, background:d.color }} />
                            <span style={{ fontSize:12, color:T.textMuted, flex:1 }}>{d.name}</span>
                            <span style={{ fontSize:12, fontWeight:700, color:T.text }}>{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={card}>
                    <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:14 }}>PO Aging Overview</div>
                    <ResponsiveContainer width="100%" height={130}>
                      <BarChart data={agingData} barSize={32}>
                        <XAxis dataKey="range" tick={{ fontSize:11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize:11 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ fontSize:12 }} />
                        <Bar dataKey="count" radius={[5,5,0,0]}>{agingData.map((d,i)=><Cell key={i} fill={d.color} />)}</Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* ── Project Status ── */}
            {active === 'status' && (
              <div style={card}>
                <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:14 }}>All Projects — Status Overview</div>
                <table style={{ width:'100%' }}>
                  <thead><tr>{['Project ID','PM','Region','Type','PO Value','Aging','Progress','Status'].map(h=>(
                    <th key={h} style={{ padding:'8px 10px', fontSize:11, fontWeight:700, textTransform:'uppercase', color:T.textMuted, textAlign:'left', borderBottom:`2px solid ${T.border}` }}>{h}</th>
                  ))}</tr></thead>
                  <tbody>{projects.map((p,i)=>(
                    <tr key={i} style={{ borderBottom:`1px solid ${T.border}` }}>
                      <td style={{ padding:'9px 10px', color:T.primary, fontWeight:700, fontSize:12 }}>{p.id}</td>
                      <td style={{ padding:'9px 10px', fontSize:12 }}>{p.pm}</td>
                      <td style={{ padding:'9px 10px', fontSize:12, color:T.textMuted }}>{p.region}</td>
                      <td style={{ padding:'9px 10px', fontSize:11 }}>{p.type}</td>
                      <td style={{ padding:'9px 10px', fontWeight:600, fontSize:12 }}>{fmt(p.poValue)}</td>
                      <td style={{ padding:'9px 10px' }}><span style={{ color:p.aging>60?T.danger:p.aging>30?T.warning:T.success, fontWeight:700 }}>{p.aging}d</span></td>
                      <td style={{ padding:'9px 10px', fontSize:12 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div style={{ flex:1, height:5, background:T.border, borderRadius:3, minWidth:60 }}>
                            <div style={{ height:'100%', width:`${p.progress}%`, background:p.status==='delayed'?T.danger:T.primary, borderRadius:3 }} />
                          </div>
                          <span style={{ fontSize:11, color:T.textDim }}>{p.progress}%</span>
                        </div>
                      </td>
                      <td style={{ padding:'9px 10px' }}><span style={badge(p.status)}>{p.status.replace('_',' ')}</span></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}

            {/* ── Financial ── */}
            {active === 'financial' && (
              <div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
                  <KPI label="Total PO Value" value={fmtCr(totalPO)}      color={T.primary} />
                  <KPI label="Total Billed"   value={fmt(totalBilled)}    color={T.info}    />
                  <KPI label="Total Paid"     value={fmt(totalPaid)}      color={T.success} />
                  <KPI label="Outstanding"    value={fmt(totalPending)}   color={T.warning} />
                </div>
                <div style={card}>
                  <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:14 }}>Financial by Region (₹ Lakhs)</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={regionFinancial} barGap={4}>
                      <XAxis dataKey="region" tick={{ fontSize:11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize:11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ fontSize:12 }} formatter={(v:any)=>`₹${v}L`} />
                      <Legend />
                      <Bar dataKey="poValue" name="PO Value" fill={T.primary} radius={[4,4,0,0]} barSize={20} />
                      <Bar dataKey="billed"  name="Billed"   fill={T.info}    radius={[4,4,0,0]} barSize={20} />
                      <Bar dataKey="paid"    name="Paid"     fill={T.success} radius={[4,4,0,0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ── PM Performance ── */}
            {active === 'pm' && (
              <div style={card}>
                <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:14 }}>PM Performance Overview</div>
                {pmData.map((pm,i)=>(
                  <div key={i} style={{ padding:'14px 16px', background:T.bg, borderRadius:10, marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:T.text }}>{pm.name}</div>
                      <div style={{ display:'flex', gap:8 }}>
                        <span style={{ fontSize:12, color:T.info, background:T.infoBg, padding:'2px 10px', borderRadius:10, fontWeight:600 }}>{pm.total} projects</span>
                        {pm.delayed>0 && <span style={{ fontSize:12, color:T.danger, background:'#FEF2F2', padding:'2px 10px', borderRadius:10, fontWeight:600 }}>{pm.delayed} delayed</span>}
                        <span style={{ fontSize:12, color:T.success, background:T.successBg, padding:'2px 10px', borderRadius:10, fontWeight:600 }}>{pm.completed} completed</span>
                      </div>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                      <span style={{ fontSize:12, color:T.textMuted }}>On-Time Rate</span>
                      <span style={{ fontSize:12, fontWeight:700, color:PCT_CLR(pm.onTime) }}>{pm.onTime}%</span>
                    </div>
                    <div style={{ height:6, background:T.border, borderRadius:3 }}>
                      <div style={{ height:'100%', width:`${pm.onTime}%`, background:PCT_CLR(pm.onTime), borderRadius:3 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Vendor Performance ── */}
            {active === 'vendor' && (
              <div style={card}>
                <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:14 }}>Vendor Performance Overview</div>
                <table style={{ width:'100%' }}>
                  <thead><tr>{['Vendor','Total Projects','Completed','Delayed','Completion Rate','Material Return'].map(h=>(
                    <th key={h} style={{ padding:'8px 10px', fontSize:11, fontWeight:700, textTransform:'uppercase', color:T.textMuted, textAlign:'left', borderBottom:`2px solid ${T.border}` }}>{h}</th>
                  ))}</tr></thead>
                  <tbody>{vendorData.map((v,i)=>(
                    <tr key={i} style={{ borderBottom:`1px solid ${T.border}` }}>
                      <td style={{ padding:'10px', fontWeight:600, fontSize:13, color:T.text }}>{v.fullName}</td>
                      <td style={{ padding:'10px', textAlign:'center', fontWeight:700 }}>{v.total}</td>
                      <td style={{ padding:'10px', textAlign:'center', color:T.success, fontWeight:600 }}>{v.completed}</td>
                      <td style={{ padding:'10px', textAlign:'center', color:v.delayed>0?T.danger:T.success, fontWeight:600 }}>{v.delayed}</td>
                      <td style={{ padding:'10px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ flex:1, height:6, background:T.border, borderRadius:3 }}>
                            <div style={{ height:'100%', width:`${v.completionRate}%`, background:PCT_CLR(v.completionRate), borderRadius:3 }} />
                          </div>
                          <span style={{ fontSize:12, fontWeight:700, color:PCT_CLR(v.completionRate), minWidth:36 }}>{v.completionRate}%</span>
                        </div>
                      </td>
                      <td style={{ padding:'10px' }}><span style={{ fontSize:11, fontWeight:700, color:T.warning, background:T.warningBg, padding:'2px 8px', borderRadius:10 }}>⚠️ In Progress</span></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}

            {/* ── Aging ── */}
            {active === 'aging' && (
              <div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
                  {agingData.map((a,i)=>(
                    <div key={i} style={{ ...card, borderTop:`4px solid ${a.color}` }}>
                      <div style={{ fontSize:11, color:T.textMuted, textTransform:'uppercase', marginBottom:5 }}>{a.range}</div>
                      <div style={{ fontSize:28, fontWeight:700, color:a.color }}>{a.count}</div>
                      <div style={{ fontSize:11, color:T.textDim }}>projects</div>
                    </div>
                  ))}
                </div>
                <div style={card}>
                  <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:14 }}>Delayed Projects (&gt;30 days)</div>
                  <table style={{ width:'100%' }}>
                    <thead><tr>{['Project ID','PM','Region','Vendor','Aging','Status'].map(h=>(
                      <th key={h} style={{ padding:'8px 10px', fontSize:11, fontWeight:700, textTransform:'uppercase', color:T.textMuted, textAlign:'left', borderBottom:`2px solid ${T.border}` }}>{h}</th>
                    ))}</tr></thead>
                    <tbody>{projects.filter(p=>p.aging>30).sort((a,b)=>b.aging-a.aging).map((p,i)=>(
                      <tr key={i} style={{ borderBottom:`1px solid ${T.border}` }}>
                        <td style={{ padding:'9px 10px', color:T.primary, fontWeight:700 }}>{p.id}</td>
                        <td style={{ padding:'9px 10px', fontSize:12 }}>{p.pm}</td>
                        <td style={{ padding:'9px 10px', fontSize:12, color:T.textMuted }}>{p.region}</td>
                        <td style={{ padding:'9px 10px', fontSize:12 }}>{p.vendor||'—'}</td>
                        <td style={{ padding:'9px 10px' }}><span style={{ fontWeight:700, color:p.aging>60?T.danger:T.warning }}>{p.aging}d</span></td>
                        <td style={{ padding:'9px 10px' }}><span style={badge(p.status)}>{p.status.replace('_',' ')}</span></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── STN/SRN ── */}
            {active === 'stnsrn' && (
              <div style={card}>
                <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:8 }}>STN/SRN Material Utilisation Report</div>
                <div style={{ fontSize:12, color:T.textMuted, marginBottom:16 }}>Materials issued by Indus vs returned. Balance = pending return.</div>
                <table style={{ width:'100%' }}>
                  <thead><tr>{['Project','Vendor','STN Issued','SRN Returned','Balance','% Utilised','Return Status'].map(h=>(
                    <th key={h} style={{ padding:'8px 10px', fontSize:11, fontWeight:700, textTransform:'uppercase', color:T.textMuted, textAlign:'left', borderBottom:`2px solid ${T.border}` }}>{h}</th>
                  ))}</tr></thead>
                  <tbody>{[
                    { id:'VE-2025-001', vendor:'ABC Telecom Services', issued:4+120+4+10, returned:12+10, balance:106, pct:18 },
                    { id:'VE-2025-002', vendor:'XYZ Infra Solutions',  issued:8+20+4,    returned:6+4,   balance:22,  pct:28 },
                    { id:'VE-2025-003', vendor:'TowerTech Pvt Ltd',    issued:6+24+2,    returned:6+22+2,balance:2,   pct:97 },
                    { id:'VE-2025-006', vendor:'BuildRight Constructions',issued:20+100+5,returned:5+40, balance:80,  pct:36 },
                    { id:'VE-2025-007', vendor:'PowerSys India',       issued:1+200+2,   returned:1+200+2,balance:15,pct:93 },
                  ].map((r,i)=>(
                    <tr key={i} style={{ borderBottom:`1px solid ${T.border}` }}>
                      <td style={{ padding:'9px 10px', color:T.primary, fontWeight:700, fontSize:12 }}>{r.id}</td>
                      <td style={{ padding:'9px 10px', fontSize:12 }}>{r.vendor}</td>
                      <td style={{ padding:'9px 10px', textAlign:'right', fontWeight:600 }}>{r.issued}</td>
                      <td style={{ padding:'9px 10px', textAlign:'right', color:T.success, fontWeight:600 }}>{r.returned}</td>
                      <td style={{ padding:'9px 10px', textAlign:'right', fontWeight:700, color:r.balance>0?T.danger:T.success }}>{r.balance}</td>
                      <td style={{ padding:'9px 10px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div style={{ flex:1, height:6, background:T.border, borderRadius:3 }}>
                            <div style={{ height:'100%', width:`${r.pct}%`, background:PCT_CLR(r.pct), borderRadius:3 }} />
                          </div>
                          <span style={{ fontSize:11, fontWeight:700, color:PCT_CLR(r.pct) }}>{r.pct}%</span>
                        </div>
                      </td>
                      <td style={{ padding:'9px 10px' }}>
                        <span style={{ fontSize:11, fontWeight:700, color:r.balance===0?T.success:T.danger, background:r.balance===0?T.successBg:'#FEF2F2', padding:'2px 8px', borderRadius:10 }}>
                          {r.balance===0?'Cleared':'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}

            {/* ── PTW Compliance ── */}
            {active === 'ptw' && (
              <div style={card}>
                <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:8 }}>PTW Compliance Report</div>
                <div style={{ fontSize:12, color:T.textMuted, marginBottom:16 }}>Permit to Work status for all active projects.</div>
                <table style={{ width:'100%' }}>
                  <thead><tr>{['Project','PM','Ticket ID','Supervisor','Valid From','Valid To','Status'].map(h=>(
                    <th key={h} style={{ padding:'8px 10px', fontSize:11, fontWeight:700, textTransform:'uppercase', color:T.textMuted, textAlign:'left', borderBottom:`2px solid ${T.border}` }}>{h}</th>
                  ))}</tr></thead>
                  <tbody>{[
                    { id:'VE-2025-001', pm:'Arun Kumar',   ticket:'PTW-2025-1001', supervisor:'Rajesh Kumar', from:'01/04/2025', to:'30/06/2025', expired:false },
                    { id:'VE-2025-002', pm:'Priya Sharma', ticket:'PTW-2025-1002', supervisor:'Vikram Singh',  from:'01/03/2025', to:'30/04/2025', expired:true  },
                    { id:'VE-2025-004', pm:'Vijay Kumar',  ticket:'—',             supervisor:'—',            from:'—',          to:'—',          expired:false, noPTW:true },
                    { id:'VE-2025-008', pm:'Rajeev Singh', ticket:'PTW-2025-1008', supervisor:'Anil Patel',   from:'01/05/2025', to:'31/05/2025', expired:false },
                  ].map((r,i)=>(
                    <tr key={i} style={{ borderBottom:`1px solid ${T.border}` }}>
                      <td style={{ padding:'9px 10px', color:T.primary, fontWeight:700, fontSize:12 }}>{r.id}</td>
                      <td style={{ padding:'9px 10px', fontSize:12 }}>{r.pm}</td>
                      <td style={{ padding:'9px 10px', fontSize:12, fontWeight:600 }}>{r.ticket}</td>
                      <td style={{ padding:'9px 10px', fontSize:12 }}>{r.supervisor}</td>
                      <td style={{ padding:'9px 10px', fontSize:12, color:T.textDim }}>{r.from}</td>
                      <td style={{ padding:'9px 10px', fontSize:12, color:T.textDim }}>{r.to}</td>
                      <td style={{ padding:'9px 10px' }}>
                        <span style={{ fontSize:11, fontWeight:700,
                          color:(r as any).noPTW?T.danger:r.expired?T.warning:T.success,
                          background:(r as any).noPTW?'#FEF2F2':r.expired?T.warningBg:T.successBg,
                          padding:'2px 8px', borderRadius:10 }}>
                          {(r as any).noPTW?'⚠️ Not Issued':r.expired?'⏰ Expired':'✅ Active'}
                        </span>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
