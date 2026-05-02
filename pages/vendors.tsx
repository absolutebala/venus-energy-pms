import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { T, card, btnPrimary, th, td, inputStyle } from '@/lib/theme';

const vendors = [
  { name:'ABC Telecom Services',     projects:12, done:10, onTime:92, quality:90, safety:95, billing:98, score:93.8, rating:'Excellent',  poValue:4560000 },
  { name:'XYZ Infra Solutions',      projects:8,  done:5,  onTime:80, quality:85, safety:88, billing:90, score:85.8, rating:'Very Good',  poValue:3240000 },
  { name:'TowerTech Pvt Ltd',        projects:6,  done:4,  onTime:75, quality:82, safety:85, billing:88, score:82.5, rating:'Good',       poValue:2875000 },
  { name:'NetConnect Services',      projects:5,  done:2,  onTime:65, quality:75, safety:78, billing:80, score:74.5, rating:'Average',    poValue:2010000 },
  { name:'BuildRight Constructions', projects:4,  done:1,  onTime:50, quality:68, safety:72, billing:65, score:63.8, rating:'Poor',       poValue:1580000 },
  { name:'PowerSys India',           projects:3,  done:2,  onTime:85, quality:80, safety:90, billing:85, score:85.0, rating:'Very Good',  poValue:1350000 },
];

const ratingColor = (r: string) => ({ Excellent:'#16A34A','Very Good':'#2563EB', Good:'#D97706', Average:'#EA580C', Poor:'#DC2626' }[r] || '#64748B');

export default function VendorsPage() {
  const [search, setSearch] = useState('');
  const [focused, setFocused] = useState(false);
  const filtered = vendors.filter(v => !search || v.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout>
      <div className="fade-in">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
          {[
            { label:'Total Vendors',   value:vendors.length,                               color:T.primary, icon:'🏢' },
            { label:'Active',          value:vendors.length,                               color:T.success, icon:'✅' },
            { label:'Avg Score',       value:'80.9',                                       color:T.warning, icon:'⭐' },
            { label:'Total PO Value',  value:'₹1.56 Cr',                                  color:T.info,    icon:'💰' },
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
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} placeholder="Search vendor…" style={{ ...inputStyle(focused), width:240 }} />
            <button style={btnPrimary}>+ Add Vendor</button>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%' }}>
              <thead>
                <tr>{['Vendor Name','Projects','Done','On-Time %','Quality','Safety','Billing','Score','Rating','PO Value',''].map(h=><th key={h} style={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map((v,i)=>(
                  <tr key={i}
                    onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background=T.bg}
                    onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background='transparent'}>
                    <td style={{ ...td, color:T.text, fontWeight:600 }}>{v.name}</td>
                    <td style={td}>{v.projects}</td>
                    <td style={td}>{v.done}</td>
                    <td style={{ ...td, fontWeight:700, color:v.onTime>=85?T.success:v.onTime>=70?T.warning:T.danger }}>{v.onTime}%</td>
                    {[{val:v.quality,c:T.primary},{val:v.safety,c:T.success},{val:v.billing,c:T.warning}].map((b,j)=>(
                      <td key={j} style={td}>
                        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                          <div style={{ width:50, height:4, background:T.border, borderRadius:2 }}>
                            <div style={{ height:'100%', width:`${b.val}%`, background:b.c, borderRadius:2 }} />
                          </div>
                          <span style={{ fontSize:11 }}>{b.val}</span>
                        </div>
                      </td>
                    ))}
                    <td style={{ ...td, fontWeight:700, color:ratingColor(v.rating), fontSize:14 }}>{v.score}</td>
                    <td style={td}><span style={{ color:ratingColor(v.rating), background:`${ratingColor(v.rating)}15`, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600 }}>{v.rating}</span></td>
                    <td style={{ ...td, fontWeight:600, color:T.text, whiteSpace:'nowrap' }}>₹{(v.poValue/100000).toFixed(2)}L</td>
                    <td style={td}><button style={{ background:T.primaryLight, border:'none', borderRadius:6, padding:'5px 12px', color:T.primary, cursor:'pointer', fontSize:12, fontWeight:500 }}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
