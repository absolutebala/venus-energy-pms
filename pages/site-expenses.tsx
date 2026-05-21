import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useExpenses } from '@/context/ExpenseContext';
import { useProjects } from '@/context/ProjectContext';
import { T, card, btnPrimary, inputStyle } from '@/lib/theme';
import Toast from '@/components/Toast';

const fmt  = (v: number) => "₹" + Number(v).toLocaleString("en-IN");
const fmtD = (d: string) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }); }
  catch { return d; }
};

const EXPENSE_TYPES = ["Advance","Material Purchase","Labour Charge","Transport","Equipment Rental","Miscellaneous"];
const PAYMENT_MODES = ["Cash","Bank Transfer","Cheque","UPI","DD"];
const TYPE_COLORS: Record<string,string> = {
  "Advance":"#2563EB","Material Purchase":"#7C3AED","Labour Charge":"#D97706",
  "Transport":"#0D9488","Equipment Rental":"#DC2626","Miscellaneous":"#6B7280",
};

export default function SiteExpensesPage() {
  const router = useRouter();
  const { profile, can, loading: authLoading } = useAuth();
  const { expenses, loading: expLoading, addExpense, deleteExpense } = useExpenses();
  const { projects } = useProjects();
  const canAdd = !authLoading && can("site_expenses", "create");

  const [selectedVendor,  setSelectedVendor]  = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [search,          setSearch]          = useState("");
  const [toast,           setToast]           = useState<any>(null);
  const [saving,          setSaving]          = useState(false);
  const [adding,          setAdding]          = useState(false);
  const [form, setForm] = useState({
    txnRef:"", expenseDate:"", site:"", expenseType:"Advance", amount:"", paymentMode:"Bank Transfer", remarks:""
  });

  // Group projects by vendor
  const VENDOR_MAP: Record<string, any[]> = (projects as any[]).reduce((acc:any, p:any) => {
    if (p.vendor) { acc[p.vendor] = acc[p.vendor] || []; acc[p.vendor].push(p); }
    return acc;
  }, {});

  const vendors        = Object.keys(VENDOR_MAP).sort();
  const vendorProjects = selectedVendor ? VENDOR_MAP[selectedVendor] || [] : [];
  const selProj        = vendorProjects.find((p:any) => p.id === selectedProject);

  const allExpenses = expenses.filter((e:any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return e.txnRef?.toLowerCase().includes(s) ||
           e.projectId?.toLowerCase().includes(s) ||
           e.expenseType?.toLowerCase().includes(s) ||
           e.site?.toLowerCase().includes(s);
  });

  const totalAmount = allExpenses.reduce((a:number, e:any) => a + Number(e.amount), 0);

  const handleAdd = async () => {
    if (!selectedProject || !form.txnRef || !form.amount || !form.expenseDate) {
      setToast({ msg:"Please fill all required fields", type:"error" }); return;
    }
    setSaving(true);
    try {
      await addExpense({
        txnRef: form.txnRef, expenseDate: form.expenseDate,
        site: form.site || selProj?.site || "",
        expenseType: form.expenseType, amount: Number(form.amount),
        paymentMode: form.paymentMode, remarks: form.remarks,
        projectId: selectedProject, poNo: selProj?.poNo || "",
        createdBy: profile?.full_name || "",
      });
      setForm({ txnRef:"", expenseDate:"", site:"", expenseType:"Advance", amount:"", paymentMode:"Bank Transfer", remarks:"" });
      setAdding(false);
      setToast({ msg:"✅ Expense saved", type:"success" });
    } catch (err:any) {
      setToast({ msg:"❌ " + err.message, type:"error" });
    } finally {
      setSaving(false);
    }
  };

  const thS: React.CSSProperties = { padding:"10px 12px", fontSize:10, fontWeight:700, textTransform:"uppercase",
    color:T.primary, background:T.primaryLight, textAlign:"left" as const, borderBottom:`2px solid ${T.primaryMid}`, whiteSpace:"nowrap" as const };
  const tdS: React.CSSProperties = { padding:"10px 12px", fontSize:13, borderBottom:`1px solid ${T.border}`, verticalAlign:"middle" as const };

  return (
    <Layout>
      <div className="fade-in">
        <div style={{ fontSize:22, fontWeight:800, color:T.text, marginBottom:4 }}>Expenses</div>
        <div style={{ fontSize:13, color:T.textMuted, marginBottom:20 }}>
          {expLoading ? "Loading..." : `${expenses.length} records · Total: ${fmt(expenses.reduce((a,e)=>a+e.amount,0))}`}
        </div>

        {/* Summary cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
          {[
            { label:"Total Records",    value: expenses.length,   color:T.primary },
            { label:"Total Amount",     value: fmt(expenses.reduce((a,e)=>a+e.amount,0)), color:T.danger },
            { label:"Projects",         value: new Set(expenses.map(e=>e.projectId)).size, color:T.info },
            { label:"This Month",       value: fmt(expenses.filter(e=>e.expenseDate?.startsWith("2025-05")).reduce((a,e)=>a+e.amount,0)), color:T.success },
          ].map(s => (
            <div key={s.label} style={{ ...card, padding:"14px 16px" }}>
              <div style={{ fontSize:11, color:T.textMuted, fontWeight:600, textTransform:"uppercase", marginBottom:4 }}>{s.label}</div>
              <div style={{ fontSize:18, fontWeight:800, color:s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Add Expense */}
        {canAdd && (
          <div style={{ ...card, marginBottom:16 }}>
            <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:14 }}>Add New Expense</div>
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
              <button onClick={()=>setAdding(true)} style={{ ...btnPrimary, fontSize:13, marginTop:12 }}>+ Add Expense</button>
            )}
            {adding && (
              <div style={{ background:T.bg, borderRadius:10, padding:14, border:`1px solid ${T.border}`, marginTop:12 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:12 }}>
                  {([["Txn Ref *","txnRef","text","EXP-XXX"],["Date *","expenseDate","date",""],
                     ["Amount (₹) *","amount","number",""],["Site","site","text",selProj?.site||""],
                     ["Remarks","remarks","text",""]] as [string,string,string,string][]).map(([l,f,t,ph])=>(
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
                  <div>
                    <label style={{ display:"block", fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:"uppercase" as const }}>Payment Mode</label>
                    <select value={form.paymentMode} onChange={e=>setForm(p=>({...p,paymentMode:e.target.value}))} style={{ ...inputStyle(), width:"100%" }}>
                      {PAYMENT_MODES.map(m=><option key={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  <button onClick={handleAdd} disabled={saving||!form.txnRef||!form.amount||!form.expenseDate}
                    style={{ ...btnPrimary, opacity:saving||!form.txnRef||!form.amount||!form.expenseDate?0.5:1 }}>
                    {saving?"Saving…":"💾 Save Expense"}
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
              placeholder="Search by ref, project, type…"
              style={{ border:`1px solid ${T.border}`, borderRadius:8, padding:"6px 12px", fontSize:13, outline:"none", width:220 }} />
          </div>
          <div style={{ overflowX:"auto" as const }}>
            <table style={{ width:"100%", borderCollapse:"collapse" as const }}>
              <thead>
                <tr>
                  {["#","Txn Ref","Date","Project","Site","Expense Type","Amount (₹)","Payment Mode",""].map((h,i)=>(
                    <th key={i} style={{ ...thS, textAlign:i===6?"right" as const:"left" as const }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expLoading && <tr><td colSpan={9} style={{ padding:30, textAlign:"center" as const, color:T.textMuted }}>Loading expenses...</td></tr>}
                {!expLoading && allExpenses.length === 0 && (
                  <tr><td colSpan={9} style={{ padding:30, textAlign:"center" as const, color:T.textDim }}>No expenses found</td></tr>
                )}
                {allExpenses.map((e:any, idx:number) => {
                  const proj = (projects as any[]).find(p=>p.id===e.projectId);
                  return (
                    <tr key={e.id}
                      onClick={()=>e.projectId&&router.push(`/projects/${e.projectId}`)}
                      style={{ background:idx%2===0?"#fff":T.bg, cursor:"pointer" }}
                      onMouseEnter={el=>(el.currentTarget as HTMLTableRowElement).style.background=T.primaryLight}
                      onMouseLeave={el=>(el.currentTarget as HTMLTableRowElement).style.background=idx%2===0?"#fff":T.bg}>
                      <td style={{ ...tdS, color:T.textMuted, width:36 }}>{idx+1}</td>
                      <td style={{ ...tdS, fontWeight:600, color:T.primary }}>{e.txnRef}</td>
                      <td style={{ ...tdS, color:T.textMuted, whiteSpace:"nowrap" as const }}>{fmtD(e.expenseDate)}</td>
                      <td style={tdS}>
                        <div style={{ fontWeight:600, fontSize:13 }}>{e.projectId}</div>
                        {proj && <div style={{ fontSize:10, color:T.textMuted }}>{proj.poNo}</div>}
                      </td>
                      <td style={tdS}>{e.site||proj?.site||"—"}</td>
                      <td style={tdS}>
                        <span style={{ fontSize:11, fontWeight:600, color:TYPE_COLORS[e.expenseType]||T.textMuted,
                          background:`${TYPE_COLORS[e.expenseType]||T.textMuted}18`, padding:"2px 10px", borderRadius:20, whiteSpace:"nowrap" as const }}>
                          {e.expenseType}
                        </span>
                      </td>
                      <td style={{ ...tdS, textAlign:"right" as const, fontWeight:700, color:T.primary }}>{fmt(e.amount)}</td>
                      <td style={tdS}>{e.paymentMode}</td>
                      <td style={{ ...tdS, width:36 }}>
                        {canAdd && (
                          <button onClick={ev=>{ ev.stopPropagation(); deleteExpense(e.id); }}
                            style={{ background:"none", border:"none", cursor:"pointer", color:T.danger, fontSize:15 }}>🗑</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {allExpenses.length > 0 && (
                <tfoot>
                  <tr style={{ background:T.primaryLight, fontWeight:700 }}>
                    <td colSpan={6} style={{ ...tdS, color:T.primary }}>Total</td>
                    <td style={{ ...tdS, textAlign:"right" as const, color:T.primary }}>{fmt(totalAmount)}</td>
                    <td colSpan={2} style={tdS}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
    </Layout>
  );
}
