// v-fix-braces
import { createClient } from '@/lib/supabase';
import React, { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import { useInvoices } from '@/context/InvoiceContext';
import { useExpenses } from '@/context/ExpenseContext';
import { useWorkDocs } from '@/context/WorkDocContext';
import DateInput from '@/components/DateInput';
import { useMaterial } from '@/context/MaterialContext';
import { usePOItems } from '@/context/POItemContext';
import { useWorkProgress } from '@/context/WorkProgressContext';
import { useActivity } from '@/context/ActivityContext';
import { PROJECTS as SEED_PROJECTS } from '@/lib/seedData'; // fallback only
import CreatableSelect from '@/components/CreatableSelect';
import Toast from '@/components/Toast';
import { useProjects } from '@/context/ProjectContext';
import { useAuth } from '@/context/AuthContext';
import { useUpload } from '@/lib/useUpload';
import { T, card, badge, btnPrimary, btnSecondary, inputStyle } from '@/lib/theme';
import { PAYMENT_TRANSACTIONS, PaymentTransaction } from '@/lib/expensesData'; // payment log

// ── Mock project data ────────────────────────────────────────────
const PROJECT_DB: Record<string,any> = {
  'VE-2025-001': { id:'VE-2025-001', ptwTicketId:'PTW-2025-1001', ptwSupervisor:'Rajesh Kumar', ptwDateFrom:'2025-04-01', ptwDateTo:'2025-06-30', projectName:'Chennai Metro Phase II', poNo:'PO-2025-001', indusId:'IND-1001', site:'Chennai North', region:'Tamil Nadu', type:'Tower Erection', status:'in_progress', progress:65, poValue:1850000, billedAmount:1200000, paidAmount:950000, startDate:'2025-04-01', endDate:'2025-06-30', rm:'Ramesh Kumar', pm:'Arun Kumar', vendor:'ABC Telecom Services', vendorContact:'Rajesh Kumar', vendorPhone:'+91 98765 43210', vendorEmail:'rajesh@abctelecom.com', workScope:'Civil foundation and structure works for Station 3 & 4.', remarks:'Foundation work in progress.' },
  'VE-2025-002': { id:'VE-2025-002', ptwTicketId:'PTW-2025-1002', ptwSupervisor:'Vikram Singh', ptwDateFrom:'2025-03-01', ptwDateTo:'2025-04-30', projectName:'Bengaluru East Maint.',  poNo:'PO-2025-001', indusId:'IND-1002', site:'Bengaluru East', region:'Karnataka',  type:'Tower Maintenance', status:'delayed', progress:30, poValue:420000, billedAmount:150000, paidAmount:100000, startDate:'2025-03-01', endDate:'2025-04-30', rm:'Amit Sharma', pm:'Priya Sharma', vendor:'XYZ Infra Solutions', vendorContact:'Priya Sharma', vendorPhone:'+91 98765 43211', vendorEmail:'priya@xyzinfra.com', workScope:'Antenna replacement and tower painting.', remarks:'Delayed due to material shortage.' },
  'VE-2025-003': { id:'VE-2025-003', ptwTicketId:'PTW-2025-1003', ptwSupervisor:'Arun Singh', ptwDateFrom:'2025-04-10', ptwDateTo:'2025-05-20', projectName:'Hyderabad Component',    poNo:'PO-2025-002', indusId:'IND-1003', site:'Hyderabad',      region:'Tamil Nadu', type:'Component Replace', status:'billing_review', progress:100, poValue:760000, billedAmount:760000, paidAmount:600000, startDate:'2025-04-10', endDate:'2025-05-20', rm:'Ramesh Kumar', pm:'Arun Kumar', vendor:'TowerTech Pvt Ltd', vendorContact:'Arun Singh', vendorPhone:'+91 98765 43212', vendorEmail:'arun@towertech.com', workScope:'RRU replacement and fiber termination.', remarks:'PM approved. Pending billing.' },
  'VE-2025-004': { id:'VE-2025-004', ptwTicketId:'', ptwSupervisor:'', ptwDateFrom:'', ptwDateTo:'', projectName:'Chennai Fiber Network',  poNo:'PO-2025-002', indusId:'IND-1004', site:'Chennai South', region:'Tamil Nadu', type:'Fiber Installation', status:'in_progress', progress:45, poValue:1230000, billedAmount:500000, paidAmount:400000, startDate:'2025-04-20', endDate:'2025-07-15', rm:'Ramesh Kumar', pm:'Vijay Kumar', vendor:'', vendorContact:'', vendorPhone:'', vendorEmail:'', workScope:'Fiber laying along Station 5-12.', remarks:'Vendor not assigned yet.' },
  'VE-2025-005': { id:'VE-2025-005', ptwTicketId:'', ptwSupervisor:'', ptwDateFrom:'', ptwDateTo:'', projectName:'Coimbatore Tower',       poNo:'PO-2025-003', indusId:'IND-1005', site:'Coimbatore',   region:'Tamil Nadu', type:'Tower Erection',    status:'pending', progress:10, poValue:2200000, billedAmount:0, paidAmount:0, startDate:'2025-05-01', endDate:'2025-08-31', rm:'Ramesh Kumar', pm:'Arun Kumar', vendor:'', vendorContact:'', vendorPhone:'', vendorEmail:'', workScope:'New tower erection at Coimbatore North.', remarks:'Site survey completed.' },
  'VE-2025-006': { id:'VE-2025-006', ptwTicketId:'', ptwSupervisor:'', ptwDateFrom:'', ptwDateTo:'', projectName:'Pune Civil Works',       poNo:'PO-2025-003', indusId:'IND-1006', site:'Pune West',     region:'Maharashtra', type:'Civil Works',     status:'delayed', progress:20, poValue:540000, billedAmount:100000, paidAmount:80000, startDate:'2025-02-01', endDate:'2025-04-30', rm:'Amit Sharma', pm:'Pooja Mehta', vendor:'BuildRight Constructions', vendorContact:'Vikram Patel', vendorPhone:'+91 98765 43214', vendorEmail:'vikram@buildright.com', workScope:'RCC foundation and retaining wall.', remarks:'Severely delayed.' },
  'VE-2025-007': { id:'VE-2025-007', ptwTicketId:'', ptwSupervisor:'', ptwDateFrom:'', ptwDateTo:'', projectName:'Mumbai Power Works',     poNo:'PO-2025-004', indusId:'IND-1007', site:'Mumbai Central', region:'Maharashtra', type:'Power Works',   status:'billing_review', progress:100, poValue:890000, billedAmount:890000, paidAmount:700000, startDate:'2025-04-05', endDate:'2025-05-31', rm:'Amit Sharma', pm:'Pooja Mehta', vendor:'PowerSys India', vendorContact:'Sunita Reddy', vendorPhone:'+91 98765 43215', vendorEmail:'sunita@powersys.com', workScope:'DG set installation and power cabling.', remarks:'Completed. Billing review pending.' },
  'VE-2025-008': { id:'VE-2025-008', ptwTicketId:'', ptwSupervisor:'', ptwDateFrom:'', ptwDateTo:'', projectName:'Delhi NCR Maintenance',  poNo:'PO-2025-004', indusId:'IND-1008', site:'Delhi NCR',     region:'Delhi',      type:'Tower Maintenance', status:'in_progress', progress:55, poValue:380000, billedAmount:200000, paidAmount:180000, startDate:'2025-05-01', endDate:'2025-05-31', rm:'Amit Sharma', pm:'Rajeev Singh', vendor:'XYZ Infra Solutions', vendorContact:'Priya Sharma', vendorPhone:'+91 98765 43211', vendorEmail:'priya@xyzinfra.com', workScope:'Tower antenna realignment.', remarks:'In progress.' },
  'VE-2025-009': { id:'VE-2025-009', ptwTicketId:'', ptwSupervisor:'', ptwDateFrom:'', ptwDateTo:'', projectName:'Kochi Component Repl.', poNo:'PO-2025-005', indusId:'IND-1009', site:'Kochi',         region:'Kerala',     type:'Component Replace', status:'delayed', progress:40, poValue:650000, billedAmount:250000, paidAmount:200000, startDate:'2025-03-01', endDate:'2025-04-30', rm:'Ramesh Kumar', pm:'Vijay Kumar', vendor:'TowerTech Pvt Ltd', vendorContact:'Arun Singh', vendorPhone:'+91 98765 43212', vendorEmail:'arun@towertech.com', workScope:'Feeder cable replacement.', remarks:'Delayed — parts awaited.' },
  'VE-2025-010': { id:'VE-2025-010', ptwTicketId:'', ptwSupervisor:'', ptwDateFrom:'', ptwDateTo:'', projectName:'Kolkata Fiber Install.', poNo:'PO-2025-005', indusId:'IND-1010', site:'Kolkata North', region:'West Bengal', type:'Fiber Installation', status:'pending', progress:0, poValue:975000, billedAmount:0, paidAmount:0, startDate:'2025-06-01', endDate:'2025-08-31', rm:'Ramesh Kumar', pm:'Arun Kumar', vendor:'', vendorContact:'', vendorPhone:'', vendorEmail:'', workScope:'Underground fiber ducting.', remarks:'Not started.' },
};


// VENDOR_LIST replaced by Supabase fetch — see vendorList state below


const PO_ITEMS_DB: Record<string,any[]> = {
  'VE-2025-001':[
    {id:1,description:'Steel Lattice Tower 30m',hsn:'7308',uom:'Set',quantity:4,rate:450000,gst:18,amount:1800000},
    {id:2,description:'Foundation Concrete M40',hsn:'3824',uom:'Cum',quantity:80,rate:9500,gst:12,amount:760000},
    {id:3,description:'Anchor Bolt Set M36',hsn:'7318',uom:'Set',quantity:16,rate:8500,gst:18,amount:136000},
  ],
  'VE-2025-003':[
    {id:1,description:'Offshore Tower 40m GI',hsn:'7308',uom:'Set',quantity:2,rate:850000,gst:18,amount:1700000},
    {id:2,description:'High Tensile Bolts M48',hsn:'7318',uom:'Nos',quantity:96,rate:1200,gst:18,amount:115200},
  ],
  'VE-2025-007':[
    {id:1,description:'Greenfield Tower 25m',hsn:'7308',uom:'Set',quantity:3,rate:380000,gst:18,amount:1140000},
    {id:2,description:'Equipment Shelter 3x3m',hsn:'9406',uom:'Nos',quantity:3,rate:95000,gst:18,amount:285000},
  ],
  'VE-2025-015':[
    {id:1,description:'Metro Tower 35m',hsn:'7308',uom:'Set',quantity:6,rate:520000,gst:18,amount:3120000},
    {id:2,description:'Foundation Piling Work',hsn:'3824',uom:'Nos',quantity:24,rate:35000,gst:12,amount:840000},
  ],
};const SRN_DATA_DB: Record<string, Record<number,{utilisedQty:number|null;returned:boolean;approved:boolean}>> = {
  'VE-2025-001': { 1:{utilisedQty:4,returned:true,approved:true}, 2:{utilisedQty:140,returned:false,approved:false}, 3:{utilisedQty:96,returned:true,approved:false} },
  'VE-2025-002': { 1:{utilisedQty:6,returned:false,approved:false}, 2:{utilisedQty:14,returned:true,approved:true} },
  'VE-2025-003': { 1:{utilisedQty:6,returned:true,approved:true}, 2:{utilisedQty:22,returned:true,approved:true} },
};

const UOM_OPTIONS = ['Set','Nos','MT','RMT','Cum','Bag','Box','Lot','KG','Mtr'];
const GST_OPTIONS = ['0','5','12','18','28'];

const VENDORS = ['ABC Telecom Services','XYZ Infra Solutions','TowerTech Pvt Ltd','NetConnect Services','PowerSys India','BuildRight Constructions'];
const PROJECT_STATUS_OPTIONS = [
  'Already Billed with Another PO',
  'Allocation Not Received',
  'Site Issues',
  'Site Hold',
  'LL Issues',
  'Work Not Done',
  'Yet to Start',
  'CR Pending',
  'SRN BOQ Pending',
  'SRN Document Correction Pending',
  'Fresh to be Return',
  'Work In Progress',
  'Work Completed / Approval Pending',
  'JMS Pending with AE',
  'Billing Shared',
  'PO Not Reflected',
  'PO Amendment Done',
  'WCC Raised',
  'Invoice to be Submit / SRN Pending',
  'Invoice to be Submit / Approval Pending',
  'Invoice to be Submit / PTW Pending',
  'Invoice Submitted – Payment Pending',
  'Invoice Submitted – Payment Received',
];

const REGIONS  = ['Tamil Nadu','Karnataka','Telangana','Maharashtra','Delhi','Kerala','West Bengal'];
const TYPES    = ['SMPS Installation','Supply and Service for Tower Strengthening','AC Transportation','Minor','Major','Gate Service','Solar','DISMANLTING','Fence erection','DG REPLACEMENT','Lightening Arrestor','BB Installation','DG Dismantling','Civil','Lithum Ion BB Installation','DG DISMATNLING','New Build','Shelter Dismantling','HPSC','DG CAM','Transportation for Tower Strengthening','TM Service','Transportation Charges for Goods','Shelter Floor Sagging','SP Installation','Cable Replacement Activity','JV for Tower Strengthening','Civil - Earthing Correction activity','dewatering activity','Cable Ladder Installation activity','SRN TRANSPORTATION','SPS & SMPS installation','DG Canopy Rectification','Fuel Filling Charges','DG addition','Survey Charges - UG Cable','UG Cable rectification','Cyclone Preparedness','AC REPLACEMENT','Civil Dismantling Activity','New Build EB Meter Box','Survey charges','BACK FILLING','PU Coating','BB ADDITIONAL','Shelter leakage','Solar panel replacement','Earthing Activity','Solar Reward','POLE INSTALLATION','SPS REPLACEMENT','Zinc Spray for Tower Maintenance','EGB INSTALLATION','Sharing shelter','Cable Tray INSTALLATION','Pole Maintenance','Zinc Spray for Pole Maintenance','Cable Routing LADDER Fallen','COW Tower Dismantling','TCU INSTALLATION','Supply for Tower strengthening','Electrical Activity','DG Installation','Tarpaulin Activity','LA and LA Strip connection activity','Tower Dismantling','LA installation','Survey of COW sites','Survey of Civil','DG RELOCATION','Others'];

const DOC_TYPES = [
  { key:'safety_photos',   label:'Safety Photos',   icon:'📷', accept:'image/*'           },
  { key:'site_photos',     label:'Site Photos',     icon:'🏗',  accept:'image/*,.pdf'           },
  { key:'jmr_document',   label:'Document Approvals / JMS',    icon:'📄', accept:'.pdf,.doc,.docx'    },
  { key:'at_certificate', label:'AT Certificate',  icon:'🏅', accept:'.pdf,.doc,.docx'    },
  { key:'noc_document',   label:'NOC Document',    icon:'📋', accept:'.pdf,.doc,.docx'    },
  { key:'drawing_document',label:'Drawing Document',icon:'📐', accept:'.pdf,.dwg,.png,.jpg'},
  { key:'ptw_document',   label:'PTW Document',     icon:'🔑', accept:'.pdf,.doc,.docx'    },
];

const LEGACY_MOCK_DOCS: Record<string, { name:string; size:string; url:string; isImage:boolean }[]> = {
  safety_photos:    [{ name:'safety_site_01.jpg', size:'1.2 MB', url:'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400', isImage:true },{ name:'safety_ppe.jpg', size:'980 KB', url:'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400', isImage:true }],
  site_photos:      [{ name:'site_progress.jpg', size:'2.1 MB', url:'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=400', isImage:true }],
  jmr_document:     [{ name:'JMR_VE2025001.pdf', size:'456 KB', url:'', isImage:false }],
  at_certificate:   [],
  noc_document:     [],
  drawing_document: [{ name:'AsBuilt_Drawing_v2.pdf', size:'1.8 MB', url:'', isImage:false }],
};

const STATUS_FLOW = ['pending','in_progress','submitted','under_review','pm_approved','billing_review','completed','delayed'];
const STATUS_LABELS: Record<string,string> = { pending:'Pending', in_progress:'In Progress', submitted:'Submitted', under_review:'Under Review', pm_approved:'PM Approved', billing_review:'Billing Review', completed:'Completed', delayed:'Delayed' };
const STATUS_COLOR: Record<string,string>  = { pending:'#D97706', in_progress:'#2563EB', submitted:'#7C3AED', under_review:'#7C3AED', pm_approved:'#0D9488', billing_review:'#D97706', completed:'#16A34A', delayed:'#DC2626' };

// Activity log is combined with payment transactions
const BASE_ACTIVITY_LOG = [
  { date:'20/05/2025 04:45 PM', action:'Site Photos uploaded by vendor', by:'ABC Telecom Services', role:'Vendor'  },
  { date:'19/05/2025 05:00 PM', action:'Vendor assigned to project',     by:'Arun Kumar',           role:'PM'      },
  { date:'18/05/2025 03:00 PM', action:'PM review notes added',          by:'Arun Kumar',           role:'PM'      },
  { date:'17/05/2025 10:00 AM', action:'Invoice INV-2025-012 submitted', by:'Finance Team',         role:'Billing' },
  { date:'15/05/2025 09:00 AM', action:'Project created',                by:'Ramesh Kumar',         role:'RM'      },
];

const fmtDate = (d: string) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); } catch { return d; } };
const fmt = (v:number) => `₹${v.toLocaleString('en-IN')}`;



