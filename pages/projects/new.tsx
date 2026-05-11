import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import CreatableSelect from '@/components/CreatableSelect';
import Toast from '@/components/Toast';
import { T, inputStyle, btnPrimary, btnSecondary } from '@/lib/theme';
import { useUpload, UploadResult } from '@/lib/useUpload';
import { TEAM_MEMBERS } from '@/lib/teamData';

// Seed data
const INIT_SITES    = ['Station 3 - Pile Cap Area','Station 5 - Tower Base','Chennai East Site','Bengaluru North Hub','Mumbai Tower Site','Delhi NCR Zone A'];
const INIT_UOMS     = ['Bag','Nos','KG','MT','CFT','CUM','Ltr','Set','RMT','Pair'];
const INIT_GST      = ['0%','5%','12%','18%','28%'];
const PAYMENT_TERMS = ['15 Days','30 Days','45 Days','60 Days','90 Days','Advance'];
const CURRENCIES    = ['INR','USD','EUR','AED'];
const REGIONS       = ['Tamil Nadu','Karnataka','Telangana','Maharashtra','Delhi','Kerala','West Bengal','Gujarat','Rajasthan','Andhra Pradesh'];
const PROJECT_TYPES = ['Tower Erection','Tower Maintenance','Component Replacement','Fiber Installation','Civil Works','Power Works','Survey & Design','Testing & Commissioning'];

// Pull RM and PM from TEAM_MEMBERS
const REGIONAL_MANAGERS = TEAM_MEMBERS.filter(m => m.role === 'region_manager' && m.is_active).map(m => m.full_name);
const PROJECT_MANAGERS  = TEAM_MEMBERS.filter(m => m.role === 'project_manager' && m.is_active).map(m => m.full_name);

interface POItem {
  id: number;
  description: string;
  hsn: string;
  uom: string;
  qty: string;
  rate: string;
  gst: string;
  amount: number;
}

const emptyItem = (id: number): POItem => ({ id, description:'', hsn:'', uom:'Bag', qty:'', rate:'', gst:'18%', amount:0 });

const F = ({ label, required, children }: { label:string; required?:boolean; children:React.ReactNode }) => (
  <div style={{ marginBottom:16 }}>
    <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:6 }}>
      {label}{required && <span style={{ color:T.danger }}> *</span>}
    </label>
    {children}
  </div>
);

const Inp = ({ value, onChange, placeholder, type='text', readOnly }: { value:string; onChange?:(v:string)=>void; placeholder?:string; type?:string; readOnly?:boolean }) => (
  <input type={type} value={value} onChange={e=>onChange?.(e.target.value)} placeholder={placeholder} readOnly={readOnly}
    style={{ ...inputStyle(), width:'100%', boxSizing:'border-box' as const, ...(readOnly?{background:T.bg,color:T.textMuted,cursor:'not-allowed'}:{}) }} />
);

const Sel = ({ value, onChange, options, placeholder }: { value:string; onChange:(v:string)=>void; options:string[]; placeholder?:string }) => (
  <select value={value} onChange={e=>onChange(e.target.value)} style={{ ...inputStyle(), width:'100%', appearance:'none' as const }}>
    {placeholder && <option value="">{placeholder}</option>}
    {options.map(o=><option key={o}>{o}</option>)}
  </select>
);

const sectionTitle = (n: string, t: string) => (
  <div style={{ fontSize:14, fontWeight:700, color:T.primary, marginBottom:16, paddingBottom:8, borderBottom:`2px solid ${T.primaryMid}`, display:'flex', alignItems:'center', gap:8 }}>
    <span style={{ background:T.primary, color:'#fff', width:22, height:22, borderRadius:'50%', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, flexShrink:0 }}>{n}</span>
    {t}
  </div>
);

