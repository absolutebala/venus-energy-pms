import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { T, card, btnPrimary, inputStyle } from '@/lib/theme';

const ALL_PROJECTS = [
  { id:'VE-2025-001', projectName:'Chennai Metro Phase II',  poNo:'PO-2025-001', indusId:'IND-1001', site:'Chennai North',   type:'Tower Erection',     poValue:1850000, aging:12, status:'in_progress',   progress:65,  vendorAssigned:true,  vendor:'ABC Telecom Services',    deadline:'30/06/2025', pm:'Arun Kumar',   assignedAt:'2025-05-10' },
  { id:'VE-2025-004', projectName:'Chennai Fiber Network',  poNo:'PO-2025-002', indusId:'IND-1004',   site:'Chennai South',   type:'Fiber Installation', poValue:1230000, aging:12, status:'in_progress',   progress:45,  vendorAssigned:false, vendor:null,                      deadline:'15/07/2025', pm:'Arun Kumar',   assignedAt:'2025-05-08' },
  { id:'VE-2025-005', projectName:'Coimbatore Tower Erect', poNo:'PO-2025-003', indusId:'IND-1005',  site:'Coimbatore',      type:'Tower Erection',     poValue:2200000, aging:8,  status:'pending',        progress:10,  vendorAssigned:false, vendor:null,                      deadline:'31/08/2025', pm:'Arun Kumar',   assignedAt:'2025-05-11' },
  { id:'VE-2025-007', projectName:'Mumbai Power Works',      poNo:'PO-2025-004', indusId:'IND-1007',      site:'Mumbai Central',  type:'Power Works',        poValue:890000,  aging:33, status:'billing_review', progress:100, vendorAssigned:true,  vendor:'PowerSys India',          deadline:'31/05/2025', pm:'Arun Kumar',   assignedAt:'2025-04-20' },
  { id:'VE-2025-008', projectName:'Delhi NCR Maintenance',  poNo:'PO-2025-004', indusId:'IND-1008',   site:'Delhi NCR',       type:'Tower Maintenance',  poValue:380000,  aging:18, status:'in_progress',   progress:75,  vendorAssigned:true,  vendor:'XYZ Infra Solutions',     deadline:'31/05/2025', pm:'Arun Kumar',   assignedAt:'2025-05-09' },
  { id:'VE-2025-010', projectName:'Kolkata Fiber Install',  poNo:'PO-2025-005', indusId:'IND-1010',   site:'Kolkata North',   type:'Fiber Installation', poValue:975000,  aging:5,  status:'completed',      progress:100, vendorAssigned:true,  vendor:'NetConnect Services',     deadline:'31/08/2025', pm:'Arun Kumar',   assignedAt:'2025-05-05' },
  { id:'VE-2025-003', projectName:'Hyderabad Component Repl', poNo:'PO-2025-002', indusId:'IND-1003',site:'Hyderabad',       type:'Component Replace',  poValue:760000,  aging:22, status:'billing_review', progress:100, vendorAssigned:true,  vendor:'TowerTech Pvt Ltd',       deadline:'20/05/2025', pm:'Vijay Kumar',  assignedAt:'2025-04-15' },
  { id:'VE-2025-009', projectName:'Kochi Component Delay',  poNo:'PO-2025-005', indusId:'IND-1009',   site:'Kochi',           type:'Component Replace',  poValue:650000,  aging:62, status:'delayed',        progress:40,  vendorAssigned:false, vendor:null,                      deadline:'30/04/2025', pm:'Vijay Kumar',  assignedAt:'2025-04-10' },
];

const STATUS_COLOR: Record<string,string> = {
  in_progress:'#2563EB', pending:'#D97706', delayed:'#DC2626',
  billing_review:'#7C3AED', completed:'#16A34A', submitted:'#0D9488',
};
const STATUS_LABEL: Record<string,string> = {
  in_progress:'In Progress', pending:'Pending', delayed:'Delayed',
  billing_review:'Pending Invoice', completed:'Completed', submitted:'Submitted',
};

const fmt = (v:number) => `₹${(v/100000).toFixed(1)}L`;