// ── Work Progress Section ────────────────────────────────────────────────────
function WorkProgressSection({ projectId, role }: { projectId: string; role: string }) {
  const { getByProject, addItem, updateItem, deleteItem } = useWorkProgress();
  const { profile, can } = useAuth();
  const items = getByProject(projectId);
  const isVendor = role === 'vendor';
  // Respect actual Role & Permissions settings for create/edit, instead of hardcoding to vendor only
  const canCreateWP = isVendor || can('sec_work_progress', 'create');
  const canEditWP   = isVendor || can('sec_work_progress', 'edit');
  const canDeleteWP = can('sec_work_progress', 'delete');
  const today = new Date().toISOString().split('T')[0];
  const [adding,  setAdding]  = React.useState(false);
  const [saving,  setSaving]  = React.useState(false);
  const [editId,  setEditId]  = React.useState<string|null>(null);
  const [editRow, setEditRow] = React.useState<any>({});
  const [toast,   setToast]   = React.useState<any>(null);
  const [newRow,  setNewRow]  = React.useState({
    workDate: today, workDescription: '', workStatus: '', totalWorkStatus: '', remarks: ''
  });

  const thS: React.CSSProperties = { padding:'8px 10px', fontSize:10, fontWeight:700,
    textTransform:'uppercase', color:T.primary, background:T.primaryLight,
    textAlign:'left' as const, borderBottom:`2px solid ${T.primaryMid}`, whiteSpace:'nowrap' as const };
  const tdS: React.CSSProperties = { padding:'9px 10px', fontSize:12,
    borderBottom:`1px solid ${T.border}`, verticalAlign:'middle' as const };
  const inpS: React.CSSProperties = { border:`1px solid ${T.border}`, borderRadius:6,
    padding:'6px 10px', fontSize:12, width:'100%', boxSizing:'border-box' as const, outline:'none' };
  const labelS: React.CSSProperties = { display:'block', fontSize:10, fontWeight:600,
    color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const };

  const saveNew = async () => {
    if (!newRow.workDate || !newRow.workDescription) return;
    setSaving(true);
    try {
      await addItem({ projectId, ...newRow, createdBy: profile?.full_name || '' });
      setNewRow({ workDate: today, workDescription: '', workStatus: '', totalWorkStatus: '', remarks: '' });
      setAdding(false);
      setToast({ msg:'✅ Work progress added', type:'success' });
    } catch(err:any) { setToast({ msg:'❌ ' + err.message, type:'error' }); }
    finally { setSaving(false); }
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await updateItem(editId!, editRow);
      setEditId(null);
      setToast({ msg:'✅ Updated', type:'success' });
    } catch(err:any) { setToast({ msg:'❌ ' + err.message, type:'error' }); }
    finally { setSaving(false); }
  };

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';

  return (
    <div>
      {toast && <div style={{ padding:'8px 14px', borderRadius:8, marginBottom:10, fontSize:13, fontWeight:600,
        background:toast.type==='success'?'#D1FAE5':'#FEE2E2', color:toast.type==='success'?'#059669':'#DC2626' }}
        onClick={()=>setToast(null)}>{toast.msg}</div>}
      {items.length > 0 && (
        <div style={{ overflowX:'auto' as const, marginBottom:12 }}>
          <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
            <thead><tr>{['#','Work Date','Work Description','Work Status','Total Work Status','Remarks',''].map((h,i)=>(
              <th key={i} style={thS}>{h}</th>
            ))}</tr></thead>
            <tbody>
              {items.map((item:any, idx:number) => (
                <React.Fragment key={item.id}>
                  <tr style={{ background:idx%2===0?'#fff':T.bg }}>
                    <td style={{ ...tdS, color:T.textMuted, width:32 }}>{idx+1}</td>
                    {editId === item.id ? (
                      <>
                        <td style={tdS}><DateInput value={editRow.workDate||''} onChange={v=>setEditRow((p:any)=>({...p,workDate:v}))} style={inpS} /></td>
                        <td style={tdS}><input value={editRow.workDescription||''} onChange={e=>setEditRow((p:any)=>({...p,workDescription:e.target.value}))} style={inpS} /></td>
                        <td style={tdS}><input value={editRow.workStatus||''} onChange={e=>setEditRow((p:any)=>({...p,workStatus:e.target.value}))} style={inpS} /></td>
                        <td style={tdS}><input value={editRow.totalWorkStatus||''} onChange={e=>setEditRow((p:any)=>({...p,totalWorkStatus:e.target.value}))} style={inpS} /></td>
                        <td style={tdS}><input value={editRow.remarks||''} onChange={e=>setEditRow((p:any)=>({...p,remarks:e.target.value}))} style={inpS} /></td>
                        <td style={{ ...tdS, whiteSpace:'nowrap' as const }}>
                          <button onClick={saveEdit} disabled={saving} style={{ background:T.primary, color:'#fff', border:'none', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:11, marginRight:4 }}>✓ Save</button>
                          <button onClick={()=>setEditId(null)} style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:11 }}>✕</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ ...tdS, whiteSpace:'nowrap' as const, color:T.textMuted }}>{fmtDate(item.workDate)}</td>
                        <td style={tdS}>{item.workDescription||'—'}</td>
                        <td style={tdS}>{item.workStatus||'—'}</td>
                        <td style={tdS}>{item.totalWorkStatus||'—'}</td>
                        <td style={{ ...tdS, color:T.textMuted }}>{item.remarks||'—'}</td>
                        <td style={{ ...tdS, whiteSpace:'nowrap' as const }}>
                          {(canEditWP || canDeleteWP) && (
                            <div style={{ display:'flex', gap:4 }}>
                              {canEditWP && (
                                <button onClick={()=>{ setEditId(item.id); setEditRow({...item}); }}
                                  style={{ background:'none', border:`1px solid ${T.border}`, borderRadius:6, padding:'3px 8px', cursor:'pointer', fontSize:12, color:T.primary }}>✏️</button>
                              )}
                              {canDeleteWP && (
                                <button onClick={()=>{ if(window.confirm('Delete this work progress entry?')) deleteItem(item.id); }}
                                  style={{ background:'none', border:'none', cursor:'pointer', color:T.danger, fontSize:14 }}>🗑</button>
                              )}
                            </div>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!adding && items.length === 0 && (
        <div style={{ textAlign:'center' as const, padding:'16px 0', color:T.textDim, fontSize:13 }}>No work progress entries yet</div>
      )}
      {adding && (
        <div style={{ background:T.primaryLight, border:`1px solid ${T.primaryMid}`, borderRadius:10, padding:14, marginBottom:12 }}>
          <div style={{ fontSize:13, fontWeight:600, color:T.primary, marginBottom:12 }}>New Work Progress Entry</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr 1fr 1fr', gap:10, marginBottom:10 }}>
            <div><label style={labelS}>Work Date *</label><DateInput value={newRow.workDate} onChange={v=>setNewRow(p=>({...p,workDate:v}))} style={inpS} /></div>
            <div><label style={labelS}>Work Description *</label><input value={newRow.workDescription} onChange={e=>setNewRow(p=>({...p,workDescription:e.target.value}))} style={inpS} placeholder="Describe work done today" /></div>
            <div><label style={labelS}>Work Status</label><input value={newRow.workStatus} onChange={e=>setNewRow(p=>({...p,workStatus:e.target.value}))} style={inpS} placeholder="e.g. In Progress" /></div>
            <div><label style={labelS}>Total Work Status</label><input value={newRow.totalWorkStatus} onChange={e=>setNewRow(p=>({...p,totalWorkStatus:e.target.value}))} style={inpS} placeholder="e.g. 60% complete" /></div>
          </div>
          <div style={{ marginBottom:12 }}><label style={labelS}>Remarks</label><input value={newRow.remarks} onChange={e=>setNewRow(p=>({...p,remarks:e.target.value}))} style={inpS} placeholder="Any additional notes" /></div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={saveNew} disabled={saving||!newRow.workDate||!newRow.workDescription}
              style={{ background:T.primary, color:'#fff', border:'none', borderRadius:8, padding:'8px 18px', cursor:'pointer', fontSize:13, fontWeight:600, opacity:saving||!newRow.workDate||!newRow.workDescription?0.5:1 }}>
              {saving?'Saving…':'✅ Add Entry'}
            </button>
            <button onClick={()=>setAdding(false)} style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:8, padding:'8px 18px', cursor:'pointer', fontSize:13 }}>Cancel</button>
          </div>
        </div>
      )}
      {canCreateWP && !adding && (
        <button onClick={()=>setAdding(true)}
          style={{ background:'#fff', border:`1.5px solid ${T.primary}`, borderRadius:8, padding:'8px 18px', color:T.primary, cursor:'pointer', fontSize:13, fontWeight:700 }}>
          + Add Work Progress
        </button>
      )}
    </div>
  );
}


function POItemsSection({ projectId, editing, canAdd=true, isVendorRole=false, indusId='' }: { projectId: string; editing: boolean; canAdd?: boolean; isVendorRole?: boolean; indusId?: string }) {
  const { getByProject, addItem, updateItem, deleteItem, loading } = usePOItems();
  const { logActivity } = useActivity();
  const { profile: poProfile } = useAuth();
  const items = getByProject(projectId);
  const [adding,   setAdding]   = React.useState(false);
  const [saving,   setSaving]   = React.useState(false);
  const [editId,   setEditId]   = React.useState<string|null>(null);
  const [submitting, setSubmitting] = React.useState<string|null>(null);
  const [utilisedMap, setUtilisedMap] = React.useState<Record<string,string>>({});
  const [vendorCommentMap, setVendorCommentMap] = React.useState<Record<string,string>>({});
  const [toast,    setToast]    = React.useState<any>(null);
  const [poRejectTarget,  setPoRejectTarget]  = React.useState<any>(null);
  const [poRejectComment, setPoRejectComment] = React.useState('');
  const [poCommentPopup,  setPoCommentPopup]  = React.useState<any>(null);
  const [newRow,   setNewRow]   = React.useState({ description:'', hsnCode:'', uom:'', quantity:'', gstRate:'18', serialNo:'', documentNo:'', boqReqNo:'', amount:'', liftedDate:'', gateEntryNo:'', vehicleNo:'' });
  const [editRow,  setEditRow]  = React.useState<any>({});
  const [stnPdfUploading, setStnPdfUploading] = React.useState(false);
  const [stnPdfItems,     setStnPdfItems]     = React.useState<any[]|null>(null);
  const [stnPdfMeta,      setStnPdfMeta]      = React.useState<any>({});
  const [stnBatchInfo,    setStnBatchInfo]     = React.useState<{current:number;total:number;allImages:string[]}>({current:0,total:0,allImages:[]});
  const stnPdfRef = React.useRef<HTMLInputElement>(null);

  const uploadStnPdf = async (file: File) => {
    setStnPdfUploading(true);
    try {
      // Render PDF pages to images client-side using PDF.js
      const arrayBuf = await file.arrayBuffer();
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuf) }).promise;
      const totalPages = pdf.numPages;
      // Render all pages to images
      const allImages: string[] = [];
      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.8 });
        const canvas = document.createElement('canvas');
        canvas.width  = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
        allImages.push(canvas.toDataURL('image/jpeg', 0.65).replace('data:image/jpeg;base64,', ''));
      }
      // Batch pages into groups of 8 to stay within size limits
      const BATCH = 8;
      const { data: { session } } = await (await import('@/lib/supabase')).createClient().auth.getSession();
      const token = session?.access_token || '';
      let allExtracted: any[] = [];
      let firstMeta: any = {};
      for (let b = 0; b < allImages.length; b += BATCH) {
        const images = allImages.slice(b, b + BATCH);
        const res = await fetch('/api/upload/extract-stn', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ images, batchIndex: b }),
        });
        const json = await res.json();
        if (!res.ok) { setToast({ msg: '❌ ' + (json.error || 'Failed'), type: 'error' }); return; }
        if (b === 0) firstMeta = json.data;
        allExtracted = allExtracted.concat(json.data.items || []);
      }
      const json = { data: { ...firstMeta, items: allExtracted } };
      const { documentNo, liftedDate, gateEntryNo, vehicleNo, boqReqNo, siteId, items: extracted } = json.data;
      setStnPdfMeta({ documentNo: documentNo||'', liftedDate: liftedDate||'', gateEntryNo: gateEntryNo||'', vehicleNo: vehicleNo||'', boqReqNo: boqReqNo||'', siteId: siteId||'' });
      setStnPdfItems((extracted||[]).map((it:any) => ({
        description: it.description||'', hsnCode: it.itemCode||it.hsnCode||'', uom: it.uom||'Nos',
        quantity: String(it.quantity||1), serialNo: it.serialNo||'', amount: String(it.amount||0),
        documentNo: documentNo||'', liftedDate: liftedDate||'', gateEntryNo: gateEntryNo||'', vehicleNo: vehicleNo||'',
        boqReqNo: it.boqReqNo || boqReqNo||'',
      })));
    } catch(e:any) { setToast({ msg:'❌ ' + e.message, type:'error' }); }
    finally { setStnPdfUploading(false); if (stnPdfRef.current) stnPdfRef.current.value = ''; }
  };

  const saveStnPdfItems = async () => {
    if (!stnPdfItems?.length) return;
    setSaving(true);
    let added = 0;
    for (let i = 0; i < stnPdfItems.length; i++) {
      const it = stnPdfItems[i];
      if (!it.description) continue;
      try {
        await addItem({ projectId, description:it.description, hsnCode:it.hsnCode, uom:it.uom,
          quantity:Number(it.quantity)||1, rate:0, gstRate:18, amount:Number(it.amount)||0,
          sortOrder:items.length+i+1, serialNo:it.serialNo, documentNo:it.documentNo,
          boqReqNo:it.boqReqNo, liftedDate:it.liftedDate||null,
          gateEntryNo:it.gateEntryNo||null, vehicleNo:it.vehicleNo||null } as any);
        added++;
      } catch(e) { console.error(e); }
    }
    setStnPdfItems(null);
    setSaving(false);
    setToast({ msg:`✅ ${added} STN item${added!==1?'s':''} added`, type:'success' });
    logActivity(projectId, `${added} STN items imported from delivery challan PDF`, poProfile?.full_name||'', poProfile?.role||'').catch(()=>{});
    // Auto-process next batch if available
    const nextBatch = stnBatchInfo.current + 1;
    if (nextBatch < stnBatchInfo.total) {
      setToast({ msg:`✅ ${added} items saved. Loading batch ${nextBatch+1} of ${stnBatchInfo.total}...`, type:'success' });
      await processStnBatch(stnBatchInfo.allImages, nextBatch, stnPdfMeta);
    } else if (stnBatchInfo.total > 1) {
      setToast({ msg:`✅ All batches complete!`, type:'success' });
    }
  };

  // Check localStorage for pending STN items (set by projects page Upload PO flow)
  React.useEffect(() => {
    if (!projectId) return;
    const key = 'pending_po_items_' + projectId;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    localStorage.removeItem(key);
    const extractedItems = JSON.parse(raw);
    if (!extractedItems?.length) return;

    const addAll = async () => {
      let added = 0;
      for (let i = 0; i < extractedItems.length; i++) {
        const item = extractedItems[i];
        const qty = Number(item.quantity) || 1;
        const rate = Number(item.rate) || 0;
        try {
          await addItem({
            projectId,
            description: item.description || '',
            hsnCode:     item.hsn        || '',
            uom:         item.uom        || 'Nos',
            quantity:    qty,
            rate:        rate,
            gstRate:     Number(item.gst_rate) || 18,
            amount:      qty * rate,
            sortOrder:   i + 1,
          });
          added++;
        } catch(err) { console.error('addItem error:', err); }
      }
      setToast({ msg:`✅ ${added} STN items added from PDF`, type:'success' });
    };
    addAll();
  }, [projectId]);

  const fmt = (n: number) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits:2 });
  const totalAmount = items.reduce((a,i) => a + i.amount, 0);
  const totalGST    = items.reduce((a,i) => a + (i.amount * i.gstRate / 100), 0);

  const calcAmount = (qty: string, rate: string) => {
    const q = Number(qty) || 0, r = Number(rate) || 0;
    return q * r;
  };

  const inpS: React.CSSProperties = { border:`1px solid ${T.border}`, borderRadius:6, padding:'5px 8px',
    fontSize:12, width:'100%', boxSizing:'border-box' as const, outline:'none', background:'#fff', color:T.text };
  const thS: React.CSSProperties  = { padding:'7px 8px', fontSize:9, fontWeight:700, textTransform:'uppercase',
    color:T.primary, textAlign:'left' as const, borderBottom:`2px solid ${T.primaryMid}`, background:T.primaryLight, whiteSpace:'nowrap' as const };
  const T_success = '#0D9488'; const T_danger = '#DC2626'; const T_warning = '#D97706';
  const tdS: React.CSSProperties  = { padding:'8px 8px', fontSize:12, borderBottom:`1px solid ${T.border}`, verticalAlign:'middle' as const };

  const saveNew = async () => {
    if (!newRow.description || !newRow.quantity) return;
    const amt = 0;
    setSaving(true);
    try {
      await addItem({ projectId, description:newRow.description, hsnCode:newRow.hsnCode,
        uom:newRow.uom, quantity:Number(newRow.quantity), rate:0,
        gstRate:Number(newRow.gstRate), amount:Number((newRow as any).amount)||0, sortOrder:items.length+1,
        serialNo:(newRow as any).serialNo, documentNo:(newRow as any).documentNo, boqReqNo:(newRow as any).boqReqNo,
        liftedDate:(newRow as any).liftedDate||null, gateEntryNo:(newRow as any).gateEntryNo||null, vehicleNo:(newRow as any).vehicleNo||null } as any);
      setNewRow({ description:'', hsnCode:'', uom:'', quantity:'', gstRate:'18', serialNo:'', documentNo:'', boqReqNo:'', amount:'', liftedDate:'', gateEntryNo:'', vehicleNo:'' });
      setAdding(false);
      logActivity(projectId, `STN Item '${newRow.description}' added`, poProfile?.full_name||'', poProfile?.role||'').catch(console.error);
      setToast({ msg:'✅ PO Item added', type:'success' });
    } catch(err:any) { setToast({ msg:'❌ ' + err.message, type:'error' }); }
    finally { setSaving(false); }
  };

  const submitUtilisation = async (item: any, status: string) => {
    const qty = utilisedMap[item.id] !== undefined ? Number(utilisedMap[item.id]) : Number(item.utilisedQty ?? 0);
    if (!qty || qty <= 0) { setToast({ msg:'Please enter utilised quantity', type:'error' }); return; }
    if (qty > Number(item.quantity)) { setToast({ msg:'Cannot exceed issued qty (' + item.quantity + ')', type:'error' }); return; }
    setSubmitting(item.id);
    try {
      await updateItem(item.id, { utilisedQty: qty, utilisedStatus: status } as any);
      setToast({ msg: status === 'submitted' ? '✅ Utilisation submitted' : '✅ Updated', type:'success' });
    } catch(err:any) { setToast({ msg:'❌ ' + err.message, type:'error' }); }
    finally { setSubmitting(null); }
  };

  const isPMRole = ['project_manager','super_admin','region_manager'].includes(poProfile?.role||'');

  const popmApprove = async (item: any) => {
    const utilisedQty = Number(item.utilisedQty ?? 0);
    const issuedQty   = Number(item.quantity ?? 0);
    if (!utilisedQty || utilisedQty <= 0) {
      setToast({ msg:'Cannot approve — no utilised quantity entered', type:'error' }); return;
    }
    if (utilisedQty !== issuedQty) {
      setToast({ msg:`Cannot approve — utilised qty (${utilisedQty}) must equal issued qty (${issuedQty})`, type:'error' }); return;
    }
    setSubmitting(item.id);
    try {
      await updateItem(item.id, { utilisedStatus:'pm_approved', pmApprovedQty: utilisedQty } as any);
      logActivity(projectId, `STN approved: ${item.description}`, poProfile?.full_name||'', poProfile?.role||'').catch(()=>{});
      setToast({ msg:'✅ Approved', type:'success' });
    } catch(err:any) { setToast({ msg:'❌ ' + err.message, type:'error' }); }
    finally { setSubmitting(null); }
  };

  const popmReject = (item: any) => { setPoRejectTarget(item); setPoRejectComment(''); };

  const confirmPoReject = async () => {
    if (!poRejectTarget || !poRejectComment.trim()) return;
    setSubmitting(poRejectTarget.id);
    try {
      await updateItem(poRejectTarget.id, { utilisedStatus:'pm_rejected', pmApprovedQty: null, pmComment: poRejectComment.trim() } as any);
      logActivity(projectId, `STN rejected: ${poRejectComment}`, poProfile?.full_name||'', poProfile?.role||'').catch(()=>{});
      setToast({ msg:'✗ Rejected', type:'info' });
      setPoRejectTarget(null); setPoRejectComment('');
    } catch(err:any) { setToast({ msg:'❌ ' + err.message, type:'error' }); }
    finally { setSubmitting(null); }
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    try {
      await updateItem(id, { ...editRow, quantity:Number(editRow.quantity),
        gstRate:Number(editRow.gstRate||18), amount:Number(editRow.amount)||0,
        utilisedQty: editRow.utilisedQty !== undefined && editRow.utilisedQty !== '' ? Number(editRow.utilisedQty) : undefined } as any);
      setEditId(null);
      logActivity(projectId, `PO Item updated`, poProfile?.full_name||'', poProfile?.role||'').catch(console.error);
      setToast({ msg:'✅ PO Item updated', type:'success' });
    } catch(err:any) { setToast({ msg:'❌ ' + err.message, type:'error' }); }
    finally { setSaving(false); }
  };

  return (
    <div>
      {/* PM Reject Modal */}
      {poRejectTarget && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000,
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:14, padding:28, width:420, boxShadow:'0 8px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize:16, fontWeight:700, color:'#DC2626', marginBottom:8 }}>✗ Reject STN Item</div>
            <div style={{ fontSize:13, color:'#374151', marginBottom:12 }}><strong>{poRejectTarget.description}</strong><br/>
              <span style={{ color:'#6B7280', fontSize:12 }}>Utilised Qty: {poRejectTarget.utilisedQty}</span></div>
            <label style={{ fontSize:11, fontWeight:600, color:'#6B7280', textTransform:'uppercase' as const }}>Rejection Comment *</label>
            <textarea value={poRejectComment} onChange={e=>setPoRejectComment(e.target.value)}
              placeholder="Enter reason for rejection…" rows={3}
              style={{ width:'100%', marginTop:6, marginBottom:14, border:'1.5px solid #E5E7EB', borderRadius:8,
                padding:'8px 10px', fontSize:13, outline:'none', resize:'vertical' as const, boxSizing:'border-box' as const }} />
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={()=>setPoRejectTarget(null)}
                style={{ padding:'8px 18px', borderRadius:8, border:'1px solid #E5E7EB', background:'#fff', cursor:'pointer', fontSize:13 }}>Cancel</button>
              <button onClick={confirmPoReject} disabled={!poRejectComment.trim()}
                style={{ padding:'8px 18px', borderRadius:8, border:'none', background:'#DC2626', color:'#fff',
                  cursor:poRejectComment.trim()?'pointer':'not-allowed', fontSize:13, fontWeight:600, opacity:poRejectComment.trim()?1:0.5 }}>
                ✗ Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comment Popup */}
      {poCommentPopup && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000,
          display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={()=>setPoCommentPopup(null)}>
          <div style={{ background:'#fff', borderRadius:14, padding:28, width:420, boxShadow:'0 8px 40px rgba(0,0,0,0.2)' }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize:15, fontWeight:700, color:'#7C3AED', marginBottom:8 }}>💬 PM Comment</div>
            <div style={{ fontSize:13, fontWeight:600, color:'#374151', marginBottom:10 }}>{poCommentPopup.description}</div>
            {poCommentPopup.pmComment ? (
              <div style={{ fontSize:13, color:'#DC2626', background:'#FEF2F2', borderRadius:8, padding:'12px 14px', lineHeight:1.6 }}>
                {poCommentPopup.pmComment}
              </div>
            ) : (
              <div style={{ fontSize:13, color:'#9CA3AF', background:'#F9FAFB', borderRadius:8, padding:'12px 14px' }}>No comments yet.</div>
            )}
            <div style={{ marginTop:14, textAlign:'right' as const }}>
              <button onClick={()=>setPoCommentPopup(null)}
                style={{ padding:'7px 18px', borderRadius:8, border:'1px solid #E5E7EB', background:'#fff', cursor:'pointer', fontSize:13 }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* STN Add + Import Challan buttons at top */}
      {canAdd && (
        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
          {!adding && (
            <button onClick={()=>setAdding(true)}
              style={{ background:T.primary, color:'#fff', border:'none', borderRadius:7, padding:'5px 14px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
              + Add Item
            </button>
          )}
          <label style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600,
            color:'#1E40AF', background:'#EFF6FF', border:'1px solid #BFDBFE',
            borderRadius:6, padding:'4px 10px', cursor: stnPdfUploading ? 'not-allowed' : 'pointer',
            opacity: stnPdfUploading ? 0.7 : 1 }}>
            {stnPdfUploading ? '⏳ Parsing PDF...' : '📄 Import Challan'}
            <input ref={stnPdfRef} data-stn-pdf="1" type="file" accept=".pdf" style={{ display:'none' }}
              disabled={stnPdfUploading}
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadStnPdf(f); }} />
          </label>
        </div>
      )}
      {/* STN PDF hidden input */}
      <input ref={stnPdfRef} data-stn-pdf="1" type="file" accept=".pdf" style={{ display:'none' }}
        disabled={stnPdfUploading}
        onChange={e => { const f = e.target.files?.[0]; if (f) uploadStnPdf(f); }} />

      {/* Review modal for PDF-extracted STN items */}
      {stnPdfItems && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.6)', zIndex:1200,
          display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={()=>setStnPdfItems(null)}>
          <div style={{ background:'#fff', borderRadius:14, padding:24, width:'100%', maxWidth:900,
            maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize:16, fontWeight:700, color:T.text, marginBottom:4 }}>
              📄 Review STN Items from Delivery Challan
              {stnBatchInfo.total > 1 && (
                <span style={{ fontSize:12, fontWeight:400, color:T.textMuted, marginLeft:10 }}>
                  Batch {stnBatchInfo.current+1} of {stnBatchInfo.total}
                </span>
              )}
            </div>
            {/* Project ID validation */}
            {stnPdfMeta.siteId && (() => {
              const pdfSiteId = (stnPdfMeta.siteId||'').trim().toUpperCase();
              const projIndusId = (indusId||'').trim().toUpperCase();
              const matches = projIndusId && pdfSiteId === projIndusId;
              const mismatch = projIndusId && pdfSiteId !== projIndusId;
              return (
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:8, marginBottom:12,
                  background: matches ? '#F0FDF4' : mismatch ? '#FEF2F2' : '#FFFBEB',
                  border:`1px solid ${matches ? '#BBF7D0' : mismatch ? '#FECACA' : '#FDE68A'}` }}>
                  <span style={{ fontSize:18 }}>{matches ? '✅' : mismatch ? '⚠️' : '🔍'}</span>
                  <div style={{ fontSize:12 }}>
                    <span style={{ fontWeight:600, color: matches ? '#166534' : mismatch ? '#DC2626' : '#92400E' }}>
                      {matches ? 'Project ID Match' : mismatch ? 'Project ID Mismatch!' : 'Verify Project ID'}
                    </span>
                    <div style={{ fontSize:11, color:T.textMuted, marginTop:2 }}>
                      PDF Site ID: <strong>{stnPdfMeta.siteId}</strong>
                      {projIndusId && <span> · Project Indus ID: <strong>{indusId}</strong></span>}
                      {mismatch && <span style={{ color:'#DC2626', marginLeft:6 }}>— These do not match. Please verify before saving.</span>}
                    </div>
                  </div>
                </div>
              );
            })()}
            <div style={{ fontSize:12, color:T.textMuted, marginBottom:16 }}>
              {stnPdfItems.length} item{stnPdfItems.length!==1?'s':''} extracted. Review and edit before saving.
            </div>
            {stnPdfItems.map((it:any, idx:number) => (
              <div key={idx} style={{ border:`1px solid ${T.border}`, borderRadius:8, padding:12, marginBottom:10 }}>
                <div style={{ fontSize:11, fontWeight:700, color:T.primary, marginBottom:8 }}>Item {idx+1}</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                  {[
                    ['Description *', 'description', 'text', ''],
                    ['HSN / Item Code', 'hsnCode', 'text', ''],
                    ['UOM', 'uom', 'text', ''],
                    ['Quantity *', 'quantity', 'number', ''],
                    ['Serial No', 'serialNo', 'text', ''],
                    ['Amount (₹)', 'amount', 'number', ''],
                    ['Document No', 'documentNo', 'text', ''],
                    ['Gate Entry No', 'gateEntryNo', 'text', '⚠️ Verify against stamp at bottom of challan'],
                    ['Vehicle No', 'vehicleNo', 'text', ''],
                    ['BOQ Req No', 'boqReqNo', 'text', ''],
                    ['Lifted Date', 'liftedDate', 'date', ''],
                  ].map(([label, field, type, hint]) => (
                    <div key={field as string}>
                      <div style={{ fontSize:10, fontWeight:600, color:T.textMuted, marginBottom:3, textTransform:'uppercase' as const }}>{label}</div>
                      <input type={type as string} value={it[field as string]||''} style={{ border:`1px solid ${field==='gateEntryNo'?'#FCD34D':T.border}`, borderRadius:6, padding:'6px 8px', fontSize:12, width:'100%', boxSizing:'border-box' as const, outline:'none' }}
                        onChange={e=>setStnPdfItems(prev=>prev!.map((r:any,i:number)=>i===idx?{...r,[field as string]:e.target.value}:r))} />
                      {hint && <div style={{ fontSize:9, color:'#D97706', marginTop:2 }}>{hint as string}</div>}
                    </div>
                  ))}
                </div>
                <button onClick={()=>setStnPdfItems(prev=>prev!.filter((_:any,i:number)=>i!==idx))}
                  style={{ marginTop:8, fontSize:11, color:T.danger, background:'none', border:'none', cursor:'pointer' }}>
                  🗑 Remove this item
                </button>
              </div>
            ))}
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:16 }}>
              <button onClick={()=>setStnPdfItems(null)}
                style={{ padding:'8px 18px', borderRadius:8, border:`1px solid ${T.border}`, background:'#fff', cursor:'pointer', fontSize:13 }}>
                Cancel
              </button>
              <button onClick={saveStnPdfItems} disabled={saving||stnPdfItems.length===0}
                style={{ padding:'8px 18px', borderRadius:8, background:T.primary, color:'#fff', border:'none',
                  cursor:saving?'not-allowed':'pointer', fontSize:13, fontWeight:600, opacity:saving?0.7:1 }}>
                {saving ? '⏳ Saving...' : stnBatchInfo.total > 1 && stnBatchInfo.current + 1 < stnBatchInfo.total
                  ? `✅ Save & Load Next Batch →`
                  : `✅ Save ${stnPdfItems.length} Item${stnPdfItems.length!==1?'s':''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && <div style={{ color:T.textMuted, fontSize:13 }}>Loading STN items...</div>}
      {items.length > 0 && (
        <div style={{ overflowX:'auto' as const }}>
          <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
            <thead>
              <tr>
                {[
                  {h:'#',w:28},{h:'Item Code',w:90},{h:'Item Description',w:200},{h:'UOM',w:50},
                  {h:'Qty',w:45},{h:'Doc No',w:80},{h:'Lifted Date',w:100},{h:'Gate Entry No',w:110},{h:'Vehicle No',w:100},{h:'BOQ Req',w:80},{h:'Serial No',w:100},
                  {h:'Tax',w:45},{h:'Amount',w:80},{h:'Total Value',w:90},{h:'Util Qty',w:80},{h:'Status',w:90},{h:'',w:90}
                ].map(({h,w},i)=>(
                  <th key={i} style={{ ...thS, minWidth:w }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <React.Fragment key={item.id}>
                  <tr style={{ background:idx%2===0?'#fff':T.bg }}>
                    <td style={{ ...tdS, color:T.textMuted }}>{idx+1}</td>
                    <td style={{ ...tdS, color:T.primary, fontSize:11 }}>{item.hsnCode||'—'}</td>
                    <td style={{ ...tdS, fontWeight:500, maxWidth:200 }}>{item.description}</td>
                    <td style={{ ...tdS, color:T.textMuted, textAlign:'center' as const }}>{item.uom||'—'}</td>
                    <td style={{ ...tdS, textAlign:'center' as const }}>{item.quantity.toLocaleString()}</td>
                    <td style={{ ...tdS, color:T.textMuted, fontSize:11 }}>{(item as any).documentNo||'—'}</td>
                    <td style={{ ...tdS, color:T.textMuted, fontSize:11 }}>{(item as any).liftedDate ? new Date((item as any).liftedDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</td>
                    <td style={{ ...tdS, color:T.textMuted, fontSize:11 }}>{(item as any).gateEntryNo||'—'}</td>
                    <td style={{ ...tdS, color:T.textMuted, fontSize:11 }}>{(item as any).vehicleNo||'—'}</td>
                    <td style={{ ...tdS, color:T.textMuted, fontSize:11 }}>{(item as any).boqReqNo||'—'}</td>
                    <td style={{ ...tdS, color:T.textMuted, fontSize:11 }}>{(item as any).serialNo||'—'}</td>
                    <td style={{ ...tdS, color:T.textMuted, textAlign:'center' as const }}>{item.gstRate}%</td>
                    <td style={{ ...tdS, fontWeight:700, color:T.primary, textAlign:'right' as const }}>{fmt(item.amount)}</td>
                    <td style={{ ...tdS, fontWeight:700, color:T.success, textAlign:'right' as const }}>{fmt(item.amount * (1 + (item.gstRate||0)/100))}</td>
                    <td style={{ ...tdS, textAlign:'center' as const }}>
                      {(item.utilisedStatus==='pending'||item.utilisedStatus==='pm_rejected') ? (
                        <input type="number" min={0} max={item.quantity}
                          value={utilisedMap[(item as any).id]??((item as any).utilisedQty??'')}
                          onChange={e=>setUtilisedMap(p=>({...p,[(item as any).id]:e.target.value}))}
                          placeholder="0"
                          style={{ width:60, border:`1px solid ${T.border}`, borderRadius:6, padding:'3px 6px', fontSize:12, textAlign:'center' as const, outline:'none' }} />
                      ) : (
                        <span style={{ fontSize:12, fontWeight:600, color:T.text }}>{(item as any).utilisedQty??'—'}</span>
                      )}
                    </td>
                    <td style={{ ...tdS }}>
                      {(item as any).utilisedStatus && (item as any).utilisedStatus !== 'pending' ? (
                        <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20,
                          color:(item as any).utilisedStatus==='pm_approved'&&(item as any).pmApprovedQty>0?'#059669':(item as any).utilisedStatus==='submitted'?'#2563EB':(item as any).utilisedStatus==='pm_rejected'?'#DC2626':'#DC2626',
                          background:(item as any).utilisedStatus==='pm_approved'&&(item as any).pmApprovedQty>0?'#D1FAE5':(item as any).utilisedStatus==='submitted'?'#EFF6FF':'#FEF2F2' }}>
                          {(item as any).utilisedStatus==='pm_approved'&&(item as any).pmApprovedQty>0?'✓ Approved':(item as any).utilisedStatus==='submitted'?'📤 Submitted':'✗ Rejected'}
                        </span>
                      ) : <span style={{ fontSize:11, color:T.textMuted }}>—</span>}
                    </td>
                    <td style={{ ...tdS, width:120 }}>
                      {(item as any).utilisedStatus !== 'submitted' && (item as any).utilisedStatus !== 'pm_approved' && canAdd ? (
                        <div style={{ display:'flex', gap:4 }}>
                          <button onClick={()=>{ setEditId(editId===item.id?null:item.id); setEditRow({...item}); }}
                            style={{ background: editId===item.id ? T.primary : 'none', color: editId===item.id ? '#fff' : T.primary, border:`1px solid ${T.border}`, borderRadius:6, padding:'3px 8px', cursor:'pointer', fontSize:12 }}>✏️</button>
                          <button onClick={()=>deleteItem(item.id)}
                            style={{ background:'none', border:'none', cursor:'pointer', color:T.danger, fontSize:14 }}>🗑</button>
                        </div>
                      ) : (item as any).utilisedStatus==='submitted' && isPMRole ? (
                        <div style={{ display:'flex', gap:4 }}>
                          <button onClick={()=>popmApprove(item)} disabled={submitting===item.id}
                            style={{ background:'#0D9488', color:'#fff', border:'none', borderRadius:6, padding:'3px 8px', fontSize:11, cursor:'pointer', fontWeight:600 }}>
                            {submitting===item.id?'…':'✓ Approve'}
                          </button>
                          <button onClick={()=>popmReject(item)} disabled={submitting===item.id}
                            style={{ background:'#DC2626', color:'#fff', border:'none', borderRadius:6, padding:'3px 8px', fontSize:11, cursor:'pointer', fontWeight:600 }}>
                            ✗ Reject
                          </button>
                        </div>
                      ) : ((item as any).utilisedStatus==='pending' || (item as any).utilisedStatus==='pm_rejected') && !isPMRole ? (
                        <button onClick={()=>submitUtilisation(item,'submitted')} disabled={submitting===item.id}
                          style={{ background:(item as any).utilisedStatus==='pm_rejected'?'#D97706':T.primary, color:'#fff', border:'none', borderRadius:6, padding:'3px 8px', fontSize:11, cursor:'pointer' }}>
                          {submitting===item.id?'…':(item as any).utilisedStatus==='pm_rejected'?'Resubmit':'Submit'}
                        </button>
                      ) : (item as any).pmComment ? (
                        <span onClick={()=>setPoCommentPopup(item)}
                          style={{ fontSize:11, fontWeight:700, color:'#7C3AED', background:'#F5F3FF',
                            padding:'2px 10px', borderRadius:20, cursor:'pointer', whiteSpace:'nowrap' as const }}>
                          💬 Comment
                        </span>
                      ) : null}
                    </td>
                  </tr>

                  {editId === item.id && (
                    <tr style={{ background:T.primaryLight }}>
                      <td colSpan={12} style={{ padding:'14px', borderBottom:`1px solid ${T.border}` }}>
                        <div style={{ fontSize:12, fontWeight:700, color:T.primary, marginBottom:10, paddingBottom:8, borderBottom:`1px solid ${T.primaryMid}` }}>✏️ Edit STN Item</div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 3fr 1fr 1fr 1fr 1fr', gap:8, marginBottom:8 }}>
                          {([['Item Code','hsnCode','text'],['Item Description *','description','text'],['UOM','uom','text'],['Qty','quantity','number'],['Tax %','gstRate','number'],['Amount (₹)','amount','number']] as [string,string,string][]).map(([l,f,t])=>(
                            <div key={f}>
                              <label style={{ display:'block', fontSize:9, fontWeight:700, color:T.textMuted, marginBottom:2, textTransform:'uppercase' as const }}>{l}</label>
                              <input type={t} value={(editRow as any)[f]||''} onChange={e=>setEditRow((p:any)=>({...p,[f]:e.target.value}))} style={{ ...inpS, padding:'4px 7px', fontSize:12 }} />
                            </div>
                          ))}
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8, marginBottom:10 }}>
                          {([['Document No','documentNo','text'],['BOQ Req No','boqReqNo','text'],['Serial No','serialNo','text'],['Util. Qty','utilisedQty','number']] as [string,string,string][]).map(([l,f,t])=>(
                            <div key={f}>
                              <label style={{ display:'block', fontSize:9, fontWeight:700, color:T.textMuted, marginBottom:2, textTransform:'uppercase' as const }}>{l}</label>
                              <input type={t} value={(editRow as any)[f]||''} onChange={e=>setEditRow((p:any)=>({...p,[f]:e.target.value}))} style={{ ...inpS, padding:'4px 7px', fontSize:12 }} />
                            </div>
                          ))}
                        </div>
                        {(editRow as any).amount && Number((editRow as any).amount) > 0 && (
                          <div style={{ fontSize:13, color:T.success, fontWeight:700, marginBottom:10 }}>
                            Total Value (incl. tax): ₹{(Number((editRow as any).amount||0) * (1 + Number(editRow.gstRate||0)/100)).toLocaleString('en-IN', {minimumFractionDigits:2})}
                          </div>
                        )}
                        {/* Per-item STN fields */}
                        <div style={{ borderTop:`1px solid ${T.primaryMid}`, paddingTop:10, marginBottom:10 }}>
                          <div style={{ fontSize:11, fontWeight:700, color:T.primary, marginBottom:8, textTransform:'uppercase' as const }}>Lifting Details</div>
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:10 }}>
                            {([['Lifted Date','liftedDate','date'],['Gate Entry No','gateEntryNo','text'],['Vehicle No','vehicleNo','text']] as [string,string,string][]).map(([l,f,t])=>(
                              <div key={f}>
                                <label style={{ display:'block', fontSize:9, fontWeight:700, color:T.textMuted, marginBottom:2, textTransform:'uppercase' as const }}>{l}</label>
                                <input type={t} value={(editRow as any)[f]||''} onChange={e=>setEditRow((p:any)=>({...p,[f]:e.target.value}))} style={{ ...inpS, padding:'4px 7px', fontSize:12 }} />
                              </div>
                            ))}
                          </div>
                        </div>
                        <div style={{ display:'flex', gap:10 }}>
                          <button onClick={()=>saveEdit(item.id)} disabled={saving} style={{ background:T.primary, color:'#fff', border:'none', borderRadius:8, padding:'8px 18px', cursor:'pointer', fontSize:13, fontWeight:600 }}>✓ Save</button>
                          <button onClick={()=>setEditId(null)} style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:8, padding:'8px 18px', cursor:'pointer', fontSize:13 }}>Cancel</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background:T.primaryLight, fontWeight:700 }}>
                <td colSpan={13} style={{ ...tdS, textAlign:'right' as const, color:T.textMuted }}>Subtotal excl. GST</td>
                <td style={{ ...tdS, textAlign:'right' as const, color:T.primary }}>{fmt(totalAmount)}</td>
                <td style={tdS}></td>
              </tr>
              <tr style={{ background:T.primaryLight, fontWeight:700 }}>
                <td colSpan={13} style={{ ...tdS, textAlign:'right' as const, color:T.textMuted }}>GST</td>
                <td style={{ ...tdS, textAlign:'right' as const, color:T.textMuted }}>{fmt(totalGST)}</td>
                <td style={tdS}></td>
              </tr>
              <tr style={{ background:T.primaryLight, fontWeight:800 }}>
                <td colSpan={13} style={{ ...tdS, textAlign:'right' as const, color:T.primary }}>Grand Total</td>
                <td style={{ ...tdS, textAlign:'right' as const, color:T.primary, fontSize:14 }}>{fmt(totalAmount + totalGST)}</td>
                <td style={tdS}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      {!loading && items.length === 0 && (
        <div style={{ textAlign:'center' as const, padding:'24px 0', color:T.textDim, fontSize:13 }}>No STN items for this project</div>
      )}

      {adding && (
        <div style={{ background:T.primaryLight, border:`1px solid ${T.primaryMid}`, borderRadius:10, padding:14, marginTop:12 }}>
          <div style={{ fontSize:13, fontWeight:600, color:T.primary, marginBottom:12 }}>New Item</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 3fr 1fr', gap:10, marginBottom:12 }}>
            {([['Item Code','hsnCode','text'],['Item Description *','description','text'],['UOM','uom','text'],
               ['Qty *','quantity','number'],['Tax Rate %','gstRate','number'],['Amount (₹)','amount','number'],
               ['Document No','documentNo','text'],['BOQ Req No','boqReqNo','text'],['Serial No','serialNo','text']] as [string,string,string][]).map(([l,f,t])=>(
              <div key={f}>
                <label style={{ display:'block', fontSize:10, fontWeight:600, color:T.textMuted, marginBottom:3, textTransform:'uppercase' as const }}>{l}</label>
                <input type={t} value={(newRow as any)[f]} onChange={e=>setNewRow(p=>({...p,[f]:e.target.value}))} style={inpS} />
              </div>
            ))}
          </div>

          {/* Lifting details */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:12 }}>
            {([['Lifted Date','liftedDate','date'],['Gate Entry No','gateEntryNo','text'],['Vehicle No','vehicleNo','text']] as [string,string,string][]).map(([l,f,t])=>(
              <div key={f}>
                <label style={{ display:'block', fontSize:10, fontWeight:600, color:T.textMuted, marginBottom:3, textTransform:'uppercase' as const }}>{l}</label>
                <input type={t} value={(newRow as any)[f]||''} onChange={e=>setNewRow(p=>({...p,[f]:e.target.value}))} style={inpS}
                  {...(t==='date' ? { max: new Date().toISOString().split('T')[0] } : {})} />
              </div>
            ))}
          </div>

          {(newRow as any).amount && (
            <div style={{ fontSize:13, color:T.success, fontWeight:700, marginBottom:10 }}>
              Total Value (incl. tax): ₹{(Number((newRow as any).amount) * (1 + Number(newRow.gstRate||0)/100)).toLocaleString('en-IN', {minimumFractionDigits:2})}
            </div>
          )}
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={saveNew} disabled={saving||!newRow.description||!newRow.quantity}
              style={{ background:T.primary, color:'#fff', border:'none', borderRadius:8, padding:'8px 18px',
                cursor:'pointer', fontSize:13, fontWeight:600, opacity:saving||!newRow.description||!newRow.quantity?0.5:1 }}>
              {saving?'Saving…':'✅ Add Item'}
            </button>
            <button onClick={()=>setAdding(false)}
              style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:8, padding:'8px 18px', color:T.text, cursor:'pointer', fontSize:13 }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:14 }}>

      {/* Add Item moved to top */}
        {items.length > 0 && (
          <div style={{ marginLeft:'auto', fontSize:13, fontWeight:700, color:T.primary,
            background:T.primaryLight, padding:'8px 18px', borderRadius:8 }}>
            Grand Total: {fmt(totalAmount + totalGST)}
          </div>
        )}
      </div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
    </div>
  );
}

function PTWSectionCard({ projectId, vendorContact, canEdit, canAdd=true, onCountChange }: { projectId:string; vendorContact:string; canEdit:boolean; canAdd?:boolean; onCountChange?:(n:number)=>void }) {
  const [items,   setItems]   = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving,  setSaving]  = React.useState<string|null>(null);
  const [toast,   setToast]   = React.useState<any>(null);
  const [editId,  setEditId]  = React.useState<string|null>(null);
  const [editRow, setEditRow] = React.useState<any>({});

  React.useEffect(() => {
    if (!projectId) return;
    const sb = createClient();
    sb.from('ptw_items').select('*').eq('project_id', projectId).order('created_at')
      .then(({ data }) => {
        if (data) setItems(data.map((r:any) => ({
          id: r.id, ticketId: r.ticket_id||'', supervisor: r.supervisor||'',
          dateFrom: r.date_from||'', dateTo: r.date_to||'',
          raiser: r.raiser||'', ptwType: r.ptw_type||'', ptwStatus: r.ptw_status||'', isNew: false,
        })));
        setLoading(false);
      });
  }, [projectId]);

  React.useEffect(() => { onCountChange?.(items.filter((i:any)=>!i.isNew).length); }, [items, onCountChange]);

  const addPTW = () => {
    const newId = `new-${Date.now()}`;
    const newItem = { id: newId, ticketId:'', supervisor: vendorContact||'', dateFrom:'', dateTo:'', raiser:'', ptwType:'', ptwStatus:'', isNew: true };
    setItems(prev => [...prev, newItem]);
    setEditId(newId);
    setEditRow({...newItem});
  };

  const removeItem = async (id:string|number) => {
    if (String(id).startsWith('new-')) {
      setItems(prev => prev.filter((i:any)=>i.id!==id));
      return;
    }
    if (!window.confirm('Delete this PTW record?')) return;
    const sb = createClient();
    await sb.from('ptw_items').delete().eq('id', id);
    setItems(prev => prev.filter((i:any)=>i.id!==id));
  };

  const update = (id:string|number, field:string, val:string) =>
    setItems(prev => prev.map((item:any) => item.id===id ? {...item,[field]:val} : item));

  const savePTWRow = async (item: any) => {
    setSaving(item.id);
    const sb = createClient();
    const payload = {
      project_id: projectId, ticket_id: editRow.ticketId, supervisor: editRow.supervisor,
      date_from: editRow.dateFrom||null, date_to: editRow.dateTo||null,
      raiser: editRow.raiser||null, ptw_type: editRow.ptwType||null, ptw_status: editRow.ptwStatus||null,
    };
    if (item.isNew) {
      const { data, error } = await sb.from('ptw_items').insert(payload).select().single();
      if (!error && data) {
        setItems(prev => prev.map((i:any) => i.id===item.id ? {
          ...editRow, id:data.id, isNew:false
        } : i));
        setToast({ msg:'✅ PTW saved', type:'success' });
      }
    } else {
      const { error } = await sb.from('ptw_items').update(payload).eq('id', item.id);
      if (!error) {
        setItems(prev => prev.map((i:any) => i.id===item.id ? {...i, ...editRow} : i));
        setToast({ msg:'✅ PTW updated', type:'success' });
      }
    }
    setEditId(null); setEditRow({});
    setSaving(null);
  };

  const saveAllPTW = async () => {
    setSaving('all');
    const sb = createClient();
    for (const item of items) {
      const payload = {
        project_id: projectId, ticket_id: item.ticketId, supervisor: item.supervisor,
        date_from: item.dateFrom||null, date_to: item.dateTo||null,
        raiser: item.raiser||null, ptw_type: item.ptwType||null, ptw_status: item.ptwStatus||null,
      };
      if (item.isNew) {
        const { data } = await sb.from('ptw_items').insert(payload).select().single();
        if (data) setItems(prev => prev.map((i:any) => i.id===item.id ? {
          ...item, id:data.id, isNew:false
        } : i));
      } else {
        await sb.from('ptw_items').update(payload).eq('id', item.id);
      }
    }
    setToast({ msg:'✅ All PTW records saved', type:'success' });
    setSaving(null);
  };

  const savePTW = async (item:any) => {
    setSaving(item.id);
    const sb = createClient();
    const payload = {
      project_id: projectId, ticket_id: item.ticketId, supervisor: item.supervisor,
      date_from: item.dateFrom||null, date_to: item.dateTo||null,
      raiser: item.raiser||null, ptw_type: item.ptwType||null, ptw_status: item.ptwStatus||null,
    };
    if (item.isNew) {
      const { data, error } = await sb.from('ptw_items').insert(payload).select().single();
      if (!error && data) {
        setItems(prev => prev.map((i:any) => i.id===item.id ? {...data, id:data.id,
          ticketId:data.ticket_id, supervisor:data.supervisor,
          dateFrom:data.date_from||'', dateTo:data.date_to||'',
          raiser:data.raiser||'', ptwType:data.ptw_type||'', ptwStatus:data.ptw_status||'', isNew:false} : i));
        setToast({ msg:'✅ PTW saved', type:'success' });
      }
    } else {
      const { error } = await sb.from('ptw_items').update(payload).eq('id', item.id);
      if (!error) setToast({ msg:'✅ PTW updated', type:'success' });
    }
    setSaving(null);
  };

  const getStatus = (from:string, to:string) => {
    if (!from || !to) return null;
    const today = new Date(), f = new Date(from), t = new Date(to);
    if (today < f) return { label:'🕐 Upcoming',  color:'#D97706', bg:'#FFFBEB', border:'#FDE68A' };
    if (today > t) return { label:'⚠️ Expired',   color:T.danger,  bg:'#FEF2F2', border:'#FECACA' };
    return          { label:'✅ Active',            color:T.success, bg:T.successBg, border:'#BBF7D0' };
  };

  const fmtDate = (d: string) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); } catch { return d; } };
const fmt = (d:string) => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';
  const inp = (val:string, field:string, id:number, type='text', ph='') => (
    <input type={type} value={val} placeholder={ph}
      onChange={e=>update(id,field,e.target.value)}
      style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'5px 8px', fontSize:12, width:'100%', boxSizing:'border-box' as const, outline:'none', background:'#fff', color:T.text }} />
  );

  if (loading) return <div style={{ padding:20, textAlign:'center' as const, color:'#6B7280', fontSize:13 }}>Loading PTW records…</div>;

  if (items.length === 0 && !canEdit) return (
    <div style={{ textAlign:'center', padding:24, color:'#9CA3AF', fontSize:13 }}>No PTW records yet.</div>
  );

  return (
    <div>
      {items.length > 0 && (
        <table style={{ width:'100%', borderCollapse:'collapse' as const, marginBottom:14 }}>
          <thead>
            <tr style={{ background:T.bg }}>
              {['#','Ticket ID *','Raiser','Supervisor Name','PTW Type','From Date *','To Date *','PTW Status',''].map((h,i)=>(
                <th key={i} style={{ padding:'9px 10px', fontSize:10, fontWeight:700, textTransform:'uppercase', color:T.textMuted, textAlign:'left' as const, borderBottom:`2px solid ${T.border}`, whiteSpace:'nowrap' as const }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item:any, idx:number) => {
              const status = getStatus(item.dateFrom, item.dateTo);
              return (
                <tr key={item.id} style={{ borderBottom:`1px solid ${T.border}` }}>
                  <td style={{ padding:'10px', color:T.textMuted, fontSize:12, width:32 }}>{idx+1}</td>
                  {editId === item.id ? (<>
                    <td style={{ padding:'6px 8px' }}><input style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'5px 8px', fontSize:12, width:'100%', outline:'none' }} value={editRow.ticketId||''} placeholder="PTW-2025-XXXX" onChange={e=>setEditRow((p:any)=>({...p,ticketId:e.target.value}))} /></td>
                    <td style={{ padding:'6px 8px' }}><input style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'5px 8px', fontSize:12, width:'100%', outline:'none' }} value={editRow.raiser||''} placeholder="Raiser" onChange={e=>setEditRow((p:any)=>({...p,raiser:e.target.value}))} /></td>
                    <td style={{ padding:'6px 8px' }}><input style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'5px 8px', fontSize:12, width:'100%', outline:'none' }} value={editRow.supervisor||''} placeholder="Supervisor" onChange={e=>setEditRow((p:any)=>({...p,supervisor:e.target.value}))} /></td>
                    <td style={{ padding:'6px 8px' }}>
                      <select value={editRow.ptwType||''} onChange={e=>setEditRow((p:any)=>({...p,ptwType:e.target.value}))} style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'5px 8px', fontSize:12, width:'100%', outline:'none' }}>
                        <option value="">Select Type</option>
                        {['Manual','Electrical','Material Handling','Height','Excavation'].map(t=><option key={t}>{t}</option>)}
                      </select>
                    </td>
                    <td style={{ padding:'6px 8px' }}><input type="date" style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'5px 8px', fontSize:12, width:'100%', outline:'none' }} value={editRow.dateFrom||''} onChange={e=>setEditRow((p:any)=>({...p,dateFrom:e.target.value}))} /></td>
                    <td style={{ padding:'6px 8px' }}><input type="date" style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'5px 8px', fontSize:12, width:'100%', outline:'none' }} value={editRow.dateTo||''} onChange={e=>setEditRow((p:any)=>({...p,dateTo:e.target.value}))} /></td>
                    <td style={{ padding:'6px 8px' }}>
                      <select value={editRow.ptwStatus||''} onChange={e=>setEditRow((p:any)=>({...p,ptwStatus:e.target.value}))} style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'5px 8px', fontSize:12, width:'100%', outline:'none' }}>
                        <option value="">Select Status</option>
                        {['TT Rejected','Closed','Rejected','Auto Closed'].map(s=><option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ padding:'6px 8px', whiteSpace:'nowrap' as const }}>
                      <div style={{ display:'flex', gap:4 }}>
                        <button onClick={()=>savePTWRow(item)} disabled={!!saving}
                          style={{ background:T.primary, color:'#fff', border:'none', borderRadius:6, padding:'5px 10px', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                          {saving===item.id?'…':'💾'}
                        </button>
                        <button onClick={()=>{ if(item.isNew) setItems(prev=>prev.filter((i:any)=>i.id!==item.id)); setEditId(null); setEditRow({}); }}
                          style={{ background:'#fff', color:T.textMuted, border:`1px solid ${T.border}`, borderRadius:6, padding:'5px 10px', fontSize:11, cursor:'pointer' }}>✕</button>
                        <button onClick={()=>removeItem(item.id)} style={{ background:'none', border:'none', cursor:'pointer', color:T.danger, fontSize:14 }}>🗑</button>
                      </div>
                    </td>
                  </>) : (<>
                    <td style={{ padding:'8px 10px' }}><span style={{ fontSize:13, fontWeight:600, color:T.text }}>{item.ticketId||'—'}</span></td>
                    <td style={{ padding:'8px 10px' }}><span style={{ fontSize:13, color:T.text }}>{item.raiser||'—'}</span></td>
                    <td style={{ padding:'8px 10px' }}><span style={{ fontSize:13, color:T.text }}>{item.supervisor||'—'}</span></td>
                    <td style={{ padding:'8px 10px' }}><span style={{ fontSize:12, color:T.text }}>{item.ptwType||'—'}</span></td>
                    <td style={{ padding:'8px 10px' }}><span style={{ fontSize:12, color:T.textMuted }}>{fmt(item.dateFrom)}</span></td>
                    <td style={{ padding:'8px 10px' }}><span style={{ fontSize:12, color:T.textMuted }}>{fmt(item.dateTo)}</span></td>
                    <td style={{ padding:'8px 10px' }}><span style={{ fontSize:11, fontWeight:600, color:'#6B7280', background:'#F3F4F6', padding:'3px 10px', borderRadius:20 }}>{item.ptwStatus||'—'}</span></td>
                    <td style={{ padding:'8px 10px', whiteSpace:'nowrap' as const }}>
                      {canAdd && <div style={{ display:'flex', gap:4 }}>
                        <button onClick={()=>{ setEditId(item.id); setEditRow({...item}); }}
                          style={{ background:'#F0FDFA', color:'#0D9488', border:'1px solid #99F6E4', borderRadius:6, padding:'4px 8px', fontSize:11, cursor:'pointer' }}>✏️</button>
                        <button onClick={()=>removeItem(item.id)} style={{ background:'none', border:'none', cursor:'pointer', color:T.danger, fontSize:14 }}>🗑</button>
                      </div>}
                    </td>
                  </>)}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div style={{ display:'flex', gap:10, alignItems:'center', marginTop:8 }}>
        {canAdd && <button onClick={addPTW}
          style={{ background:'#fff', border:`1.5px solid ${T.primary}`, borderRadius:8, padding:'8px 18px', color:T.primary, cursor:'pointer', fontSize:13, fontWeight:700 }}>
          + Add PTW
        </button>}

      </div>

      {!canEdit && items.length === 0 && (
        <div style={{ padding:'10px 14px', borderRadius:8, background:'#FEF2F2', border:'1px solid #FECACA' }}>
          <span style={{ fontSize:12, fontWeight:600, color:T.danger }}>⚠️ No PTW issued — Required before vendor commences work</span>
        </div>
      )}
    </div>
  );
}
// ── STN Section Component ─────────────────────────────────────────────────────
function SRNSection({ projectId, role, onAllApproved }: { projectId:string; role:string; onAllApproved:(v:boolean)=>void }) {
  const { getByProject, updateItem } = usePOItems();
  const { profile } = useAuth();
  const { logActivity: logSTN } = useActivity();
  const allSTNItems = getByProject(projectId);
  const items = allSTNItems.filter((i:any) => i.utilisedStatus && i.utilisedStatus !== 'pending');
  const [saving,          setSaving]          = React.useState<string|null>(null);
  const [returnMap,       setReturnMap]       = React.useState<Record<string,string>>({});
  const [returnDateMap,   setReturnDateMap]   = React.useState<Record<string,string>>({});
  const [toast,           setToast]           = React.useState<any>(null);
  const [utilisedMap,     setUtilisedMap]     = React.useState<Record<string,string>>({});
  const [vendorCommentMap,setVendorCommentMap]= React.useState<Record<string,string>>({});

  React.useEffect(() => {
    const allApproved = items.length > 0 && items.every((i:any) => i.utilisedStatus === 'pm_approved');
    onAllApproved(allApproved);
  }, [items, onAllApproved]);

  const submitUtilised = async (item: any) => {
    if (item.utilisedQty === null || item.utilisedQty === undefined) return;
    setSaving(item.id);
    try {
      await updateItem(item.id, { utilisedQty: item.utilisedQty, utilisedStatus: 'submitted' } as any);
      logSTN(projectId, `STN ${(item as any).hsnCode||item.description} utilisation submitted`, profile?.full_name||'', profile?.role||'').catch(()=>{});
      setToast({ msg:'✅ Utilisation submitted for PM approval', type:'success' });
    } catch(err:any) { setToast({ msg:'❌ ' + err.message, type:'error' }); }
    finally { setSaving(null); }
  };

  const resubmitUtilised = async (item: any) => {
    const qty = utilisedMap[item.id] !== undefined ? Number(utilisedMap[item.id]) : Number(item.utilisedQty ?? 0);
    const comment = vendorCommentMap[item.id]?.trim() || '';
    if (!qty) { setToast({ msg:'Please enter utilised quantity', type:'error' }); return; }
    if (!comment) { setToast({ msg:'Please enter a comment explaining the change', type:'error' }); return; }
    setSaving(item.id);
    try {
      await updateItem(item.id, { utilisedQty: qty, utilisedStatus: 'submitted', pmApprovedQty: null, pmComment: comment } as any);
      logSTN(projectId, `STN resubmitted by vendor: ${comment}`, profile?.full_name||'', profile?.role||'').catch(()=>{});
      setToast({ msg:'✅ Resubmitted for PM approval', type:'success' });
      setVendorCommentMap(p => { const n={...p}; delete n[item.id]; return n; });
    } catch(err:any) { setToast({ msg:'❌ ' + err.message, type:'error' }); }
    finally { setSaving(null); }
  };

  const pmApprove = async (item: any) => {
    setSaving(item.id);
    try {
      await updateItem(item.id, { utilisedStatus:'pm_approved', pmApprovedQty: item.utilisedQty||0 } as any);
      logSTN(projectId, `STN ${(item as any).hsnCode||item.description} PM approved`, profile?.full_name||'', profile?.role||'').catch(()=>{});
      setToast({ msg:'✅ Approved', type:'success' });
    } catch(err:any) { setToast({ msg:'❌ ' + err.message, type:'error' }); }
    finally { setSaving(null); }
  };

  const pmReject = async (item: any) => {
    setRejectTarget(item);
    setRejectComment('');
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    if (!rejectComment.trim()) { setToast({ msg:'Please enter a rejection comment', type:'error' }); return; }
    setSaving(rejectTarget.id);
    try {
      await updateItem(rejectTarget.id, { utilisedStatus:'pm_rejected', pmApprovedQty: 0, pmComment: rejectComment.trim() } as any);
      logSTN(projectId, `STN item rejected: ${rejectComment}`, profile?.full_name||'', profile?.role||'').catch(()=>{});
      setToast({ msg:'✗ Rejected with comment', type:'info' });
      setRejectTarget(null); setRejectComment('');
    } catch(err:any) { setToast({ msg:'❌ ' + err.message, type:'error' }); }
    finally { setSaving(null); }
  };

  const saveReturn = async (item: any) => {
    const qty = Number(returnMap[item.id] ?? 0);
    const date = returnDateMap[item.id] || new Date().toISOString().split('T')[0];
    if (!qty) { setToast({ msg:'Please enter return quantity', type:'error' }); return; }
    setSaving(item.id);
    try {
      await updateItem(item.id, { returnQty: qty, srnDate: date } as any);
      logSTN(projectId, `STN ${(item as any).hsnCode||item.description} return qty entered`, profile?.full_name||'', profile?.role||'').catch(()=>{});
      setToast({ msg:'✅ Return details saved', type:'success' });
    } catch(err:any) { setToast({ msg:'❌ ' + err.message, type:'error' }); }
    finally { setSaving(null); }
  };

  const pmMarkReturnReceived = async (item: any, received: boolean) => {
    setSaving(item.id);
    try {
      await updateItem(item.id, { returnReceived: received } as any);
      logSTN(projectId, `STN ${(item as any).hsnCode||item.description} return marked ${received?'Received':'Not Received'}`, profile?.full_name||'', profile?.role||'').catch(()=>{});
      setToast({ msg: received ? '✅ Marked as Received' : '❌ Marked as Not Received', type: received ? 'success' : 'info' });
    } catch(err:any) { setToast({ msg:'❌ ' + err.message, type:'error' }); }
    finally { setSaving(null); }
  };

  const STATUS_BADGE: Record<string,{color:string;bg:string;label:string}> = {
    pending:     { color:'#6B7280', bg:'#F9FAFB', label:'Pending'   },
    submitted:   { color:'#2563EB', bg:'#EFF6FF', label:'Submitted' },
    pm_approved: { color:'#0D9488', bg:'#F0FDFA', label:'Approved'  },
    pm_rejected: { color:'#DC2626', bg:'#FEF2F2', label:'Rejected'  },
  };

  const isPM     = ['project_manager','super_admin','region_manager'].includes(role);
  const isVendor = role === 'vendor';
  const [rejectTarget, setRejectTarget] = React.useState<any>(null);
  const [rejectComment, setRejectComment] = React.useState('');
  const [commentPopup, setCommentPopup] = React.useState<any>(null);

  const thS: React.CSSProperties = { padding:'9px 12px', fontSize:10, fontWeight:700, textTransform:'uppercase',
    color:T.primary, background:T.primaryLight, textAlign:'left' as const, borderBottom:`2px solid ${T.primaryMid}`, whiteSpace:'nowrap' as const };
  const tdS: React.CSSProperties = { padding:'10px 12px', fontSize:12, borderBottom:`1px solid ${T.border}`, verticalAlign:'middle' as const };

  if (items.length === 0) return <div style={{ textAlign:'center' as const, padding:'24px 0', color:T.textDim, fontSize:13 }}>No utilisation submitted yet</div>;

  return (
    <div>
      {/* Reject Modal */}
      {rejectTarget && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000,
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:14, padding:28, width:420, boxShadow:'0 8px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize:16, fontWeight:700, color:'#DC2626', marginBottom:8 }}>✗ Reject STN Item</div>
            <div style={{ fontSize:13, color:'#374151', marginBottom:12 }}>
              <strong>{rejectTarget.description}</strong><br/>
              <span style={{ color:'#6B7280', fontSize:12 }}>Utilised Qty: {rejectTarget.utilisedQty}</span>
            </div>
            <label style={{ fontSize:11, fontWeight:600, color:'#6B7280', textTransform:'uppercase' as const }}>Rejection Comment *</label>
            <textarea value={rejectComment} onChange={e=>setRejectComment(e.target.value)}
              placeholder="Enter reason for rejection…"
              rows={3}
              style={{ width:'100%', marginTop:6, marginBottom:14, border:'1.5px solid #E5E7EB', borderRadius:8,
                padding:'8px 10px', fontSize:13, outline:'none', resize:'vertical' as const, boxSizing:'border-box' as const }} />
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={()=>setRejectTarget(null)}
                style={{ padding:'8px 18px', borderRadius:8, border:'1px solid #E5E7EB', background:'#fff', cursor:'pointer', fontSize:13 }}>Cancel</button>
              <button onClick={confirmReject} disabled={!rejectComment.trim()}
                style={{ padding:'8px 18px', borderRadius:8, border:'none', background:'#DC2626', color:'#fff',
                  cursor:rejectComment.trim()?'pointer':'not-allowed', fontSize:13, fontWeight:600, opacity:rejectComment.trim()?1:0.5 }}>
                ✗ Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comment Popup */}
      {commentPopup && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000,
          display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={()=>setCommentPopup(null)}>
          <div style={{ background:'#fff', borderRadius:14, padding:28, width:400, boxShadow:'0 8px 40px rgba(0,0,0,0.2)' }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize:15, fontWeight:700, color:'#7C3AED', marginBottom:8 }}>💬 PM Comment</div>
            <div style={{ fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>{commentPopup.description}</div>
            <div style={{ fontSize:13, color:'#DC2626', background:'#FEF2F2', borderRadius:8, padding:'10px 14px', lineHeight:1.6 }}>
              {commentPopup.pmComment}
            </div>
            <div style={{ marginTop:14, textAlign:'right' as const }}>
              <button onClick={()=>setCommentPopup(null)}
                style={{ padding:'7px 18px', borderRadius:8, border:'1px solid #E5E7EB', background:'#fff', cursor:'pointer', fontSize:13 }}>Close</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ overflowX:'auto' as const }}>
        <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
          <thead>
            <tr>
              {[
                {h:'#',w:28},{h:'Code',w:120},{h:'Description',w:260},{h:'UOM',w:50},
                {h:'Issued',w:60},{h:'Utilised',w:70},{h:'Status',w:90},{h:'PM Approved',w:90},
                {h:'Balance',w:70},{h:'Comments',w:120},{h:'Return Qty',w:80},{h:'Return Date',w:90},{h:'Return Received',w:100},{h:'Actions',w:80},
              ].map(({h,w},i)=>(
                <th key={i} style={{ ...thS, minWidth:w, textAlign:i>=4&&i<=9?'right' as const:'left' as const }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const badge = STATUS_BADGE[(item as any).utilisedStatus] || STATUS_BADGE.pending;
              const balance = Math.max(0, (item.quantity||0) - ((item as any).pmApprovedQty||(item as any).utilisedQty||0));
              const isSaving = saving === item.id;
              const hasReturn = (item as any).returnQty > 0;
              const returnReceived = (item as any).returnReceived;
              return (
                <tr key={item.id} style={{ background:idx%2===0?'#fff':T.bg }}>
                  <td style={{ ...tdS, color:T.textMuted, width:32 }}>{idx+1}</td>
                  <td style={{ ...tdS, fontWeight:600, color:T.primary, whiteSpace:'nowrap' as const }}>{(item as any).hsnCode||'—'}</td>
                  <td style={{ ...tdS }}>{item.description}</td>
                  <td style={{ ...tdS, color:T.textMuted }}>{item.uom}</td>
                  <td style={{ ...tdS, textAlign:'right' as const, fontWeight:600 }}>{item.quantity}</td>
                  <td style={{ ...tdS, textAlign:'right' as const }}>
                    <span style={{ fontWeight:600 }}>{(item as any).utilisedQty??'—'}</span>
                  </td>
                  <td style={{ ...tdS }}>
                    <span style={{ fontSize:11, fontWeight:700, color:badge.color, background:badge.bg,
                      padding:'2px 8px', borderRadius:20, whiteSpace:'nowrap' as const }}>{badge.label}</span>
                  </td>
                  <td style={{ ...tdS, textAlign:'right' as const, fontWeight:600, color:T.success }}>
                    {item.utilisedStatus==='pm_approved'?item.pmApprovedQty:'—'}
                  </td>
                  <td style={{ ...tdS, textAlign:'right' as const, color:balance>0?T.warning:T.success, fontWeight:600 }}>
                    {item.utilisedStatus==='pm_approved'?balance:'—'}
                  </td>
                  <td style={{ ...tdS, textAlign:'center' as const }}>
                    {(item as any).pmComment ? (
                      <span onClick={()=>setCommentPopup(item)}
                        style={{ fontSize:11, fontWeight:700, color:'#7C3AED', background:'#F5F3FF',
                          padding:'2px 10px', borderRadius:20, cursor:'pointer', whiteSpace:'nowrap' as const }}>
                        💬 1
                      </span>
                    ) : <span style={{ color:T.textDim }}>—</span>}
                  </td>
                  <td style={{ ...tdS, textAlign:'right' as const, fontWeight:600, color:T.primary }}>
                    {hasReturn ? (item as any).returnQty : '—'}
                  </td>
                  <td style={{ ...tdS, color:T.textMuted, fontSize:12 }}>
                    {(item as any).srnDate ? new Date((item as any).srnDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'}
                  </td>
                  <td style={{ ...tdS }}>
                    {!hasReturn ? <span style={{ color:T.textDim, fontSize:11 }}>—</span>
                    : returnReceived === true  ? <span style={{ fontSize:11, fontWeight:700, color:'#0D9488', background:'#F0FDFA', padding:'2px 10px', borderRadius:20 }}>✓ Yes</span>
                    : returnReceived === false ? <span style={{ fontSize:11, fontWeight:700, color:'#DC2626', background:'#FEF2F2', padding:'2px 10px', borderRadius:20 }}>✗ No</span>
                    : <span style={{ color:T.textDim, fontSize:11 }}>Pending</span>}
                  </td>
                  <td style={{ ...tdS, whiteSpace:'nowrap' as const }}>
                    {isVendor && item.utilisedStatus==='pending' && (
                      <button onClick={()=>submitUtilised(item)} disabled={isSaving||item.utilisedQty===null}
                        style={{ background:T.primary, color:'#fff', border:'none', borderRadius:6,
                          padding:'4px 10px', fontSize:11, cursor:'pointer', fontWeight:600,
                          opacity:isSaving||item.utilisedQty===null?0.5:1 }}>
                        {isSaving?'…':'Submit'}
                      </button>
                    )}
                    {isVendor && (item as any).utilisedStatus==='pm_rejected' && (
                      <div style={{ display:'flex', flexDirection:'column' as const, gap:4, minWidth:160 }}>
                        <div style={{ fontSize:10, color:'#DC2626', fontWeight:600, marginBottom:2 }}>Rejected — Resubmit</div>
                        <input type="number" min={0} max={item.quantity}
                          value={utilisedMap[item.id]??((item as any).utilisedQty??'')}
                          onChange={e=>setUtilisedMap(p=>({...p,[item.id]:e.target.value}))}
                          placeholder="New Qty"
                          style={{ width:'100%', border:`1px solid #FECACA`, borderRadius:6, padding:'3px 6px', fontSize:11, outline:'none' }} />
                        <input type="text"
                          value={vendorCommentMap[item.id]??''}
                          onChange={e=>setVendorCommentMap(p=>({...p,[item.id]:e.target.value}))}
                          placeholder="Comment (required)"
                          style={{ width:'100%', border:`1px solid #FECACA`, borderRadius:6, padding:'3px 6px', fontSize:11, outline:'none' }} />
                        <button onClick={()=>resubmitUtilised(item)} disabled={isSaving}
                          style={{ background:'#D97706', color:'#fff', border:'none', borderRadius:6,
                            padding:'4px 8px', fontSize:11, cursor:'pointer', fontWeight:600, opacity:isSaving?0.5:1 }}>
                          {isSaving?'…':'🔄 Resubmit'}
                        </button>
                      </div>
                    )}
                    {isPM && item.utilisedStatus==='submitted' && (
                      <div style={{ display:'flex', gap:4 }}>
                        <button onClick={()=>pmApprove(item)} disabled={isSaving}
                          style={{ background:T.success, color:'#fff', border:'none', borderRadius:6,
                            padding:'4px 10px', fontSize:11, cursor:'pointer', fontWeight:600 }}>
                          ✓ Approve
                        </button>
                        <button onClick={()=>pmReject(item)} disabled={isSaving}
                          style={{ background:T.danger, color:'#fff', border:'none', borderRadius:6,
                            padding:'4px 10px', fontSize:11, cursor:'pointer', fontWeight:600 }}>
                          ✗ Reject
                        </button>
                      </div>
                    )}
                    {(isVendor || role==='super_admin') && item.utilisedStatus==='pm_approved' && balance>0 && !hasReturn && (
                      <div style={{ display:'flex', flexDirection:'column' as const, gap:4 }}>
                        <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                          <input type="number" min={0} max={balance}
                            value={returnMap[item.id]??''}
                            onChange={e=>setReturnMap(p=>({...p,[item.id]:e.target.value}))}
                            placeholder="Return Qty"
                            style={{ width:75, border:`1px solid ${T.border}`, borderRadius:6, padding:'3px 6px', fontSize:11, outline:'none' }} />
                          <DateInput
                            value={returnDateMap[item.id]??''}
                            onChange={v=>setReturnDateMap(p=>({...p,[item.id]:v}))}
                            style={{ border:`1px solid ${T.border}`, borderRadius:6, fontSize:11 }} />
                        </div>
                        <button onClick={()=>saveReturn(item)} disabled={isSaving||!returnMap[item.id]}
                          style={{ background:T.primary, color:'#fff', border:'none', borderRadius:6, padding:'4px 8px', fontSize:11, cursor:'pointer',
                            opacity:!returnMap[item.id]?0.5:1 }}>
                          {isSaving?'…':'📦 Save Return'}
                        </button>
                      </div>
                    )}
                    {isPM && hasReturn && returnReceived === undefined && (
                      <div style={{ display:'flex', gap:4 }}>
                        <button onClick={()=>pmMarkReturnReceived(item, true)} disabled={isSaving}
                          style={{ background:'#0D9488', color:'#fff', border:'none', borderRadius:6,
                            padding:'4px 10px', fontSize:11, cursor:'pointer', fontWeight:600 }}>
                          ✓ Yes
                        </button>
                        <button onClick={()=>pmMarkReturnReceived(item, false)} disabled={isSaving}
                          style={{ background:'#DC2626', color:'#fff', border:'none', borderRadius:6,
                            padding:'4px 10px', fontSize:11, cursor:'pointer', fontWeight:600 }}>
                          ✗ No
                        </button>
                      </div>
                    )}
                    {isVendor && (item as any).utilisedStatus==='pm_rejected' && (
                      <button onClick={()=>submitUtilised(item)} disabled={isSaving}
                        style={{ background:T.warning, color:'#fff', border:'none', borderRadius:6,
                          padding:'4px 10px', fontSize:11, cursor:'pointer' }}>
                        Resubmit
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
    </div>
  );
}

