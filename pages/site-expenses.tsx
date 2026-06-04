import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useExpenses } from '@/context/ExpenseContext';
import { useProjects } from '@/context/ProjectContext';
import { createClient } from '@/lib/supabase';
import { T, card, btnPrimary, inputStyle } from '@/lib/theme';
import Toast from '@/components/Toast';

const fmt  = (v: number) => "₹" + Number(v).toLocaleString("en-IN");
const fmtD = (d: string) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }); }
  catch { return d; }
};

const EXPENSE_TYPES  = ["Advance","Material Purchase","Labour Charge","Transport","Equipment Rental","Miscellaneous"];
const PAYMENT_MODES  = ["NEFT","RTGS","Cheque","Cash","UPI","Others"];
const TYPE_COLORS: Record<string,string> = {
  "Advance":"#2563EB","Material Purchase":"#7C3AED","Labour Charge":"#D97706",
  "Transport":"#0D9488","Equipment Rental":"#DC2626","Miscellaneous":"#6B7280",
};

export default function SiteExpensesPage() {
  const router = useRouter();
  const { profile, can, loading: authLoading } = useAuth();
  const { expenses, loading: expLoading, addExpense, updateExpense } = useExpenses();
  const { projects } = useProjects();
  const canAdd    = !authLoading && can("site_expenses", "create");
  const canManage = !authLoading && can("site_expenses", "edit");

  const [selectedVendor,  setSelectedVendor]  = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [search,          setSearch]          = useState("");
  const [toast,           setToast]           = useState<any>(null);
  const [saving,          setSaving]          = useState(false);
  const [adding,          setAdding]          = useState(false);
  const [form, setForm] = useState({
    expenseDate:"", site:"", expenseType:"Advance", amount:"", remarks:""
  });

  // Paid modal state
  const [paidModal,    setPaidModal]    = useState<any>(null);
  const [paidForm,     setPaidForm]     = useState({ txnRef:"", paymentMode:"NEFT", fromAccount:"", toAccount:"", txnDate:new Date().toISOString().split('T')[0] });
  const [fromAccounts, setFromAccounts] = useState<string[]>([]);

  React.useEffect(() => {
    const sb = createClient();
    sb.from('lookup_options').select('value').eq('type','from_account').order('value')
      .then(({data}) => { if (data) setFromAccounts(data.map((r:any)=>r.value)); });
  }, []);

  const addFromAccount = async (val: string) => {
    const sb = createClient();
    await sb.from('lookup_options').insert({ type:'from_account', value: val });
    setFromAccounts(prev => [...prev, val].sort());
    setPaidForm(p => ({...p, fromAccount: val}));
  };
  const [paidSaving,   setPaidSaving]   = useState(false);

  // Group projects by vendor
  const VENDOR_MAP: Record<string, any[]> = (projects as any[]).reduce((acc:any, p:any) => {
    if (p.vendor) { acc[p.vendor] = acc[p.vendor] || []; acc[p.vendor].push(p); }
    return acc;
  }, {});

  const vendors        = Object.keys(VENDOR_MAP).sort();
  const vendorProjects = selectedVendor ? VENDOR_MAP[selectedVendor] || [] : [];
  const selProj        = vendorProjects.find((p:any) => p.id === selectedProject);

  // Sort: pending first, then by date desc
  const allExpenses = expenses
    .filter((e:any) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return e.projectId?.toLowerCase().includes(s) ||
             e.expenseType?.toLowerCase().includes(s) ||
             e.site?.toLowerCase().includes(s) ||
             e.paidTxnRef?.toLowerCase().includes(s);
    })
    .sort((a:any, b:any) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(b.expenseDate||b.createdAt||0).getTime() - new Date(a.expenseDate||a.createdAt||0).getTime();
    });

  const pendingTotal = expenses.filter((e:any) => e.status === 'pending').reduce((a:number,e:any) => a + Number(e.amount), 0);
  const paidTotal    = expenses.filter((e:any) => e.status === 'paid').reduce((a:number,e:any) => a + Number(e.amount), 0);

  const handleAdd = async () => {
    if (!selectedProject || !form.amount || !form.expenseDate) {
      setToast({ msg:"Please fill Date, Amount and select a Project", type:"error" }); return;
    }
    setSaving(true);
    try {
      await addExpense({
        txnRef: "", expenseDate: form.expenseDate,
        site: form.site || selProj?.site || "",
        expenseType: form.expenseType, amount: Number(form.amount),
        paymentMode: "", remarks: form.remarks,
        projectId: selectedProject, poNo: selProj?.poNo || "",
        createdBy: profile?.full_name || "", status: "pending",
      });
      setForm({ expenseDate:"", site:"", expenseType:"Advance", amount:"", remarks:"" });
      setAdding(false);
      setToast({ msg:"✅ Expense request raised", type:"success" });
    } catch (err:any) {
      setToast({ msg:"❌ " + err.message, type:"error" });
    } finally { setSaving(false); }
  };

  const handleMarkPaid = async () => {
    if (!paidForm.txnRef) { setToast({ msg:"TXN Ref is required", type:"error" }); return; }
    setPaidSaving(true);
    try {
      await updateExpense(paidModal.id, {
        status: 'paid',
        paidTxnRef: paidForm.txnRef,
        paidPaymentMode: paidForm.paymentMode,
        txnDate: paidForm.txnDate,
        paidAt: new Date().toISOString(),
      });
      // Update project paid_amount
      const proj = (projects as any[]).find((p:any) => p.id === paidModal.projectId);
      if (proj) {
        const newPaid = Number(proj.paidAmount || 0) + Number(paidModal.amount);
        await createClient().from('projects').update({ paid_amount: newPaid }).eq('id', proj.id);
      }
      setPaidModal(null);
      setPaidForm({ txnRef:"", paymentMode:"NEFT", fromAccount:"", toAccount:"", txnDate:new Date().toISOString().split('T')[0] });
      setToast({ msg:"✅ Marked as Paid — Financial Summary updated", type:"success" });
    } catch (err:any) {
      setToast({ msg:"❌ " + err.message, type:"error" });
    } finally { setPaidSaving(false); }
  };

  const thS: React.CSSProperties = { padding:"10px 12px", fontSize:10, fontWeight:700, textTransform:"uppercase",
    color:T.primary, background:T.primaryLight, textAlign:"left" as const, borderBottom:`2px solid ${T.primaryMid}`, whiteSpace:"nowrap" as const };
  const tdS: React.CSSProperties = { padding:"10px 12px", fontSize:13, borderBottom:`1px solid ${T.border}`, verticalAlign:"middle" as const };

  return (
    <Layout>
      <div className="fade-in">
        <div style={{ fontSize:22, fontWeight:800, color:T.text, marginBottom:4 }}>Expenses</div>
        <div style={{ fontSize:13, color:T.textMuted, marginBottom:20 }}>
          {expLoading ? "Loading..." : `${expenses.length} records`}
        </div>

        {/* Summary cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
          {[
            { label:"Total Records",    value: expenses.length,                                          color:T.primary },
            { label:"Pending Amount",   value: fmt(pendingTotal),                                        color:T.warning },
            { label:"Paid Amount",      value: fmt(paidTotal),                                           color:T.success },
            { label:"Pending Requests", value: expenses.filter((e:any)=>e.status==="pending").length,    color:T.danger  },
          ].map(s => (
            <div key={s.label} style={{ ...card, padding:"14px 16px" }}>
              <div style={{ fontSize:11, color:T.textMuted, fontWeight:600, textTransform:"uppercase", marginBottom:4 }}>{s.label}</div>
              <div style={{ fontSize:18, fontWeight:800, color:s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Raise Expense Request */}
        {canAdd && (
          <div style={{ ...card, marginBottom:16 }}>
            <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:14 }}>Raise Expense Request</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:adding?16:0 }}>
              <div>
                <label style={{ display:"block", fontSize:12, fontWeight:600, color:T.textMuted, marginBottom:6, textTransform:"uppercase" }}>Vendor *</label>
                <select value={selectedVendor} onChange={e=>{ setSelectedVendor(e.target.value); setSelectedProject(""); }}
                  style={{ ...inputStyle(), width:"100%" }}>
                  <option value="">— Select Vendor —</option>
                  {vendors.map(v=><option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display:"block", fontSize:12, fontWeight:600, color:T.textMuted, marginBottom:6, textTransform:"uppercase" }}>Project *</label>
                <select value={selectedProject} onChange={e=>setSelectedProject(e.target.value)}
                  disabled={!selectedVendor}
                  style={{ ...inputStyle(), width:"100%", opacity:!selectedVendor?0.5:1 }}>
                  <option value="">— Select Project —</option>
                  {vendorProjects.map((p:any)=>(
                    <option key={p.id} value={p.id}>{p.id} — {p.site}</option>
                  ))}
                </select>
              </div>
            </div>
            {selectedProject && !adding && (
              <button onClick={()=>setAdding(true)} style={{ ...btnPrimary, fontSize:13, marginTop:12 }}>+ Raise Request</button>
            )}
            {adding && (
              <div style={{ background:T.bg, borderRadius:10, padding:14, border:`1px solid ${T.border}`, marginTop:12 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:12 }}>
                  {([["Date *","expenseDate","date",""],["Amount (₹) *","amount","number",""],
                     ["Site","site","text",selProj?.site||""],["Remarks","remarks","text",""],
                     ["Bank Account No","bankAccount","text","e.g. 1234567890"],
                     ["UPI ID","upiId","text","e.g. name@upi"]] as [string,string,string,string][]).map(([l,f,t,ph])=>(
                    <div key={f}>
                      <label style={{ display:"block", fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:"uppercase" as const }}>{l}</label>
                      <input type={t} value={(form as any)[f]} placeholder={ph}
                        onChange={e=>setForm(p=>({...p,[f]:e.target.value}))}
                        style={{ ...inputStyle(), width:"100%", boxSizing:"border-box" as const }} />
                    </div>
                  ))}
                  <div>
                    <label style={{ display:"block", fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:"uppercase" as const }}>Expense Type</label>
                    <select value={form.expenseType} onChange={e=>setForm(p=>({...p,expenseType:e.target.value}))} style={{ ...inputStyle(), width:"100%" }}>
                      {EXPENSE_TYPES.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  <button onClick={handleAdd} disabled={saving||!form.amount||!form.expenseDate}
                    style={{ ...btnPrimary, opacity:saving||!form.amount||!form.expenseDate?0.5:1 }}>
                    {saving?"Saving…":"💾 Raise Request"}
                  </button>
                  <button onClick={()=>setAdding(false)}
                    style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:8, padding:"8px 18px", color:T.text, cursor:"pointer", fontSize:13 }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* All Expenses Table */}
        <div style={card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div style={{ fontSize:14, fontWeight:700, color:T.text }}>
              All Expenses <span style={{ fontSize:12, fontWeight:400, color:T.textMuted, marginLeft:8 }}>{allExpenses.length} records</span>
            </div>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search project, type, ref…"
              style={{ border:`1px solid ${T.border}`, borderRadius:8, padding:"6px 12px", fontSize:13, outline:"none", width:220 }} />
          </div>
          <div style={{ overflowX:"auto" as const }}>
            <table style={{ width:"100%", borderCollapse:"collapse" as const }}>
              <thead>
                <tr>
                  {["#","Req. Date","Project","Remarks","Expense Type","Amount (₹)","TXN Ref","Payment Mode","Txn Date","Status",""].map((h,i)=>(
                    <th key={i} style={{ ...thS, textAlign:i===5?"right" as const:"left" as const }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expLoading && <tr><td colSpan={10} style={{ padding:30, textAlign:"center" as const, color:T.textMuted }}>Loading...</td></tr>}
                {!expLoading && allExpenses.length === 0 && (
                  <tr><td colSpan={10} style={{ padding:30, textAlign:"center" as const, color:T.textDim }}>No expenses found</td></tr>
                )}
                {allExpenses.map((e:any, idx:number) => {
                  const proj = (projects as any[]).find(p=>p.id===e.projectId);
                  const isPending = e.status === 'pending';
                  return (
                    <tr key={e.id}
                      style={{ background:isPending ? '#FFFBEB' : idx%2===0?"#fff":T.bg, cursor:"pointer" }}
                      onMouseEnter={el=>(el.currentTarget as HTMLTableRowElement).style.background=T.primaryLight}
                      onMouseLeave={el=>(el.currentTarget as HTMLTableRowElement).style.background=isPending?'#FFFBEB':idx%2===0?"#fff":T.bg}>
                      <td style={{ ...tdS, color:T.textMuted, width:36 }}>{idx+1}</td>
                      <td style={{ ...tdS, whiteSpace:"nowrap" as const }}>{fmtD(e.expenseDate)}</td>
                      <td style={tdS} onClick={()=>e.projectId&&router.push(`/projects/${e.projectId}`)}>
                        <div style={{ fontWeight:600, fontSize:13, color:T.primary }}>{e.projectId}</div>
                        {proj && <div style={{ fontSize:10, color:T.textMuted }}>{proj.poNo}</div>}
                      </td>
                      <td style={tdS}>{(e as any).remarks||"—"}</td>
                      <td style={tdS}>
                        <span style={{ fontSize:11, fontWeight:600, color:TYPE_COLORS[e.expenseType]||T.textMuted,
                          background:`${TYPE_COLORS[e.expenseType]||T.textMuted}18`, padding:"2px 10px", borderRadius:20, whiteSpace:"nowrap" as const }}>
                          {e.expenseType}
                        </span>
                      </td>
                      <td style={{ ...tdS, textAlign:"right" as const, fontWeight:700, color:T.primary }}>{fmt(e.amount)}</td>
                      <td style={{ ...tdS, color:T.textMuted }}>{e.paidTxnRef || "—"}</td>
                      <td style={tdS}>{e.paidPaymentMode || "—"}</td>
                      <td style={{ ...tdS, color:T.textMuted, whiteSpace:"nowrap" as const }}>{(e as any).txnDate || "—"}</td>
                      <td style={tdS}>
                        <span style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:20,
                          background: isPending ? '#FEF3C7' : '#D1FAE5',
                          color: isPending ? '#D97706' : '#059669' }}>
                          {isPending ? "Pending" : "Paid"}
                        </span>
                      </td>
                      <td style={{ ...tdS, width:80 }}>
                        {isPending && canManage && (
                          <button onClick={ev=>{ ev.stopPropagation(); setPaidModal(e); setPaidForm({ txnRef:"", paymentMode:"NEFT", fromAccount:"", toAccount:"", txnDate:new Date().toISOString().split('T')[0] }); }}
                            style={{ background:T.success, border:"none", borderRadius:6, padding:"5px 12px",
                              color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" as const }}>
                            ✓ Paid
                          </button>
                        )}
                        {!isPending && (
                          <span style={{ fontSize:11, color:T.textDim }}>{e.paidAt ? fmtD(e.paidAt.split("T")[0]) : ""}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {allExpenses.length > 0 && (
                <tfoot>
                  <tr style={{ background:T.primaryLight, fontWeight:700 }}>
                    <td colSpan={5} style={{ ...tdS, color:T.primary }}>Total</td>
                    <td style={{ ...tdS, textAlign:"right" as const, color:T.primary }}>{fmt(allExpenses.reduce((a:number,e:any)=>a+Number(e.amount),0))}</td>
                    <td colSpan={4} style={tdS}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* Paid Modal */}
      {paidModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.5)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:T.surface, borderRadius:16, padding:28, width:"100%", maxWidth:420, boxShadow:"0 20px 60px rgba(0,0,0,0.18)" }}>
            <h3 style={{ fontSize:16, fontWeight:700, color:T.text, marginBottom:6 }}>✓ Mark as Paid</h3>
            <p style={{ fontSize:13, color:T.textMuted, marginBottom:20 }}>
              {paidModal.expenseType} — {fmt(paidModal.amount)} · Project {paidModal.projectId}
            </p>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:"block", fontSize:12, fontWeight:600, color:T.textMuted, marginBottom:6, textTransform:"uppercase" }}>Transaction Date</label>
              <input type="date" value={paidForm.txnDate} onChange={e=>setPaidForm(p=>({...p,txnDate:e.target.value}))}
                style={{ ...inputStyle(), width:"100%", boxSizing:"border-box" as const }} />
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:"block", fontSize:12, fontWeight:600, color:T.textMuted, marginBottom:6, textTransform:"uppercase" }}>TXN Ref *</label>
              <input value={paidForm.txnRef} onChange={e=>setPaidForm(p=>({...p,txnRef:e.target.value}))}
                placeholder="e.g. NEFT/2026/001234"
                style={{ ...inputStyle(), width:"100%", boxSizing:"border-box" as const }} />
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:"block", fontSize:12, fontWeight:600, color:T.textMuted, marginBottom:6, textTransform:"uppercase" }}>Payment Mode *</label>
              <select value={paidForm.paymentMode} onChange={e=>setPaidForm(p=>({...p,paymentMode:e.target.value}))}
                style={{ ...inputStyle(), width:"100%" }}>
                {PAYMENT_MODES.map(m=><option key={m}>{m}</option>)}
              </select>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:"block", fontSize:12, fontWeight:600, color:T.textMuted, marginBottom:6, textTransform:"uppercase" }}>From Account</label>
              <select value={paidForm.fromAccount} onChange={e=>{ if(e.target.value==='__new__'){ const v=window.prompt('Enter new account name:'); if(v&&v.trim()) addFromAccount(v.trim()); } else setPaidForm(p=>({...p,fromAccount:e.target.value})); }}
                style={{ ...inputStyle(), width:"100%", boxSizing:"border-box" as const, appearance:'none' }}>
                <option value="">— Select Account —</option>
                {fromAccounts.map(a=><option key={a} value={a}>{a}</option>)}
                <option value="__new__">+ Add New Account...</option>
              </select>
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ display:"block", fontSize:12, fontWeight:600, color:T.textMuted, marginBottom:6, textTransform:"uppercase" }}>To Account</label>
              <input value={paidForm.toAccount} onChange={e=>setPaidForm(p=>({...p,toAccount:e.target.value}))}
                placeholder="e.g. Vendor Bank A/C / UPI ID"
                style={{ ...inputStyle(), width:"100%", boxSizing:"border-box" as const }} />
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button onClick={()=>setPaidModal(null)}
                style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:8, padding:"8px 18px", fontSize:13, cursor:"pointer", color:T.text }}>
                Cancel
              </button>
              <button onClick={handleMarkPaid} disabled={paidSaving || !paidForm.txnRef}
                style={{ background:T.success, border:"none", borderRadius:8, padding:"8px 18px", fontSize:13, fontWeight:600, color:"#fff", cursor:"pointer", opacity:paidSaving||!paidForm.txnRef?0.7:1 }}>
                {paidSaving ? "Saving…" : "✓ Confirm Paid"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
    </Layout>
  );
}
