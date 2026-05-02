import React, { useState } from 'react';
import Layout from '@/components/Layout';
import Toast from '@/components/Toast';
import { T, card, th, td, btnPrimary, inputStyle } from '@/lib/theme';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const poVsBilled = [
  { name:'Jan', po:8.2, billed:5.1, paid:4.8 },
  { name:'Feb', po:9.5, billed:6.3, paid:5.9 },
  { name:'Mar', po:11.2,billed:7.8, paid:7.2 },
  { name:'Apr', po:12.0,billed:8.5, paid:8.0 },
  { name:'May', po:14.7,billed:9.2, paid:8.2 },
];

const workStatus = [
  { name:'Completed',  value:20, color:'#16A34A' },
  { name:'In Progress',value:24, color:'#2563EB' },
  { name:'Delayed',    value:7,  color:'#DC2626'  },
  { name:'Not Started',value:5,  color:'#D97706' },
];

const recentReports = [
  { name:'PO vs Billed vs Paid Report', type:'Financial',  project:'All Projects',     date:'20/05/2025 10:30 AM', by:'John Doe',  format:'PDF'   },
  { name:'Site Expense Summary',        type:'Expense',    project:'VE-2025-001',      date:'20/05/2025 10:28 AM', by:'John Doe',  format:'Excel' },
  { name:'Work Status Report',          type:'Progress',   project:'All Projects',     date:'20/05/2025 09:45 AM', by:'Jane Smith',format:'PDF'   },
  { name:'Attendance Report',           type:'Attendance', project:'All Sites',        date:'20/05/2025 09:40 AM', by:'Jane Smith',format:'Excel' },
  { name:'Vendor Performance Report',   type:'Vendor',     project:'All Projects',     date:'19/05/2025 06:15 PM', by:'John Doe',  format:'PDF'   },
];

const kpis = [
  { label:'Total PO Value',  value:'₹14.70 Cr', color:T.primary, icon:'📋' },
  { label:'Total Billed',    value:'₹9.25 Cr',  color:T.success, icon:'💳' },
  { label:'Total Paid',      value:'₹8.22 Cr',  color:T.info,    icon:'✅' },
  { label:'Total Expenses',  value:'₹1.24 Cr',  color:T.warning, icon:'💰' },
  { label:'Workforce',       value:'128',         color:T.purple,  icon:'👥' },
  { label:'Attendance',      value:'89.42%',      color:T.success, icon:'📅' },
];

