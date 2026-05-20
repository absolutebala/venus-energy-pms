import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { T, card, btnPrimary, btnSecondary, inputStyle } from '@/lib/theme';
import Toast from '@/components/Toast';
import { PROJECTS, SHARED_EXPENSES } from '@/lib/seedData';

const fmt = (v: number) => `₹${Number(v).toLocaleString('en-IN')}`;
const fmtD = (d: string) => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';

// Group projects by vendor
const VENDOR_MAP: Record<string, any[]> = (PROJECTS as any[]).reduce((acc: any, p: any) => {
  if (p.vendor) { acc[p.vendor] = acc[p.vendor] || []; acc[p.vendor].push(p); }
  return acc;
}, {});

const EXPENSE_TYPES = ['Advance','Material Purchase','Labour Charge','Transport','Equipment Rental','Miscellaneous'];
const PAYMENT_MODES = ['Cash','Bank Transfer','Cheque','UPI','DD'];

export default function SiteExpensesPage() {
  const { profile, can, loading } = useAuth();
  const role          = profile?.role || 'viewer';
  const isAccounting  = !loading && can('site_expenses', 'read');
  const canAdd        = !loading && can('site_expenses', 'create');

  const [expenses,       setExpenses]       = useState<any[]>([...(SHARED_EXPENSES as any[])]);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [selectedProject,setSelectedProject]= useState('');
  const [toast,          setToast]          = useState<any>(null);
  const [saving,         setSaving]         = useState(false);
  const [form,           setForm]           = useState({
    txnRef:'', amount:'', date:'', site:'', expenseType:'Advance', paymentMode:'Bank Transfer'
  });

  const vendors        = Object.keys(VENDOR_MAP).sort();
  const vendorProjects = selectedVendor ? VENDOR_MAP[selectedVendor] || [] : [];
  const selProj        = vendorProjects.find((p:any) => p.id === selectedProject);
  const projectExpenses= selectedProject ? expenses.filter((e:any) => e.projectId === selectedProject) : [];
  const totalExpenses  = projectExpenses.reduce((a:number,e:any) => a + Number(e.amount), 0);

  const handleAdd = () => {
    if (!selectedProject || !form.txnRef || !form.amount || !form.date) {
      setToast({ msg:'Please fill all required fields', type:'error' }); return;
    }
    setSaving(true);
    setTimeout(() => {
      const newExp = {
        id: Date.now(), txnRef: form.txnRef, date: form.date,
        site: form.site || selProj?.site || '', expenseType: form.expenseType,
        amount: Number(form.amount), paymentMode: form.paymentMode, projectId: selectedProject,
      };
      setExpenses(prev => [...prev, newExp]);
      (SHARED_EXPENSES as any[]).push(newExp);
      setForm({ txnRef:'', amount:'', date:'', site:'', expenseType:'Advance', paymentMode:'Bank Transfer' });
      setSaving(false);
      setToast({ msg:'✅ Expense added', type:'success' });
    }, 500);
  };

  const thS: React.CSSProperties = { padding:'10px 12px', fontSize:10, fontWeight:700, textTransform:'uppercase', color:T.primary, background:T.primaryLight, textAlign:'left' as const, borderBottom:`2px solid ${T.primaryMid}`, whiteSpace:'nowrap' as const };
  const tdS: React.CSSProperties = { padding:'10px 12px', fontSize:13, borderBottom:`1px solid ${T.border}`, verticalAlign:'middle' as const };

  if (!isAccounting) return (
    <Layout><div style={{ padding:40, textAlign:'center', color:T.textMuted }}>Access restricted</div></Layout>
  );

  return (
    <Layout>
      <div className="fade-in">
        <div style={{ fontSize:22, fontWeight:800, color:T.text, marginBottom:4 }}>Site Expenses</div>
        <div style={{ fontSize:13, color:T.textMuted, marginBottom:20 }}>Track project expenses by vendor and project</div>

        {/* Vendor + Project selectors */}
        <div style={{ ...card, marginBottom:16 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:T.textMuted, marginBottom:6, textTransform:'uppercase' }}>Select Vendor</label>
              <select value={selectedVendor} onChange={e=>{ setSelectedVendor(e.target.value); setSelectedProject(''); }}
                style={{ ...inputStyle(), width:'100%' }}>
                <option value="">— Choose Vendor —</option>
                {vendors.map(v=><option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:T.textMuted, marginBottom:6, textTransform:'uppercase' }}>Select Project</label>
              <select value={selectedProject} onChange={e=>setSelectedProject(e.target.value)}
                disabled={!selectedVendor}
                style={{ ...inputStyle(), width:'100%', opacity:!selectedVendor?0.5:1 }}>
                <option value="">— Choose Project —</option>
                {vendorProjects.map((p:any)=>(
                  <option key={p.id} value={p.id}>{p.id} — {p.site}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Project summary */}
        {selProj && (
          <div style={{ ...card, marginBottom:16 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
              {[
                { label:'Project',      value: `${selProj.id}`,         color:T.primary  },
                { label:'Site',         value: selProj.site,             color:T.text     },
                { label:'PO Number',    value: selProj.poNo,             color:T.info     },
                { label:'Total Expenses',value: fmt(totalExpenses),      color:T.danger   },
              ].map(s=>(
                <div key={s.label}>
                  <div style={{ fontSize:11, color:T.textMuted, fontWeight:600, textTransform:'uppercase', marginBottom:4 }}>{s.label}</div>
                  <div style={{ fontSize:15, fontWeight:700, color:s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Expense Form */}
        {canAdd && selectedProject && (
          <div style={{ ...card, marginBottom:16, border:`1.5px solid ${T.primaryMid}`, background:T.primaryLight }}>
            <div style={{ fontSize:14, fontWeight:700, color:T.primary, marginBottom:14 }}>+ Add Expense</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }}>
              {[
                ['Transaction Ref *','txnRef','text','EXP-XXX-001'],
                ['Date *','date','date',''],
                ['Site Name','site','text', selProj?.site||''],
                ['Amount (₹) *','amount','number','0'],
              ].map(([label,field,type,ph])=>(
                <div key={field}>
                  <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>{label}</label>
                  <input type={type} value={(form as any)[field]} placeholder={ph}
                    onChange={e=>setForm(p=>({...p,[field]:e.target.value}))}
                    style={{ ...inputStyle(), width:'100%', boxSizing:'border-box' as const }} />
                </div>
              ))}
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>Expense Type</label>
                <select value={form.expenseType} onChange={e=>setForm(p=>({...p,expenseType:e.target.value}))} style={{ ...inputStyle(), width:'100%' }}>
                  {EXPENSE_TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>Payment Mode</label>
                <select value={form.paymentMode} onChange={e=>setForm(p=>({...p,paymentMode:e.target.value}))} style={{ ...inputStyle(), width:'100%' }}>
                  {PAYMENT_MODES.map(m=><option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleAdd} disabled={saving||!form.txnRef||!form.amount||!form.date}
              style={{ ...btnPrimary, opacity:saving||!form.txnRef||!form.amount||!form.date?0.5:1 }}>
              {saving?'Saving…':'💾 Save Expense'}
            </button>
          </div>
        )}

        {/* Expenses Table */}
        {selectedProject && (
          <div style={card}>
            <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:14 }}>
              Expenses for {selectedProject}
              <span style={{ fontSize:12, fontWeight:400, color:T.textMuted, marginLeft:10 }}>{projectExpenses.length} records</span>
            </div>
            {projectExpenses.length === 0 ? (
              <div style={{ textAlign:'center', padding:30, color:T.textDim }}>No expenses recorded yet</div>
            ) : (
              <div style={{ overflowX:'auto' as const }}>
                <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
                  <thead>
                    <tr>
                      {['Sr.','Transaction Ref','Date','Site','Expense Type','Amount (₹)','Payment Mode'].map((h,i)=>(
                        <th key={i} style={{ ...thS, textAlign:i===5?'right' as const:'left' as const }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {projectExpenses.map((e:any,idx:number)=>(
                      <tr key={e.id} style={{ background:idx%2===0?'#fff':T.bg }}>
                        <td style={{ ...tdS, color:T.textMuted }}>{idx+1}</td>
                        <td style={{ ...tdS, fontWeight:600, color:T.primary }}>{e.txnRef}</td>
                        <td style={{ ...tdS, color:T.textMuted }}>{fmtD(e.date)}</td>
                        <td style={tdS}>{e.site||'—'}</td>
                        <td style={tdS}>
                          <span style={{ fontSize:11, fontWeight:600, background:T.primaryLight, color:T.primary, padding:'2px 10px', borderRadius:20 }}>{e.expenseType}</span>
                        </td>
                        <td style={{ ...tdS, textAlign:'right' as const, fontWeight:700, color:T.primary }}>{fmt(e.amount)}</td>
                        <td style={tdS}>{e.paymentMode}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background:T.primaryLight, fontWeight:700 }}>
                      <td colSpan={5} style={{ ...tdS, color:T.primary }}>Total</td>
                      <td style={{ ...tdS, textAlign:'right' as const, color:T.primary }}>{fmt(totalExpenses)}</td>
                      <td style={tdS}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
    </Layout>
  );
}
