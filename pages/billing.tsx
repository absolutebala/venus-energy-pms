import React, { useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { useAuth } from '@/context/AuthContext';
import { useInvoices } from '@/context/InvoiceContext';
import { useProjects } from '@/context/ProjectContext';
import { T, card, btnPrimary, btnSecondary, inputStyle } from '@/lib/theme';

const fmt    = (v: number) => `₹${Number(v).toLocaleString('en-IN')}`;
const fmtCr  = (v: number) => v >= 10000000 ? `₹${(v/10000000).toFixed(2)} Cr` : `₹${(v/100000).toFixed(1)}L`;
const fmtDate = (d: string) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); }
  catch { return d; }
};

const INV_STATUSES = ['All','Draft','Submitted','Under Review','Approved','Rejected'];
const GST_RATES    = [5, 12, 18, 28];

const INV_STATUS_CFG: Record<string,{color:string;bg:string}> = {
  Approved:      { color:'#0D9488', bg:'#F0FDFA' },
  Submitted:     { color:'#2563EB', bg:'#EFF6FF' },
  'Under Review':{ color:'#7C3AED', bg:'#F5F3FF' },
  Rejected:      { color:'#DC2626', bg:'#FEF2F2' },
  Draft:         { color:'#6B7280', bg:'#F9FAFB' },
};
const PAY_CFG: Record<string,{color:string;bg:string}> = {
  Paid:    { color:'#0D9488', bg:'#F0FDFA' },
  Pending: { color:'#D97706', bg:'#FFFBEB' },
  Partial: { color:'#2563EB', bg:'#EFF6FF' },
};

const StatusPill = ({ label, cfg }: { label:string; cfg:{color:string;bg:string} }) => (
  <span style={{ fontSize:11, fontWeight:700, color:cfg.color, background:cfg.bg,
    padding:'2px 8px', borderRadius:20, whiteSpace:'nowrap' as const }}>{label}</span>
);

const emptyForm = (projectId='', poNo='') => ({
  invoiceNo:'', projectId, poNo, workBoqRef:'', invoiceAmount:'',
  gstRate:'18', dueDate:'', invoiceDate:'', invoiceStatus:'Draft', paymentStatus:'Pending',
});

