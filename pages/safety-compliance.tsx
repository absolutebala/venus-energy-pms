import React, { useState } from 'react';
import Layout from '@/components/Layout';
import Toast from '@/components/Toast';
import { T, card, badge, th, td, btnPrimary, inputStyle } from '@/lib/theme';

const checks = [
  { id:'SC-2025-045', project:'VE-2025-001', site:'Chennai North',     supervisor:'Suresh Kumar', date:'20/05/2025', score:75, total:12, compliant:9, nonCompliant:2, expired:1, status:'Compliant',     nextReview:'27/05/2025' },
  { id:'SC-2025-044', project:'VE-2025-002', site:'Bengaluru East',    supervisor:'Ramesh Raj',   date:'18/05/2025', score:58, total:12, compliant:6, nonCompliant:5, expired:1, status:'Non-Compliant', nextReview:'25/05/2025' },
  { id:'SC-2025-043', project:'VE-2025-003', site:'Hyderabad Central', supervisor:'Vijay Kumar',  date:'15/05/2025', score:92, total:12, compliant:11,nonCompliant:1, expired:0, status:'Compliant',     nextReview:'22/05/2025' },
  { id:'SC-2025-042', project:'VE-2025-004', site:'Chennai South',     supervisor:'Arun Singh',   date:'14/05/2025', score:83, total:12, compliant:10,nonCompliant:2, expired:0, status:'Compliant',     nextReview:'21/05/2025' },
  { id:'SC-2025-041', project:'VE-2025-005', site:'Coimbatore',        supervisor:'Suresh Kumar', date:'12/05/2025', score:67, total:12, compliant:8, nonCompliant:3, expired:1, status:'Non-Compliant', nextReview:'19/05/2025' },
];

const checklist = [
  { item:'STAC Certificate',    requirement:'Valid STAC certificate for supervisor', status:'Compliant'    },
  { item:'PTW (Permit to Work)',requirement:'PTW obtained before work start',        status:'Compliant'    },
  { item:'Safety Induction',    requirement:'All workers undergone safety induction',status:'Compliant'    },
  { item:'PPE Availability',    requirement:'PPE available for all workers',         status:'Compliant'    },
  { item:'Fire Extinguisher',   requirement:'Fire extinguisher available & valid',   status:'Non-Compliant'},
  { item:'Electrical Safety',   requirement:'All electrical tools inspected',        status:'Compliant'    },
  { item:'Scaffolding Safety',  requirement:'Proper scaffolding & tagging',          status:'Non-Compliant'},
  { item:'First Aid Kit',       requirement:'First aid kit available',               status:'Compliant'    },
  { item:'Safety Signage',      requirement:'Safety boards & signage displayed',     status:'Compliant'    },
  { item:'Housekeeping',        requirement:'Work area clean & debris free',         status:'Compliant'    },
  { item:'Working at Height',   requirement:'Fall protection for height work',       status:'Expired'      },
  { item:'Gas Cutting Safety',  requirement:'Gas cylinders secured & leak free',     status:'Compliant'    },
];

const statusColor: Record<string,string> = { Compliant:T.success, 'Non-Compliant':T.danger, Expired:T.warning };

