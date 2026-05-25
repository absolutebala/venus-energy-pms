import React, { useState } from 'react';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { T, card, btnPrimary, btnSecondary, btnDanger, th, td, inputStyle, badge } from '@/lib/theme';

const INITIAL_VENDORS = [
  { id:1, name:'ABC Telecom Services',     contact:'Rajesh Kumar', phone:'9876543210', email:'rajesh@abctelecom.com',   gst:'33AABCA1234B1ZS', projects:12, done:10, poValue:4560000, active:true,  inviteStatus:'active',           deactivationReason:'' },
  { id:2, name:'XYZ Infra Solutions',      contact:'Priya Sharma', phone:'9876543211', email:'priya@xyzinfra.com',      gst:'29AABCX5678C1ZS', projects:8,  done:5,  poValue:3240000, active:true,  inviteStatus:'active',           deactivationReason:'' },
  { id:3, name:'TowerTech Pvt Ltd',        contact:'Arun Singh',   phone:'9876543212', email:'arun@towertech.com',      gst:'36AABCT9012D1ZS', projects:6,  done:4,  poValue:2875000, active:true,  inviteStatus:'invitation_sent',  deactivationReason:'' },
  { id:4, name:'NetConnect Services',      contact:'Deepa Nair',   phone:'9876543213', email:'deepa@netconnect.com',    gst:'32AABCN3456E1ZS', projects:5,  done:2,  poValue:2010000, active:true,  inviteStatus:'active',           deactivationReason:'' },
  { id:5, name:'BuildRight Constructions', contact:'Vikram Patel',  phone:'9876543214', email:'vikram@buildright.com',   gst:'27AABCB7890F1ZS', projects:4,  done:1,  poValue:1580000, active:false, inviteStatus:'active',           deactivationReason:'Non-performance on last 3 projects. Missed deadlines repeatedly.' },
  { id:6, name:'PowerSys India',           contact:'Sunita Reddy',  phone:'9876543215', email:'sunita@powersys.com',     gst:'36AABCP1234G1ZS', projects:3,  done:2,  poValue:1350000, active:true,  inviteStatus:'not_sent',         deactivationReason:'' },
];

const emptyForm = () => ({ name:'', contact:'', phone:'', email:'', gst:'' });

