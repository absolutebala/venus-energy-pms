import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import DateInput from '@/components/DateInput';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useInvoices } from '@/context/InvoiceContext';
import * as XLSX from 'xlsx';
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
  const [editInvId,   setEditInvId]   = useState<string|null>(null);
  const [editInvRow,  setEditInvRow]  = useState<any>({});
  const [dateFrom,    setDateFrom]    = useState('');
  const [dateTo,      setDateTo]      = useState('');
  const [datePreset,  setDatePreset]  = useState('all');
  const [customFrom,  setCustomFrom]  = useState('');
  const [customTo,    setCustomTo]    = useState('');
  const [invVendor,   setInvVendor]   = useState('');
  const [invPM,       setInvPM]       = useState('');
  const [invRegion,   setInvRegion]   = useState('');
  const [invType,     setInvType]     = useState('');
  const [invPage,     setInvPage]     = useState(1);
  const INV_PER_PAGE = 10;
  const canExport = !authLoading && (profile?.role === 'super_admin' || profile?.role === 'accounting_team');
  const [newInv,      setNewInv]      = useState({
    invoiceNo:"", invoiceDate:"", invoiceAmount:"",
    gst:"", dueDate:"", invoiceStatus:"Draft", paymentStatus:"Pending", poNo:"",
    wccNo:"", receiptNo:"",
  });

  const saveInvEdit = async () => {
    if (!editInvId) return;
    setSaving(true);
    try {
      const amt = Number(editInvRow.invoiceAmount)||0, gstPct = Number(editInvRow.gst)||0, gst = amt * gstPct / 100;
      await updateInvoice(editInvId, {
        invoiceNo: editInvRow.invoiceNo, invoiceDate: editInvRow.invoiceDate,
        invoiceAmount: amt, gst, totalAmount: amt + gst,
        dueDate: editInvRow.dueDate, invoiceStatus: editInvRow.invoiceStatus,
        paymentStatus: editInvRow.paymentStatus,
        wccNo: editInvRow.wccNo||'', receiptNo: editInvRow.receiptNo||'',
      } as any);
      setEditInvId(null); setEditInvRow({});
      setToast({ msg:'✅ Invoice updated', type:'success' });
    } catch(err:any) { setToast({ msg:'❌ ' + err.message, type:'error' }); }
    finally { setSaving(false); }
  };

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

  // Apply date filter — must be before KPI calcs
  const dateFilteredInvoices = React.useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    const todayStr = today.toISOString().split('T')[0];
    const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate()-today.getDay());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const fmtD = (d: Date) => d.toISOString().split('T')[0];
    return invoices.filter(i => {
      const d = i.invoiceDate;
      if (datePreset === 'today')   return d === todayStr;
      if (datePreset === 'week')    return d >= fmtD(startOfWeek) && d <= todayStr;
      if (datePreset === 'month')   return d >= fmtD(startOfMonth) && d <= todayStr;
      if (datePreset === 'custom' && customFrom && customTo) return d >= customFrom && d <= customTo;
      // project-level filters
      return true;
    }).filter(i => {
      const proj = (projects as any[]).find((p:any) => p.id === i.projectId);
      if (invVendor && proj?.vendor !== invVendor) return false;
      if (invPM     && proj?.pm     !== invPM)     return false;
      if (invRegion && proj?.region !== invRegion) return false;
      if (invType   && proj?.type   !== invType)   return false;
      return true;
    });
  }, [invoices, datePreset, customFrom, customTo, invVendor, invPM, invRegion, invType, projects]);

  const pendingApproval = dateFilteredInvoices.filter(i => ["Submitted","Under Review"].includes(i.invoiceStatus));
  const pendingPayment  = dateFilteredInvoices.filter(i => i.paymentStatus === "Pending");
  const overdue         = dateFilteredInvoices.filter(i => i.paymentStatus !== "Paid" && i.dueDate && new Date(i.dueDate) < today);

  const displayInvoices = useMemo(() => {
    let list = poSearch && matchedProject
      ? dateFilteredInvoices.filter(i => i.projectId === (matchedProject as any).id)
      : [...dateFilteredInvoices];
    if (cardFilter === "pendingApproval") list = list.filter(i => ["Submitted","Under Review"].includes(i.invoiceStatus));
    if (cardFilter === "pendingPayment")  list = list.filter(i => i.paymentStatus === "Pending");
    if (cardFilter === "overdue")         list = list.filter(i => i.paymentStatus !== "Paid" && i.dueDate && new Date(i.dueDate) < today);
    list.sort((a, b) => {
      const va = (a as any)[sortKey], vb = (b as any)[sortKey];
      if (typeof va === "number") return sortDir === "asc" ? va - vb : vb - va;
      return sortDir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
    return list;
  }, [dateFilteredInvoices, poSearch, matchedProject, cardFilter, sortKey, sortDir]);

  // Reset page on filter change
  React.useEffect(() => { setInvPage(1); }, [datePreset, customFrom, customTo, invVendor, invPM, invRegion, invType, cardFilter, poSearch]);

  const invTotalPages   = Math.ceil(displayInvoices.length / INV_PER_PAGE);
  const paginatedInv    = displayInvoices.slice((invPage-1)*INV_PER_PAGE, invPage*INV_PER_PAGE);
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
    const amt = Number(newInv.invoiceAmount), gstPct = Number(newInv.gst), gst = amt * gstPct / 100;
    const linkedProj = matchedProject || projects.find((p:any) => matchesPO(p.poNo, newInv.poNo));
    setSaving(true);
    try {
      await addInvoice({
        invoiceNo: newInv.invoiceNo, invoiceDate: newInv.invoiceDate,
        invoiceAmount: amt, gst, totalAmount: amt + gst,
        wccNo: newInv.wccNo||"", receiptNo: newInv.receiptNo||"",
        invoiceStatus: newInv.invoiceStatus, paymentStatus: newInv.paymentStatus,
        dueDate: newInv.dueDate, poNo: newInv.poNo || (linkedProj as any)?.poNo || "",
        projectId: (linkedProj as any)?.id || "",
        createdBy: profile?.full_name || "",
      });
      setNewInv({ invoiceNo:"", invoiceDate:"", invoiceAmount:"",
        gst:"", dueDate:"", invoiceStatus:"Draft", paymentStatus:"Pending", poNo:"",
        wccNo:"", receiptNo:"" });
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

  const exportToExcel = () => {
    const rows = displayInvoices.map((inv, idx) => ({
      'S.No':           idx + 1,
      'PO No':          (inv as any).poNo || '',
      'PO Date':        (projects.find((p:any)=>p.id===inv.projectId) as any)?.poDate || '',
      'Indus ID':       (projects.find((p:any)=>p.id===inv.projectId) as any)?.indusId || '',
      'Project ID':     inv.projectId || '',
      'Project':        (projects.find((p:any)=>p.id===inv.projectId) as any)?.site || '',
      'WCC No':         (inv as any).wccNo || '',
      'Receipt No':     (inv as any).receiptNo || '',
      'Invoice No':     inv.invoiceNo,
      'Invoice Date':   inv.invoiceDate,
      'Basic Amount':   inv.invoiceAmount,
      'GST (%)':        inv.invoiceAmount > 0 ? ((inv.gst / inv.invoiceAmount) * 100).toFixed(1) + '%' : '0%',
      'Tax Amount (₹)':  inv.gst,
      'Total Amount':   inv.totalAmount,
      'Circle':         (projects.find((p:any)=>p.id===inv.projectId) as any)?.region || '',
      'Project Status': (projects.find((p:any)=>p.id===inv.projectId) as any)?.projectStatus || '',
      'Invoice Status': inv.invoiceStatus,
      'Payment Status': inv.paymentStatus,
      'Due Date':       inv.dueDate || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{wch:6},{wch:16},{wch:14},{wch:16},{wch:14},{wch:12},{wch:14},{wch:14},{wch:14},{wch:14},{wch:14},{wch:14}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
    const date = new Date().toISOString().slice(0,10);
    XLSX.writeFile(wb, `Venus_Invoices_${date}.xlsx`);
  };

  return (
    <Layout>
      <div className="fade-in">
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div>
            <div style={{ fontSize:22, fontWeight:800, color:T.text }}>Invoices</div>
            <div style={{ fontSize:13, color:T.textMuted, marginTop:2 }}>
              {invLoading ? "Loading..." : `${invoices.length} invoices across ${new Set(invoices.map(i=>i.projectId)).size} projects`}
            </div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' as const }}>
            {canExport && (
              <button onClick={exportToExcel}
                style={{ ...btnSecondary, fontSize:12, display:'flex', alignItems:'center', gap:6 }}>
                📥 Excel
              </button>
            )}
            {canCreate && (
              <button onClick={() => setShowForm(true)} style={{ ...btnPrimary, fontSize:13 }}>+ New Invoice</button>
            )}
          </div>
        </div>

        {/* Date Preset Filter */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, flexWrap:'wrap' as const }}>
          {([['all','All'],['today','Today'],['week','This Week'],['month','This Month'],['custom','Custom']] as [string,string][]).map(([val,label])=>(
            <button key={val} onClick={()=>{ setDatePreset(val); setCardFilter(null); }}
              style={{ background:datePreset===val?T.primary:'#fff', color:datePreset===val?'#fff':T.textMuted,
                border:`1px solid ${datePreset===val?T.primary:T.border}`, borderRadius:8,
                padding:'6px 14px', cursor:'pointer', fontSize:12, fontWeight:datePreset===val?700:400 }}>
              {label}
            </button>
          ))}
          {datePreset==='custom' && (
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <DateInput value={customFrom} onChange={setCustomFrom}
                style={{ border:`1px solid ${T.border}`, borderRadius:8, padding:'6px 10px', fontSize:12, outline:'none' }} />
              <span style={{ fontSize:12, color:T.textMuted }}>to</span>
              <DateInput value={customTo} onChange={setCustomTo}
                style={{ border:`1px solid ${T.border}`, borderRadius:8, padding:'6px 10px', fontSize:12, outline:'none' }} />
            </div>
          )}
        </div>

        {/* Cascading dropdown filters */}
        {(() => {
          const cascadeProj = (exclude: string) => (projects as any[]).filter((p:any) => {
            const hasInv = invoices.some(i => i.projectId === p.id);
            if (!hasInv) return false;
            if (exclude!=='vendor' && invVendor && p.vendor !== invVendor) return false;
            if (exclude!=='pm'     && invPM     && p.pm     !== invPM)     return false;
            if (exclude!=='region' && invRegion && p.region !== invRegion) return false;
            if (exclude!=='type'   && invType   && p.type   !== invType)   return false;
            return true;
          });
          const uniq = (arr: any[]) => Array.from(new Set(arr.filter(Boolean))).sort() as string[];
          return (
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' as const, marginBottom:16, alignItems:'center' }}>
            <select value={invVendor} onChange={e=>setInvVendor(e.target.value)}
              style={{ border:`1px solid ${T.border}`, borderRadius:8, padding:'6px 12px', fontSize:12, outline:'none', background:'#fff', cursor:'pointer' }}>
              <option value="">All Vendors</option>
              {uniq(cascadeProj('vendor').map((p:any)=>p.vendor)).map(v=><option key={v} value={v}>{v}</option>)}
            </select>
            <select value={invPM} onChange={e=>setInvPM(e.target.value)}
              style={{ border:`1px solid ${T.border}`, borderRadius:8, padding:'6px 12px', fontSize:12, outline:'none', background:'#fff', cursor:'pointer' }}>
              <option value="">All PMs</option>
              {uniq(cascadeProj('pm').map((p:any)=>p.pm)).map(pm=><option key={pm} value={pm}>{pm}</option>)}
            </select>
            <select value={invRegion} onChange={e=>setInvRegion(e.target.value)}
              style={{ border:`1px solid ${T.border}`, borderRadius:8, padding:'6px 12px', fontSize:12, outline:'none', background:'#fff', cursor:'pointer' }}>
              <option value="">All Regions</option>
              {uniq(cascadeProj('region').map((p:any)=>p.region)).map(r=><option key={r} value={r}>{r}</option>)}
            </select>
            <select value={invType} onChange={e=>setInvType(e.target.value)}
              style={{ border:`1px solid ${T.border}`, borderRadius:8, padding:'6px 12px', fontSize:12, outline:'none', background:'#fff', cursor:'pointer' }}>
              <option value="">All Types</option>
              {uniq(cascadeProj('type').map((p:any)=>p.type)).map(t=><option key={t} value={t}>{t}</option>)}
            </select>
            {(invVendor||invPM||invRegion||invType) && (
              <button onClick={()=>{ setInvVendor(''); setInvPM(''); setInvRegion(''); setInvType(''); }}
                style={{ fontSize:11, color:'#DC2626', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:6, padding:'5px 10px', cursor:'pointer', fontWeight:600 }}>
                ✕ Clear
              </button>
            )}
          </div>
          );
        })()}

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
            { label:"Total Invoices",   value:dateFilteredInvoices.length, sub:fmt(dateFilteredInvoices.reduce((a,i)=>a+i.totalAmount,0)), color:T.primary,  filter:null,              icon:"📄" },
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
                 ["Invoice Date *","invoiceDate","date",""],["Due Date","dueDate","date",""],
                 ["Basic Amount (₹) *","invoiceAmount","number",""],["GST (%)","gst","number",""],
                 ["WCC No","wccNo","text",""],["Receipt No","receiptNo","text",""]] as [string,string,string,string][]).map(([label,field,type,ph]) => (
                <div key={field}>
                  <label style={{ display:"block", fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:"uppercase" as const }}>{label}</label>
                  {type === 'date' ? (
                    <DateInput value={(newInv as any)[field]} onChange={v => setNewInv(p => ({ ...p, [field]: v }))}
                      max={field === 'dueDate' ? '9999-12-31' : undefined}
                      style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:"7px 10px",
                        fontSize:13, width:"100%", boxSizing:"border-box" as const, outline:"none", background:"#fff" }} />
                  ) : (
                    <input type={type} value={(newInv as any)[field]} placeholder={ph}
                      onChange={e => setNewInv(p => ({ ...p, [field]: e.target.value }))}
                      style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:"7px 10px",
                        fontSize:13, width:"100%", boxSizing:"border-box" as const, outline:"none", background:"#fff" }} />
                  )}
                </div>
              ))}
              <div>
                <label style={{ display:"block", fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:"uppercase" as const }}>Total Amount (₹)</label>
                <div style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:"7px 10px", fontSize:13, background:T.primaryLight, fontWeight:700, color:T.primary }}>
                  {(Number(newInv.invoiceAmount)||0) > 0
                    ? '₹' + ((Number(newInv.invoiceAmount)||0) * (1 + (Number(newInv.gst)||0)/100)).toLocaleString('en-IN', {maximumFractionDigits:2})
                    : '—'}
                </div>
              </div>
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
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ fontSize:14, fontWeight:700, color:T.text }}>
                {poSearch && matchedProject ? `Invoices for ${(matchedProject as any).id}` : "All Invoices"}
                <span style={{ fontSize:12, fontWeight:400, color:T.textMuted, marginLeft:10 }}>{displayInvoices.length} records</span>
              </div>
              {canExport && (
                <button onClick={exportToExcel}
                  style={{ background:T.primaryLight, color:T.primary, border:`1px solid ${T.primaryMid}`, borderRadius:7, padding:'5px 12px', fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                  📥 Excel
                </button>
              )}
            </div>
          </div>
          <div style={{ overflowX:"auto" as const }}>
            <table style={{ width:"100%", borderCollapse:"collapse" as const, minWidth:900 }}>
              <thead>
                <tr>
                  <th style={thS()}>#</th>
                  {([["poNo","PO No"],["invoiceDate","PO Date"],["invoiceDate","Indus ID"],["invoiceNo","Project ID"],["invoiceNo","Project"],
                     ["invoiceNo","WCC No"],["invoiceNo","Receipt No"],["invoiceNo","Invoice No"],["invoiceDate","Invoice Date"],
                     ["invoiceAmount","Basic Amt (₹)"],["gst","GST (%)"],["gst","Tax Amt (₹)"],["totalAmount","Total Amt (₹)"],
                     ["invoiceNo","Circle"],["invoiceNo","Project Status"]] as [SortKey,string][])
                    .map(([key, label]) => (
                      <th key={label} style={thS(key)} onClick={() => handleSort(key)}>
                        {label}<SortIcon active={sortKey === key} dir={sortDir} />
                      </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invLoading && <tr><td colSpan={17} style={{ padding:30, textAlign:"center" as const, color:T.textMuted }}>Loading invoices...</td></tr>}
                {!invLoading && displayInvoices.length === 0 && (
                  <tr><td colSpan={17} style={{ padding:32, textAlign:"center" as const, color:T.textDim }}>No invoices found</td></tr>
                )}
                {paginatedInv.map((inv, idx) => {
                  const proj = projects.find((p:any) => p.id === inv.projectId);
                  return (
                    <React.Fragment key={inv.id}>
                    <tr
                      onClick={() => inv.projectId && router.push(`/projects/${inv.projectId}`)}
                      style={{ background: idx % 2 === 0 ? "#fff" : T.bg, cursor:"pointer" }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = T.primaryLight}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = idx % 2 === 0 ? "#fff" : T.bg}>
                      <td style={{ ...tdS, color:T.textMuted, width:36 }}>{(invPage-1)*INV_PER_PAGE+idx+1}</td>
                      <td style={{ ...tdS, fontWeight:700, color:T.primary, whiteSpace:"nowrap" as const }}>{inv.poNo || "—"}</td>
                      <td style={{ ...tdS, color:T.textMuted, whiteSpace:"nowrap" as const }}>{proj ? fmtDate((proj as any).poDate) : "—"}</td>
                      <td style={{ ...tdS, color:T.textMuted }}>{proj ? (proj as any).indusId || "—" : "—"}</td>
                      <td style={{ ...tdS, color:T.textMuted, fontSize:11 }}>{proj ? (proj as any).id || "—" : "—"}</td>
                      <td style={{ ...tdS, maxWidth:120 }}><div style={{ fontSize:12, color:T.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{proj ? (proj as any).site || "—" : "—"}</div></td>
                      <td style={tdS}>{(inv as any).wccNo || "—"}</td>
                      <td style={tdS}>{(inv as any).receiptNo || "—"}</td>
                      <td style={{ ...tdS, fontWeight:700, color:T.primary }}>{inv.invoiceNo}</td>
                      <td style={{ ...tdS, color:T.textMuted, whiteSpace:"nowrap" as const }}>{fmtDate(inv.invoiceDate)}</td>
                      <td style={{ ...tdS, textAlign:"right" as const, fontWeight:600 }}>{fmt(inv.invoiceAmount)}</td>
                      <td style={{ ...tdS, textAlign:"right" as const, color:T.textMuted }}>
                        {inv.invoiceAmount > 0 ? ((inv.gst / inv.invoiceAmount) * 100).toFixed(1) + '%' : '—'}
                      </td>
                      <td style={{ ...tdS, textAlign:"right" as const, color:T.textMuted }}>
                        {inv.invoiceAmount > 0 ? ((inv.gst / inv.invoiceAmount) * 100).toFixed(1) + '%' : '—'}
                      </td>
                      <td style={{ ...tdS, textAlign:"right" as const, color:T.textMuted }}>{fmt(inv.gst)}</td>
                      <td style={{ ...tdS, textAlign:"right" as const, fontWeight:700, color:T.primary }}>{fmt(inv.totalAmount)}</td>
                      <td style={{ ...tdS, color:T.textMuted, fontSize:11 }}>{proj ? (proj as any).region || "—" : "—"}</td>
                      <td style={tdS}>{proj ? <StatusPill label={(proj as any).projectStatus||'—'} cfg={{bg:'#F3F4F6',color:'#6B7280'}} /> : "—"}</td>
                      <td style={{ ...tdS, whiteSpace:'nowrap' as const }}>
                        <button onClick={e=>{e.stopPropagation();setEditInvId(editInvId===inv.id?null:inv.id);setEditInvRow({...inv});}}
                          style={{ background:editInvId===inv.id?T.primary:'#F0FDFA', color:editInvId===inv.id?'#fff':'#0D9488',
                            border:`1px solid #99F6E4`, borderRadius:6, padding:'3px 8px', fontSize:11, cursor:'pointer' }}>✏️</button>
                      </td>
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
                    {editInvId === inv.id && (
                      <tr style={{ background:T.primaryLight }}>
                        <td colSpan={12} style={{ padding:14, borderBottom:`1px solid ${T.border}` }}>
                          <div style={{ fontSize:12, fontWeight:700, color:T.primary, marginBottom:10 }}>✏️ Edit Invoice</div>
                          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:8 }}>
                            <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>Invoice No</div><input style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'5px 8px', fontSize:12, outline:'none', width:'100%' }} value={editInvRow.invoiceNo||''} onChange={e=>setEditInvRow((p:any)=>({...p,invoiceNo:e.target.value}))} /></div>
                            <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>Invoice Date</div><input type="date" style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'5px 8px', fontSize:12, outline:'none', width:'100%' }} value={editInvRow.invoiceDate||''} onChange={e=>setEditInvRow((p:any)=>({...p,invoiceDate:e.target.value}))} /></div>
                            <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>Due Date</div><input type="date" style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'5px 8px', fontSize:12, outline:'none', width:'100%' }} value={editInvRow.dueDate||''} onChange={e=>setEditInvRow((p:any)=>({...p,dueDate:e.target.value}))} /></div>
                            <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>Basic Amount (₹)</div><input type="number" style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'5px 8px', fontSize:12, outline:'none', width:'100%' }} value={editInvRow.invoiceAmount||''} onChange={e=>setEditInvRow((p:any)=>({...p,invoiceAmount:e.target.value}))} /></div>
                          </div>
                          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:12 }}>
                            <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>GST (₹)</div><input type="number" style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'5px 8px', fontSize:12, outline:'none', width:'100%' }} value={editInvRow.gst||''} onChange={e=>setEditInvRow((p:any)=>({...p,gst:e.target.value}))} /></div>
                            <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>WCC No</div><input style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'5px 8px', fontSize:12, outline:'none', width:'100%' }} value={editInvRow.wccNo||''} onChange={e=>setEditInvRow((p:any)=>({...p,wccNo:e.target.value}))} /></div>
                            <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>Receipt No</div><input style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'5px 8px', fontSize:12, outline:'none', width:'100%' }} value={editInvRow.receiptNo||''} onChange={e=>setEditInvRow((p:any)=>({...p,receiptNo:e.target.value}))} /></div>
                            <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>Invoice Status</div>
                              <select style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'5px 8px', fontSize:12, outline:'none', width:'100%' }} value={editInvRow.invoiceStatus||''} onChange={e=>setEditInvRow((p:any)=>({...p,invoiceStatus:e.target.value}))}>
                                {['Draft','Submitted','Approved','Rejected','Paid'].map(s=><option key={s}>{s}</option>)}
                              </select>
                            </div>
                          </div>
                          <div style={{ display:'flex', gap:8 }}>
                            <button onClick={saveInvEdit} disabled={saving}
                              style={{ background:T.primary, color:'#fff', border:'none', borderRadius:7, padding:'6px 18px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                              {saving?'Saving…':'💾 Save'}
                            </button>
                            <button onClick={()=>{ setEditInvId(null); setEditInvRow({}); }}
                              style={{ background:'#fff', color:T.textMuted, border:`1px solid ${T.border}`, borderRadius:7, padding:'6px 18px', fontSize:12, cursor:'pointer' }}>
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  );
                })}
              </tbody>
              {displayInvoices.length > 0 && (
                <tfoot>
                  <tr style={{ background:T.primaryLight, fontWeight:700 }}>
                    <td colSpan={11} style={{ ...tdS, color:T.primary }}>Total</td>
                    <td style={{ ...tdS, textAlign:"right" as const, color:T.primary }}>{fmt(totalInvoiced)}</td>
                    <td style={{ ...tdS, textAlign:"right" as const, color:T.textMuted }}>{fmt(totalGST)}</td>
                    <td style={{ ...tdS, textAlign:"right" as const, color:T.primary }}>{fmt(totalAmount)}</td>
                    <td colSpan={3} style={tdS}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {invTotalPages > 1 && (
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 4px', borderTop:`1px solid ${T.border}`, marginTop:4 }}>
              <div style={{ fontSize:12, color:'#6B7280' }}>
                Showing {(invPage-1)*INV_PER_PAGE+1}–{Math.min(invPage*INV_PER_PAGE, displayInvoices.length)} of {displayInvoices.length} invoices
              </div>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <button onClick={()=>setInvPage(n=>Math.max(1,n-1))} disabled={invPage===1}
                  style={{ padding:'5px 12px', borderRadius:6, border:`1px solid #E5E7EB`, background:'#fff', cursor:invPage===1?'not-allowed':'pointer', fontSize:12, opacity:invPage===1?0.5:1 }}>← Prev</button>
                {Array.from({length:invTotalPages},(_,i)=>i+1).filter(n=>n===1||n===invTotalPages||Math.abs(n-invPage)<=1).reduce((acc:number[],n,i,arr)=>{ if(i>0&&n-arr[i-1]>1) acc.push(-1); acc.push(n); return acc; },[] as number[]).map((n,i)=>
                  n===-1 ? <span key={`e${i}`} style={{ fontSize:12, color:'#9CA3AF' }}>…</span>
                  : <button key={n} onClick={()=>setInvPage(n)}
                      style={{ padding:'5px 10px', borderRadius:6, border:`1px solid ${invPage===n?T.primary:'#E5E7EB'}`, background:invPage===n?T.primary:'#fff', color:invPage===n?'#fff':'#374151', cursor:'pointer', fontSize:12, fontWeight:invPage===n?700:400, minWidth:32 }}>{n}</button>
                )}
                <button onClick={()=>setInvPage(n=>Math.min(invTotalPages,n+1))} disabled={invPage===invTotalPages}
                  style={{ padding:'5px 12px', borderRadius:6, border:`1px solid #E5E7EB`, background:'#fff', cursor:invPage===invTotalPages?'not-allowed':'pointer', fontSize:12, opacity:invPage===invTotalPages?0.5:1 }}>Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </Layout>
  );
}
