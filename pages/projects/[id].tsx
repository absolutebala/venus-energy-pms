// v-fix-braces
import React, { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import CreatableSelect from '@/components/CreatableSelect';
import Toast from '@/components/Toast';
import { useAuth } from '@/context/AuthContext';
import { useUpload } from '@/lib/useUpload';
import { T, card, badge, btnPrimary, btnSecondary, inputStyle } from '@/lib/theme';
import { STN_SRN_DATA } from '@/lib/stnSrnData';
import { getPaidAmount, getProjectTransactions, PAYMENT_TRANSACTIONS, PaymentTransaction } from '@/lib/expensesData';

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


const VENDOR_LIST = [
  { name:'ABC Telecom Services',     contact:'Rajesh Kumar',  phone:'+91 98765 43210', email:'rajesh@abctelecom.com'  },
  { name:'XYZ Infra Solutions',      contact:'Priya Sharma',  phone:'+91 98765 43211', email:'priya@xyzinfra.com'     },
  { name:'TowerTech Pvt Ltd',        contact:'Arun Singh',    phone:'+91 98765 43212', email:'arun@towertech.com'     },
  { name:'NetConnect Services',      contact:'Deepa Nair',    phone:'+91 98765 43213', email:'deepa@netconnect.com'   },
  { name:'PowerSys India',           contact:'Sunita Reddy',  phone:'+91 98765 43215', email:'sunita@powersys.com'    },
  { name:'BuildRight Constructions', contact:'Vikram Patel',  phone:'+91 98765 43214', email:'vikram@buildright.com'  },

];


const PO_ITEMS_DB: Record<string,any[]> = {
  'VE-2025-001': [
    { id:1, description:'Tower Steel Sections (30m)',   hsn:'7308', uom:'Set', quantity:4,   rate:125000, gst:18, amount:500000  },
    { id:2, description:'Foundation Concrete M30',      hsn:'3824', uom:'Cum', quantity:150, rate:8500,   gst:12, amount:1275000 },
    { id:3, description:'High-tensile Anchor Bolts M36',hsn:'7318', uom:'Nos', quantity:120, rate:450,    gst:18, amount:54000   },
  ],
  'VE-2025-002': [
    { id:1, description:'Antenna Mounting Brackets',    hsn:'7326', uom:'Set', quantity:8,   rate:12500,  gst:18, amount:100000  },
    { id:2, description:'Coaxial Cable 50m',            hsn:'8544', uom:'Nos', quantity:20,  rate:4500,   gst:18, amount:90000   },
  ],
  'VE-2025-003': [
    { id:1, description:'RRU Units 4T',                 hsn:'8525', uom:'Nos', quantity:6,   rate:85000,  gst:18, amount:510000  },
    { id:2, description:'CPRI Fiber Cable 5m',          hsn:'8544', uom:'Nos', quantity:24,  rate:2500,   gst:18, amount:60000   },
  ],
};
const SRN_DATA_DB: Record<string, Record<number,{utilisedQty:number|null;returned:boolean;approved:boolean}>> = {
  'VE-2025-001': { 1:{utilisedQty:4,returned:true,approved:true}, 2:{utilisedQty:140,returned:false,approved:false}, 3:{utilisedQty:96,returned:true,approved:false} },
  'VE-2025-002': { 1:{utilisedQty:6,returned:false,approved:false}, 2:{utilisedQty:14,returned:true,approved:true} },
  'VE-2025-003': { 1:{utilisedQty:6,returned:true,approved:true}, 2:{utilisedQty:22,returned:true,approved:true} },
};

const UOM_OPTIONS = ['Set','Nos','MT','RMT','Cum','Bag','Box','Lot','KG','Mtr'
];
const GST_OPTIONS = ['0','5','12','18','28'
];

const VENDORS = ['ABC Telecom Services','XYZ Infra Solutions','TowerTech Pvt Ltd','NetConnect Services','PowerSys India','BuildRight Constructions'
];
const REGIONS  = ['Tamil Nadu','Karnataka','Telangana','Maharashtra','Delhi','Kerala','West Bengal'
];
const TYPES    = ['Tower Erection','Tower Maintenance','Component Replacement','Fiber Installation','Civil Works','Power Works'
];

const DOC_TYPES = [
  { key:'safety_photos',   label:'Safety Photos',   icon:'📷', accept:'image/*'           },
  { key:'site_photos',     label:'Site Photos',     icon:'🏗',  accept:'image/*'           },
  { key:'jmr_document',   label:'JMR Document',    icon:'📄', accept:'.pdf,.doc,.docx'    },
  { key:'ac_certificate', label:'AC Certificate',  icon:'🏅', accept:'.pdf,.doc,.docx'    },
  { key:'noc_document',   label:'NOC Document',    icon:'📋', accept:'.pdf,.doc,.docx'    },
  { key:'drawing_document',label:'Drawing Document',icon:'📐', accept:'.pdf,.dwg,.png,.jpg'},
  { key:'ptw_document',   label:'PTW Document',     icon:'🔑', accept:'.pdf,.doc,.docx'    },


];

const MOCK_DOCS: Record<string, { name:string; size:string; url:string; isImage:boolean }[]> = {
  safety_photos:    [{ name:'safety_site_01.jpg', size:'1.2 MB', url:'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400', isImage:true },{ name:'safety_ppe.jpg', size:'980 KB', url:'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400', isImage:true }],
  site_photos:      [{ name:'site_progress.jpg', size:'2.1 MB', url:'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=400', isImage:true }],
  jmr_document:     [{ name:'JMR_VE2025001.pdf', size:'456 KB', url:'', isImage:false }],
  ac_certificate:   [],
  noc_document:     [],
  drawing_document: [{ name:'AsBuilt_Drawing_v2.pdf', size:'1.8 MB', url:'', isImage:false }],
};

const STATUS_FLOW = ['pending','in_progress','submitted','under_review','pm_approved','billing_review','completed','delayed'
];
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

const fmt = (v:number) => `₹${v.toLocaleString('en-IN')}`;


// ── PO Items Component ───────────────────────────────────────────────────────
function POItemsSection({ projectId, editing, canAdd=true }: { projectId: string; editing: boolean; canAdd?: boolean }) {
  const [items, setItems] = React.useState<any[]>(() => PO_ITEMS_DB[projectId] || []);
  const nextId = () => Math.max(0, ...items.map((i:any)=>i.id)) + 1;

  const addItem = () => setItems(prev => [...prev, { id:nextId(), description:'', hsn:'', uom:'Nos', quantity:0, rate:0, gst:18, amount:0 }]);
  const removeItem = (id:number) => setItems(prev => prev.filter((i:any)=>i.id!==id));
  const updateItem = (id:number, field:string, val:any) => setItems(prev => prev.map((item:any) => {
    if (item.id !== id) return item;
    const updated = { ...item, [field]: val };
    updated.amount = Number(updated.quantity) * Number(updated.rate);
    return updated;
  }));

  const totalAmount = items.reduce((a:number,i:any)=>a+Number(i.amount),0);
  const totalGST    = items.reduce((a:number,i:any)=>a+(Number(i.amount)*Number(i.gst)/100),0);

  const inpStyle: React.CSSProperties = { border:`1px solid ${T.border}`, borderRadius:6, padding:'5px 7px', fontSize:12, width:'100%', boxSizing:'border-box' as const, outline:'none', background:'#fff', color:T.text };
  const selStyle: React.CSSProperties = { ...inpStyle, cursor:'pointer' };

  return (
    <div>
      <div style={{ overflowX:'auto' as const }}>
        <table style={{ width:'100%', borderCollapse:'collapse' as const, minWidth:800 }}>
          <thead>
            <tr style={{ background:T.bg }}>
              {['#','Item Description *','HSN / SAC','UOM *','Quantity *','Rate (₹) *','GST (%)','Amount (₹)',''].map((h,i)=>(
                <th key={i} style={{ padding:'9px 10px', fontSize:10, fontWeight:700, textTransform:'uppercase', color:T.textMuted, textAlign:i>=4?'right' as const:'left' as const, borderBottom:`2px solid ${T.border}`, whiteSpace:'nowrap' as const }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={9} style={{ padding:'24px', textAlign:'center' as const, color:T.textDim, fontSize:13 }}>No PO items yet. Click "+ Add Item" to begin.</td></tr>
            )}
            {items.map((item:any, idx:number) => (
              <tr key={item.id} style={{ borderBottom:`1px solid ${T.border}` }}>
                <td style={{ padding:'8px 10px', color:T.textMuted, fontSize:12, width:36 }}>{idx+1}</td>
                <td style={{ padding:'8px 10px', minWidth:200 }}>
                  {editing ? <input value={item.description} onChange={e=>updateItem(item.id,'description',e.target.value)} style={inpStyle} placeholder="Item description" />
                  : <span style={{ fontSize:13, color:T.text }}>{item.description||'—'}</span>}
                </td>
                <td style={{ padding:'8px 10px', width:90 }}>
                  {editing ? <input value={item.hsn} onChange={e=>updateItem(item.id,'hsn',e.target.value)} style={inpStyle} placeholder="HSN" />
                  : <span style={{ fontSize:12, color:T.textMuted }}>{item.hsn||'—'}</span>}
                </td>
                <td style={{ padding:'8px 10px', width:90 }}>
                  {editing ? (
                    <select value={item.uom} onChange={e=>updateItem(item.id,'uom',e.target.value)} style={selStyle}>
                      {UOM_OPTIONS.map(u=><option key={u}>{u}</option>)}
                    </select>
                  ) : <span style={{ fontSize:12, color:T.textMuted }}>{item.uom}</span>}
                </td>
                <td style={{ padding:'8px 10px', width:100, textAlign:'right' as const }}>
                  {editing ? <input type="number" value={item.quantity} onChange={e=>updateItem(item.id,'quantity',e.target.value)} style={{ ...inpStyle, textAlign:'right' as const }} />
                  : <span style={{ fontSize:13, fontWeight:600, color:T.text }}>{Number(item.quantity).toLocaleString('en-IN')}</span>}
                </td>
                <td style={{ padding:'8px 10px', width:120, textAlign:'right' as const }}>
                  {editing ? <input type="number" value={item.rate} onChange={e=>updateItem(item.id,'rate',e.target.value)} style={{ ...inpStyle, textAlign:'right' as const }} />
                  : <span style={{ fontSize:13, fontWeight:600, color:T.text }}>₹{Number(item.rate).toLocaleString('en-IN')}</span>}
                </td>
                <td style={{ padding:'8px 10px', width:90, textAlign:'right' as const }}>
                  {editing ? (
                    <select value={item.gst} onChange={e=>updateItem(item.id,'gst',e.target.value)} style={{ ...selStyle, textAlign:'right' as const }}>
                      {GST_OPTIONS.map(g=><option key={g} value={g}>{g}%</option>)}
                    </select>
                  ) : <span style={{ fontSize:12, color:T.textMuted }}>{item.gst}%</span>}
                </td>
                <td style={{ padding:'8px 10px', fontWeight:700, color:T.primary, textAlign:'right' as const, whiteSpace:'nowrap' as const }}>
                  ₹{Number(item.amount).toLocaleString('en-IN')}
                </td>
                <td style={{ padding:'8px 10px', width:36 }}>
                  {editing && <button onClick={()=>removeItem(item.id)} style={{ background:'none', border:'none', cursor:'pointer', color:T.danger, fontSize:16 }}>🗑</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canAdd && <button onClick={addItem}
        style={{ margin:'12px 0 4px', background:'#fff', border:`1.5px solid ${T.primary}`, borderRadius:8, padding:'8px 18px', color:T.primary, cursor:'pointer', fontSize:13, fontWeight:700 }}>
        + Add Item
      </button>}

      {items.length > 0 && (
        <div style={{ display:'flex', justifyContent:'flex-end', gap:20, marginTop:12, padding:'10px 14px', background:T.primaryLight, borderRadius:8, fontSize:13 }}>
          <span style={{ color:T.textMuted }}>Subtotal: <strong style={{ color:T.text }}>₹{totalAmount.toLocaleString('en-IN')}</strong></span>
          <span style={{ color:T.textMuted }}>Total GST: <strong style={{ color:T.text }}>₹{Math.round(totalGST).toLocaleString('en-IN')}</strong></span>
          <span style={{ color:T.primary, fontWeight:700 }}>Grand Total: ₹{Math.round(totalAmount+totalGST).toLocaleString('en-IN')}</span>
        </div>
      )}
    </div>
  );
}


// ── PTW List Component ───────────────────────────────────────────────────────
const PTW_DB: Record<string, any[]> = {
  'VE-2025-001': [
    { id:1, ticketId:'PTW-2025-1001', supervisor:'Rajesh Kumar',  dateFrom:'2025-04-01', dateTo:'2025-06-30' },
    { id:2, ticketId:'PTW-2025-1045', supervisor:'Mohan Lal',     dateFrom:'2025-07-01', dateTo:'2025-09-30' },
  ],
  'VE-2025-002': [
    { id:1, ticketId:'PTW-2025-1002', supervisor:'Vikram Singh',  dateFrom:'2025-03-01', dateTo:'2025-04-30' },
  ],
  'VE-2025-003': [
    { id:1, ticketId:'PTW-2025-1003', supervisor:'Arun Singh',    dateFrom:'2025-04-10', dateTo:'2025-05-20' },
  ],
};

function PTWSectionCard({ projectId, vendorContact, canEdit, canAdd=true }: { projectId:string; vendorContact:string; canEdit:boolean; canAdd?:boolean }) {
  const [items, setItems] = React.useState<any[]>(() => PTW_DB[projectId] || []);
  const nextId = () => Math.max(0, ...items.map((i:any)=>i.id)) + 1;

  const addPTW = () => setItems(prev => [...prev, {
    id: nextId(), ticketId:'', supervisor: vendorContact||'', dateFrom:'', dateTo:''
  }]);

  const removeItem = (id:number) => setItems(prev => prev.filter((i:any)=>i.id!==id));

  const update = (id:number, field:string, val:string) =>
    setItems(prev => prev.map((item:any) => item.id===id ? {...item,[field]:val} : item));

  const getStatus = (from:string, to:string) => {
    if (!from || !to) return null;
    const today = new Date(), f = new Date(from), t = new Date(to);
    if (today < f) return { label:'🕐 Upcoming',  color:'#D97706', bg:'#FFFBEB', border:'#FDE68A' };
    if (today > t) return { label:'⚠️ Expired',   color:T.danger,  bg:'#FEF2F2', border:'#FECACA' };
    return          { label:'✅ Active',            color:T.success, bg:T.successBg, border:'#BBF7D0' };
  };

  const fmt = (d:string) => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';
  const inp = (val:string, field:string, id:number, type='text', ph='') => (
    <input type={type} value={val} placeholder={ph}
      onChange={e=>update(id,field,e.target.value)}
      style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'5px 8px', fontSize:12, width:'100%', boxSizing:'border-box' as const, outline:'none', background:'#fff', color:T.text }} />
  );

  if (items.length === 0 && !canEdit) return (
    <div style={{ textAlign:'center', padding:24, color:T.textDim, fontSize:13 }}>No PTW records yet.</div>
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

      {canAdd && <button onClick={addPTW}
        style={{ background:'#fff', border:`1.5px solid ${T.primary}`, borderRadius:8, padding:'8px 18px', color:T.primary, cursor:'pointer', fontSize:13, fontWeight:700 }}>
        + Add PTW
      </button>}

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
  const poItems = PO_ITEMS_DB[projectId] || [
];
  const srnDefaults = SRN_DATA_DB[projectId] || {};

  const [items, setItems] = React.useState(() =>
    poItems.map((po:any) => ({
      poItemId:    po.id,
      description: po.description,
      hsn:         po.hsn,
      uom:         po.uom,
      poQty:       po.quantity,
      utilisedQty: srnDefaults[po.id]?.utilisedQty ?? null,
      returned:    srnDefaults[po.id]?.returned ?? false,
      approved:    srnDefaults[po.id]?.approved ?? false,
    }))
  );

  const isVendor  = role === 'vendor';
  const canApprove= ['super_admin','project_manager','region_manager'].includes(role);

  const updateItem = (id:number, field:string, val:any) => {
    setItems(prev => {
      const updated = prev.map((item:any) => item.poItemId === id ? { ...item, [field]: val } : item);
      const allApproved = updated.every((i:any) => i.approved);
      onAllApproved(allApproved);
      return updated;
    });
  };

  const allApproved = items.every((i:any) => i.approved);
  const allReturned = items.every((i:any) => i.returned);

  if (poItems.length === 0) return (
    <div style={{ textAlign:'center', padding:30, color:T.textDim, fontSize:13 }}>
      No PO items found. Add items in the PO Items section first.
    </div>
  );

  return (
    <div>
      {/* Status banner */}
      <div style={{ display:'flex', gap:12, marginBottom:14, flexWrap:'wrap' as const }}>
        <span style={{ fontSize:12, fontWeight:600, color:allApproved?T.success:T.warning, background:allApproved?T.successBg:T.warningBg, padding:'4px 12px', borderRadius:20 }}>
          {allApproved?'✅ All Items Approved':'⏳ Pending Approval'}
        </span>
        <span style={{ fontSize:12, fontWeight:600, color:allReturned?T.success:T.textMuted, background:allReturned?T.successBg:T.bg, padding:'4px 12px', borderRadius:20 }}>
          {allReturned?'✅ All Returned':'📦 Returns Pending'}
        </span>
        {allApproved && <span style={{ fontSize:12, color:T.info, fontWeight:600 }}>🔓 Billing Review now unlockable</span>}
      </div>

      <div style={{ overflowX:'auto' as const }}>
        <table style={{ width:'100%', borderCollapse:'collapse' as const, minWidth:760 }}>
          <thead>
            <tr style={{ background:T.bg }}>
              {['#','Item Description','UOM','PO Qty','Utilised','Balance','Returned','Approved'].map((h,i)=>(
                <th key={i} style={{ padding:'9px 10px', fontSize:10, fontWeight:700, textTransform:'uppercase', color:i>=3?['#2563EB','#16A34A','#D97706','#7C3AED','#0D9488'][i-3]:T.textMuted, textAlign:i>=3?'center' as const:'left' as const, borderBottom:`2px solid ${T.border}`, whiteSpace:'nowrap' as const }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item:any, idx:number) => {
              const balance = (item.poQty || 0) - (item.utilisedQty || 0);
              return (
                <tr key={item.poItemId} style={{ borderBottom:`1px solid ${T.border}`, background:item.approved?`${T.success}08`:item.returned?`${T.info}06`:'transparent' }}>
                  <td style={{ padding:'10px', color:T.textMuted, fontSize:12 }}>{idx+1}</td>
                  <td style={{ padding:'10px' }}>
                    <div style={{ fontSize:13, fontWeight:500, color:T.text }}>{item.description}</div>
                    {item.hsn && <div style={{ fontSize:11, color:T.textDim }}>HSN: {item.hsn}</div>}
                  </td>
                  <td style={{ padding:'10px', fontSize:12, color:T.textMuted }}>{item.uom}</td>
                  <td style={{ padding:'10px', textAlign:'center' as const, fontWeight:700, color:T.text }}>{item.poQty}</td>
                  <td style={{ padding:'10px', textAlign:'center' as const }}>
                    {isVendor && !item.approved ? (
                      <input type="number" min="0" max={item.poQty}
                        value={item.utilisedQty ?? ''}
                        onChange={e=>updateItem(item.poItemId,'utilisedQty',e.target.value===''?null:Number(e.target.value))}
                        style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'4px 8px', fontSize:12, width:70, textAlign:'center' as const, outline:'none' }} />
                    ) : (
                      <span style={{ fontSize:13, fontWeight:600, color:item.utilisedQty!==null?T.info:T.textDim }}>
                        {item.utilisedQty ?? '—'}
                      </span>
                    )}
                  </td>
                  <td style={{ padding:'10px', textAlign:'center' as const }}>
                    <span style={{ fontSize:13, fontWeight:700, color:balance>0?T.danger:T.success }}>
                      {item.utilisedQty!==null ? balance : '—'}
                    </span>
                  </td>
                  <td style={{ padding:'10px', textAlign:'center' as const }}>
                    {balance === 0 ? (
                      <span style={{ fontSize:12, color:T.textMuted }}>N/A</span>
                    ) : isVendor ? (
                      <input type="checkbox" checked={item.returned} disabled={item.utilisedQty===null}
                        onChange={e=>updateItem(item.poItemId,'returned',e.target.checked)}
                        style={{ width:18, height:18, cursor:'pointer', accentColor:T.primary }} />
                    ) : (
                      <span style={{ fontSize:16 }}>{item.returned?'✅':'—'}</span>
                    )}
                  </td>
                  <td style={{ padding:'10px', textAlign:'center' as const }}>
                    {canApprove ? (
                      <input type="checkbox" checked={item.approved} disabled={balance > 0 && !item.returned}
                        onChange={e=>updateItem(item.poItemId,'approved',e.target.checked)}
                        style={{ width:18, height:18, cursor:item.returned?'pointer':'not-allowed', accentColor:T.success }} />
                    ) : (
                      <span style={{ fontSize:16 }}>{item.approved?'✅':'—'}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {canApprove && !allApproved && (
        <div style={{ marginTop:12, fontSize:12, color:T.textMuted }}>
          ℹ️ Approve each item only after verifying physical return from vendor. All items must be approved to unlock Billing Review.
        </div>
      )}
    </div>
  );
}


// ── Expenses Section Component ───────────────────────────────────────────────
const EXPENSES_DB: Record<string, any[]> = {
  'VE-2025-001': [
    { id:1, txnRef:'TXN-2025-001', date:'2025-04-05', site:'Andheri Tower Site',    expenseType:'Advance',           amount:50000,  paymentMode:'Bank Transfer' },
    { id:2, txnRef:'TXN-2025-002', date:'2025-04-12', site:'Andheri Tower Site',    expenseType:'Material Purchase', amount:125000, paymentMode:'Cheque'        },
    { id:3, txnRef:'TXN-2025-003', date:'2025-04-20', site:'Andheri Tower Site',    expenseType:'Labour Charge',     amount:35000,  paymentMode:'Cash'          },
    { id:4, txnRef:'TXN-2025-004', date:'2025-05-02', site:'Andheri Tower Site',    expenseType:'Transport',         amount:12500,  paymentMode:'UPI'           },
  ],
  'VE-2025-002': [
    { id:1, txnRef:'TXN-2025-010', date:'2025-03-10', site:'Bandra Roof Site',      expenseType:'Advance',           amount:30000,  paymentMode:'Bank Transfer' },
    { id:2, txnRef:'TXN-2025-011', date:'2025-03-22', site:'Bandra Roof Site',      expenseType:'Equipment Rental',  amount:18000,  paymentMode:'Cheque'        },
  ],
  'VE-2025-003': [
    { id:1, txnRef:'TXN-2025-020', date:'2025-04-15', site:'Kurla Junction Tower',  expenseType:'Material Purchase', amount:85000,  paymentMode:'Bank Transfer' },
    { id:2, txnRef:'TXN-2025-021', date:'2025-04-28', site:'Kurla Junction Tower',  expenseType:'Labour Charge',     amount:42000,  paymentMode:'Cash'          },
    { id:3, txnRef:'TXN-2025-022', date:'2025-05-05', site:'Kurla Junction Tower',  expenseType:'Miscellaneous',     amount:8500,   paymentMode:'UPI'           },
  ],
};
const EXPENSE_TYPES   = ['Advance','Material Purchase','Labour Charge','Transport','Equipment Rental','Miscellaneous'
];
const PAYMENT_MODES   = ['Cash','Bank Transfer','Cheque','UPI','DD'
];

function ExpensesSection({ projectId, canAdd }: { projectId:string; canAdd:boolean }) {
  const [items, setItems] = React.useState<any[]>(() => EXPENSES_DB[projectId] || []);
  const [adding, setAdding] = React.useState(false);
  const [newRow, setNewRow] = React.useState({ txnRef:'', date:'', site:'', expenseType:'Advance', amount:'', paymentMode:'Bank Transfer' });

  const nextId = () => Math.max(0, ...items.map((i:any)=>i.id)) + 1;

  const saveNew = () => {
    if (!newRow.txnRef || !newRow.date || !newRow.amount) return;
    setItems(prev => [...prev, { id:nextId(), ...newRow, amount:Number(newRow.amount) }]);
    setNewRow({ txnRef:'', date:'', site:'', expenseType:'Advance', amount:'', paymentMode:'Bank Transfer' });
    setAdding(false);
  };

  const removeItem = (id:number) => setItems(prev => prev.filter((i:any)=>i.id!==id));

  const totalAmount = items.reduce((a:number,i:any)=>a+Number(i.amount),0);

  const cellStyle: React.CSSProperties = { padding:'10px 12px', fontSize:13, borderBottom:`1px solid ${T.border}`, color:T.text };
  const inpStyle:  React.CSSProperties = { border:`1px solid ${T.border}`, borderRadius:6, padding:'5px 8px', fontSize:12, width:'100%', boxSizing:'border-box' as const, outline:'none', background:'#fff', color:T.text };
  const selStyle:  React.CSSProperties = { ...inpStyle, cursor:'pointer' };

  const TYPE_COLORS: Record<string,string> = {
    'Advance':'#2563EB','Material Purchase':'#7C3AED','Labour Charge':'#D97706',
    'Transport':'#0D9488','Equipment Rental':'#DC2626','Miscellaneous':'#6B7280',
  };

  return (
    <div>
      {items.length === 0 && !adding && (
        <div style={{ textAlign:'center', padding:30, color:T.textDim, fontSize:13 }}>
          No expenses recorded yet.{canAdd && ' Click "+ Add Expense" to begin.'}
        </div>
      )}

      {items.length > 0 && (
        <div style={{ overflowX:'auto' as const }}>
          <table style={{ width:'100%', borderCollapse:'collapse' as const, minWidth:800 }}>
            <thead>
              <tr style={{ background:T.bg }}>
                {['Sr.','Transaction Ref','Date','Site Name','Expense Type','Amount (₹)','Payment Mode',''].map((h,i)=>(
                  <th key={i} style={{ padding:'9px 12px', fontSize:10, fontWeight:700, textTransform:'uppercase', color:T.textMuted, textAlign:i===5?'right' as const:'left' as const, borderBottom:`2px solid ${T.border}`, whiteSpace:'nowrap' as const }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item:any, idx:number) => (
                <tr key={item.id} style={{ borderBottom:`1px solid ${T.border}` }}>
                  <td style={{ ...cellStyle, color:T.textMuted, width:40 }}>{idx+1}</td>
                  <td style={{ ...cellStyle, fontWeight:600 }}>{item.txnRef}</td>
                  <td style={{ ...cellStyle, whiteSpace:'nowrap' as const, color:T.textMuted }}>
                    {new Date(item.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
                  </td>
                  <td style={{ ...cellStyle }}>{item.site||'—'}</td>
                  <td style={{ ...cellStyle }}>
                    <span style={{ fontSize:11, fontWeight:600, color:TYPE_COLORS[item.expenseType]||T.textMuted, background:`${TYPE_COLORS[item.expenseType]||T.textMuted}15`, padding:'2px 10px', borderRadius:20, whiteSpace:'nowrap' as const }}>
                      {item.expenseType}
                    </span>
                  </td>
                  <td style={{ ...cellStyle, fontWeight:700, color:T.primary, textAlign:'right' as const, whiteSpace:'nowrap' as const }}>
                    ₹{Number(item.amount).toLocaleString('en-IN')}
                  </td>
                  <td style={{ ...cellStyle }}>
                    <span style={{ fontSize:11, color:T.textMuted, background:T.bg, border:`1px solid ${T.border}`, padding:'2px 8px', borderRadius:6 }}>
                      {item.paymentMode}
                    </span>
                  </td>
                  <td style={{ ...cellStyle, width:36 }}>
                    {canAdd && (
                      <button onClick={()=>removeItem(item.id)} style={{ background:'none', border:'none', cursor:'pointer', color:T.danger, fontSize:15 }}>🗑</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add new row inline */}
      {adding && (
        <div style={{ background:T.primaryLight, border:`1px solid ${T.primaryMid}`, borderRadius:10, padding:14, marginTop:12 }}>
          <div style={{ fontSize:13, fontWeight:600, color:T.primary, marginBottom:12 }}>New Expense Entry</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }}>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>Transaction Ref *</label>
              <input value={newRow.txnRef} onChange={e=>setNewRow(p=>({...p,txnRef:e.target.value}))} placeholder="TXN-2025-XXX" style={inpStyle} />
            </div>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>Date *</label>
              <input type="date" value={newRow.date} onChange={e=>setNewRow(p=>({...p,date:e.target.value}))} style={inpStyle} />
            </div>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>Site Name</label>
              <input value={newRow.site} onChange={e=>setNewRow(p=>({...p,site:e.target.value}))} placeholder="Site name" style={inpStyle} />
            </div>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>Expense Type *</label>
              <select value={newRow.expenseType} onChange={e=>setNewRow(p=>({...p,expenseType:e.target.value}))} style={selStyle}>
                {EXPENSE_TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>Amount (₹) *</label>
              <input type="number" value={newRow.amount} onChange={e=>setNewRow(p=>({...p,amount:e.target.value}))} placeholder="0.00" style={{ ...inpStyle, textAlign:'right' as const }} />
            </div>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>Payment Mode</label>
              <select value={newRow.paymentMode} onChange={e=>setNewRow(p=>({...p,paymentMode:e.target.value}))} style={selStyle}>
                {PAYMENT_MODES.map(m=><option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={saveNew}
              disabled={!newRow.txnRef||!newRow.date||!newRow.amount}
              style={{ ...btnPrimary, opacity:!newRow.txnRef||!newRow.date||!newRow.amount?0.5:1 }}>
              ✅ Save Entry
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
            style={{ background:'#fff', border:`1.5px solid ${T.primary}`, borderRadius:8, padding:'8px 18px', color:T.primary, cursor:'pointer', fontSize:13, fontWeight:700 }}>
            + Add Expense
          </button>
        )}
        {items.length > 0 && (
          <div style={{ marginLeft:'auto', fontSize:13, fontWeight:700, color:T.primary, background:T.primaryLight, padding:'8px 18px', borderRadius:8 }}>
            Total Expenses: ₹{totalAmount.toLocaleString('en-IN')}
          </div>
        )}
      </div>
    </div>
  );
}


// ── Invoice Section Component ─────────────────────────────────────────────────
const INV_STATUS_OPTS = ['Draft','Submitted','Under Review','Approved','Rejected'];
const PAY_STATUS_OPTS = ['Pending','Partial','Paid'];
const INV_STATUS_COLORS: any = {
  Approved:{'color':'#0D9488','bg':'#F0FDFA','border':'#99F6E4'},
  Submitted:{'color':'#2563EB','bg':'#EFF6FF','border':'#BFDBFE'},
  'Under Review':{'color':'#7C3AED','bg':'#F5F3FF','border':'#DDD6FE'},
  Rejected:{'color':'#DC2626','bg':'#FEF2F2','border':'#FECACA'},
  Draft:{'color':'#6B7280','bg':'#F9FAFB','border':'#E5E7EB'},
};
const PAY_STATUS_COLORS: any = {
  Paid:{'color':'#0D9488','bg':'#F0FDFA','border':'#99F6E4'},
  Pending:{'color':'#D97706','bg':'#FFFBEB','border':'#FDE68A'},
  Partial:{'color':'#2563EB','bg':'#EFF6FF','border':'#BFDBFE'},
};

function InvoiceSection({ projectId, canAdd }: { projectId:string; canAdd:boolean }) {
  const [items, setItems] = React.useState<any[]>([
    { id:1, invoiceNo:'INV-2025-0012', invoiceDate:'2025-05-20', workBoqRef:'BOQ-CIV-001', invoiceAmount:1250000, gst:225000, totalAmount:1475000, invoiceStatus:'Approved',  paymentStatus:'Paid',    dueDate:'2025-06-19' },
    { id:2, invoiceNo:'INV-2025-0011', invoiceDate:'2025-05-15', workBoqRef:'BOQ-STR-002', invoiceAmount:1875000, gst:337500, totalAmount:2212500, invoiceStatus:'Submitted', paymentStatus:'Pending', dueDate:'2025-06-14' },
  ]);
  const [adding, setAdding]  = React.useState(false);
  const [newRow, setNewRow]  = React.useState({ invoiceNo:'', invoiceDate:'', workBoqRef:'', invoiceAmount:'', gst:'', dueDate:'', invoiceStatus:'Draft', paymentStatus:'Pending' });

  const saveNew = () => {
    if (!newRow.invoiceNo||!newRow.invoiceDate||!newRow.invoiceAmount) return;
    const amt=Number(newRow.invoiceAmount), gst=Number(newRow.gst);
    setItems(prev=>[...prev,{ id:Date.now(), ...newRow, invoiceAmount:amt, gst, totalAmount:amt+gst }]);
    setNewRow({ invoiceNo:'', invoiceDate:'', workBoqRef:'', invoiceAmount:'', gst:'', dueDate:'', invoiceStatus:'Draft', paymentStatus:'Pending' });
    setAdding(false);
  };

  const removeItem = (id:number) => setItems(prev=>prev.filter((i:any)=>i.id!==id));
  const fmt = (n:number) => '₹'+n.toLocaleString('en-IN',{minimumFractionDigits:2});
  const fmtD = (d:string) => d?new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'—';
  const inpS: React.CSSProperties = { border:`1px solid ${T.border}`, borderRadius:6, padding:'5px 8px', fontSize:12, width:'100%', boxSizing:'border-box' as const, outline:'none', background:'#fff', color:T.text };
  const selS: React.CSSProperties = { ...inpS, cursor:'pointer' };
  const thS:  React.CSSProperties = { padding:'9px 12px', fontSize:10, fontWeight:700, textTransform:'uppercase', color:T.primary, textAlign:'left' as const, borderBottom:`2px solid ${T.primaryMid}`, background:T.primaryLight, whiteSpace:'nowrap' as const };
  const tdS:  React.CSSProperties = { padding:'10px 12px', fontSize:12, borderBottom:`1px solid ${T.border}`, verticalAlign:'middle' as const };

  const totalAmt  = items.reduce((a:number,i:any)=>a+Number(i.invoiceAmount),0);
  const totalGst  = items.reduce((a:number,i:any)=>a+Number(i.gst),0);
  const totalTot  = items.reduce((a:number,i:any)=>a+Number(i.totalAmount),0);

  const Pill = ({label,cfg}:{label:string;cfg:any}) => (
    <span style={{ fontSize:11, fontWeight:700, color:cfg.color, background:cfg.bg, border:`1px solid ${cfg.border}`, padding:'2px 8px', borderRadius:20, whiteSpace:'nowrap' as const }}>{label}</span>
  );

  return (
    <div>
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
              {items.map((item:any,idx:number)=>(
                <tr key={item.id} style={{ borderBottom:`1px solid ${T.border}`, background:idx%2===0?'#fff':T.bg }}>
                  <td style={{ ...tdS, color:T.textMuted, width:32 }}>{idx+1}</td>
                  <td style={{ ...tdS, fontWeight:700, color:T.primary }}>{item.invoiceNo}</td>
                  <td style={{ ...tdS, color:T.textMuted, whiteSpace:'nowrap' as const }}>{fmtD(item.invoiceDate)}</td>
                  <td style={tdS}>{item.workBoqRef||'—'}</td>
                  <td style={{ ...tdS, textAlign:'right' as const, fontWeight:600 }}>{fmt(item.invoiceAmount)}</td>
                  <td style={{ ...tdS, textAlign:'right' as const, color:T.textMuted }}>{fmt(item.gst)}</td>
                  <td style={{ ...tdS, textAlign:'right' as const, fontWeight:700, color:T.primary }}>{fmt(item.totalAmount)}</td>
                  <td style={tdS}><Pill label={item.invoiceStatus} cfg={INV_STATUS_COLORS[item.invoiceStatus]||INV_STATUS_COLORS.Draft} /></td>
                  <td style={tdS}><Pill label={item.paymentStatus} cfg={PAY_STATUS_COLORS[item.paymentStatus]||PAY_STATUS_COLORS.Pending} /></td>
                  <td style={{ ...tdS, whiteSpace:'nowrap' as const, color:T.textMuted }}>{fmtD(item.dueDate)}</td>
                  <td style={{ ...tdS, width:36 }}>
                    {canAdd && <button onClick={()=>removeItem(item.id)} style={{ background:'none', border:'none', cursor:'pointer', color:T.danger, fontSize:15 }}>🗑</button>}
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

      {adding && (
        <div style={{ background:T.primaryLight, border:`1px solid ${T.primaryMid}`, borderRadius:10, padding:14, marginTop:12 }}>
          <div style={{ fontSize:13, fontWeight:600, color:T.primary, marginBottom:12 }}>New Invoice Entry</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }}>
            {[['Invoice No *','invoiceNo','text','INV-2025-XXXX'],['Work/BOQ Ref','workBoqRef','text','BOQ-XXX-001'],['Invoice Date *','invoiceDate','date',''],['Due Date','dueDate','date',''],['Amount (₹) *','invoiceAmount','number',''],['GST (₹)','gst','number','']].map(([label,field,type,ph])=>(
              <div key={field}>
                <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>{label}</label>
                <input type={type} value={(newRow as any)[field]} placeholder={ph}
                  onChange={e=>setNewRow(p=>({...p,[field]:e.target.value}))}
                  style={inpS} />
              </div>
            ))}
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>Invoice Status</label>
              <select value={newRow.invoiceStatus} onChange={e=>setNewRow(p=>({...p,invoiceStatus:e.target.value}))} style={selS}>
                {INV_STATUS_OPTS.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>Payment Status</label>
              <select value={newRow.paymentStatus} onChange={e=>setNewRow(p=>({...p,paymentStatus:e.target.value}))} style={selS}>
                {PAY_STATUS_OPTS.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={saveNew} disabled={!newRow.invoiceNo||!newRow.invoiceDate||!newRow.invoiceAmount}
              style={{ ...btnPrimary, opacity:!newRow.invoiceNo||!newRow.invoiceDate||!newRow.invoiceAmount?0.5:1, fontSize:13 }}>
              ✅ Save Invoice
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
            style={{ background:'#fff', border:`1.5px solid ${T.primary}`, borderRadius:8, padding:'8px 18px', color:T.primary, cursor:'pointer', fontSize:13, fontWeight:700 }}>
            + Add Invoice
          </button>
        )}
        {items.length>0 && (
          <div style={{ marginLeft:'auto', fontSize:13, fontWeight:700, color:T.primary, background:T.primaryLight, padding:'8px 18px', borderRadius:8 }}>
            Grand Total: {fmt(totalTot)}
          </div>
        )}
      </div>
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

  const [projects, setProjects] = useState(PROJECT_DB);
  const [allTransactions, setAllTransactions] = React.useState(PAYMENT_TRANSACTIONS);
  const [srnAllApproved, setSrnAllApproved] = React.useState(false);
  const [editingSection, setEditingSection] = useState<string|null>(null);
  const [saving, setSaving] = useState(false);

  const editing    = (s: string) => editingSection === s;
  const notEditing = editingSection === null;
  const startEdit  = (s: string) => { setForm({...p}); setEditingSection(s); };
  const cancelEdit = () => { setForm({...p}); setEditingSection(null); };
  const saveSection = () => {
    setSaving(true);
    setTimeout(() => {
      setProjects((prev:any) => ({ ...prev, [p.id]: { ...prev[p.id], ...form } }));
      setSaving(false); setEditingSection(null);
      setToast({ msg:'Section saved!', type:'success' });
    }, 500);
  };
  const [toast,    setToast]    = useState<{msg:string;type:'success'|'error'|'info'}|null>(null);

  // Preview modal
  const [previewDoc, setPreviewDoc] = useState<{name:string;url:string;isImage:boolean}|null>(null);

  // Billing checklist
  const [checklist, setChecklist] = useState({ stn:false, srn:false, ptw:false, materials:false });
  const [billingNotes, setBillingNotes] = useState('');

  // PM review
  const [reviewNotes,  setReviewNotes]  = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showReject,   setShowReject]   = useState(false);

  if (!router.isReady) return (
    <Layout>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', flexDirection:'column', gap:16 }}>
        <div className="spinner" style={{ width:32, height:32, borderTopColor:T.primary, borderColor:`${T.primary}30` }} />
        <div style={{ fontSize:14, color:T.textMuted }}>Loading project…</div>
      </div>
    </Layout>
  );

  const project = id ? projects[id as string] : null;
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
  const isCompleted = ['completed','billing_review'].includes(p.status);
  const stnData = STN_SRN_DATA.find(s => s.projectId === p.id);
  const st = STATUS_COLOR[p.status] || '#64748B';

  // Edit form state
  const [form, setForm] = useState({ ...p });
  const F = (label:string, key:string, type='text', options?:string[], readOnly=false, sectionCanEdit=editing('details') && canEditDetails) => (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:'block', fontSize:12, fontWeight:600, color:T.textMuted, marginBottom:5, textTransform:'uppercase', letterSpacing:0.3 }}>{label}</label>
      {editingSection !== null && !readOnly && sectionCanEdit ? (
        options ? (
          <select value={(form as any)[key]} onChange={e=>setForm((f:any)=>({...f,[key]:e.target.value}))} style={{ ...inputStyle(), width:'100%' }}>
            {options.map(o=><option key={o}>{o}</option>)}
          </select>
        ) : (
          <input type={type} value={(form as any)[key]||''} onChange={e=>setForm((f:any)=>({...f,[key]:e.target.value}))}
            style={{ ...inputStyle(), width:'100%', boxSizing:'border-box' as const }} />
        )
      ) : (
        <div style={{ fontSize:14, fontWeight:600, color:T.text, padding:'8px 0', borderBottom:`1px solid ${T.border}` }}>
          {(p as any)[key] || '—'}
        </div>
      )}
    </div>
  );

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setProjects(prev => ({ ...prev, [p.id]: { ...prev[p.id], ...form } }));
      setSaving(false);
      setEditingSection(null);
      setToast({ msg:'Project updated successfully!', type:'success' });
    }, 600);
  };

  const updateStatus = (newStatus: string, msg: string) => {
    setProjects(prev => ({ ...prev, [p.id]: { ...prev[p.id], status:newStatus } }));
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
  const ACTIVITY_LOG = [...txnLogs, ...BASE_ACTIVITY_LOG
];

  return (
    <Layout>
      <div className="fade-in">
        {/* ── Header ── */}
        <div style={{ ...card, marginBottom:20, padding:'20px 24px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12, marginBottom:16 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                <Link href="/projects" style={{ color:T.textMuted, textDecoration:'none', fontSize:13 }}>← Projects</Link>
                <span style={{ color:T.textDim }}>/</span>
                <h1 style={{ fontSize:20, fontWeight:800, color:T.text, margin:0 }}>{p.id}</h1>
                <span style={{ background:`${st}18`, color:st, border:`1px solid ${st}40`, padding:'3px 12px', borderRadius:20, fontSize:12, fontWeight:700 }}>{STATUS_LABELS[p.status]||p.status}</span>
              </div>
              <div style={{ fontSize:14, color:T.textMuted }}>{p.projectName} · {p.site} · {p.region}</div>
              <div style={{ fontSize:13, color:T.textDim, marginTop:2 }}>PO: {p.poNo} · Indus ID: {p.indusId}</div>
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>

              {/* PM Review actions */}
              {notEditing && canEdit && (p.status==='submitted'||p.status==='under_review') && (
                <>
                  <button onClick={()=>updateStatus('pm_approved','Project approved and sent to billing!')} style={{ ...btnPrimary, background:T.success, fontSize:13 }}>✅ Approve</button>
                  <button onClick={()=>setShowReject(true)} style={{ ...btnSecondary, borderColor:T.danger, color:T.danger, fontSize:13 }}>❌ Reject</button>
                </>
              )}
            </div>
          </div>
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:T.textMuted, marginBottom:5 }}>
              <span>Overall Progress</span>
              <span style={{ fontWeight:700, color:p.progress===100?T.success:st }}>{p.progress}%</span>
            </div>
            <div style={{ height:8, background:T.border, borderRadius:4 }}>
              <div style={{ height:'100%', width:`${p.progress}%`, background:p.progress===100?T.success:p.status==='delayed'?T.danger:T.primary, borderRadius:4, transition:'width 0.5s' }} />
            </div>
          </div>
        </div>

        {/* ── 1. Project Details + Financial ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
          <div style={card}>
            {sectionTitle('📋','Project Details', 'details', canEditDetails)}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
              {F('Project No',       'id',          'text', undefined, true)}
              {F('PO Number',        'poNo',        'text', undefined, true)}
              {F('Indus ID',         'indusId',     'text', undefined, true)}
              {F('Site Name',        'site')}
              {F('Region',           'region',      'text', REGIONS)}
              {F('Job Type',         'type',        'text', TYPES)}
              {F('Start Date',       'startDate',   'date')}
              {F('End Date',         'endDate',     'date')}
              {F('Region Manager',   'rm',          'text', undefined, true)}
              {F('Project Manager',  'pm')}
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
              { label:'Paid Amount',   key:null,           color:T.success, computed: getPaidAmount(p.id, allTransactions) },
              { label:'Pending',       key:null,           color:T.warning, computed: p.billedAmount - getPaidAmount(p.id, allTransactions) },
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
                  options={VENDOR_LIST.map(v=>v.name)}
                  placeholder="Select or create vendor…"
                  onChange={v => {
                    const found = VENDOR_LIST.find(vl => vl.name === v);
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
                    {(p as any)[key]||'—'}
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


        {/* ── PO Items ── */}
        <div style={{ ...card, marginBottom:16 }}>
          {sectionTitle('📋','PO Items', 'poitems', canEdit)}
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
              const docs = MOCK_DOCS[doc.key] || [
];
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
                const checked = checklist[item.key as keyof typeof checklist
];
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
          {sectionTitle('🧾','Invoice', 'invoice', canAddInvoice)}
          <InvoiceSection projectId={p.id} canAdd={canAddInvoice} />
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
