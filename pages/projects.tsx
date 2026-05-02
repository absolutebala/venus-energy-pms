import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { T, card, badge, th, td, btnPrimary, inputStyle } from '@/lib/theme';

const fmt = (v: number) => `₹${(v / 100000).toFixed(2)}L`;

const projects = [
  { id:'VE-2025-001', site:'Chennai North',     client:'Airtel', type:'Tower Erection',       vendor:'ABC Telecom Svcs',         poValue:1850000, aging:12, status:'In Progress', progress:65,  region:'TN' },
  { id:'VE-2025-002', site:'Bengaluru East',    client:'Jio',    type:'Tower Maintenance',     vendor:'XYZ Infra Solutions',      poValue:420000,  aging:78, status:'Delayed',     progress:30,  region:'KA' },
  { id:'VE-2025-003', site:'Hyderabad Central', client:'Vi',     type:'Component Replacement', vendor:'TowerTech Pvt Ltd',        poValue:760000,  aging:22, status:'Completed',   progress:100, region:'TS' },
  { id:'VE-2025-004', site:'Chennai South',     client:'BSNL',   type:'Fiber Installation',    vendor:'NetConnect Services',      poValue:1230000, aging:12, status:'In Progress', progress:45,  region:'TN' },
  { id:'VE-2025-005', site:'Coimbatore',        client:'Airtel', type:'Tower Erection',        vendor:'ABC Telecom Svcs',         poValue:2200000, aging:8,  status:'Pending',     progress:10,  region:'TN' },
  { id:'VE-2025-006', site:'Pune West',         client:'Jio',    type:'Civil Works',           vendor:'BuildRight Constructions', poValue:540000,  aging:95, status:'Delayed',     progress:20,  region:'MH' },
  { id:'VE-2025-007', site:'Mumbai Central',    client:'Vi',     type:'Power Works',           vendor:'PowerSys India',           poValue:890000,  aging:33, status:'In Progress', progress:75,  region:'MH' },
  { id:'VE-2025-008', site:'Delhi NCR',         client:'Airtel', type:'Tower Maintenance',     vendor:'XYZ Infra Solutions',      poValue:380000,  aging:18, status:'In Progress', progress:55,  region:'DL' },
  { id:'VE-2025-009', site:'Kochi',             client:'BSNL',   type:'Component Replacement', vendor:'TowerTech Pvt Ltd',        poValue:650000,  aging:62, status:'Delayed',     progress:40,  region:'KL' },
  { id:'VE-2025-010', site:'Kolkata North',     client:'Jio',    type:'Fiber Installation',    vendor:'NetConnect Services',      poValue:975000,  aging:5,  status:'Pending',     progress:0,   region:'WB' },
];

const STATUSES = ['All','In Progress','Delayed','Completed','Pending'];
const TYPES    = ['All','Tower Erection','Tower Maintenance','Component Replacement','Fiber Installation','Civil Works','Power Works'];

// Map URL status param → display status
const STATUS_MAP: Record<string,string> = {
  in_progress:'In Progress', delayed:'Delayed', completed:'Completed', pending:'Pending',
  'In Progress':'In Progress', Delayed:'Delayed', Completed:'Completed', Pending:'Pending',
};

