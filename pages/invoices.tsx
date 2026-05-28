import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useInvoices } from '@/context/InvoiceContext';
import { useExpenses } from '@/context/ExpenseContext';
import { useProjects } from '@/context/ProjectContext';
import { T, card, btnPrimary, btnSecondary } from '@/lib/theme';
import Toast from '@/components/Toast';

const fmt = (n: number) => "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 });
const fmtDate = (d: string) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }); }
  catch { return d; }
};

const INV_STATUS_CFG: any = {
  Approved:     { color:"#0D9488", bg:"#F0FDFA", border:"#99F6E4" },
  Submitted:    { color:"#2563EB", bg:"#EFF6FF", border:"#BFDBFE" },
  "Under Review":{ color:"#7C3AED", bg:"#F5F3FF", border:"#DDD6FE" },
  Rejected:     { color:"#DC2626", bg:"#FEF2F2", border:"#FECACA" },
  Draft:        { color:"#6B7280", bg:"#F9FAFB", border:"#E5E7EB" },
};
const PAY_STATUS_CFG: any = {
  Paid:    { color:"#0D9488", bg:"#F0FDFA", border:"#99F6E4" },
  Pending: { color:"#D97706", bg:"#FFFBEB", border:"#FDE68A" },
  Partial: { color:"#2563EB", bg:"#EFF6FF", border:"#BFDBFE" },
};

function StatusPill({ label, cfg }: { label:string; cfg:any }) {
  return <span style={{ fontSize:11, fontWeight:700, color:cfg?.color||"#6B7280",
    background:cfg?.bg||"#F9FAFB", border:`1px solid ${cfg?.border||"#E5E7EB"}`,
    padding:"3px 10px", borderRadius:20, whiteSpace:"nowrap" as const }}>{label}</span>;
}

function SortIcon({ active, dir }: { active:boolean; dir:"asc"|"desc" }) {
  return (
    <span style={{ display:"inline-flex", flexDirection:"column" as const, marginLeft:4, opacity:active?1:0.35 }}>
      <span style={{ fontSize:8, color:active&&dir==="asc"?T.primary:"#9CA3AF", lineHeight:1 }}>▲</span>
      <span style={{ fontSize:8, color:active&&dir==="desc"?T.primary:"#9CA3AF", lineHeight:1 }}>▼</span>
    </span>
  );
}

type SortKey = "invoiceNo"|"invoiceDate"|"invoiceAmount"|"totalAmount"|"dueDate"|"invoiceStatus"|"paymentStatus";

