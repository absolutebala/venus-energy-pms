import React, { useState } from 'react';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { T, card, badge, th, td, btnPrimary, btnSecondary, inputStyle } from '@/lib/theme';

const INITIAL_INVOICES = [
  { id:'INV-2025-012', project:'VE-2025-001', vendor:'ABC Telecom Services',  date:'20/05/2025', amount:925000,  gst:166500, total:1091500, status:'Approved',     payment:'Paid',    due:'19/06/2025' },
  { id:'INV-2025-011', project:'VE-2025-004', vendor:'NetConnect Services',   date:'15/05/2025', amount:615000,  gst:110700, total:725700,  status:'Submitted',    payment:'Pending', due:'14/06/2025' },
  { id:'INV-2025-010', project:'VE-2025-007', vendor:'PowerSys India',        date:'10/05/2025', amount:445000,  gst:80100,  total:525100,  status:'Under Review', payment:'Pending', due:'09/06/2025' },
  { id:'INV-2025-009', project:'VE-2025-002', vendor:'XYZ Infra Solutions',   date:'05/05/2025', amount:210000,  gst:37800,  total:247800,  status:'Rejected',     payment:'Pending', due:'04/06/2025' },
  { id:'INV-2025-008', project:'VE-2025-003', vendor:'TowerTech Pvt Ltd',     date:'28/04/2025', amount:380000,  gst:68400,  total:448400,  status:'Approved',     payment:'Paid',    due:'27/05/2025' },
  { id:'INV-2025-007', project:'VE-2025-005', vendor:'ABC Telecom Services',  date:'20/04/2025', amount:750000,  gst:135000, total:885000,  status:'Draft',        payment:'Pending', due:'20/06/2025' },
];