export default function ProjectsPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter]     = useState('All');
  const [search, setSearch]             = useState('');
  const [focused, setFocused]           = useState(false);

  // Apply URL query param filters on load
  useEffect(() => {
    if (router.isReady) {
      const { status } = router.query;
      if (status && typeof status === 'string') {
        const mapped = STATUS_MAP[status];
        if (mapped) setStatusFilter(mapped);
      }
    }
  }, [router.isReady, router.query]);

  const filtered = projects.filter(p => {
    if (statusFilter !== 'All' && p.status !== statusFilter) return false;
    if (typeFilter !== 'All' && p.type !== typeFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return p.site.toLowerCase().includes(s) || p.id.toLowerCase().includes(s) || p.client.toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <Layout>
      <div className="fade-in">
        {/* Summary cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
          {[
            { label:'Total Projects', value:projects.length,                               color:T.primary, icon:'📁', filter:'All'         },
            { label:'In Progress',    value:projects.filter(p=>p.status==='In Progress').length, color:T.info,    icon:'⚡', filter:'In Progress' },
            { label:'Delayed',        value:projects.filter(p=>p.status==='Delayed').length,     color:T.danger,  icon:'⚠️', filter:'Delayed'     },
            { label:'Completed',      value:projects.filter(p=>p.status==='Completed').length,   color:T.success, icon:'✅', filter:'Completed'   },
          ].map((s,i) => (
            <div key={i} onClick={() => setStatusFilter(s.filter)}
              style={{ ...card, position:'relative', overflow:'hidden', padding:'16px 18px', cursor:'pointer', borderColor:statusFilter===s.filter?s.color:T.border, transition:'all 0.15s' }}
              onMouseEnter={e=>{ const el=e.currentTarget as HTMLDivElement; el.style.transform='translateY(-1px)'; el.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'; }}
              onMouseLeave={e=>{ const el=e.currentTarget as HTMLDivElement; el.style.transform='translateY(0)'; el.style.boxShadow='0 1px 3px rgba(0,0,0,0.06)'; }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:s.color }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:11, color:T.textMuted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>{s.label}</div>
                  <div style={{ fontSize:28, fontWeight:700, color:T.text }}>{s.value}</div>
                </div>
                <div style={{ fontSize:22 }}>{s.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} placeholder="Search site, project ID, client…" style={{ ...inputStyle(focused), width:240 }} />
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            {STATUSES.map(f => (
              <button key={f} onClick={() => setStatusFilter(f)} style={{ padding:'6px 12px', borderRadius:6, border:'1px solid', borderColor:statusFilter===f?T.primary:T.border, background:statusFilter===f?T.primaryLight:'#fff', color:statusFilter===f?T.primary:T.textMuted, fontSize:12, cursor:'pointer', fontWeight:statusFilter===f?600:400, transition:'all 0.15s' }}>{f}</button>
            ))}
          </div>
          <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={{ ...inputStyle(), width:'auto', marginLeft:'auto' }}>
            {TYPES.map(t=><option key={t}>{t}</option>)}
          </select>
          <button style={btnPrimary}>+ New Project</button>
        </div>

        {/* Table */}
        <div style={card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div style={{ fontSize:14, fontWeight:600, color:T.text }}>
              {statusFilter === 'All' ? 'All Projects' : statusFilter + ' Projects'} · {filtered.length} records
            </div>
            <div style={{ display:'flex', gap:6 }}>
              {[{c:T.danger,l:`${projects.filter(p=>p.aging>60).length} critical`},{c:T.warning,l:`${projects.filter(p=>p.status==='Delayed').length} delayed`},{c:T.success,l:`${projects.filter(p=>p.status==='Completed').length} done`}].map((s,i)=>(
                <span key={i} style={{ fontSize:11, color:s.c, background:`${s.c}15`, padding:'3px 10px', borderRadius:20 }}>{s.l}</span>
              ))}
            </div>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%' }}>
              <thead>
                <tr>{['#','Project ID','Site / Region','Job Type','Client','Vendor','PO Value','Aging','Progress','Status','Actions'].map(h=><th key={h} style={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={11} style={{ ...td, textAlign:'center', padding:40, color:T.textDim }}>No projects match the current filter.</td></tr>
                ) : filtered.map((p,i) => (
                  <tr key={i}
                    onClick={() => router.push(`/projects/${p.id}`)}
                    style={{ cursor:'pointer', transition:'background 0.1s' }}
                    onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background=T.primaryLight}
                    onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background='transparent'}>
                    <td style={{ ...td, color:T.textDim }}>{i+1}</td>
                    <td style={{ ...td, color:T.primary, fontWeight:700 }}>{p.id}</td>
                    <td style={td}>
                      <div style={{ fontWeight:500, color:T.text }}>{p.site}</div>
                      <div style={{ fontSize:11, color:T.textDim }}>{p.region}</div>
                    </td>
                    <td style={td}><span style={{ fontSize:11, background:T.primaryLight, color:T.primary, padding:'2px 8px', borderRadius:5, fontWeight:500, whiteSpace:'nowrap' }}>{p.type}</span></td>
                    <td style={td}>{p.client}</td>
                    <td style={{ ...td, fontSize:12 }}>{p.vendor}</td>
                    <td style={{ ...td, fontWeight:600, color:T.text, whiteSpace:'nowrap' }}>{fmt(p.poValue)}</td>
                    <td style={td}><span style={{ color:p.aging>60?T.danger:p.aging>30?T.warning:T.success, fontWeight:700 }}>{p.aging}d</span></td>
                    <td style={{ ...td, minWidth:120 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <div style={{ flex:1, height:5, background:T.border, borderRadius:3 }}>
                          <div style={{ height:'100%', width:`${p.progress}%`, background:p.progress===100?T.success:p.status==='Delayed'?T.danger:T.primary, borderRadius:3 }} />
                        </div>
                        <span style={{ fontSize:11, color:T.textDim, minWidth:28 }}>{p.progress}%</span>
                      </div>
                    </td>
                    <td style={td}><span style={badge(p.status)}>{p.status}</span></td>
                    <td style={td} onClick={e=>e.stopPropagation()}>
                      <div style={{ display:'flex', gap:4 }}>
                        <Link href={`/projects/${p.id}`} style={{ textDecoration:'none' }}>
                          <button style={{ background:T.primaryLight, border:'none', borderRadius:5, padding:'4px 8px', color:T.primary, cursor:'pointer', fontSize:12 }}>👁</button>
                        </Link>
                        <button style={{ background:T.primaryLight, border:'none', borderRadius:5, padding:'4px 8px', color:T.primary, cursor:'pointer', fontSize:12 }}>✏️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding:'10px 0', borderTop:`1px solid ${T.border}`, fontSize:11, color:T.textDim, marginTop:4 }}>
            Showing {filtered.length} of {projects.length} projects · Click any row to view details
          </div>
        </div>
      </div>
    </Layout>
  );
}
