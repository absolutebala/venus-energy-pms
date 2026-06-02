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
import { useMaterial } from '@/context/MaterialContext';
import { usePOItems } from '@/context/POItemContext';
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
  'Yet to Start','Work In Progress','Work Completed/ Approval Pending',
  'Billing Shared','LL Issues','Site Issues','CR Pending',
  'JMS Pending with AE','Site Hold','Fresh to be Return',
  'SRN BOQ Pending','SRN Document correction Pending','PO Amendment Done',
  'WCC Raised','Invoice Submitted Payment pending',
  'Invoice Submitted Payment Received','Invoice to be submit/PTW Pending',
  'Invoice to be submit/SRN Pending','Invoice to be submit/ Approval Pending',
  'Work Not Done','Allocation Not received','PO Not reflected','Others',
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


// ── STN Component ───────────────────────────────────────────────────────
function POItemsSection({ projectId, editing, canAdd=true }: { projectId: string; editing: boolean; canAdd?: boolean }) {
  const { getByProject, addItem, updateItem, deleteItem, loading } = usePOItems();
  const { logActivity } = useActivity();
  const { profile: poProfile } = useAuth();
  const items = getByProject(projectId);
  const [adding,   setAdding]   = React.useState(false);
  const [saving,   setSaving]   = React.useState(false);
  const [editId,   setEditId]   = React.useState<string|null>(null);
  const [toast,    setToast]    = React.useState<any>(null);
  const [newRow,   setNewRow]   = React.useState({ description:'', hsnCode:'', uom:'', quantity:'', gstRate:'18', lotNo:'', serialNo:'', faNo:'', mfgNo:'', amount:'' });
  const [editRow,  setEditRow]  = React.useState<any>({});

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
  const thS: React.CSSProperties  = { padding:'9px 12px', fontSize:10, fontWeight:700, textTransform:'uppercase',
    color:T.primary, textAlign:'left' as const, borderBottom:`2px solid ${T.primaryMid}`, background:T.primaryLight, whiteSpace:'nowrap' as const };
  const tdS: React.CSSProperties  = { padding:'10px 12px', fontSize:12, borderBottom:`1px solid ${T.border}`, verticalAlign:'middle' as const };

  const saveNew = async () => {
    if (!newRow.description || !newRow.quantity) return;
    const amt = 0;
    setSaving(true);
    try {
      await addItem({ projectId, description:newRow.description, hsnCode:newRow.hsnCode,
        uom:newRow.uom, quantity:Number(newRow.quantity), rate:0,
        gstRate:Number(newRow.gstRate), amount:Number((newRow as any).amount)||0, sortOrder:items.length+1,
        lotNo:(newRow as any).lotNo, serialNo:(newRow as any).serialNo, faNo:(newRow as any).faNo, mfgNo:(newRow as any).mfgNo } as any);
      setNewRow({ description:'', hsnCode:'', uom:'', quantity:'', gstRate:'18', lotNo:'', serialNo:'', faNo:'', mfgNo:'', amount:'' });
      setAdding(false);
      logActivity(projectId, `STN Item '${newRow.description}' added`, poProfile?.full_name||'', poProfile?.role||'').catch(console.error);
      setToast({ msg:'✅ PO Item added', type:'success' });
    } catch(err:any) { setToast({ msg:'❌ ' + err.message, type:'error' }); }
    finally { setSaving(false); }
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    try {
      const amt = calcAmount(editRow.quantity, editRow.rate);
      await updateItem(id, { ...editRow, quantity:Number(editRow.quantity), rate:Number(editRow.rate),
        gstRate:Number(editRow.gstRate||18), amount:amt });
      setEditId(null);
      logActivity(projectId, `PO Item updated`, poProfile?.full_name||'', poProfile?.role||'').catch(console.error);
      setToast({ msg:'✅ PO Item updated', type:'success' });
    } catch(err:any) { setToast({ msg:'❌ ' + err.message, type:'error' }); }
    finally { setSaving(false); }
  };

  return (
    <div>
      {loading && <div style={{ color:T.textMuted, fontSize:13 }}>Loading STN items...</div>}
      {items.length > 0 && (
        <div style={{ overflowX:'auto' as const }}>
          <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
            <thead>
              <tr>
                {['#','Item Code','Item Description','UOM','Qty','Lot No.','Serial No.','FA. No.','MFG. No.','Tax Rate','Amount (₹)','Total Value (₹)',''].map((h,i)=>(
                  <th key={i} style={{ ...thS }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} style={{ background:idx%2===0?'#fff':T.bg }}>
                  <td style={{ ...tdS, color:T.textMuted, width:32 }}>{idx+1}</td>
                  {editId === item.id ? (
                    <>
                      <td style={tdS}><input value={editRow.hsnCode||''} onChange={e=>setEditRow((p:any)=>({...p,hsnCode:e.target.value}))} style={inpS} /></td>
                      <td style={tdS}><input value={editRow.description||''} onChange={e=>setEditRow((p:any)=>({...p,description:e.target.value}))} style={inpS} /></td>
                      <td style={tdS}><input value={editRow.uom||''} onChange={e=>setEditRow((p:any)=>({...p,uom:e.target.value}))} style={inpS} /></td>
                      <td style={tdS}><input type="number" value={editRow.quantity||''} onChange={e=>setEditRow((p:any)=>({...p,quantity:e.target.value}))} style={inpS} /></td>
                      <td style={tdS}><input value={editRow.lotNo||''} onChange={e=>setEditRow((p:any)=>({...p,lotNo:e.target.value}))} style={inpS} /></td>
                      <td style={tdS}><input value={editRow.serialNo||''} onChange={e=>setEditRow((p:any)=>({...p,serialNo:e.target.value}))} style={inpS} /></td>
                      <td style={tdS}><input value={editRow.faNo||''} onChange={e=>setEditRow((p:any)=>({...p,faNo:e.target.value}))} style={inpS} /></td>
                      <td style={tdS}><input value={editRow.mfgNo||''} onChange={e=>setEditRow((p:any)=>({...p,mfgNo:e.target.value}))} style={inpS} /></td>
                      <td style={tdS}><input type="number" value={editRow.gstRate||18} onChange={e=>setEditRow((p:any)=>({...p,gstRate:e.target.value}))} style={inpS} /></td>
                      <td style={{ ...tdS, fontWeight:700, color:T.primary }}>{fmt(editRow.amount||0)}</td>
                      <td style={{ ...tdS, fontWeight:700, color:T.success }}>{fmt((editRow.amount||0) * (1 + (editRow.gstRate||0)/100))}</td>
                      <td style={{ ...tdS, display:'flex', gap:4 }}>
                        <button onClick={()=>saveEdit(item.id)} disabled={saving} style={{ background:T.primary, color:'#fff', border:'none', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:11 }}>✓</button>
                        <button onClick={()=>setEditId(null)} style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:11 }}>✕</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ ...tdS, color:T.textMuted }}>{item.hsnCode||'—'}</td>
                      <td style={{ ...tdS, fontWeight:500 }}>{item.description}</td>
                      <td style={{ ...tdS, color:T.textMuted }}>{item.uom||'—'}</td>
                      <td style={{ ...tdS }}>{item.quantity.toLocaleString()}</td>
                      <td style={{ ...tdS, color:T.textMuted }}>{(item as any).lotNo||'—'}</td>
                      <td style={{ ...tdS, color:T.textMuted }}>{(item as any).serialNo||'—'}</td>
                      <td style={{ ...tdS, color:T.textMuted }}>{(item as any).faNo||'—'}</td>
                      <td style={{ ...tdS, color:T.textMuted }}>{(item as any).mfgNo||'—'}</td>
                      <td style={{ ...tdS, color:T.textMuted }}>{item.gstRate}%</td>
                      <td style={{ ...tdS, fontWeight:700, color:T.primary }}>{fmt(item.amount)}</td>
                      <td style={{ ...tdS, fontWeight:700, color:T.success }}>{fmt(item.amount * (1 + (item.gstRate||0)/100))}</td>
                      <td style={{ ...tdS, width:64 }}>
                        {canAdd && (
                          <div style={{ display:'flex', gap:4 }}>
                            <button onClick={()=>{ setEditId(item.id); setEditRow({...item}); }}
                              style={{ background:'none', border:`1px solid ${T.border}`, borderRadius:6, padding:'3px 8px', cursor:'pointer', fontSize:12, color:T.primary }}>✏️</button>
                            <button onClick={()=>deleteItem(item.id)}
                              style={{ background:'none', border:'none', cursor:'pointer', color:T.danger, fontSize:14 }}>🗑</button>
                          </div>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background:T.primaryLight, fontWeight:700 }}>
                <td colSpan={11} style={{ ...tdS, textAlign:'right' as const, color:T.textMuted }}>Subtotal excl. GST</td>
                <td style={{ ...tdS, textAlign:'right' as const, color:T.primary }}>{fmt(totalAmount)}</td>
                <td style={tdS}></td>
              </tr>
              <tr style={{ background:T.primaryLight, fontWeight:700 }}>
                <td colSpan={11} style={{ ...tdS, textAlign:'right' as const, color:T.textMuted }}>GST</td>
                <td style={{ ...tdS, textAlign:'right' as const, color:T.textMuted }}>{fmt(totalGST)}</td>
                <td style={tdS}></td>
              </tr>
              <tr style={{ background:T.primaryLight, fontWeight:800 }}>
                <td colSpan={11} style={{ ...tdS, textAlign:'right' as const, color:T.primary }}>Grand Total</td>
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
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:12 }}>
            {([['Item Code','hsnCode','text'],['Item Description *','description','text'],['UOM','uom','text'],
               ['Qty *','quantity','number'],['Lot No.','lotNo','text'],['Serial No.','serialNo','text'],
               ['FA. No.','faNo','text'],['MFG. No.','mfgNo','text'],['Tax Rate %','gstRate','number'],['Amount','amount','number']] as [string,string,string][]).map(([l,f,t])=>(
              <div key={f}>
                <label style={{ display:'block', fontSize:10, fontWeight:600, color:T.textMuted, marginBottom:3, textTransform:'uppercase' as const }}>{l}</label>
                <input type={t} value={(newRow as any)[f]} onChange={e=>setNewRow(p=>({...p,[f]:e.target.value}))} style={inpS} />
              </div>
            ))}
          </div>

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
        {canAdd && !adding && (
          <button onClick={()=>setAdding(true)}
            style={{ background:'#fff', border:`1.5px solid ${T.primary}`, borderRadius:8,
              padding:'8px 18px', color:T.primary, cursor:'pointer', fontSize:13, fontWeight:700 }}>
            + Add Item
          </button>
        )}
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

function PTWSectionCard({ projectId, vendorContact, canEdit, canAdd=true }: { projectId:string; vendorContact:string; canEdit:boolean; canAdd?:boolean }) {
  const [items,   setItems]   = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving,  setSaving]  = React.useState<string|null>(null);
  const [toast,   setToast]   = React.useState<any>(null);

  React.useEffect(() => {
    if (!projectId) return;
    const sb = createClient();
    sb.from('ptw_items').select('*').eq('project_id', projectId).order('created_at')
      .then(({ data }) => {
        if (data) setItems(data.map((r:any) => ({
          id: r.id, ticketId: r.ticket_id||'', supervisor: r.supervisor||'',
          dateFrom: r.date_from||'', dateTo: r.date_to||'', isNew: false,
        })));
        setLoading(false);
      });
  }, [projectId]);

  const addPTW = () => setItems(prev => [...prev, {
    id: `new-${Date.now()}`, ticketId:'', supervisor: vendorContact||'',
    dateFrom:'', dateTo:'', isNew: true,
  }]);

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

  const saveAllPTW = async () => {
    setSaving('all');
    const sb = createClient();
    for (const item of items) {
      const payload = {
        project_id: projectId, ticket_id: item.ticketId, supervisor: item.supervisor,
        date_from: item.dateFrom||null, date_to: item.dateTo||null,
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
    };
    if (item.isNew) {
      const { data, error } = await sb.from('ptw_items').insert(payload).select().single();
      if (!error && data) {
        setItems(prev => prev.map((i:any) => i.id===item.id ? {...data, id:data.id,
          ticketId:data.ticket_id, supervisor:data.supervisor,
          dateFrom:data.date_from||'', dateTo:data.date_to||'', isNew:false} : i));
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
              {['#','Ticket ID *','Supervisor Name','From Date *','To Date *','Status',''].map((h,i)=>(
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
                  <td style={{ padding:'8px 10px', minWidth:160 }}>
                    {canEdit ? inp(item.ticketId,'ticketId',item.id,'text','PTW-2025-XXXX')
                    : <span style={{ fontSize:13, fontWeight:600, color:T.text }}>{item.ticketId||'—'}</span>}
                  </td>
                  <td style={{ padding:'8px 10px', minWidth:160 }}>
                    {canEdit ? inp(item.supervisor,'supervisor',item.id,'text','Supervisor name')
                    : <span style={{ fontSize:13, color:T.text }}>{item.supervisor||'—'}</span>}
                  </td>
                  <td style={{ padding:'8px 10px', width:140 }}>
                    {canEdit ? inp(item.dateFrom,'dateFrom',item.id,'date')
                    : <span style={{ fontSize:12, color:T.textMuted }}>{fmt(item.dateFrom)}</span>}
                  </td>
                  <td style={{ padding:'8px 10px', width:140 }}>
                    {canEdit ? inp(item.dateTo,'dateTo',item.id,'date')
                    : <span style={{ fontSize:12, color:T.textMuted }}>{fmt(item.dateTo)}</span>}
                  </td>
                  <td style={{ padding:'8px 10px', width:140 }}>
                    {status ? (
                      <span style={{ fontSize:11, fontWeight:600, color:status.color, background:status.bg, border:`1px solid ${status.border}`, padding:'3px 10px', borderRadius:20, whiteSpace:'nowrap' as const }}>
                        {status.label}
                      </span>
                    ) : <span style={{ fontSize:12, color:T.textDim }}>—</span>}
                  </td>
                  <td style={{ padding:'8px 10px', width:36 }}>
                    {canEdit && (
                      <button onClick={()=>removeItem(item.id)}
                        style={{ background:'none', border:'none', cursor:'pointer', color:T.danger, fontSize:16, padding:2 }}>🗑</button>
                    )}
                  </td>
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
        {canEdit && items.length > 0 && (
          <button onClick={saveAllPTW} disabled={!!saving}
            style={{ background:T.primary, border:'none', borderRadius:8, padding:'8px 18px', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700, opacity:saving?0.7:1 }}>
            {saving ? 'Saving…' : '💾 Save PTW Records'}
          </button>
        )}
      </div>

      {!canEdit && items.length === 0 && (
        <div style={{ padding:'10px 14px', borderRadius:8, background:'#FEF2F2', border:'1px solid #FECACA' }}>
          <span style={{ fontSize:12, fontWeight:600, color:T.danger }}>⚠️ No PTW issued — Required before vendor commences work</span>
        </div>
      )}
    </div>
  );
}
// ── SRN Section Component ─────────────────────────────────────────────────────
function SRNSection({ projectId, role, onAllApproved }: { projectId:string; role:string; onAllApproved:(v:boolean)=>void }) {
  const { getByProject, updateItem } = useMaterial();
  const { profile } = useAuth();
  const { logActivity: logSRN } = useActivity();
  const [items,   setItems]   = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving,  setSaving]  = React.useState<string|null>(null);
  const [toast,   setToast]   = React.useState<any>(null);

  React.useEffect(() => {
    getByProject(projectId).then(data => { setItems(data); setLoading(false); });
  }, [projectId, getByProject]);

  React.useEffect(() => {
    const allApproved = items.length > 0 && items.every(i => i.utilisedStatus === 'pm_approved');
    onAllApproved(allApproved);
  }, [items, onAllApproved]);

  const updateLocal = (id: string, updates: any) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));

  const submitUtilised = async (item: any) => {
    if (item.utilisedQty === null || item.utilisedQty === undefined) return;
    setSaving(item.id);
    try {
      await updateItem(item.id, { utilisedQty: item.utilisedQty, utilisedStatus: 'submitted', utilisedRemarks: item.utilisedRemarks||'' });
      updateLocal(item.id, { utilisedStatus: 'submitted' });
      logSRN(projectId, `Material ${item.code} utilisation submitted (${item.utilisedQty} ${item.uom})`, profile?.full_name||'', profile?.role||'').catch(()=>{});
      setToast({ msg:'✅ Utilisation submitted for PM approval', type:'success' });
    } catch(err:any) { setToast({ msg:'❌ ' + err.message, type:'error' }); }
    finally { setSaving(null); }
  };

  const pmApprove = async (item: any) => {
    setSaving(item.id);
    try {
      const bal = (item.issuedQty||0) - (item.utilisedQty||0);
      await updateItem(item.id, { utilisedStatus:'pm_approved', pmApprovedQty: item.utilisedQty||0, returnQty: bal, srnQty: bal });
      updateLocal(item.id, { utilisedStatus:'pm_approved', pmApprovedQty: item.utilisedQty||0, returnQty: bal, srnQty: bal });
      logSRN(projectId, `Material ${item.code} PM approved (${item.utilisedQty} ${item.uom})`, profile?.full_name||'', profile?.role||'').catch(()=>{});
      setToast({ msg:'✅ Approved', type:'success' });
    } catch(err:any) { setToast({ msg:'❌ ' + err.message, type:'error' }); }
    finally { setSaving(null); }
  };

  const pmReject = async (item: any) => {
    setSaving(item.id);
    try {
      await updateItem(item.id, { utilisedStatus:'pm_rejected' });
      updateLocal(item.id, { utilisedStatus:'pm_rejected' });
      setToast({ msg:'Returned for revision', type:'info' });
    } catch(err:any) { setToast({ msg:'❌ ' + err.message, type:'error' }); }
    finally { setSaving(null); }
  };

  const STATUS_BADGE: Record<string,{color:string;bg:string;label:string}> = {
    pending:     { color:'#6B7280', bg:'#F9FAFB', label:'Pending'   },
    submitted:   { color:'#2563EB', bg:'#EFF6FF', label:'Submitted' },
    pm_approved: { color:'#0D9488', bg:'#F0FDFA', label:'Approved'  },
    pm_rejected: { color:'#DC2626', bg:'#FEF2F2', label:'Rejected'  },
  };

  const isPM    = ['project_manager','super_admin','region_manager'].includes(role);
  const isVendor = role === 'vendor';

  const thS: React.CSSProperties = { padding:'9px 12px', fontSize:10, fontWeight:700, textTransform:'uppercase',
    color:T.primary, background:T.primaryLight, textAlign:'left' as const, borderBottom:`2px solid ${T.primaryMid}`, whiteSpace:'nowrap' as const };
  const tdS: React.CSSProperties = { padding:'10px 12px', fontSize:12, borderBottom:`1px solid ${T.border}`, verticalAlign:'middle' as const };

  if (loading) return <div style={{ color:T.textMuted, fontSize:13 }}>Loading materials...</div>;
  if (items.length === 0) return <div style={{ textAlign:'center' as const, padding:'24px 0', color:T.textDim, fontSize:13 }}>No material items for this project</div>;

  return (
    <div>
      <div style={{ overflowX:'auto' as const }}>
        <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
          <thead>
            <tr>
              {['#','Code','Description','UOM','Issued','Utilised','Status','PM Approved','Balance','Actions'].map((h,i)=>(
                <th key={i} style={{ ...thS, textAlign:i>=4?'right' as const:'left' as const }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const badge = STATUS_BADGE[item.utilisedStatus] || STATUS_BADGE.pending;
              const balance = (item.issuedQty||0) - (item.pmApprovedQty||0);
              const isSaving = saving === item.id;
              return (
                <tr key={item.id} style={{ background:idx%2===0?'#fff':T.bg }}>
                  <td style={{ ...tdS, color:T.textMuted, width:32 }}>{idx+1}</td>
                  <td style={{ ...tdS, fontWeight:600, color:T.primary, whiteSpace:'nowrap' as const }}>{item.code}</td>
                  <td style={{ ...tdS }}>{item.description}</td>
                  <td style={{ ...tdS, color:T.textMuted }}>{item.uom}</td>
                  <td style={{ ...tdS, textAlign:'right' as const, fontWeight:600 }}>{item.issuedQty}</td>
                  <td style={{ ...tdS, textAlign:'right' as const }}>
                    {isVendor && item.utilisedStatus === 'pending' ? (
                      <input type="number" value={item.utilisedQty??''} min={0} max={item.issuedQty}
                        onChange={e=>updateLocal(item.id,{utilisedQty:Number(e.target.value)})}
                        style={{ width:64, border:`1px solid ${T.border}`, borderRadius:6, padding:'4px 6px',
                          fontSize:12, textAlign:'right' as const, outline:'none' }} />
                    ) : <span style={{ fontWeight:600 }}>{item.utilisedQty??'—'}</span>}
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
                  <td style={{ ...tdS, whiteSpace:'nowrap' as const }}>
                    {isVendor && item.utilisedStatus==='pending' && (
                      <button onClick={()=>submitUtilised(item)} disabled={isSaving||item.utilisedQty===null}
                        style={{ background:T.primary, color:'#fff', border:'none', borderRadius:6,
                          padding:'4px 10px', fontSize:11, cursor:'pointer', fontWeight:600,
                          opacity:isSaving||item.utilisedQty===null?0.5:1 }}>
                        {isSaving?'…':'Submit'}
                      </button>
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
                    {item.utilisedStatus==='pm_approved' && (
                      <span style={{ fontSize:11, color:T.success, fontWeight:600 }}>✓ Complete</span>
                    )}
                    {item.utilisedStatus==='pm_rejected' && isVendor && (
                      <button onClick={()=>updateLocal(item.id,{utilisedStatus:'pending'})}
                        style={{ background:T.warning, color:'#fff', border:'none', borderRadius:6,
                          padding:'4px 10px', fontSize:11, cursor:'pointer' }}>
                        Revise
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

function ExpensesSection({ projectId, canAdd }: { projectId:string; canAdd:boolean }) {
  const { getByProject, addExpense, deleteExpense, loading } = useExpenses();
  const { profile } = useAuth();
  const { logActivity: logExpenseActivity } = useActivity();
  const items = getByProject(projectId);
  const [adding,  setAdding]  = React.useState(false);
  const [saving,  setSaving]  = React.useState(false);
  const [toast,   setToast]   = React.useState<any>(null);
  const [newRow,  setNewRow]  = React.useState({
    txnRef:'', expenseDate:'', site:'', expenseType:'Advance', amount:'', paymentMode:'', remarks:'', bankAccount:'', upiId:''
  });

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

  const saveNew = async () => {
    if (!newRow.expenseDate || !newRow.amount) return;
    setSaving(true);
    try {
      await addExpense({
        txnRef: newRow.txnRef, expenseDate: newRow.expenseDate, site: newRow.site, bankAccount: (newRow as any).bankAccount || '', upiId: (newRow as any).upiId || '',
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
                {['#','Date','Site','Expense Type','Amount (₹)','Status',''].map((h,i)=>(
                  <th key={i} style={{ ...thS, textAlign:i===5?'right' as const:'left' as const }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} style={{ background:idx%2===0?'#fff':T.bg }}>
                  <td style={{ ...tdS, color:T.textMuted, width:32 }}>{idx+1}</td>

                  <td style={{ ...tdS, color:T.textMuted, whiteSpace:'nowrap' as const }}>{fmtD(item.expenseDate)}</td>
                  <td style={tdS}>{item.site||'—'}</td>
                  <td style={tdS}>
                    <span style={{ fontSize:11, fontWeight:600, color:TYPE_COLORS[item.expenseType]||T.textMuted,
                      background:`${TYPE_COLORS[item.expenseType]||T.textMuted}18`, padding:'2px 8px', borderRadius:20, whiteSpace:'nowrap' as const }}>
                      {item.expenseType}
                    </span>
                  </td>
                  <td style={{ ...tdS, textAlign:'right' as const, fontWeight:700, color:T.primary }}>{fmt(item.amount)}</td>
                  <td style={tdS}><span style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20, background:item.status==='paid'?'#D1FAE5':'#FEF3C7', color:item.status==='paid'?'#059669':'#D97706' }}>{item.status==='paid'?'Paid':'Pending'}</span></td>
                  <td style={{ ...tdS, width:36 }}>
                    {canAdd && (
                      <button onClick={()=>deleteExpense(item.id)}
                        style={{ background:'none', border:'none', cursor:'pointer', color:T.danger, fontSize:15 }}>🗑</button>
                    )}
                  </td>
                </tr>
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
               ['Amount (₹) *','amount','number',''],['Site','site','text',''],
               ['Remarks','remarks','text',''],
               ['Bank Account No','bankAccount','text','e.g. 1234567890'],
               ['UPI ID','upiId','text','e.g. name@upi']] as [string,string,string,string][]).map(([l,f,t,ph])=>(
              <div key={f}>
                <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>{l}</label>
                <input type={t} value={(newRow as any)[f]} placeholder={ph}
                  onChange={e=>setNewRow(p=>({...p,[f]:e.target.value}))} style={inpS} />
              </div>
            ))}
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>Expense Type</label>
              <select value={newRow.expenseType} onChange={e=>setNewRow(p=>({...p,expenseType:e.target.value}))} style={{ ...inpS, cursor:'pointer' }}>
                {['Advance','Material Purchase','Labour Charge','Transport','Equipment Rental','Miscellaneous'].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={saveNew} disabled={saving||!newRow.expenseDate||!newRow.amount}
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

function InvoiceSection({ projectId, canAdd, projectPoNo='' }: { projectId:string; canAdd:boolean; projectPoNo?:string }) {
  const { getByProject, addInvoice, deleteInvoice, loading } = useInvoices();
  const { profile } = useAuth();
  const { logActivity } = useActivity();
  const items = getByProject(projectId);
  const [adding,  setAdding]  = React.useState(false);
  const [saving,  setSaving]  = React.useState(false);
  const [toast,   setToast]   = React.useState<any>(null);
  const [newRow,  setNewRow]  = React.useState({
    invoiceNo:'', invoiceDate:'', workBoqRef:'', invoiceAmount:'',
    gst:'', dueDate:'', invoiceStatus:'Draft', paymentStatus:'Pending', poNo:projectPoNo
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
    const amt = Number(newRow.invoiceAmount), gst = Number(newRow.gst);
    setSaving(true);
    try {
      await addInvoice({
        invoiceNo: newRow.invoiceNo, invoiceDate: newRow.invoiceDate,
        workBoqRef: newRow.workBoqRef, invoiceAmount: amt, gst, totalAmount: amt + gst,
        invoiceStatus: newRow.invoiceStatus, paymentStatus: newRow.paymentStatus,
        dueDate: newRow.dueDate, poNo: newRow.poNo || projectPoNo,
        projectId, createdBy: profile?.full_name || '',
      });
      setNewRow({ invoiceNo:'', invoiceDate:'', workBoqRef:'', invoiceAmount:'',
        gst:'', dueDate:'', invoiceStatus:'Draft', paymentStatus:'Pending', poNo:projectPoNo });
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
                {['#','Invoice No','Invoice Date','Work/BOQ Ref','Amount (₹)','GST (₹)','Total (₹)','Inv. Status','Pay Status','Due Date',''].map((h,i)=>(
                  <th key={i} style={{ ...thS, textAlign:i>=4&&i<=6?'right' as const:'left' as const }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} style={{ background:idx%2===0?'#fff':T.bg }}>
                  <td style={{ ...tdS, color:T.textMuted, width:32 }}>{idx+1}</td>
                  <td style={tdS}>
                    <div style={{ fontWeight:700, color:T.primary }}>{item.invoiceNo}</div>
                    {item.poNo && <div style={{ fontSize:10, color:T.textMuted }}>{item.poNo}</div>}
                  </td>
                  <td style={{ ...tdS, color:T.textMuted, whiteSpace:'nowrap' as const }}>{fmtD(item.invoiceDate)}</td>
                  <td style={tdS}>{item.workBoqRef || '—'}</td>
                  <td style={{ ...tdS, textAlign:'right' as const, fontWeight:600 }}>{fmt(item.invoiceAmount)}</td>
                  <td style={{ ...tdS, textAlign:'right' as const, color:T.textMuted }}>{fmt(item.gst)}</td>
                  <td style={{ ...tdS, textAlign:'right' as const, fontWeight:700, color:T.primary }}>{fmt(item.totalAmount)}</td>
                  <td style={tdS}><Pill label={item.invoiceStatus} cfg={INV_COLORS[item.invoiceStatus]||INV_COLORS.Draft} /></td>
                  <td style={tdS}><Pill label={item.paymentStatus} cfg={PAY_COLORS[item.paymentStatus]||PAY_COLORS.Pending} /></td>
                  <td style={{ ...tdS, color:T.textMuted, whiteSpace:'nowrap' as const }}>{fmtD(item.dueDate)}</td>
                  <td style={{ ...tdS, width:36 }}>
                    {canAdd && (
                      <button onClick={() => deleteInvoice(item.id)}
                        style={{ background:'none', border:'none', cursor:'pointer', color:T.danger, fontSize:15 }}>🗑</button>
                    )}
                  </td>
                </tr>
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
               ['Work/BOQ Ref','workBoqRef','text','BOQ-XXX-001'],['Invoice Date *','invoiceDate','date',''],
               ['Due Date','dueDate','date',''],['Amount (₹) *','invoiceAmount','number',''],
               ['GST (₹)','gst','number','']] as [string,string,string,string][]).map(([label,field,type,ph])=>(
              <div key={field}>
                <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>{label}</label>
                <input type={type} value={(newRow as any)[field]} placeholder={ph}
                  onChange={e=>setNewRow(p=>({...p,[field]:e.target.value}))} style={inpS} />
              </div>
            ))}
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
          </div>
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

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:14 }}>
        {canAdd && !adding && (
          <button onClick={()=>setAdding(true)}
            style={{ background:'#fff', border:`1.5px solid ${T.primary}`, borderRadius:8,
              padding:'8px 18px', color:T.primary, cursor:'pointer', fontSize:13, fontWeight:700 }}>
            + Add Invoice
          </button>
        )}
        {items.length > 0 && (
          <div style={{ marginLeft:'auto', fontSize:13, fontWeight:700, color:T.primary,
            background:T.primaryLight, padding:'8px 18px', borderRadius:8 }}>
            Grand Total: {fmt(totalTot)}
          </div>
        )}
      </div>
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
  const canUploadDocs     = !loading && can('sec_work_documents',   'create');
  const showSTNSRN        = !loading && can('sec_stn_srn',          'read');
  const showBillingReview = !loading && can('sec_billing_review',   'read');
  const showActivityLog   = !loading && can('sec_activity_log',     'read');
  const showInvoice       = !loading && can('sec_invoice',            'read');
  const canAddInvoice     = !loading && can('sec_invoice',            'create');
  const showExpenses      = !loading && can('sec_expenses',         'read');
  const canAddExpenses    = !loading && can('sec_expenses',         'create');
  const canEditVendor     = !loading && can('sec_vendor_assignment', 'edit');
  const canEditPTW        = !loading && can('sec_ptw',              'edit');

  const showPTW           = !loading && can('sec_ptw',              'read');

  const { getProject, updateProject: ctxUpdateProject } = useProjects();
  const { getByProject: getProjectDocs, addDoc, deleteDoc: deleteWorkDoc } = useWorkDocs();
  const { getByProject: getActivityLog, logActivity } = useActivity();
  const dbProject = id ? getProject(id as string) : undefined;
  const seedFallback = (Array.isArray(SEED_PROJECTS)?SEED_PROJECTS:[]).find((p:any)=>p.id===id);
  const [projects, setProjects] = useState<Record<string,any>>({});
  React.useEffect(() => {
    const src = dbProject || seedFallback;
    if (src && id) setProjects(prev => ({ ...prev, [id as string]: { ...seedFallback, ...prev[id as string], ...src } }));
  }, [dbProject?.id, id]);
  const [allTransactions, setAllTransactions] = React.useState(PAYMENT_TRANSACTIONS);
  const [srnAllApproved, setSrnAllApproved] = React.useState(false);
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
  React.useEffect(() => {
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


  // Billing checklist
  const [checklist, setChecklist] = useState({ stn:false, srn:false, ptw:false, materials:false });
  const [billingNotes, setBillingNotes] = useState('');

  // PM review
  const [reviewNotes,  setReviewNotes]  = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showReject,   setShowReject]   = useState(false);

  const [activityEntries, setActivityEntries] = React.useState<any[]>([]);
  React.useEffect(() => {
    if (id) getActivityLog(id as string).then(setActivityEntries);
  }, [id, getActivityLog]);

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
    if (!checklist.stn || !checklist.srn || !checklist.ptw || !checklist.materials) {
      setToast({ msg:'All 4 checklist items must be completed before releasing payment.', type:'error' });
      return;
    }
    updateStatus('completed', '✅ Billing complete! Project marked as Completed.');
  };

  const sectionTitle = (icon:string, title:string, sectionKey:string, canEditSection=true, locked?:React.ReactNode) => (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, paddingBottom:10, borderBottom:`2px solid ${T.primaryMid}` }}>
      <div style={{ fontSize:15, fontWeight:700, color:T.primary }}>{icon} {title}</div>
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
                  <CreatableDropdown
                    value={p.projectStatus || ''}
                    onChange={v => ctxUpdateProject(p.id, { projectStatus: v } as any, profile?.full_name ?? undefined)}
                    options={projectStatusOpts}
                    placeholder="— Set Project Status —"
                    onCreateNew={v=>addLookupOption('project_status', v)} />
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
            {[
              { label:'PO Value',      key:'poValue',      color:T.text    },
              { label:'Billed Amount', key:'billedAmount', color:T.info    },
              { label:'Paid Amount',   key:null,           color:T.success, computed: p.paidAmount||0 },
              { label:'Projection',    key:null,           color:T.warning, computed: (p.billedAmount||0) - (p.paidAmount||0) },
            ].map((r,i)=>(
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:`1px solid ${T.border}` }}>
                <span style={{ fontSize:13, color:T.textMuted }}>{r.label}</span>
                {editing('financial') && canEditFin && r.key ? (
                  <input type="number" value={(form as any)[r.key]||0} onChange={e=>setForm((f:any)=>({...f,[r.key!]:Number(e.target.value)}))}
                    style={{ ...inputStyle(), width:160, textAlign:'right' as const }} />
                ) : (
                  <span style={{ fontSize:14, fontWeight:700, color:r.color }}>{fmt(r.computed !== undefined ? r.computed : (p as any)[r.key!])}</span>
                )}
              </div>
            ))}
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
                  onCreateNew={v => setForm((f:any) => ({ ...f, vendor:v, vendorContact:'', vendorPhone:'', vendorEmail:'' }))}
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
          {sectionTitle('📋','STN', 'poitems', canEdit)}
          <POItemsSection projectId={p.id} editing={editing('poitems')} canAdd={canEdit} />
        </div>


        
        {/* ── PTW — Permit to Work ── */}
        {showPTW && <div style={{ ...card, marginBottom:16 }}>
          {sectionTitle('🔑','PTW — Permit to Work', 'ptw', canEditPTW)}
          <PTWSectionCard projectId={p.id} vendorContact={p.vendorContact||''} canEdit={editing('ptw') && canEditPTW} canAdd={canEditPTW} />
        </div>}

        {/* ── SRN — Material Utilisation & Return ── */}
        <div style={{ ...card, marginBottom:16 }}>
          {sectionTitle('📦','SRN — Material Utilisation & Return', 'srn', ['super_admin','project_manager','region_manager'].includes(role))}
          <SRNSection projectId={p.id} role={role} onAllApproved={setSrnAllApproved} />
        </div>

                {/* ── 3. Work Documents ── */}
        {showDocs && <div style={{ ...card, marginBottom:16 }}>
          {sectionTitle('📂','Work Documents', 'docs', false)}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
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

            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12, marginBottom:16 }}>
              {[
                { key:'stn',       label:'STN Done',                desc:'Store Transfer Note completed with Indus' },
                { key:'srn',       label:'SRN Done',                desc:'Store Return Note completed with Indus'   },
                { key:'ptw',       label:'PTW Done',                desc:'Permit to Work completed'                 },
                { key:'materials', label:'Materials Returned to Indus', desc:'All materials from STN returned via SRN — MANDATORY', important:true },
              ].map(item=>{
                const checked = checklist[item.key as keyof typeof checklist];
                return (
                  <div key={item.key} onClick={()=>isBilling&&setChecklist(c=>({...c,[item.key]:!c[item.key as keyof typeof c]}))}
                    style={{ padding:14, borderRadius:10, border:`2px solid ${checked?item.important?T.primary:T.success:item.important?'#EF4444':T.border}`, background:checked?item.important?T.primaryLight:T.successBg:'#fff', cursor:isBilling?'pointer':'default', transition:'all 0.15s' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:22, height:22, borderRadius:6, border:`2px solid ${checked?item.important?T.primary:T.success:T.border}`, background:checked?item.important?T.primary:T.success:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        {checked && <span style={{ color:'#fff', fontSize:13, fontWeight:700 }}>✓</span>}
                      </div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:T.text }}>
                          {item.label}
                          {item.important && <span style={{ fontSize:10, color:T.danger, marginLeft:6 }}>MANDATORY</span>}
                        </div>
                        <div style={{ fontSize:11, color:T.textMuted }}>{item.desc}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:6 }}>Invoice Reference / Billing Notes</label>
              <textarea value={billingNotes} onChange={e=>setBillingNotes(e.target.value)} placeholder="Enter invoice reference number or billing notes…" rows={2}
                style={{ ...inputStyle(), width:'100%', resize:'vertical', boxSizing:'border-box' as const }} />
            </div>

            {isBilling && ['pm_approved','billing_review'].includes(p.status) && (
              <button onClick={handleBillingDone}
                style={{ ...btnPrimary, background:Object.values(checklist).every(Boolean)?T.success:T.border, cursor:Object.values(checklist).every(Boolean)?'pointer':'not-allowed' }}>
                ✅ Mark Billing Done — Release Payment
              </button>
            )}

            {p.status === 'completed' && (
              <div style={{ background:T.successBg, border:`1px solid #BBF7D0`, borderRadius:8, padding:'10px 14px', fontSize:13, color:T.success, fontWeight:600 }}>
                ✅ Billing complete. Payment released.
              </div>
            )}
          </div>
        )}


        {/* ── Expenses ── */}
        {showExpenses && <div style={{ ...card, marginBottom:16 }}>
          {sectionTitle('💸','Expenses', 'expenses', canAddExpenses)}
          <ExpensesSection projectId={p.id} canAdd={canAddExpenses} />
        </div>}

        {/* ── Invoice ── */}
        {showInvoice && <div style={{ ...card, marginBottom:16 }}>
          {sectionTitle('🧾','Invoice', 'invoice', false)}
          <InvoiceSection projectId={p.id} canAdd={canAddInvoice} projectPoNo={p.poNo||''} />
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
