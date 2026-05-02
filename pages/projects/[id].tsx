import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { T, card, badge, th, td } from '@/lib/theme';

const allProjects: Record<string, any> = {
  'VE-2025-001': { id:'VE-2025-001', site:'Chennai North',     client:'Airtel', type:'Tower Erection',       vendor:'ABC Telecom Services',     poValue:1850000, aging:12,  status:'In Progress', progress:65,  region:'TN', pm:'Arun Kumar',   rm:'Ramesh Kumar', startDate:'01/04/2025', endDate:'30/06/2025', remarks:'Foundation work and reinforcement in progress. Material received partially.' },
  'VE-2025-002': { id:'VE-2025-002', site:'Bengaluru East',    client:'Jio',    type:'Tower Maintenance',    vendor:'XYZ Infra Solutions',      poValue:420000,  aging:78,  status:'Delayed',     progress:30,  region:'KA', pm:'Priya Sharma', rm:'Ramesh Kumar', startDate:'01/03/2025', endDate:'30/04/2025', remarks:'Delayed due to material shortage. Site access issues reported.' },
  'VE-2025-003': { id:'VE-2025-003', site:'Hyderabad Central', client:'Vi',     type:'Component Replacement',vendor:'TowerTech Pvt Ltd',        poValue:760000,  aging:22,  status:'Completed',   progress:100, region:'TS', pm:'Arun Kumar',   rm:'Ramesh Kumar', startDate:'01/04/2025', endDate:'20/05/2025', remarks:'All components replaced successfully. Final inspection done.' },
  'VE-2025-004': { id:'VE-2025-004', site:'Chennai South',     client:'BSNL',   type:'Fiber Installation',   vendor:'NetConnect Services',      poValue:1230000, aging:12,  status:'In Progress', progress:45,  region:'TN', pm:'Vijay Kumar',  rm:'Ramesh Kumar', startDate:'15/04/2025', endDate:'15/07/2025', remarks:'Fiber laying in progress. 45% route completed.' },
  'VE-2025-005': { id:'VE-2025-005', site:'Coimbatore',        client:'Airtel', type:'Tower Erection',       vendor:'ABC Telecom Services',     poValue:2200000, aging:8,   status:'Pending',     progress:10,  region:'TN', pm:'Arun Kumar',   rm:'Suresh Patel', startDate:'15/05/2025', endDate:'31/08/2025', remarks:'Site survey completed. Foundation design approved. Work to begin shortly.' },
  'VE-2025-006': { id:'VE-2025-006', site:'Pune West',         client:'Jio',    type:'Civil Works',          vendor:'BuildRight Constructions', poValue:540000,  aging:95,  status:'Delayed',     progress:20,  region:'MH', pm:'Pooja Mehta',  rm:'Amit Sharma',  startDate:'01/02/2025', endDate:'30/04/2025', remarks:'Severely delayed. Contractor issues. Escalated to management.' },
  'VE-2025-007': { id:'VE-2025-007', site:'Mumbai Central',    client:'Vi',     type:'Power Works',          vendor:'PowerSys India',           poValue:890000,  aging:33,  status:'In Progress', progress:75,  region:'MH', pm:'Pooja Mehta',  rm:'Amit Sharma',  startDate:'01/04/2025', endDate:'31/05/2025', remarks:'Generator installation complete. DG synchronization in progress.' },
  'VE-2025-008': { id:'VE-2025-008', site:'Delhi NCR',         client:'Airtel', type:'Tower Maintenance',    vendor:'XYZ Infra Solutions',      poValue:380000,  aging:18,  status:'In Progress', progress:55,  region:'DL', pm:'Rajeev Singh', rm:'Amit Sharma',  startDate:'01/05/2025', endDate:'31/05/2025', remarks:'Antenna replacement done. Cable testing in progress.' },
  'VE-2025-009': { id:'VE-2025-009', site:'Kochi',             client:'BSNL',   type:'Component Replacement',vendor:'TowerTech Pvt Ltd',        poValue:650000,  aging:62,  status:'Delayed',     progress:40,  region:'KL', pm:'Vijay Kumar',  rm:'Suresh Patel', startDate:'01/03/2025', endDate:'30/04/2025', remarks:'Delayed. Awaiting custom parts from OEM. Expected delivery next week.' },
  'VE-2025-010': { id:'VE-2025-010', site:'Kolkata North',     client:'Jio',    type:'Fiber Installation',   vendor:'NetConnect Services',      poValue:975000,  aging:5,   status:'Pending',     progress:0,   region:'WB', pm:'Neha Verma',   rm:'Suresh Patel', startDate:'01/06/2025', endDate:'31/08/2025', remarks:'Project not yet started. Team mobilization in process.' },
};

