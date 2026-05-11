import React, { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';
import { useUpload } from '@/lib/useUpload';
import { T, card, btnPrimary, btnSecondary, inputStyle } from '@/lib/theme';

const PROJECTS: Record<string,any> = {
  'VE-2025-001': { id:'VE-2025-001', projectName:'Chennai Metro Phase II', site:'Chennai North', pm:'Arun Kumar', poNo:'PO-2025-001', poDate:'2025-04-01', poValue:1850000, region:'Tamil Nadu', type:'Tower Erection', vendorAssigned:true, vendor:'ABC Telecom Services', vendorContact:'Rajesh Kumar', vendorPhone:'+91 98765 43210', vendorEmail:'rajesh@abctelecom.com', returnLogisticsUnlocked:false },
  'VE-2025-004': { id:'VE-2025-004', projectName:'Chennai Fiber Network',   site:'Chennai South', pm:'Arun Kumar', poNo:'PO-2025-004', poDate:'2025-04-20', poValue:1230000, region:'Tamil Nadu', type:'Fiber Installation', vendorAssigned:false, vendor:'', vendorContact:'', vendorPhone:'', vendorEmail:'', returnLogisticsUnlocked:false },
  'VE-2025-005': { id:'VE-2025-005', projectName:'Coimbatore Tower Erect',  site:'Coimbatore',   pm:'Arun Kumar', poNo:'PO-2025-005', poDate:'2025-05-01', poValue:2200000, region:'Tamil Nadu', type:'Tower Erection', vendorAssigned:false, vendor:'', vendorContact:'', vendorPhone:'', vendorEmail:'', returnLogisticsUnlocked:false },
  'VE-2025-008': { id:'VE-2025-008', projectName:'Delhi NCR Maintenance',   site:'Delhi NCR',    pm:'Arun Kumar', poNo:'PO-2025-008', poDate:'2025-04-15', poValue:380000,  region:'Delhi', type:'Tower Maintenance', vendorAssigned:true, vendor:'XYZ Infra Solutions', vendorContact:'Priya Sharma', vendorPhone:'+91 98765 43211', vendorEmail:'priya@xyzinfra.com', returnLogisticsUnlocked:false },
};

const VENDORS = [
  { name:'ABC Telecom Services', contact:'Rajesh Kumar', phone:'+91 98765 43210', email:'rajesh@abctelecom.com' },
  { name:'XYZ Infra Solutions',  contact:'Priya Sharma', phone:'+91 98765 43211', email:'priya@xyzinfra.com'   },
  { name:'TowerTech Pvt Ltd',    contact:'Arun Singh',   phone:'+91 98765 43212', email:'arun@towertech.com'   },
  { name:'NetConnect Services',  contact:'Deepa Nair',   phone:'+91 98765 43213', email:'deepa@netconnect.com' },
  { name:'PowerSys India',       contact:'Sunita Reddy', phone:'+91 98765 43215', email:'sunita@powersys.com'  },
];

const UOMS = ['Cum','MT','Nos','KG','RMT','Bag','Ltr','Set'];
const MAT_TYPES = ['Construction Material','Electrical Material','Civil Works','Mechanical Equipment','Other'];
const SRN_STATUSES = ['Pending','In Transit','Received','Partially Received','Returned'];

interface AllocItem { id:number; code:string; desc:string; uom:string; qty:string; rate:string; amount:number; workStage:string; status:string; }
interface SRNItem   { id:number; code:string; desc:string; uom:string; qty:string; rate:string; amount:number; returnStatus:string; }

const emptyAlloc = (id:number): AllocItem => ({ id, code:'', desc:'', uom:'Cum', qty:'', rate:'', amount:0, workStage:'', status:'Not Started' });
const emptySRN   = (id:number): SRNItem   => ({ id, code:'', desc:'', uom:'Cum', qty:'', rate:'', amount:0, returnStatus:'Pending' });

const sectionTitle = (n:string, t:string, color=T.primary) => (
  <div style={{ fontSize:14, fontWeight:700, color, marginBottom:16, paddingBottom:8, borderBottom:`2px solid ${color}40`, display:'flex', alignItems:'center', gap:8 }}>
    <span style={{ background:color, color:'#fff', width:22, height:22, borderRadius:'50%', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, flexShrink:0 }}>{n}</span>
    {t}
  </div>
);

const Inp = ({ value, onChange, placeholder, type='text', readOnly }: any) => (
  <input type={type} value={value} onChange={e=>onChange?.(e.target.value)} placeholder={placeholder} readOnly={readOnly}
    style={{ ...inputStyle(), width:'100%', boxSizing:'border-box' as const, ...(readOnly?{background:T.bg,color:T.textMuted,cursor:'not-allowed'}:{}) }} />
);

const F = ({ label, children, required }: any) => (
  <div style={{ marginBottom:14 }}>
    <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:5 }}>
      {label}{required && <span style={{ color:T.danger }}> *</span>}
    </label>
    {children}
  </div>
);