export default function PMProjectsPage() {
  const router  = useRouter();
  const { profile } = useAuth();
  const [search,    setSearch]    = useState('');
  const [focused,   setFocused]   = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');

  // Read URL params from dashboard clicks
  useEffect(() => {
    if (!router.isReady) return;
    const { status, ageMin, ageMax } = router.query;
    if (status) setActiveTab(`status:${status}`);
    else if (ageMin) setActiveTab(`age:${ageMin}-${ageMax}`);
  }, [router.isReady, router.query]);

  // Filter to this PM's projects
  // NOTE: Mock data uses hardcoded PM names. In production this filters by user ID from DB.
  // For demo: show all projects that have a PM assigned (simulates PM's assigned projects)
  const myProjects = ALL_PROJECTS.filter(p => p.pm !== null && p.pm !== undefined);

  // Apply filters
  const filtered = myProjects.filter(p => {
    // Search
    if (search && !p.projectName.toLowerCase().includes(search.toLowerCase()) && !p.id.toLowerCase().includes(search.toLowerCase())) return false;
    // Tab/URL filters
    if (activeTab === 'all') return true;
    if (activeTab === 'unassigned') return !p.vendorAssigned;
    if (activeTab === 'assigned')   return p.vendorAssigned && !['billing_review','completed'].includes(p.status);
    if (activeTab === 'billing')    return p.status === 'billing_review';
    if (activeTab === 'completed')  return p.status === 'completed';
    // URL-driven status filter (from dashboard)
    if (activeTab.startsWith('status:')) {
      const s = activeTab.replace('status:', '');
      return p.status === s;
    }
    // URL-driven aging filter
    if (activeTab.startsWith('age:')) {
      const [min, max] = activeTab.replace('age:','').split('-').map(Number);
      return p.aging >= min && p.aging <= (max||999);
    }
    return true;
  });

  const groups = {
    unassigned: myProjects.filter(p => !p.vendorAssigned),
    assigned:   myProjects.filter(p => p.vendorAssigned && !['billing_review','completed'].includes(p.status)),
    billing:    myProjects.filter(p => p.status === 'billing_review'),
    completed:  myProjects.filter(p => p.status === 'completed'),
  };

  const isStatusFilter = activeTab.startsWith('status:') || activeTab.startsWith('age:');
  const filterLabel = activeTab.startsWith('status:')
    ? `Filtered: ${STATUS_LABEL[activeTab.replace('status:','')] || activeTab.replace('status:','')}`
    : activeTab.startsWith('age:') ? `Filtered: Aging ${activeTab.replace('age:','').replace('-', '–')} days`
    : null;

  const tabStyle = (t: string) => ({
    padding:'7px 14px', borderRadius:7, border:'none', cursor:'pointer', fontSize:12,
    fontWeight:activeTab===t?700:400,
    background:activeTab===t?T.primary:'transparent',
    color:activeTab===t?'#fff':T.textMuted, transition:'all 0.15s',
  });

  const ProjectCard = ({ p }: { p: typeof ALL_PROJECTS[0] }) => {
    const st      = STATUS_COLOR[p.status] || T.textDim;
    const stLabel = STATUS_LABEL[p.status] || p.status;
    return (
      <div onClick={()=>router.push(`/pm/projects/${p.id}`)}
        style={{ background:T.surface, border:`1.5px solid ${!p.vendorAssigned?T.danger:T.border}`, borderRadius:12, padding:18, cursor:'pointer', transition:'all 0.15s' }}
        onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.boxShadow='0 4px 16px rgba(0,0,0,0.1)'}
        onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.boxShadow='none'}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:T.primary, marginBottom:3 }}>{p.id}</div>
            <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:2 }}>{p.projectName}</div>
            <div style={{ fontSize:11, color:T.textMuted }}>{p.site} · {p.type}</div>
          </div>
          <span style={{ background:`${st}18`, color:st, border:`1px solid ${st}40`, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, whiteSpace:'nowrap' as const, flexShrink:0, marginLeft:8 }}>{stLabel}</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8, marginBottom:10 }}>
          <div style={{ fontSize:11, color:T.textMuted }}>PO: <strong style={{ color:T.text }}>{fmt(p.poValue)}</strong></div>
          <div style={{ fontSize:11, color:T.textMuted }}>Aging: <strong style={{ color:p.aging>30?T.danger:T.success }}>{p.aging}d</strong></div>
          <div style={{ fontSize:11, color:T.textMuted }}>Due: <strong style={{ color:T.text }}>{p.deadline}</strong></div>
          <div style={{ fontSize:11, color:T.textMuted }}>Progress: <strong style={{ color:T.primary }}>{p.progress}%</strong></div>
        </div>
        <div style={{ height:4, background:T.border, borderRadius:2, marginBottom:10 }}>
          <div style={{ height:'100%', width:`${p.progress}%`, background:p.status==='delayed'?T.danger:p.status==='completed'?T.success:T.primary, borderRadius:2 }} />
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          {p.vendorAssigned
            ? <span style={{ fontSize:11, color:T.textMuted }}>Vendor: <strong style={{ color:T.text }}>{p.vendor}</strong></span>
            : <span style={{ fontSize:11, color:T.danger, fontWeight:600 }}>⚠️ No vendor assigned — tap to assign</span>}
          <span style={{ fontSize:11, fontWeight:600, color:p.vendorAssigned?T.success:T.danger, background:p.vendorAssigned?T.successBg:'#FEF2F2', padding:'2px 8px', borderRadius:10 }}>
            {p.vendorAssigned ? '✓ Assigned' : 'Action Required'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <div className="fade-in">
        {/* Summary cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:20 }}>
          {[
            { label:'Total',           value:myProjects.length,          color:T.primary, icon:'📁', tab:'all'        },
            { label:'Vendor Required', value:groups.unassigned.length,   color:T.danger,  icon:'⚠️', tab:'unassigned' },
            { label:'Active',          value:groups.assigned.length,     color:T.success, icon:'✅', tab:'assigned'   },
            { label:'Pending Invoice', value:groups.billing.length,      color:'#7C3AED', icon:'💳', tab:'billing'    },
            { label:'Completed',       value:groups.completed.length,    color:T.info,    icon:'🏁', tab:'completed'  },
          ].map((s,i)=>(
            <div key={i} onClick={()=>setActiveTab(s.tab)}
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

        {/* Filter bar */}
        {isStatusFilter && filterLabel && (
          <div style={{ background:T.primaryLight, border:`1px solid ${T.primaryMid}`, borderRadius:8, padding:'8px 16px', marginBottom:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:12, fontWeight:600, color:T.primary }}>🔍 {filterLabel} — showing {filtered.length} of {myProjects.length} projects</span>
            <button onClick={()=>setActiveTab('all')} style={{ background:'none', border:'none', color:T.primary, cursor:'pointer', fontWeight:700, fontSize:14 }}>× Clear</button>
          </div>
        )}

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
          <div style={{ display:'flex', gap:4, background:T.bg, padding:4, borderRadius:10, flexWrap:'wrap' }}>
            {[
              { key:'all',        label:`All (${myProjects.length})`           },
              { key:'unassigned', label:`Action Required (${groups.unassigned.length})` },
              { key:'assigned',   label:`Active (${groups.assigned.length})`   },
              { key:'billing',    label:`Pending Invoice (${groups.billing.length})` },
              { key:'completed',  label:`Completed (${groups.completed.length})` },
            ].map(t=>(
              <button key={t.key} onClick={()=>setActiveTab(t.key)} style={tabStyle(t.key)}>{t.label}</button>
            ))}
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
            placeholder="Search project, PO number, Indus ID…" style={{ ...inputStyle(focused), width:220 }} />
        </div>

        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign:'center', padding:60, color:T.textDim }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
            <div style={{ fontSize:14 }}>No projects in this category.</div>
            <button onClick={()=>setActiveTab('all')} style={{ ...btnPrimary, marginTop:16, fontSize:13 }}>Show All Projects</button>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:14 }}>
            {filtered.map(p => <ProjectCard key={p.id} p={p} />)}
          </div>
        )}
      </div>
    </Layout>
  );
}
