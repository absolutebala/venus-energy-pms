import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { useAuth } from '@/context/AuthContext';
import { T, card, badge, th, td, btnPrimary, btnSecondary, inputStyle } from '@/lib/theme';

const allProjects: Record<string, any> = {
  'VE-2025-001': { id:'VE-2025-001', site:'Chennai North',     client:'Airtel', type:'Tower Erection',       vendors:['ABC Telecom Services','XYZ Infra Solutions'],  poValue:1850000, aging:12,  status:'in_progress',  progress:65,  region:'TN', pm:'Arun Kumar',   rm:'Ramesh Kumar', startDate:'01/04/2025', endDate:'30/06/2025', remarks:'Foundation work and reinforcement in progress.' },
  'VE-2025-002': { id:'VE-2025-002', site:'Bengaluru East',    client:'Jio',    type:'Tower Maintenance',    vendors:['XYZ Infra Solutions'],                           poValue:420000,  aging:78,  status:'submitted',    progress:80,  region:'KA', pm:'Priya Sharma', rm:'Ramesh Kumar', startDate:'01/03/2025', endDate:'30/04/2025', remarks:'Vendor has submitted for PM review.' },
  'VE-2025-003': { id:'VE-2025-003', site:'Hyderabad Central', client:'Vi',     type:'Component Replacement',vendors:['TowerTech Pvt Ltd'],                             poValue:760000,  aging:22,  status:'pm_approved',  progress:100, region:'TS', pm:'Arun Kumar',   rm:'Ramesh Kumar', startDate:'01/04/2025', endDate:'20/05/2025', remarks:'PM approved. Awaiting billing review.' },
  'VE-2025-004': { id:'VE-2025-004', site:'Chennai South',     client:'BSNL',   type:'Fiber Installation',   vendors:['NetConnect Services'],                           poValue:1230000, aging:12,  status:'in_progress',  progress:45,  region:'TN', pm:'Vijay Kumar',  rm:'Ramesh Kumar', startDate:'15/04/2025', endDate:'15/07/2025', remarks:'Fiber laying in progress.' },
  'VE-2025-005': { id:'VE-2025-005', site:'Coimbatore',        client:'Airtel', type:'Tower Erection',       vendors:['ABC Telecom Services'],                          poValue:2200000, aging:8,   status:'pending',      progress:10,  region:'TN', pm:'Arun Kumar',   rm:'Suresh Patel', startDate:'15/05/2025', endDate:'31/08/2025', remarks:'Site survey completed.' },
  'VE-2025-006': { id:'VE-2025-006', site:'Pune West',         client:'Jio',    type:'Civil Works',          vendors:['BuildRight Constructions'],                      poValue:540000,  aging:95,  status:'delayed',      progress:20,  region:'MH', pm:'Pooja Mehta',  rm:'Amit Sharma',  startDate:'01/02/2025', endDate:'30/04/2025', remarks:'Severely delayed.' },
  'VE-2025-007': { id:'VE-2025-007', site:'Mumbai Central',    client:'Vi',     type:'Power Works',          vendors:['PowerSys India'],                                poValue:890000,  aging:33,  status:'billing_review',progress:100, region:'MH', pm:'Pooja Mehta',  rm:'Amit Sharma',  startDate:'01/04/2025', endDate:'31/05/2025', remarks:'Billing checklist pending.' },
  'VE-2025-008': { id:'VE-2025-008', site:'Delhi NCR',         client:'Airtel', type:'Tower Maintenance',    vendors:['XYZ Infra Solutions'],                           poValue:380000,  aging:18,  status:'in_progress',  progress:55,  region:'DL', pm:'Rajeev Singh', rm:'Amit Sharma',  startDate:'01/05/2025', endDate:'31/05/2025', remarks:'Antenna replacement done.' },
  'VE-2025-009': { id:'VE-2025-009', site:'Kochi',             client:'BSNL',   type:'Component Replacement',vendors:['TowerTech Pvt Ltd'],                             poValue:650000,  aging:62,  status:'delayed',      progress:40,  region:'KL', pm:'Vijay Kumar',  rm:'Suresh Patel', startDate:'01/03/2025', endDate:'30/04/2025', remarks:'Awaiting parts.' },
  'VE-2025-010': { id:'VE-2025-010', site:'Kolkata North',     client:'Jio',    type:'Fiber Installation',   vendors:['NetConnect Services'],                           poValue:975000,  aging:5,   status:'pending',      progress:0,   region:'WB', pm:'Neha Verma',   rm:'Suresh Patel', startDate:'01/06/2025', endDate:'31/08/2025', remarks:'Not yet started.' },
};

