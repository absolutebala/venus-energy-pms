import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { useAuth } from '@/context/AuthContext';
import { T, card, badge, btnPrimary, btnSecondary, inputStyle } from '@/lib/theme';
import { TEAM_MEMBERS } from '@/lib/teamData';

const PROJECTS: Record<string,any> = {
  'VE-2025-001': { id:'VE-2025-001', projectName:'Chennai Metro Phase II', site:'Chennai North', type:'Tower Erection', pm:'Arun Kumar', poValue:1850000, aging:12, status:'in_progress', progress:65, region:'Tamil Nadu', rm:'Ramesh Kumar', vendor:'ABC Telecom Services', poNo:'PO-2025-001', startDate:'01/04/2025', endDate:'30/06/2025' },
  'VE-2025-004': { id:'VE-2025-004', projectName:'Chennai Fiber Network',  site:'Chennai South', type:'Fiber Installation',pm:'Vijay Kumar',poValue:1230000, aging:12, status:'in_progress', progress:45, region:'Tamil Nadu', rm:'Ramesh Kumar', vendor:'NetConnect Services',  poNo:'PO-2025-004', startDate:'15/04/2025', endDate:'15/07/2025' },
  'VE-2025-005': { id:'VE-2025-005', projectName:'Coimbatore Tower',       site:'Coimbatore',   type:'Tower Erection',    pm:'Arun Kumar', poValue:2200000, aging:8,  status:'pending',     progress:10, region:'Tamil Nadu', rm:'Ramesh Kumar', vendor:'ABC Telecom Services',  poNo:'PO-2025-005', startDate:'15/05/2025', endDate:'31/08/2025' },
};

const ALL_ACTIVITIES = {
  'VE-2025-001': [
    { date:'20/05/2025 04:45 PM', action:'Safety Photos uploaded',                by:'ABC Telecom Services', role:'Vendor',  tab:'vendor'  },
    { date:'20/05/2025 02:30 PM', action:'Work status updated to In Progress',    by:'ABC Telecom Services', role:'Vendor',  tab:'vendor'  },
    { date:'19/05/2025 05:00 PM', action:'Project assigned to vendor',             by:'Arun Kumar',           role:'PM',     tab:'pm'      },
    { date:'18/05/2025 11:00 AM', action:'PM Review notes added',                  by:'Arun Kumar',           role:'PM',     tab:'pm'      },
    { date:'17/05/2025 03:00 PM', action:'Invoice INV-2025-012 submitted',         by:'Finance Team',         role:'Billing',tab:'billing' },
    { date:'15/05/2025 10:00 AM', action:'Project created and assigned',            by:'Ramesh Kumar',         role:'RM',     tab:'pm'      },
  ],
};

const fmt = (v:number) => `₹${(v/100000).toFixed(2)}L`;
const STATUS_DISPLAY: Record<string,string> = { in_progress:'In Progress', pending:'Pending', delayed:'Delayed', completed:'Completed', submitted:'Submitted', pm_approved:'PM Approved', billing_review:'Billing Review' };