export default function NewProjectPage() {
  const router = useRouter();

  const { upload } = useUpload();
  const [sites,   setSites]   = useState(INIT_SITES);
  const [uoms,    setUoms]    = useState(INIT_UOMS);
  const [gstOpts, setGstOpts] = useState(INIT_GST);

  // 1. PO Details
  const [projectName,   setProjectName]   = useState('');
  const [site,          setSite]          = useState('');
  const [indusId,       setIndusId]       = useState('');
  const [poDate,        setPoDate]        = useState(new Date().toISOString().split('T')[0]);
  const [poNo,          setPoNo]          = useState(`PO-${new Date().toISOString().split('T')[0].replace(/-/g,'').slice(2)}-001`);
  const [projectNo,     setProjectNo]     = useState('');
  const [paymentTerms,  setPaymentTerms]  = useState('30 Days');
  const [currency,      setCurrency]      = useState('INR');
  const [region,        setRegion]        = useState('Tamil Nadu');
  const [projectType,   setProjectType]   = useState('Tower Erection');

  // 2. PO Items
  const [items, setItems] = useState<POItem[]>([emptyItem(1)]);
  const nextId = useRef(2);

  // 3. Attachments
  const [files, setFiles]       = useState<{name:string;size:string;url:string}[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // 4. Remarks
  const [remarks, setRemarks] = useState('');

  // 5. Right sidebar
  const [regionalManager, setRegionalManager] = useState('');
  const [projectManager,  setProjectManager]  = useState('');

  const [toast, setToast]   = useState<{msg:string;type:'success'|'error'|'info'}|null>(null);
  const [saving, setSaving] = useState(false);

  // Item calc
  const updateItem = (id: number, field: keyof POItem, val: string) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: val };
      updated.amount = (parseFloat(updated.qty)||0) * (parseFloat(updated.rate)||0);
      return updated;
    }));
  };

  const addItem    = () => setItems(p => [...p, emptyItem(nextId.current++)]);
  const removeItem = (id: number) => setItems(p => p.filter(i => i.id !== id));

  // Totals
  const subTotal = items.reduce((a,i) => a + i.amount, 0);
  const totalGst = items.reduce((a,i) => a + i.amount * (parseFloat(i.gst)||0) / 100, 0);
  const grandTotal  = subTotal + totalGst;
  const cgst        = totalGst / 2;
  const sgst        = totalGst / 2;
  const totalPOValue = Math.round(grandTotal);
  const fmt = (v: number) => `₹ ${v.toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2})}`;

  // File drop
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const fileList = Array.from(e.dataTransfer.files);
    setUploadingFile(true);
    for (const f of fileList) {
      if (f.size > 5 * 1024 * 1024) { setToast({ msg:`${f.name} exceeds 5MB limit.`, type:'error' }); continue; }
      try {
        const result = await upload(f, 'po-attachments');
        setFiles(p => [...p, { name: result.fileName, size: result.fileSize, url: result.publicUrl }]);
      } catch (err: any) {
        setToast({ msg: err.message || 'Upload failed', type:'error' });
      }
    }
    setUploadingFile(false);
  }, [upload]);

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from(e.target.files || []);
    setUploadingFile(true);
    for (const f of fileList) {
      if (f.size > 5 * 1024 * 1024) { setToast({ msg:`${f.name} exceeds 5MB limit.`, type:'error' }); continue; }
      try {
        const result = await upload(f, 'po-attachments');
        setFiles(p => [...p, { name: result.fileName, size: result.fileSize, url: result.publicUrl }]);
      } catch (err: any) {
        setToast({ msg: err.message || 'Upload failed', type:'error' });
      }
    }
    setUploadingFile(false);
  };

  const handleSubmit = (draft: boolean) => {
    if (!projectName) { setToast({ msg:'Project Name is required.', type:'error' }); return; }
    if (!site)        { setToast({ msg:'Site Name is required.', type:'error' }); return; }
    const hasItems = items.some(i => i.description && i.qty && i.rate);
    if (!hasItems) { setToast({ msg:'Please add at least one PO item.', type:'error' }); return; }
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setToast({ msg: draft ? `PO ${poNo} saved as Draft!` : `PO ${poNo} submitted for approval!`, type:'success' });
      setTimeout(() => router.push('/projects'), 1500);
    }, 800);
  };

  return (
    <Layout>
      <div className="fade-in">
        {/* Breadcrumb + Buttons */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:13 }}>
            <Link href="/dashboard" style={{ color:T.primary, textDecoration:'none', fontWeight:500 }}>Dashboard</Link>
            <span style={{ color:T.textDim }}>›</span>
            <Link href="/projects" style={{ color:T.primary, textDecoration:'none', fontWeight:500 }}>Projects</Link>
            <span style={{ color:T.textDim }}>›</span>
            <span style={{ color:T.text, fontWeight:600 }}>Add Purchase Order</span>
          </div>
          <div style={{ display:'flex', gap:8, flexShrink:0 }}>
            <Link href="/projects" style={{ textDecoration:'none' }}>
              <button style={{ ...btnSecondary, padding:'8px 18px', fontSize:13 }}>Cancel</button>
            </Link>
            <button onClick={()=>handleSubmit(true)} disabled={saving} style={{ ...btnSecondary, borderColor:T.warning, color:T.warning, padding:'8px 18px', fontSize:13 }}>
              💾 Save as Draft
            </button>
            <button onClick={()=>handleSubmit(false)} disabled={saving} style={{ ...btnPrimary, padding:'8px 22px', fontSize:13, opacity:saving?0.8:1 }}>
              {saving ? <><div className="spinner" style={{ borderTopColor:'#fff', borderColor:'rgba(255,255,255,0.3)', width:14, height:14 }} /> Submitting…</> : '📤 Submit PO'}
            </button>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:20, alignItems:'start' }}>
          {/* LEFT COLUMN */}
          <div>
            {/* 1. PO Details */}
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:24, marginBottom:16, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
              {sectionTitle('1','PO Details')}

              {/* Row 1: Project Name (full width) */}
              <F label="Project Name" required>
                <Inp value={projectName} onChange={setProjectName} placeholder="e.g. Chennai Metro Phase II" />
              </F>

              {/* Row 2: Site Name + Indus ID */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
                <CreatableSelect label="Site Name" required value={site} options={sites} onChange={setSite} onCreateNew={v=>setSites(p=>[...p,v])} placeholder="Select or create site…" />
                <F label="Indus ID"><Inp value={indusId} onChange={setIndusId} placeholder="IND-1001" /></F>
              </div>

              {/* Row 3: PO Date + PO No + Project No */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0 16px' }}>
                <F label="PO Date" required>
                  <input type="date" value={poDate} onChange={e=>setPoDate(e.target.value)} style={{ ...inputStyle(), width:'100%', boxSizing:'border-box' as const }} />
                </F>
                <F label="PO No." required><Inp value={poNo} onChange={setPoNo} placeholder="PO-2025-001" /></F>
                <F label="Project No."><Inp value={projectNo} onChange={setProjectNo} placeholder="PRJ-2025-001" /></F>
              </div>

              {/* Row 4: Region + Project Type + Payment Terms + Currency */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'0 16px' }}>
                <F label="Region *"><Sel value={region} onChange={setRegion} options={REGIONS} /></F>
                <F label="Project Type *"><Sel value={projectType} onChange={setProjectType} options={PROJECT_TYPES} /></F>
                <F label="Payment Terms"><Sel value={paymentTerms} onChange={setPaymentTerms} options={PAYMENT_TERMS} /></F>
                <F label="Currency"><Sel value={currency} onChange={setCurrency} options={CURRENCIES} /></F>
              </div>
            </div>

            {/* 2. PO Items */}
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:24, marginBottom:16, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
              {sectionTitle('2','PO Items')}
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', minWidth:800 }}>
                  <thead>
                    <tr style={{ background:T.bg }}>
                      {['#','Item Description *','HSN / SAC','UOM *','Quantity *','Rate (₹) *','GST (%)','Amount (₹)',''].map(h=>(
                        <th key={h} style={{ padding:'9px 8px', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, color:T.textMuted, textAlign:'left', borderBottom:`2px solid ${T.border}`, whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item,i) => (
                      <tr key={item.id} style={{ borderBottom:`1px solid ${T.border}` }}>
                        <td style={{ padding:'8px', color:T.textDim, fontSize:13, fontWeight:600, width:28 }}>{i+1}</td>
                        <td style={{ padding:'8px', minWidth:180 }}>
                          <input value={item.description} onChange={e=>updateItem(item.id,'description',e.target.value)} placeholder="Item description" style={{ ...inputStyle(), padding:'7px 8px', fontSize:12, width:'100%', boxSizing:'border-box' as const }} />
                        </td>
                        <td style={{ padding:'8px', width:80 }}>
                          <input value={item.hsn} onChange={e=>updateItem(item.id,'hsn',e.target.value)} placeholder="HSN" style={{ ...inputStyle(), padding:'7px 8px', fontSize:12, width:72, boxSizing:'border-box' as const }} />
                        </td>
                        <td style={{ padding:'8px', width:110 }}>
                          <CreatableSelect value={item.uom} options={uoms} onChange={v=>updateItem(item.id,'uom',v)} onCreateNew={v=>setUoms(p=>[...p,v])} placeholder="UOM" compact />
                        </td>
                        <td style={{ padding:'8px', width:90 }}>
                          <input type="number" value={item.qty} onChange={e=>updateItem(item.id,'qty',e.target.value)} placeholder="0" style={{ ...inputStyle(), padding:'7px 8px', fontSize:12, width:80, boxSizing:'border-box' as const, textAlign:'right' as const }} />
                        </td>
                        <td style={{ padding:'8px', width:100 }}>
                          <input type="number" value={item.rate} onChange={e=>updateItem(item.id,'rate',e.target.value)} placeholder="0.00" style={{ ...inputStyle(), padding:'7px 8px', fontSize:12, width:90, boxSizing:'border-box' as const, textAlign:'right' as const }} />
                        </td>
                        <td style={{ padding:'8px', width:100 }}>
                          <CreatableSelect value={item.gst} options={gstOpts} onChange={v=>{ updateItem(item.id,'gst',v); setGstOpts(p=>p.includes(v)?p:[...p,v]); }} onCreateNew={v=>{ const fv=v.includes('%')?v:v+'%'; setGstOpts(p=>[...p,fv]); updateItem(item.id,'gst',fv); }} placeholder="GST%" compact />
                        </td>
                        <td style={{ padding:'8px', fontSize:13, fontWeight:700, color:T.text, textAlign:'right' as const, whiteSpace:'nowrap', minWidth:100 }}>
                          {item.amount > 0 ? fmt(item.amount) : '—'}
                        </td>
                        <td style={{ padding:'8px', textAlign:'center' as const }}>
                          <button onClick={()=>removeItem(item.id)} disabled={items.length===1} style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:6, width:28, height:28, cursor:items.length===1?'not-allowed':'pointer', color:T.danger, fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', opacity:items.length===1?0.4:1 }}>🗑</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={addItem} style={{ ...btnSecondary, marginTop:12, fontSize:12 }}>+ Add Item</button>
            </div>

            {/* 3. Attachments */}
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:24, marginBottom:16, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
              {sectionTitle('3','Attachments (Optional)')}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                <div onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={handleDrop} onClick={()=>fileRef.current?.click()}
                  style={{ border:`2px dashed ${dragging?T.primary:T.border}`, borderRadius:10, padding:'28px 20px', textAlign:'center', cursor:'pointer', background:dragging?T.primaryLight:T.bg }}>
                  <input ref={fileRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls" onChange={handleFileInput} style={{ display:'none' }} />
                  <div style={{ fontSize:28, marginBottom:8 }}>☁️</div>
                  <div style={{ fontSize:13, color:T.textMuted, fontWeight:500 }}>Click to upload or drag & drop</div>
                  <div style={{ fontSize:11, color:T.textDim, marginTop:4 }}>(PDF, JPG, PNG, Excel) Max. 5MB</div>
                </div>
                <div>
                  {files.length === 0 ? (
                    <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:T.textDim, fontSize:12 }}>No files uploaded yet</div>
                  ) : (
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color:T.text, marginBottom:8 }}>Uploaded Files ({files.length})</div>
                      {files.map((f,i) => (
                        <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', background:T.bg, borderRadius:7, marginBottom:6, border:`1px solid ${T.border}` }}>
                          <span style={{ fontSize:16 }}>{f.name.endsWith('.pdf')?'📄':f.name.match(/\.(xlsx|xls)$/)?'📊':'🖼'}</span>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:12, fontWeight:500, color:T.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.name}</div>
                            <div style={{ fontSize:11, color:T.textDim }}>{f.size}</div>
                          </div>
                          <button onClick={()=>setFiles(p=>p.filter((_,j)=>j!==i))} style={{ background:'none', border:'none', color:T.danger, cursor:'pointer', fontSize:14 }}>🗑</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 4. Remarks */}
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:24, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
              {sectionTitle('4','Remarks (Optional)')}
              <textarea value={remarks} onChange={e=>setRemarks(e.target.value)} placeholder="Enter remarks…" maxLength={250} rows={3}
                style={{ ...inputStyle(), width:'100%', resize:'vertical', boxSizing:'border-box' as const }} />
              <div style={{ textAlign:'right', fontSize:11, color:T.textDim, marginTop:4 }}>{remarks.length}/250</div>
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div style={{ position:'sticky', top:80 }}>
            {/* 5. PO Summary */}
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:20, marginBottom:14, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
              {sectionTitle('5','PO Summary')}
              <div style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:`1px solid ${T.border}`, fontSize:13 }}>
                <span style={{ color:T.textMuted }}>Total Items</span>
                <span style={{ fontWeight:700, color:T.text }}>{items.filter(i=>i.description).length}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:`1px solid ${T.border}`, fontSize:13 }}>
                <span style={{ color:T.textMuted }}>Sub Total (Before Tax)</span>
                <span style={{ fontWeight:700, color:T.text }}>{fmt(subTotal)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:`1px solid ${T.border}`, fontSize:13 }}>
                <span style={{ color:T.textMuted }}>Total GST</span>
                <span style={{ fontWeight:700, color:T.text }}>{fmt(totalGst)}</span>
              </div>
              <div style={{ padding:'4px 0 4px 16px' }}>
                {[{l:'CGST',v:cgst},{l:'SGST',v:sgst}].map(r=>(
                  <div key={r.l} style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:T.textDim, padding:'2px 0' }}>
                    <span>{r.l}</span><span>{fmt(r.v)}</span>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderTop:`2px solid ${T.border}`, fontSize:14 }}>
                <span style={{ fontWeight:700, color:T.text }}>Grand Total (₹)</span>
                <span style={{ fontWeight:800, color:T.text }}>{fmt(grandTotal)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 12px', background:T.primaryLight, borderRadius:8, marginTop:8, border:`1px solid ${T.primaryMid}` }}>
                <span style={{ fontSize:13, fontWeight:700, color:T.primary }}>Total PO Value (₹)</span>
                <span style={{ fontSize:15, fontWeight:800, color:T.primary }}>{fmt(totalPOValue)}</span>
              </div>
            </div>

            {/* 6. Team Assignment (replaces Approval Details) */}
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:20, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
              {sectionTitle('6','Team Assignment')}
              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:6 }}>Regional Manager <span style={{ color:T.danger }}>*</span></label>
                <select value={regionalManager} onChange={e=>setRegionalManager(e.target.value)} style={{ ...inputStyle(), width:'100%', appearance:'none' as const }}>
                  <option value="">Select Regional Manager…</option>
                  {REGIONAL_MANAGERS.map(m=><option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:6 }}>Project Manager <span style={{ color:T.danger }}>*</span></label>
                <select value={projectManager} onChange={e=>setProjectManager(e.target.value)} style={{ ...inputStyle(), width:'100%', appearance:'none' as const }}>
                  <option value="">Select Project Manager…</option>
                  {PROJECT_MANAGERS.map(m=><option key={m}>{m}</option>)}
                </select>
              </div>

              <div style={{ marginTop:14, padding:'10px 14px', background:T.bg, borderRadius:8, fontSize:11, color:T.textDim }}>
                💡 Regional Manager and Project Manager lists are populated from the <Link href="/teams" style={{ color:T.primary, fontWeight:600 }}>Teams</Link> module.
              </div>
            </div>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </Layout>
  );
}