export default function PMProjectDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { upload } = useUpload();
  const project = id ? PROJECTS[id as string] : null;

  // Section 1 - Vendor
  const [vendorName,    setVendorName]    = useState(project?.vendor || '');
  const [vendorContact, setVendorContact] = useState(project?.vendorContact || '');
  const [vendorPhone,   setVendorPhone]   = useState(project?.vendorPhone || '');
  const [vendorEmail,   setVendorEmail]   = useState(project?.vendorEmail || '');

  // Section 2 - Assignment
  const [assignDate,  setAssignDate]  = useState(new Date().toISOString().split('T')[0]);
  const [workScope,   setWorkScope]   = useState('');
  const [qty,         setQty]         = useState('');
  const [uom,         setUom]         = useState('Cum');
  const [rate,        setRate]        = useState('');
  const amount = (parseFloat(qty)||0) * (parseFloat(rate)||0);

  // Section 3 - PO & Aging
  const poDate  = project?.poDate || '';
  const poValue = project?.poValue || 0;
  const aging   = poDate ? Math.floor((Date.now() - new Date(poDate).getTime()) / 86400000) : 0;
  const [allocRefNo,  setAllocRefNo]  = useState('');
  const [allocAmount, setAllocAmount] = useState('');
  const balanceAlloc = poValue - (parseFloat(allocAmount)||0);

  // Section 4 - Tracking
  const [stnNo,       setStnNo]       = useState('');
  const [stnDate,     setStnDate]     = useState('');
  const [ewbNo,       setEwbNo]       = useState('');
  const [ewbDate,     setEwbDate]     = useState('');
  const [gateNo,      setGateNo]      = useState('');
  const [gateDate,    setGateDate]    = useState('');
  const [vehicleNo,   setVehicleNo]   = useState('');
  const [driverName,  setDriverName]  = useState('');
  const [matType,     setMatType]     = useState('Construction Material');
  const [delivLoc,    setDelivLoc]    = useState('');
  const [trackRemarks,setTrackRemarks]= useState('');

  // Section 5 - Allocation Items
  const [allocItems, setAllocItems] = useState<AllocItem[]>([emptyAlloc(1)]);
  const nextAllocId = useRef(2);
  const updateAllocItem = (id:number, field:string, val:string) => {
    setAllocItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const u = { ...item, [field]: val };
      u.amount = (parseFloat(u.qty)||0) * (parseFloat(u.rate)||0);
      return u;
    }));
  };
  const totalAllocAmount = allocItems.reduce((a,i)=>a+i.amount,0);

  // SRN Section 2
  const [srnDocNo,    setSrnDocNo]    = useState('');
  const [srnDate,     setSrnDate]     = useState('');
  const [linkedPO,    setLinkedPO]    = useState(project?.poNo || '');
  const [srnPoDate,   setSrnPoDate]   = useState(poDate);

  // SRN Section 3 - Items
  const [srnItems, setSrnItems] = useState<SRNItem[]>([emptySRN(1)]);
  const nextSrnId = useRef(2);
  const updateSrnItem = (id:number, field:string, val:string) => {
    setSrnItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const u = { ...item, [field]: val };
      u.amount = (parseFloat(u.qty)||0) * (parseFloat(u.rate)||0);
      return u;
    }));
  };
  const totalSrnAmount = srnItems.reduce((a,i)=>a+i.amount,0);

  // Section 4 - Returns & Logistics (greyed by default)
  const [returnLogisticsUnlocked] = useState(project?.returnLogisticsUnlocked || false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [rlMatStatus,   setRlMatStatus]   = useState('');
  const [rlGateNo,      setRlGateNo]      = useState('');
  const [rlGateDate,    setRlGateDate]    = useState('');
  const [rlVehicleNo,   setRlVehicleNo]   = useState('');
  const [rlDriverName,  setRlDriverName]  = useState('');
  const [rlEwbNo,       setRlEwbNo]       = useState('');
  const [rlEwbDate,     setRlEwbDate]     = useState('');
  const [rlTransporter, setRlTransporter] = useState('');

  // Attachments
  const [attachments, setAttachments] = useState<Record<string,{name:string;size:string;url:string}|null>>({
    srn_document:null, eway_bill:null, gate_entry:null, vehicle_image:null, other_document:null,
  });
  const [uploading, setUploading] = useState<Record<string,boolean>>({});
  const fileRefs = useRef<Record<string,HTMLInputElement|null>>({});

  const [srnRemarks, setSrnRemarks] = useState('');
  const [toast, setToast]           = useState<{msg:string;type:'success'|'error'|'info'}|null>(null);
  const [saving, setSaving]         = useState(false);

  const handleVendorSelect = (name: string) => {
    setVendorName(name);
    const v = VENDORS.find(x=>x.name===name);
    if (v) { setVendorContact(v.contact); setVendorPhone(v.phone); setVendorEmail(v.email); }
  };

  const handleAttachment = async (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5*1024*1024) { setToast({ msg:'File must be under 5MB.', type:'error' }); return; }
    setUploading(p=>({...p,[key]:true}));
    try {
      const result = await upload(file, `projects/${id}/srn`);
      setAttachments(p=>({...p,[key]:{ name:result.fileName, size:result.fileSize, url:result.publicUrl }}));
      setToast({ msg:'File uploaded!', type:'success' });
    } catch (err:any) {
      setToast({ msg:err.message||'Upload failed', type:'error' });
    }
    setUploading(p=>({...p,[key]:false}));
  };

  const handleSave = () => {
    if (!vendorName) { setToast({ msg:'Please select a vendor.', type:'error' }); return; }
    setSaving(true);
    setTimeout(()=>{ setSaving(false); setToast({ msg:'Assignment saved successfully!', type:'success' }); }, 800);
  };

  const fmt = (v:number) => `₹ ${v.toLocaleString('en-IN', {minimumFractionDigits:2})}`;

  const AttachmentCard = ({ k, label, icon, accept }: { k:string; label:string; icon:string; accept:string }) => {
    const uploaded = attachments[k];
    const isUp = uploading[k];
    return (
      <div style={{ border:`1px solid ${uploaded?T.success:T.border}`, borderRadius:10, padding:14, background:uploaded?T.successBg:'#fff', textAlign:'center' }}>
        <div style={{ fontSize:28, marginBottom:8 }}>{icon}</div>
        <div style={{ fontSize:12, fontWeight:600, color:T.text, marginBottom:8 }}>{label}</div>
        {uploaded ? (
          <a href={uploaded.url} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:T.primary, textDecoration:'none', display:'block', marginBottom:4 }}>{uploaded.name}</a>
        ) : (
          <>
            <input ref={el=>{ fileRefs.current[k]=el; }} type="file" accept={accept} onChange={e=>handleAttachment(k,e)} style={{ display:'none' }} />
            <button onClick={()=>fileRefs.current[k]?.click()} disabled={isUp}
              style={{ ...btnSecondary, fontSize:11, padding:'5px 12px', width:'100%', justifyContent:'center' }}>
              {isUp?'Uploading…':'⬆ Upload File'}
            </button>
            <div style={{ fontSize:10, color:T.textDim, marginTop:4 }}>PDF, JPG, PNG (Max. 5MB)</div>
          </>
        )}
      </div>
    );
  };

  if (!project) return <Layout><div style={{ padding:40, textAlign:'center' }}>Loading…</div></Layout>;

  const tableHeader = (cols: string[]) => (
    <tr style={{ background:T.bg }}>
      {cols.map(h=><th key={h} style={{ padding:'8px', fontSize:11, fontWeight:700, textTransform:'uppercase', color:T.textMuted, textAlign:'left', borderBottom:`2px solid ${T.border}`, whiteSpace:'nowrap' }}>{h}</th>)}
    </tr>
  );

  const inp = (v:string, onChange:(s:string)=>void, ph='', type='text', readOnly=false) => (
    <input type={type} value={v} onChange={e=>onChange(e.target.value)} placeholder={ph} readOnly={readOnly}
      style={{ ...inputStyle(), padding:'7px 8px', fontSize:12, width:'100%', boxSizing:'border-box' as const, ...(readOnly?{background:T.bg,color:T.textMuted}:{}) }} />
  );

  return (
    <Layout>
      <div className="fade-in">
        {/* Breadcrumb + actions */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:13 }}>
            <Link href="/pm/projects" style={{ color:T.primary, textDecoration:'none', fontWeight:500 }}>← My Projects</Link>
            <span style={{ color:T.textDim }}>/</span>
            <span style={{ color:T.text, fontWeight:600 }}>{project.id}</span>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <Link href="/pm/projects"><button style={{ ...btnSecondary, padding:'8px 18px', fontSize:13 }}>Cancel</button></Link>
            <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, padding:'8px 22px', fontSize:13, opacity:saving?0.8:1 }}>
              {saving?<><div className="spinner" style={{ borderTopColor:'#fff', borderColor:'rgba(255,255,255,0.3)', width:14, height:14 }} /> Saving…</>:'💾 Save Assignment'}
            </button>
          </div>
        </div>

        {/* ── SECTION 1: Project & Vendor Details ── */}
        <div style={{ ...card, marginBottom:16 }}>
          {sectionTitle('1','Project & Vendor Details')}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'0 16px' }}>
            <F label="Project No"><Inp value={project.id} readOnly /></F>
            <F label="Site Name"><Inp value={project.site} readOnly /></F>
            <F label="Project Name"><Inp value={project.projectName} readOnly /></F>
            <F label="Project Manager"><Inp value={project.pm} readOnly /></F>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'0 16px' }}>
            <F label="Vendor Name" required>
              <select value={vendorName} onChange={e=>handleVendorSelect(e.target.value)} style={{ ...inputStyle(), width:'100%', appearance:'none' as const }}>
                <option value="">Select Vendor…</option>
                {VENDORS.map(v=><option key={v.name}>{v.name}</option>)}
              </select>
            </F>
            <F label="Contact Person"><Inp value={vendorContact} onChange={setVendorContact} placeholder="Auto-filled" /></F>
            <F label="Contact No" required><Inp value={vendorPhone} onChange={setVendorPhone} placeholder="+91 98765 43210" /></F>
            <F label="Email"><Inp value={vendorEmail} onChange={setVendorEmail} placeholder="vendor@email.com" /></F>
          </div>
        </div>

        {/* ── SECTIONS 2 & 3 side by side ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
          {/* Section 2: Assignment Details */}
          <div style={card}>
            {sectionTitle('2','Assignment Details')}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
              <F label="Assignment Date" required>
                <input type="date" value={assignDate} onChange={e=>setAssignDate(e.target.value)} style={{ ...inputStyle(), width:'100%', boxSizing:'border-box' as const }} />
              </F>
              <div />
            </div>
            <F label="Work Scope / Description" required>
              <textarea value={workScope} onChange={e=>setWorkScope(e.target.value)} placeholder="Describe the work scope…" rows={3}
                style={{ ...inputStyle(), width:'100%', resize:'vertical', boxSizing:'border-box' as const }} />
            </F>
            <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr 1fr', gap:'0 10px', alignItems:'end' }}>
              <F label="Quantity *"><Inp value={qty} onChange={setQty} placeholder="1,250.00" type="number" /></F>
              <F label="UOM">
                <select value={uom} onChange={e=>setUom(e.target.value)} style={{ ...inputStyle(), width:70 }}>
                  {UOMS.map(u=><option key={u}>{u}</option>)}
                </select>
              </F>
              <F label="Rate (₹) *"><Inp value={rate} onChange={setRate} placeholder="6,500.00" type="number" /></F>
              <F label="Amount (₹)">
                <div style={{ ...inputStyle(), background:T.primaryLight, color:T.primary, fontWeight:700, display:'flex', alignItems:'center' }}>
                  {amount > 0 ? fmt(amount) : '0.00'}
                </div>
              </F>
            </div>
          </div>

          {/* Section 3: PO & Aging Details */}
          <div style={card}>
            {sectionTitle('3','PO & Aging Details')}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0 16px' }}>
              <F label="PO Date"><Inp value={poDate} readOnly /></F>
              <F label="PO Value (₹)"><Inp value={poValue.toLocaleString('en-IN')} readOnly /></F>
              <F label="PO Aging (Days)">
                <div style={{ ...inputStyle(), background:aging>30?'#FEF3C7':aging>60?'#FEE2E2':'#F0FDF4', color:aging>60?T.danger:aging>30?T.warning:T.success, fontWeight:700, textAlign:'center' as const }}>
                  {aging} Days
                </div>
              </F>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0 16px' }}>
              <F label="Allocation Ref No"><Inp value={allocRefNo} onChange={setAllocRefNo} placeholder="ALLO-PRJ-2025-001" /></F>
              <F label="Allocation Amount (₹)"><Inp value={allocAmount} onChange={setAllocAmount} placeholder="8,00,00,000" type="number" /></F>
              <F label="Balance Allocation (₹)">
                <div style={{ ...inputStyle(), background:'#FFFBEB', color:T.warning, fontWeight:700 }}>
                  {balanceAlloc > 0 ? fmt(balanceAlloc) : '₹ 0.00'}
                </div>
              </F>
            </div>
          </div>
        </div>

        {/* ── SECTION 4: Tracking & Compliance ── */}
        <div style={{ ...card, marginBottom:16 }}>
          {sectionTitle('4','Tracking & Compliance')}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:'0 16px' }}>
            <F label="STN No"><Inp value={stnNo} onChange={setStnNo} placeholder="STN-2025-1001" /></F>
            <F label="STN Date"><input type="date" value={stnDate} onChange={e=>setStnDate(e.target.value)} style={{ ...inputStyle(), width:'100%', boxSizing:'border-box' as const }} /></F>
            <F label="E-Way Bill No"><Inp value={ewbNo} onChange={setEwbNo} placeholder="EWB-321654987" /></F>
            <F label="E-Way Bill Date"><input type="date" value={ewbDate} onChange={e=>setEwbDate(e.target.value)} style={{ ...inputStyle(), width:'100%', boxSizing:'border-box' as const }} /></F>
            <F label="Gate Entry No"><Inp value={gateNo} onChange={setGateNo} placeholder="GE-2025-00045" /></F>
            <F label="Gate Entry Date"><input type="date" value={gateDate} onChange={e=>setGateDate(e.target.value)} style={{ ...inputStyle(), width:'100%', boxSizing:'border-box' as const }} /></F>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr', gap:'0 16px' }}>
            <F label="Vehicle No"><Inp value={vehicleNo} onChange={setVehicleNo} placeholder="TN 09 AB 1234" /></F>
            <F label="Driver Name"><Inp value={driverName} onChange={setDriverName} placeholder="Suresh Kumar" /></F>
            <F label="Material / Service Type">
              <select value={matType} onChange={e=>setMatType(e.target.value)} style={{ ...inputStyle(), width:'100%', appearance:'none' as const }}>
                {MAT_TYPES.map(m=><option key={m}>{m}</option>)}
              </select>
            </F>
            <F label="Delivery / Service Location"><Inp value={delivLoc} onChange={setDelivLoc} placeholder="Chennai Site - Station 3" /></F>
            <F label="Remarks"><Inp value={trackRemarks} onChange={setTrackRemarks} placeholder="Material delivered at site." /></F>
          </div>
        </div>

        {/* ── SECTION 5: Allocation Items ── */}
        <div style={{ ...card, marginBottom:16 }}>
          {sectionTitle('5','Allocation Items')}
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:900 }}>
              <thead>{tableHeader(['#','Item Code','Item Description','UOM','Quantity','Rate (₹)','Amount (₹)','Work Stage','Status','Action'])}</thead>
              <tbody>
                {allocItems.map((item,i) => (
                  <tr key={item.id} style={{ borderBottom:`1px solid ${T.border}` }}>
                    <td style={{ padding:'8px', color:T.textDim, fontSize:13, width:28 }}>{i+1}</td>
                    <td style={{ padding:'8px', width:100 }}>{inp(item.code, v=>updateAllocItem(item.id,'code',v), 'CIV-1001')}</td>
                    <td style={{ padding:'8px', minWidth:160 }}>{inp(item.desc, v=>updateAllocItem(item.id,'desc',v), 'Concrete M30')}</td>
                    <td style={{ padding:'8px', width:80 }}>
                      <select value={item.uom} onChange={e=>updateAllocItem(item.id,'uom',e.target.value)} style={{ ...inputStyle(), padding:'7px 6px', fontSize:12, width:70 }}>
                        {UOMS.map(u=><option key={u}>{u}</option>)}
                      </select>
                    </td>
                    <td style={{ padding:'8px', width:80 }}>{inp(item.qty, v=>updateAllocItem(item.id,'qty',v), '0', 'number')}</td>
                    <td style={{ padding:'8px', width:90 }}>{inp(item.rate, v=>updateAllocItem(item.id,'rate',v), '0.00', 'number')}</td>
                    <td style={{ padding:'8px', fontWeight:700, color:T.text, whiteSpace:'nowrap' }}>{item.amount>0?fmt(item.amount):'—'}</td>
                    <td style={{ padding:'8px', width:100 }}>{inp(item.workStage, v=>updateAllocItem(item.id,'workStage',v), 'Foundation')}</td>
                    <td style={{ padding:'8px', width:110 }}>
                      <select value={item.status} onChange={e=>updateAllocItem(item.id,'status',e.target.value)} style={{ ...inputStyle(), padding:'5px 6px', fontSize:11, width:100 }}>
                        {['Not Started','In Progress','On Hold','Completed'].map(s=><option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ padding:'8px' }}>
                      <div style={{ display:'flex', gap:4 }}>
                        <button style={{ background:T.primaryLight, border:'none', borderRadius:5, padding:'4px 7px', color:T.primary, cursor:'pointer', fontSize:12 }}>✏️</button>
                        <button onClick={()=>setAllocItems(p=>p.filter(x=>x.id!==item.id))} disabled={allocItems.length===1}
                          style={{ background:'#FEF2F2', border:'none', borderRadius:5, padding:'4px 7px', color:T.danger, cursor:'pointer', fontSize:12, opacity:allocItems.length===1?0.4:1 }}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12 }}>
            <button onClick={()=>setAllocItems(p=>[...p, emptyAlloc(nextAllocId.current++)])} style={{ ...btnSecondary, fontSize:12 }}>+ Add Item</button>
            <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:8, padding:'8px 18px', fontSize:13 }}>
              Total Allocation Amount: <strong style={{ color:T.primary, marginLeft:8 }}>{fmt(totalAllocAmount)}</strong>
            </div>
          </div>
        </div>

        {/* ── DIVIDER ── */}
        <div style={{ textAlign:'center', margin:'24px 0', color:T.textDim, fontSize:12, display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ flex:1, height:1, background:T.border }} />
          SRN & Returns Section
          <div style={{ flex:1, height:1, background:T.border }} />
        </div>

        {/* ── SRN SECTION 2: SRN Details ── */}
        <div style={{ ...card, marginBottom:16 }}>
          {sectionTitle('2','SRN Details', '#7C3AED')}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'0 16px' }}>
            <F label="SRN Document No" required><Inp value={srnDocNo} onChange={setSrnDocNo} placeholder="Enter SRN No" /></F>
            <F label="SRN Date" required>
              <input type="date" value={srnDate} onChange={e=>setSrnDate(e.target.value)} style={{ ...inputStyle(), width:'100%', boxSizing:'border-box' as const }} />
            </F>
            <F label="Linked PO No" required>
              <select value={linkedPO} onChange={e=>setLinkedPO(e.target.value)} style={{ ...inputStyle(), width:'100%', appearance:'none' as const }}>
                <option value="">Select PO No</option>
                <option value={project.poNo}>{project.poNo}</option>
              </select>
            </F>
            <F label="PO Date">
              <input type="date" value={srnPoDate} onChange={e=>setSrnPoDate(e.target.value)} style={{ ...inputStyle(), width:'100%', boxSizing:'border-box' as const }} />
            </F>
          </div>
        </div>

        {/* ── SRN SECTION 3: Item Details ── */}
        <div style={{ ...card, marginBottom:16 }}>
          {sectionTitle('3','Item Details', '#7C3AED')}
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>{tableHeader(['Item Code','Item Description','UOM','Quantity','Rate (₹)','Amount (₹)','Material Return Status','Action'])}</thead>
              <tbody>
                {srnItems.map((item) => (
                  <tr key={item.id} style={{ borderBottom:`1px solid ${T.border}` }}>
                    <td style={{ padding:'8px', width:120 }}>
                      <select value={item.code} onChange={e=>updateSrnItem(item.id,'code',e.target.value)} style={{ ...inputStyle(), padding:'7px 6px', fontSize:12, width:110 }}>
                        <option value="">Select Item Code</option>
                        {allocItems.filter(a=>a.code).map(a=><option key={a.code} value={a.code}>{a.code}</option>)}
                      </select>
                    </td>
                    <td style={{ padding:'8px', minWidth:160 }}>{inp(item.desc, v=>updateSrnItem(item.id,'desc',v), 'Item Description')}</td>
                    <td style={{ padding:'8px', width:80 }}>
                      <select value={item.uom} onChange={e=>updateSrnItem(item.id,'uom',e.target.value)} style={{ ...inputStyle(), padding:'7px 6px', fontSize:12, width:70 }}>
                        {UOMS.map(u=><option key={u}>{u}</option>)}
                      </select>
                    </td>
                    <td style={{ padding:'8px', width:80 }}>{inp(item.qty, v=>updateSrnItem(item.id,'qty',v), '0.00', 'number')}</td>
                    <td style={{ padding:'8px', width:90 }}>{inp(item.rate, v=>updateSrnItem(item.id,'rate',v), '0.00', 'number')}</td>
                    <td style={{ padding:'8px', fontWeight:700, color:T.text, whiteSpace:'nowrap' }}>{item.amount>0?fmt(item.amount):'0.00'}</td>
                    <td style={{ padding:'8px', width:140 }}>
                      <select value={item.returnStatus} onChange={e=>updateSrnItem(item.id,'returnStatus',e.target.value)} style={{ ...inputStyle(), padding:'5px 6px', fontSize:11, width:130 }}>
                        {SRN_STATUSES.map(s=><option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ padding:'8px' }}>
                      <button onClick={()=>setSrnItems(p=>p.filter(x=>x.id!==item.id))} disabled={srnItems.length===1}
                        style={{ background:'#FEF2F2', border:'none', borderRadius:5, padding:'4px 7px', color:T.danger, cursor:'pointer', fontSize:12, opacity:srnItems.length===1?0.4:1 }}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12 }}>
            <button onClick={()=>setSrnItems(p=>[...p, emptySRN(nextSrnId.current++)])} style={{ ...btnSecondary, fontSize:12 }}>+ Add Row</button>
            <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:8, padding:'8px 18px', fontSize:13 }}>
              Total Amount (₹): <strong style={{ color:T.primary, marginLeft:8 }}>{fmt(totalSrnAmount)}</strong>
            </div>
          </div>
        </div>

        {/* ── SRN SECTION 4: Return & Logistics (greyed unless unlocked) ── */}
        <div style={{ ...card, marginBottom:16, position:'relative', opacity: returnLogisticsUnlocked ? 1 : 0.5 }}>
          {sectionTitle('4','Return & Logistics Details', '#D97706')}
          {!returnLogisticsUnlocked && (
            <div style={{ position:'absolute', inset:0, background:'rgba(255,255,255,0.6)', borderRadius:12, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', zIndex:10 }}>
              <div style={{ fontSize:32, marginBottom:8 }}>🔒</div>
              <div style={{ fontSize:13, fontWeight:600, color:T.text, marginBottom:6 }}>Locked — Available after vendor completes the project</div>
              <div style={{ fontSize:12, color:T.textDim, marginBottom:12 }}>Only Regional Manager or Admin can unlock this section</div>
              <button onClick={()=>setShowUnlockModal(true)} style={{ background:T.warning, color:'#fff', border:'none', borderRadius:8, padding:'8px 20px', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                🔓 Request Unlock
              </button>
            </div>
          )}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'0 16px' }}>
            <F label="Material Return Status *">
              <select value={rlMatStatus} onChange={e=>setRlMatStatus(e.target.value)} disabled={!returnLogisticsUnlocked} style={{ ...inputStyle(), width:'100%', appearance:'none' as const, opacity:returnLogisticsUnlocked?1:0.5 }}>
                <option value="">Select Status</option>
                {SRN_STATUSES.map(s=><option key={s}>{s}</option>)}
              </select>
            </F>
            <F label="Gate Entry No"><Inp value={rlGateNo} onChange={setRlGateNo} placeholder="Enter Gate Entry No" readOnly={!returnLogisticsUnlocked} /></F>
            <F label="Gate Entry Date">
              <input type="date" value={rlGateDate} onChange={e=>setRlGateDate(e.target.value)} disabled={!returnLogisticsUnlocked}
                style={{ ...inputStyle(), width:'100%', boxSizing:'border-box' as const }} />
            </F>
            <F label="Vehicle No"><Inp value={rlVehicleNo} onChange={setRlVehicleNo} placeholder="Enter Vehicle No" readOnly={!returnLogisticsUnlocked} /></F>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'0 16px' }}>
            <F label="Driver Name"><Inp value={rlDriverName} onChange={setRlDriverName} placeholder="Enter Driver Name" readOnly={!returnLogisticsUnlocked} /></F>
            <F label="E-Way Bill No"><Inp value={rlEwbNo} onChange={setRlEwbNo} placeholder="Enter E-Way Bill No" readOnly={!returnLogisticsUnlocked} /></F>
            <F label="E-Way Bill Date">
              <input type="date" value={rlEwbDate} onChange={e=>setRlEwbDate(e.target.value)} disabled={!returnLogisticsUnlocked}
                style={{ ...inputStyle(), width:'100%', boxSizing:'border-box' as const }} />
            </F>
            <F label="Transporter Name"><Inp value={rlTransporter} onChange={setRlTransporter} placeholder="Enter Transporter Name" readOnly={!returnLogisticsUnlocked} /></F>
          </div>
        </div>

        {/* ── SRN SECTION 5: Attachments ── */}
        <div style={{ ...card, marginBottom:16 }}>
          {sectionTitle('5','Attachments', '#7C3AED')}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12 }}>
            <AttachmentCard k="srn_document"  label="SRN Document"  icon="📄" accept=".pdf,.jpg,.png" />
            <AttachmentCard k="eway_bill"     label="E-Way Bill"    icon="📋" accept=".pdf,.jpg,.png" />
            <AttachmentCard k="gate_entry"    label="Gate Entry Slip"icon="🚧" accept=".pdf,.jpg,.png" />
            <AttachmentCard k="vehicle_image" label="Vehicle Image"  icon="🚛" accept=".jpg,.png"      />
            <AttachmentCard k="other_document"label="Other Document" icon="📎" accept=".pdf,.jpg,.png,.xlsx" />
          </div>
        </div>

        {/* ── SRN SECTION 6: Remarks ── */}
        <div style={card}>
          {sectionTitle('6','Remarks', '#7C3AED')}
          <textarea value={srnRemarks} onChange={e=>setSrnRemarks(e.target.value)} placeholder="Enter remarks or notes…" rows={3}
            style={{ ...inputStyle(), width:'100%', resize:'vertical', boxSizing:'border-box' as const }} />
        </div>

        {/* Unlock Request Modal */}
        {showUnlockModal && (
          <Modal title="🔓 Request to Unlock Return & Logistics" onClose={()=>setShowUnlockModal(false)} width={460}>
            <p style={{ fontSize:13, color:T.textMuted, marginBottom:16 }}>
              This request will be sent to the Regional Manager and Admin for approval. Please provide a reason.
            </p>
            <textarea rows={4} placeholder="Enter reason for unlock request…"
              style={{ ...inputStyle(), width:'100%', resize:'vertical', boxSizing:'border-box' as const, marginBottom:16 }} />
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
              <button onClick={()=>setShowUnlockModal(false)} style={btnSecondary}>Cancel</button>
              <button onClick={()=>{ setShowUnlockModal(false); setToast({ msg:'Unlock request sent to RM and Admin!', type:'success' }); }}
                style={{ ...btnPrimary, background:T.warning }}>Send Request</button>
            </div>
          </Modal>
        )}
      </div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
    </Layout>
  );
}