export default function InvoicesPage() {
  const router = useRouter();
  const { profile, can, loading: authLoading } = useAuth();
  const { invoices, loading: invLoading, addInvoice, updateInvoice } = useInvoices();
  const { expenses, loading: expLoading } = useExpenses();
  const [activeTab, setActiveTab] = useState<'invoices'|'expenses'>('invoices');
  const pendingExpenses = expenses.filter((e:any) => e.status === 'pending');
  const { projects } = useProjects();
  const canCreate  = !authLoading && can("invoices", "create");
  const canApprove = !authLoading && (profile?.role === 'super_admin' || profile?.role === 'accounting_team');

  const [poSearch,    setPoSearch]    = useState("");
  const [poInput,     setPoInput]     = useState("");
  const [cardFilter,  setCardFilter]  = useState<string|null>(null);
  const [sortKey,     setSortKey]     = useState<SortKey>("invoiceDate");
  const [sortDir,     setSortDir]     = useState<"asc"|"desc">("desc");
  const [showForm,    setShowForm]    = useState(false);
  const [toast,       setToast]       = useState<any>(null);
  const [saving,      setSaving]      = useState(false);
  const [newInv,      setNewInv]      = useState({
    invoiceNo:"", invoiceDate:"", workBoqRef:"", invoiceAmount:"",
    gst:"", dueDate:"", invoiceStatus:"Draft", paymentStatus:"Pending", poNo:"",
  });

  // Smart PO match
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g,"");
  const getNum    = (s: string) => s.replace(/[^0-9]/g,"");
  const matchesPO = (invPO: string, search: string) => {
    if (!search || search.length < 2) return false;
    const sn = normalize(search), tn = normalize(invPO);
    const sg = getNum(search), tg = getNum(invPO);
    return tn.includes(sn) || (sg.length >= 3 && (tg.endsWith(sg) || tg.includes(sg)));
  };

  const matchedProject = poSearch
    ? projects.find((p:any) => matchesPO(p.poNo, poSearch) || p.id.toLowerCase().includes(poSearch.toLowerCase()))
    : null;

  const today = new Date();
  const pendingApproval = invoices.filter(i => ["Submitted","Under Review"].includes(i.invoiceStatus));
  const pendingPayment  = invoices.filter(i => i.paymentStatus === "Pending");
  const overdue         = invoices.filter(i => i.paymentStatus !== "Paid" && i.dueDate && new Date(i.dueDate) < today);

  const displayInvoices = useMemo(() => {
    let list = poSearch && matchedProject
      ? invoices.filter(i => i.projectId === (matchedProject as any).id)
      : [...invoices];
    if (cardFilter === "pendingApproval") list = list.filter(i => ["Submitted","Under Review"].includes(i.invoiceStatus));
    if (cardFilter === "pendingPayment")  list = list.filter(i => i.paymentStatus === "Pending");
    if (cardFilter === "overdue")         list = list.filter(i => i.paymentStatus !== "Paid" && i.dueDate && new Date(i.dueDate) < today);
    list.sort((a, b) => {
      const va = (a as any)[sortKey], vb = (b as any)[sortKey];
      if (typeof va === "number") return sortDir === "asc" ? va - vb : vb - va;
      return sortDir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
    return list;
  }, [invoices, poSearch, matchedProject, cardFilter, sortKey, sortDir]);

  const totalInvoiced = displayInvoices.reduce((a, i) => a + i.invoiceAmount, 0);
  const totalGST      = displayInvoices.reduce((a, i) => a + i.gst, 0);
  const totalAmount   = displayInvoices.reduce((a, i) => a + i.totalAmount, 0);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const handleUpdateStatus = async (id: string, invoiceNo: string, newStatus: string) => {
    try {
      await updateInvoice(id, { invoiceStatus: newStatus });
      setToast({ msg:`✅ Invoice ${invoiceNo} marked as ${newStatus}`, type:'success' });
    } catch(err:any) {
      setToast({ msg:'❌ '+err.message, type:'error' });
    }
  };

  const saveInvoice = async () => {
    if (!newInv.invoiceNo || !newInv.invoiceDate || !newInv.invoiceAmount) {
      setToast({ msg:'Please fill Invoice No, Date and Amount', type:'error' }); return;
    }
    const amt = Number(newInv.invoiceAmount), gst = Number(newInv.gst);
    const linkedProj = matchedProject || projects.find((p:any) => matchesPO(p.poNo, newInv.poNo));
    setSaving(true);
    try {
      await addInvoice({
        invoiceNo: newInv.invoiceNo, invoiceDate: newInv.invoiceDate,
        workBoqRef: newInv.workBoqRef, invoiceAmount: amt, gst, totalAmount: amt + gst,
        invoiceStatus: newInv.invoiceStatus, paymentStatus: newInv.paymentStatus,
        dueDate: newInv.dueDate, poNo: newInv.poNo || (linkedProj as any)?.poNo || "",
        projectId: (linkedProj as any)?.id || "",
        createdBy: profile?.full_name || "",
      });
      setNewInv({ invoiceNo:"", invoiceDate:"", workBoqRef:"", invoiceAmount:"",
        gst:"", dueDate:"", invoiceStatus:"Draft", paymentStatus:"Pending", poNo:"" });
      setShowForm(false);
      setToast({ msg:"✅ Invoice added successfully", type:"success" });
    } catch (err: any) {
      setToast({ msg:"❌ " + err.message, type:"error" });
    } finally {
      setSaving(false);
    }
  };

  const thS = (key?: SortKey): React.CSSProperties => ({
    padding:"10px 12px", fontSize:10, fontWeight:700, textTransform:"uppercase",
    background:T.primaryLight, color:T.primary, textAlign:"left" as const,
    borderBottom:`2px solid ${T.primaryMid}`, whiteSpace:"nowrap" as const,
    cursor: key ? "pointer" : "default", userSelect:"none" as const,
  });
  const tdS: React.CSSProperties = {
    padding:"10px 12px", fontSize:13, borderBottom:`1px solid ${T.border}`, verticalAlign:"middle" as const,
  };

  const fmt  = (v: number) => "₹" + Number(v).toLocaleString("en-IN");
  const fmtD = (d: string) => { try { return new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}); } catch { return d||"—"; } };
  const TYPE_COLORS: Record<string,string> = { "Advance":"#2563EB","Material Purchase":"#7C3AED","Labour Charge":"#D97706","Transport":"#0D9488","Equipment Rental":"#DC2626","Miscellaneous":"#6B7280" };


  return (
    <Layout>
      <div className="fade-in">
        {/* Tab switcher */}
        <div style={{ display:"flex", gap:0, marginBottom:20, borderBottom:`2px solid ${T.border}` }}>
          {([["invoices","📄 Invoices"],["expenses","💸 Expense Requests"]] as [string,string][]).map(([tab,label])=>(
            <button key={tab} onClick={()=>setActiveTab(tab as any)}
              style={{ padding:"10px 20px", fontSize:14, fontWeight:activeTab===tab?700:400,
                color:activeTab===tab?T.primary:T.textMuted, background:"none", border:"none",
                borderBottom:activeTab===tab?`2px solid ${T.primary}`:"2px solid transparent",
                cursor:"pointer", marginBottom:-2, transition:"all 0.15s" }}>
              {label}
              {tab==="expenses" && pendingExpenses.length > 0 && (
                <span style={{ marginLeft:6, background:T.danger, color:"#fff", borderRadius:20, padding:"1px 7px", fontSize:11, fontWeight:700 }}>
                  {pendingExpenses.length}
                </span>
              )}
            </button>
          ))}
        </div>
        {activeTab === 'expenses' && (
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:14 }}>
              Expense Requests <span style={{ fontSize:12, fontWeight:400, color:T.textMuted }}>· {pendingExpenses.length} pending</span>
            </div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" as const }}>
                <thead>
                  <tr>
                    {["#","Date","Project","Site","Type","Amount (₹)","Requested By","Status"].map((h,i)=>(
                      <th key={i} style={{ padding:"10px 12px", fontSize:10, fontWeight:700, textTransform:"uppercase" as const,
                        color:T.primary, background:T.primaryLight, textAlign:i===5?"right" as const:"left" as const,
                        borderBottom:`2px solid ${T.primaryMid}`, whiteSpace:"nowrap" as const }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {expLoading && <tr><td colSpan={8} style={{ padding:30, textAlign:"center" as const }}>Loading...</td></tr>}
                  {pendingExpenses.length === 0 && !expLoading && (
                    <tr><td colSpan={8} style={{ padding:30, textAlign:"center" as const, color:T.textDim }}>No pending expense requests</td></tr>
                  )}
                  {pendingExpenses.map((e:any, i:number) => (
                    <tr key={e.id} style={{ background:i%2===0?"#fff":"#FFFBEB" }}>
                      <td style={{ padding:"10px 12px", fontSize:13, borderBottom:`1px solid ${T.border}`, color:T.textMuted }}>{i+1}</td>
                      <td style={{ padding:"10px 12px", fontSize:13, borderBottom:`1px solid ${T.border}` }}>{fmtD(e.expenseDate)}</td>
                      <td style={{ padding:"10px 12px", fontSize:13, borderBottom:`1px solid ${T.border}`, fontWeight:600, color:T.primary }}>{e.projectId}</td>
                      <td style={{ padding:"10px 12px", fontSize:13, borderBottom:`1px solid ${T.border}` }}>{e.site||"—"}</td>
                      <td style={{ padding:"10px 12px", fontSize:13, borderBottom:`1px solid ${T.border}` }}>
                        <span style={{ fontSize:11, fontWeight:600, color:TYPE_COLORS[e.expenseType]||T.textMuted,
                          background:`${TYPE_COLORS[e.expenseType]||"#6B7280"}18`, padding:"2px 10px", borderRadius:20 }}>
                          {e.expenseType}
                        </span>
                      </td>
                      <td style={{ padding:"10px 12px", fontSize:13, borderBottom:`1px solid ${T.border}`, textAlign:"right" as const, fontWeight:700, color:T.primary }}>{fmt(e.amount)}</td>
                      <td style={{ padding:"10px 12px", fontSize:13, borderBottom:`1px solid ${T.border}`, color:T.textMuted }}>{e.createdBy||"—"}</td>
                      <td style={{ padding:"10px 12px", fontSize:13, borderBottom:`1px solid ${T.border}` }}>
                        <span style={{ fontSize:11, fontWeight:600, background:"#FEF3C7", color:"#D97706", padding:"3px 10px", borderRadius:20 }}>Pending</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* Tab switcher */}
        <div style={{ display:"flex", gap:0, marginBottom:20, borderBottom:`2px solid ${T.border}` }}>
          {([["invoices","📄 Invoices"],["expenses","💸 Expense Requests"]] as [string,string][]).map(([tab,label])=>(
            <button key={tab} onClick={()=>setActiveTab(tab as any)}
              style={{ padding:"10px 20px", fontSize:14, fontWeight:activeTab===tab?700:400,
                color:activeTab===tab?T.primary:T.textMuted, background:"none", border:"none",
                borderBottom:activeTab===tab?`2px solid ${T.primary}`:"2px solid transparent",
                cursor:"pointer", marginBottom:-2, transition:"all 0.15s" }}>
              {label}
              {tab==="expenses" && pendingExpenses.length > 0 && (
                <span style={{ marginLeft:6, background:T.danger, color:"#fff", borderRadius:20, padding:"1px 7px", fontSize:11, fontWeight:700 }}>
                  {pendingExpenses.length}
                </span>
              )}
            </button>
          ))}
        </div>
        {activeTab === 'expenses' && (
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:14 }}>
              Expense Requests <span style={{ fontSize:12, fontWeight:400, color:T.textMuted }}>· {pendingExpenses.length} pending</span>
            </div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" as const }}>
                <thead>
                  <tr>
                    {["#","Date","Project","Site","Type","Amount (₹)","Requested By","Status"].map((h,i)=>(
                      <th key={i} style={{ padding:"10px 12px", fontSize:10, fontWeight:700, textTransform:"uppercase" as const,
                        color:T.primary, background:T.primaryLight, textAlign:i===5?"right" as const:"left" as const,
                        borderBottom:`2px solid ${T.primaryMid}`, whiteSpace:"nowrap" as const }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {expLoading && <tr><td colSpan={8} style={{ padding:30, textAlign:"center" as const }}>Loading...</td></tr>}
                  {pendingExpenses.length === 0 && !expLoading && (
                    <tr><td colSpan={8} style={{ padding:30, textAlign:"center" as const, color:T.textDim }}>No pending expense requests</td></tr>
                  )}
                  {pendingExpenses.map((e:any, i:number) => (
                    <tr key={e.id} style={{ background:i%2===0?"#fff":"#FFFBEB" }}>
                      <td style={{ padding:"10px 12px", fontSize:13, borderBottom:`1px solid ${T.border}`, color:T.textMuted }}>{i+1}</td>
                      <td style={{ padding:"10px 12px", fontSize:13, borderBottom:`1px solid ${T.border}` }}>{fmtD(e.expenseDate)}</td>
                      <td style={{ padding:"10px 12px", fontSize:13, borderBottom:`1px solid ${T.border}`, fontWeight:600, color:T.primary }}>{e.projectId}</td>
                      <td style={{ padding:"10px 12px", fontSize:13, borderBottom:`1px solid ${T.border}` }}>{e.site||"—"}</td>
                      <td style={{ padding:"10px 12px", fontSize:13, borderBottom:`1px solid ${T.border}` }}>
                        <span style={{ fontSize:11, fontWeight:600, color:TYPE_COLORS[e.expenseType]||T.textMuted,
                          background:`${TYPE_COLORS[e.expenseType]||"#6B7280"}18`, padding:"2px 10px", borderRadius:20 }}>
                          {e.expenseType}
                        </span>
                      </td>
                      <td style={{ padding:"10px 12px", fontSize:13, borderBottom:`1px solid ${T.border}`, textAlign:"right" as const, fontWeight:700, color:T.primary }}>{fmt(e.amount)}</td>
                      <td style={{ padding:"10px 12px", fontSize:13, borderBottom:`1px solid ${T.border}`, color:T.textMuted }}>{e.createdBy||"—"}</td>
                      <td style={{ padding:"10px 12px", fontSize:13, borderBottom:`1px solid ${T.border}` }}>
                        <span style={{ fontSize:11, fontWeight:600, background:"#FEF3C7", color:"#D97706", padding:"3px 10px", borderRadius:20 }}>Pending</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {activeTab === 'invoices' && (
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div>
            <div style={{ fontSize:22, fontWeight:800, color:T.text }}>Invoices</div>
            <div style={{ fontSize:13, color:T.textMuted, marginTop:2 }}>
              {invLoading ? "Loading..." : `${invoices.length} invoices across ${new Set(invoices.map(i=>i.projectId)).size} projects`}
            </div>
          </div>
          {canCreate && (
            <button onClick={() => setShowForm(true)} style={{ ...btnPrimary, fontSize:13 }}>+ New Invoice</button>
          )}
        </div>

        {/* PO Search */}
        <div style={{ ...card, marginBottom:16 }}>
          <div style={{ fontSize:13, fontWeight:600, color:T.text, marginBottom:10 }}>🔍 Search by PO Number or Project ID</div>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <input value={poInput} onChange={e => { setPoInput(e.target.value); setPoSearch(e.target.value); }}
              placeholder="e.g. PO-2025-001 or VE-2025-001"
              style={{ flex:1, border:`1px solid ${T.border}`, borderRadius:8, padding:"10px 14px", fontSize:13, outline:"none", color:T.text }} />
            {poSearch && <button onClick={() => { setPoSearch(""); setPoInput(""); }} style={{ ...btnSecondary }}>Clear</button>}
            {poSearch && !matchedProject && (
              <span style={{ fontSize:12, color:T.danger }}>⚠️ No project found for "{poSearch}"</span>
            )}
          </div>
          {matchedProject && (
            <div style={{ marginTop:12, padding:"10px 14px", background:T.primaryLight, borderRadius:8, fontSize:13, display:"flex", gap:24 }}>
              <span><b>{(matchedProject as any).id}</b> — {(matchedProject as any).site}</span>
              <span style={{ color:T.textMuted }}>PO: {(matchedProject as any).poNo}</span>
              <span style={{ color:T.textMuted }}>PM: {(matchedProject as any).pm}</span>
              <button onClick={() => router.push(`/projects/${(matchedProject as any).id}`)}
                style={{ marginLeft:"auto", background:"none", border:`1px solid ${T.primary}`, borderRadius:6,
                  padding:"3px 12px", color:T.primary, cursor:"pointer", fontSize:12, fontWeight:600 }}>
                Open Project →
              </button>
            </div>
          )}
        </div>

        {/* Clickable summary cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
          {[
            { label:"Total Invoices",   value:invoices.length, sub:fmt(invoices.reduce((a,i)=>a+i.totalAmount,0)), color:T.primary,  filter:null,              icon:"📄" },
            { label:"Pending Approval", value:pendingApproval.length, sub:`${pendingApproval.length} need review`, color:"#2563EB",  filter:"pendingApproval", icon:"⏳" },
            { label:"Pending Payment",  value:pendingPayment.length,  sub:fmt(pendingPayment.reduce((a,i)=>a+i.totalAmount,0)), color:"#D97706", filter:"pendingPayment", icon:"💳" },
            { label:"Overdue",          value:overdue.length, sub:fmt(overdue.reduce((a,i)=>a+i.totalAmount,0)), color:T.danger, filter:"overdue", icon:"⚠️" },
          ].map(s => (
            <div key={s.label} onClick={() => setCardFilter(cardFilter === s.filter ? null : s.filter)}
              style={{ ...card, padding:"16px 18px", cursor:"pointer", position:"relative" as const,
                border:`1.5px solid ${cardFilter === s.filter ? s.color : T.border}`,
                background: cardFilter === s.filter ? `${s.color}08` : "#fff", transition:"all 0.15s" }}>
              <div style={{ fontSize:22, marginBottom:6 }}>{s.icon}</div>
              <div style={{ fontSize:24, fontWeight:800, color:s.color, marginBottom:2 }}>{s.value}</div>
              <div style={{ fontSize:11, fontWeight:700, color:T.textMuted, textTransform:"uppercase", marginBottom:4 }}>{s.label}</div>
              <div style={{ fontSize:11, color:T.textDim }}>{s.sub}</div>
              {cardFilter === s.filter && s.filter && (
                <div style={{ position:"absolute" as const, top:8, right:8, fontSize:10, color:s.color,
                  background:`${s.color}15`, padding:"2px 6px", borderRadius:4, fontWeight:600 }}>FILTERED</div>
              )}
            </div>
          ))}
        </div>

        {/* Add Invoice Form */}
        {showForm && canCreate && (
          <div style={{ ...card, marginBottom:16, border:`1.5px solid ${T.primaryMid}`, background:T.primaryLight }}>
            <div style={{ fontSize:14, fontWeight:700, color:T.primary, marginBottom:14 }}>+ New Invoice</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:12 }}>
              {([["PO Number","poNo","text","PO-2025-XXX"],["Invoice No *","invoiceNo","text","INV-2025-XXX"],
                 ["Work/BOQ Ref","workBoqRef","text","BOQ-XXX-001"],["Invoice Date *","invoiceDate","date",""],
                 ["Due Date","dueDate","date",""],["Invoice Amount (₹) *","invoiceAmount","number",""],
                 ["GST (₹)","gst","number",""]] as [string,string,string,string][]).map(([label,field,type,ph]) => (
                <div key={field}>
                  <label style={{ display:"block", fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:"uppercase" as const }}>{label}</label>
                  <input type={type} value={(newInv as any)[field]} placeholder={ph}
                    onChange={e => setNewInv(p => ({ ...p, [field]: e.target.value }))}
                    style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:"7px 10px",
                      fontSize:13, width:"100%", boxSizing:"border-box" as const, outline:"none", background:"#fff" }} />
                </div>
              ))}
              <div>
                <label style={{ display:"block", fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:"uppercase" as const }}>Invoice Status</label>
                <select value={newInv.invoiceStatus} onChange={e => setNewInv(p => ({ ...p, invoiceStatus: e.target.value }))}
                  style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:"7px 10px", fontSize:13, width:"100%", outline:"none", background:"#fff", cursor:"pointer" }}>
                  {["Draft","Submitted","Under Review","Approved","Rejected"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display:"block", fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:"uppercase" as const }}>Payment Status</label>
                <select value={newInv.paymentStatus} onChange={e => setNewInv(p => ({ ...p, paymentStatus: e.target.value }))}
                  style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:"7px 10px", fontSize:13, width:"100%", outline:"none", background:"#fff", cursor:"pointer" }}>
                  {["Pending","Partial","Paid"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={saveInvoice} disabled={saving || !newInv.invoiceNo || !newInv.invoiceDate || !newInv.invoiceAmount}
                style={{ ...btnPrimary, opacity: saving || !newInv.invoiceNo || !newInv.invoiceDate || !newInv.invoiceAmount ? 0.5 : 1 }}>
                {saving ? "Saving…" : "💾 Save Invoice"}
              </button>
              <button onClick={() => setShowForm(false)} style={{ ...btnSecondary }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Invoice Table */}
        <div style={card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div style={{ fontSize:14, fontWeight:700, color:T.text }}>
              {poSearch && matchedProject ? `Invoices for ${(matchedProject as any).id}` : "All Invoices"}
              <span style={{ fontSize:12, fontWeight:400, color:T.textMuted, marginLeft:10 }}>{displayInvoices.length} records</span>
            </div>
          </div>
          <div style={{ overflowX:"auto" as const }}>
            <table style={{ width:"100%", borderCollapse:"collapse" as const, minWidth:900 }}>
              <thead>
                <tr>
                  <th style={thS()}>#</th>
                  {([["invoiceNo","Invoice No"],["invoiceDate","Invoice Date"],["workBoqRef","Work/BOQ Ref"],
                     ["invoiceAmount","Amount (₹)"],["gst","GST (₹)"],["totalAmount","Total (₹)"],
                     ["invoiceStatus","Inv. Status"],["paymentStatus","Pay Status"],["dueDate","Due Date"]] as [SortKey,string][])
                    .map(([key, label]) => (
                      <th key={key} style={thS(key)} onClick={() => handleSort(key)}>
                        {label}<SortIcon active={sortKey === key} dir={sortDir} />
                      </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invLoading && <tr><td colSpan={10} style={{ padding:30, textAlign:"center" as const, color:T.textMuted }}>Loading invoices...</td></tr>}
                {!invLoading && displayInvoices.length === 0 && (
                  <tr><td colSpan={10} style={{ padding:32, textAlign:"center" as const, color:T.textDim }}>No invoices found</td></tr>
                )}
                {displayInvoices.map((inv, idx) => {
                  const proj = projects.find((p:any) => p.id === inv.projectId);
                  return (
                    <tr key={inv.id}
                      onClick={() => inv.projectId && router.push(`/projects/${inv.projectId}`)}
                      style={{ background: idx % 2 === 0 ? "#fff" : T.bg, cursor:"pointer" }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = T.primaryLight}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = idx % 2 === 0 ? "#fff" : T.bg}>
                      <td style={{ ...tdS, color:T.textMuted, width:36 }}>{idx + 1}</td>
                      <td style={tdS}>
                        <div style={{ fontWeight:700, color:T.primary, fontSize:13 }}>{inv.invoiceNo}</div>
                        <div style={{ fontSize:10, color:T.textMuted }}>{inv.poNo}</div>
                      </td>
                      <td style={{ ...tdS, color:T.textMuted, whiteSpace:"nowrap" as const }}>{fmtDate(inv.invoiceDate)}</td>
                      <td style={tdS}>{inv.workBoqRef || "—"}</td>
                      <td style={{ ...tdS, textAlign:"right" as const, fontWeight:600 }}>{fmt(inv.invoiceAmount)}</td>
                      <td style={{ ...tdS, textAlign:"right" as const, color:T.textMuted }}>{fmt(inv.gst)}</td>
                      <td style={{ ...tdS, textAlign:"right" as const, fontWeight:700, color:T.primary }}>{fmt(inv.totalAmount)}</td>
                      <td style={tdS}><StatusPill label={inv.invoiceStatus} cfg={INV_STATUS_CFG[inv.invoiceStatus] || INV_STATUS_CFG.Draft} /></td>
                      <td style={tdS}><StatusPill label={inv.paymentStatus} cfg={PAY_STATUS_CFG[inv.paymentStatus] || PAY_STATUS_CFG.Pending} /></td>
                      <td style={{ ...tdS, whiteSpace:"nowrap" as const, color:T.textMuted }}>{fmtDate(inv.dueDate)}</td>
                      {canApprove && (
                        <td style={tdS}>
                          <div style={{ display:'flex', gap:4 }}>
                            {inv.invoiceStatus==='Submitted' && (
                              <>
                                <button onClick={e=>{e.stopPropagation();handleUpdateStatus(inv.id,inv.invoiceNo,'Approved');}}
                                  style={{ background:'#F0FDFA', border:'none', borderRadius:5, padding:'4px 8px', color:'#0D9488', cursor:'pointer', fontSize:11, fontWeight:600 }}>✓ Approve</button>
                                <button onClick={e=>{e.stopPropagation();handleUpdateStatus(inv.id,inv.invoiceNo,'Rejected');}}
                                  style={{ background:'#FEF2F2', border:'none', borderRadius:5, padding:'4px 8px', color:'#DC2626', cursor:'pointer', fontSize:11, fontWeight:600 }}>✗ Reject</button>
                              </>
                            )}
                            {inv.invoiceStatus==='Draft' && (
                              <button onClick={e=>{e.stopPropagation();handleUpdateStatus(inv.id,inv.invoiceNo,'Submitted');}}
                                style={{ background:'#EFF6FF', border:'none', borderRadius:5, padding:'4px 8px', color:'#2563EB', cursor:'pointer', fontSize:11, fontWeight:600 }}>Submit</button>
                            )}
                            {inv.invoiceStatus==='Under Review' && (
                              <button onClick={e=>{e.stopPropagation();handleUpdateStatus(inv.id,inv.invoiceNo,'Approved');}}
                                style={{ background:'#F0FDFA', border:'none', borderRadius:5, padding:'4px 8px', color:'#0D9488', cursor:'pointer', fontSize:11, fontWeight:600 }}>✓ Approve</button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              {displayInvoices.length > 0 && (
                <tfoot>
                  <tr style={{ background:T.primaryLight, fontWeight:700 }}>
                    <td colSpan={4} style={{ ...tdS, color:T.primary }}>Total</td>
                    <td style={{ ...tdS, textAlign:"right" as const, color:T.primary }}>{fmt(totalInvoiced)}</td>
                    <td style={{ ...tdS, textAlign:"right" as const, color:T.textMuted }}>{fmt(totalGST)}</td>
                    <td style={{ ...tdS, textAlign:"right" as const, color:T.primary }}>{fmt(totalAmount)}</td>
                    <td colSpan={3} style={tdS}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
        )}
        )}
    </Layout>
  );
}