export default function VendorsPage() {
  const [vendors, setVendors]         = useState(INITIAL_VENDORS);
  const [search, setSearch]           = useState('');
  const [focused, setFocused]         = useState(false);
  const [showModal, setShowModal]     = useState(false);
  const [editVendor, setEditVendor]   = useState<any>(null);
  const [form, setForm]               = useState(emptyForm());
  const [saving, setSaving]           = useState(false);
  const [toast, setToast]             = useState<{msg:string;type:'success'|'error'|'info'}|null>(null);

  // Deactivation modal
  const [deactivateTarget, setDeactivateTarget] = useState<any>(null);
  const [deactivateReason, setDeactivateReason] = useState('');

  // Invite sending state
  const [sendingInvite, setSendingInvite] = useState<number|null>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting]         = useState(false);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setTimeout(() => {
      setVendors(prev => prev.filter(v => v.id !== deleteTarget.id));
      setToast({ msg:`${deleteTarget.name} has been deleted.`, type:'info' });
      setDeleting(false);
      setDeleteTarget(null);
    }, 500);
  };

  const filtered = vendors.filter(v =>
    !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.contact.toLowerCase().includes(search.toLowerCase()) || v.email.toLowerCase().includes(search.toLowerCase()) || v.gst.toLowerCase().includes(search.toLowerCase())
  );

  const openNew  = () => { setForm(emptyForm()); setEditVendor(null); setShowModal(true); };
  const openEdit = (v: any) => { setForm({ name:v.name, contact:v.contact, phone:v.phone, email:v.email, gst:v.gst }); setEditVendor(v); setShowModal(true); };

  const handleSave = () => {
    if (!form.name || !form.email) { setToast({ msg:'Vendor name and email are required.', type:'error' }); return; }
    setSaving(true);
    setTimeout(() => {
      if (editVendor) {
        setVendors(prev => prev.map(v => v.id===editVendor.id ? { ...v, ...form } : v));
        setToast({ msg:'Vendor updated successfully!', type:'success' });
      } else {
        const newId = Math.max(...vendors.map(v=>v.id)) + 1;
        setVendors(prev => [...prev, { id:newId, ...form, projects:0, done:0, poValue:0, active:true, inviteStatus:'not_sent', deactivationReason:'' }]);
        setToast({ msg:`Vendor "${form.name}" created. Send invitation to grant portal access.`, type:'success' });
      }
      setSaving(false); setShowModal(false);
    }, 600);
  };

  const openDeactivate = (v: any) => { setDeactivateTarget(v); setDeactivateReason(''); };

  const confirmDeactivate = () => {
    if (!deactivateReason.trim()) { setToast({ msg:'Please provide a reason for deactivation.', type:'error' }); return; }
    setVendors(prev => prev.map(v => v.id===deactivateTarget.id ? { ...v, active:false, deactivationReason:deactivateReason.trim() } : v));
    setToast({ msg:`${deactivateTarget.name} has been deactivated.`, type:'info' });
    setDeactivateTarget(null); setDeactivateReason('');
  };

  const activate = (v: any) => {
    setVendors(prev => prev.map(x => x.id===v.id ? { ...x, active:true, deactivationReason:'' } : x));
    setToast({ msg:`${v.name} has been activated.`, type:'success' });
  };

  const sendInvite = async (v: any) => {
    setSendingInvite(v.id);
    // Call API to send Supabase invite
    try {
      const res = await fetch('/api/admin/invite-user', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email:v.email, role:'vendor', full_name:v.contact }),
      });
      if (res.ok) {
        setVendors(prev => prev.map(x => x.id===v.id ? { ...x, inviteStatus:'invitation_sent' } : x));
        setToast({ msg:`Invitation sent to ${v.email}!`, type:'success' });
      } else {
        const d = await res.json();
        setToast({ msg: d.error || 'Failed to send invitation.', type:'error' });
      }
    } catch {
      setToast({ msg:'Network error. Please try again.', type:'error' });
    }
    setSendingInvite(null);
  };

  const inviteBadge = (status: string) => {
    const map: Record<string,[string,string,string]> = {
      active:          [T.successBg,'#BBF7D0',T.success],
      invitation_sent: [T.infoBg,'#BFDBFE',T.info],
      not_sent:        [T.bg,T.border,T.textDim],
    };
    const [bg,border,color] = map[status] || map.not_sent;
    const label = status==='active'?'Active':status==='invitation_sent'?'Invitation Sent':'Not Invited';
    return <span style={{ background:bg, border:`1px solid ${border}`, color, fontSize:11, fontWeight:600, padding:'2px 9px', borderRadius:20 }}>{label}</span>;
  };

  const F = ({ label, children }: { label:string; children:React.ReactNode }) => (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:5 }}>{label}</label>
      {children}
    </div>
  );

  return (
    <Layout>
      <div className="fade-in">
        {/* Summary */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
          {[
            { label:'Total Vendors',  value:vendors.length,                   color:T.primary, icon:'🏢' },
            { label:'Active',         value:vendors.filter(v=>v.active).length,   color:T.success, icon:'✅' },
            { label:'Invited',        value:vendors.filter(v=>v.inviteStatus==='invitation_sent'||v.inviteStatus==='active').length, color:T.info, icon:'🔗' },
            { label:'Total PO Value', value:`₹${(vendors.reduce((a,v)=>a+v.poValue,0)/10000000).toFixed(2)}Cr`, color:T.warning, icon:'💰' },
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
            <input value={search} onChange={e=>setSearch(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} placeholder="Search vendor, contact, email, GST…" style={{ ...inputStyle(focused), width:260 }} />
            <button onClick={openNew} style={btnPrimary}>+ Add Vendor</button>
          </div>

          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%' }}>
              <thead>
                <tr>{['Vendor Name','Contact Details','GST No.','Projects','PO Value','Status','Actions'].map(h=><th key={h} style={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map((v,i)=>(
                  <tr key={i}
                    onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background=T.bg}
                    onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background='transparent'}>
                    <td style={{ ...td, fontWeight:600, color:T.text }}>
                      <div>{v.name}</div>
                      <div style={{ fontSize:11, color:T.textDim }}>{v.email}</div>
                      {!v.active && v.deactivationReason && (
                        <div style={{ fontSize:11, color:T.danger, marginTop:4, fontStyle:'italic' }}>
                          Reason: {v.deactivationReason}
                        </div>
                      )}
                    </td>
                    <td style={td}>
                      <div style={{ fontSize:12 }}>{v.contact}</div>
                      <div style={{ fontSize:11, color:T.textDim }}>{v.phone}</div>
                    </td>
                    <td style={{ ...td, fontSize:12 }}>{v.gst || '—'}</td>
                    <td style={td}>{v.projects} ({v.done} done)</td>
                    <td style={{ ...td, fontWeight:600, color:T.text, whiteSpace:'nowrap' }}>₹{(v.poValue/100000).toFixed(2)}L</td>
                    <td style={td}>
                      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                        <span style={{ fontSize:11, fontWeight:600, color:v.active?T.success:T.danger, background:v.active?T.successBg:'#FEF2F2', padding:'3px 10px', borderRadius:20, display:'inline-block' }}>
                          {v.active ? 'Active' : 'Deactivated'}
                        </span>
                        {v.active && (v.inviteStatus === 'not_sent' || v.inviteStatus === 'invitation_sent') && (
                          <button
                            onClick={() => sendInvite(v)}
                            disabled={sendingInvite === v.id}
                            style={{ background:T.primaryLight, border:`1px solid ${T.primaryMid}`, borderRadius:5, padding:'3px 8px', color:T.primary, cursor:'pointer', fontSize:10, fontWeight:600 }}>
                            {sendingInvite===v.id ? '…' : v.inviteStatus==='invitation_sent' ? '↩ Resend Invite' : '✉ Send Invite'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={td}>
                      <div style={{ display:'flex', gap:4 }}>
                        <button onClick={()=>openEdit(v)} style={{ background:T.primaryLight, border:'none', borderRadius:5, padding:'4px 8px', color:T.primary, cursor:'pointer', fontSize:12 }} title="Edit">✏️</button>
                        {v.active
                          ? <button onClick={()=>openDeactivate(v)} style={{ background:'#FEF2F2', border:'none', borderRadius:5, padding:'4px 8px', color:T.danger, cursor:'pointer', fontSize:11, fontWeight:500 }}>Deactivate</button>
                          : <button onClick={()=>activate(v)} style={{ background:T.successBg, border:'none', borderRadius:5, padding:'4px 8px', color:T.success, cursor:'pointer', fontSize:11, fontWeight:500 }}>Activate</button>
                        }
                        <button onClick={()=>setDeleteTarget(v)} style={{ background:T.dangerBg, border:'none', borderRadius:5, padding:'4px 8px', color:T.danger, cursor:'pointer', fontSize:11, fontWeight:500 }}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add / Edit Vendor Modal — no performance scores */}
        {showModal && (
          <Modal title={editVendor ? `Edit — ${editVendor.name}` : '+ Add New Vendor'} onClose={() => setShowModal(false)} width={500}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
              <div style={{ gridColumn:'1/-1' }}>
                <F label="Vendor / Company Name *">
                  <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="ABC Telecom Services Pvt Ltd" style={{ ...inputStyle(), width:'100%', boxSizing:'border-box' as const }} />
                </F>
              </div>
              <F label="Contact Person">
                <input value={form.contact} onChange={e=>setForm(f=>({...f,contact:e.target.value}))} placeholder="Rajesh Kumar" style={{ ...inputStyle(), width:'100%', boxSizing:'border-box' as const }} />
              </F>
              <F label="Phone">
                <input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="9876543210" style={{ ...inputStyle(), width:'100%', boxSizing:'border-box' as const }} />
              </F>
              <F label="Email Address *">
                <input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="contact@vendor.com" type="email" style={{ ...inputStyle(), width:'100%', boxSizing:'border-box' as const }} />
              </F>
              <F label="GST Number">
                <input value={form.gst} onChange={e=>setForm(f=>({...f,gst:e.target.value}))} placeholder="33AABCA1234B1ZS" style={{ ...inputStyle(), width:'100%', boxSizing:'border-box' as const }} />
              </F>
            </div>
            {!editVendor && (
              <div style={{ background:T.infoBg, border:`1px solid #BFDBFE`, borderRadius:8, padding:'10px 14px', marginBottom:14, fontSize:12, color:T.info }}>
                ℹ️ After creating the vendor, use "Send Invite" to grant them portal access. They will receive a setup email.
              </div>
            )}
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:8 }}>
              <button onClick={() => setShowModal(false)} style={btnSecondary}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, opacity:saving?0.8:1, minWidth:130 }}>
                {saving ? <><div className="spinner" style={{ borderTopColor:'#fff', borderColor:'rgba(255,255,255,0.3)', width:14, height:14 }} /> Saving…</> : editVendor ? '💾 Update' : '+ Add Vendor'}
              </button>
            </div>
          </Modal>
        )}

        {/* Deactivate Reason Modal */}
        {deactivateTarget && (
          <Modal title={`Deactivate — ${deactivateTarget.name}`} onClose={() => setDeactivateTarget(null)} width={460}>
            <p style={{ fontSize:13, color:T.textMuted, marginBottom:16 }}>
              Please provide the reason for deactivating this vendor. This will be visible to admins.
            </p>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:6 }}>Reason for Deactivation *</label>
              <textarea
                value={deactivateReason}
                onChange={e=>setDeactivateReason(e.target.value)}
                placeholder="e.g. Non-performance, project delays, compliance issues…"
                rows={4}
                style={{ ...inputStyle(), width:'100%', resize:'vertical', boxSizing:'border-box' as const }}
              />
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
              <button onClick={()=>setDeactivateTarget(null)} style={btnSecondary}>Cancel</button>
              <button onClick={confirmDeactivate} style={{ ...btnDanger, padding:'8px 18px', fontSize:13, fontWeight:600, cursor:'pointer', borderRadius:8 }}>
                ⛔ Confirm Deactivation
              </button>
            </div>
          </Modal>
        )}

        {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </Layout>
  );
}
