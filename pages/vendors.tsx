import React, { useState } from 'react';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { T, card, btnPrimary, btnSecondary, th, td, inputStyle } from '@/lib/theme';

const INITIAL_VENDORS = [
  { id:1, name:'ABC Telecom Services',     contact:'Rajesh Kumar', phone:'9876543210', email:'rajesh@abctelecom.com',   gst:'33AABCA1234B1ZS', projects:12, done:10, onTime:92, quality:90, safety:95, billing:98, score:93.8, rating:'Excellent',  poValue:4560000, active:true },
  { id:2, name:'XYZ Infra Solutions',      contact:'Priya Sharma', phone:'9876543211', email:'priya@xyzinfra.com',      gst:'29AABCX5678C1ZS', projects:8,  done:5,  onTime:80, quality:85, safety:88, billing:90, score:85.8, rating:'Very Good',  poValue:3240000, active:true },
  { id:3, name:'TowerTech Pvt Ltd',        contact:'Arun Singh',   phone:'9876543212', email:'arun@towertech.com',      gst:'36AABCT9012D1ZS', projects:6,  done:4,  onTime:75, quality:82, safety:85, billing:88, score:82.5, rating:'Good',       poValue:2875000, active:true },
  { id:4, name:'NetConnect Services',      contact:'Deepa Nair',   phone:'9876543213', email:'deepa@netconnect.com',    gst:'32AABCN3456E1ZS', projects:5,  done:2,  onTime:65, quality:75, safety:78, billing:80, score:74.5, rating:'Average',    poValue:2010000, active:true },
  { id:5, name:'BuildRight Constructions', contact:'Vikram Patel',  phone:'9876543214', email:'vikram@buildright.com',   gst:'27AABCB7890F1ZS', projects:4,  done:1,  onTime:50, quality:68, safety:72, billing:65, score:63.8, rating:'Poor',       poValue:1580000, active:false},
  { id:6, name:'PowerSys India',           contact:'Sunita Reddy',  phone:'9876543215', email:'sunita@powersys.com',     gst:'36AABCP1234G1ZS', projects:3,  done:2,  onTime:85, quality:80, safety:90, billing:85, score:85.0, rating:'Very Good',  poValue:1350000, active:true },
];

const ratingColor = (r: string) => ({ Excellent:'#16A34A','Very Good':'#2563EB', Good:'#D97706', Average:'#EA580C', Poor:'#DC2626' }[r] || '#64748B');
const emptyForm = () => ({ name:'', contact:'', phone:'', email:'', gst:'', onTime:'80', quality:'80', safety:'80', billing:'80', active:true });

