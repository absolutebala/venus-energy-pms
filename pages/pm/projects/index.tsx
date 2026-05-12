import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { T, card, btnPrimary, inputStyle } from '@/lib/theme';

const ALL_PROJECTS = [
  { id:'VE-2025-001', projectName:'Chennai Metro Phase II',  site:'Chennai North',  type:'Tower Erection',    poValue:1850000, aging:12, status:'in_progress',  progress:65,  vendorAssigned:true,  vendor:'ABC Telecom Services', deadline:'30/06/2025', pm:'Arun Kumar'  },
  { id:'VE-2025-004', projectName:'Chennai Fiber Network',   site:'Chennai South',  type:'Fiber Installation',poValue:1230000, aging:12, status:'in_progress',  progress:45,  vendorAssigned:false, vendor:null,                   deadline:'15/07/2025', pm:'Arun Kumar'  },
  { id:'VE-2025-005', projectName:'Coimbatore Tower Erect',  site:'Coimbatore',     type:'Tower Erection',    poValue:2200000, aging:8,  status:'pending',       progress:10,  vendorAssigned:false, vendor:null,                   deadline:'31/08/2025', pm:'Arun Kumar'  },
  { id:'VE-2025-008', projectName:'Delhi NCR Maintenance',   site:'Delhi NCR',      type:'Tower Maintenance', poValue:380000,  aging:18, status:'in_progress',  progress:75,  vendorAssigned:true,  vendor:'XYZ Infra Solutions',  deadline:'31/05/2025', pm:'Arun Kumar'  },
  { id:'VE-2025-003', projectName:'Hyderabad Component Repl',site:'Hyderabad',      type:'Component Replace', poValue:760000,  aging:22, status:'billing_review',progress:100, vendorAssigned:true,  vendor:'TowerTech Pvt Ltd',    deadline:'20/05/2025', pm:'Vijay Kumar' },
  { id:'VE-2025-007', projectName:'Mumbai Power Works',      site:'Mumbai Central', type:'Power Works',       poValue:890000,  aging:33, status:'billing_review',progress:100, vendorAssigned:true,  vendor:'PowerSys India',       deadline:'31/05/2025', pm:'Arun Kumar'  },
  { id:'VE-2025-009', projectName:'Kochi Component Delay',   site:'Kochi',          type:'Component Replace', poValue:650000,  aging:62, status:'delayed',       progress:40,  vendorAssigned:false, vendor:null,                   deadline:'30/04/2025', pm:'Vijay Kumar' },
  { id:'VE-2025-010', projectName:'Kolkata Fiber Install',   site:'Kolkata North',  type:'Fiber Installation',poValue:975000,  aging:5,  status:'completed',     progress:100, vendorAssigned:true,  vendor:'NetConnect Services',  deadline:'31/08/2025', pm:'Arun Kumar'  },
];

const fmt = (v:number) => `₹${(v/100000).toFixed(1)}L`;

const STATUS_COLOR: Record<string,string> = {
  in_progress:'#2563EB', pending:'#D97706', delayed:'#DC2626',
  billing_review:'#7C3AED', completed:'#16A34A', submitted:'#0D9488',
};
const STATUS_LABEL: Record<string,string> = {
  in_progress:'In Progress', pending:'Pending', delayed:'Delayed',
  billing_review:'Pending Invoice', completed:'Completed', submitted:'Submitted',
};

const ProjectCard = ({ p, onOpen }: { p: typeof ALL_PROJECTS[0]; onOpen:(id:string)=>void }) => {
  const st     = STATUS_COLOR[p.status] || T.textDim;
  const stLabel= STATUS_LABEL[p.status] || p.status;
  const needsAction = !p.vendorAssigned || p.status === 'delayed';

  return (
    <div onClick={()=>onOpen(p.id)}
      style={{ background:T.surface, border:`1.5px solid ${needsAction?T.danger:p.vendorAssigned?T.border:T.warning}`, borderRadius:12, padding:18, cursor:'pointer', transition:'all 0.15s' }}
      onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.boxShadow='0 4px 16px rgba(0,0,0,0.1)'}
      onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.boxShadow='none'}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:T.primary, marginBottom:3 }}>{p.id}</div>
          <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:2 }}>{p.projectName}</div>
          <div style={{ fontSize:11, color:T.textMuted }}>{p.site} · {p.type}</div>
        </div>
        <span style={{ background:`${st}18`, color:st, border:`1px solid ${st}40`, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, whiteSpace:'nowrap' as const }}>{stLabel}</span>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
        <div style={{ fontSize:11, color:T.textMuted }}>PO Value: <strong style={{ color:T.text }}>{fmt(p.poValue)}</strong></div>
        <div style={{ fontSize:11, color:T.textMuted }}>Aging: <strong style={{ color:p.aging>30?T.danger:T.success }}>{p.aging}d</strong></div>
        <div style={{ fontSize:11, color:T.textMuted }}>Deadline: <strong style={{ color:T.text }}>{p.deadline}</strong></div>
        <div style={{ fontSize:11, color:T.textMuted }}>Progress: <strong style={{ color:T.primary }}>{p.progress}%</strong></div>
      </div>

      <div style={{ height:4, background:T.border, borderRadius:2, marginBottom:10 }}>
        <div style={{ height:'100%', width:`${p.progress}%`, background:p.status==='delayed'?T.danger:p.status==='completed'?T.success:T.primary, borderRadius:2 }} />
      </div>

      {p.vendorAssigned ? (
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontSize:11, color:T.textMuted }}>Vendor: <strong style={{ color:T.text }}>{p.vendor}</strong></div>
          <span style={{ fontSize:10, fontWeight:600, color:T.success, background:T.successBg, padding:'2px 8px', borderRadius:10 }}>✓ Assigned</span>
        </div>
      ) : (
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:11, color:T.danger, fontWeight:600 }}>⚠️ Vendor not assigned</span>
          <span style={{ fontSize:11, color:T.primary, fontWeight:600 }}>Tap to assign →</span>
        </div>
      )}
    </div>
  );
};

