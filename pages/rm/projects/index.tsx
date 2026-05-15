import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { PROJECTS } from '@/lib/seedData';
import { useAuth } from '@/context/AuthContext';
import { T, card, btnPrimary, inputStyle, badge } from '@/lib/theme';

const ALL_PROJECTS = [
  { id:'VE-2025-001', projectName:'Chennai Metro Phase II',  site:'Chennai North', type:'Tower Erection',    pm:'Arun Kumar',  poValue:1850000, aging:12, status:'in_progress', progress:65,  region:'Tamil Nadu', rm:'Ramesh Kumar' },
  { id:'VE-2025-004', projectName:'Chennai Fiber Network',   site:'Chennai South', type:'Fiber Installation',pm:'Vijay Kumar', poValue:1230000, aging:12, status:'in_progress', progress:45,  region:'Tamil Nadu', rm:'Ramesh Kumar' },
  { id:'VE-2025-005', projectName:'Coimbatore Tower Erect',  site:'Coimbatore',   type:'Tower Erection',    pm:'Arun Kumar',  poValue:2200000, aging:8,  status:'pending',      progress:10,  region:'Tamil Nadu', rm:'Ramesh Kumar' },
  { id:'VE-2025-002', projectName:'Bengaluru East Maint.',   site:'Bengaluru East',type:'Tower Maintenance', pm:'Priya Sharma',poValue:420000,  aging:78, status:'delayed',      progress:30,  region:'Karnataka',  rm:'Amit Sharma'  },
  { id:'VE-2025-006', projectName:'Pune Civil Works',        site:'Pune West',     type:'Civil Works',       pm:'Pooja Mehta', poValue:540000,  aging:95, status:'delayed',      progress:20,  region:'Maharashtra',rm:'Amit Sharma'  },
];

const fmt = (v:number) => `₹${(v/100000).toFixed(2)}L`;
const STATUS_DISPLAY: Record<string,string> = { in_progress:'In Progress', pending:'Pending', delayed:'Delayed', completed:'Completed', pm_approved:'PM Approved' };

export default function RMProjectsPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [focused, setFocused] = useState(false);

  // Filter to RM's projects
  const myProjects = ALL_PROJECTS.filter(p =>
    p.rm === (profile?.full_name || 'Ramesh Kumar') &&
    (statusFilter === 'All' || STATUS_DISPLAY[p.status] === statusFilter) &&
    (!search || p.projectName.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase()) || (p as any).poNo?.toLowerCase().includes(search.toLowerCase()) || (p as any).indusId?.toLowerCase().includes(search.toLowerCase()))
  );

  const counts = {
    total: myProjects.length,
    inProgress: myProjects.filter(p=>p.status==='in_progress').length,
    delayed: myProjects.filter(p=>p.status==='delayed').length,
    pending: myProjects.filter(p=>p.status==='pending').length,
  };

  return (
    <Layout>
      <div className="fade-in">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
          {[
            { label:'My Projects',  value:counts.total,      color:T.primary, icon:'📁' },
            { label:'In Progress',  value:counts.inProgress, color:T.info,    icon:'⚡' },
            { label:'Delayed',      value:counts.delayed,    color:T.danger,  icon:'⚠️' },
            { label:'Pending',      value:counts.pending,    color:T.warning, icon:'⏳' },
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

        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:16, flexWrap:'wrap' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
            placeholder="Search project, PO number, Indus ID…" style={{ ...inputStyle(focused), width:240 }} />
          {['All','In Progress','Delayed','Pending','Completed'].map(f=>(
            <button key={f} onClick={()=>setStatusFilter(f)}
              style={{ padding:'6px 12px', borderRadius:6, border:'1px solid', borderColor:statusFilter===f?T.primary:T.border, background:statusFilter===f?T.primaryLight:'#fff', color:statusFilter===f?T.primary:T.textMuted, fontSize:12, cursor:'pointer', fontWeight:statusFilter===f?600:400 }}>{f}</button>
          ))}
        </div>

        <div style={card}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%' }}>
              <thead>
                <tr>{['Project ID','PO Number','Indus ID','Project Name','Site','Type','Project Manager','PO Value','Aging','Progress','Status','Actions'].map(h=>(
                  <th key={h} style={{ padding:'10px 12px', fontSize:11, fontWeight:700, textTransform:'uppercase', color:T.textMuted, textAlign:'left', borderBottom:`2px solid ${T.border}`, whiteSpace:'nowrap' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {myProjects.length===0 ? (
                  <tr><td colSpan={10} style={{ padding:40, textAlign:'center', color:T.textDim }}>No projects found.</td></tr>
                ) : myProjects.map((p,i)=>(
                  <tr key={i} onClick={()=>router.push(`/rm/projects/${p.id}`)} style={{ cursor:'pointer' }}
                    onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background=T.primaryLight}
                    onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background='transparent'}>
                    <td style={{ padding:'10px 12px', color:T.primary, fontWeight:700 }}>{p.id}</td>
                    <td style={{ padding:'10px 12px', fontSize:12, color:T.text, fontWeight:600 }}>{(p as any).poNo||'—'}</td>
                    <td style={{ padding:'10px 12px', fontSize:11, color:T.textMuted }}>{(p as any).indusId||'—'}</td>
                    <td style={{ padding:'10px 12px', fontWeight:500, color:T.text }}>{p.projectName}</td>
                    <td style={{ padding:'10px 12px', fontSize:12, color:T.textMuted }}>{p.site}</td>
                    <td style={{ padding:'10px 12px' }}><span style={{ fontSize:11, background:T.primaryLight, color:T.primary, padding:'2px 8px', borderRadius:5, fontWeight:500 }}>{p.type}</span></td>
                    <td style={{ padding:'10px 12px', fontWeight:500 }}>{p.pm}</td>
                    <td style={{ padding:'10px 12px', fontWeight:600, whiteSpace:'nowrap' }}>{fmt(p.poValue)}</td>
                    <td style={{ padding:'10px 12px' }}><span style={{ color:p.aging>60?T.danger:p.aging>30?T.warning:T.success, fontWeight:700 }}>{p.aging}d</span></td>
                    <td style={{ padding:'10px 12px', minWidth:120 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <div style={{ flex:1, height:5, background:T.border, borderRadius:3 }}>
                          <div style={{ height:'100%', width:`${p.progress}%`, background:p.status==='delayed'?T.danger:T.primary, borderRadius:3 }} />
                        </div>
                        <span style={{ fontSize:11, color:T.textDim }}>{p.progress}%</span>
                      </div>
                    </td>
                    <td style={{ padding:'10px 12px' }}><span style={badge(STATUS_DISPLAY[p.status]||p.status)}>{STATUS_DISPLAY[p.status]||p.status}</span></td>
                    <td style={{ padding:'10px 12px' }} onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>router.push(`/rm/projects/${p.id}`)} style={{ ...btnPrimary, padding:'5px 14px', fontSize:12 }}>View →</button>
                    </td>
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