const VENDORS  = ['ABC Telecom Services','XYZ Infra Solutions','TowerTech Pvt Ltd','NetConnect Services','PowerSys India','BuildRight Constructions'];
const PROJECTS = ['VE-2025-001','VE-2025-002','VE-2025-003','VE-2025-004','VE-2025-005','VE-2025-006','VE-2025-007'];
const INV_STATUSES = ['All','Draft','Submitted','Under Review','Approved','Rejected'];
const GST_RATES = [5, 12, 18, 28];

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`;
const emptyForm = () => ({ project:'VE-2025-001', vendor:'ABC Telecom Services', date:'', amount:'', gstRate:'18', due:'', notes:'' });

export default function BillingPage() {
  const [invoices, setInvoices] = useState(INITIAL_INVOICES);
  const [filter, setFilter]     = useState('All');
  const [search, setSearch]     = useState('');
  const [focused, setFocused]   = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState(emptyForm());
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState<{msg:string;type:'success'|'error'|'info'}|null>(null);

  const filtered = invoices.filter(inv => {
    if (filter !== 'All' && inv.status !== filter) return false;
    if (search) return inv.id.toLowerCase().includes(search.toLowerCase()) || inv.vendor.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  const computedGst   = Math.round((Number(form.amount)||0) * (Number(form.gstRate)/100));
  const computedTotal = (Number(form.amount)||0) + computedGst;

  const handleSave = () => {
    if (!form.amount || !form.date) { setToast({ msg:'Invoice date and amount are required.', type:'error' }); return; }
    setSaving(true);
    setTimeout(() => {
      const newId = `INV-2025-0${String(invoices.length+7).padStart(2,'0')}`;
      setInvoices(prev => [{
        id:newId, project:form.project, vendor:form.vendor,
        date:form.date, amount:Number(form.amount), gst:computedGst,
        total:computedTotal, status:'Draft', payment:'Pending', due:form.due||'—',
      }, ...prev]);
      setToast({ msg:`Invoice ${newId} created as Draft!`, type:'success' });
      setSaving(false); setShowModal(false); setForm(emptyForm());
    }, 600);
  };

  const updateStatus = (inv: any, newStatus: string) => {
    setInvoices(prev => prev.map(i => i.id===inv.id ? { ...i, status:newStatus } : i));
    setToast({ msg:`Invoice ${inv.id} marked as ${newStatus}.`, type:'success' });
  };

  const F = ({ label, children }: { label:string; children:React.ReactNode }) => (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:5 }}>{label}</label>
      {children}
    </div>
  );

  const summaryCards = [
    { label:'Total PO Value',  value:'₹14.70 Cr', color:T.primary, icon:'📋' },
    { label:'Total Billed',    value:'₹9.25 Cr',  color:T.success, icon:'📄' },
    { label:'Pending Billing', value:'₹1.03 Cr',  color:T.warning, icon:'⏳' },
    { label:'Overdue Amount',  value:'₹45.2 L',   color:T.danger,  icon:'⚠️' },
  ];

  const invStatusCards = [
    { label:'Draft',        count:invoices.filter(i=>i.status==='Draft').length,        color:T.textDim },
    { label:'Submitted',    count:invoices.filter(i=>i.status==='Submitted').length,    color:T.info    },
    { label:'Under Review', count:invoices.filter(i=>i.status==='Under Review').length, color:T.purple  },
    { label:'Approved',     count:invoices.filter(i=>i.status==='Approved').length,     color:T.success },
    { label:'Rejected',     count:invoices.filter(i=>i.status==='Rejected').length,     color:T.danger  },
  ];

  return (
    <Layout>
      <div className="fade-in">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:16 }}>
          {summaryCards.map((s,i)=>(
            <div key={i} style={{ ...card, position:'relative', overflow:'hidden', padding:'16px 18px' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:s.color }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontSize:11, color:T.textMuted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:5 }}>{s.label}</div>
                  <div style={{ fontSize:20, fontWeight:700, color:T.text }}>{s.value}</div>
                </div>
                <div style={{ width:36, height:36, background:`${s.color}15`, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>{s.icon}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:16 }}>
          {invStatusCards.map((s,i)=>(
            <div key={i} onClick={()=>setFilter(s.label)} style={{ ...card, padding:14, textAlign:'center', borderTop:`3px solid ${s.color}`, cursor:'pointer', borderColor:filter===s.label?s.color:T.border }}
              onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.boxShadow='0 2px 8px rgba(0,0,0,0.08)'}
              onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.boxShadow='none'}>
              <div style={{ fontSize:28, fontWeight:700, color:s.color }}>{s.count}</div>
              <div style={{ fontSize:11, color:T.textMuted, marginTop:4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={card}>
          <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:16, flexWrap:'wrap' }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} placeholder="Search invoice or vendor…" style={{ ...inputStyle(focused), width:220 }} />
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              {INV_STATUSES.map(f=>(
                <button key={f} onClick={()=>setFilter(f)} style={{ padding:'6px 12px', borderRadius:6, border:'1px solid', borderColor:filter===f?T.primary:T.border, background:filter===f?T.primaryLight:'#fff', color:filter===f?T.primary:T.textMuted, fontSize:12, cursor:'pointer', fontWeight:filter===f?600:400 }}>{f}</button>
              ))}
            </div>
            <div style={{ marginLeft:'auto' }}><button onClick={()=>setShowModal(true)} style={btnPrimary}>+ Create Invoice</button></div>
          </div>

          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%' }}>
              <thead>
                <tr>{['Invoice No','Project','Vendor','Date','Amount','GST','Total','Status','Payment','Due Date','Actions'].map(h=><th key={h} style={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map((inv,i)=>(
                  <tr key={i}
                    onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background=T.bg}
                    onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background='transparent'}>
                    <td style={{ ...td, color:T.primary, fontWeight:700 }}>{inv.id}</td>
                    <td style={td}>{inv.project}</td>
                    <td style={{ ...td, fontSize:12 }}>{inv.vendor}</td>
                    <td style={td}>{inv.date}</td>
                    <td style={{ ...td, color:T.text, fontWeight:600 }}>{fmt(inv.amount)}</td>
                    <td style={td}>{fmt(inv.gst)}</td>
                    <td style={{ ...td, color:T.text, fontWeight:700 }}>{fmt(inv.total)}</td>
                    <td style={td}><span style={badge(inv.status)}>{inv.status}</span></td>
                    <td style={td}><span style={badge(inv.payment)}>{inv.payment}</span></td>
                    <td style={{ ...td, whiteSpace:'nowrap' }}>{inv.due}</td>
                    <td style={td}>
                      <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                        {inv.status==='Draft' && <button onClick={()=>updateStatus(inv,'Submitted')} style={{ background:T.infoBg, border:'none', borderRadius:5, padding:'4px 8px', color:T.info, cursor:'pointer', fontSize:11, fontWeight:500 }}>Submit</button>}
                        {inv.status==='Submitted' && <button onClick={()=>updateStatus(inv,'Approved')} style={{ background:T.successBg, border:'none', borderRadius:5, padding:'4px 8px', color:T.success, cursor:'pointer', fontSize:11, fontWeight:500 }}>Approve</button>}
                        {inv.status==='Submitted' && <button onClick={()=>updateStatus(inv,'Rejected')} style={{ background:'#FEF2F2', border:'none', borderRadius:5, padding:'4px 8px', color:T.danger, cursor:'pointer', fontSize:11, fontWeight:500 }}>Reject</button>}
                        <button onClick={()=>setToast({msg:`Downloading ${inv.id}...`,type:'info'})} style={{ background:T.primaryLight, border:'none', borderRadius:5, padding:'4px 7px', color:T.primary, cursor:'pointer', fontSize:11 }} title="Download">⬇</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding:'12px 0', borderTop:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:4 }}>
            <div style={{ fontSize:11, color:T.textDim }}>Showing {filtered.length} of {invoices.length} invoices</div>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ fontSize:12, color:T.textMuted }}>Total Paid: <strong style={{ color:T.success }}>₹8.22 Cr</strong></span>
              <span style={{ fontSize:12, color:T.textMuted }}>Pending: <strong style={{ color:T.warning }}>₹1.03 Cr</strong></span>
              <button onClick={()=>setToast({msg:'Payment gateway integration coming soon.',type:'info'})} style={{ ...btnPrimary, background:T.success }}>💳 Make Payment</button>
            </div>
          </div>
        </div>

        {showModal && (
          <Modal title="+ Create New Invoice" onClose={()=>{setShowModal(false);setForm(emptyForm());}} width={540}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
              <F label="Project *">
                <select value={form.project} onChange={e=>setForm(f=>({...f,project:e.target.value}))} style={{ ...inputStyle(), width:'100%' }}>
                  {PROJECTS.map(p=><option key={p}>{p}</option>)}
                </select>
              </F>
              <F label="Vendor *">
                <select value={form.vendor} onChange={e=>setForm(f=>({...f,vendor:e.target.value}))} style={{ ...inputStyle(), width:'100%' }}>
                  {VENDORS.map(v=><option key={v}>{v}</option>)}
                </select>
              </F>
              <F label="Invoice Date *"><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={{ ...inputStyle(), width:'100%' }} /></F>
              <F label="Due Date"><input type="date" value={form.due} onChange={e=>setForm(f=>({...f,due:e.target.value}))} style={{ ...inputStyle(), width:'100%' }} /></F>
              <F label="Amount (₹) *"><input type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} placeholder="925000" style={{ ...inputStyle(), width:'100%' }} /></F>
              <F label="GST Rate (%)">
                <select value={form.gstRate} onChange={e=>setForm(f=>({...f,gstRate:e.target.value}))} style={{ ...inputStyle(), width:'100%' }}>
                  {GST_RATES.map(r=><option key={r} value={r}>{r}%</option>)}
                </select>
              </F>
            </div>
            {form.amount && (
              <div style={{ background:T.primaryLight, border:`1px solid ${T.primaryMid}`, borderRadius:10, padding:14, marginBottom:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:6 }}><span style={{ color:T.textMuted }}>Sub Total</span><span style={{ fontWeight:600 }}>₹{Number(form.amount).toLocaleString('en-IN')}</span></div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:6 }}><span style={{ color:T.textMuted }}>GST ({form.gstRate}%)</span><span style={{ fontWeight:600 }}>₹{computedGst.toLocaleString('en-IN')}</span></div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:15, borderTop:`1px solid ${T.primaryMid}`, paddingTop:8 }}><span style={{ fontWeight:700, color:T.text }}>Total</span><span style={{ fontWeight:800, color:T.primary }}>₹{computedTotal.toLocaleString('en-IN')}</span></div>
              </div>
            )}
            <F label="Notes">
              <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Any notes for this invoice…" rows={2} style={{ ...inputStyle(), width:'100%', resize:'vertical', boxSizing:'border-box' as const }} />
            </F>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:8 }}>
              <button onClick={()=>{setShowModal(false);setForm(emptyForm());}} style={btnSecondary}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, opacity:saving?0.8:1, minWidth:140 }}>
                {saving ? <><div className="spinner" style={{ borderTopColor:'#fff', borderColor:'rgba(255,255,255,0.3)', width:14, height:14 }} /> Saving…</> : '+ Create Invoice'}
              </button>
            </div>
          </Modal>
        )}

        {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </Layout>
  );
}