export default function ReportsPage() {
  const [reportType, setReportType] = useState('All');
  const [focused, setFocused] = useState(false);
  const [toast, setToast] = useState<{msg:string;type:'success'|'error'|'info'}|null>(null);
  const [search, setSearch] = useState('');

  const reportTypes = ['All','Financial','Expense','Progress','Attendance','Vendor'];
  const filtered = recentReports.filter(r => {
    if (reportType !== 'All' && r.type !== reportType) return false;
    if (search) return r.name.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  return (
    <Layout>
      <div className="fade-in">
        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:12, marginBottom:20 }}>
          {kpis.map((k,i)=>(
            <div key={i} style={{ ...card, position:'relative', overflow:'hidden', padding:'14px 16px' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:k.color }} />
              <div style={{ fontSize:10, color:T.textMuted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:5 }}>{k.label}</div>
              <div style={{ fontSize:18, fontWeight:700, color:T.text }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr 1fr', gap:14, marginBottom:20 }}>
          <div style={card}>
            <div style={{ fontSize:13, fontWeight:600, color:T.text, marginBottom:14 }}>PO vs Billed vs Paid (Cr)</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={poVsBilled} barSize={14}>
                <XAxis dataKey="name" tick={{ fontSize:11, fill:T.textMuted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:11, fill:T.textMuted }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize:12, borderRadius:8, border:`1px solid ${T.border}` }} />
                <Bar dataKey="po"     fill={T.primary} radius={[3,3,0,0]} name="PO Value" />
                <Bar dataKey="billed" fill={T.success} radius={[3,3,0,0]} name="Billed" />
                <Bar dataKey="paid"   fill={T.warning} radius={[3,3,0,0]} name="Paid" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={card}>
            <div style={{ fontSize:13, fontWeight:600, color:T.text, marginBottom:14 }}>Work Status Summary</div>
            <ResponsiveContainer width="100%" height={130}>
              <PieChart>
                <Pie data={workStatus} cx="50%" cy="50%" innerRadius={35} outerRadius={58} dataKey="value" paddingAngle={3}>
                  {workStatus.map((d,i)=><Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize:12, borderRadius:8 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ marginTop:8 }}>
              {workStatus.map((d,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:d.color }} />
                  <span style={{ fontSize:11, color:T.textMuted, flex:1 }}>{d.name}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:T.text }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize:13, fontWeight:600, color:T.text, marginBottom:14 }}>📊 Report Shortcuts</div>
            {['Financial Summary','Site Expense Report','Work Status Report','Attendance Report','Vendor Performance','Custom Report'].map((r,i,arr)=>(
              <button key={i} style={{ width:'100%', display:'flex', justifyContent:'space-between', padding:'9px 0', background:'none', border:'none', color:T.primary, cursor:'pointer', fontSize:12, fontWeight:500, borderBottom:i<arr.length-1?`1px solid ${T.border}`:'none', textAlign:'left' as const }}>
                <span>{r}</span><span>→</span>
              </button>
            ))}
          </div>
        </div>

        {/* Reports table */}
        <div style={card}>
          <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:16, flexWrap:'wrap' }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} placeholder="Search reports…" style={{ ...inputStyle(focused), width:200 }} />
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              {reportTypes.map(f=>(
                <button key={f} onClick={()=>setReportType(f)} style={{ padding:'6px 12px', borderRadius:6, border:'1px solid', borderColor:reportType===f?T.primary:T.border, background:reportType===f?T.primaryLight:'#fff', color:reportType===f?T.primary:T.textMuted, fontSize:12, cursor:'pointer', fontWeight:reportType===f?600:400 }}>{f}</button>
              ))}
            </div>
            <div style={{ marginLeft:'auto' }}><button style={btnPrimary}>⚙ Schedule Report</button></div>
          </div>

          <table style={{ width:'100%' }}>
            <thead><tr>{['Report Name','Type','Project / Site','Generated On','Generated By','Format','Actions'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map((r,i)=>(
                <tr key={i}
                  onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background=T.bg}
                  onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background='transparent'}>
                  <td style={{ ...td, color:T.text, fontWeight:500 }}>{r.name}</td>
                  <td style={td}><span style={{ fontSize:11, background:T.primaryLight, color:T.primary, padding:'2px 8px', borderRadius:5, fontWeight:600 }}>{r.type}</span></td>
                  <td style={td}>{r.project}</td>
                  <td style={{ ...td, whiteSpace:'nowrap' }}>{r.date}</td>
                  <td style={td}>{r.by}</td>
                  <td style={td}><span style={{ fontSize:11, background:r.format==='PDF'?T.dangerBg:T.successBg, color:r.format==='PDF'?T.danger:T.success, padding:'2px 8px', borderRadius:5, fontWeight:600 }}>{r.format}</span></td>
                  <td style={td}>
                    <div style={{ display:'flex', gap:4 }}>
                      {['👁','⬇','✉️'].map((ic,j)=>(
                        <button key={j} style={{ background:T.primaryLight, border:'none', borderRadius:5, padding:'4px 8px', color:T.primary, cursor:'pointer', fontSize:11 }}>{ic}</button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding:'10px 0', borderTop:`1px solid ${T.border}`, fontSize:11, color:T.textDim, marginTop:4 }}>Showing {filtered.length} of {recentReports.length} reports</div>
        </div>
      </div>
        {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </Layout>
  );
}
