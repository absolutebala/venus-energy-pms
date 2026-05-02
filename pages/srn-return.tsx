import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { T, card, badge, th, td, btnPrimary, inputStyle } from '@/lib/theme';

const returns = [
  { id:'SRN-RET-2025-045', project:'VE-2025-001', site:'Chennai North',  vendor:'ABC Telecom', returnDate:'20/05/2025', totalValue:625000, returnedValue:135750, balanceValue:489250, returnType:'Partial Return', status:'Pending',  approvedBy:'—' },
  { id:'SRN-RET-2025-044', project:'VE-2025-003', site:'Hyderabad Central',vendor:'TowerTech',  returnDate:'15/05/2025', totalValue:410000, returnedValue:95200,  balanceValue:314800, returnType:'Partial Return', status:'Approved', approvedBy:'Ramesh Kumar' },
  { id:'SRN-RET-2025-043', project:'VE-2025-002', site:'Bengaluru East',  vendor:'XYZ Infra',  returnDate:'10/05/2025', totalValue:280000, returnedValue:280000, balanceValue:0,      returnType:'Full Return',    status:'Approved', approvedBy:'Ramesh Kumar' },
  { id:'SRN-RET-2025-042', project:'VE-2025-007', site:'Mumbai Central',  vendor:'PowerSys',   returnDate:'05/05/2025', totalValue:175000, returnedValue:68450,  balanceValue:106550, returnType:'Partial Return', status:'Approved', approvedBy:'Ramesh Kumar' },
  { id:'SRN-RET-2025-041', project:'VE-2025-004', site:'Chennai South',   vendor:'NetConnect', returnDate:'01/05/2025', totalValue:320000, returnedValue:0,       balanceValue:320000, returnType:'Pending',        status:'Pending',  approvedBy:'—' },
];

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`;

export default function SRNReturnPage() {
  const [search, setSearch] = useState('');
  const [focused, setFocused] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');

  const filtered = returns.filter(r => {
    if (statusFilter !== 'All' && r.status !== statusFilter) return false;
    if (search) return r.id.toLowerCase().includes(search.toLowerCase()) || r.site.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  const totalReturned = returns.reduce((a,r)=>a+r.returnedValue, 0);
  const totalPending  = returns.filter(r=>r.status==='Pending').length;

  return (
    <Layout>
      <div className="fade-in">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
          {[
            { label:'Total Returns',    value:returns.length,  color:T.primary, icon:'↩' },
            { label:'Pending Approval', value:totalPending,    color:T.warning, icon:'⏳' },
            { label:'Approved',         value:returns.filter(r=>r.status==='Approved').length, color:T.success, icon:'✅' },
            { label:'Total Returned',   value:`₹${(totalReturned/100000).toFixed(1)}L`, color:T.info, icon:'💰' },
          ].map((s,i)=>(
            <div key={i} style={{ ...card, position:'relative', overflow:'hidden', padding:'16px 18px' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:s.color }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:11, color:T.textMuted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>{s.label}</div>
                  <div style={{ fontSize:26, fontWeight:700, color:T.text }}>{s.value}</div>
                </div>
                <div style={{ fontSize:22 }}>{s.icon}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={card}>
          <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:16, flexWrap:'wrap' }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} placeholder="Search return ID or site…" style={{ ...inputStyle(focused), width:220 }} />
            <div style={{ display:'flex', gap:5 }}>
              {['All','Pending','Approved'].map(f=>(
                <button key={f} onClick={()=>setStatusFilter(f)} style={{ padding:'6px 12px', borderRadius:6, border:'1px solid', borderColor:statusFilter===f?T.primary:T.border, background:statusFilter===f?T.primaryLight:'#fff', color:statusFilter===f?T.primary:T.textMuted, fontSize:12, cursor:'pointer', fontWeight:statusFilter===f?600:400 }}>{f}</button>
              ))}
            </div>
            <div style={{ marginLeft:'auto' }}><button style={btnPrimary}>+ Add SRN Return</button></div>
          </div>

          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%' }}>
              <thead>
                <tr>{['Return No','Project','Site','Vendor','Date','Total Value','Returned','Balance','Type','Status','Approved By'].map(h=><th key={h} style={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map((r,i)=>(
                  <tr key={i}
                    onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background=T.bg}
                    onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background='transparent'}>
                    <td style={{ ...td, color:T.primary, fontWeight:700, whiteSpace:'nowrap' }}>{r.id}</td>
                    <td style={td}>{r.project}</td>
                    <td style={{ ...td, color:T.text, fontWeight:500 }}>{r.site}</td>
                    <td style={td}>{r.vendor}</td>
                    <td style={td}>{r.returnDate}</td>
                    <td style={{ ...td, fontWeight:600, color:T.text }}>{fmt(r.totalValue)}</td>
                    <td style={{ ...td, fontWeight:600, color:T.success }}>{fmt(r.returnedValue)}</td>
                    <td style={{ ...td, fontWeight:600, color:r.balanceValue>0?T.warning:T.success }}>{fmt(r.balanceValue)}</td>
                    <td style={td}><span style={{ fontSize:11, background:T.primaryLight, color:T.primary, padding:'2px 8px', borderRadius:5, whiteSpace:'nowrap' }}>{r.returnType}</span></td>
                    <td style={td}><span style={badge(r.status)}>{r.status}</span></td>
                    <td style={td}>{r.approvedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding:'10px 0', borderTop:`1px solid ${T.border}`, fontSize:11, color:T.textDim, marginTop:4 }}>Showing {filtered.length} of {returns.length} returns</div>
        </div>
      </div>
    </Layout>
  );
}
