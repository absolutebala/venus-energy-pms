import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { T, card, badge, th, td, btnPrimary, inputStyle } from '@/lib/theme';

const invoices = [
  { id:'INV-2025-012', project:'VE-2025-001', vendor:'ABC Telecom Services',  date:'20/05/2025', amount:925000,  gst:166500, total:1091500, status:'Approved',     payment:'Paid',    due:'19/06/2025' },
  { id:'INV-2025-011', project:'VE-2025-004', vendor:'NetConnect Services',   date:'15/05/2025', amount:615000,  gst:110700, total:725700,  status:'Submitted',    payment:'Pending', due:'14/06/2025' },
  { id:'INV-2025-010', project:'VE-2025-007', vendor:'PowerSys India',        date:'10/05/2025', amount:445000,  gst:80100,  total:525100,  status:'Under Review', payment:'Pending', due:'09/06/2025' },
  { id:'INV-2025-009', project:'VE-2025-002', vendor:'XYZ Infra Solutions',   date:'05/05/2025', amount:210000,  gst:37800,  total:247800,  status:'Rejected',     payment:'Pending', due:'04/06/2025' },
  { id:'INV-2025-008', project:'VE-2025-003', vendor:'TowerTech Pvt Ltd',     date:'28/04/2025', amount:380000,  gst:68400,  total:448400,  status:'Approved',     payment:'Paid',    due:'27/05/2025' },
  { id:'INV-2025-007', project:'VE-2025-005', vendor:'ABC Telecom Services',  date:'20/04/2025', amount:750000,  gst:135000, total:885000,  status:'Draft',        payment:'Pending', due:'20/06/2025' },
];

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`;
const invStatuses = ['All','Draft','Submitted','Under Review','Approved','Rejected'];

export default function BillingPage() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [focused, setFocused] = useState(false);

  const filtered = invoices.filter(inv => {
    if (filter !== 'All' && inv.status !== filter) return false;
    if (search) return inv.id.toLowerCase().includes(search.toLowerCase()) || inv.vendor.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  const summaryCards = [
    { label:'Total PO Value',   value:'₹14.70 Cr', color:T.primary, icon:'📋' },
    { label:'Total Billed',     value:'₹9.25 Cr',  color:T.success, icon:'📄' },
    { label:'Pending Billing',  value:'₹1.03 Cr',  color:T.warning, icon:'⏳' },
    { label:'Overdue Amount',   value:'₹45.2 L',   color:T.danger,  icon:'⚠️' },
  ];

  const invStatusCards = [
    { label:'Draft',        count:1, color:T.textDim  },
    { label:'Submitted',    count:2, color:T.info      },
    { label:'Under Review', count:1, color:T.purple    },
    { label:'Approved',     count:2, color:T.success   },
    { label:'Rejected',     count:1, color:T.danger    },
  ];

  return (
    <Layout>
      <div className="fade-in">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:16 }}>
          {summaryCards.map((s,i)=>(
            <div key={i} style={{ ...card, position:'relative', overflow:'hidden', padding:'16px 18px' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:s.color }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontSize:11, color:T.textMuted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:5 }}>{s.label}</div>
                  <div style={{ fontSize:20, fontWeight:700, color:T.text }}>{s.value}</div>
                </div>
                <div style={{ width:36, height:36, background:`${s.color}15`, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>{s.icon}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:16 }}>
          {invStatusCards.map((s,i)=>(
            <div key={i} style={{ ...card, padding:14, textAlign:'center', borderTop:`3px solid ${s.color}` }}>
              <div style={{ fontSize:28, fontWeight:700, color:s.color }}>{s.count}</div>
              <div style={{ fontSize:11, color:T.textMuted, marginTop:4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={card}>
          <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:16, flexWrap:'wrap' }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} placeholder="Search invoice or vendor…" style={{ ...inputStyle(focused), width:220 }} />
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              {invStatuses.map(f=>(
                <button key={f} onClick={()=>setFilter(f)} style={{ padding:'6px 12px', borderRadius:6, border:'1px solid', borderColor:filter===f?T.primary:T.border, background:filter===f?T.primaryLight:'#fff', color:filter===f?T.primary:T.textMuted, fontSize:12, cursor:'pointer', fontWeight:filter===f?600:400 }}>{f}</button>
              ))}
            </div>
            <div style={{ marginLeft:'auto' }}><button style={btnPrimary}>+ Create Invoice</button></div>
          </div>

          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%' }}>
              <thead>
                <tr>{['Invoice No','Project','Vendor','Date','Amount','GST','Total','Status','Payment','Due Date','Actions'].map(h=><th key={h} style={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map((inv,i)=>(
                  <tr key={i}
                    onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background=T.bg}
                    onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background='transparent'}>
                    <td style={{ ...td, color:T.primary, fontWeight:700 }}>{inv.id}</td>
                    <td style={td}>{inv.project}</td>
                    <td style={{ ...td, fontSize:12 }}>{inv.vendor}</td>
                    <td style={td}>{inv.date}</td>
                    <td style={{ ...td, color:T.text, fontWeight:600 }}>{fmt(inv.amount)}</td>
                    <td style={td}>{fmt(inv.gst)}</td>
                    <td style={{ ...td, color:T.text, fontWeight:700 }}>{fmt(inv.total)}</td>
                    <td style={td}><span style={badge(inv.status)}>{inv.status}</span></td>
                    <td style={td}><span style={badge(inv.payment)}>{inv.payment}</span></td>
                    <td style={{ ...td, whiteSpace:'nowrap' }}>{inv.due}</td>
                    <td style={td}>
                      <div style={{ display:'flex', gap:4 }}>
                        {['👁','⬇','✏️'].map((ic,j)=>(
                          <button key={j} style={{ background:T.primaryLight, border:'none', borderRadius:5, padding:'4px 7px', color:T.primary, cursor:'pointer', fontSize:11 }}>{ic}</button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding:'12px 0', borderTop:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:4 }}>
            <div style={{ fontSize:11, color:T.textDim }}>Showing {filtered.length} of {invoices.length} invoices</div>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ fontSize:12, color:T.textMuted }}>Total Paid: <strong style={{ color:T.success }}>₹8.22 Cr</strong></span>
              <span style={{ fontSize:12, color:T.textMuted }}>Pending: <strong style={{ color:T.warning }}>₹1.03 Cr</strong></span>
              <button style={{ ...btnPrimary, background:T.success }}>💳 Make Payment</button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
