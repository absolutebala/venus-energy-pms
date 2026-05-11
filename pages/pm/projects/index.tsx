import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { T, card, btnPrimary, inputStyle, badge } from '@/lib/theme';

const ALL_PROJECTS = [
  { id:'VE-2025-001', projectName:'Chennai Metro Phase II',  site:'Chennai North',  type:'Tower Erection',    poValue:1850000, aging:12, status:'in_progress', vendorAssigned:true,  vendor:'ABC Telecom Services', deadline:'30/06/2025', pm:'Arun Kumar'   },
  { id:'VE-2025-004', projectName:'Chennai Fiber Network',   site:'Chennai South',  type:'Fiber Installation',poValue:1230000, aging:12, status:'in_progress', vendorAssigned:false, vendor:null,                  deadline:'15/07/2025', pm:'Arun Kumar'   },
  { id:'VE-2025-005', projectName:'Coimbatore Tower Erect',  site:'Coimbatore',     type:'Tower Erection',    poValue:2200000, aging:8,  status:'pending',      vendorAssigned:false, vendor:null,                  deadline:'31/08/2025', pm:'Arun Kumar'   },
  { id:'VE-2025-008', projectName:'Delhi NCR Maintenance',   site:'Delhi NCR',      type:'Tower Maintenance', poValue:380000,  aging:18, status:'in_progress', vendorAssigned:true,  vendor:'XYZ Infra Solutions', deadline:'31/05/2025', pm:'Arun Kumar'   },
  { id:'VE-2025-003', projectName:'Hyderabad Component Repl',site:'Hyderabad',      type:'Component Replace', poValue:760000,  aging:22, status:'pm_approved',  vendorAssigned:true,  vendor:'TowerTech Pvt Ltd',   deadline:'20/05/2025', pm:'Vijay Kumar'  },
  { id:'VE-2025-009', projectName:'Kochi Tower Delay',       site:'Kochi',          type:'Component Replace', poValue:650000,  aging:62, status:'delayed',       vendorAssigned:false, vendor:null,                  deadline:'30/04/2025', pm:'Vijay Kumar'  },
];

const fmt = (v: number) => `₹${(v/100000).toFixed(2)}L`;

export default function PMProjectsPage() {
  const router  = useRouter();
  const { profile } = useAuth();
  const [search, setSearch]   = useState('');
  const [focused, setFocused] = useState(false);

  // Filter projects assigned to this PM
  const myProjects = ALL_PROJECTS.filter(p =>
    p.pm === (profile?.full_name || 'Arun Kumar') &&
    (!search || p.projectName.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase()))
  );

  const notAssigned = myProjects.filter(p => !p.vendorAssigned);
  const assigned    = myProjects.filter(p => p.vendorAssigned);

  const ProjectCard = ({ p }: { p: typeof ALL_PROJECTS[0] }) => (
    <div style={{ background:T.surface, border:`1.5px solid ${!p.vendorAssigned?T.danger:T.border}`, borderRadius:12, padding:18, marginBottom:12, transition:'all 0.15s' }}
      onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.boxShadow='0 4px 16px rgba(0,0,0,0.08)'}
      onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.boxShadow='none'}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10, marginBottom:12 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <span style={{ fontSize:13, fontWeight:700, color:T.primary }}>{p.id}</span>
            <span style={badge(p.status)}>{p.status.replace(/_/g,' ')}</span>
          </div>
          <div style={{ fontSize:15, fontWeight:700, color:T.text }}>{p.projectName}</div>
          <div style={{ fontSize:12, color:T.textMuted }}>{p.site} · {p.type}</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:11, color:T.textDim }}>PO Value</div>
          <div style={{ fontSize:14, fontWeight:700, color:T.text }}>{fmt(p.poValue)}</div>
          <div style={{ fontSize:11, color:p.aging>30?T.danger:T.success, marginTop:2 }}>Aging: {p.aging}d</div>
        </div>
      </div>

      {p.vendorAssigned ? (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontSize:12, color:T.textMuted }}>
            Vendor: <strong style={{ color:T.text }}>{p.vendor}</strong>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>router.push(`/pm/projects/${p.id}`)} style={{ background:T.primaryLight, border:`1px solid ${T.primaryMid}`, borderRadius:8, padding:'6px 14px', color:T.primary, cursor:'pointer', fontSize:12, fontWeight:600 }}>
              📋 View Assignment
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontSize:12, color:T.danger, fontWeight:600 }}>⚠️ Vendor not yet assigned</div>
          <button onClick={()=>router.push(`/pm/projects/${p.id}`)} style={{ ...btnPrimary, padding:'7px 18px', fontSize:12 }}>
            + Assign Vendor
          </button>
        </div>
      )}
    </div>
  );

  return (
    <Layout>
      <div className="fade-in">
        {/* Summary */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
          {[
            { label:'Total Projects',    value:myProjects.length,   color:T.primary, icon:'📁' },
            { label:'Vendor Assigned',   value:assigned.length,     color:T.success, icon:'✅' },
            { label:'Action Required',   value:notAssigned.length,  color:T.danger,  icon:'⚠️' },
            { label:'Delayed',           value:myProjects.filter(p=>p.status==='delayed').length, color:T.warning, icon:'⏰' },
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

        {/* Search */}
        <div style={{ marginBottom:20 }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} placeholder="Search project ID or name…" style={{ ...inputStyle(focused), width:280 }} />
        </div>

        {/* Group 1: Vendor Not Assigned */}
        {notAssigned.length > 0 && (
          <div style={{ marginBottom:28 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:700, color:T.danger }}>⚠️ Action Required — Vendor Not Assigned</div>
              <span style={{ background:'#FEF2F2', color:T.danger, border:'1px solid #FECACA', fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:20 }}>{notAssigned.length}</span>
            </div>
            {notAssigned.map(p => <ProjectCard key={p.id} p={p} />)}
          </div>
        )}

        {/* Group 2: Vendor Assigned */}
        {assigned.length > 0 && (
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:700, color:T.success }}>✅ Vendor Assigned</div>
              <span style={{ background:T.successBg, color:T.success, border:'1px solid #BBF7D0', fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:20 }}>{assigned.length}</span>
            </div>
            {assigned.map(p => <ProjectCard key={p.id} p={p} />)}
          </div>
        )}

        {myProjects.length === 0 && (
          <div style={{ ...card, textAlign:'center', padding:60, color:T.textDim }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
            <div style={{ fontSize:14 }}>No projects assigned to you yet.</div>
          </div>
        )}
      </div>
    </Layout>
  );
}