// ── Independent SRN Section Component ────────────────────────────────────────
function SRNSectionNew({ projectId, role, onAllReceived, onCountChange, canAdd: canAddApplicable=true }: { projectId:string; role:string; onAllReceived:(v:boolean)=>void; onCountChange?:(n:number)=>void; canAdd?:boolean }) {
  const { profile } = useAuth();
  const { updateProject: updateProj } = useProjects();
  const { logActivity: logSRNAct } = useActivity();
  const sb = createClient();

  const [items,   setItems]   = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving,  setSaving]  = React.useState<string|null>(null);
  const [adding,  setAdding]  = React.useState(false);
  const [toast,   setToast]   = React.useState<any>(null);
  const [newRow,  setNewRow]  = React.useState({
    description:'', hsn_code:'', uom:'', quantity:'', rate:'', gst_rate:'18', amount:'',
    serial_no:'', document_no:'', boq_req_no:'', return_qty:'', return_date:'',
    lifted_date:'', gate_entry_no:'', vehicle_no:'',
  });

  const fetchItems = React.useCallback(async () => {
    setLoading(true);
    const { data } = await sb.from('srn').select('*').eq('project_id', projectId).order('sort_order').order('created_at');
    setItems(data || []);
    setLoading(false);
  }, [projectId]);

  React.useEffect(() => { fetchItems(); }, [fetchItems]);

  React.useEffect(() => {
    const allReceived = items.length > 0 && items.every((i:any) => i.received === true);
    onAllReceived(allReceived);
  }, [items, onAllReceived]);

  React.useEffect(() => { onCountChange?.(items.length); }, [items, onCountChange]);

  const isPM    = ['project_manager','super_admin','region_manager'].includes(role);
  const canAdd  = ['super_admin','vendor','pm','project_manager'].includes(role) && canAddApplicable;
  const canEdit = ['super_admin','pm','rm','project_manager','super_admin','region_manager'].includes(role);
  const [editId,  setEditId]  = React.useState<string|null>(null);
  const [editRow, setEditRow] = React.useState<any>({});
  const [srnPdfUploading, setSrnPdfUploading] = React.useState(false);
  const [srnPdfItems,     setSrnPdfItems]     = React.useState<any[]|null>(null);
  const srnPdfRef = React.useRef<HTMLInputElement>(null);

  const uploadSrnPdf = async (file: File) => {
    setSrnPdfUploading(true);
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      const arrayBuf = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuf) }).promise;
      const images: string[] = [];
      for (let i = 1; i <= Math.min(pdf.numPages, 15); i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.8 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width; canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
        images.push(canvas.toDataURL('image/jpeg', 0.65).replace('data:image/jpeg;base64,', ''));
      }
      const { data: { session } } = await (await import('@/lib/supabase')).createClient().auth.getSession();
      const token = session?.access_token || '';
      const res = await fetch('/api/upload/extract-stn', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ images }),
      });
      const json = await res.json();
      if (!res.ok) { setToast({ msg:'❌ ' + (json.error||'Failed'), type:'error' }); return; }
      const { documentNo, liftedDate, gateEntryNo, vehicleNo, boqReqNo, items: extracted } = json.data;
      setSrnPdfItems((extracted||[]).map((it:any) => ({
        description: it.description||'', hsn_code: it.hsnCode||'', uom: it.uom||'Nos',
        quantity: String(it.quantity||1), serial_no: it.serialNo||'', amount: String(it.amount||0),
        document_no: documentNo||'', lifted_date: liftedDate||'', gate_entry_no: gateEntryNo||'',
        vehicle_no: vehicleNo||'', boq_req_no: it.boqReqNo||boqReqNo||'',
        rate:'', gst_rate:'18', return_qty:'', return_date:'',
      })));
    } catch(e:any) { setToast({ msg:'❌ ' + e.message, type:'error' }); }
    finally { setSrnPdfUploading(false); if (srnPdfRef.current) srnPdfRef.current.value = ''; }
  };

  const saveSrnPdfItems = async () => {
    if (!srnPdfItems?.length) return;
    setSaving('pdf');
    let added = 0;
    const errors: string[] = [];
    for (let i = 0; i < srnPdfItems.length; i++) {
      const it = srnPdfItems[i];
      try {
        const payload: any = {
          project_id:  projectId,
          description: it.description || 'Item ' + (i+1),
          hsn_code:    it.hsn_code || '',
          uom:         it.uom || 'Nos',
          quantity:    Number(it.quantity) || 1,
          rate:        0,
          gst_rate:    18,
          amount:      Number(it.amount) || 0,
          serial_no:   it.serial_no || '',
          document_no: it.document_no || '',
          boq_req_no:  it.boq_req_no || '',
          sort_order:  items.length + i + 1,
        };
        if (it.lifted_date)   payload.lifted_date   = it.lifted_date;
        if (it.gate_entry_no) payload.gate_entry_no = it.gate_entry_no;
        if (it.vehicle_no)    payload.vehicle_no    = it.vehicle_no;
        const { error } = await sb.from('srn').insert(payload);
        if (error) { console.error('SRN insert error:', error); errors.push(error.message); }
        else added++;
      } catch(e:any) { console.error('SRN insert exception:', e); errors.push(e.message); }
    }
    await fetchItems();
    setSrnPdfItems(null);
    setSaving(null);
    if (errors.length) setToast({ msg:`⚠️ ${added} saved, ${errors.length} failed: ${errors[0]}`, type:'error' });
    else setToast({ msg:`✅ ${added} SRN item${added!==1?'s':''} added from delivery challan`, type:'success' });
    if (added > 0) logSRNAct(projectId, `${added} SRN items imported from delivery challan PDF`, profile?.full_name||'', profile?.role||'').catch(()=>{});
  };

  const addItem = async () => {
    if (!newRow.description.trim()) { setToast({ msg:'Description is required', type:'error' }); return; }
    setSaving('new');
    try {
      const payload = {
        project_id:  projectId,
        description: newRow.description.trim(),
        hsn_code:    newRow.hsn_code.trim(),
        uom:         newRow.uom.trim(),
        quantity:    Number(newRow.quantity)||0,
        rate:        Number(newRow.rate)||0,
        gst_rate:    Number(newRow.gst_rate)||0,
        amount:      Number(newRow.amount)||0,
        serial_no:   newRow.serial_no.trim(),
        document_no: newRow.document_no.trim(),
        boq_req_no:  newRow.boq_req_no.trim(),
        return_qty:  Number(newRow.return_qty)||0,
        return_date: newRow.return_date || null,
        lifted_date:  newRow.lifted_date || null,
        gate_entry_no: newRow.gate_entry_no.trim() || null,
        vehicle_no:   newRow.vehicle_no.trim() || null,
        received:    false,
        sort_order:  items.length + 1,
      };
      const { error } = await sb.from('srn').insert(payload);
      if (error) throw new Error(error.message);
      logSRNAct(projectId, `SRN item added: ${newRow.description}`, profile?.full_name||'', profile?.role||'').catch(()=>{});
      setNewRow({ description:'', hsn_code:'', uom:'', quantity:'', rate:'', gst_rate:'18', amount:'', serial_no:'', document_no:'', boq_req_no:'', return_qty:'', return_date:'', lifted_date:'', gate_entry_no:'', vehicle_no:'' });
      setAdding(false);
      setToast({ msg:'✅ SRN item added', type:'success' });
      await fetchItems();
    } catch(err:any) { setToast({ msg:'❌ ' + err.message, type:'error' }); }
    finally { setSaving(null); }
  };

  const markReceived = async (item: any, received: boolean) => {
    setSaving(item.id);
    try {
      const { error } = await sb.from('srn').update({ received }).eq('id', item.id);
      if (error) throw new Error(error.message);
      const updatedItems = items.map((i:any) => i.id === item.id ? { ...i, received } : i);
      setItems(updatedItems);
      const allDone = updatedItems.length > 0 && updatedItems.every((i:any) => i.received === true);
      if (allDone && received) {
        setToast({ msg:'✅ All SRN items received', type:'success' });
        logSRNAct(projectId, 'All SRN items received', profile?.full_name||'', profile?.role||'').catch(()=>{});
      } else {
        setToast({ msg: received ? '✅ Marked as Received' : '❌ Marked as Not Received', type: received ? 'success' : 'info' });
      }
    } catch(err:any) { setToast({ msg:'❌ ' + err.message, type:'error' }); }
    finally { setSaving(null); }
  };

  const saveEdit = async () => {
    if (!editId) return;
    setSaving(editId);
    try {
      const payload: any = {
        description:   editRow.description?.trim(),
        hsn_code:      editRow.hsn_code?.trim() || null,
        uom:           editRow.uom?.trim() || null,
        quantity:      Number(editRow.quantity)||0,
        rate:          Number(editRow.rate)||0,
        gst_rate:      Number(editRow.gst_rate)||18,
        amount:        Number(editRow.amount)||0,
        serial_no:     editRow.serial_no?.trim() || null,
        document_no:   editRow.document_no?.trim() || null,
        boq_req_no:    editRow.boq_req_no?.trim() || null,
        return_qty:    Number(editRow.return_qty)||0,
        return_date:   editRow.return_date || null,
        lifted_date:   editRow.lifted_date || null,
        gate_entry_no: editRow.gate_entry_no?.trim() || null,
        vehicle_no:    editRow.vehicle_no?.trim() || null,
      };
      const { error } = await sb.from('srn').update(payload).eq('id', editId);
      if (error) throw new Error(error.message);
      setItems(prev => prev.map((i:any) => i.id === editId ? { ...i, ...payload } : i));
      logSRNAct(projectId, `SRN item edited: ${editRow.description}`, profile?.full_name||'', profile?.role||'').catch(()=>{});
      setToast({ msg:'✅ SRN item updated', type:'success' });
      setEditId(null); setEditRow({});
    } catch(err:any) { setToast({ msg:'❌ ' + err.message, type:'error' }); }
    finally { setSaving(null); }
  };

  const deleteItem = async (id: string) => {
    if (!window.confirm('Delete this SRN item?')) return;
    setSaving(id);
    try {
      const { error } = await sb.from('srn').delete().eq('id', id);
      if (error) throw new Error(error.message);
      setItems(prev => prev.filter((i:any) => i.id !== id));
      setToast({ msg:'Deleted', type:'info' });
    } catch(err:any) { setToast({ msg:'❌ ' + err.message, type:'error' }); }
    finally { setSaving(null); }
  };

  const thS: React.CSSProperties = { padding:'9px 12px', fontSize:10, fontWeight:700, textTransform:'uppercase',
    color:T.primary, background:T.primaryLight, textAlign:'left' as const, borderBottom:`2px solid ${T.primaryMid}`, whiteSpace:'nowrap' as const };
  const tdS: React.CSSProperties = { padding:'10px 12px', fontSize:12, borderBottom:`1px solid ${T.border}`, verticalAlign:'middle' as const };
  const inp: React.CSSProperties = { border:`1px solid ${T.border}`, borderRadius:6, padding:'5px 8px', fontSize:12, outline:'none', width:'100%', background:'#fff' };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <div style={{ fontSize:12, color:T.textMuted }}>{items.length} item{items.length!==1?'s':''}</div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {canAdd && (
            <button onClick={()=>setAdding(true)}
              style={{ background:T.primary, color:'#fff', border:'none', borderRadius:7, padding:'5px 14px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
              + Add Item
            </button>
          )}
          {canAdd && (
            <label style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600,
              color:'#1E40AF', background:'#EFF6FF', border:'1px solid #BFDBFE',
              borderRadius:6, padding:'4px 10px', cursor: srnPdfUploading ? 'not-allowed' : 'pointer',
              opacity: srnPdfUploading ? 0.7 : 1 }}>
              {srnPdfUploading ? '⏳ Parsing PDF...' : '📄 Import Challan'}
              <input ref={srnPdfRef} type="file" accept=".pdf" style={{ display:'none' }}
                disabled={srnPdfUploading}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadSrnPdf(f); }} />
            </label>
          )}
        </div>
      </div>

      {/* SRN PDF Review Modal */}
      {srnPdfItems && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.6)', zIndex:1200,
          display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={()=>setSrnPdfItems(null)}>
          <div style={{ background:'#fff', borderRadius:14, padding:24, width:'100%', maxWidth:900,
            maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize:16, fontWeight:700, color:T.text, marginBottom:4 }}>📄 Review SRN Items from Delivery Challan</div>
            <div style={{ fontSize:12, color:T.textMuted, marginBottom:16 }}>{srnPdfItems.length} item{srnPdfItems.length!==1?'s':''} extracted. Review and edit before saving.</div>
            {srnPdfItems.map((it:any, idx:number) => (
              <div key={idx} style={{ border:`1px solid ${T.border}`, borderRadius:8, padding:12, marginBottom:10 }}>
                <div style={{ fontSize:11, fontWeight:700, color:T.primary, marginBottom:8 }}>Item {idx+1}</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                  {[
                    ['Description *','description','text'],['HSN / Item Code','hsn_code','text'],['UOM','uom','text'],
                    ['Quantity *','quantity','number'],['Serial No','serial_no','text'],['Amount (₹)','amount','number'],
                    ['Document No','document_no','text'],['Gate Entry No','gate_entry_no','text'],['Vehicle No','vehicle_no','text'],
                    ['BOQ Req No','boq_req_no','text'],['Lifted Date','lifted_date','date'],
                  ].map(([label,field,type]) => (
                    <div key={field as string}>
                      <div style={{ fontSize:10, fontWeight:600, color:T.textMuted, marginBottom:3, textTransform:'uppercase' as const }}>{label}</div>
                      <input type={type as string} value={it[field as string]||''} style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'6px 8px', fontSize:12, width:'100%', boxSizing:'border-box' as const, outline:'none' }}
                        onChange={e=>setSrnPdfItems(prev=>prev!.map((r:any,i:number)=>i===idx?{...r,[field as string]:e.target.value}:r))} />
                    </div>
                  ))}
                </div>
                <button onClick={()=>setSrnPdfItems(prev=>prev!.filter((_:any,i:number)=>i!==idx))}
                  style={{ marginTop:8, fontSize:11, color:T.danger, background:'none', border:'none', cursor:'pointer' }}>🗑 Remove this item</button>
              </div>
            ))}
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:16 }}>
              <button onClick={()=>setSrnPdfItems(null)} style={{ padding:'8px 18px', borderRadius:8, border:`1px solid ${T.border}`, background:'#fff', cursor:'pointer', fontSize:13 }}>Cancel</button>
              <button onClick={saveSrnPdfItems} disabled={saving==='pdf'||srnPdfItems.length===0}
                style={{ padding:'8px 18px', borderRadius:8, background:T.primary, color:'#fff', border:'none', cursor:saving==='pdf'?'not-allowed':'pointer', fontSize:13, fontWeight:600, opacity:saving==='pdf'?0.7:1 }}>
                {saving==='pdf' ? '⏳ Saving...' : `✅ Save ${srnPdfItems.length} Item${srnPdfItems.length!==1?'s':''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {adding && (
        <div style={{ background:T.primaryLight, border:`1px solid ${T.primaryMid}`, borderRadius:10, padding:16, marginBottom:16 }}>
          <div style={{ fontSize:13, fontWeight:700, color:T.primary, marginBottom:12 }}>New SRN Item</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:10 }}>
            <div style={{ gridColumn:'1/3' }}>
              <div style={{ fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:3 }}>Description *</div>
              <input style={inp} value={newRow.description} onChange={e=>setNewRow(p=>({...p,description:e.target.value}))} placeholder="Material description" />
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:3 }}>HSN Code</div>
              <input style={inp} value={newRow.hsn_code} onChange={e=>setNewRow(p=>({...p,hsn_code:e.target.value}))} placeholder="HSN" />
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:3 }}>UOM</div>
              <input style={inp} value={newRow.uom} onChange={e=>setNewRow(p=>({...p,uom:e.target.value}))} placeholder="Nos/Mtrs..." />
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:10 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:3 }}>Quantity</div>
              <input style={inp} type="number" value={newRow.quantity} onChange={e=>setNewRow(p=>({...p,quantity:e.target.value}))} placeholder="0" />
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:3 }}>Rate</div>
              <input style={inp} type="number" value={newRow.rate} onChange={e=>setNewRow(p=>({...p,rate:e.target.value}))} placeholder="0" />
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:3 }}>GST %</div>
              <input style={inp} type="number" value={newRow.gst_rate} onChange={e=>setNewRow(p=>({...p,gst_rate:e.target.value}))} placeholder="18" />
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:3 }}>Amount</div>
              <input style={inp} type="number" value={newRow.amount} onChange={e=>setNewRow(p=>({...p,amount:e.target.value}))} placeholder="0" />
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:10 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:3 }}>Serial No</div>
              <input style={inp} value={newRow.serial_no} onChange={e=>setNewRow(p=>({...p,serial_no:e.target.value}))} placeholder="Serial No" />
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:3 }}>Document No</div>
              <input style={inp} value={newRow.document_no} onChange={e=>setNewRow(p=>({...p,document_no:e.target.value}))} placeholder="Doc No" />
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:3 }}>BOQ Req No</div>
              <input style={inp} value={newRow.boq_req_no} onChange={e=>setNewRow(p=>({...p,boq_req_no:e.target.value}))} placeholder="BOQ Req No" />
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:3 }}>Return Qty</div>
              <input style={inp} type="number" value={newRow.return_qty} onChange={e=>setNewRow(p=>({...p,return_qty:e.target.value}))} placeholder="0" />
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:3 }}>Return Date</div>
              <DateInput value={newRow.return_date} onChange={v=>setNewRow(p=>({...p,return_date:v}))} style={inp} />
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:3 }}>Lifted Date</div>
              <DateInput value={newRow.lifted_date} onChange={v=>setNewRow(p=>({...p,lifted_date:v}))} style={inp} />
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:3 }}>Gate Entry No</div>
              <input style={inp} value={newRow.gate_entry_no} onChange={e=>setNewRow(p=>({...p,gate_entry_no:e.target.value}))} placeholder="Gate Entry No" />
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:3 }}>Vehicle No</div>
              <input style={inp} value={newRow.vehicle_no} onChange={e=>setNewRow(p=>({...p,vehicle_no:e.target.value}))} placeholder="Vehicle No" />
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={addItem} disabled={saving==='new'}
              style={{ background:T.primary, color:'#fff', border:'none', borderRadius:7, padding:'6px 18px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
              {saving==='new'?'Saving…':'Save SRN Item'}
            </button>
            <button onClick={()=>setAdding(false)}
              style={{ background:'#fff', color:T.textMuted, border:`1px solid ${T.border}`, borderRadius:7, padding:'6px 18px', fontSize:12, cursor:'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign:'center' as const, padding:'24px 0', color:T.textDim, fontSize:13 }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign:'center' as const, padding:'24px 0', color:T.textDim, fontSize:13 }}>No SRN items added yet</div>
      ) : (
        <div style={{ overflowX:'auto' as const }}>
          <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
            <thead>
              <tr>
                {[
                  {h:'#',w:28},{h:'Description',w:260},{h:'HSN',w:130},{h:'UOM',w:50},
                  {h:'Qty',w:50},{h:'Rate',w:60},{h:'GST%',w:50},{h:'Amount',w:80},
                  {h:'Serial No',w:100},{h:'Doc No',w:100},{h:'BOQ Req',w:90},
                  {h:'Return Qty',w:70},{h:'Return Date',w:90},{h:'Lifted Date',w:90},
                  {h:'Gate Entry No',w:90},{h:'Vehicle No',w:90},{h:'Received',w:80},{h:'Actions',w:80},
                ].map(({h,w},i)=>(
                  <th key={i} style={{ ...thS, minWidth:w, textAlign:i>=4&&i<=7?'right' as const:'left' as const }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item:any, idx:number) => (
                <React.Fragment key={item.id}>
                <tr style={{ background:idx%2===0?'#fff':T.bg }}>
                  <td style={{ ...tdS, color:T.textMuted, width:32 }}>{idx+1}</td>
                  <td style={{ ...tdS, fontWeight:600 }}>{item.description}</td>
                  <td style={{ ...tdS, color:T.textMuted }}>{item.hsn_code||'—'}</td>
                  <td style={{ ...tdS, color:T.textMuted }}>{item.uom||'—'}</td>
                  <td style={{ ...tdS, textAlign:'right' as const }}>{item.quantity}</td>
                  <td style={{ ...tdS, textAlign:'right' as const }}>{item.rate}</td>
                  <td style={{ ...tdS, textAlign:'right' as const }}>{item.gst_rate}%</td>
                  <td style={{ ...tdS, textAlign:'right' as const, fontWeight:600 }}>{Number(item.amount).toLocaleString('en-IN')}</td>
                  <td style={{ ...tdS, color:T.textMuted }}>{item.serial_no||'—'}</td>
                  <td style={{ ...tdS, color:T.textMuted }}>{item.document_no||'—'}</td>
                  <td style={{ ...tdS, color:T.textMuted }}>{item.boq_req_no||'—'}</td>
                  <td style={{ ...tdS, fontWeight:600, color:T.primary }}>{item.return_qty||'—'}</td>
                  <td style={{ ...tdS, color:T.textMuted }}>
                    {item.return_date ? new Date(item.return_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'}
                  </td>
                  <td style={{ ...tdS, color:T.textMuted }}>
                    {item.lifted_date ? new Date(item.lifted_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'}
                  </td>
                  <td style={{ ...tdS, color:T.textMuted }}>{item.gate_entry_no||'—'}</td>
                  <td style={{ ...tdS, color:T.textMuted }}>{item.vehicle_no||'—'}</td>
                  <td style={{ ...tdS }}>
                    {item.received
                      ? <span style={{ fontSize:11, fontWeight:700, color:'#0D9488', background:'#F0FDFA', padding:'2px 10px', borderRadius:20 }}>✓ Yes</span>
                      : <span style={{ fontSize:11, fontWeight:700, color:'#DC2626', background:'#FEF2F2', padding:'2px 10px', borderRadius:20 }}>✗ No</span>}
                  </td>
                  <td style={{ ...tdS, whiteSpace:'nowrap' as const }}>
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap' as const }}>
                      {isPM && !item.received && (
                        <>
                          <button onClick={()=>markReceived(item, true)} disabled={saving===item.id}
                            style={{ background:'#0D9488', color:'#fff', border:'none', borderRadius:6, padding:'4px 10px', fontSize:11, cursor:'pointer', fontWeight:600 }}>
                            ✓ Yes
                          </button>
                          <button onClick={()=>markReceived(item, false)} disabled={saving===item.id}
                            style={{ background:'#DC2626', color:'#fff', border:'none', borderRadius:6, padding:'4px 10px', fontSize:11, cursor:'pointer', fontWeight:600 }}>
                            ✗ No
                          </button>
                        </>
                      )}
                      {canEdit && (
                        <button onClick={()=>{ setEditId(editId===item.id?null:item.id); setEditRow({...item}); }}
                          style={{ background:editId===item.id?T.primary:'#F0FDFA', color:editId===item.id?'#fff':'#0D9488', border:`1px solid #99F6E4`, borderRadius:6, padding:'4px 8px', fontSize:11, cursor:'pointer' }}>
                          ✏️
                        </button>
                      )}
                      {canAdd && (
                        <button onClick={()=>deleteItem(item.id)} disabled={saving===item.id}
                          style={{ background:'#FEF2F2', color:'#DC2626', border:`1px solid #FECACA`, borderRadius:6, padding:'4px 8px', fontSize:11, cursor:'pointer' }}>
                          🗑
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {editId === item.id && (
                  <tr style={{ background:T.primaryLight }}>
                    <td colSpan={18} style={{ padding:14, borderBottom:`1px solid ${T.border}` }}>
                      <div style={{ fontSize:12, fontWeight:700, color:T.primary, marginBottom:10 }}>✏️ Edit SRN Item</div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:8 }}>
                        <div style={{ gridColumn:'1/3' }}>
                          <div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>Description *</div>
                          <input style={inp} value={editRow.description||''} onChange={e=>setEditRow((p:any)=>({...p,description:e.target.value}))} />
                        </div>
                        <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>HSN Code</div><input style={inp} value={editRow.hsn_code||''} onChange={e=>setEditRow((p:any)=>({...p,hsn_code:e.target.value}))} /></div>
                        <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>UOM</div><input style={inp} value={editRow.uom||''} onChange={e=>setEditRow((p:any)=>({...p,uom:e.target.value}))} /></div>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:8 }}>
                        <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>Qty</div><input style={inp} type="number" value={editRow.quantity||''} onChange={e=>setEditRow((p:any)=>({...p,quantity:e.target.value}))} /></div>
                        <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>Rate</div><input style={inp} type="number" value={editRow.rate||''} onChange={e=>setEditRow((p:any)=>({...p,rate:e.target.value}))} /></div>
                        <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>GST%</div><input style={inp} type="number" value={editRow.gst_rate||''} onChange={e=>setEditRow((p:any)=>({...p,gst_rate:e.target.value}))} /></div>
                        <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>Amount</div><input style={inp} type="number" value={editRow.amount||''} onChange={e=>setEditRow((p:any)=>({...p,amount:e.target.value}))} /></div>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:8 }}>
                        <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>Serial No</div><input style={inp} value={editRow.serial_no||''} onChange={e=>setEditRow((p:any)=>({...p,serial_no:e.target.value}))} /></div>
                        <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>Doc No</div><input style={inp} value={editRow.document_no||''} onChange={e=>setEditRow((p:any)=>({...p,document_no:e.target.value}))} /></div>
                        <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>BOQ Req No</div><input style={inp} value={editRow.boq_req_no||''} onChange={e=>setEditRow((p:any)=>({...p,boq_req_no:e.target.value}))} /></div>
                        <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>Return Qty</div><input style={inp} type="number" value={editRow.return_qty||''} onChange={e=>setEditRow((p:any)=>({...p,return_qty:e.target.value}))} /></div>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:12 }}>
                        <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>Return Date</div><DateInput value={editRow.return_date||''} onChange={v=>setEditRow((p:any)=>({...p,return_date:v}))} style={inp} max="9999-12-31" /></div>
                        <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>Lifted Date</div><DateInput value={editRow.lifted_date||''} onChange={v=>setEditRow((p:any)=>({...p,lifted_date:v}))} style={inp} max="9999-12-31" /></div>
                        <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>Gate Entry No</div><input style={inp} value={editRow.gate_entry_no||''} onChange={e=>setEditRow((p:any)=>({...p,gate_entry_no:e.target.value}))} /></div>
                        <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>Vehicle No</div><input style={inp} value={editRow.vehicle_no||''} onChange={e=>setEditRow((p:any)=>({...p,vehicle_no:e.target.value}))} /></div>
                      </div>
                      <div style={{ display:'flex', gap:8 }}>
                        <button onClick={saveEdit} disabled={saving===editId}
                          style={{ background:T.primary, color:'#fff', border:'none', borderRadius:7, padding:'6px 18px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                          {saving===editId?'Saving…':'💾 Save Changes'}
                        </button>
                        <button onClick={()=>{ setEditId(null); setEditRow({}); }}
                          style={{ background:'#fff', color:T.textMuted, border:`1px solid ${T.border}`, borderRadius:7, padding:'6px 18px', fontSize:12, cursor:'pointer' }}>
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {toast && <Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
    </div>
  );
}

function ExpensesSection({ projectId, canAdd }: { projectId:string; canAdd:boolean }) {
  const { projects: allProjectsForExp } = useProjects();
  const [vendorBankAccounts, setVendorBankAccounts] = React.useState<any[]>([]);
  const [showNewBankInput, setShowNewBankInput] = React.useState(false);
  const [newBankAcctNo, setNewBankAcctNo] = React.useState('');
  const [newBankAcctFile, setNewBankAcctFile] = React.useState<File|null>(null);
  const [newBankAcctErr, setNewBankAcctErr] = React.useState('');
  const [newBankAcctUploading, setNewBankAcctUploading] = React.useState(false);
  const { upload: uploadBankFile } = useUpload();
  const [vendorUpiAccounts, setVendorUpiAccounts] = React.useState<any[]>([]);
  const [showNewUpiInput, setShowNewUpiInput] = React.useState(false);
  const [newUpiAcctId, setNewUpiAcctId] = React.useState('');
  const [newUpiAcctErr, setNewUpiAcctErr] = React.useState('');

  React.useEffect(() => {
    const proj = (allProjectsForExp as any[]).find(p => p.id === projectId);
    const vendorName = proj?.vendor;
    if (!vendorName) return;
    const sb2 = createClient();
    (async () => {
      const { data: vendorRow } = await sb2.from('vendors').select('id').eq('name', vendorName).maybeSingle();
      if (!vendorRow) return;
      const { data: accounts } = await sb2.from('vendor_bank_accounts').select('*').eq('vendor_id', vendorRow.id).order('created_at');
      setVendorBankAccounts(accounts || []);
      const { data: upiAccts } = await sb2.from('vendor_upi_accounts').select('*').eq('vendor_id', vendorRow.id).order('created_at');
      setVendorUpiAccounts(upiAccts || []);
    })();
  }, [projectId, allProjectsForExp]);

  const addNewUpiAccountFromExpense = async () => {
    if (!newUpiAcctId.trim()) { setNewUpiAcctErr('UPI ID is required'); return; }
    setNewUpiAcctErr('');
    const proj = (allProjectsForExp as any[]).find(p => p.id === projectId);
    const vendorName = proj?.vendor;
    const sb2 = createClient();
    const { data: vendorRow } = await sb2.from('vendors').select('id').eq('name', vendorName).maybeSingle();
    if (!vendorRow) { setNewUpiAcctErr('Vendor not found'); return; }
    try {
      const { data, error } = await sb2.from('vendor_upi_accounts').insert({
        vendor_id: vendorRow.id, upi_id: newUpiAcctId.trim(),
      }).select().single();
      if (error) throw new Error(error.message);
      setVendorUpiAccounts(prev => [...prev, data]);
      setNewRow((p:any)=>({ ...p, upiId: data.upi_id, upiAccountId: data.id, bankAccount: '', bankAccountId: '' }));
      setShowNewUpiInput(false); setNewUpiAcctId('');
    } catch(err:any) {
      setNewUpiAcctErr(err.message || 'Failed to add');
    }
  };

  const addNewBankAccountFromExpense = async () => {
    if (!newBankAcctNo.trim()) { setNewBankAcctErr('Account number is required'); return; }
    if (!newBankAcctFile) { setNewBankAcctErr('Passbook copy is required'); return; }
    setNewBankAcctErr('');
    const proj = (allProjectsForExp as any[]).find(p => p.id === projectId);
    const vendorName = proj?.vendor;
    const sb2 = createClient();
    const { data: vendorRow } = await sb2.from('vendors').select('id').eq('name', vendorName).maybeSingle();
    if (!vendorRow) { setNewBankAcctErr('Vendor not found'); return; }
    setNewBankAcctUploading(true);
    try {
      const result = await uploadBankFile(newBankAcctFile, `vendors/${vendorRow.id}/passbooks`);
      const { data, error } = await sb2.from('vendor_bank_accounts').insert({
        vendor_id: vendorRow.id, account_no: newBankAcctNo.trim(),
        passbook_url: result.publicUrl, passbook_filename: result.fileName,
      }).select().single();
      if (error) throw new Error(error.message);
      setVendorBankAccounts(prev => [...prev, data]);
      setNewRow((p:any)=>({ ...p, bankAccount: data.account_no, bankAccountId: data.id }));
      setShowNewBankInput(false); setNewBankAcctNo(''); setNewBankAcctFile(null);
    } catch(err:any) {
      setNewBankAcctErr(err.message || 'Upload failed');
    } finally {
      setNewBankAcctUploading(false);
    }
  };

  const { getByProject, addExpense, updateExpense, deleteExpense, loading } = useExpenses();
  const { profile } = useAuth();
  const { logActivity: logExpenseActivity } = useActivity();
  const isVendorUser = profile?.role === 'vendor';
  const items = getByProject(projectId);
  const [adding,   setAdding]   = React.useState(false);
  const [saving,   setSaving]   = React.useState(false);
  const [editId,   setEditId]   = React.useState<string|null>(null);
  const [editRow,  setEditRow]  = React.useState<any>({});
  const [toast,    setToast]    = React.useState<any>(null);
  const [newRow,   setNewRow]   = React.useState({
    txnRef:'', expenseDate: new Date().toISOString().split('T')[0], site:'', expenseType:'Advance', amount:'', paymentMode:'', remarks:'', bankAccount:'', upiId:''
  });
  const [expenseTypes, setExpenseTypes] = React.useState<string[]>(['Advance','Material Purchase','Labour Charge','Transport','Equipment Rental','Miscellaneous']);
  React.useEffect(() => {
    const sb = createClient();
    sb.from('lookup_options').select('value').eq('type','expense_type').order('value')
      .then(({data}) => { if (data && data.length > 0) setExpenseTypes(data.map((r:any)=>r.value)); });
  }, []);
  const addExpenseType = async (val: string) => {
    const sb = createClient();
    await sb.from('lookup_options').insert({ type:'expense_type', value: val });
    setExpenseTypes(prev => [...prev, val].sort());
    return val;
  };


  const [editBankAccountErr, setEditBankAccountErr] = React.useState(false);

  const saveEdit = async () => {
    if (!editRow.bankAccount || !editRow.bankAccount.trim()) {
      setEditBankAccountErr(true);
      return;
    }
    setEditBankAccountErr(false);
    setSaving(true);
    try {
      await updateExpense(editId!, {
        expenseDate: editRow.expenseDate, site: editRow.site,
        expenseType: editRow.expenseType, amount: Number(editRow.amount),
        remarks: editRow.remarks, bankAccount: editRow.bankAccount, upiId: editRow.upiId,
      });
      setEditId(null);
      setToast({ msg:'✅ Expense updated', type:'success' });
    } catch(err:any) { setToast({ msg:'❌ ' + err.message, type:'error' }); }
    finally { setSaving(false); }
  };

  const fmt  = (n: number) => '₹' + Number(n).toLocaleString('en-IN');
  const fmtD = (d: string) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); } catch { return d; } };

  const TYPE_COLORS: Record<string,string> = {
    'Advance':'#2563EB','Material Purchase':'#7C3AED','Labour Charge':'#D97706',
    'Transport':'#0D9488','Equipment Rental':'#DC2626','Miscellaneous':'#6B7280',
  };

  const inpS: React.CSSProperties = { border:`1px solid ${T.border}`, borderRadius:6, padding:'5px 8px',
    fontSize:12, width:'100%', boxSizing:'border-box' as const, outline:'none', background:'#fff', color:T.text };
  const thS: React.CSSProperties  = { padding:'9px 12px', fontSize:10, fontWeight:700, textTransform:'uppercase',
    color:T.primary, textAlign:'left' as const, borderBottom:`2px solid ${T.primaryMid}`, background:T.primaryLight };
  const tdS: React.CSSProperties  = { padding:'10px 12px', fontSize:12, borderBottom:`1px solid ${T.border}`, verticalAlign:'middle' as const };

  const totalAmount = items.reduce((a, e) => a + e.amount, 0);
  const [bankAccountErr, setBankAccountErr] = React.useState(false);

  const saveNew = async () => {
    if (!newRow.expenseDate || !newRow.amount) return;
    setSaving(true);
    try {
      await addExpense({
        txnRef: newRow.txnRef, expenseDate: newRow.expenseDate, site: newRow.site, bankAccount: (newRow as any).bankAccount || '', bankAccountId: (newRow as any).bankAccountId || '', upiId: (newRow as any).upiId || '', upiAccountId: (newRow as any).upiAccountId || '',
        expenseType: newRow.expenseType, amount: Number(newRow.amount),
        paymentMode: newRow.paymentMode, remarks: newRow.remarks,
        projectId, poNo: '', createdBy: profile?.full_name || '', status: 'pending',
      });
      setNewRow({ txnRef:'', expenseDate:'', site:'', expenseType:'Advance', amount:'', paymentMode:'', remarks:'', bankAccount:'', upiId:'' });
      setAdding(false);
      logExpenseActivity(projectId, `Expense ${newRow.txnRef} added (₹${Number(newRow.amount).toLocaleString('en-IN')})`, profile?.full_name||'', profile?.role||'').catch(console.error);
      setToast({ msg:'✅ Expense saved', type:'success' });
    } catch (err:any) {
      setToast({ msg:'❌ ' + err.message, type:'error' });
    } finally { setSaving(false); }
  };

  return (
    <div>
      {loading && <div style={{ color:T.textMuted, fontSize:13 }}>Loading expenses...</div>}
      {items.length > 0 && (
        <div style={{ overflowX:'auto' as const }}>
          <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
            <thead>
              <tr>
                {['#','Req. Date','Expense Type','Remarks','Vendor','Amount (₹)','TXN Ref','Payment Mode','Txn Date','Status',''].map((h,i)=>(
                  <th key={i} style={thS}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <React.Fragment key={item.id}>
                <tr style={{ background:idx%2===0?'#fff':T.bg }}>
                  <td style={{ ...tdS, color:T.textMuted, width:32 }}>{idx+1}</td>
                  {editId !== item.id && (
                    <>
                      <td style={{ ...tdS, color:T.textMuted, whiteSpace:'nowrap' as const }}>{fmtD(item.expenseDate)}</td>
                      <td style={tdS}>
                        <span style={{ fontSize:11, fontWeight:600, color:TYPE_COLORS[item.expenseType]||T.textMuted,
                          background:`${TYPE_COLORS[item.expenseType]||T.textMuted}18`, padding:'2px 8px', borderRadius:20, whiteSpace:'nowrap' as const }}>
                          {item.expenseType}
                        </span>
                      </td>
                      <td style={{ ...tdS, fontSize:12, color:T.textMuted }}>{item.remarks||'—'}</td>
                      <td style={{ ...tdS, fontSize:12, color:T.textMuted }}>{(item as any).site||'—'}</td>
                      <td style={{ ...tdS, textAlign:'right' as const, fontWeight:700, color:T.primary }}>{fmt(item.amount)}</td>
                      <td style={{ ...tdS, fontSize:12, color:T.textMuted }}>{(item as any).paidTxnRef||'—'}</td>
                      <td style={{ ...tdS, fontSize:12, color:T.textMuted }}>{(item as any).paidPaymentMode||'—'}</td>
                      <td style={{ ...tdS, fontSize:12, color:T.textMuted, whiteSpace:'nowrap' as const }}>{(item as any).txnDate||'—'}</td>
                      <td style={tdS}><span style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20, background:item.status==='paid'?'#D1FAE5':'#FEF3C7', color:item.status==='paid'?'#059669':'#D97706' }}>{item.status==='paid'?'Paid':'Pending'}</span></td>
                      <td style={{ ...tdS, width:64 }}>
                        <div style={{ display:'flex', gap:4 }}>
                          {(isVendorUser && item.status === 'pending' || (!isVendorUser && canAdd)) && (
                            <button onClick={()=>{ setEditId(item.id); setEditRow({...item}); }}
                              style={{ background:'none', border:`1px solid ${T.border}`, borderRadius:6, padding:'3px 8px', cursor:'pointer', fontSize:12, color:T.primary }}>✏️</button>
                          )}
                          {canAdd && item.status !== 'paid' && (
                            <button onClick={()=>deleteExpense(item.id)}
                              style={{ background:'none', border:'none', cursor:'pointer', color:T.danger, fontSize:15 }}>🗑</button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
                {editId === item.id && (
                  <tr key={item.id+'-edit'} style={{ background:T.primaryLight }}>
                    <td colSpan={7} style={{ padding:'14px', borderBottom:`1px solid ${T.border}` }}>
                      <div style={{ fontSize:13, fontWeight:600, color:T.primary, marginBottom:12 }}>Edit Expense</div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }}>
                        {([['Date *','expenseDate','date'],['Amount (₹) *','amount','number'],['Vendor','site','text'],
                           ['Remarks','remarks','text'],['UPI ID','upiId','text']] as [string,string,string][]).map(([l,f,t])=>(
                          <div key={f}>
                            <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>{l}</label>
                            <input type={t} value={(editRow as any)[f]||''} onChange={e=>setEditRow((p:any)=>({...p,[f]:e.target.value}))} style={{ ...inpS, width:'100%', boxSizing:'border-box' as const }} />
                          </div>
                        ))}
                        <div>
                          <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>Bank Account No *</label>
                          <input type="text" value={(editRow as any).bankAccount||''}
                            onChange={e=>{ setEditRow((p:any)=>({...p,bankAccount:e.target.value})); if(e.target.value.trim()) setEditBankAccountErr(false); }}
                            style={{ ...inpS, width:'100%', boxSizing:'border-box' as const, borderColor: editBankAccountErr ? '#DC2626' : inpS.borderColor, background: editBankAccountErr ? '#FEF2F2' : '#fff' }} />
                          {editBankAccountErr && <div style={{ fontSize:11, color:'#DC2626', marginTop:4 }}>Bank Account No is required</div>}
                        </div>
                        <div>
                          <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>Expense Type</label>
                          <select value={editRow.expenseType||''} onChange={async e=>{ if(e.target.value==='__new__'){ const v=window.prompt('Enter new expense type:'); if(v&&v.trim()){ await addExpenseType(v.trim()); setEditRow((p:any)=>({...p,expenseType:v.trim()})); } } else setEditRow((p:any)=>({...p,expenseType:e.target.value})); }} style={{ ...inpS, width:'100%' }}>
                            {expenseTypes.map(t=><option key={t}>{t}</option>)}
                            <option value="__new__">+ Add New Type...</option>
                          </select>
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:10 }}>
                        <button onClick={saveEdit} disabled={saving} style={{ background:T.primary, color:'#fff', border:'none', borderRadius:8, padding:'8px 18px', cursor:'pointer', fontSize:13, fontWeight:600 }}>✓ Save</button>
                        <button onClick={()=>setEditId(null)} style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:8, padding:'8px 18px', cursor:'pointer', fontSize:13 }}>Cancel</button>
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background:T.primaryLight, fontWeight:700 }}>
                <td colSpan={5} style={{ ...tdS, color:T.primary }}>Total</td>
                <td style={{ ...tdS, textAlign:'right' as const, color:T.primary }}>{fmt(totalAmount)}</td>
                <td colSpan={2} style={tdS}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      {!loading && items.length === 0 && (
        <div style={{ textAlign:'center' as const, padding:'24px 0', color:T.textDim, fontSize:13 }}>No expenses for this project yet</div>
      )}
      {adding && (
        <div style={{ background:T.primaryLight, border:`1px solid ${T.primaryMid}`, borderRadius:10, padding:14, marginTop:12 }}>
          <div style={{ fontSize:13, fontWeight:600, color:T.primary, marginBottom:12 }}>New Expense Entry</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }}>
            {([['Date *','expenseDate','date',''],
               ['Amount (₹) *','amount','number',''],['Vendor','site','text',''],
               ['Remarks','remarks','text','']] as [string,string,string,string][]).map(([l,f,t,ph])=>(
              <div key={f}>
                <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>{l}</label>
                {t === 'date' ? (
                  <DateInput value={(newRow as any)[f]} onChange={v=>setNewRow(p=>({...p,[f]:v}))} style={inpS} />
                ) : (
                  <input type={t} value={(newRow as any)[f]} placeholder={ph}
                    onChange={e=>setNewRow(p=>({...p,[f]:e.target.value}))} style={inpS} />
                )}
              </div>
            ))}
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>Bank Account No</label>
              {!showNewBankInput ? (
                <select value={(newRow as any).bankAccountId||''}
                  onChange={e=>{
                    if (e.target.value === '__new__') { setShowNewBankInput(true); return; }
                    const acct = vendorBankAccounts.find((b:any)=>b.id===e.target.value);
                    setNewRow(p=>({...p, bankAccount: acct?.account_no||'', bankAccountId: e.target.value, upiId:'', upiAccountId:'' }));
                    if (e.target.value.trim()) setBankAccountErr(false);
                  }}
                  style={{ ...inpS, cursor:'pointer', borderColor: bankAccountErr ? '#DC2626' : inpS.borderColor, background: bankAccountErr ? '#FEF2F2' : inpS.background }}>
                  <option value="">— Select Account —</option>
                  {vendorBankAccounts.map((b:any)=><option key={b.id} value={b.id}>{b.account_no}</option>)}
                  <option value="__new__">+ Add New Account...</option>
                </select>
              ) : (
                <div style={{ border:`1px solid ${T.border}`, borderRadius:8, padding:10, background:T.bg }}>
                  <input value={newBankAcctNo} onChange={e=>setNewBankAcctNo(e.target.value)} placeholder="Account Number"
                    style={{ ...inpS, width:'100%', boxSizing:'border-box' as const, marginBottom:6 }} />
                  <label style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, color:T.primary, cursor:'pointer', marginBottom:6 }}>
                    {newBankAcctFile ? '✓ ' + newBankAcctFile.name.slice(0,18) : '📎 Upload Passbook *'}
                    <input type="file" accept="image/*,.pdf" style={{ display:'none' }} onChange={e=>setNewBankAcctFile(e.target.files?.[0]||null)} />
                  </label>
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={addNewBankAccountFromExpense} disabled={newBankAcctUploading}
                      style={{ background:T.primary, color:'#fff', border:'none', borderRadius:6, padding:'5px 12px', fontSize:11, cursor:'pointer' }}>
                      {newBankAcctUploading?'Uploading…':'+ Add'}
                    </button>
                    <button onClick={()=>{ setShowNewBankInput(false); setNewBankAcctNo(''); setNewBankAcctFile(null); setNewBankAcctErr(''); }}
                      style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:6, padding:'5px 12px', fontSize:11, cursor:'pointer' }}>
                      Cancel
                    </button>
                  </div>
                  {newBankAcctErr && <div style={{ fontSize:11, color:'#DC2626', marginTop:4 }}>{newBankAcctErr}</div>}
                </div>
              )}
              {bankAccountErr && <div style={{ fontSize:11, color:'#DC2626', marginTop:4 }}>Please select a Bank Account or UPI Account</div>}
            </div>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>UPI Account</label>
              {!showNewUpiInput ? (
                <select value={(newRow as any).upiAccountId||''}
                  onChange={e=>{
                    if (e.target.value === '__new__') { setShowNewUpiInput(true); return; }
                    const acct = vendorUpiAccounts.find((u:any)=>u.id===e.target.value);
                    setNewRow(p=>({...p, upiId: acct?.upi_id||'', upiAccountId: e.target.value, bankAccount:'', bankAccountId:'' }));
                    if (e.target.value.trim()) setBankAccountErr(false);
                  }}
                  style={{ ...inpS, cursor:'pointer' }}>
                  <option value="">— Select UPI —</option>
                  {vendorUpiAccounts.map((u:any)=><option key={u.id} value={u.id}>{u.upi_id}</option>)}
                  <option value="__new__">+ Add New UPI...</option>
                </select>
              ) : (
                <div style={{ border:`1px solid ${T.border}`, borderRadius:8, padding:10, background:T.bg }}>
                  <input value={newUpiAcctId} onChange={e=>setNewUpiAcctId(e.target.value)} placeholder="e.g. name@upi"
                    style={{ ...inpS, width:'100%', boxSizing:'border-box' as const, marginBottom:6 }} />
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={addNewUpiAccountFromExpense}
                      style={{ background:T.primary, color:'#fff', border:'none', borderRadius:6, padding:'5px 12px', fontSize:11, cursor:'pointer' }}>
                      + Add
                    </button>
                    <button onClick={()=>{ setShowNewUpiInput(false); setNewUpiAcctId(''); setNewUpiAcctErr(''); }}
                      style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:6, padding:'5px 12px', fontSize:11, cursor:'pointer' }}>
                      Cancel
                    </button>
                  </div>
                  {newUpiAcctErr && <div style={{ fontSize:11, color:'#DC2626', marginTop:4 }}>{newUpiAcctErr}</div>}
                </div>
              )}
            </div>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>Expense Type</label>
              <select value={newRow.expenseType} onChange={async e=>{ if(e.target.value==='__new__'){ const v=window.prompt('Enter new expense type:'); if(v&&v.trim()){ await addExpenseType(v.trim()); setNewRow(p=>({...p,expenseType:v.trim()})); } } else setNewRow(p=>({...p,expenseType:e.target.value})); }} style={{ ...inpS, cursor:'pointer' }}>
                {expenseTypes.map(t=><option key={t}>{t}</option>)}
                <option value="__new__">+ Add New Type...</option>
              </select>
            </div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={()=>{ if(!(newRow as any).bankAccount?.trim() && !(newRow as any).upiId?.trim()){ setBankAccountErr(true); return; } setBankAccountErr(false); saveNew(); }} disabled={saving||!newRow.expenseDate||!newRow.amount}
              style={{ background:T.primary, color:'#fff', border:'none', borderRadius:8, padding:'8px 18px',
                cursor:'pointer', fontSize:13, fontWeight:600, opacity:saving||!newRow.expenseDate||!newRow.amount?0.5:1 }}>
              {saving?'Saving…':'📤 Request'}
            </button>
            <button onClick={()=>setAdding(false)}
              style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:8, padding:'8px 18px', color:T.text, cursor:'pointer', fontSize:13 }}>
              Cancel
            </button>
          </div>
        </div>
      )}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:14 }}>
        {canAdd && !adding && (
          <button onClick={()=>setAdding(true)}
            style={{ background:'#fff', border:`1.5px solid ${T.primary}`, borderRadius:8,
              padding:'8px 18px', color:T.primary, cursor:'pointer', fontSize:13, fontWeight:700 }}>
            + Add Expense
          </button>
        )}
        {items.length > 0 && (
          <div style={{ marginLeft:'auto', fontSize:13, fontWeight:700, color:T.primary,
            background:T.primaryLight, padding:'8px 18px', borderRadius:8 }}>
            Total: {fmt(totalAmount)}
          </div>
        )}
      </div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
    </div>
  );
}

