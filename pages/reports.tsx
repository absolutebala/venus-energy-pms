import React, { useState, useMemo } from 'react';
import Icon from '@/components/Icon';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useProjects } from '@/context/ProjectContext';
import { useInvoices } from '@/context/InvoiceContext';
import { useMaterial } from '@/context/MaterialContext';
import { T, card, badge } from '@/lib/theme';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const fmt    = (v:number) => `₹${(v/100000).toFixed(1)}L`;
const fmtCr  = (v:number) => `₹${(v/10000000).toFixed(2)} Cr`;
const PCT_CLR= (v:number) => v>=80?T.success:v>=50?T.info:T.danger;
const getAging = (startDate:string, status?:string, endDate?:string) => {
  if (!startDate) return 0;
  if (status === "completed" && endDate)
    return Math.floor((new Date(endDate).getTime()-new Date(startDate).getTime())/86400000);
  return Math.floor((Date.now()-new Date(startDate).getTime())/86400000);
};
const fmtDate  = (d:string) => { try { return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); } catch { return d||'—'; }};

const PROGRESS_MAP: Record<string,number> = {
  not_started:0, pending:5, in_progress:45, delayed:40, submitted:70,
  under_review:75, pm_approved:85, billing_review:90, completed:100,
};

const REPORTS = [
  { key:'executive', label:'Executive Summary',      icon:'reports', desc:'KPIs, status distribution, aging overview' },
  { key:'status',    label:'Project Status Report',  icon:'clipboard', desc:'All projects by status, region, aging'    },
  { key:'financial', label:'Financial Summary',      icon:'wallet', desc:'PO value, billed, paid by region'         },
  { key:'pm',        label:'PM Performance',         icon:'user', desc:'On-time rate, delayed, completed per PM'  },
  { key:'vendor',    label:'Vendor Performance',     icon:'vendors', desc:'Completion rate, delays per vendor'       },
  { key:'aging',     label:'PO Aging Analysis',      icon:'⏰', desc:'Aging buckets, overdue projects'          },
  { key:'stnsrn',    label:'STN/SRN Material Report',icon:'package', desc:'Utilisation and return per project'       },
  { key:'ptw',       label:'PTW Compliance Report',  icon:'key', desc:'Permit to Work status per project'        },
];

const PIE_COLORS = ['#2563EB','#DC2626','#16A34A','#D97706','#7C3AED','#6B7280'];