export default function SafetyCompliancePage() {
  const [search, setSearch] = useState('');
  const [focused, setFocused] = useState(false);
  const [toast, setToast] = useState<{msg:string;type:'success'|'error'|'info'}|null>(null);
  const [selected, setSelected] = useState(checks[0]);

  const filtered = checks.filter(c => !search || c.site.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout>
      <div className="fade-in">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
          {[
            { label:'Total Checks',  value:checks.length,                                  color:T.primary, icon:'🛡' },
            { label:'Compliant',     value:checks.filter(c=>c.status==='Compliant').length, color:T.success, icon:'✅' },
            { label:'Non-Compliant', value:checks.filter(c=>c.status==='Non-Compliant').length, color:T.danger, icon:'⚠️' },
            { label:'Expiring Soon', value:3,                                               color:T.warning, icon:'⏰' },
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

        <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:14 }}>
          {/* Table */}
          <div style={card}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <input value={search} onChange={e=>setSearch(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} placeholder="Search site or check ID…" style={{ ...inputStyle(focused), width:220 }} />
              <button onClick={() => setToast({msg:'Feature: Add Safety Check form coming in next update.',type:'info'})} style={btnPrimary}>+ Add Compliance Check</button>
            </div>
            <table style={{ width:'100%' }}>
              <thead><tr>{['Check ID','Site','Supervisor','Date','Score','Items','Status','Next Review'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map((c,i)=>(
                  <tr key={i} onClick={()=>setSelected(c)} style={{ cursor:'pointer', background:selected.id===c.id?T.primaryLight:'transparent', borderBottom:`1px solid ${T.border}` }}
                    onMouseEnter={e=>{ if(selected.id!==c.id)(e.currentTarget as HTMLTableRowElement).style.background=T.bg; }}
                    onMouseLeave={e=>{ if(selected.id!==c.id)(e.currentTarget as HTMLTableRowElement).style.background='transparent'; }}>
                    <td style={{ ...td, color:T.primary, fontWeight:700 }}>{c.id}</td>
                    <td style={{ ...td, color:T.text, fontWeight:500 }}>{c.site}</td>
                    <td style={td}>{c.supervisor}</td>
                    <td style={td}>{c.date}</td>
                    <td style={td}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <div style={{ width:40, height:4, background:T.border, borderRadius:2 }}><div style={{ height:'100%', width:`${c.score}%`, background:c.score>=80?T.success:c.score>=60?T.warning:T.danger, borderRadius:2 }} /></div>
                        <span style={{ fontSize:12, fontWeight:700, color:c.score>=80?T.success:c.score>=60?T.warning:T.danger }}>{c.score}%</span>
                      </div>
                    </td>
                    <td style={td}><span style={{ fontSize:11 }}>{c.compliant}✅ {c.nonCompliant}❌ {c.expired}⚠️</span></td>
                    <td style={td}><span style={badge(c.status)}>{c.status}</span></td>
                    <td style={td}>{c.nextReview}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Checklist detail */}
          <div style={card}>
            <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:4 }}>📋 {selected.id}</div>
            <div style={{ fontSize:12, color:T.textMuted, marginBottom:16 }}>{selected.site} · {selected.supervisor} · {selected.date}</div>
            <div style={{ marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:T.textMuted, marginBottom:4 }}>
                <span>Compliance Score</span><span style={{ fontWeight:700, color:selected.score>=80?T.success:selected.score>=60?T.warning:T.danger }}>{selected.score}%</span>
              </div>
              <div style={{ height:6, background:T.border, borderRadius:3 }}><div style={{ height:'100%', width:`${selected.score}%`, background:selected.score>=80?T.success:selected.score>=60?T.warning:T.danger, borderRadius:3 }} /></div>
            </div>
            <div style={{ display:'flex', gap:8, marginBottom:14 }}>
              {[{l:'Compliant',c:T.success,v:selected.compliant},{l:'Non-Compliant',c:T.danger,v:selected.nonCompliant},{l:'Expired',c:T.warning,v:selected.expired}].map((s,i)=>(
                <div key={i} style={{ flex:1, textAlign:'center', background:`${s.c}10`, border:`1px solid ${s.c}30`, borderRadius:8, padding:'8px 4px' }}>
                  <div style={{ fontSize:20, fontWeight:700, color:s.c }}>{s.v}</div>
                  <div style={{ fontSize:10, color:s.c }}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{ maxHeight:340, overflowY:'auto' }}>
              {checklist.map((item,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'8px 0', borderBottom:`1px solid ${T.border}` }}>
                  <div style={{ width:18, height:18, borderRadius:'50%', background:`${statusColor[item.status]}20`, border:`2px solid ${statusColor[item.status]}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                    <span style={{ fontSize:9, fontWeight:700, color:statusColor[item.status] }}>
                      {item.status==='Compliant'?'✓':item.status==='Expired'?'!':'✗'}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color:T.text }}>{item.item}</div>
                    <div style={{ fontSize:11, color:T.textMuted }}>{item.requirement}</div>
                  </div>
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