export default function BillingPage() {
  const { profile, can, loading: authLoading } = useAuth();
  const { invoices, loading: invLoading, addInvoice, updateInvoice } = useInvoices();
  const { projects, loading: projLoading } = useProjects();

  const [filter,    setFilter]    = useState('All');
  const [search,    setSearch]    = useState('');
  const [focused,   setFocused]   = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [toast,     setToast]     = useState<any>(null);
  const [form,      setForm]      = useState(emptyForm());

  const canCreate = !authLoading && can('invoices','create');
  const loading   = invLoading || projLoading;

  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      if (filter !== 'All' && inv.invoiceStatus !== filter) return false;
      if (search) {
        const s = search.toLowerCase();
        return inv.invoiceNo.toLowerCase().includes(s) ||
               inv.projectId.toLowerCase().includes(s) ||
               inv.poNo.toLowerCase().includes(s);
      }
      return true;
    });
  }, [invoices, filter, search]);

  // Financial summaries from real Supabase data
  const totalPO      = (projects as any[]).reduce((a,p)=>a+(p.poValue||0),0);
  const totalBilled  = invoices.reduce((a,i)=>a+i.totalAmount,0);
  const totalPending = invoices.filter(i=>i.paymentStatus==='Pending').reduce((a,i)=>a+i.totalAmount,0);
  const today        = new Date();
  const overdue      = invoices.filter(i=>i.paymentStatus!=='Paid'&&i.dueDate&&new Date(i.dueDate)<today).reduce((a,i)=>a+i.totalAmount,0);
  const totalPaid    = invoices.filter(i=>i.paymentStatus==='Paid').reduce((a,i)=>a+i.totalAmount,0);

  const computedGst   = Math.round((Number(form.invoiceAmount)||0) * (Number(form.gstRate)/100));
  const computedTotal = (Number(form.invoiceAmount)||0) + computedGst;

  const handleProjectChange = (projectId: string) => {
    const proj = (projects as any[]).find(p=>p.id===projectId);
    setForm(f=>({...f, projectId, poNo: proj?.poNo||'' }));
  };

  const handleSave = async () => {
    if (!form.invoiceNo || !form.invoiceAmount || !form.invoiceDate) {
      setToast({ msg:'Invoice No, Date and Amount are required', type:'error' }); return;
    }
    setSaving(true);
    try {
      await addInvoice({
        invoiceNo: form.invoiceNo, invoiceDate: form.invoiceDate,
        workBoqRef: form.workBoqRef, invoiceAmount: Number(form.invoiceAmount),
        gst: computedGst, totalAmount: computedTotal,
        invoiceStatus: form.invoiceStatus, paymentStatus: form.paymentStatus,
        dueDate: form.dueDate, projectId: form.projectId, poNo: form.poNo,
        createdBy: profile?.full_name||'',
      });
      setToast({ msg:`✅ Invoice ${form.invoiceNo} created`, type:'success' });
      setShowModal(false);
      setForm(emptyForm());
    } catch(err:any) {
      setToast({ msg:'❌ '+err.message, type:'error' });
    } finally { setSaving(false); }
  };

  const handleUpdateStatus = async (inv: any, newStatus: string) => {
    try {
      await updateInvoice(inv.id, { invoiceStatus: newStatus });
      setToast({ msg:`✅ Invoice ${inv.invoiceNo} marked as ${newStatus}`, type:'success' });
    } catch(err:any) {
      setToast({ msg:'❌ '+err.message, type:'error' });
    }
  };

  const F = ({ label, children }: { label:string; children:React.ReactNode }) => (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:5 }}>{label}</label>
      {children}
    </div>
  );

  const thS: React.CSSProperties = { padding:'9px 12px', fontSize:10, fontWeight:700, textTransform:'uppercase',
    color:T.primary, background:T.primaryLight, textAlign:'left' as const, borderBottom:`2px solid ${T.primaryMid}`, whiteSpace:'nowrap' as const };
  const tdS: React.CSSProperties = { padding:'10px 12px', fontSize:12, borderBottom:`1px solid ${T.border}`, verticalAlign:'middle' as const };

  return (
    <Layout>
      <div className="fade-in">
        {/* Financial summary cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:16 }}>
          {[
            { label:'Total PO Value',  value:fmtCr(totalPO),      color:T.primary, icon:'📋' },
            { label:'Total Billed',    value:fmtCr(totalBilled),  color:T.success, icon:'📄' },
            { label:'Pending Payment', value:fmtCr(totalPending), color:T.warning, icon:'⏳' },
            { label:'Overdue Amount',  value:fmtCr(overdue),      color:T.danger,  icon:'⚠️' },
          ].map((s,i)=>(
            <div key={i} style={{ ...card, position:'relative', overflow:'hidden', padding:'16px 18px' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:s.color }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontSize:11, color:T.textMuted, textTransform:'uppercase', marginBottom:5 }}>{s.label}</div>
                  <div style={{ fontSize:20, fontWeight:700, color:s.color }}>{s.value}</div>
                </div>
                <div style={{ fontSize:20 }}>{s.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Invoice status cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:16 }}>
          {['Draft','Submitted','Under Review','Approved','Rejected'].map(s=>{
            const cfg = INV_STATUS_CFG[s] || INV_STATUS_CFG.Draft;
            const count = invoices.filter(i=>i.invoiceStatus===s).length;
            return (
              <div key={s} onClick={()=>setFilter(filter===s?'All':s)}
                style={{ ...card, padding:14, textAlign:'center' as const, cursor:'pointer',
                  borderTop:`3px solid ${filter===s?cfg.color:T.border}`,
                  background:filter===s?cfg.bg:'#fff' }}>
                <div style={{ fontSize:28, fontWeight:700, color:cfg.color }}>{count}</div>
                <div style={{ fontSize:11, color:T.textMuted, marginTop:4 }}>{s}</div>
              </div>
            );
          })}
        </div>

        {/* Invoice table */}
        <div style={card}>
          <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:16, flexWrap:'wrap' }}>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
              placeholder="Search invoice, project, PO…" style={{ ...inputStyle(focused), width:220 }} />
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              {INV_STATUSES.map(f=>(
                <button key={f} onClick={()=>setFilter(f)}
                  style={{ padding:'6px 12px', borderRadius:6, border:'1px solid', cursor:'pointer', fontSize:12,
                    borderColor:filter===f?T.primary:T.border,
                    background:filter===f?T.primaryLight:'#fff',
                    color:filter===f?T.primary:T.textMuted,
                    fontWeight:filter===f?600:400 }}>{f}</button>
              ))}
            </div>
            {canCreate && (
              <div style={{ marginLeft:'auto' }}>
                <button onClick={()=>setShowModal(true)} style={btnPrimary}>+ Create Invoice</button>
              </div>
            )}
          </div>

          <div style={{ overflowX:'auto' as const }}>
            <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
              <thead>
                <tr>{['Invoice No','Project','PO No','Invoice Date','Amount','GST','Total','Inv. Status','Pay Status','Due Date','Actions'].map(h=>(
                  <th key={h} style={thS}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={11} style={{ padding:30, textAlign:'center', color:T.textMuted }}>Loading invoices...</td></tr>}
                {!loading && filtered.length===0 && <tr><td colSpan={11} style={{ padding:30, textAlign:'center', color:T.textDim }}>No invoices found</td></tr>}
                {filtered.map((inv,i)=>{
                  const invCfg = INV_STATUS_CFG[inv.invoiceStatus]||INV_STATUS_CFG.Draft;
                  const payCfg = PAY_CFG[inv.paymentStatus]||PAY_CFG.Pending;
                  return (
                    <tr key={inv.id} style={{ background:i%2===0?'#fff':T.bg }}>
                      <td style={{ ...tdS, fontWeight:700, color:T.primary }}>{inv.invoiceNo}</td>
                      <td style={tdS}>{inv.projectId}</td>
                      <td style={{ ...tdS, color:T.textMuted }}>{inv.poNo||'—'}</td>
                      <td style={{ ...tdS, whiteSpace:'nowrap' as const }}>{fmtDate(inv.invoiceDate)}</td>
                      <td style={{ ...tdS, fontWeight:600 }}>{fmt(inv.invoiceAmount)}</td>
                      <td style={{ ...tdS, color:T.textMuted }}>{fmt(inv.gst)}</td>
                      <td style={{ ...tdS, fontWeight:700, color:T.primary }}>{fmt(inv.totalAmount)}</td>
                      <td style={tdS}><StatusPill label={inv.invoiceStatus} cfg={invCfg} /></td>
                      <td style={tdS}><StatusPill label={inv.paymentStatus} cfg={payCfg} /></td>
                      <td style={{ ...tdS, whiteSpace:'nowrap' as const, color:T.textMuted }}>{fmtDate(inv.dueDate)}</td>
                      <td style={tdS}>
                        <div style={{ display:'flex', gap:4, flexWrap:'wrap' as const }}>
                          {inv.invoiceStatus==='Draft' && (
                            <button onClick={()=>handleUpdateStatus(inv,'Submitted')}
                              style={{ background:'#EFF6FF', border:'none', borderRadius:5, padding:'4px 8px', color:'#2563EB', cursor:'pointer', fontSize:11, fontWeight:600 }}>Submit</button>
                          )}
                          {inv.invoiceStatus==='Submitted' && (
                            <>
                              <button onClick={()=>handleUpdateStatus(inv,'Approved')}
                                style={{ background:T.successBg, border:'none', borderRadius:5, padding:'4px 8px', color:T.success, cursor:'pointer', fontSize:11, fontWeight:600 }}>Approve</button>
                              <button onClick={()=>handleUpdateStatus(inv,'Rejected')}
                                style={{ background:'#FEF2F2', border:'none', borderRadius:5, padding:'4px 8px', color:T.danger, cursor:'pointer', fontSize:11, fontWeight:600 }}>Reject</button>
                            </>
                          )}
                          {inv.invoiceStatus==='Under Review' && (
                            <button onClick={()=>handleUpdateStatus(inv,'Approved')}
                              style={{ background:T.successBg, border:'none', borderRadius:5, padding:'4px 8px', color:T.success, cursor:'pointer', fontSize:11, fontWeight:600 }}>Approve</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ padding:'12px 0', borderTop:`1px solid ${T.border}`, display:'flex',
            justifyContent:'space-between', alignItems:'center', marginTop:4 }}>
            <div style={{ fontSize:11, color:T.textDim }}>
              Showing {filtered.length} of {invoices.length} invoices
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
              <span style={{ fontSize:12, color:T.textMuted }}>Total Paid: <strong style={{ color:T.success }}>{fmtCr(totalPaid)}</strong></span>
              <span style={{ fontSize:12, color:T.textMuted }}>Pending: <strong style={{ color:T.warning }}>{fmtCr(totalPending)}</strong></span>
            </div>
          </div>
        </div>

        {/* Create Invoice Modal */}
        {showModal && (
          <Modal title="+ Create New Invoice" onClose={()=>{setShowModal(false);setForm(emptyForm());}} width={540}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
              <F label="Project *">
                <select value={form.projectId} onChange={e=>handleProjectChange(e.target.value)}
                  style={{ ...inputStyle(), width:'100%' }}>
                  <option value="">— Select Project —</option>
                  {(projects as any[]).map(p=>(
                    <option key={p.id} value={p.id}>{p.id} — {p.site}</option>
                  ))}
                </select>
              </F>
              <F label="PO Number">
                <input value={form.poNo} readOnly
                  style={{ ...inputStyle(), width:'100%', background:T.bg, color:T.textMuted }} />
              </F>
              <F label="Invoice No *">
                <input value={form.invoiceNo} onChange={e=>setForm(f=>({...f,invoiceNo:e.target.value}))}
                  placeholder="INV-2025-XXX" style={{ ...inputStyle(), width:'100%' }} />
              </F>
              <F label="Work/BOQ Ref">
                <input value={form.workBoqRef} onChange={e=>setForm(f=>({...f,workBoqRef:e.target.value}))}
                  placeholder="BOQ-XXX-001" style={{ ...inputStyle(), width:'100%' }} />
              </F>
              <F label="Invoice Date *">
                <input type="date" value={form.invoiceDate} onChange={e=>setForm(f=>({...f,invoiceDate:e.target.value}))}
                  style={{ ...inputStyle(), width:'100%' }} />
              </F>
              <F label="Due Date">
                <input type="date" value={form.dueDate} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))}
                  style={{ ...inputStyle(), width:'100%' }} />
              </F>
              <F label="Amount (₹) *">
                <input type="number" value={form.invoiceAmount} onChange={e=>setForm(f=>({...f,invoiceAmount:e.target.value}))}
                  placeholder="925000" style={{ ...inputStyle(), width:'100%' }} />
              </F>
              <F label="GST Rate (%)">
                <select value={form.gstRate} onChange={e=>setForm(f=>({...f,gstRate:e.target.value}))}
                  style={{ ...inputStyle(), width:'100%' }}>
                  {GST_RATES.map(r=><option key={r} value={r}>{r}%</option>)}
                </select>
              </F>
            </div>
            {form.invoiceAmount && (
              <div style={{ background:T.primaryLight, border:`1px solid ${T.primaryMid}`, borderRadius:10, padding:14, marginBottom:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:6 }}>
                  <span style={{ color:T.textMuted }}>Sub Total</span>
                  <span style={{ fontWeight:600 }}>₹{Number(form.invoiceAmount).toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:6 }}>
                  <span style={{ color:T.textMuted }}>GST ({form.gstRate}%)</span>
                  <span style={{ fontWeight:600 }}>₹{computedGst.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:15, borderTop:`1px solid ${T.primaryMid}`, paddingTop:8 }}>
                  <span style={{ fontWeight:700, color:T.text }}>Total</span>
                  <span style={{ fontWeight:800, color:T.primary }}>₹{computedTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:8 }}>
              <button onClick={()=>{setShowModal(false);setForm(emptyForm());}} style={btnSecondary}>Cancel</button>
              <button onClick={handleSave} disabled={saving||!form.invoiceNo||!form.invoiceAmount||!form.invoiceDate}
                style={{ ...btnPrimary, opacity:saving?0.8:1, minWidth:140 }}>
                {saving?'Saving…':'+ Create Invoice'}
              </button>
            </div>
          </Modal>
        )}

        {toast && <Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
      </div>
    </Layout>
  );
}