export default function ReportsPage() {
  const { profile } = useAuth();
  const { projects: rawProjects, loading: projLoading } = useProjects();
  const { invoices, loading: invLoading } = useInvoices();
  const { allItems: materials, loading: matLoading } = useMaterial();

  const [active,   setActive]   = useState('executive');
  const [region,   setRegion]   = useState('All');

  const role = profile?.role || 'viewer';
  const loading = projLoading || invLoading;

  // Enrich projects with computed fields
  const projects = useMemo(() => {
    return (rawProjects as any[]).map(p => {
      const aging    = getAging(p.startDate, p.status, p.endDate);
      const progress = PROGRESS_MAP[p.status] || 0;
      const projInvs = invoices.filter(i => i.projectId === p.id);
      const billedAmt = projInvs.filter(i => ['Approved','Submitted','Under Review'].includes(i.invoiceStatus))
                          .reduce((a,i) => a + i.totalAmount, 0);
      return { ...p, aging, progress, billedAmt, paidAmt: p.paidAmount||0 };
    }).filter((p:any) => region === 'All' || p.region === region);
  }, [rawProjects, invoices, region]);

  const regions = useMemo(() => Array.from(new Set((rawProjects as any[]).map((p:any)=>p.region).filter(Boolean))), [rawProjects]);

  const totalPO      = projects.reduce((a,p:any)=>a+p.poValue,0);
  const totalBilled  = projects.reduce((a,p:any)=>a+p.billedAmt,0);
  const totalPaid    = projects.reduce((a,p:any)=>a+p.paidAmt,0);
  const totalPending = totalBilled - totalPaid;

  const statusData = [
    { name:'In Progress',   value:projects.filter((p:any)=>p.status==='in_progress').length,   color:'#2563EB' },
    { name:'Delayed',       value:projects.filter((p:any)=>p.status==='delayed').length,        color:'#DC2626' },
    { name:'Completed',     value:projects.filter((p:any)=>p.status==='completed').length,      color:'#16A34A' },
    { name:'Pending',       value:projects.filter((p:any)=>['pending','not_started'].includes(p.status)).length, color:'#D97706' },
    { name:'Billing Review',value:projects.filter((p:any)=>p.status==='billing_review').length, color:'#7C3AED' },
  ].filter(s=>s.value>0);

  const activeProjects = projects.filter((p:any) => p.status !== "completed");
  const agingData = [
    { range:'0–30d',  count:activeProjects.filter((p:any)=>p.aging<=30).length,  color:T.success },
    { range:'31–60d', count:activeProjects.filter((p:any)=>p.aging>30&&p.aging<=60).length, color:T.info },
    { range:'61–90d', count:activeProjects.filter((p:any)=>p.aging>60&&p.aging<=90).length, color:T.warning },
    { range:'90+d',   count:activeProjects.filter((p:any)=>p.aging>90).length,  color:T.danger },
  ];

  const pms = Array.from(new Set(projects.map((p:any)=>p.pm).filter(Boolean))) as string[];
  const pmData = pms.map(pm => {
    const ps = projects.filter((p:any)=>p.pm===pm);
    const completed = ps.filter((p:any)=>['completed','billing_review'].includes(p.status)).length;
    return {
      name: pm, total: ps.length,
      delayed:   ps.filter((p:any)=>p.status==='delayed').length,
      completed,
      onTime: Math.round(100-(ps.filter((p:any)=>p.status==='delayed').length/ps.length*100)),
    };
  });

  const vendors = Array.from(new Set(projects.map((p:any)=>p.vendor).filter(Boolean))) as string[];
  const vendorData = vendors.map(v => {
    const ps = projects.filter((p:any)=>p.vendor===v);
    const completed = ps.filter((p:any)=>['completed','billing_review'].includes(p.status)).length;
    return {
      name: v.length>20?v.substring(0,18)+'…':v, fullName:v,
      total:ps.length, completed,
      delayed:ps.filter((p:any)=>p.status==='delayed').length,
      completionRate:Math.round(completed/ps.length*100),
    };
  });

  const regionFinancial = (regions as string[]).map(r=>({
    region: r.length>12?r.substring(0,10)+'…':r,
    poValue: projects.filter((p:any)=>p.region===r).reduce((a,p:any)=>a+p.poValue,0)/100000,
    billed:  projects.filter((p:any)=>p.region===r).reduce((a,p:any)=>a+p.billedAmt,0)/100000,
    paid:    projects.filter((p:any)=>p.region===r).reduce((a,p:any)=>a+p.paidAmt,0)/100000,
  }));

  // STN/SRN grouped by project
  const stnSrnData = useMemo(() => {
    const map: Record<string,any[]> = {};
    for (const m of materials) { if (!map[m.projectId]) map[m.projectId]=[]; map[m.projectId].push(m); }
    return Object.entries(map).map(([projectId, mats]) => {
      const proj = (rawProjects as any[]).find(p=>p.id===projectId);
      const issued   = mats.reduce((a,m)=>a+(m.issuedQty||0),0);
      const returned = mats.reduce((a,m)=>a+(m.returnQty||0),0);
      const balance  = mats.reduce((a,m)=>a+Math.max(0,(m.issuedQty||0)-(m.pmApprovedQty||m.utilisedQty||0)),0);
      return { id:projectId, vendor:proj?.vendor||'—', issued, returned, balance, pct:issued?Math.round((issued-balance)/issued*100):0 };
    });
  }, [materials, rawProjects]);

  const selS: React.CSSProperties = { background:'#fff', border:`1px solid ${T.border}`, borderRadius:7, padding:'6px 10px', fontSize:12, color:T.text, outline:'none' };

  const KPI = ({ label, value, sub, color }: any) => (
    <div style={{ ...card, padding:'16px 18px' }}>
      <div style={{ fontSize:11, color:T.textMuted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:5 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:700, color:color||T.text }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:T.textDim, marginTop:3 }}>{sub}</div>}
    </div>
  );

  const thS: React.CSSProperties = { padding:'8px 10px', fontSize:11, fontWeight:700, textTransform:'uppercase',
    color:T.primary, background:T.primaryLight, textAlign:'left' as const, borderBottom:`2px solid ${T.primaryMid}` };

  const visibleReports = REPORTS.filter(r => {
    if (role === 'vendor') return false;
    if (role === 'site_engineer') return ['executive','status'].includes(r.key);
    if (role === 'accounting_team') return ['executive','financial','stnsrn','vendor'].includes(r.key);
    return true;
  });

  return (
    <Layout>
      <div className="fade-in">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:12 }}>
          <div>
            <h2 style={{ fontSize:16, fontWeight:700, color:T.text, margin:0 }}>Management Reports</h2>
            <p style={{ fontSize:12, color:T.textMuted, margin:'2px 0 0' }}>
              {loading ? 'Loading data…' : `${projects.length} projects · Live data from Supabase`}
            </p>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <select value={region} onChange={e=>setRegion(e.target.value)} style={selS}>
              <option>All</option>{(regions as string[]).map(r=><option key={r}>{r}</option>)}
            </select>
            <button onClick={()=>window.print()} style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:8, padding:'7px 14px', fontSize:12, cursor:'pointer', color:T.text }}>🖨 Print</button>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:16 }}>
          {/* Report list */}
          <div>
            {visibleReports.map(r=>(
              <div key={r.key} onClick={()=>setActive(r.key)}
                style={{ padding:'10px 12px', borderRadius:9, marginBottom:6, cursor:'pointer',
                  border:`1.5px solid ${active===r.key?T.primary:T.border}`,
                  background:active===r.key?T.primaryLight:T.surface }}>
                <div style={{ fontSize:13, fontWeight:600, color:active===r.key?T.primary:T.text }}>{r.icon} {r.label}</div>
                <div style={{ fontSize:11, color:T.textMuted, marginTop:2 }}>{r.desc}</div>
              </div>
            ))}
          </div>

          {/* Report content */}
          <div>
            {/* ── Executive Summary ── */}
            {active==='executive' && (
              <div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
                  <KPI label="Total Projects"    value={projects.length}                                                           color={T.primary} />
                  <KPI label="Total PO Value"    value={fmtCr(totalPO)}                                                            color={T.text}    />
                  <KPI label="Delayed Projects"  value={projects.filter((p:any)=>p.status==='delayed').length}                     color={T.danger}  sub="Needs attention" />
                  <KPI label="On-Time Rate"      value={`${Math.round(projects.filter((p:any)=>p.status!=='delayed').length/(projects.length||1)*100)}%`} color={T.success} />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
                  <KPI label="Total Billed"       value={fmt(totalBilled)}   color={T.info}    />
                  <KPI label="Total Paid"         value={fmt(totalPaid)}     color={T.success} />
                  <KPI label="Outstanding"        value={fmt(totalPending)}  color={T.warning} />
                  <KPI label="No Vendor Assigned" value={projects.filter((p:any)=>!p.vendor).length} color={T.danger} sub="Action required" />
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
                            <span style={{ fontSize:12, fontWeight:700 }}>{d.value}</span>
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
            {active==='status' && (
              <div style={card}>
                <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:14 }}>
                  All Projects — Status Overview <span style={{ fontSize:12, fontWeight:400, color:T.textMuted }}>({projects.length} records)</span>
                </div>
                <div style={{ overflowX:'auto' as const }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
                    <thead><tr>{['Project','PM','Region','Job Type','PO Value','Aging','Progress','Status'].map(h=>(
                      <th key={h} style={thS}>{h}</th>
                    ))}</tr></thead>
                    <tbody>{projects.map((p:any,i:number)=>(
                      <tr key={p.id} style={{ background:i%2===0?'#fff':T.bg, borderBottom:`1px solid ${T.border}` }}>
                        <td style={{ padding:'9px 10px', color:T.primary, fontWeight:700, fontSize:12 }}>{p.id}</td>
                        <td style={{ padding:'9px 10px', fontSize:12 }}>{p.pm}</td>
                        <td style={{ padding:'9px 10px', fontSize:12, color:T.textMuted }}>{p.region}</td>
                        <td style={{ padding:'9px 10px', fontSize:11 }}>{p.jobType||'—'}</td>
                        <td style={{ padding:'9px 10px', fontWeight:600, fontSize:12 }}>{fmt(p.poValue)}</td>
                        <td style={{ padding:'9px 10px' }}><span style={{ fontWeight:700, color:p.aging>90?T.danger:p.aging>60?'#D97706':T.success }}>{p.aging}d</span></td>
                        <td style={{ padding:'9px 10px', fontSize:12 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <div style={{ flex:1, height:5, background:T.border, borderRadius:3, minWidth:60 }}>
                              <div style={{ height:'100%', width:`${p.progress}%`, background:p.status==='delayed'?T.danger:T.primary, borderRadius:3 }} />
                            </div>
                            <span style={{ fontSize:11, color:T.textDim }}>{p.progress}%</span>
                          </div>
                        </td>
                        <td style={{ padding:'9px 10px' }}>
                          <span style={{ fontSize:11, fontWeight:700, color:['#2563EB','#DC2626','#16A34A','#D97706','#7C3AED','#0D9488','#6B7280'][['in_progress','delayed','completed','pending','billing_review','pm_approved','not_started'].indexOf(p.status)]||T.textMuted,
                            background:'#F9FAFB', padding:'2px 8px', borderRadius:20 }}>
                            {p.status?.replace(/_/g,' ')||'—'}
                          </span>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Financial ── */}
            {active==='financial' && (
              <div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
                  <KPI label="Total PO Value"  value={fmtCr(totalPO)}    color={T.primary} />
                  <KPI label="Total Billed"    value={fmt(totalBilled)}  color={T.info}    />
                  <KPI label="Total Paid"      value={fmt(totalPaid)}    color={T.success} />
                  <KPI label="Outstanding"     value={fmt(totalPending)} color={T.warning} />
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
            {active==='pm' && (
              <div style={card}>
                <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:14 }}>PM Performance Overview</div>
                {pmData.map((pm,i)=>(
                  <div key={i} style={{ padding:'14px 16px', background:T.bg, borderRadius:10, marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                      <div style={{ fontSize:14, fontWeight:700 }}>{pm.name}</div>
                      <div style={{ display:'flex', gap:8 }}>
                        <span style={{ fontSize:12, color:T.info, background:T.primaryLight, padding:'2px 10px', borderRadius:10, fontWeight:600 }}>{pm.total} projects</span>
                        {pm.delayed>0&&<span style={{ fontSize:12, color:T.danger, background:'#FEF2F2', padding:'2px 10px', borderRadius:10, fontWeight:600 }}>{pm.delayed} delayed</span>}
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
            {active==='vendor' && (
              <div style={card}>
                <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:14 }}>Vendor Performance Overview</div>
                <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
                  <thead><tr>{['Vendor','Total','Completed','Delayed','Completion Rate'].map(h=>(
                    <th key={h} style={thS}>{h}</th>
                  ))}</tr></thead>
                  <tbody>{vendorData.map((v,i)=>(
                    <tr key={i} style={{ background:i%2===0?'#fff':T.bg, borderBottom:`1px solid ${T.border}` }}>
                      <td style={{ padding:'10px', fontWeight:600, fontSize:13 }}>{v.fullName}</td>
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
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}

            {/* ── Aging ── */}
            {active==='aging' && (
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
                  <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:14 }}>High Aging Projects (&gt;60 days)</div>
                  <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
                    <thead><tr>{['Project','PM','Region','Vendor','Aging','Status'].map(h=>(
                      <th key={h} style={thS}>{h}</th>
                    ))}</tr></thead>
                    <tbody>{projects.filter((p:any)=>p.aging>60&&p.status!=="completed").sort((a:any,b:any)=>b.aging-a.aging).map((p:any,i:number)=>(
                      <tr key={p.id} style={{ background:i%2===0?'#fff':T.bg, borderBottom:`1px solid ${T.border}` }}>
                        <td style={{ padding:'9px 10px', color:T.primary, fontWeight:700 }}>{p.id}</td>
                        <td style={{ padding:'9px 10px', fontSize:12 }}>{p.pm}</td>
                        <td style={{ padding:'9px 10px', fontSize:12, color:T.textMuted }}>{p.region}</td>
                        <td style={{ padding:'9px 10px', fontSize:12 }}>{p.vendor||'—'}</td>
                        <td style={{ padding:'9px 10px' }}><span style={{ fontWeight:700, color:p.aging>90?T.danger:'#D97706' }}>{p.aging}d</span></td>
                        <td style={{ padding:'9px 10px' }}>
                          <span style={{ fontSize:11, fontWeight:700, color:T.textMuted, background:T.bg, padding:'2px 8px', borderRadius:20 }}>
                            {p.status?.replace(/_/g,' ')}
                          </span>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── STN/SRN ── */}
            {active==='stnsrn' && (
              <div style={card}>
                <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:8 }}>STN/SRN Material Utilisation Report</div>
                <div style={{ fontSize:12, color:T.textMuted, marginBottom:16 }}>Live data from Supabase material_items table</div>
                <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
                  <thead><tr>{['Project','Vendor','Issued','Returned','Balance','% Utilised','Status'].map(h=>(
                    <th key={h} style={thS}>{h}</th>
                  ))}</tr></thead>
                  <tbody>{stnSrnData.map((r,i)=>(
                    <tr key={r.id} style={{ background:i%2===0?'#fff':T.bg, borderBottom:`1px solid ${T.border}` }}>
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
                        <span style={{ fontSize:11, fontWeight:700,
                          color:r.balance===0?T.success:T.danger,
                          background:r.balance===0?T.successBg:'#FEF2F2',
                          padding:'2px 8px', borderRadius:10 }}>
                          {r.balance===0?'✅ Cleared':'⏳ Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}

            {/* ── PTW Compliance ── */}
            {active==='ptw' && (
              <div style={card}>
                <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:8 }}>PTW Compliance Report</div>
                <div style={{ fontSize:12, color:T.textMuted, marginBottom:16 }}>Permit to Work status from project records</div>
                <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
                  <thead><tr>{['Project','PM','PTW Ticket','Supervisor','Valid From','Valid To','Status'].map(h=>(
                    <th key={h} style={thS}>{h}</th>
                  ))}</tr></thead>
                  <tbody>{(rawProjects as any[]).filter(p=>p.ptwTicketId||p.ptwDateFrom).map((p:any,i:number)=>{
                    const expired = p.ptwDateTo && new Date(p.ptwDateTo) < new Date();
                    return (
                      <tr key={p.id} style={{ background:i%2===0?'#fff':T.bg, borderBottom:`1px solid ${T.border}` }}>
                        <td style={{ padding:'9px 10px', color:T.primary, fontWeight:700, fontSize:12 }}>{p.id}</td>
                        <td style={{ padding:'9px 10px', fontSize:12 }}>{p.pm}</td>
                        <td style={{ padding:'9px 10px', fontSize:12, fontWeight:600 }}>{p.ptwTicketId||'—'}</td>
                        <td style={{ padding:'9px 10px', fontSize:12 }}>{p.ptwSupervisor||'—'}</td>
                        <td style={{ padding:'9px 10px', fontSize:12, color:T.textMuted }}>{fmtDate(p.ptwDateFrom)}</td>
                        <td style={{ padding:'9px 10px', fontSize:12, color:T.textMuted }}>{fmtDate(p.ptwDateTo)}</td>
                        <td style={{ padding:'9px 10px' }}>
                          <span style={{ fontSize:11, fontWeight:700,
                            color:expired?T.warning:T.success,
                            background:expired?'#FFFBEB':T.successBg,
                            padding:'2px 8px', borderRadius:10 }}>
                            {expired?'⏰ Expired':'✅ Active'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
