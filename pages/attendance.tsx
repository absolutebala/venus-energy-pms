import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { T, card, badge, th, td, btnPrimary, inputStyle } from '@/lib/theme';

const attendance = [
  { id:'EMP-1001', name:'Suresh Kumar',  designation:'Site Engineer', vendor:'ABC Telecom',   checkIn:'08:02 AM', checkOut:'06:01 PM', hours:'09:59', status:'Present' },
  { id:'EMP-1002', name:'Ramesh Raj',    designation:'Supervisor',    vendor:'ABC Telecom',   checkIn:'08:15 AM', checkOut:'06:00 PM', hours:'09:45', status:'Late'    },
  { id:'EMP-1003', name:'Manikandan',    designation:'Steel Fixer',   vendor:'Build Well',    checkIn:'08:00 AM', checkOut:'05:58 PM', hours:'09:58', status:'Present' },
  { id:'EMP-1004', name:'Prakash',       designation:'Mason',         vendor:'Build Well',    checkIn:'—',        checkOut:'—',        hours:'—',     status:'Absent'  },
  { id:'EMP-1005', name:'Ajith Kumar',   designation:'Helper',        vendor:'XYZ Engineers', checkIn:'08:05 AM', checkOut:'06:03 PM', hours:'09:58', status:'Present' },
  { id:'EMP-1006', name:'Karthik',       designation:'Welder',        vendor:'XYZ Engineers', checkIn:'08:30 AM', checkOut:'06:00 PM', hours:'09:30', status:'Late'    },
  { id:'EMP-1007', name:'Sathish',       designation:'Electrician',   vendor:'Tech Build',    checkIn:'08:00 AM', checkOut:'06:02 PM', hours:'10:02', status:'Present' },
  { id:'EMP-1008', name:'Vignesh',       designation:'Carpenter',     vendor:'Tech Build',    checkIn:'—',        checkOut:'—',        hours:'—',     status:'On Leave'},
  { id:'EMP-1009', name:'Mohanraj',      designation:'Plumber',       vendor:'ABC Telecom',   checkIn:'08:10 AM', checkOut:'06:00 PM', hours:'09:50', status:'Present' },
  { id:'EMP-1010', name:'Gopal',         designation:'Helper',        vendor:'Build Well',    checkIn:'08:00 AM', checkOut:'05:45 PM', hours:'09:45', status:'Present' },
];

const statusColor: Record<string,string> = { Present:T.success, Late:T.warning, Absent:T.danger, 'On Leave':T.info };

export default function AttendancePage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [focused, setFocused] = useState(false);

  const filtered = attendance.filter(e => {
    if (statusFilter !== 'All' && e.status !== statusFilter) return false;
    if (search) return e.name.toLowerCase().includes(search.toLowerCase()) || e.id.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  const present   = attendance.filter(e=>e.status==='Present').length;
  const absent    = attendance.filter(e=>e.status==='Absent').length;
  const late      = attendance.filter(e=>e.status==='Late').length;
  const onLeave   = attendance.filter(e=>e.status==='On Leave').length;

  return (
    <Layout>
      <div className="fade-in">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14, marginBottom:20 }}>
          {[
            { label:'Total Workforce', value:attendance.length, color:T.primary, icon:'👥' },
            { label:'Present',         value:present,           color:T.success, icon:'✅' },
            { label:'Absent',          value:absent,            color:T.danger,  icon:'❌' },
            { label:'Late',            value:late,              color:T.warning, icon:'⏰' },
            { label:'On Leave',        value:onLeave,           color:T.info,    icon:'🏖' },
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
            <input value={search} onChange={e=>setSearch(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} placeholder="Search employee…" style={{ ...inputStyle(focused), width:220 }} />
            <div style={{ display:'flex', gap:5 }}>
              {['All','Present','Absent','Late','On Leave'].map(f=>(
                <button key={f} onClick={()=>setStatusFilter(f)} style={{ padding:'6px 12px', borderRadius:6, border:'1px solid', borderColor:statusFilter===f?T.primary:T.border, background:statusFilter===f?T.primaryLight:'#fff', color:statusFilter===f?T.primary:T.textMuted, fontSize:12, cursor:'pointer', fontWeight:statusFilter===f?600:400 }}>{f}</button>
              ))}
            </div>
            <div style={{ marginLeft:'auto' }}><button style={btnPrimary}>+ Mark Attendance</button></div>
          </div>

          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%' }}>
              <thead>
                <tr>{['Emp ID','Name','Designation','Contractor','Check In','Check Out','Hours','Status'].map(h=><th key={h} style={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map((e,i)=>(
                  <tr key={i}
                    onMouseEnter={r=>(r.currentTarget as HTMLTableRowElement).style.background=T.bg}
                    onMouseLeave={r=>(r.currentTarget as HTMLTableRowElement).style.background='transparent'}>
                    <td style={{ ...td, color:T.primary, fontWeight:600 }}>{e.id}</td>
                    <td style={{ ...td, color:T.text, fontWeight:500 }}>{e.name}</td>
                    <td style={td}>{e.designation}</td>
                    <td style={td}>{e.vendor}</td>
                    <td style={{ ...td, color:e.status==='Late'?T.warning:T.text, fontWeight:500 }}>{e.checkIn}</td>
                    <td style={td}>{e.checkOut}</td>
                    <td style={{ ...td, fontWeight:600 }}>{e.hours}</td>
                    <td style={td}><span style={{ ...badge(e.status), background:`${statusColor[e.status]}15`, color:statusColor[e.status], border:`1px solid ${statusColor[e.status]}40` }}>{e.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding:'10px 0', borderTop:`1px solid ${T.border}`, fontSize:11, color:T.textDim, marginTop:4 }}>Showing {filtered.length} of {attendance.length} employees · Attendance rate: <strong style={{ color:T.success }}>{Math.round((present/attendance.length)*100)}%</strong></div>
        </div>
      </div>
    </Layout>
  );
}
