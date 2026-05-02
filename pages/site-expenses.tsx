import React, { useState } from 'react';
import Layout from '@/components/Layout';
import Toast from '@/components/Toast';
import { T, card, badge, th, td, btnPrimary, inputStyle } from '@/lib/theme';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const expenses = [
  { id:'EXP-2025-0001', date:'20/05/2025', category:'Material Purchase', description:'Cement 53 Grade - 100 Bags', vendor:'ABC Constructions', amount:55000,  paidBy:'Project', status:'Approved' },
  { id:'EXP-2025-0002', date:'19/05/2025', category:'Labour',            description:'Mason Labour Payment',       vendor:'XYZ Engineers',   amount:85000,  paidBy:'Project', status:'Approved' },
  { id:'EXP-2025-0003', date:'18/05/2025', category:'Equipment',         description:'Concrete Vibrator Rental',   vendor:'Build Well',       amount:18500,  paidBy:'Project', status:'Pending'  },
  { id:'EXP-2025-0004', date:'17/05/2025', category:'Transport',         description:'Truck Transportation',       vendor:'Shree Transport',  amount:14800,  paidBy:'Contractor', status:'Approved' },
  { id:'EXP-2025-0005', date:'16/05/2025', category:'Material Purchase', description:'Steel Bar 16mm - 1 Ton',     vendor:'ABC Constructions',amount:72600,  paidBy:'Project', status:'Approved' },
  { id:'EXP-2025-0006', date:'15/05/2025', category:'Labour',            description:'Helper Labour Payment',      vendor:'XYZ Engineers',   amount:42500,  paidBy:'Project', status:'Pending'  },
  { id:'EXP-2025-0007', date:'14/05/2025', category:'Others',            description:'Site Office Stationery',     vendor:'Office Needs',     amount:3250,   paidBy:'Project', status:'Rejected' },
  { id:'EXP-2025-0008', date:'13/05/2025', category:'Equipment',         description:'Generator Diesel',           vendor:'Build Well',       amount:21400,  paidBy:'Project', status:'Approved' },
];

const categoryColors: Record<string,string> = { 'Material Purchase':'#0D9488', Labour:'#2563EB', Equipment:'#D97706', Transport:'#7C3AED', Others:'#DC2626' };

const pieData = [
  { name:'Material', value:42.25, color:'#0D9488' },
  { name:'Labour',   value:28.15, color:'#2563EB'  },
  { name:'Equipment',value:14.35, color:'#D97706' },
  { name:'Transport',value:8.65,  color:'#7C3AED'  },
  { name:'Others',   value:6.60,  color:'#DC2626'   },
];

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`;

export default function SiteExpensesPage() {
  const [search, setSearch] = useState('');
  const [focused, setFocused] = useState(false);
  const [toast, setToast] = useState<{msg:string;type:'success'|'error'|'info'}|null>(null);
  const [catFilter, setCatFilter] = useState('All');

  const categories = ['All','Material Purchase','Labour','Equipment','Transport','Others'];
  const filtered = expenses.filter(e => {
    if (catFilter !== 'All' && e.category !== catFilter) return false;
    if (search) return e.description.toLowerCase().includes(search.toLowerCase()) || e.id.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  const total    = expenses.reduce((a,e)=>a+e.amount,0);
  const approved = expenses.filter(e=>e.status==='Approved').reduce((a,e)=>a+e.amount,0);
  const pending  = expenses.filter(e=>e.status==='Pending').reduce((a,e)=>a+e.amount,0);

  return (
    <Layout>
      <div className="fade-in">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
          {[
            { label:'Total Expenses', value:fmt(total),    color:T.primary, icon:'💰' },
            { label:'Approved',       value:fmt(approved), color:T.success, icon:'✅' },
            { label:'Pending',        value:fmt(pending),  color:T.warning, icon:'⏳' },
            { label:'This Month',     value:'₹7.85 L',     color:T.info,    icon:'📅' },
          ].map((s,i)=>(
            <div key={i} style={{ ...card, position:'relative', overflow:'hidden', padding:'16px 18px' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:s.color }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:11, color:T.textMuted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>{s.label}</div>
                  <div style={{ fontSize:20, fontWeight:700, color:T.text }}>{s.value}</div>
                </div>
                <div style={{ fontSize:22 }}>{s.icon}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 260px', gap:14, marginBottom:16 }}>
          <div style={card}>
            <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:16, flexWrap:'wrap' }}>
              <input value={search} onChange={e=>setSearch(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} placeholder="Search expense…" style={{ ...inputStyle(focused), width:200 }} />
              <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                {categories.map(f=>(
                  <button key={f} onClick={()=>setCatFilter(f)} style={{ padding:'5px 10px', borderRadius:6, border:'1px solid', borderColor:catFilter===f?T.primary:T.border, background:catFilter===f?T.primaryLight:'#fff', color:catFilter===f?T.primary:T.textMuted, fontSize:11, cursor:'pointer', fontWeight:catFilter===f?600:400, whiteSpace:'nowrap' }}>{f}</button>
                ))}
              </div>
              <div style={{ marginLeft:'auto' }}><button onClick={() => setToast({msg:'Feature: Add Expense form coming in next update.',type:'info'})} style={btnPrimary}>+ Add Expense</button></div>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%' }}>
                <thead><tr>{['Expense No','Date','Category','Description','Vendor','Amount','Paid By','Status'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {filtered.map((e,i)=>(
                    <tr key={i}
                      onMouseEnter={r=>(r.currentTarget as HTMLTableRowElement).style.background=T.bg}
                      onMouseLeave={r=>(r.currentTarget as HTMLTableRowElement).style.background='transparent'}>
                      <td style={{ ...td, color:T.primary, fontWeight:600 }}>{e.id}</td>
                      <td style={td}>{e.date}</td>
                      <td style={td}><span style={{ fontSize:11, background:`${categoryColors[e.category]}15`, color:categoryColors[e.category], padding:'2px 8px', borderRadius:5, fontWeight:600, whiteSpace:'nowrap' }}>{e.category}</span></td>
                      <td style={{ ...td, color:T.text, maxWidth:180 }}>{e.description}</td>
                      <td style={td}>{e.vendor}</td>
                      <td style={{ ...td, fontWeight:700, color:T.text }}>{fmt(e.amount)}</td>
                      <td style={td}>{e.paidBy}</td>
                      <td style={td}><span style={badge(e.status)}>{e.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding:'10px 0', borderTop:`1px solid ${T.border}`, fontSize:11, color:T.textDim, marginTop:4 }}>Showing {filtered.length} of {expenses.length} entries</div>
          </div>

          <div style={card}>
            <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:14 }}>Expense by Category</div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={68} dataKey="value" paddingAngle={3}>
                  {pieData.map((d,i)=><Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v:any)=>`${v}%`} contentStyle={{ fontSize:12, borderRadius:8 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ marginTop:8 }}>
              {pieData.map((d,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:d.color, flexShrink:0 }} />
                  <span style={{ fontSize:12, color:T.textMuted, flex:1 }}>{d.name}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:T.text }}>{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
        {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </Layout>
  );
}