export default function RMProjectDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { profile } = useAuth();
  const project = id ? PROJECTS[id as string] : null;

  const [activeTab, setActiveTab] = useState<'all'|'vendor'|'pm'|'billing'>('all');
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [newPM, setNewPM] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [toast, setToast] = useState<{msg:string;type:'success'|'error'|'info'}|null>(null);
  const [currentPM, setCurrentPM] = useState(project?.pm || '');

  if (!project) return <Layout><div style={{ padding:40, textAlign:'center' }}>Loading…</div></Layout>;

  const activities = ALL_ACTIVITIES[project.id as keyof typeof ALL_ACTIVITIES] || [];
  const filtered   = activeTab === 'all' ? activities : activities.filter(a => a.tab === activeTab);

  // PMs in same region
  const regionPMs = TEAM_MEMBERS.filter(m => m.role === 'project_manager' && m.region === project.region && m.is_active);

  const handleReassign = () => {
    if (!newPM) { setToast({ msg:'Please select a Project Manager.', type:'error' }); return; }
    if (!reassignReason.trim()) { setToast({ msg:'Please provide a reason for reassignment.', type:'error' }); return; }
    setCurrentPM(newPM);
    setShowReassignModal(false);
    setReassignReason('');
    setToast({ msg:`Project Manager reassigned to ${newPM}!`, type:'success' });
  };

  const handleUnlock = () => {
    if (!unlockReason.trim()) { setToast({ msg:'Please provide a reason for unlocking.', type:'error' }); return; }
    setShowUnlockModal(false);
    setUnlockReason('');
    setToast({ msg:'Return & Logistics section unlocked for PM!', type:'success' });
  };

  const tabStyle = (t: string) => ({
    padding:'8px 18px', borderRadius:6, border:'none', cursor:'pointer', fontSize:13, fontWeight:activeTab===t?700:400,
    background:activeTab===t?T.primary:'transparent', color:activeTab===t?'#fff':T.textMuted, transition:'all 0.15s',
  });

  return (
    <Layout>
      <div className="fade-in">
        {/* Breadcrumb */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:13 }}>
            <Link href="/rm/projects" style={{ color:T.primary, textDecoration:'none', fontWeight:500 }}>← My Projects</Link>
            <span style={{ color:T.textDim }}>/</span>
            <span style={{ color:T.text, fontWeight:600 }}>{project.id}</span>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>setShowUnlockModal(true)} style={{ ...btnSecondary, borderColor:T.warning, color:T.warning, fontSize:12 }}>
              🔓 Unlock Returns & Logistics
            </button>
            <button onClick={()=>{ setNewPM(''); setShowReassignModal(true); }} style={{ ...btnPrimary, fontSize:12 }}>
              🔄 Reassign Project Manager
            </button>
          </div>
        </div>

        {/* Project header */}
        <div style={{ ...card, marginBottom:16, padding:'20px 24px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                <h1 style={{ fontSize:20, fontWeight:800, color:T.text, margin:0 }}>{project.id}</h1>
                <span style={badge(STATUS_DISPLAY[project.status]||project.status)}>{STATUS_DISPLAY[project.status]||project.status}</span>
              </div>
              <div style={{ fontSize:14, color:T.textMuted }}>{project.projectName} · {project.site}</div>
              <div style={{ fontSize:13, color:T.textDim, marginTop:4 }}>📋 {project.type}</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, textAlign:'center' }}>
              {[
                { label:'PO Value', value:fmt(project.poValue), color:T.primary },
                { label:'PO Aging', value:`${project.aging}d`,  color:project.aging>30?T.danger:T.success },
                { label:'Progress', value:`${project.progress}%`, color:T.info },
              ].map((s,i)=>(
                <div key={i} style={{ background:T.bg, borderRadius:8, padding:'10px 16px' }}>
                  <div style={{ fontSize:11, color:T.textDim, marginBottom:4 }}>{s.label}</div>
                  <div style={{ fontSize:18, fontWeight:700, color:s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop:14, display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
            {[
              { label:'Project Manager', value:currentPM, highlight:true },
              { label:'Vendor',          value:project.vendor },
              { label:'Start Date',      value:project.startDate },
              { label:'End Date',        value:project.endDate },
            ].map((r,i)=>(
              <div key={i} style={{ padding:'10px 14px', background:r.highlight?T.primaryLight:T.bg, borderRadius:8, border:`1px solid ${r.highlight?T.primaryMid:T.border}` }}>
                <div style={{ fontSize:11, color:T.textDim, marginBottom:3 }}>{r.label}</div>
                <div style={{ fontSize:13, fontWeight:600, color:r.highlight?T.primary:T.text }}>{r.value}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:14 }}>
            <div style={{ fontSize:12, color:T.textMuted, marginBottom:6 }}>Overall Progress</div>
            <div style={{ height:8, background:T.border, borderRadius:4 }}>
              <div style={{ height:'100%', width:`${project.progress}%`, background:project.status==='delayed'?T.danger:T.primary, borderRadius:4 }} />
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div style={card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div style={{ fontSize:14, fontWeight:700, color:T.text }}>📝 Project Activity</div>
            <div style={{ display:'flex', gap:6, background:T.bg, padding:4, borderRadius:8 }}>
              {([['all','All'],['vendor','Vendor'],['pm','PM'],['billing','Billing']] as const).map(([t,l])=>(
                <button key={t} onClick={()=>setActiveTab(t)} style={tabStyle(t)}>{l}</button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:40, color:T.textDim }}>No activity recorded yet.</div>
          ) : (
            <div style={{ position:'relative' }}>
              <div style={{ position:'absolute', left:16, top:0, bottom:0, width:2, background:T.border }} />
              {filtered.map((log, i) => {
                const roleColors: Record<string,string> = { Vendor:T.info, PM:T.primary, RM:T.success, Billing:T.warning };
                const color = roleColors[log.role] || T.textDim;
                return (
                  <div key={i} style={{ display:'flex', gap:16, marginBottom:20, paddingLeft:10 }}>
                    <div style={{ width:24, height:24, borderRadius:'50%', background:color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, zIndex:1, marginTop:2 }}>
                      <span style={{ color:'#fff', fontSize:10, fontWeight:700 }}>{log.role[0]}</span>
                    </div>
                    <div style={{ flex:1, background:T.bg, borderRadius:10, padding:'10px 14px', border:`1px solid ${T.border}` }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                        <span style={{ fontSize:13, fontWeight:600, color:T.text }}>{log.action}</span>
                        <span style={{ fontSize:10, background:`${color}20`, color, padding:'2px 8px', borderRadius:20, fontWeight:600 }}>{log.role}</span>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <span style={{ fontSize:12, color:T.textMuted }}>By: {log.by}</span>
                        <span style={{ fontSize:11, color:T.textDim }}>{log.date}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Reassign PM Modal */}
        {showReassignModal && (
          <Modal title="🔄 Reassign Project Manager" onClose={()=>setShowReassignModal(false)} width={460}>
            <p style={{ fontSize:13, color:T.textMuted, marginBottom:4 }}>
              Current PM: <strong style={{ color:T.text }}>{currentPM}</strong>
            </p>
            <p style={{ fontSize:12, color:T.textDim, marginBottom:16 }}>
              Showing Project Managers in {project.region} region.
            </p>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:6 }}>Select New Project Manager *</label>
              <select value={newPM} onChange={e=>setNewPM(e.target.value)} style={{ ...inputStyle(), width:'100%', appearance:'none' as const }}>
                <option value="">Select Project Manager…</option>
                {regionPMs.map(m=><option key={m.id} value={m.full_name}>{m.full_name} — {m.designation}</option>)}
              </select>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:6 }}>Reason for Reassignment *</label>
              <textarea value={reassignReason} onChange={e=>setReassignReason(e.target.value)} placeholder="Explain why the PM is being reassigned…" rows={3}
                style={{ ...inputStyle(), width:'100%', resize:'vertical', boxSizing:'border-box' as const }} />
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
              <button onClick={()=>setShowReassignModal(false)} style={btnSecondary}>Cancel</button>
              <button onClick={handleReassign} style={btnPrimary}>✅ Confirm Reassignment</button>
            </div>
          </Modal>
        )}

        {/* Unlock Returns & Logistics Modal */}
        {showUnlockModal && (
          <Modal title="🔓 Unlock Return & Logistics Section" onClose={()=>setShowUnlockModal(false)} width={460}>
            <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13, color:T.warning }}>
              ⚠️ This will allow the Project Manager to fill in Return & Logistics details for this project.
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:6 }}>Reason for Unlocking *</label>
              <textarea value={unlockReason} onChange={e=>setUnlockReason(e.target.value)} placeholder="e.g. Vendor has completed work. Materials are being returned." rows={3}
                style={{ ...inputStyle(), width:'100%', resize:'vertical', boxSizing:'border-box' as const }} />
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
              <button onClick={()=>setShowUnlockModal(false)} style={btnSecondary}>Cancel</button>
              <button onClick={handleUnlock} style={{ ...btnPrimary, background:T.warning }}>🔓 Confirm Unlock</button>
            </div>
          </Modal>
        )}
      </div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
    </Layout>
  );
}