const STATUS_FLOW: Record<string,{label:string;color:string}> = {
  pending:       { label:'Pending',              color:'#D97706' },
  in_progress:   { label:'In Progress',          color:'#2563EB' },
  submitted:     { label:'Submitted for Review', color:'#7C3AED' },
  under_review:  { label:'Under PM Review',      color:'#7C3AED' },
  rejected:      { label:'Rejected',             color:'#DC2626' },
  pm_approved:   { label:'PM Approved',          color:'#0D9488' },
  billing_review:{ label:'Billing Review',       color:'#D97706' },
  completed:     { label:'Completed',            color:'#16A34A' },
  delayed:       { label:'Delayed',              color:'#DC2626' },
};

const DOC_TYPES = [
  { key:'safety_photos',    label:'Safety Photos'    },
  { key:'site_photos',      label:'Site Photos'      },
  { key:'jmr_document',     label:'JMR Document'     },
  { key:'ac_certificate',   label:'AC Certificate'   },
  { key:'noc_document',     label:'NOC Document'     },
  { key:'drawing_document', label:'Drawing Document' },
];

const activityLog = [
  { date:'20/05/2025 04:45 PM', action:'Work status updated to In Progress', by:'Vendor', role:'Vendor'          },
  { date:'20/05/2025 12:15 PM', action:'Site Photos uploaded',                by:'ABC Telecom', role:'Vendor'    },
  { date:'20/05/2025 09:30 AM', action:'Safety Photos uploaded',              by:'ABC Telecom', role:'Vendor'    },
  { date:'19/05/2025 05:00 PM', action:'Project allocated to vendor',          by:'Arun Kumar', role:'PM'        },
  { date:'18/05/2025 10:00 AM', action:'Project created',                      by:'Ramesh Kumar', role:'RM'     },
];