export default function PMProjectsPage() {
  const router  = useRouter();
  const { profile } = useAuth();
  const [search, setSearch]     = useState('');
  const [focused, setFocused]   = useState(false);
  const [activeTab, setActiveTab] = useState<'all'|'unassigned'|'assigned'|'billing'|'completed'>('all');

  const myProjects = ALL_PROJECTS.filter(p =>
    p.pm === (profile?.full_name || 'Arun Kumar') &&
    (!search || p.projectName.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase()))
  );

  const groups = {
    unassigned: myProjects.filter(p => !p.vendorAssigned),
    assigned:   myProjects.filter(p => p.vendorAssigned && !['billing_review','completed'].includes(p.status)),
    billing:    myProjects.filter(p => p.status === 'billing_review'),
    completed:  myProjects.filter(p => p.status === 'completed'),
  };

  const displayed = activeTab === 'all'       ? myProjects
                  : activeTab === 'unassigned' ? groups.unassigned
                  : activeTab === 'assigned'   ? groups.assigned
                  : activeTab === 'billing'    ? groups.billing
                  : groups.completed;

  const openProject = (id: string) => router.push(`/pm/projects/${id}`);

  const tabStyle = (t: string) => ({
    padding:'8px 18px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13,
    fontWeight:activeTab===t?700:400,
    background:activeTab===t?T.primary:'transparent',
    color:activeTab===t?'#fff':T.textMuted, transition:'all 0.15s',
  });

  return (
    <Layout>
      <div className="fade-in">
        {/* Summary cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:20 }}>
          {[
            { label:'Total Projects',    value:myProjects.length,           color:T.primary, icon:'📁', tab:'all'        },
            { label:'Vendor Not Assigned',value:groups.unassigned.length,  color:T.danger,  icon:'⚠️', tab:'unassigned' },
            { label:'Vendor Assigned',   value:groups.assigned.length,     color:T.success, icon:'✅', tab:'assigned'   },
            { label:'Pending Invoice',   value:groups.billing.length,      color:'#7C3AED', icon:'💳', tab:'billing'    },
            { label:'Completed',         value:groups.completed.length,    color:T.info,    icon:'🏁', tab:'completed'  },
          ].map((s,i)=>(
            <div key={i} onClick={()=>setActiveTab(s.tab as any)}
              style={{ ...card, position:'relative', overflow:'hidden', padding:'14px 16px', cursor:'pointer', borderColor:activeTab===s.tab?s.color:T.border, transition:'all 0.15s' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:s.color }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:10, color:T.textMuted, textTransform:'uppercase', letterSpacing:0.4, marginBottom:4 }}>{s.label}</div>
                  <div style={{ fontSize:24, fontWeight:700, color:activeTab===s.tab?s.color:T.text }}>{s.value}</div>
                </div>
                <div style={{ fontSize:20 }}>{s.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs + Search */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
          <div style={{ display:'flex', gap:4, background:T.bg, padding:4, borderRadius:10 }}>
            {[
              { key:'all',        label:`All (${myProjects.length})` },
              { key:'unassigned', label:`Action Required (${groups.unassigned.length})` },
              { key:'assigned',   label:`Active (${groups.assigned.length})` },
              { key:'billing',    label:`Pending Invoice (${groups.billing.length})` },
              { key:'completed',  label:`Completed (${groups.completed.length})` },
            ].map(t=>(
              <button key={t.key} onClick={()=>setActiveTab(t.key as any)} style={tabStyle(t.key)}>{t.label}</button>
            ))}
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
            placeholder="Search project…" style={{ ...inputStyle(focused), width:220 }} />
        </div>

        {/* Section label */}
        {activeTab === 'unassigned' && groups.unassigned.length > 0 && (
          <div style={{ background:T.dangerBg, border:'1px solid #FECACA', borderRadius:8, padding:'10px 16px', marginBottom:16, fontSize:13, color:T.danger, fontWeight:600 }}>
            ⚠️ {groups.unassigned.length} project(s) need a vendor assigned before work can begin.
          </div>
        )}
        {activeTab === 'billing' && groups.billing.length > 0 && (
          <div style={{ background:'#F5F3FF', border:'1px solid #DDD6FE', borderRadius:8, padding:'10px 16px', marginBottom:16, fontSize:13, color:'#7C3AED', fontWeight:600 }}>
            💳 {groups.billing.length} project(s) are completed and waiting for billing invoice.
          </div>
        )}

        {/* Project grid */}
        {displayed.length === 0 ? (
          <div style={{ ...card, textAlign:'center', padding:60, color:T.textDim }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
            <div style={{ fontSize:14 }}>No projects in this category.</div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:14 }}>
            {displayed.map(p => <ProjectCard key={p.id} p={p} onOpen={openProject} />)}
          </div>
        )}
      </div>
    </Layout>
  );
}