function InvoiceSection({ projectId, canAdd, projectPoNo='', paidAmount=0, investorPct }: { projectId:string; canAdd:boolean; projectPoNo?:string; paidAmount?:number; investorPct?: { investor1_profit1_pct:number; investor1_profit2_pct:number; investor2_profit1_pct:number; investor2_profit2_pct:number; investor1_additional_capital_pct:number; investor1_interest_pct:number; investor1_other_expenses_pct:number; investor1_m1_pct:number } }) {
  const { getByProject, addInvoice, updateInvoice, deleteInvoice, loading } = useInvoices();
  const { updateProject: ctxUpdateProjectInv } = useProjects();
  const [editInvId,  setEditInvId]  = React.useState<string|null>(null);
  const [editInvRow, setEditInvRow] = React.useState<any>({});

  // Invoice settings (Profit % per investor) — stored PER PROJECT on the projects table
  const [invSettings, setInvSettings] = React.useState(investorPct || {
    investor1_profit1_pct: 5, investor1_profit2_pct: 5,
    investor2_profit1_pct: 5, investor2_profit2_pct: 95,
    investor1_additional_capital_pct: 2, investor1_interest_pct: 2, investor1_other_expenses_pct: 0,
    investor1_m1_pct: 1,
  });
  React.useEffect(() => { if (investorPct) setInvSettings(investorPct); }, [investorPct]);
  const { profile: invProfile } = useAuth();
  const isInvSuperAdmin = invProfile?.role === 'super_admin';
  const [showInvSettings, setShowInvSettings] = React.useState(false);
  const [invSettingsForm, setInvSettingsForm] = React.useState(invSettings);
  const [invSettingsSaving, setInvSettingsSaving] = React.useState(false);
  const openInvSettings = () => { setInvSettingsForm(invSettings); setShowInvSettings(true); };
  const saveInvSettings = async () => {
    setInvSettingsSaving(true);
    try {
      const payload = {
        investor1_profit1_pct: Number((invSettingsForm as any).investor1_profit1_pct) || 0,
        investor1_profit2_pct: Number((invSettingsForm as any).investor1_profit2_pct) || 0,
        investor2_profit1_pct: Number((invSettingsForm as any).investor2_profit1_pct) || 0,
        investor2_profit2_pct: Number((invSettingsForm as any).investor2_profit2_pct) || 0,
        investor1_additional_capital_pct: Number((invSettingsForm as any).investor1_additional_capital_pct) || 0,
        investor1_interest_pct: Number((invSettingsForm as any).investor1_interest_pct) || 0,
        investor1_other_expenses_pct: Number((invSettingsForm as any).investor1_other_expenses_pct) || 0,
        investor1_m1_pct: Number((invSettingsForm as any).investor1_m1_pct) ?? 1,
      };
      await ctxUpdateProjectInv(projectId, payload as any, invProfile?.full_name || undefined);
      setInvSettings(prev => ({ ...prev, ...payload }));
      setShowInvSettings(false);
      setToast({ msg:'✅ Invoice settings updated for this project', type:'success' });
    } catch (err:any) {
      setToast({ msg:'❌ ' + err.message, type:'error' });
    } finally {
      setInvSettingsSaving(false);
    }
  };
  const calcInvestor1 = (amt: number, incentive: number = 0, paidAmountOverride?: number) => {
    const effectivePaid = paidAmountOverride !== undefined ? paidAmountOverride : paidAmount;
    const tds = amt * 0.01;
    const m1Payment = amt * (Number(invSettings.investor1_m1_pct ?? 1) / 100);
    const paymentReceived = amt - tds - m1Payment - incentive;
    const profit1 = paymentReceived * (Number(invSettings.investor1_profit1_pct) || 0) / 100;
    const profit2 = paymentReceived * (Number(invSettings.investor1_profit2_pct) || 0) / 100;
    const additionalCapital = effectivePaid * (Number(invSettings.investor1_additional_capital_pct) || 0) / 100;
    const interest = effectivePaid * (Number(invSettings.investor1_interest_pct) || 0) / 100;
    const otherExpenses = paymentReceived * (Number(invSettings.investor1_other_expenses_pct) || 0) / 100;
    const balanceAmount = paymentReceived - effectivePaid - additionalCapital - profit1 - profit2 - otherExpenses - interest;
    return { paidAmount: effectivePaid, profit1, profit2, additionalCapital, interest, otherExpenses, incentive, balanceAmount, m1Payment, paymentReceived };
  };
  const calcInvestor2 = (amt: number) => {
    const tds = amt * 0.01;
    const m1Payment = amt * (Number(invSettings.investor1_m1_pct ?? 1) / 100);
    const paymentReceived = amt - tds - m1Payment;
    const profit1 = paymentReceived * (Number(invSettings.investor2_profit1_pct) || 0) / 100;
    const profit2 = paymentReceived * (Number(invSettings.investor2_profit2_pct) || 0) / 100;
    return { profit1, profit2, paymentReceived, m1Payment };
  };

  const saveInvEdit = async () => {
    if (!editInvId) return;
    setSaving(true);
    try {
      const amt = Number(editInvRow.invoiceAmount)||0, gst = amt * 0.18;
      const editPaidAmt = (editInvRow as any).investor1PaidAmountOverride !== undefined && (editInvRow as any).investor1PaidAmountOverride !== '' ? Number((editInvRow as any).investor1PaidAmountOverride)||0 : undefined;
      const editInv1 = calcInvestor1(amt, Number(editInvRow.investor1Incentive)||0, editPaidAmt);
      const editInv2 = calcInvestor2(amt);
      await updateInvoice(editInvId, {
        invoiceNo: editInvRow.invoiceNo, invoiceDate: editInvRow.invoiceDate,
        invoiceAmount: amt, gst, totalAmount: amt + gst,
        dueDate: editInvRow.dueDate, invoiceStatus: editInvRow.invoiceStatus,
        paymentStatus: editInvRow.paymentStatus,
        wccNo: editInvRow.wccNo||'', receiptNo: editInvRow.receiptNo||'',
        basicPaymentNo: editInvRow.basicPaymentNo||'', basicPaymentDate: editInvRow.basicPaymentDate||'',
        taxPaymentNo: editInvRow.taxPaymentNo||'', taxPaymentDate: editInvRow.taxPaymentDate||'',
        tds: Number(editInvRow.tds)||0, remarks: editInvRow.remarks||'',
        investor: editInvRow.investor || '',
        ...(editInvRow.investor === 'Investor 1' ? {
          investor1PaidAmount: editInv1.paidAmount, investor1Profit1: editInv1.profit1,
          investor1Profit2: editInv1.profit2, investor1OtherExpenses: editInv1.otherExpenses,
          investor1AdditionalCapital: editInv1.additionalCapital, investor1Interest: editInv1.interest,
          investor1Incentive: editInv1.incentive, investor1BalanceAmount: editInv1.balanceAmount,
          m1Payment: editInv1.m1Payment, paymentReceived: editInv1.paymentReceived,
        } : {}),
        ...(editInvRow.investor === 'Investor 2' ? {
          investor2Profit1: editInv2.profit1, investor2Profit2: editInv2.profit2,
        } : {}),
      } as any);
      setEditInvId(null); setEditInvRow({});
      setToast({ msg:'✅ Invoice updated', type:'success' });
    } catch(err:any) { setToast({ msg:'❌ ' + err.message, type:'error' }); }
    finally { setSaving(false); }
  };
  const { profile } = useAuth();
  const { logActivity } = useActivity();
  const items = getByProject(projectId);
  const [adding,  setAdding]  = React.useState(false);
  const [saving,  setSaving]  = React.useState(false);
  const [toast,   setToast]   = React.useState<any>(null);
  const [newRow,  setNewRow]  = React.useState({
    invoiceNo:'', invoiceDate:'', invoiceAmount:'',
    gst:'18', dueDate:'', invoiceStatus:'Draft', paymentStatus:'Pending', poNo:projectPoNo,
    wccNo:'', receiptNo:'', investor:'', investor1Incentive:'', investor1PaidAmountOverride:'',
    basicPaymentNo:'', basicPaymentDate:'', taxPaymentNo:'', taxPaymentDate:'', tds:'', remarks:''
  });

  const fmt  = (n: number) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits:2 });
  const fmtD = (d: string) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); } catch { return d; } };

  const INV_COLORS: any = {
    Approved:{'color':'#0D9488','bg':'#F0FDFA'},Submitted:{'color':'#2563EB','bg':'#EFF6FF'},
    'Under Review':{'color':'#7C3AED','bg':'#F5F3FF'},Rejected:{'color':'#DC2626','bg':'#FEF2F2'},
    Draft:{'color':'#6B7280','bg':'#F9FAFB'},
  };
  const PAY_COLORS: any = {
    Paid:{'color':'#0D9488','bg':'#F0FDFA'},Pending:{'color':'#D97706','bg':'#FFFBEB'},
    Partial:{'color':'#2563EB','bg':'#EFF6FF'},
  };
  const Pill = ({label,cfg}:{label:string;cfg:any}) => (
    <span style={{ fontSize:11, fontWeight:700, color:cfg?.color||'#6B7280',
      background:cfg?.bg||'#F9FAFB', padding:'2px 8px', borderRadius:20, whiteSpace:'nowrap' as const }}>{label}</span>
  );

  const inpS: React.CSSProperties = {
    border:`1px solid ${T.border}`, borderRadius:6, padding:'5px 8px', fontSize:12,
    width:'100%', boxSizing:'border-box' as const, outline:'none', background:'#fff', color:T.text,
  };
  const thS: React.CSSProperties = {
    padding:'9px 12px', fontSize:10, fontWeight:700, textTransform:'uppercase',
    color:T.primary, textAlign:'left' as const, borderBottom:`2px solid ${T.primaryMid}`,
    background:T.primaryLight, whiteSpace:'nowrap' as const,
  };
  const tdS: React.CSSProperties = { padding:'10px 12px', fontSize:12, borderBottom:`1px solid ${T.border}`, verticalAlign:'middle' as const };

  const saveNew = async () => {
    if (!newRow.invoiceNo || !newRow.invoiceDate || !newRow.invoiceAmount) return;
    const amt = Number(newRow.invoiceAmount), gstPct = Number(newRow.gst), gst = amt * gstPct / 100;
    setSaving(true);
    try {
      const inv1 = calcInvestor1(amt, Number(newRow.investor1Incentive)||0, (newRow as any).investor1PaidAmountOverride !== '' ? Number((newRow as any).investor1PaidAmountOverride)||0 : undefined);
      const inv2 = calcInvestor2(amt);
      await addInvoice({
        invoiceNo: newRow.invoiceNo, invoiceDate: newRow.invoiceDate,
        invoiceAmount: amt, gst, totalAmount: amt + gst,
        wccNo: newRow.wccNo||'', receiptNo: newRow.receiptNo||'',
        invoiceStatus: newRow.invoiceStatus, paymentStatus: newRow.paymentStatus,
        dueDate: newRow.dueDate, poNo: newRow.poNo || projectPoNo,
        projectId, createdBy: profile?.full_name || '',
        basicPaymentNo: (newRow as any).basicPaymentNo||'', basicPaymentDate: (newRow as any).basicPaymentDate||'',
        taxPaymentNo: (newRow as any).taxPaymentNo||'', taxPaymentDate: (newRow as any).taxPaymentDate||'',
        tds: amt * 0.01, remarks: (newRow as any).remarks||'',
        investor: newRow.investor || '',
        ...(newRow.investor === 'Investor 1' ? {
          investor1PaidAmount: inv1.paidAmount, investor1Profit1: inv1.profit1,
          investor1Profit2: inv1.profit2, investor1OtherExpenses: inv1.otherExpenses,
          investor1AdditionalCapital: inv1.additionalCapital, investor1Interest: inv1.interest,
          investor1Incentive: inv1.incentive, investor1BalanceAmount: inv1.balanceAmount,
          m1Payment: inv1.m1Payment, paymentReceived: inv1.paymentReceived,
        } : {}),
        ...(newRow.investor === 'Investor 2' ? {
          investor2Profit1: inv2.profit1, investor2Profit2: inv2.profit2,
        } : {}),
      });
      setNewRow({ invoiceNo:'', invoiceDate:'', invoiceAmount:'',
        gst:'18', dueDate:'', invoiceStatus:'Draft', paymentStatus:'Pending', poNo:projectPoNo,
        wccNo:'', receiptNo:'', investor:'', investor1Incentive:'', investor1PaidAmountOverride:'',
        basicPaymentNo:'', basicPaymentDate:'', taxPaymentNo:'', taxPaymentDate:'', tds:'', remarks:'' });
      setAdding(false);
      logActivity(projectId, `Invoice ${newRow.invoiceNo} added`, profile?.full_name||'', profile?.role||'').catch(console.error);
      setToast({ msg:'✅ Invoice saved', type:'success' });
    } catch (err: any) {
      setToast({ msg:'❌ ' + err.message, type:'error' });
    } finally {
      setSaving(false);
    }
  };

  const totalAmt = items.reduce((a,i) => a + i.invoiceAmount, 0);
  const totalGst = items.reduce((a,i) => a + i.gst, 0);
  const totalTot = items.reduce((a,i) => a + i.totalAmount, 0);

  return (
    <div>
      {loading && <div style={{ color:T.textMuted, fontSize:13 }}>Loading invoices...</div>}
      {items.length > 0 && (
        <div style={{ overflowX:'auto' as const }}>
          <table style={{ width:'100%', borderCollapse:'collapse' as const, minWidth:900 }}>
            <thead>
              <tr>
                {['#','Invoice No','Invoice Date','Basic Amount (₹)','GST (₹)','Total Amount (₹)','WCC No','Receipt No','Inv. Status','Pay Status','Due Date','Investor','Basic Pmt No','Basic Pmt Date','Tax Pmt No','Tax Pmt Date','TDS (₹)','Remarks',''].map((h,i)=>(
                  <th key={i} style={{ ...thS, textAlign:i>=4&&i<=6?'right' as const:'left' as const }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <React.Fragment key={item.id}>
                <tr style={{ background:idx%2===0?'#fff':T.bg }}>
                  <td style={{ ...tdS, color:T.textMuted, width:32 }}>{idx+1}</td>
                  <td style={tdS}>
                    <div style={{ fontWeight:700, color:T.primary }}>{item.invoiceNo}</div>
                    {item.poNo && <div style={{ fontSize:10, color:T.textMuted }}>{item.poNo}</div>}
                  </td>
                  <td style={{ ...tdS, color:T.textMuted, whiteSpace:'nowrap' as const }}>{fmtD(item.invoiceDate)}</td>
                  <td style={{ ...tdS, textAlign:'right' as const, fontWeight:600 }}>{fmt(item.invoiceAmount)}</td>
                  <td style={{ ...tdS, textAlign:'right' as const, color:T.textMuted }}>{fmt(item.gst)}</td>
                  <td style={{ ...tdS, textAlign:'right' as const, fontWeight:700, color:T.primary }}>{fmt(item.totalAmount)}</td>
                  <td style={tdS}>{(item as any).wccNo || '—'}</td>
                  <td style={tdS}>{(item as any).receiptNo || '—'}</td>
                  <td style={tdS}><Pill label={item.invoiceStatus} cfg={INV_COLORS[item.invoiceStatus]||INV_COLORS.Draft} /></td>
                  <td style={tdS}><Pill label={item.paymentStatus} cfg={PAY_COLORS[item.paymentStatus]||PAY_COLORS.Pending} /></td>
                  <td style={{ ...tdS, color:T.textMuted, whiteSpace:'nowrap' as const }}>{fmtD(item.dueDate)}</td>
                  <td style={tdS}>{(item as any).investor || '—'}</td>
                  <td style={tdS}>{(item as any).basicPaymentNo || '—'}</td>
                  <td style={{ ...tdS, color:T.textMuted, whiteSpace:'nowrap' as const }}>{fmtD((item as any).basicPaymentDate)}</td>
                  <td style={tdS}>{(item as any).taxPaymentNo || '—'}</td>
                  <td style={{ ...tdS, color:T.textMuted, whiteSpace:'nowrap' as const }}>{fmtD((item as any).taxPaymentDate)}</td>
                  <td style={{ ...tdS, textAlign:'right' as const }}>{(item as any).tds ? fmt((item as any).tds) : '—'}</td>
                  <td style={{ ...tdS, maxWidth:140 }}><div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{(item as any).remarks || '—'}</div></td>
                  <td style={{ ...tdS, whiteSpace:'nowrap' as const }}>
                    <div style={{ display:'flex', gap:4 }}>
                      {canAdd && (
                        <button onClick={()=>{ setEditInvId(editInvId===item.id?null:item.id); setEditInvRow({...item}); }}
                          style={{ background:editInvId===item.id?T.primary:'#F0FDFA', color:editInvId===item.id?'#fff':'#0D9488',
                            border:`1px solid #99F6E4`, borderRadius:6, padding:'3px 8px', fontSize:11, cursor:'pointer' }}>✏️</button>
                      )}
                      {canAdd && (
                        <button onClick={() => deleteInvoice(item.id)}
                          style={{ background:'none', border:'none', cursor:'pointer', color:T.danger, fontSize:15 }}>🗑</button>
                      )}
                    </div>
                  </td>
                </tr>
                {editInvId === item.id && (
                  <tr style={{ background:T.primaryLight }}>
                    <td colSpan={12} style={{ padding:14, borderBottom:`1px solid ${T.border}` }}>
                      <div style={{ fontSize:12, fontWeight:700, color:T.primary, marginBottom:10 }}>✏️ Edit Invoice</div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:8 }}>
                        <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>Invoice No</div><input style={inpS} value={editInvRow.invoiceNo||''} onChange={e=>setEditInvRow((p:any)=>({...p,invoiceNo:e.target.value}))} /></div>
                        <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>Invoice Date</div><DateInput value={editInvRow.invoiceDate||''} onChange={v=>setEditInvRow((p:any)=>({...p,invoiceDate:v}))} style={inpS} /></div>
                        <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>Due Date</div><DateInput value={editInvRow.dueDate||''} onChange={v=>setEditInvRow((p:any)=>({...p,dueDate:v}))} style={inpS} max="9999-12-31" /></div>
                        <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>Basic Amount (₹)</div><input style={inpS} type="number" value={editInvRow.invoiceAmount||''} onChange={e=>setEditInvRow((p:any)=>({...p,invoiceAmount:e.target.value}))} /></div>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:12 }}>
                        <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>GST (₹)</div><div style={{ ...inpS, background:T.bg }}>{fmt((Number(editInvRow.invoiceAmount)||0) * 0.18)} (18%)</div></div>
                        <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>WCC No</div><input style={inpS} value={editInvRow.wccNo||''} onChange={e=>setEditInvRow((p:any)=>({...p,wccNo:e.target.value}))} /></div>
                        <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>Receipt No</div><input style={inpS} value={editInvRow.receiptNo||''} onChange={e=>setEditInvRow((p:any)=>({...p,receiptNo:e.target.value}))} /></div>
                        <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>Invoice Status</div>
                          <select style={inpS} value={editInvRow.invoiceStatus||''} onChange={e=>setEditInvRow((p:any)=>({...p,invoiceStatus:e.target.value}))}>
                            {['Draft','Submitted','Approved','Rejected','Paid'].map(s=><option key={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:12 }}>
                        <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>Basic Payment No</div><input style={inpS} value={editInvRow.basicPaymentNo||''} onChange={e=>setEditInvRow((p:any)=>({...p,basicPaymentNo:e.target.value}))} /></div>
                        <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>Basic Payment Date</div><DateInput value={editInvRow.basicPaymentDate||''} onChange={v=>setEditInvRow((p:any)=>({...p,basicPaymentDate:v}))} style={inpS} /></div>
                        <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>Tax Payment No</div><input style={inpS} value={editInvRow.taxPaymentNo||''} onChange={e=>setEditInvRow((p:any)=>({...p,taxPaymentNo:e.target.value}))} /></div>
                        <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>Tax Payment Date</div><DateInput value={editInvRow.taxPaymentDate||''} onChange={v=>setEditInvRow((p:any)=>({...p,taxPaymentDate:v}))} style={inpS} /></div>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:12 }}>
                        <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>TDS (₹)</div><input type="number" style={inpS} value={editInvRow.tds||''} onChange={e=>setEditInvRow((p:any)=>({...p,tds:e.target.value}))} /></div>
                        <div style={{ gridColumn:'span 3' }}><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>Remarks</div><input style={inpS} value={editInvRow.remarks||''} onChange={e=>setEditInvRow((p:any)=>({...p,remarks:e.target.value}))} /></div>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:8 }}>
                        <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>Investor</div>
                          <select style={inpS} value={editInvRow.investor||''} onChange={e=>setEditInvRow((p:any)=>({...p,investor:e.target.value}))}>
                            <option value="">— None —</option>
                            <option value="Investor 1">Investor 1</option>
                            <option value="Investor 2">Investor 2</option>
                          </select>
                        </div>
                      </div>
                      {editInvRow.investor === 'Investor 1' && (() => {
                        const editPaidOverride = (editInvRow as any).investor1PaidAmountOverride !== undefined && (editInvRow as any).investor1PaidAmountOverride !== '' ? Number((editInvRow as any).investor1PaidAmountOverride)||0 : undefined;
                        const c1 = calcInvestor1(Number(editInvRow.invoiceAmount)||0, Number(editInvRow.investor1Incentive)||0, editPaidOverride);
                        return (
                          <div style={{ border:`1px solid ${T.primaryMid}`, borderRadius:8, padding:10, marginBottom:12, background:'#fff' }}>
                            <div style={{ fontSize:11, fontWeight:700, color:T.primary, marginBottom:8 }}>Investor 1 Details</div>
                            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:8 }}>
                              <div>
                                <div style={{ fontSize:10, color:T.textMuted, marginBottom:2 }}>Paid Amount (₹)</div>
                                <input type="number" style={{ ...inpS, borderColor:T.primaryMid }}
                                  value={(editInvRow as any).investor1PaidAmountOverride !== undefined && (editInvRow as any).investor1PaidAmountOverride !== '' ? (editInvRow as any).investor1PaidAmountOverride : paidAmount}
                                  onChange={e=>setEditInvRow((p:any)=>({...p, investor1PaidAmountOverride:e.target.value}))} />
                                <div style={{ fontSize:9, color:T.textMuted, marginTop:2 }}>Auto-filled from project paid expenses. Edit to override.</div>
                              </div>
                              {[
                                [`Profit 1 (${invSettings.investor1_profit1_pct}% of Payment Received)`, fmt(c1.profit1)],
                                [`Profit 2 (${invSettings.investor1_profit2_pct}% of Payment Received)`, fmt(c1.profit2)],
                                [`Additional Capital (${invSettings.investor1_additional_capital_pct}% of Paid Amount)`, fmt(c1.additionalCapital)],
                                [`Interest (${invSettings.investor1_interest_pct}%)`, fmt(c1.interest)],
                                [`Other Expenses (${invSettings.investor1_other_expenses_pct}% of Payment Received)`, fmt(c1.otherExpenses)],
                                [`M1 Payment (${invSettings.investor1_m1_pct ?? 1}% of Basic Amount)`, fmt(c1.m1Payment)],
                                ['Payment Received (₹) = Basic − TDS (1%) − M1', fmt(c1.paymentReceived)],
                              ].map(([label,val]) => (
                                <div key={label as string}>
                                  <div style={{ fontSize:10, color:T.textMuted, marginBottom:2 }}>{label}</div>
                                  <div style={{ ...inpS, background:T.bg }}>{val}</div>
                                </div>
                              ))}
                            </div>
                            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                              <div>
                                <div style={{ fontSize:10, color:T.textMuted, marginBottom:2 }}>Incentive (₹)</div>
                                <input type="number" style={inpS} value={editInvRow.investor1Incentive||''} placeholder="0"
                                  onChange={e=>setEditInvRow((p:any)=>({...p, investor1Incentive:e.target.value}))} />
                              </div>
                              <div style={{ gridColumn:'span 2' }}>
                                <div style={{ fontSize:10, color:T.textMuted, marginBottom:2 }}>Balance Amount (₹)</div>
                                <div style={{ ...inpS, background:T.primaryLight, color:T.primary, fontWeight:700 }}>{fmt(c1.balanceAmount)}</div>
                                <div style={{ fontSize:9, color:T.textMuted, marginTop:3, lineHeight:1.4 }}>
                                  Balance Amount = Received Amount − Paid Amount − Additional Capital − Profit 1 − Profit 2 − Other Expenses − Interest
                                </div>
                              </div>
                              <div style={{ gridColumn:'span 1' }}>
                                <div style={{ fontSize:10, color:T.textMuted, marginBottom:2 }}>Expense Ratio</div>
                                {(() => { const plPct = c1.paymentReceived > 0 ? (c1.paidAmount / c1.paymentReceived * 100) : 0; return (
                                  <>
                                  <div style={{ ...inpS, background: plPct > 90 ? '#FEF2F2' : '#F0FDF4', color: plPct > 90 ? '#DC2626' : '#16A34A', fontWeight:700 }}>
                                    {plPct.toFixed(1)}%
                                  </div>
                                  <div style={{ fontSize:9, color:T.textMuted, marginTop:3 }}>(Paid ÷ Received) × 100</div>
                                  </>
                                ); })()}
                              </div>
                              <div style={{ gridColumn:'span 1' }}>
                                <div style={{ fontSize:10, color:T.textMuted, marginBottom:2 }}>P / L %</div>
                                {(() => { const pl = c1.paymentReceived > 0 ? ((c1.paymentReceived - c1.paidAmount) / c1.paymentReceived * 100) : 0; return (
                                  <>
                                  <div style={{ ...inpS, background: pl < 0 ? '#FEF2F2' : '#F0FDF4', color: pl < 0 ? '#DC2626' : '#16A34A', fontWeight:700 }}>
                                    {pl.toFixed(1)}%
                                  </div>
                                  <div style={{ fontSize:9, color:T.textMuted, marginTop:3 }}>((Received − Paid) ÷ Received) × 100</div>
                                  </>
                                ); })()}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      {editInvRow.investor === 'Investor 2' && (() => {
                        const c2 = calcInvestor2(Number(editInvRow.invoiceAmount)||0);
                        return (
                          <div style={{ border:`1px solid ${T.primaryMid}`, borderRadius:8, padding:10, marginBottom:12, background:'#fff' }}>
                            <div style={{ fontSize:11, fontWeight:700, color:T.primary, marginBottom:8 }}>Investor 2 Details</div>
                            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8 }}>
                              {[
                                [`M1 Payment (${invSettings.investor1_m1_pct ?? 1}% of Basic Amount)`, fmt(c2.m1Payment)],
                                ['Payment Received (₹) = Basic − TDS (1%) − M1', fmt(c2.paymentReceived)],
                                [`Profit 1 (${invSettings.investor2_profit1_pct}% of Payment Received)`, fmt(c2.profit1)],
                                [`Profit 2 (${invSettings.investor2_profit2_pct}% of Payment Received)`, fmt(c2.profit2)],
                              ].map(([label,val]) => (
                                <div key={label as string}>
                                  <div style={{ fontSize:10, color:T.textMuted, marginBottom:2 }}>{label}</div>
                                  <div style={{ ...inpS, background:T.bg }}>{val}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                      <div style={{ display:'flex', gap:8 }}>
                        <button onClick={saveInvEdit} disabled={saving}
                          style={{ background:T.primary, color:'#fff', border:'none', borderRadius:7, padding:'6px 18px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                          {saving?'Saving…':'💾 Save'}
                        </button>
                        <button onClick={()=>{ setEditInvId(null); setEditInvRow({}); }}
                          style={{ background:'#fff', color:T.textMuted, border:`1px solid ${T.border}`, borderRadius:7, padding:'6px 18px', fontSize:12, cursor:'pointer' }}>
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background:T.primaryLight, fontWeight:700 }}>
                <td colSpan={4} style={{ ...tdS, color:T.primary }}>Total</td>
                <td style={{ ...tdS, textAlign:'right' as const, color:T.primary }}>{fmt(totalAmt)}</td>
                <td style={{ ...tdS, textAlign:'right' as const, color:T.textMuted }}>{fmt(totalGst)}</td>
                <td style={{ ...tdS, textAlign:'right' as const, color:T.primary }}>{fmt(totalTot)}</td>
                <td colSpan={4} style={tdS}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      {!loading && items.length === 0 && (
        <div style={{ textAlign:'center' as const, padding:'24px 0', color:T.textDim, fontSize:13 }}>No invoices yet for this project</div>
      )}

      {/* Add form */}
      {adding && (
        <div style={{ background:T.primaryLight, border:`1px solid ${T.primaryMid}`, borderRadius:10, padding:14, marginTop:12 }}>
          <div style={{ fontSize:13, fontWeight:600, color:T.primary, marginBottom:12 }}>New Invoice Entry</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }}>
            {([['PO Number','poNo','text','PO-2025-XXX'],['Invoice No *','invoiceNo','text','INV-2025-XXX'],
               ['Invoice Date *','invoiceDate','date',''],
               ['Due Date','dueDate','date',''],['Basic Amount (₹) *','invoiceAmount','number',''],
               ['WCC No','wccNo','text',''],['Receipt No','receiptNo','text',''],
               ['GST (%)','gst','number',''],
               ['Basic Payment No','basicPaymentNo','text',''],['Basic Payment Date','basicPaymentDate','date',''],
               ['Tax Payment No','taxPaymentNo','text',''],['Tax Payment Date','taxPaymentDate','date',''],
               ['TDS (₹)','tds','number',''],['Remarks','remarks','text','']] as [string,string,string,string][]).map(([label,field,type,ph])=>(
              <div key={field}>
                <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>{label}</label>
                {field === 'tds' ? (
                  <div style={{ ...inpS, background:T.bg }}>{fmt((Number((newRow as any).invoiceAmount)||0) * 0.01)}</div>
                ) : field === 'gst' ? (
                  <div style={{ ...inpS, background:T.bg }}>{fmt((Number((newRow as any).invoiceAmount)||0) * 0.18)} (18%)</div>
                ) : type === 'date' ? (
                  <DateInput value={(newRow as any)[field]} onChange={v=>setNewRow(p=>({...p,[field]:v}))} max={field==='dueDate'?'9999-12-31':undefined} style={inpS} />
                ) : (
                  <input type={type} value={(newRow as any)[field]} placeholder={ph}
                    onChange={e=>setNewRow(p=>({...p,[field]:e.target.value}))} style={inpS} />
                )}
              </div>
            ))}
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>Total Amount (₹)</label>
              <div style={{ ...inpS, background:T.primaryLight, fontWeight:700, color:T.primary }}>
                {(Number((newRow as any).invoiceAmount)||0) > 0
                  ? '₹' + ((Number((newRow as any).invoiceAmount)||0) * (1 + (Number((newRow as any).gst)||0)/100)).toLocaleString('en-IN', {maximumFractionDigits:2})
                  : '—'}
              </div>
            </div>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>Invoice Status</label>
              <select value={newRow.invoiceStatus} onChange={e=>setNewRow(p=>({...p,invoiceStatus:e.target.value}))}
                style={{ ...inpS, cursor:'pointer' }}>
                {['Draft','Submitted','Under Review','Approved','Rejected'].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>Payment Status</label>
              <select value={newRow.paymentStatus} onChange={e=>setNewRow(p=>({...p,paymentStatus:e.target.value}))}
                style={{ ...inpS, cursor:'pointer' }}>
                {['Pending','Partial','Paid'].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>Investor</label>
              <select value={newRow.investor} onChange={e=>setNewRow(p=>({...p,investor:e.target.value}))}
                style={{ ...inpS, cursor:'pointer' }}>
                <option value="">— None —</option>
                <option value="Investor 1">Investor 1</option>
                <option value="Investor 2">Investor 2</option>
              </select>
            </div>
          </div>
          {newRow.investor === 'Investor 1' && (() => {
            const paidOverride = (newRow as any).investor1PaidAmountOverride !== '' ? Number((newRow as any).investor1PaidAmountOverride)||0 : undefined;
            const c1 = calcInvestor1(Number(newRow.invoiceAmount)||0, Number(newRow.investor1Incentive)||0, paidOverride);
            return (
              <div style={{ border:`1px solid ${T.primaryMid}`, borderRadius:8, padding:12, marginBottom:12, background:'#fff' }}>
                <div style={{ fontSize:12, fontWeight:700, color:T.primary, marginBottom:8 }}>Investor 1 Details</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:10 }}>
                  <div style={{ marginBottom:10 }}>
                    <div style={{ fontSize:10, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>Paid Amount (₹)</div>
                    <input type="number" style={{ ...inpS, borderColor:T.primaryMid }}
                      value={(newRow as any).investor1PaidAmountOverride !== '' ? (newRow as any).investor1PaidAmountOverride : paidAmount}
                      onChange={e => setNewRow(p => ({ ...p, investor1PaidAmountOverride: e.target.value }))} />
                    <div style={{ fontSize:9, color:T.textMuted, marginTop:2 }}>Auto-filled from project paid expenses (₹{paidAmount.toLocaleString('en-IN')}). Edit to override.</div>
                  </div>
                  {[
                    [`Profit 1 (${invSettings.investor1_profit1_pct}% of Payment Received)`, fmt(c1.profit1)],
                    [`Profit 2 (${invSettings.investor1_profit2_pct}% of Payment Received)`, fmt(c1.profit2)],
                    [`Additional Capital (${invSettings.investor1_additional_capital_pct}% of Paid Amount)`, fmt(c1.additionalCapital)],
                    [`Interest (${invSettings.investor1_interest_pct}%)`, fmt(c1.interest)],
                    [`Other Expenses (${invSettings.investor1_other_expenses_pct}% of Payment Received)`, fmt(c1.otherExpenses)],
                    [`M1 Payment (${invSettings.investor1_m1_pct ?? 1}% of Basic Amount)`, fmt(c1.m1Payment)],
                    ['Payment Received (₹) = Basic − TDS (1%) − M1', fmt(c1.paymentReceived)],
                  ].map(([label,val]) => (
                    <div key={label as string}>
                      <div style={{ fontSize:10, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>{label}</div>
                      <div style={{ ...inpS, background:T.bg }}>{val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                  <div>
                    <label style={{ display:'block', fontSize:10, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>Incentive (₹)</label>
                    <input type="number" style={inpS} value={(newRow as any).investor1Incentive||''} placeholder="0"
                      onChange={e=>setNewRow(p=>({...p, investor1Incentive:e.target.value}))} />
                  </div>
                  <div style={{ gridColumn:'span 2' }}>
                    <div style={{ fontSize:10, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>Balance Amount (₹)</div>
                    <div style={{ ...inpS, background:T.primaryLight, color:T.primary, fontWeight:700 }}>{fmt(c1.balanceAmount)}</div>
                    <div style={{ fontSize:9, color:T.textMuted, marginTop:3, lineHeight:1.4 }}>
                      Balance Amount = Received Amount − Paid Amount − Additional Capital − Profit 1 − Profit 2 − Other Expenses − Interest
                    </div>
                  </div>
                  <div style={{ gridColumn:'span 1' }}>
                    <div style={{ fontSize:10, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>Expense Ratio</div>
                    {(() => { const plPct = c1.paymentReceived > 0 ? (c1.paidAmount / c1.paymentReceived * 100) : 0; return (
                      <>
                      <div style={{ ...inpS, background: plPct > 90 ? '#FEF2F2' : '#F0FDF4', color: plPct > 90 ? '#DC2626' : '#16A34A', fontWeight:700 }}>
                        {plPct.toFixed(1)}%
                      </div>
                      <div style={{ fontSize:9, color:T.textMuted, marginTop:3 }}>(Paid ÷ Received) × 100</div>
                      </>
                    ); })()}
                  </div>
                  <div style={{ gridColumn:'span 1' }}>
                    <div style={{ fontSize:10, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>P / L %</div>
                    {(() => { const pl = c1.paymentReceived > 0 ? ((c1.paymentReceived - c1.paidAmount) / c1.paymentReceived * 100) : 0; return (
                      <>
                      <div style={{ ...inpS, background: pl < 0 ? '#FEF2F2' : '#F0FDF4', color: pl < 0 ? '#DC2626' : '#16A34A', fontWeight:700 }}>
                        {pl.toFixed(1)}%
                      </div>
                      <div style={{ fontSize:9, color:T.textMuted, marginTop:3 }}>((Received − Paid) ÷ Received) × 100</div>
                      </>
                    ); })()}
                  </div>
                </div>
              </div>
            );
          })()}
          {newRow.investor === 'Investor 2' && (() => {
            const c2 = calcInvestor2(Number(newRow.invoiceAmount)||0);
            return (
              <div style={{ border:`1px solid ${T.primaryMid}`, borderRadius:8, padding:12, marginBottom:12, background:'#fff' }}>
                <div style={{ fontSize:12, fontWeight:700, color:T.primary, marginBottom:8 }}>Investor 2 Details</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
                  {[
                    [`M1 Payment (${invSettings.investor1_m1_pct ?? 1}% of Basic Amount)`, fmt(c2.m1Payment)],
                    ['Payment Received (₹) = Basic − TDS (1%) − M1', fmt(c2.paymentReceived)],
                    [`Profit 1 (${invSettings.investor2_profit1_pct}% of Payment Received)`, fmt(c2.profit1)],
                    [`Profit 2 (${invSettings.investor2_profit2_pct}% of Payment Received)`, fmt(c2.profit2)],
                  ].map(([label,val]) => (
                    <div key={label as string}>
                      <div style={{ fontSize:10, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>{label}</div>
                      <div style={{ ...inpS, background:T.bg }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={saveNew} disabled={saving||!newRow.invoiceNo||!newRow.invoiceDate||!newRow.invoiceAmount}
              style={{ background:T.primary, color:'#fff', border:'none', borderRadius:8, padding:'8px 18px',
                cursor:'pointer', fontSize:13, fontWeight:600, opacity:saving||!newRow.invoiceNo||!newRow.invoiceDate||!newRow.invoiceAmount?0.5:1 }}>
              {saving ? 'Saving…' : '✅ Save Invoice'}
            </button>
            <button onClick={()=>setAdding(false)}
              style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:8, padding:'8px 18px', color:T.text, cursor:'pointer', fontSize:13 }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:14, gap:10 }}>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {canAdd && !adding && (
            <button onClick={()=>setAdding(true)}
              style={{ background:'#fff', border:`1.5px solid ${T.primary}`, borderRadius:8,
                padding:'8px 18px', color:T.primary, cursor:'pointer', fontSize:13, fontWeight:700 }}>
              + Add Invoice
            </button>
          )}
          {isInvSuperAdmin && (
            <button onClick={openInvSettings} title="Invoice Settings"
              style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:8,
                padding:'8px 10px', cursor:'pointer', fontSize:13 }}>
              ⚙️
            </button>
          )}
        </div>
        {items.length > 0 && (
          <div style={{ marginLeft:'auto', fontSize:13, fontWeight:700, color:T.primary,
            background:T.primaryLight, padding:'8px 18px', borderRadius:8 }}>
            Grand Total: {fmt(totalTot)}
          </div>
        )}
      </div>

      {showInvSettings && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.5)', zIndex:1100, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={()=>setShowInvSettings(false)}>
          <div style={{ background:'#fff', borderRadius:14, padding:28, width:'100%', maxWidth:440, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize:16, fontWeight:700, color:T.text, marginBottom:4 }}>⚙️ Invoice Settings</div>
            <div style={{ fontSize:12, color:T.textMuted, marginBottom:18 }}>Profit percentages used to auto-calculate Investor fields on new invoices.</div>

            <div style={{ fontSize:12, fontWeight:700, color:T.primary, marginBottom:8 }}>Investor 1</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:18 }}>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>Profit 1 (%)</label>
                <input type="number" value={(invSettingsForm as any).investor1_profit1_pct}
                  onChange={e=>setInvSettingsForm((p:any)=>({...p, investor1_profit1_pct:e.target.value}))}
                  style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'7px 10px', fontSize:13, width:'100%', boxSizing:'border-box' as const, outline:'none' }} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>Profit 2 (%)</label>
                <input type="number" value={(invSettingsForm as any).investor1_profit2_pct}
                  onChange={e=>setInvSettingsForm((p:any)=>({...p, investor1_profit2_pct:e.target.value}))}
                  style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'7px 10px', fontSize:13, width:'100%', boxSizing:'border-box' as const, outline:'none' }} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>Additional Capital (%)</label>
                <input type="number" value={(invSettingsForm as any).investor1_additional_capital_pct}
                  onChange={e=>setInvSettingsForm((p:any)=>({...p, investor1_additional_capital_pct:e.target.value}))}
                  style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'7px 10px', fontSize:13, width:'100%', boxSizing:'border-box' as const, outline:'none' }} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>Interest (%)</label>
                <input type="number" value={(invSettingsForm as any).investor1_interest_pct}
                  onChange={e=>setInvSettingsForm((p:any)=>({...p, investor1_interest_pct:e.target.value}))}
                  style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'7px 10px', fontSize:13, width:'100%', boxSizing:'border-box' as const, outline:'none' }} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>Other Expenses (%)</label>
                <input type="number" value={(invSettingsForm as any).investor1_other_expenses_pct}
                  onChange={e=>setInvSettingsForm((p:any)=>({...p, investor1_other_expenses_pct:e.target.value}))}
                  style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'7px 10px', fontSize:13, width:'100%', boxSizing:'border-box' as const, outline:'none' }} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>M1 Payment (%)</label>
                <input type="number" value={(invSettingsForm as any).investor1_m1_pct ?? 1}
                  onChange={e=>setInvSettingsForm((p:any)=>({...p, investor1_m1_pct:e.target.value}))}
                  style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'7px 10px', fontSize:13, width:'100%', boxSizing:'border-box' as const, outline:'none' }} />
              </div>
            </div>

            <div style={{ fontSize:12, fontWeight:700, color:T.primary, marginBottom:8 }}>Investor 2</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>Profit 1 (%)</label>
                <input type="number" value={(invSettingsForm as any).investor2_profit1_pct}
                  onChange={e=>setInvSettingsForm((p:any)=>({...p, investor2_profit1_pct:e.target.value}))}
                  style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'7px 10px', fontSize:13, width:'100%', boxSizing:'border-box' as const, outline:'none' }} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>Profit 2 (%)</label>
                <input type="number" value={(invSettingsForm as any).investor2_profit2_pct}
                  onChange={e=>setInvSettingsForm((p:any)=>({...p, investor2_profit2_pct:e.target.value}))}
                  style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'7px 10px', fontSize:13, width:'100%', boxSizing:'border-box' as const, outline:'none' }} />
              </div>
            </div>

            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={()=>setShowInvSettings(false)}
                style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:8, padding:'8px 18px', fontSize:13, cursor:'pointer', color:T.text }}>
                Cancel
              </button>
              <button onClick={saveInvSettings} disabled={invSettingsSaving}
                style={{ background:T.primary, color:'#fff', border:'none', borderRadius:8, padding:'8px 18px', fontSize:13, fontWeight:600, cursor:'pointer', opacity:invSettingsSaving?0.7:1 }}>
                {invSettingsSaving ? 'Saving…' : '💾 Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
    </div>
  );
}


// ── CreatableDropdown — searchable + creatable select ──────────────────────
interface CreatableDropdownProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  onCreateNew?: (val: string) => void;
}

function CreatableDropdown({ value, onChange, options, placeholder, onCreateNew }: CreatableDropdownProps) {
  const [open,   setOpen]   = React.useState(false);
  const [search, setSearch] = React.useState('');
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));
  const showCreate = search.trim() && !options.some(o => o.toLowerCase() === search.toLowerCase());

  const select = (val: string) => {
    onChange(val);
    setSearch('');
    setOpen(false);
  };

  const create = () => {
    if (!search.trim()) return;
    onCreateNew?.(search.trim());
    select(search.trim());
  };

  return (
    <div ref={ref} style={{ position:'relative', width:'100%' }}>
      <div style={{ display:'flex', alignItems:'center', border:`1px solid ${open?'#0D9488':'#E2E8F0'}`,
        borderRadius:8, background:'#fff', cursor:'text', overflow:'hidden' }}
        onClick={() => { setOpen(true); setSearch(''); }}>
        {(!open && value) ? (
          <div style={{ padding:'8px 12px', fontSize:13, color:'#1E293B', flex:1 }}>{value}</div>
        ) : (
          <input autoFocus={open} value={open ? search : value}
            onChange={e => { setSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder || 'Select or type...'}
            style={{ padding:'8px 12px', fontSize:13, border:'none', outline:'none',
              width:'100%', background:'transparent', color:'#1E293B' }} />
        )}
        <span style={{ padding:'0 10px', color:'#94A3B8', fontSize:12 }}>▾</span>
      </div>

      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:200,
          background:'#fff', border:'1px solid #E2E8F0', borderRadius:10,
          boxShadow:'0 8px 24px rgba(0,0,0,0.12)', maxHeight:220, overflowY:'auto' as const }}>

          {filtered.length === 0 && !showCreate && (
            <div style={{ padding:'12px 14px', fontSize:13, color:'#94A3B8' }}>No options found</div>
          )}

          {filtered.map(opt => (
            <div key={opt} onClick={() => select(opt)}
              style={{ padding:'10px 14px', fontSize:13, cursor:'pointer',
                background: opt === value ? '#F0FDFA' : '#fff',
                color: opt === value ? '#0D9488' : '#1E293B',
                fontWeight: opt === value ? 600 : 400 }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background='#F8FAFC'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = opt === value ? '#F0FDFA' : '#fff'}>
              {opt}
            </div>
          ))}

          {showCreate && (
            <div onClick={create}
              style={{ padding:'10px 14px', fontSize:13, cursor:'pointer',
                color:'#0D9488', fontWeight:600, borderTop:'1px solid #E2E8F0',
                display:'flex', alignItems:'center', gap:6 }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background='#F0FDFA'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background='#fff'}>
              + Create "{search.trim()}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProjectDetailPage() {
  const router  = useRouter();
  const { id }  = router.query;
  const { profile, can, loading } = useAuth();
  const { upload } = useUpload();

  const role       = profile?.role || 'viewer';
  // Show Edit button if user can edit ANY section
  const canEditDetails = !loading && can('sec_project_details',   'edit');
  const canEdit        = !loading && (
    can('sec_project_details',   'edit') ||
    can('sec_vendor_assignment', 'edit') ||
    can('sec_ptw',               'edit') ||
    can('sec_financial',         'edit')
  );
  const canEditFin = !loading && can('sec_financial', 'edit');
  const isBilling  = !loading && can('sec_billing_review', 'edit');

  // Section visibility from permissions
  const showFinancial     = !loading && can('sec_financial',        'read');
  const showVendor        = !loading && can('sec_vendor_assignment', 'read');
  const showDocs          = !loading && can('sec_work_documents',   'read');

  // Doc verifications — stored in projects.doc_verifications JSONB
  const [docVerifications, setDocVerifications] = React.useState<Record<string,string>>({});

  const verifyDoc = async (docKey: string, projectId: string) => {
    if (docVerifications[docKey]) return;
    const ts = new Date().toISOString();
    const updated = { ...docVerifications, [docKey]: ts };
    const supabase = createClient();
    const { error } = await supabase.from('projects').update({ doc_verifications: updated }).eq('id', projectId);
    if (!error) {
      setDocVerifications(updated);
      logActivity(projectId, `Document verified: ${docKey} by ${profile?.full_name}`, profile?.full_name||'', profile?.role||'').catch(()=>{});
    }
  };
  const canUploadDocs     = false; // Upload hidden for all roles
  const canVerifyDocs     = !loading && ['super_admin','project_manager','region_manager'].includes(role);
  const showSTNSRN        = !loading && can('sec_stn_srn',          'read');
  const showBillingReview = !loading && can('sec_billing_review',   'read');
  const showActivityLog   = !loading && can('sec_activity_log',     'read');
  const showInvoice       = !loading && can('sec_invoice',            'read');
  const canAddInvoice     = !loading && can('sec_invoice',            'create');
  const showWorkProgress  = !loading && can('sec_work_progress',     'read');
  const showExpenses      = !loading && can('site_expenses',         'read');
  const canAddExpenses    = !loading && can('site_expenses',         'create');
  const canEditVendor     = !loading && can('sec_vendor_assignment', 'edit');
  const canEditPTW        = !loading && can('sec_ptw',              'edit');

  const showPTW           = !loading && can('sec_ptw',              'read');

  const { getProject, updateProject: ctxUpdateProject, projects: allProjects } = useProjects();
  const { expenses: allExpenses, loading: allExpLoading } = useExpenses();
  const { invoices: allInvoices, loading: allInvLoading } = useInvoices();
  const finSummaryLoading = allExpLoading || allInvLoading;
  const { getByProject: getProjectDocs, addDoc, deleteDoc: deleteWorkDoc, getDocStatus } = useWorkDocs();
  const { getByProject: getActivityLog, logActivity } = useActivity();
  const dbProject = id ? getProject(id as string) : undefined;
  // Live-aggregated Paid Amount across all projects sharing this PO — same figure shown in Financial Summary.
  // Used for Investor 1 calculations too, so both stay consistent (the project's raw stored paidAmount
  // column can be stale/per-project-only and was causing a mismatch with Financial Summary's number).
  // NOTE: this hook must run unconditionally on every render — it sits above any early `return` in this
  // component (e.g. "Project Not Found"), since skipping a hook conditionally violates the Rules of Hooks.
  const poPaidAmt = React.useMemo(() => {
    const dbP = dbProject as any;
    if (!dbP?.poNo) return Number(dbP?.paidAmount) || 0;
    const siblingIds = (allProjects as any[]).filter((proj:any) => proj.poNo === dbP.poNo).map((proj:any) => proj.id);
    return allExpenses.filter((e:any) => siblingIds.includes(e.projectId) && e.status === 'paid').reduce((a:number,e:any) => a + Number(e.amount||0), 0);
  }, [allProjects, allExpenses, dbProject]);
  const { logActivity: logActivityMain } = useActivity();
  const [stnApplicable, setStnApplicable] = React.useState(true);
  const [srnApplicable, setSrnApplicable] = React.useState(true);
  const [ptwApplicable, setPtwApplicable] = React.useState(true);
  const [srnItemCount, setSrnItemCount] = React.useState(0);
  const [ptwItemCount, setPtwItemCount] = React.useState(0);
  React.useEffect(() => {
    if (dbProject) {
      setStnApplicable((dbProject as any).stn_applicable !== false);
      setSrnApplicable((dbProject as any).srn_applicable !== false);
      setPtwApplicable((dbProject as any).ptw_applicable !== false);
    }
  }, [dbProject?.id]);

  const APPLICABLE_LABELS: Record<string,string> = {
    stn_applicable: 'STN Applicable', srn_applicable: 'SRN Applicable', ptw_applicable: 'PTW Applicable',
  };
  const toggleApplicable = async (field: 'stn_applicable'|'srn_applicable'|'ptw_applicable', value: boolean) => {
    if (field==='stn_applicable') setStnApplicable(value);
    if (field==='srn_applicable') setSrnApplicable(value);
    if (field==='ptw_applicable') setPtwApplicable(value);
    try {
      await ctxUpdateProject((dbProject as any)?.id, { [field]: value } as any, profile?.full_name ?? undefined);
      logActivityMain((dbProject as any)?.id, `${APPLICABLE_LABELS[field]} turned ${value ? 'ON' : 'OFF'}`, profile?.full_name||'', profile?.role||'').catch(()=>{});
    } catch (err:any) {
      // Roll back the optimistic toggle if the save failed
      if (field==='stn_applicable') setStnApplicable(!value);
      if (field==='srn_applicable') setSrnApplicable(!value);
      if (field==='ptw_applicable') setPtwApplicable(!value);
      console.error('Failed to save applicable toggle:', err);
    }
  };
  const seedFallback = (Array.isArray(SEED_PROJECTS)?SEED_PROJECTS:[]).find((p:any)=>p.id===id);
  const [projects, setProjects] = useState<Record<string,any>>({});
  React.useEffect(() => {
    const src = dbProject || seedFallback;
    if (src && id) setProjects(prev => ({ ...prev, [id as string]: { ...seedFallback, ...prev[id as string], ...src } }));
  }, [dbProject?.id, id]);
  const [allTransactions, setAllTransactions] = React.useState(PAYMENT_TRANSACTIONS);
  const [srnAllApproved, setSrnAllApproved] = React.useState(false);

  // stnAllApproved defined below after p is declared
  const [editingSection, setEditingSection] = useState<string|null>(null);
  const [autoEditDone, setAutoEditDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extractingPO, setExtractingPO] = React.useState(false);
  const poUploadRef = React.useRef<HTMLInputElement>(null);

  const editing    = (s: string) => editingSection === s;
  const notEditing = editingSection === null;

  const [form, setForm] = useState<any>({});
  React.useEffect(() => {
    if (dbProject) {
      setForm({...dbProject});
      // Auto-enable edit mode for new blank projects (no PO number)
      if (!autoEditDone && !dbProject.poNo && !dbProject.site) {
        setEditingSection('details');
        setAutoEditDone(true);
      }
    }
  }, [dbProject?.id]);

  const startEdit  = (s: string) => { setForm({...(id ? projects[id as string] : {})}); setEditingSection(s); };
  const cancelEdit = () => { setForm({...(id ? projects[id as string] : {})}); setEditingSection(null); };
  const handleExtractPO = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtractingPO(true);
    try {
      const { data: { session } } = await createClient().auth.getSession();
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload/extract-po', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token||''}` },
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) { alert(json.error || 'Extraction failed'); return; }
      const d = json.data;
      setForm((f: any) => ({
        ...f,
        ...(d.po_no    ? { poNo:    d.po_no    } : {}),
        ...(d.po_date  ? { poDate:  d.po_date  } : {}),
        ...(d.po_value ? { poValue: d.po_value } : {}),
        ...(d.indus_id ? { indusId: d.indus_id } : {}),
        ...(d.project_no ? { projectId: d.project_no } : {}),
        ...(d.region   ? { region:  d.region   } : {}),
      }));
      if (d.items?.length) {
        // Import items into STN items section via a custom event
        window.dispatchEvent(new CustomEvent('po-items-extracted', { detail: d.items }));
      }
      alert(`✅ Extracted ${d.items?.length || 0} STN items + project details. Review and save.`);
    } catch(err: any) {
      alert('Failed to extract PO: ' + err.message);
    } finally {
      setExtractingPO(false);
      if (poUploadRef.current) poUploadRef.current.value = '';
    }
  };

  const saveSection = () => {
    setSaving(true);
    // Optimistic local update
    setProjects((prev:any) => ({ ...prev, [id as string]: { ...prev[id as string], ...form } }));
    // Persist to Supabase with explicit feedback
    ctxUpdateProject(id as string, form, profile?.full_name ?? undefined)
      .then(() => {
        setToast({ msg:'✅ Saved successfully!', type:'success' });
        setEditingSection(null);
        // Build a meaningful log message showing which fields changed
        const FIELD_LABELS: Record<string,string> = {
          poNo:'PO Number', poDate:'PO Date', poValue:'PO Amount',
          indusId:'Indus ID', site:'Site Name', region:'Region',
          type:'Project Name', startDate:'Allocation Date', endDate:'Work Completion Date',
          rm:'Region Manager', pm:'Project Manager', remarks:'Remarks',
          status:'Status', progress:'Progress', workScope:'Work Scope',
        };
        const currentProject = projects[id as string] || {};
        const changedFields = Object.keys(form)
          .filter(k => form[k] !== undefined && String(form[k]) !== String((currentProject as any)[k]))
          .map(k => FIELD_LABELS[k] || k);
        const logMsg = changedFields.length > 0
          ? `Updated ${changedFields.join(', ')} — by ${profile?.full_name||'user'}`
          : `Section saved by ${profile?.full_name||'user'}`;
        logActivity(id as string, logMsg, profile?.full_name||'', profile?.role||'').catch(console.error);
      })
      .catch((err:any) => {
        console.error('Save error:', err);
        setToast({ msg:'❌ Save failed: ' + (err?.message || 'Unknown error'), type:'error' });
      })
      .finally(() => setSaving(false));
  };
  const [toast,    setToast]    = useState<{msg:string;type:'success'|'error'|'info'}|null>(null);
  const [deleting, setDeleting] = useState(false);

  const deleteProject = async () => {
    if (!window.confirm(`⚠️ DELETE PROJECT ${p?.id}?\n\nThis will permanently delete:\n• All invoices\n• All expenses\n• All documents\n• All STN items\n• All PTW records\n• All activity logs\n\nThis CANNOT be undone. Type the project ID to confirm.`)) return;
    const confirm2 = window.prompt(`Type "${p?.id}" to confirm deletion:`);
    if (confirm2 !== p?.id) { alert('Project ID did not match. Deletion cancelled.'); return; }
    setDeleting(true);
    try {
      const sb = createClient();
      const { error } = await sb.from('projects').delete().eq('id', p?.id);
      if (error) throw new Error(error.message);
      setToast({ msg:'✅ Project deleted successfully', type:'success' });
      setTimeout(() => router.push('/projects'), 1500);
    } catch(err: any) {
      setToast({ msg:'❌ Delete failed: ' + err.message, type:'error' });
      setDeleting(false);
    }
  };

  // Preview modal
  const [previewDoc, setPreviewDoc] = useState<{name:string;url:string;isImage:boolean}|null>(null);
  // RM and PM lists from Supabase profiles
  const [rmList,      setRmList]      = React.useState<string[]>([]);
  const [regionOpts,  setRegionOpts]  = React.useState<string[]>(REGIONS);
  const [jobTypeOpts, setJobTypeOpts] = React.useState<string[]>(TYPES);
  const [poStatusOpts, setPoStatusOpts] = React.useState<string[]>(['Open','Closed']);
  const [projectStatusOpts, setProjectStatusOpts] = React.useState<string[]>(PROJECT_STATUS_OPTIONS);
  const [siteOpts,    setSiteOpts]    = React.useState<string[]>([]);

  // Load lookup options from Supabase
  React.useEffect(() => {
    const sb = createClient();
    sb.from('lookup_options').select('type,value').order('value').then(({ data }) => {
      if (data) {
        setRegionOpts(data.filter((d:any)=>d.type==='region').map((d:any)=>d.value));
        const dbJobTypes = data.filter((d:any)=>d.type==='job_type').map((d:any)=>d.value); setJobTypeOpts(Array.from(new Set([...TYPES, ...dbJobTypes])));
        const dbPoStatus = data.filter((d:any)=>d.type==='po_status').map((d:any)=>d.value); setPoStatusOpts(Array.from(new Set(['Open','Closed',...dbPoStatus])));
        const dbProjStatus = data.filter((d:any)=>d.type==='project_status').map((d:any)=>d.value); setProjectStatusOpts(Array.from(new Set([...PROJECT_STATUS_OPTIONS,...dbProjStatus])));
        setSiteOpts(data.filter((d:any)=>d.type==='site').map((d:any)=>d.value));
      }
    });
  }, []);

  const addLookupOption = async (type: string, value: string) => {
    const sb = createClient();
    await sb.from('lookup_options').insert({ type, value }).select();
    if (type === 'region')   setRegionOpts(prev  => Array.from(new Set([...prev,  value])).sort());
    if (type === 'job_type') setJobTypeOpts(prev => Array.from(new Set([...prev,  value])).sort());
    if (type === 'po_status') setPoStatusOpts(prev => Array.from(new Set([...prev, value])).sort());
    if (type === 'project_status') setProjectStatusOpts(prev => Array.from(new Set([...prev, value])).sort());
    if (type === 'site')     setSiteOpts(prev    => Array.from(new Set([...prev,  value])).sort());
  };
  const [pmList, setPmList] = React.useState<string[]>([]);
  React.useEffect(() => {
    const sb = createClient();
    sb.from('profiles').select('full_name,role').in('role',['region_manager','project_manager']).eq('is_active',true)
      .then(({data}) => {
        if (data) {
          setRmList(data.filter((p:any)=>p.role==='region_manager').map((p:any)=>p.full_name||'').filter(Boolean));
          setPmList(data.filter((p:any)=>p.role==='project_manager').map((p:any)=>p.full_name||'').filter(Boolean));
        }
      });
  }, []);

  // Fetch vendor list from Supabase
  const [vendorList, setVendorList] = React.useState<{name:string;contact:string;phone:string;email:string}[]>([]);
  const fetchVendors = React.useCallback(() => {
    const sb = createClient();
    sb.from('vendors').select('name,contact_person,phone,email').eq('is_active', true).order('name')
      .then(({ data }) => {
        if (data) setVendorList(data.map((v:any) => ({
          name:    v.name    || '',
          contact: v.contact_person || '',
          phone:   v.phone   || '',
          email:   v.email   || '',
        })));
      });
  }, []);
  React.useEffect(() => { fetchVendors(); }, [fetchVendors]);
  React.useEffect(() => {
    const onFocus = () => fetchVendors();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchVendors]);


  // stnAllApproved: computed from po_items after p is available
  const { getByProject: getSTNItems } = usePOItems();
  const stnAllApproved = React.useMemo(() => {
    const pid = id as string;
    if (!pid) return false;
    const stnItems = getSTNItems(pid).filter((i:any) => i.utilisedStatus === 'pm_approved' && Math.max(0,(i.quantity||0)-(i.pmApprovedQty||0)) > 0);
    if (stnItems.length === 0) return false;
    return stnItems.every((i:any) => i.returnReceived === true);
  }, [id, getSTNItems]);

  // Billing checklist — auto-computed read-only (no manual state needed)
  const [billingNotes, setBillingNotes] = useState('');

  // PM review
  const [reviewNotes,  setReviewNotes]  = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showReject,   setShowReject]   = useState(false);

  const [activityEntries, setActivityEntries] = React.useState<any[]>([]);
  React.useEffect(() => {
    if (id) getActivityLog(id as string).then(setActivityEntries);
  }, [id, getActivityLog]);

  // Doc verifications — before ALL early returns
  React.useEffect(() => {
    if (dbProject && (dbProject as any).doc_verifications) {
      setDocVerifications((dbProject as any).doc_verifications || {});
    }
  }, [(dbProject as any)?.id]);

  if (!router.isReady) return (
    <Layout>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', flexDirection:'column', gap:16 }}>
        <div className="spinner" style={{ width:32, height:32, borderTopColor:T.primary, borderColor:`${T.primary}30` }} />
        <div style={{ fontSize:14, color:T.textMuted }}>Loading project…</div>
      </div>
    </Layout>
  );

  // Merge: DB project takes priority over local state
  const project = (dbProject as any) || null;  // Only use live DB data, no seed fallback
  if (!project) return (
    <Layout>
      <div style={{ ...card, textAlign:'center', padding:60, margin:20 }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🔍</div>
        <h2 style={{ fontSize:20, fontWeight:700, color:T.text, marginBottom:12 }}>Project Not Found</h2>
        <Link href="/projects" style={{ background:T.primary, color:'#fff', borderRadius:8, padding:'10px 20px', textDecoration:'none', fontSize:13, fontWeight:600 }}>← Back to Projects</Link>
      </div>
    </Layout>
  );

  const p = project;

  const workDocsList = getProjectDocs((id as string) || '');
  const workDocs: Record<string, any[]> = DOC_TYPES.reduce((acc:any, dt:any) => {
    acc[dt.key] = workDocsList.filter((d:any) => d.docType === dt.key).map((d:any) => ({
      name: d.fileName, size: d.fileSize, url: d.fileUrl,
      isImage: dt.key.includes('photo'), id: d.id,
    }));
    return acc;
  }, {});

  if (!p) return (
    <Layout>
      <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:300, flexDirection:'column', gap:16 }}>
        <div style={{ fontSize:32 }}>⏳</div>
        <div style={{ fontSize:16, color:'#6B7280' }}>Loading project...</div>
      </div>
    </Layout>
  );

  const isCompleted = ['completed','billing_review'].includes(p.status);
  // stnData now comes from MaterialContext via SRNSection
  const st = STATUS_COLOR[p.status] || '#64748B';

  // Edit form state
  // Parse date from pasted Excel text (DD/MM/YYYY, DD-MM-YYYY, DD-MMM-YYYY etc) → YYYY-MM-DD
  const parsePastedDate = (raw: string): string => {
    const s = raw.trim();
    const MONTHS: Record<string,string> = {
      jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',
      jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'
    };
    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // DD/MM/YYYY or DD-MM-YYYY
    const dmy = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
    if (dmy) {
      const [,d,m,y] = dmy;
      const yr = y.length===2 ? '20'+y : y;
      return `${yr}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    }
    // DD-MMM-YYYY or DD MMM YYYY
    const dmy2 = s.match(/^(\d{1,2})[-\s]([A-Za-z]{3,9})[-\s](\d{2,4})$/);
    if (dmy2) {
      const [,d,mon,y] = dmy2;
      const m = MONTHS[mon.slice(0,3).toLowerCase()] || '01';
      const yr = y.length===2 ? '20'+y : y;
      return `${yr}-${m}-${d.padStart(2,'0')}`;
    }
    return '';
  };

  const F = (label:string, key:string, type='text', options?:string[], readOnly=false, sectionCanEdit=editing('details') && canEditDetails, maxLen?:number) => (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:'block', fontSize:12, fontWeight:600, color:T.textMuted, marginBottom:5, textTransform:'uppercase', letterSpacing:0.3 }}>{label}</label>
      {editingSection !== null && !readOnly && sectionCanEdit ? (
        options ? (
          <select value={(form as any)[key]||''} onChange={e=>setForm((f:any)=>({...f,[key]:e.target.value}))} style={{ ...inputStyle(), width:'100%' }}>
            <option value="">— Select —</option>
            {/* Include current value even if not in list */}
            {(form as any)[key] && !options.includes((form as any)[key]) && (
              <option value={(form as any)[key]}>{(form as any)[key]}</option>
            )}
            {options.map(o=><option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input type={type} value={(form as any)[key]||''} onChange={e=>setForm((f:any)=>({...f,[key]:e.target.value}))}
            onPaste={type==='date' ? (e:any)=>{
              const pasted = e.clipboardData?.getData('text') || '';
              const parsed = parsePastedDate(pasted);
              if (parsed) { e.preventDefault(); setForm((f:any)=>({...f,[key]:parsed})); }
            } : undefined}
            maxLength={maxLen} style={{ ...inputStyle(), width:'100%', boxSizing:'border-box' as const }} />
        )
      ) : (
        <div style={{ fontSize:14, fontWeight:600, color:T.text, padding:'8px 0', borderBottom:`1px solid ${T.border}` }}>
          {type==='date' ? fmtDate((form as any)[key]||'') : ((form as any)[key] || '—')}
        </div>
      )}
    </div>
  );

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setProjects((prev:any) => ({ ...prev, [id as string]: { ...prev[id as string], ...form } }));
        // Persist to Supabase
        ctxUpdateProject(id as string, form, profile?.full_name ?? undefined).catch(console.error);
      setSaving(false);
      setEditingSection(null);
      setToast({ msg:'Project updated successfully!', type:'success' });
    }, 600);
  };

  const updateStatus = (newStatus: string, msg: string) => {
    setProjects((prev:any) => ({ ...prev, [p.id]: { ...prev[p.id], status:newStatus } }));
    setToast({ msg, type:'success' });
  };

  const handleBillingDone = () => {
    const _docSt = getDocStatus(p.id);
    if (!stnAllApproved || !srnAllApproved || !_docSt['ptw_document'] || !_docSt['jmr_document']) {
      setToast({ msg:'All 4 checklist items must be completed before releasing payment.', type:'error' });
      return;
    }
    updateStatus('completed', '✅ Billing complete! Project marked as Completed.');
  };

  const sectionTitle = (icon:string, title:string, sectionKey:string, canEditSection=true, locked?:React.ReactNode, applicableCheckbox?:React.ReactNode) => (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, paddingBottom:10, borderBottom:`2px solid ${T.primaryMid}` }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ fontSize:15, fontWeight:700, color:T.primary }}>{icon} {title}</div>
        {applicableCheckbox}
      </div>
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        {locked}
        {canEditSection && notEditing && (
          <button onClick={()=>startEdit(sectionKey)}
            style={{ background:T.primaryLight, border:`1px solid ${T.primaryMid}`, borderRadius:7, padding:'4px 12px', color:T.primary, cursor:'pointer', fontSize:12, fontWeight:600 }}>
            ✏️ Edit
          </button>
        )}
        {editing(sectionKey) && (
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={cancelEdit}
              style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:7, padding:'4px 12px', color:T.text, cursor:'pointer', fontSize:12 }}>
              Cancel
            </button>
            <button onClick={saveSection} disabled={saving}
              style={{ ...btnPrimary, fontSize:12, padding:'4px 14px', opacity:saving?0.8:1 }}>
              {saving?'Saving…':'💾 Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const roleColor: Record<string,string> = { Vendor:T.info, PM:T.primary, RM:T.success, Billing:'#7C3AED', Payment:T.success };
  const projectTxns = allTransactions.filter(t => t.projectId === p.id);
  const txnLogs = projectTxns.map(t => ({
    date: t.addedAt,
    action: `Payment of ${fmt(t.amount)} — Txn: ${t.txnNumber}`,
    by: t.addedBy,
    role: 'Payment' as const,
  }));
  const fmtActivityDate = (d: string) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
    catch { return d; }
  };
  const ACTIVITY_LOG = [
    ...txnLogs,
    ...activityEntries.map(e => ({ date: fmtActivityDate(e.createdAt), action: e.action, by: e.byName, role: e.byRole }))
  ].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Layout>
      <div className="fade-in">
        {/* ── Header ── */}
        <div style={{ ...card, marginBottom:20, padding:'20px 24px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12, marginBottom:16 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6, flexWrap:'wrap' }}>
                <Link href="/projects" style={{ color:T.textMuted, textDecoration:'none', fontSize:13 }}>← Projects</Link>
                <span style={{ color:T.textDim }}>/</span>
                <h1 style={{ fontSize:20, fontWeight:800, color:T.text, margin:0 }}>{p.id}</h1>
                <div style={{ minWidth:200 }}>
                  <select
                    value={p.projectStatus || ''}
                    onChange={async e => {
                      const newStatus = e.target.value;
                      const prevStatus = p.projectStatus || '';
                      try {
                        await ctxUpdateProject(p.id, { projectStatus: newStatus } as any, profile?.full_name ?? undefined);
                        logActivityMain(p.id, `Project status changed from "${prevStatus||'—'}" to "${newStatus}"`, profile?.full_name||'', profile?.role||'', prevStatus, newStatus).catch(()=>{});
                      } catch (err: any) {
                        console.error('Failed to update project status:', err);
                      }
                    }}
                    style={{ border:`1px solid ${T.border}`, borderRadius:8, padding:'8px 12px', fontSize:13, outline:'none', background:'#fff', minWidth:220, cursor:'pointer' }}>
                    <option value="">— Set Project Status —</option>
                    {PROJECT_STATUS_OPTIONS.map(opt => {
                      const currentIdx = PROJECT_STATUS_OPTIONS.indexOf(p.projectStatus || '');
                      const optIdx = PROJECT_STATUS_OPTIONS.indexOf(opt);
                      const isDisabled = role !== 'super_admin' && currentIdx !== -1 && optIdx < currentIdx;
                      return <option key={opt} value={opt} disabled={isDisabled} style={{ color: isDisabled ? '#9CA3AF' : 'inherit' }}>{opt}</option>;
                    })}
                  </select>
                </div>
              </div>
              <div style={{ fontSize:14, color:T.textMuted }}>{p.site} · {p.region}</div>
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>

              {/* PM Review actions */}
              {notEditing && canEdit && (p.status==='submitted'||p.status==='under_review') && (
                <>
                  <button onClick={()=>updateStatus('pm_approved','Project approved and sent to billing!')} style={{ ...btnPrimary, background:T.success, fontSize:13 }}>✅ Approve</button>
                  <button onClick={()=>setShowReject(true)} style={{ ...btnSecondary, borderColor:T.danger, color:T.danger, fontSize:13 }}>❌ Reject</button>
                </>
              )}

              {/* SA-only Delete button */}
                            {role === 'super_admin' && (
                <button onClick={deleteProject} disabled={deleting}
                  style={{ background:'#FEF2F2', border:'1.5px solid #FECACA', borderRadius:8,
                    padding:'8px 16px', color:T.danger, cursor:'pointer', fontSize:13,
                    fontWeight:600, opacity:deleting?0.6:1, display:'flex', alignItems:'center', gap:6 }}>
                  🗑 {deleting ? 'Deleting…' : 'Delete Project'}
                </button>
              )}
            </div>
          </div>

        </div>

        {/* ── 1. Project Details + Financial ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
          <div style={card}>
            {sectionTitle('📋','Project Details', 'details', canEditDetails)}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
              {F('Project No',       'id',          'text', undefined, true)}
              {F('Project ID',       'projectId',   'text', undefined, false, undefined, 25)}
              {F('PO Number',        'poNo',        'text', undefined, false)}
              {F('PO Date',          'poDate',      'date')}
              {F('PO Amount (₹)',    'poValue',     'number')}
              {editing('details') && canEditDetails ? (
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:T.textMuted, marginBottom:5, textTransform:'uppercase', letterSpacing:0.3 }}>PO Status</label>
                  <CreatableDropdown
                    value={(form as any).poStatus||''}
                    onChange={v=>setForm((f:any)=>({...f,poStatus:v}))}
                    options={poStatusOpts}
                    placeholder="Select or create PO status..."
                    onCreateNew={v=>addLookupOption('po_status',v)} />
                </div>
              ) : (
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:T.textMuted, marginBottom:5, textTransform:'uppercase', letterSpacing:0.3 }}>PO Status</label>
                  <div style={{ fontSize:14, fontWeight:600, color:T.text, padding:'8px 0', borderBottom:`1px solid ${T.border}` }}>{(form as any).poStatus || '—'}</div>
                </div>
              )}
              {F('Indus ID',         'indusId',     'text', undefined, false)}
              {editing('details') && canEditDetails ? (
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:T.textMuted, marginBottom:5, textTransform:'uppercase', letterSpacing:0.3 }}>Site Name</label>
                  <CreatableDropdown value={(form as any).site||''} onChange={v=>setForm((f:any)=>({...f,site:v}))}
                    options={siteOpts} placeholder="Select or create site..."
                    onCreateNew={v=>addLookupOption('site',v)} />
                </div>
              ) : F('Site Name', 'site')}
              {editing('details') && canEditDetails ? (
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:T.textMuted, marginBottom:5, textTransform:'uppercase', letterSpacing:0.3 }}>Region</label>
                  <CreatableDropdown value={(form as any).region||''} onChange={v=>setForm((f:any)=>({...f,region:v}))}
                    options={regionOpts} placeholder="Select or create region..."
                    onCreateNew={v=>addLookupOption('region',v)} />
                </div>
              ) : F('Region', 'region', 'text', REGIONS)}
              {editing('details') && canEditDetails ? (
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:T.textMuted, marginBottom:5, textTransform:'uppercase', letterSpacing:0.3 }}>Project Name</label>
                  <CreatableDropdown value={(form as any).type||''} onChange={v=>setForm((f:any)=>({...f,type:v}))}
                    options={jobTypeOpts} placeholder="Select or create job type..."
                    onCreateNew={v=>addLookupOption('job_type',v)} />
                </div>
              ) : F('Project Name', 'type', 'text', TYPES)}
              {F('Allocation Date',      'startDate',   'date')}
              {F('Work Completion Date', 'endDate',     'date')}
              {F('Region Manager', 'rm', 'text', rmList.length > 0 ? rmList : undefined)}
              {F('Project Manager', 'pm', 'text', pmList.length > 0 ? pmList : undefined)}
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:T.textMuted, marginBottom:5, textTransform:'uppercase', letterSpacing:0.3 }}>Remarks</label>
              {editing('details') && canEditDetails
                ? <textarea value={form.remarks||''} onChange={e=>setForm((f:any)=>({...f,remarks:e.target.value}))} rows={3} style={{ ...inputStyle(), width:'100%', resize:'vertical', boxSizing:'border-box' as const }} />
                : <div style={{ fontSize:13, color:T.text, padding:'8px 0', borderBottom:`1px solid ${T.border}` }}>{p.remarks||'—'}</div>
              }
            </div>
          </div>

          {showFinancial && <div style={card}>
            {sectionTitle('💰','Financial Summary', 'financial', canEditFin)}
            {(() => {
              // Aggregate across all projects with same PO number
              const siblingIds = (allProjects as any[]).filter((proj:any) => proj.poNo === p.poNo).map((proj:any) => proj.id);
              const poBilledAmt = allInvoices.filter((i:any) => siblingIds.includes(i.projectId) && (i.invoiceStatus === 'Approved' || i.paymentStatus === 'Paid')).reduce((a:number,i:any) => a + Number(i.invoiceAmount||0), 0);
              const rows = [
                { label:'PO Value',      key:'poValue',  color:T.text,    computed: undefined },
                { label:'Billed Amount', key:null,       color:T.info,    computed: poBilledAmt },
                { label:'Paid Amount',   key:null,       color:T.success, computed: poPaidAmt },
                { label:'Projection',    key:null,       color:T.warning, computed: poBilledAmt - poPaidAmt },
              ];
              return rows.map((r,i)=>(
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:`1px solid ${T.border}` }}>
                  <span style={{ fontSize:13, color:T.textMuted }}>{r.label}</span>
                  {editing('financial') && canEditFin && r.key ? (
                    <input type="number" value={(form as any)[r.key]||0} onChange={e=>setForm((f:any)=>({...f,[r.key!]:Number(e.target.value)}))}
                      style={{ ...inputStyle(), width:160, textAlign:'right' as const }} />
                  ) : (
                    <span style={{ fontSize:14, fontWeight:700, color:r.color }}>
                      {finSummaryLoading && r.key !== 'poValue' ? '—' : fmt(r.computed !== undefined ? r.computed : (p as any)[r.key!])}
                    </span>
                  )}
                </div>
              ));
            })()}
            <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 14px', background:T.primaryLight, borderRadius:8, marginTop:12 }}>
              <span style={{ fontSize:13, fontWeight:700, color:T.primary }}>PO Aging</span>
              <span style={{ fontSize:14, fontWeight:800, color:T.primary }}>
                {Math.floor((Date.now() - new Date(p.startDate).getTime()) / 86400000)} days
              </span>
            </div>
          </div>}
        </div>

        {/* ── 2. Vendor Assignment ── */}
        {showVendor && <div style={{ ...card, marginBottom:16, opacity:isCompleted&&!editingSection !== null?0.8:1 }}>
          {sectionTitle('🏢','Vendor Assignment', 'vendor', canEditVendor && !isCompleted, isCompleted ? <span style={{ fontSize:11, color:T.textDim, background:T.bg, border:`1px solid ${T.border}`, borderRadius:20, padding:'3px 12px' }}>🔒 Locked</span> : undefined)}
          {/* Vendor selection with auto-populate */}
          {editingSection !== null && canEditVendor && !isCompleted ? (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
              <div style={{ gridColumn:'1/-1' }}>
                <CreatableSelect
                  label="Vendor Name *"
                  value={form.vendor||''}
                  options={vendorList.map(v=>v.name)}
                  placeholder="Select or create vendor…"
                  onChange={v => {
                    const found = vendorList.find(vl => vl.name === v);
                    setForm((f:any) => ({
                      ...f,
                      vendor:        v,
                      vendorContact: found?.contact || f.vendorContact,
                      vendorPhone:   found?.phone   || f.vendorPhone,
                      vendorEmail:   found?.email   || f.vendorEmail,
                    }));
                  }}
                  onCreateNew={async v => {
                    // Save new vendor to vendors table
                    try {
                      const sb = createClient();
                      await sb.from('vendors').insert({ name: v, is_active: true });
                      fetchVendors(); // refresh dropdown
                    } catch(err) { console.error('Vendor insert error:', err); }
                    setForm((f:any) => ({ ...f, vendor:v, vendorContact:'', vendorPhone:'', vendorEmail:'' }));
                  }}
                />
              </div>
              {[['Contact Person','vendorContact'],['Phone','vendorPhone'],['Email','vendorEmail']].map(([label,key])=>(
                <div key={key} style={{ marginBottom:14 }}>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:T.textMuted, marginBottom:5, textTransform:'uppercase', letterSpacing:0.3 }}>{label}</label>
                  <input value={(form as any)[key]||''} onChange={e=>setForm((f:any)=>({...f,[key]:e.target.value}))}
                    style={{ ...inputStyle(), width:'100%', boxSizing:'border-box' as const }} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0 16px' }}>
              {[
                ['Vendor Name','vendor'],['Contact Person','vendorContact'],
                ['Phone','vendorPhone'],['Email','vendorEmail'],
              ].map(([label,key])=>(
                <div key={key} style={{ marginBottom:14 }}>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:T.textMuted, marginBottom:5, textTransform:'uppercase', letterSpacing:0.3 }}>{label}</label>
                  <div style={{ fontSize:14, fontWeight:600, color:p[key]?T.text:T.textDim, padding:'8px 0', borderBottom:`1px solid ${T.border}` }}>
                    {(form as any)[key]||'—'}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginBottom:14 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:T.textMuted, marginBottom:5, textTransform:'uppercase', letterSpacing:0.3 }}>Work Scope</label>
            {editing('vendor') && canEditVendor && !isCompleted
              ? <textarea value={form.workScope||''} onChange={e=>setForm((f:any)=>({...f,workScope:e.target.value}))} rows={2} style={{ ...inputStyle(), width:'100%', resize:'vertical', boxSizing:'border-box' as const }} />
              : <div style={{ fontSize:13, color:T.text, padding:'8px 0', borderBottom:`1px solid ${T.border}` }}>{p.workScope||'—'}</div>
            }
          </div>
        </div>}


        {/* ── STN ── */}
        <div style={{ ...card, marginBottom:16 }}>
          {sectionTitle('📋','STN', 'poitems', false, undefined,
            ['super_admin','region_manager','project_manager'].includes(role) && (
              <label style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:T.textMuted, cursor:'pointer' }}>
                <input type="checkbox" checked={stnApplicable} disabled={getSTNItems(p.id).length > 0}
                  title={getSTNItems(p.id).length > 0 ? 'Cannot change — STN items already exist for this project' : undefined}
                  onChange={e=>toggleApplicable('stn_applicable', e.target.checked)} />
                Applicable
              </label>
            )
          )}
          <POItemsSection projectId={p.id} editing={editing('poitems')} canAdd={canEdit && stnApplicable} isVendorRole={role==='vendor'} indusId={(p as any).indusId||''} />
        </div>

        {/* ── SRN ── */}
        {showSTNSRN && (
          <div style={{ ...card, marginBottom:16 }}>
            {sectionTitle('📦','SRN — Store Return Note', 'srndetail', false, undefined,
              ['super_admin','region_manager','project_manager'].includes(role) && (
                <label style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:T.textMuted, cursor:'pointer' }}>
                  <input type="checkbox" checked={srnApplicable} disabled={srnItemCount > 0}
                    title={srnItemCount > 0 ? 'Cannot change — SRN items already exist for this project' : undefined}
                    onChange={e=>toggleApplicable('srn_applicable', e.target.checked)} />
                  Applicable
                </label>
              )
            )}
            <SRNSectionNew projectId={p.id} role={role} onAllReceived={setSrnAllApproved} onCountChange={setSrnItemCount} canAdd={srnApplicable} />
          </div>
        )}


        
        {/* ── Work Progress ── */}
        {showWorkProgress && (
          <div style={{ ...card, marginBottom:16 }}>
            {sectionTitle('📝','Work Progress', 'workprogress', false)}
            <WorkProgressSection projectId={p.id} role={role} />
          </div>
        )}

        {/* ── PTW — Permit to Work ── */}
        {showPTW && <div style={{ ...card, marginBottom:16 }}>
          {sectionTitle('🔑','PTW — Permit to Work', 'ptw', false, undefined,
            ['super_admin','region_manager','project_manager'].includes(role) && (
              <label style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:T.textMuted, cursor:'pointer' }}>
                <input type="checkbox" checked={ptwApplicable} disabled={ptwItemCount > 0}
                  title={ptwItemCount > 0 ? 'Cannot change — PTW records already exist for this project' : undefined}
                  onChange={e=>toggleApplicable('ptw_applicable', e.target.checked)} />
                Applicable
              </label>
            )
          )}
          <PTWSectionCard projectId={p.id} vendorContact={p.vendorContact||''} canEdit={canEditPTW} canAdd={canEditPTW && ptwApplicable} onCountChange={setPtwItemCount} />
        </div>}



                {/* ── 3. Work Documents ── */}
        {showDocs && <div style={{ ...card, marginBottom:16 }}>
          {sectionTitle('📂','Work Documents', 'docs', false)}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 3fr 1fr', gap:14 }}>
            {DOC_TYPES.map(doc => {
              const docs = workDocs[doc.key] || [];
              const uploaded = docs.length > 0;
              return (
                <div key={doc.key} style={{ border:`1.5px solid ${uploaded?T.success:T.border}`, borderRadius:10, padding:14, background:uploaded?T.successBg:'#fff' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                    <span style={{ fontSize:18 }}>{doc.icon}</span>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{doc.label}</div>
                      <div style={{ fontSize:11, color:T.textDim }}>{docs.length} file(s)</div>
                    </div>
                    {uploaded && <span style={{ marginLeft:'auto', fontSize:10, fontWeight:700, color:T.success, background:T.successBg, padding:'2px 8px', borderRadius:10 }}>✓ Uploaded</span>}
                  </div>

                  {/* Thumbnails */}
                  {docs.length > 0 && (
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' as const, marginBottom:6 }}>
                      {docs.map((d,i) => (
                        <div key={i} onClick={()=>setPreviewDoc(d)}
                          style={{ width:56, height:56, borderRadius:6, overflow:'hidden', cursor:'pointer', border:`1px solid ${T.border}`, background:T.bg, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' as const }}
                          title={d.name}>
                          {d.isImage && d.url
                            ? <img src={d.url} alt={d.name} style={{ width:'100%', height:'100%', objectFit:'cover' as const }} onError={e=>(e.currentTarget.style.display='none')} />
                            : <span style={{ fontSize:22 }}>📄</span>
                          }
                          <div style={{ position:'absolute' as const, inset:0, background:'rgba(0,0,0,0)', transition:'all 0.2s' }} className="doc-hover" />
                        </div>
                      ))}
                    </div>
                  )}

                  {docs.length === 0 && (
                    <div style={{ textAlign:'center', padding:'12px 0', color:T.textDim, fontSize:12 }}>No files uploaded</div>
                  )}

                  {/* Verification checkbox */}
                  {canVerifyDocs && (
                    <div style={{ marginTop:8, paddingTop:8, borderTop:`1px solid ${T.border}` }}>
                      <label style={{ display:'flex', alignItems:'center', gap:8, cursor: docVerifications[doc.key] ? 'default' : 'pointer' }}
                        onClick={()=>{ if (!docVerifications[doc.key]) verifyDoc(doc.key, p.id); }}>
                        <div style={{ width:18, height:18, borderRadius:4, border:`2px solid ${docVerifications[doc.key]?T.success:T.border}`,
                          background:docVerifications[doc.key]?T.success:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
                          flexShrink:0, transition:'all 0.15s' }}>
                          {docVerifications[doc.key] && <span style={{ color:'#fff', fontSize:12, fontWeight:700 }}>✓</span>}
                        </div>
                        <span style={{ fontSize:12, fontWeight:600, color:docVerifications[doc.key]?T.success:T.textMuted }}>
                          {docVerifications[doc.key] ? 'Verified' : 'Mark as Verified'}
                        </span>
                      </label>
                      {docVerifications[doc.key] && (
                        <div style={{ fontSize:10, color:T.textMuted, marginTop:4, marginLeft:26 }}>
                          ✓ Verified on {new Date(docVerifications[doc.key]).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})} at {new Date(docVerifications[doc.key]).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
                        </div>
                      )}
                    </div>
                  )}
                  {!canVerifyDocs && docVerifications[doc.key] && (
                    <div style={{ marginTop:8, paddingTop:8, borderTop:`1px solid ${T.border}`, fontSize:10, color:T.success, fontWeight:600 }}>
                      ✓ Verified on {new Date(docVerifications[doc.key]).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})} at {new Date(docVerifications[doc.key]).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
                    </div>
                  )}

                  {/* Upload + Delete buttons */}
                  {canUploadDocs && (
                    <div style={{ marginTop:8, display:'flex', gap:6, flexWrap:'wrap' as const }}>
                      <label style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600,
                        color:T.primary, background:T.primaryLight, border:`1px solid ${T.primaryMid}`,
                        borderRadius:6, padding:'5px 10px', cursor:'pointer' }}>
                        ⬆ Upload
                        <input type="file" accept={doc.accept} style={{ display:'none' }}
                          onChange={async e => {
                            const file = e.target.files?.[0]; if (!file) return;
                            try {
                              setToast({ msg:'⏳ Uploading...', type:'info' });
                              const result = await upload(file, 'projects/' + id + '/' + doc.key);
                              await addDoc({ projectId: id as string, docType: doc.key,
                                fileName: result.fileName, fileUrl: result.publicUrl,
                                fileSize: result.fileSize, uploadedByName: profile?.full_name || '' });
                              logActivity(id as string, `${doc.label} uploaded`, profile?.full_name||'', profile?.role||'').catch(console.error);
                              setToast({ msg:'✅ File uploaded successfully', type:'success' });
                            } catch(err:any) {
                              console.error('Upload error:', err);
                              setToast({ msg:'❌ ' + (err?.message || JSON.stringify(err)), type:'error' });
                            }
                            e.target.value = '';
                          }} />
                      </label>
                      {docs.map((d:any, i:number) => (
                        <button key={i} onClick={() => { if(d.id) deleteWorkDoc(d.id); }}
                          title={`Delete ${d.name}`}
                          style={{ fontSize:11, color:T.danger, background:'#FEF2F2', border:`1px solid #FECACA`,
                            borderRadius:6, padding:'5px 8px', cursor:'pointer' }}>
                          🗑 {d.name?.substring(0,15)}{d.name?.length>15?'…':''}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>}



        {/* ── 5. Billing Review Checklist ── */}
        {showBillingReview && (
          <div style={{ ...card, marginBottom:16, border:`1.5px solid ${T.border}`, }}>
            {sectionTitle('💳','Billing Review Checklist', 'billing', isBilling)}

            {(() => {
              const docSt = getDocStatus(p.id);
              const items2 = [
                { key:'stn', label:'STN Done',     desc:'All STN returns received by PM',          checked: stnAllApproved,            important: false },
                { key:'srn', label:'SRN Done',     desc:'All SRN items received by PM',             checked: srnAllApproved,            important: true  },
                { key:'ptw', label:'PTW Done',     desc:'Permit to Work document uploaded',         checked: !!docSt['ptw_document'],   important: false },
                { key:'jmr', label:'JMR Document', desc:'JMR / JMS document uploaded',              checked: !!docSt['jmr_document'],   important: true  },
              ];
              return (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12, marginBottom:16 }}>
                  {items2.map(item => (
                    <div key={item.key}
                      style={{ padding:14, borderRadius:10,
                        border:`2px solid ${item.checked ? item.important ? T.primary : T.success : item.important ? '#EF4444' : T.border}`,
                        background:item.checked ? item.important ? T.primaryLight : T.successBg : '#fff',
                        transition:'all 0.15s' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:22, height:22, borderRadius:6,
                          border:`2px solid ${item.checked ? item.important ? T.primary : T.success : T.border}`,
                          background:item.checked ? item.important ? T.primary : T.success : '#fff',
                          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          {item.checked && <span style={{ color:'#fff', fontSize:13, fontWeight:700 }}>✓</span>}
                        </div>
                        <div>
                          <div style={{ fontSize:13, fontWeight:700, color:T.text }}>
                            {item.label}
                            {item.important && <span style={{ fontSize:10, color:item.checked ? T.success : T.danger, marginLeft:6 }}>{item.checked ? '✓ DONE' : 'MANDATORY'}</span>}
                          </div>
                          <div style={{ fontSize:11, color:T.textMuted }}>{item.desc}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:6 }}>Invoice Reference / Billing Notes</label>
              <textarea value={billingNotes} onChange={e=>setBillingNotes(e.target.value)} placeholder="Enter invoice reference number or billing notes…" rows={2}
                style={{ ...inputStyle(), width:'100%', resize:'vertical', boxSizing:'border-box' as const }} />
            </div>

            {isBilling && ['pm_approved','billing_review'].includes(p.status) && (() => {
                const docSt2 = getDocStatus(p.id);
                const allReady = stnAllApproved && srnAllApproved && !!docSt2['ptw_document'] && !!docSt2['jmr_document'];
                return (
                  <button onClick={allReady ? handleBillingDone : undefined}
                    style={{ ...btnPrimary, background:allReady?T.success:T.border, cursor:allReady?'pointer':'not-allowed' }}>
                    ✅ Mark Billing Done — Release Payment
                  </button>
                );
              })()}

            {p.status === 'completed' && (
              <div style={{ background:T.successBg, border:`1px solid #BBF7D0`, borderRadius:8, padding:'10px 14px', fontSize:13, color:T.success, fontWeight:600 }}>
                ✅ Billing complete. Payment released.
              </div>
            )}
          </div>
        )}


        {/* ── Expenses ── */}
        {showExpenses && <div style={{ ...card, marginBottom:16 }}>
          {sectionTitle('💸','Expenses', 'expenses', false)}
          <ExpensesSection projectId={p.id} canAdd={canAddExpenses} />
        </div>}

        {/* ── Invoice ── */}
        {showInvoice && <div style={{ ...card, marginBottom:16 }}>
          {sectionTitle('🧾','Invoice', 'invoice', false)}
          <InvoiceSection projectId={p.id} canAdd={canAddInvoice} projectPoNo={p.poNo||''} paidAmount={poPaidAmt}
            investorPct={{
              investor1_profit1_pct: Number((p as any).investor1_profit1_pct ?? 5),
              investor1_profit2_pct: Number((p as any).investor1_profit2_pct ?? 5),
              investor2_profit1_pct: Number((p as any).investor2_profit1_pct ?? 5),
              investor2_profit2_pct: Number((p as any).investor2_profit2_pct ?? 95),
              investor1_additional_capital_pct: Number((p as any).investor1_additional_capital_pct ?? 2),
              investor1_interest_pct: Number((p as any).investor1_interest_pct ?? 2),
              investor1_other_expenses_pct: Number((p as any).investor1_other_expenses_pct ?? 0),
              investor1_m1_pct: Number((p as any).investor1_m1_pct ?? 1),
            }} />
        </div>}

        {/* ── 6. Activity Log ── */}
        {showActivityLog && <div style={card}>
          {sectionTitle('📝','Activity Log', 'activity', false)}
          <div style={{ position:'relative' as const }}>
            <div style={{ position:'absolute' as const, left:12, top:0, bottom:0, width:2, background:T.border }} />
            {ACTIVITY_LOG.map((log,i)=>{
              const c = roleColor[log.role] || T.textDim;
              return (
                <div key={i} style={{ display:'flex', gap:14, marginBottom:16, paddingLeft:8 }}>
                  <div style={{ width:22, height:22, borderRadius:'50%', background:c, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, zIndex:1, marginTop:2 }}>
                    <span style={{ color:'#fff', fontSize:9, fontWeight:700 }}>{log.role[0]}</span>
                  </div>
                  <div style={{ flex:1, background:T.bg, borderRadius:10, padding:'10px 14px', border:`1px solid ${T.border}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
                      <span style={{ fontSize:13, fontWeight:600, color:T.text }}>{log.action}</span>
                      <span style={{ fontSize:10, background:`${c}20`, color:c, padding:'2px 8px', borderRadius:20, fontWeight:600 }}>{log.role}</span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <span style={{ fontSize:12, color:T.textMuted }}>{log.by}</span>
                      <span style={{ fontSize:11, color:T.textDim }}>{log.date}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>}

        {/* Document Preview Modal */}
        {previewDoc && (
          <Modal title={previewDoc.name} onClose={()=>setPreviewDoc(null)} width={700}>
            {previewDoc.isImage && previewDoc.url ? (
              <img src={previewDoc.url} alt={previewDoc.name} style={{ width:'100%', borderRadius:8, maxHeight:'70vh', objectFit:'contain' as const }} />
            ) : (
              <div style={{ textAlign:'center', padding:40 }}>
                <div style={{ fontSize:64, marginBottom:16 }}>📄</div>
                <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:12 }}>{previewDoc.name}</div>
                <a href={previewDoc.url||'#'} target="_blank" rel="noopener noreferrer"
                  style={{ background:T.primary, color:'#fff', borderRadius:8, padding:'10px 20px', textDecoration:'none', fontSize:13, fontWeight:600 }}>
                  Open PDF in New Tab ↗
                </a>
              </div>
            )}
          </Modal>
        )}

        {/* Reject Modal */}
        {showReject && (
          <Modal title="❌ Reject Project" onClose={()=>setShowReject(false)} width={460}>
            <p style={{ fontSize:13, color:T.textMuted, marginBottom:16 }}>Provide reason for rejection — this will be sent to the vendor.</p>
            <textarea value={rejectReason} onChange={e=>setRejectReason(e.target.value)} placeholder="e.g. Missing NOC document, safety photos unclear…" rows={4}
              style={{ ...inputStyle(), width:'100%', resize:'vertical', boxSizing:'border-box' as const, marginBottom:16 }} />
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
              <button onClick={()=>setShowReject(false)} style={btnSecondary}>Cancel</button>
              <button onClick={()=>{ if(!rejectReason.trim()){setToast({msg:'Reason required.',type:'error'});return;} updateStatus('delayed',`Rejected: ${rejectReason}`); setShowReject(false); }} style={{ ...btnPrimary, background:T.danger }}>❌ Reject & Notify</button>
            </div>
          </Modal>
        )}

        {toast && <Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
      </div>
    </Layout>
  );
}