const activityLog = [
  { date:'20/05/2025 04:45 PM', action:'Work status updated',       by:'Arun Kumar',    role:'Project Manager' },
  { date:'20/05/2025 12:15 PM', action:'Reinforcement work started', by:'Suresh Kumar',  role:'Site Engineer'   },
  { date:'20/05/2025 09:30 AM', action:'Foundation excavation done', by:'Ramesh Raj',    role:'Supervisor'      },
  { date:'19/05/2025 05:00 PM', action:'Material received partially',by:'Store Incharge', role:'Store'          },
  { date:'18/05/2025 10:00 AM', action:'Project allocation updated', by:'Ramesh Kumar',  role:'Region Manager'  },
];

const statusColor = (s: string) => ({ Completed:T.success, 'In Progress':T.primary, Pending:T.warning, Delayed:T.danger }[s] || T.textMuted);

export default function ProjectDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const project = id ? allProjects[id as string] : null;

  if (!id) return <Layout><div style={{ padding:40, textAlign:'center', color:T.textMuted }}>Loading…</div></Layout>;

  if (!project) {
    return (
      <Layout>
        <div style={{ ...card, textAlign:'center', padding:60 }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🔍</div>
          <h2 style={{ fontSize:20, fontWeight:700, color:T.text, marginBottom:8 }}>Project Not Found</h2>
          <p style={{ fontSize:14, color:T.textMuted, marginBottom:24 }}>Project <strong>{id}</strong> does not exist.</p>
          <Link href="/projects" style={{ background:T.primary, color:'#fff', borderRadius:8, padding:'10px 20px', fontSize:13, fontWeight:600, textDecoration:'none' }}>← Back to Projects</Link>
        </div>
      </Layout>
    );
  }

  const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`;
  const p = project;

  return (
    <Layout>
      <div className="fade-in">
        {/* Breadcrumb */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20, fontSize:13 }}>
          <Link href="/projects" style={{ color:T.primary, textDecoration:'none', fontWeight:500 }}>← Projects</Link>
          <span style={{ color:T.textDim }}>/</span>
          <span style={{ color:T.text, fontWeight:600 }}>{p.id}</span>
        </div>

        {/* Header */}
        <div style={{ ...card, marginBottom:16, padding:'20px 24px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                <h1 style={{ fontSize:20, fontWeight:800, color:T.text, margin:0 }}>{p.id}</h1>
                <span style={badge(p.status)}>{p.status}</span>
              </div>
              <div style={{ fontSize:14, color:T.textMuted }}>{p.site} · {p.region} · {p.client}</div>
              <div style={{ fontSize:13, color:T.textDim, marginTop:4 }}>📋 {p.type}</div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button style={{ background:T.surface, border:`1.5px solid ${T.border}`, borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:600, color:T.textMuted, cursor:'pointer' }}>✏️ Edit</button>
              <button style={{ background:T.primary, color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:600, cursor:'pointer' }}>+ Add Work Update</button>
            </div>
          </div>

          {/* Progress */}
          <div style={{ marginTop:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:T.textMuted, marginBottom:6 }}>
              <span>Overall Progress</span>
              <span style={{ fontWeight:700, color:p.progress===100?T.success:p.status==='Delayed'?T.danger:T.primary }}>{p.progress}%</span>
            </div>
            <div style={{ height:8, background:T.border, borderRadius:4 }}>
              <div style={{ height:'100%', width:`${p.progress}%`, background:p.progress===100?T.success:p.status==='Delayed'?T.danger:T.primary, borderRadius:4, transition:'width 0.5s' }} />
            </div>
          </div>
        </div>

        {/* Detail grid */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
          {/* Project Info */}
          <div style={card}>
            <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:14, paddingBottom:10, borderBottom:`1px solid ${T.border}` }}>📋 Project Details</div>
            {[
              ['Project No',      p.id          ],
              ['Site Name',       p.site        ],
              ['Region',          p.region      ],
              ['Client',          p.client      ],
              ['Job Type',        p.type        ],
              ['Start Date',      p.startDate   ],
              ['End Date',        p.endDate     ],
              ['Region Manager',  p.rm          ],
              ['Project Manager', p.pm          ],
            ].map(([label, value]) => (
              <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:`1px solid ${T.border}`, fontSize:13 }}>
                <span style={{ color:T.textMuted }}>{label}</span>
                <span style={{ fontWeight:600, color:T.text, textAlign:'right', maxWidth:'60%' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Financial Info */}
          <div style={card}>
            <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:14, paddingBottom:10, borderBottom:`1px solid ${T.border}` }}>💰 Financial Summary</div>
            {[
              { label:'PO Value',         value:fmt(p.poValue),            color:T.text    },
              { label:'Billed Amount',     value:fmt(p.poValue*0.63),       color:T.success },
              { label:'Paid Amount',       value:fmt(p.poValue*0.56),       color:T.success },
              { label:'Pending Billing',   value:fmt(p.poValue*0.37),       color:T.warning },
              { label:'PO Aging',          value:`${p.aging} days`,         color:p.aging>60?T.danger:p.aging>30?T.warning:T.success },
            ].map((r) => (
              <div key={r.label} style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:`1px solid ${T.border}`, fontSize:13 }}>
                <span style={{ color:T.textMuted }}>{r.label}</span>
                <span style={{ fontWeight:700, color:r.color }}>{r.value}</span>
              </div>
            ))}

            <div style={{ marginTop:14, padding:12, background:T.primaryLight, borderRadius:8 }}>
              <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Vendor</div>
              <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{p.vendor}</div>
            </div>

            <div style={{ marginTop:10, padding:12, background:p.status==='Delayed'?T.dangerBg:p.status==='Completed'?T.successBg:T.primaryLight, borderRadius:8 }}>
              <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Remarks</div>
              <div style={{ fontSize:12, color:T.text, lineHeight:1.5 }}>{p.remarks}</div>
            </div>
          </div>
        </div>

        {/* Compliance status row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:16 }}>
          {[
            { label:'Safety Photos',  status:'Uploaded',  icon:'📷' },
            { label:'JMR Document',   status:'Uploaded',  icon:'📄' },
            { label:'AC Certificate', status:'Uploaded',  icon:'🏅' },
            { label:'NOC Document',   status:'Pending',   icon:'📋' },
            { label:'Drawing Doc',    status:'Uploaded',  icon:'📐' },
          ].map((c,i) => (
            <div key={i} style={{ ...card, textAlign:'center', padding:'14px 10px', borderTop:`3px solid ${c.status==='Uploaded'?T.success:T.warning}` }}>
              <div style={{ fontSize:20, marginBottom:6 }}>{c.icon}</div>
              <div style={{ fontSize:11, fontWeight:600, color:T.text, marginBottom:4 }}>{c.label}</div>
              <span style={{ fontSize:10, fontWeight:700, color:c.status==='Uploaded'?T.success:T.warning, background:c.status==='Uploaded'?T.successBg:T.warningBg, padding:'2px 8px', borderRadius:10 }}>{c.status}</span>
            </div>
          ))}
        </div>

        {/* Activity Log */}
        <div style={card}>
          <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:14, paddingBottom:10, borderBottom:`1px solid ${T.border}` }}>📝 Activity Log</div>
          <table style={{ width:'100%' }}>
            <thead><tr>{['Date & Time','Activity','Performed By','Role'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {activityLog.map((log, i) => (
                <tr key={i}
                  onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background=T.bg}
                  onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background='transparent'}>
                  <td style={{ ...td, whiteSpace:'nowrap', color:T.textDim, fontSize:12 }}>{log.date}</td>
                  <td style={{ ...td, color:T.text, fontWeight:500 }}>{log.action}</td>
                  <td style={td}>{log.by}</td>
                  <td style={td}><span style={{ fontSize:11, background:T.primaryLight, color:T.primary, padding:'2px 8px', borderRadius:5, fontWeight:500 }}>{log.role}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