export default function VendorsPage() {
  const [vendors, setVendors]   = useState(INITIAL_VENDORS);
  const [search, setSearch]     = useState('');
  const [focused, setFocused]   = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editVendor, setEditVendor] = useState<any>(null);
  const [form, setForm]           = useState(emptyForm());
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState<{msg:string;type:'success'|'error'|'info'}|null>(null);

  const filtered = vendors.filter(v => !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.contact.toLowerCase().includes(search.toLowerCase()));

  const openNew  = () => { setForm(emptyForm()); setEditVendor(null); setShowModal(true); };
  const openEdit = (v: any) => { setForm({ name:v.name, contact:v.contact, phone:v.phone, email:v.email, gst:v.gst, onTime:String(v.onTime), quality:String(v.quality), safety:String(v.safety), billing:String(v.billing), active:v.active }); setEditVendor(v); setShowModal(true); };

  const handleSave = () => {
    if (!form.name) { setToast({ msg:'Vendor name is required.', type:'error' }); return; }
    setSaving(true);
    setTimeout(() => {
      const score = ((Number(form.onTime)+Number(form.quality)+Number(form.safety)+Number(form.billing))/4);
      const rating = score>=90?'Excellent':score>=80?'Very Good':score>=70?'Good':score>=60?'Average':'Poor';
      if (editVendor) {
        setVendors(prev => prev.map(v => v.id===editVendor.id ? { ...v, ...form, onTime:Number(form.onTime), quality:Number(form.quality), safety:Number(form.safety), billing:Number(form.billing), score:Math.round(score*10)/10, rating } : v));
        setToast({ msg:'Vendor updated successfully!', type:'success' });
      } else {
        const newId = Math.max(...vendors.map(v=>v.id))+1;
        setVendors(prev => [...prev, { id:newId, ...form, onTime:Number(form.onTime), quality:Number(form.quality), safety:Number(form.safety), billing:Number(form.billing), score:Math.round(score*10)/10, rating, projects:0, done:0, poValue:0 }]);
        setToast({ msg:'Vendor added successfully!', type:'success' });
      }
      setSaving(false); setShowModal(false);
    }, 600);
  };

  const toggleActive = (v: any) => {
    setVendors(prev => prev.map(x => x.id===v.id ? { ...x, active:!x.active } : x));
    setToast({ msg:`${v.name} ${v.active?'deactivated':'activated'}.`, type:'info' });
  };

  const ScoreBar = ({ val, color }: { val:number; color:string }) => (
    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
      <div style={{ width:50, height:4, background:T.border, borderRadius:2 }}>
        <div style={{ height:'100%', width:`${val}%`, background:color, borderRadius:2 }} />
      </div>
      <span style={{ fontSize:11 }}>{val}</span>
    </div>
  );

  const F = ({ label, children }: { label:string; children:React.ReactNode }) => (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:5 }}>{label}</label>
      {children}
    </div>
  );

  return (
    <Layout>
      <div className="fade-in">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
          {[
            { label:'Total Vendors',  value:vendors.length,                 color:T.primary, icon:'🏢' },
            { label:'Active',         value:vendors.filter(v=>v.active).length, color:T.success, icon:'✅' },
            { label:'Avg Score',      value:(vendors.reduce((a,v)=>a+v.score,0)/vendors.length).toFixed(1), color:T.warning, icon:'⭐' },
            { label:'Total PO Value', value:`₹${(vendors.reduce((a,v)=>a+v.poValue,0)/10000000).toFixed(2)}Cr`, color:T.info, icon:'💰' },
          ].map((s,i)=>(
            <div key={i} style={{ ...card, position:'relative', overflow:'hidden', padding:'16px 18px' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:s.color }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:11, color:T.textMuted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>{s.label}</div>
                  <div style={{ fontSize:26, fontWeight:700, color:T.text }}>{s.value}</div>
                </div>
                <div style={{ fontSize:22 }}>{s.icon}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} placeholder="Search vendor or contact…" style={{ ...inputStyle(focused), width:260 }} />
            <button onClick={openNew} style={btnPrimary}>+ Add Vendor</button>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%' }}>
              <thead>
                <tr>{['Vendor Name','Contact','On-Time %','Quality','Safety','Billing','Score','Rating','PO Value','Status','Actions'].map(h=><th key={h} style={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map((v,i)=>(
                  <tr key={i}
                    onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background=T.bg}
                    onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background='transparent'}>
                    <td style={{ ...td, color:T.text, fontWeight:600 }}>
                      <div>{v.name}</div>
                      <div style={{ fontSize:11, color:T.textDim }}>{v.email}</div>
                    </td>
                    <td style={td}>
                      <div style={{ fontSize:12 }}>{v.contact}</div>
                      <div style={{ fontSize:11, color:T.textDim }}>{v.phone}</div>
                    </td>
                    <td style={{ ...td, fontWeight:700, color:v.onTime>=85?T.success:v.onTime>=70?T.warning:T.danger }}>{v.onTime}%</td>
                    <td style={td}><ScoreBar val={v.quality}  color={T.primary} /></td>
                    <td style={td}><ScoreBar val={v.safety}   color={T.success} /></td>
                    <td style={td}><ScoreBar val={v.billing}  color={T.warning} /></td>
                    <td style={{ ...td, fontWeight:700, color:ratingColor(v.rating), fontSize:14 }}>{v.score}</td>
                    <td style={td}><span style={{ color:ratingColor(v.rating), background:`${ratingColor(v.rating)}18`, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600 }}>{v.rating}</span></td>
                    <td style={{ ...td, fontWeight:600, color:T.text, whiteSpace:'nowrap' }}>₹{(v.poValue/100000).toFixed(2)}L</td>
                    <td style={td}><span style={{ fontSize:11, fontWeight:600, color:v.active?T.success:T.danger, background:v.active?T.successBg:'#FEF2F2', padding:'3px 10px', borderRadius:20 }}>{v.active?'Active':'Inactive'}</span></td>
                    <td style={td}>
                      <div style={{ display:'flex', gap:4 }}>
                        <button onClick={()=>openEdit(v)} style={{ background:T.primaryLight, border:'none', borderRadius:5, padding:'4px 8px', color:T.primary, cursor:'pointer', fontSize:12 }} title="Edit">✏️</button>
                        <button onClick={()=>toggleActive(v)} style={{ background:v.active?'#FEF2F2':T.successBg, border:'none', borderRadius:5, padding:'4px 8px', color:v.active?T.danger:T.success, cursor:'pointer', fontSize:11, fontWeight:500 }}>{v.active?'Deactivate':'Activate'}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {showModal && (
          <Modal title={editVendor ? `Edit Vendor — ${editVendor.name}` : '+ Add New Vendor'} onClose={() => setShowModal(false)} width={560}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
              <div style={{ gridColumn:'1/-1' }}><F label="Vendor / Company Name *"><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="ABC Telecom Services Pvt Ltd" style={{ ...inputStyle(), width:'100%', boxSizing:'border-box' as const }} /></F></div>
              <F label="Contact Person"><input value={form.contact} onChange={e=>setForm(f=>({...f,contact:e.target.value}))} placeholder="Rajesh Kumar" style={{ ...inputStyle(), width:'100%', boxSizing:'border-box' as const }} /></F>
              <F label="Phone"><input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="9876543210" style={{ ...inputStyle(), width:'100%', boxSizing:'border-box' as const }} /></F>
              <F label="Email"><input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="contact@vendor.com" type="email" style={{ ...inputStyle(), width:'100%', boxSizing:'border-box' as const }} /></F>
              <F label="GST Number"><input value={form.gst} onChange={e=>setForm(f=>({...f,gst:e.target.value}))} placeholder="33AABCA1234B1ZS" style={{ ...inputStyle(), width:'100%', boxSizing:'border-box' as const }} /></F>
            </div>
            <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:10, padding:14, margin:'8px 0 14px' }}>
              <div style={{ fontSize:13, fontWeight:600, color:T.text, marginBottom:12 }}>Performance Scores (0–100)</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 16px' }}>
                {[{label:'On-Time Delivery', key:'onTime'},{label:'Quality Score', key:'quality'},{label:'Safety Score', key:'safety'},{label:'Billing Timeliness', key:'billing'}].map(({label,key}) => (
                  <div key={key}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:T.textMuted, marginBottom:4 }}><span>{label}</span><span style={{ fontWeight:700, color:T.primary }}>{(form as any)[key]}</span></div>
                    <input type="range" min="0" max="100" value={(form as any)[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} style={{ width:'100%' }} />
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
              <label style={{ fontSize:13, fontWeight:600, color:T.text }}>Status:</label>
              <button onClick={()=>setForm(f=>({...f,active:!f.active}))} style={{ background:form.active?T.successBg:'#FEF2F2', border:`1px solid ${form.active?'#BBF7D0':'#FECACA'}`, borderRadius:20, padding:'4px 16px', fontSize:12, fontWeight:600, color:form.active?T.success:T.danger, cursor:'pointer' }}>{form.active?'✅ Active':'⛔ Inactive'}</button>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
              <button onClick={() => setShowModal(false)} style={btnSecondary}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, opacity:saving?0.8:1, minWidth:130 }}>
                {saving ? <><div className="spinner" style={{ borderTopColor:'#fff', borderColor:'rgba(255,255,255,0.3)', width:14, height:14 }} /> Saving…</> : editVendor ? '💾 Update Vendor' : '+ Add Vendor'}
              </button>
            </div>
          </Modal>
        )}

        {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </Layout>
  );
}
