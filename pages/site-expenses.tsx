import React, { useState } from 'react';
import Layout from '@/components/Layout';
import Toast from '@/components/Toast';
import { useAuth } from '@/context/AuthContext';
import { T, card, btnPrimary, btnSecondary, inputStyle } from '@/lib/theme';
import { PAYMENT_TRANSACTIONS, VENDOR_PROJECTS, getPaidAmount, getProjectTransactions, PaymentTransaction } from '@/lib/expensesData';

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`;

const VENDORS = Object.keys(VENDOR_PROJECTS);

export default function SiteExpensesPage() {
  const { profile, can, loading } = useAuth();
  const role          = profile?.role || 'viewer';
  const isAccounting  = !loading && can('site_expenses', 'read');
  const canAdd        = !loading && can('site_expenses', 'create');

  const [transactions, setTransactions] = useState<PaymentTransaction[]>(PAYMENT_TRANSACTIONS);
  const [selectedVendor,  setSelectedVendor]  = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [toast, setToast] = useState<{msg:string;type:'success'|'error'|'info'}|null>(null);
  const [saving, setSaving] = useState(false);

  // Payment form
  const [form, setForm] = useState({ amount:'', date:'', txnNumber:'', description:'' });
  const [focused, setFocused] = useState<string|null>(null);

  const vendorProjects = selectedVendor ? VENDOR_PROJECTS[selectedVendor] || [] : [];
  const projectTxns    = selectedProject ? getProjectTransactions(selectedProject, transactions) : [];
  const totalPaid      = selectedProject ? getPaidAmount(selectedProject, transactions) : 0;
  const selectedProjectData = vendorProjects.find(p => p.id === selectedProject);

  const handleAddPayment = () => {
    if (!selectedProject || !form.amount || !form.date || !form.txnNumber) {
      setToast({ msg:'Please fill all required fields.', type:'error' });
      return;
    }
    if (Number(form.amount) <= 0) {
      setToast({ msg:'Amount must be greater than 0.', type:'error' });
      return;
    }
    setSaving(true);
    setTimeout(() => {
      const newTxn: PaymentTransaction = {
        id:          `TXN-${Date.now()}`,
        projectId:   selectedProject,
        vendor:      selectedVendor,
        amount:      Number(form.amount),
        date:        form.date,
        txnNumber:   form.txnNumber,
        description: form.description,
        addedBy:     profile?.full_name || 'Accounting Team',
        addedAt:     new Date().toLocaleString('en-IN'),
      };
      setTransactions(prev => [newTxn, ...prev]);
      setForm({ amount:'', date:'', txnNumber:'', description:'' });
      setToast({ msg:`Payment of ${fmt(Number(form.amount))} recorded successfully!`, type:'success' });
      setSaving(false);
    }, 600);
  };

  const inp = (label: string, field: string, type='text', placeholder='', required=false) => (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:5 }}>
        {label} {required && <span style={{ color:T.danger }}>*</span>}
      </label>
      <input type={type} value={(form as any)[field]}
        onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
        onFocus={() => setFocused(field)} onBlur={() => setFocused(null)}
        placeholder={placeholder}
        style={{ ...inputStyle(focused===field), width:'100%', boxSizing:'border-box' as const }} />
    </div>
  );

  return (
    <Layout>
      <div className="fade-in">
        {/* Summary KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
          {[
            { label:'Total Transactions',  value:transactions.length,                                           color:T.primary, icon:'📄' },
            { label:'Total Paid (All)',     value:fmt(transactions.reduce((a,t)=>a+t.amount,0)),                 color:T.success, icon:'💰' },
            { label:'Vendors Paid',         value:new Set(transactions.map(t=>t.vendor)).size,                   color:T.info,    icon:'🏢' },
            { label:'Projects with Payment',value:new Set(transactions.map(t=>t.projectId)).size,               color:'#7C3AED', icon:'📁' },
          ].map((s,i)=>(
            <div key={i} style={{ ...card, position:'relative', overflow:'hidden', padding:'16px 18px' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:s.color }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:10, color:T.textMuted, textTransform:'uppercase', letterSpacing:0.4, marginBottom:4 }}>{s.label}</div>
                  <div style={{ fontSize:20, fontWeight:700, color:s.color }}>{s.value}</div>
                </div>
                <div style={{ fontSize:22 }}>{s.icon}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:16 }}>
          {/* Left: Vendor + Project selector */}
          <div>
            <div style={card}>
              <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:14 }}>Select Vendor & Project</div>

              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:6 }}>Vendor</label>
                <select value={selectedVendor} onChange={e=>{ setSelectedVendor(e.target.value); setSelectedProject(''); }}
                  style={{ ...inputStyle(), width:'100%' }}>
                  <option value="">— Select Vendor —</option>
                  {VENDORS.map(v=><option key={v} value={v}>{v}</option>)}
                </select>
              </div>

              {selectedVendor && vendorProjects.length > 0 && (
                <div>
                  <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:8 }}>Projects</label>
                  {vendorProjects.map(p => {
                    const paid   = getPaidAmount(p.id, transactions);
                    const pending = p.billedAmount - paid;
                    return (
                      <div key={p.id} onClick={()=>setSelectedProject(p.id)}
                        style={{ padding:'12px', borderRadius:9, marginBottom:8, cursor:'pointer', border:`1.5px solid ${selectedProject===p.id?T.primary:T.border}`, background:selectedProject===p.id?T.primaryLight:T.surface, transition:'all 0.15s' }}>
                        <div style={{ fontSize:12, fontWeight:700, color:T.primary }}>{p.id}</div>
                        <div style={{ fontSize:12, color:T.text, marginBottom:6 }}>{p.name}</div>
                        <div style={{ fontSize:11, color:T.textMuted }}>Billed: <strong>{fmt(p.billedAmount)}</strong></div>
                        <div style={{ fontSize:11, color:T.success }}>Paid: <strong>{fmt(paid)}</strong></div>
                        {pending > 0 && <div style={{ fontSize:11, color:T.danger }}>Pending: <strong>{fmt(pending)}</strong></div>}
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedVendor && vendorProjects.length === 0 && (
                <div style={{ fontSize:12, color:T.textMuted, textAlign:'center', padding:20 }}>No projects for this vendor.</div>
              )}
            </div>
          </div>

          {/* Right: Transactions + Add payment */}
          <div>
            {!selectedProject ? (
              <div style={{ ...card, textAlign:'center', padding:60, color:T.textDim }}>
                <div style={{ fontSize:40, marginBottom:12 }}>💳</div>
                <div style={{ fontSize:14 }}>Select a vendor and project to view and add payments.</div>
              </div>
            ) : (
              <>
                {/* Project financial summary */}
                {selectedProjectData && (
                  <div style={{ ...card, marginBottom:16, background:`linear-gradient(135deg, ${T.primaryLight}, #E0FDF4)`, border:`1px solid ${T.primaryMid}` }}>
                    <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:12 }}>{selectedProject} — {selectedProjectData.name}</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
                      {[
                        { label:'PO Value',      value:fmt(selectedProjectData.poValue),  color:T.text    },
                        { label:'Billed Amount',  value:fmt(selectedProjectData.billedAmount), color:T.info },
                        { label:'Total Paid',     value:fmt(totalPaid),                   color:T.success },
                        { label:'Pending',        value:fmt(selectedProjectData.billedAmount - totalPaid), color:selectedProjectData.billedAmount-totalPaid>0?T.danger:T.success },
                      ].map((s,i)=>(
                        <div key={i} style={{ background:'rgba(255,255,255,0.7)', borderRadius:8, padding:'10px 14px' }}>
                          <div style={{ fontSize:10, color:T.textDim, marginBottom:3 }}>{s.label}</div>
                          <div style={{ fontSize:15, fontWeight:700, color:s.color }}>{s.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add payment form - accounting only */}
                {canAdd && (
                  <div style={{ ...card, marginBottom:16 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:14, paddingBottom:10, borderBottom:`1px solid ${T.border}` }}>
                      + Add Payment Record
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
                      {inp('Amount (₹)', 'amount', 'number', 'e.g. 500000', true)}
                      {inp('Payment Date', 'date', 'date', '', true)}
                    </div>
                    {inp('Bank Transaction Number', 'txnNumber', 'text', 'e.g. HDFC20250510001', true)}
                    {inp('Description (optional)', 'description', 'text', 'e.g. Progress payment - 65% completion')}
                    <div style={{ display:'flex', gap:10 }}>
                      <button onClick={handleAddPayment} disabled={saving || !form.amount || !form.date || !form.txnNumber}
                        style={{ ...btnPrimary, opacity:saving||!form.amount||!form.date||!form.txnNumber?0.6:1 }}>
                        {saving ? 'Recording…' : '💰 Record Payment'}
                      </button>
                      <button onClick={()=>setForm({ amount:'', date:'', txnNumber:'', description:'' })} style={btnSecondary}>Clear</button>
                    </div>
                  </div>
                )}

                {/* Transaction history */}
                <div style={card}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:T.text }}>Payment History</div>
                    <div style={{ fontSize:13, fontWeight:700, color:T.success }}>Total Paid: {fmt(totalPaid)}</div>
                  </div>

                  {projectTxns.length === 0 ? (
                    <div style={{ textAlign:'center', padding:30, color:T.textDim, fontSize:13 }}>No payments recorded for this project yet.</div>
                  ) : (
                    <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
                      <thead>
                        <tr style={{ background:T.bg }}>
                          {['Txn No','Amount','Date','Bank Txn Number','Description','Added By','Time'].map(h=>(
                            <th key={h} style={{ padding:'8px 10px', fontSize:11, fontWeight:700, textTransform:'uppercase', color:T.textMuted, textAlign:'left', borderBottom:`2px solid ${T.border}` }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {projectTxns.map((txn,i)=>(
                          <tr key={i} style={{ borderBottom:`1px solid ${T.border}` }}
                            onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background=T.bg}
                            onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background='transparent'}>
                            <td style={{ padding:'10px', color:T.primary, fontWeight:700, fontSize:12 }}>{txn.id}</td>
                            <td style={{ padding:'10px', fontWeight:700, color:T.success, fontSize:13 }}>{fmt(txn.amount)}</td>
                            <td style={{ padding:'10px', fontSize:12 }}>{new Date(txn.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td>
                            <td style={{ padding:'10px', fontSize:12, fontFamily:'monospace', color:T.text }}>{txn.txnNumber}</td>
                            <td style={{ padding:'10px', fontSize:12, color:T.textMuted }}>{txn.description||'—'}</td>
                            <td style={{ padding:'10px', fontSize:11, color:T.textMuted }}>{txn.addedBy}</td>
                            <td style={{ padding:'10px', fontSize:11, color:T.textDim }}>{txn.addedAt}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background:T.primaryLight, borderTop:`2px solid ${T.primaryMid}` }}>
                          <td style={{ padding:'10px', fontWeight:700, color:T.primary }} colSpan={1}>TOTAL</td>
                          <td style={{ padding:'10px', fontWeight:700, color:T.success, fontSize:14 }}>{fmt(totalPaid)}</td>
                          <td colSpan={5} />
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* All transactions table for SA/PM/RM */}
        {!selectedProject && (
          <div style={{ ...card, marginTop:16 }}>
            <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:14 }}>All Payment Transactions</div>
            <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
              <thead>
                <tr style={{ background:T.bg }}>
                  {['Txn No','Project','Vendor','Amount','Date','Bank Txn Number','Added By'].map(h=>(
                    <th key={h} style={{ padding:'8px 10px', fontSize:11, fontWeight:700, textTransform:'uppercase', color:T.textMuted, textAlign:'left', borderBottom:`2px solid ${T.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn,i)=>(
                  <tr key={i} style={{ borderBottom:`1px solid ${T.border}` }}
                    onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background=T.bg}
                    onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background='transparent'}>
                    <td style={{ padding:'9px 10px', color:T.primary, fontWeight:700, fontSize:12 }}>{txn.id}</td>
                    <td style={{ padding:'9px 10px', color:T.primary, fontWeight:600, fontSize:12 }}>{txn.projectId}</td>
                    <td style={{ padding:'9px 10px', fontSize:12 }}>{txn.vendor}</td>
                    <td style={{ padding:'9px 10px', fontWeight:700, color:T.success }}>{fmt(txn.amount)}</td>
                    <td style={{ padding:'9px 10px', fontSize:12 }}>{new Date(txn.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td>
                    <td style={{ padding:'9px 10px', fontSize:12, fontFamily:'monospace' }}>{txn.txnNumber}</td>
                    <td style={{ padding:'9px 10px', fontSize:11, color:T.textMuted }}>{txn.addedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
    </Layout>
  );
}