export default function ProjectDetailPage() {
  const router = useRouter();
  const { id }  = router.query;
  const { profile } = useAuth();
  const [projects, setProjects] = useState(allProjects);
  const [toast, setToast] = useState<{msg:string;type:'success'|'error'|'info'}|null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [billingChecklist, setBillingChecklist] = useState({ stn:false, srn:false, ptw:false });
  const [billingNotes, setBillingNotes] = useState('');

  const project = id ? projects[id as string] : null;
  const isAdmin = profile?.role !== 'vendor';
  const isPM    = profile?.role === 'project_manager' || profile?.role === 'super_admin';
  const isBilling = profile?.role === 'super_admin' || profile?.role === 'region_manager';

  if (!id) return <Layout><div style={{ padding:40, textAlign:'center', color:T.textMuted }}>Loading…</div></Layout>;
  if (!project) return (
    <Layout>
      <div style={{ ...card, textAlign:'center', padding:60 }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🔍</div>
        <h2 style={{ fontSize:20, fontWeight:700, color:T.text, marginBottom:8 }}>Project Not Found</h2>
        <Link href="/projects" style={{ background:T.primary, color:'#fff', borderRadius:8, padding:'10px 20px', fontSize:13, fontWeight:600, textDecoration:'none' }}>← Back to Projects</Link>
      </div>
    </Layout>
  );

  const p = project;
  const status = STATUS_FLOW[p.status] || STATUS_FLOW.pending;
  const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`;

  const updateStatus = (newStatus: string, msg: string) => {
    setProjects(prev => ({ ...prev, [p.id]: { ...prev[p.id], status:newStatus } }));
    setToast({ msg, type:'success' });
  };

  const handlePMApprove = () => {
    updateStatus('pm_approved', 'Project approved and sent to Billing team!');
  };

  const handlePMReject = () => {
    if (!rejectReason.trim()) { setToast({ msg:'Please provide rejection reason.', type:'error' }); return; }
    updateStatus('rejected', `Project rejected and sent back to vendor. Reason: ${rejectReason}`);
    setShowRejectModal(false); setRejectReason('');
  };

  const handleBillingDone = () => {
    if (!billingChecklist.stn || !billingChecklist.srn || !billingChecklist.ptw) {
      setToast({ msg:'Please complete all checklist items before marking billing done.', type:'error' });
      return;
    }
    updateStatus('completed', 'Billing review complete. Project marked as Completed!');
  };

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
                <span style={{ background:`${status.color}15`, color:status.color, border:`1px solid ${status.color}40`, padding:'3px 12px', borderRadius:20, fontSize:12, fontWeight:700 }}>{status.label}</span>
              </div>
              <div style={{ fontSize:14, color:T.textMuted }}>{p.site} · {p.region} · {p.client}</div>
              <div style={{ fontSize:13, color:T.textDim, marginTop:4 }}>📋 {p.type}</div>
            </div>
          </div>
          <div style={{ marginTop:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:T.textMuted, marginBottom:6 }}>
              <span>Overall Progress</span>
              <span style={{ fontWeight:700, color:p.progress===100?T.success:p.status==='delayed'?T.danger:T.primary }}>{p.progress}%</span>
            </div>
            <div style={{ height:8, background:T.border, borderRadius:4 }}>
              <div style={{ height:'100%', width:`${p.progress}%`, background:p.progress===100?T.success:p.status==='delayed'?T.danger:T.primary, borderRadius:4, transition:'width 0.5s' }} />
            </div>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
          {/* Project Details */}
          <div style={card}>
            <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:14, paddingBottom:10, borderBottom:`1px solid ${T.border}` }}>📋 Project Details</div>
            {[
              ['Project No',      p.id],
              ['Site Name',       p.site],
              ['Region',          p.region],
              ['Client',          p.client],
              ['Job Type',        p.type],
              ['Start Date',      p.startDate],
              ['End Date',        p.endDate],
              ['Region Manager',  p.rm],
              ['Project Manager', p.pm],
              ['Vendors',         p.vendors.join(', ')],
            ].map(([label, value]) => (
              <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:`1px solid ${T.border}`, fontSize:13 }}>
                <span style={{ color:T.textMuted }}>{label}</span>
                <span style={{ fontWeight:600, color:T.text, textAlign:'right', maxWidth:'60%' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Financial — only for admin */}
          {isAdmin && (
            <div style={card}>
              <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:14, paddingBottom:10, borderBottom:`1px solid ${T.border}` }}>💰 Financial Summary</div>
              {[
                { label:'PO Value',       value:fmt(p.poValue),           color:T.text    },
                { label:'Billed Amount',  value:fmt(p.poValue*0.63),      color:T.success },
                { label:'Paid Amount',    value:fmt(p.poValue*0.56),      color:T.success },
                { label:'Pending',        value:fmt(p.poValue*0.37),      color:T.warning },
                { label:'PO Aging',       value:`${p.aging} days`,        color:p.aging>60?T.danger:p.aging>30?T.warning:T.success },
              ].map((r) => (
                <div key={r.label} style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:`1px solid ${T.border}`, fontSize:13 }}>
                  <span style={{ color:T.textMuted }}>{r.label}</span>
                  <span style={{ fontWeight:700, color:r.color }}>{r.value}</span>
                </div>
              ))}
              <div style={{ marginTop:12, padding:12, background:T.primaryLight, borderRadius:8 }}>
                <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Remarks</div>
                <div style={{ fontSize:12, color:T.text, lineHeight:1.5 }}>{p.remarks}</div>
              </div>
            </div>
          )}
        </div>

        {/* Document Status */}
        <div style={{ ...card, marginBottom:16 }}>
          <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:14, paddingBottom:10, borderBottom:`1px solid ${T.border}` }}>📂 Work Documents</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:12 }}>
            {DOC_TYPES.map((doc, i) => {
              const uploaded = i < 2; // mock: first 2 are uploaded
              return (
                <div key={doc.key} style={{ textAlign:'center', padding:'14px 8px', background:uploaded?T.successBg:T.bg, border:`1px solid ${uploaded?'#BBF7D0':T.border}`, borderRadius:10, borderTop:`3px solid ${uploaded?T.success:T.border}` }}>
                  <div style={{ fontSize:24, marginBottom:6 }}>
                    {doc.key.includes('photo') ? '📷' : doc.key.includes('jmr') ? '📄' : doc.key.includes('ac') ? '🏅' : doc.key.includes('noc') ? '📋' : '📐'}
                  </div>
                  <div style={{ fontSize:11, fontWeight:600, color:T.text, marginBottom:4 }}>{doc.label}</div>
                  <span style={{ fontSize:10, fontWeight:700, color:uploaded?T.success:T.textDim, background:uploaded?T.successBg:T.bg, padding:'2px 8px', borderRadius:10 }}>
                    {uploaded ? '✓ Uploaded' : 'Pending'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── PM Review Section — visible after vendor submits ── */}
        {isAdmin && (p.status === 'submitted' || p.status === 'under_review') && (
          <div style={{ ...card, marginBottom:16, border:`2px solid ${T.purple}` }}>
            <div style={{ fontSize:14, fontWeight:700, color:T.purple, marginBottom:14, paddingBottom:10, borderBottom:`1px solid ${T.border}` }}>
              🔍 PM Review — Submitted for Approval
            </div>
            <div style={{ background:'#F5F3FF', border:'1px solid #DDD6FE', borderRadius:8, padding:12, marginBottom:16, fontSize:13, color:'#5B21B6' }}>
              Vendor has submitted this project for PM review. Please review all uploaded documents above before approving or rejecting.
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:6 }}>Review Notes (optional)</label>
              <textarea value={reviewNotes} onChange={e=>setReviewNotes(e.target.value)} placeholder="Add your review comments…" rows={3}
                style={{ ...inputStyle(), width:'100%', resize:'vertical', boxSizing:'border-box' as const }} />
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={handlePMApprove} style={{ ...btnPrimary, background:T.success }}>
                ✅ Approve — Send to Billing
              </button>
              <button onClick={() => setShowRejectModal(true)} style={{ ...btnSecondary, borderColor:T.danger, color:T.danger }}>
                ❌ Reject — Send Back to Vendor
              </button>
            </div>
          </div>
        )}

        {/* ── Billing Review Section ── */}
        {isAdmin && (p.status === 'pm_approved' || p.status === 'billing_review') && (
          <div style={{ ...card, marginBottom:16, border:`2px solid ${T.warning}` }}>
            <div style={{ fontSize:14, fontWeight:700, color:T.warning, marginBottom:14, paddingBottom:10, borderBottom:`1px solid ${T.border}` }}>
              💳 Billing Review Checklist
            </div>
            <div style={{ background:T.warningBg, border:'1px solid #FDE68A', borderRadius:8, padding:12, marginBottom:16, fontSize:13, color:T.warning }}>
              PM has approved this project. Complete the billing checklist to finalise.
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:16 }}>
              {[
                { key:'stn', label:'STN Done', desc:'Store Transfer Note completed' },
                { key:'srn', label:'SRN Done', desc:'Store Return Note completed'   },
                { key:'ptw', label:'PTW Done', desc:'Permit to Work completed'       },
              ].map(item => (
                <div key={item.key} onClick={()=>setBillingChecklist(prev=>({...prev,[item.key]:!prev[item.key as keyof typeof prev]}))}
                  style={{ padding:14, borderRadius:10, border:`2px solid ${billingChecklist[item.key as keyof typeof billingChecklist]?T.success:T.border}`, background:billingChecklist[item.key as keyof typeof billingChecklist]?T.successBg:'#fff', cursor:'pointer', transition:'all 0.15s' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:22, height:22, borderRadius:6, border:`2px solid ${billingChecklist[item.key as keyof typeof billingChecklist]?T.success:T.border}`, background:billingChecklist[item.key as keyof typeof billingChecklist]?T.success:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {billingChecklist[item.key as keyof typeof billingChecklist] && <span style={{ color:'#fff', fontSize:13, fontWeight:700 }}>✓</span>}
                    </div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:T.text }}>{item.label}</div>
                      <div style={{ fontSize:11, color:T.textMuted }}>{item.desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:6 }}>Billing Notes / Invoice Reference</label>
              <textarea value={billingNotes} onChange={e=>setBillingNotes(e.target.value)} placeholder="Add invoice reference number or billing notes…" rows={3}
                style={{ ...inputStyle(), width:'100%', resize:'vertical', boxSizing:'border-box' as const }} />
            </div>

            <button onClick={handleBillingDone} style={{ ...btnPrimary, background:T.success }}>
              ✅ Mark Billing Done — Complete Project
            </button>
          </div>
        )}

        {/* Completed status */}
        {p.status === 'completed' && (
          <div style={{ ...card, marginBottom:16, background:T.successBg, border:`2px solid ${T.success}` }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ fontSize:32 }}>🎉</div>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:T.success }}>Project Completed!</div>
                <div style={{ fontSize:13, color:T.textMuted }}>All stages complete. Billing has been processed.</div>
              </div>
            </div>
          </div>
        )}

        {/* Activity Log */}
        <div style={card}>
          <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:14, paddingBottom:10, borderBottom:`1px solid ${T.border}` }}>📝 Activity Log</div>
          <table style={{ width:'100%' }}>
            <thead><tr>{['Date & Time','Activity','By','Role'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
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

        {/* Reject Modal */}
        {showRejectModal && (
          <Modal title="❌ Reject Project" onClose={() => setShowRejectModal(false)} width={460}>
            <p style={{ fontSize:13, color:T.textMuted, marginBottom:16 }}>Provide the reason for rejection. This will be sent to the vendor.</p>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:6 }}>Rejection Reason *</label>
              <textarea value={rejectReason} onChange={e=>setRejectReason(e.target.value)} placeholder="e.g. Missing NOC document, safety photos unclear…" rows={4}
                style={{ ...inputStyle(), width:'100%', resize:'vertical', boxSizing:'border-box' as const }} />
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
              <button onClick={() => setShowRejectModal(false)} style={btnSecondary}>Cancel</button>
              <button onClick={handlePMReject} style={{ ...btnPrimary, background:T.danger }}>❌ Reject & Notify Vendor</button>
            </div>
          </Modal>
        )}

        {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </Layout>
  );
}
