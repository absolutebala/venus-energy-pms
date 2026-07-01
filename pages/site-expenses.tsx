import React, { useState } from 'react';
import { useRouter } from 'next/router';
import DateInput from '@/components/DateInput';
import MultiSelect from '@/components/MultiSelect';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import * as XLSX from 'xlsx';
import { useExpenses } from '@/context/ExpenseContext';
import { useInvoices } from '@/context/InvoiceContext';
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

const PAYMENT_MODES  = ["NEFT","RTGS","Cheque","Cash","UPI","Others"];
const TYPE_COLORS: Record<string,string> = {
  "Advance":"#2563EB","Material Purchase":"#7C3AED","Labour Charge":"#D97706",
  "Transport":"#0D9488","Equipment Rental":"#DC2626","Miscellaneous":"#6B7280",
};

export default function SiteExpensesPage() {
  const router = useRouter();
  const { profile, can, loading: authLoading } = useAuth();
  const { expenses, loading: expLoading, addExpense, updateExpense, deleteExpense } = useExpenses();
  const { projects } = useProjects();
  const canAdd    = !authLoading && can("site_expenses", "create");
  const canManage = !authLoading && can("site_expenses", "edit") && role !== 'vendor';

  const [selectedVendor,  setSelectedVendor]  = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [search,          setSearch]          = useState("");
  const PER_PAGE = 10;
  const [page, setPage] = useState(1);
  React.useEffect(() => {
    if (!router.isReady) return;
    const hasQuery = Object.keys(router.query).length > 0;
    const saved = !hasQuery ? sessionStorage.getItem('expensesFilters') : null;
    if (saved) {
      const params = Object.fromEntries(new URLSearchParams(saved));
      sessionStorage.removeItem('expensesFilters');
      if (params.datePreset) setDatePreset(params.datePreset);
      if (params.expStatus) setExpStatusFilter(params.expStatus);
      if (params.expVendor) setExpVendorFilter(decodeURIComponent(params.expVendor).split(',').filter(Boolean));
      if (params.expPM) setExpPMFilter(decodeURIComponent(params.expPM).split(',').filter(Boolean));
      if (params.expRegion) setExpRegionFilter(decodeURIComponent(params.expRegion).split(',').filter(Boolean));
      if (params.expType) setExpTypeFilter(decodeURIComponent(params.expType).split(',').filter(Boolean));
      if (params.search) setSearch(params.search);
      if (params.page) setPage(Number(params.page));
    } else {
      const p = Number(router.query.page); if(p&&p>0) setPage(p);
    }
  }, [router.isReady]);
  const [expStatusFilter, setExpStatusFilter] = useState('');
  const [expVendorFilter, setExpVendorFilter] = useState<string[]>([]);
  const [expPMFilter,     setExpPMFilter]     = useState<string[]>([]);
  const [expRegionFilter, setExpRegionFilter] = useState<string[]>([]);
  const [expTypeFilter,   setExpTypeFilter]   = useState<string[]>([]);
  const [toast,           setToast]           = useState<any>(null);
  const [saving,          setSaving]          = useState(false);
  const [adding,          setAdding]          = useState(false);
  const [editExpId,       setEditExpId]       = useState<string|null>(null);
  const [editExpRow,      setEditExpRow]      = useState<any>({});

  const [editExpBankErr, setEditExpBankErr] = useState(false);

  const saveExpEdit = async () => {
    if (!editExpId) return;
    if (!editExpRow.bankAccount || !editExpRow.bankAccount.trim()) {
      setEditExpBankErr(true);
      return;
    }
    setEditExpBankErr(false);
    try {
      await updateExpense(editExpId, {
        expenseDate: editExpRow.expenseDate,
        site: editExpRow.site,
        expenseType: editExpRow.expenseType,
        amount: Number(editExpRow.amount),
        remarks: editExpRow.remarks,
        bankAccount: editExpRow.bankAccount,
        upiId: editExpRow.upiId,
        paidTxnRef: editExpRow.paidTxnRef,
        paidPaymentMode: editExpRow.paidPaymentMode,
        txnDate: editExpRow.txnDate,
      });
      setEditExpId(null); setEditExpRow({});
      setToast({ msg:'✅ Expense updated', type:'success' });
    } catch(err:any) { setToast({ msg:'❌ ' + err.message, type:'error' }); }
  };
  const [form, setForm] = useState({
    expenseDate:"", site:"", expenseType:"Advance", amount:"", remarks:""
  });

  // Paid modal state
  const [paidModal,    setPaidModal]    = useState<any>(null);
  const [showExportWarning, setShowExportWarning] = useState(false);
  const [paidModalPassbook, setPaidModalPassbook] = useState<{url:string;filename:string}|null>(null);
  const [paidForm,     setPaidForm]     = useState({ txnRef:"", paymentMode:"NEFT", fromAccount:"", toAccount:"", txnDate:new Date().toISOString().split('T')[0], investorType:"", fundSource:"", fundType:"" });
  const { invoices: allInvoicesForRegain } = useInvoices();
  // Regain Capital = sum of PAID EXPENSE amounts for projects that have at least one Paid invoice, minus this expense's own amount
  const previousRegainCapital = (() => {
    const paidInvoiceProjectIds = new Set((allInvoicesForRegain||[]).filter((i:any)=>i.paymentStatus==='Paid').map((i:any)=>i.projectId));
    return expenses.filter((e:any)=>e.status==='paid' && paidInvoiceProjectIds.has(e.projectId)).reduce((a:number,e:any)=>a+Number(e.amount||0),0);
  })();
  const regainCapitalLive = previousRegainCapital - Number(paidModal?.amount||0);
  const [datePreset,   setDatePreset]   = useState<string>('all');
  const [customFrom,   setCustomFrom]   = useState('');
  const [customTo,     setCustomTo]     = useState('');
  const [fromAccounts,  setFromAccounts]  = useState<string[]>([]);
  const [expenseTypes,  setExpenseTypes]  = useState<string[]>(['Advance','Material Purchase','Labour Charge','Transport','Equipment Rental','Miscellaneous']);

  React.useEffect(() => {
    const sb = createClient();
    sb.from('lookup_options').select('value').eq('type','expense_type').order('value')
      .then(({data}) => { if (data && data.length > 0) setExpenseTypes(data.map((r:any)=>r.value)); });
  }, []);
  const addExpenseType = async (val: string) => {
    const sb = createClient();
    await sb.from('lookup_options').insert({ type:'expense_type', value: val });
    setExpenseTypes(prev => [...prev, val].sort());
    return val;
  };

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
  const [resolvedVendorName, setResolvedVendorName] = useState<string>('');
  React.useEffect(() => {
    const vendorId = (profile as any)?.vendor_id;
    if (!vendorId || profile?.role !== 'vendor') return;
    createClient().from('vendors').select('name').eq('id', vendorId).single().then(({ data }) => {
      if (data?.name) setResolvedVendorName(data.name);
    });
  }, [(profile as any)?.vendor_id, profile?.role]);

  // Group projects by vendor
  const VENDOR_MAP: Record<string, any[]> = (projects as any[]).reduce((acc:any, p:any) => {
    if (p.vendor) { acc[p.vendor] = acc[p.vendor] || []; acc[p.vendor].push(p); }
    return acc;
  }, {});

  const vendors        = Object.keys(VENDOR_MAP).sort();
  const vendorProjects = selectedVendor ? VENDOR_MAP[selectedVendor] || [] : [];
  const selProj        = vendorProjects.find((p:any) => p.id === selectedProject);

  // Sort: pending first, then by date desc
  // Reset page when filters change
  React.useEffect(() => { setPage(1); router.replace({query:{...router.query,page:1}},undefined,{shallow:true}); },
    [search, datePreset, expStatusFilter, expVendorFilter, expPMFilter, expRegionFilter, expTypeFilter, customFrom, customTo]);

  // Role-based filtering
  const roleFilteredExpenses = React.useMemo(() => {
    const role = profile?.role || '';
    const name = profile?.full_name || '';
    if (role === 'project_manager') {
      const myProjectIds = new Set((projects as any[]).filter((p:any)=>p.pm===name).map((p:any)=>p.id));
      return expenses.filter((e:any) => myProjectIds.has(e.projectId));
    }
    if (role === 'vendor') {
      if (!resolvedVendorName) return [];
      const myProjectIds = new Set((projects as any[]).filter((p:any)=>p.vendor===resolvedVendorName).map((p:any)=>p.id));
      return expenses.filter((e:any) => myProjectIds.has(e.projectId));
    }
    return expenses;
  }, [expenses, projects, profile?.role, profile?.full_name, resolvedVendorName]);

  const allExpenses = roleFilteredExpenses
    .filter((e:any) => {
      // Date filter
      if (datePreset !== 'all') {
        const today = new Date(); today.setHours(0,0,0,0);
        const todayStr = today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
        const inRange = (d: string, from: Date, to: Date) => {
          if (!d) return false;
          const dt = new Date(d); dt.setHours(0,0,0,0);
          return dt >= from && dt <= to;
        };
        const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - today.getDay());
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startOfLastMonth = new Date(today.getFullYear(), today.getMonth()-1, 1);
        const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        const last7 = new Date(today); last7.setDate(today.getDate()-6);
        if (datePreset==='today'     && e.expenseDate !== todayStr) return false;
        if (datePreset==='week'      && !inRange(e.expenseDate, startOfWeek, today)) return false;
        if (datePreset==='last7'     && !inRange(e.expenseDate, last7, today)) return false;
        if (datePreset==='month'     && !inRange(e.expenseDate, startOfMonth, today)) return false;
        if (datePreset==='lastmonth' && !inRange(e.expenseDate, startOfLastMonth, endOfLastMonth)) return false;
        if (datePreset==='custom' && customFrom && customTo && !inRange(e.expenseDate, new Date(customFrom), new Date(customTo))) return false;
      }
      // Project-level filters
      if (expVendorFilter.length || expPMFilter.length || expRegionFilter.length || expTypeFilter.length) {
        const fp = (projects as any[]).find((p:any) => p.id === e.projectId);
        if (expVendorFilter.length && !expVendorFilter.includes(fp?.vendor||'— Unassigned —')) return false;
        if (expPMFilter.length     && !expPMFilter.includes(fp?.pm||'— Unassigned —'))     return false;
        if (expRegionFilter.length && !expRegionFilter.includes(fp?.region||'— Unassigned —')) return false;
        if (expTypeFilter.length   && !expTypeFilter.includes(fp?.type||'— Unassigned —'))   return false;
      }
      if (expStatusFilter && e.status !== expStatusFilter) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      const eProj = (projects as any[]).find((p:any) => p.id === e.projectId);
      return e.projectId?.toLowerCase().includes(s) ||
             eProj?.poNo?.toLowerCase().includes(s) ||
             eProj?.indusId?.toLowerCase().includes(s) ||
             eProj?.site?.toLowerCase().includes(s) ||
             e.expenseType?.toLowerCase().includes(s) ||
             e.site?.toLowerCase().includes(s) ||
             e.paidTxnRef?.toLowerCase().includes(s) ||
             e.remarks?.toLowerCase().includes(s) ||
             String(e.amount||'').includes(s) ||
             e.vendor?.toLowerCase().includes(s);
    })
    .sort((a:any, b:any) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(b.expenseDate||b.createdAt||0).getTime() - new Date(a.expenseDate||a.createdAt||0).getTime();
    });

  const totalPages    = Math.ceil(allExpenses.length / PER_PAGE);
  const paginatedExp  = allExpenses.slice((page-1)*PER_PAGE, page*PER_PAGE);

  const pendingTotal = roleFilteredExpenses.filter((e:any) => e.status === 'pending').reduce((a:number,e:any) => a + Number(e.amount), 0);
  const paidTotal    = roleFilteredExpenses.filter((e:any) => e.status === 'paid').reduce((a:number,e:any) => a + Number(e.amount), 0);

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
    if (!/^[a-zA-Z0-9]{10,}$/.test(paidForm.txnRef.trim())) { setToast({ msg:"TXN Ref must be at least 10 alphanumeric characters (no spaces or special characters)", type:"error" }); return; }
    setPaidSaving(true);
    try {
      await updateExpense(paidModal.id, {
        status: 'paid',
        paidTxnRef: paidForm.txnRef,
        paidPaymentMode: paidForm.paymentMode,
        txnDate: paidForm.txnDate,
        paidAt: new Date().toISOString(),
        investorType: paidForm.investorType||'',
        fundSource: paidForm.fundSource||'',
        fundType: paidForm.fundType||'',
        regainCapital: regainCapitalLive,
      });
      // Update project paid_amount
      const proj = (projects as any[]).find((p:any) => p.id === paidModal.projectId);
      if (proj) {
        const newPaid = Number(proj.paidAmount || 0) + Number(paidModal.amount);
        await createClient().from('projects').update({ paid_amount: newPaid }).eq('id', proj.id);
      }
      setPaidModal(null);
      setPaidForm({ txnRef:"", paymentMode:"NEFT", fromAccount:"", toAccount:"", txnDate:new Date().toISOString().split('T')[0], investorType:"", fundSource:"", fundType:"" });
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
          {expLoading ? "Loading..." : `${allExpenses.length} records`}
        </div>

        {/* Summary cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
          {[
            { label:"Total Records",    value: allExpenses.length,                                          color:T.primary },
            { label:"Pending Amount",   value: fmt(pendingTotal),                                        color:T.warning },
            { label:"Paid Amount",      value: fmt(paidTotal),                                           color:T.success },
            { label:"Pending Requests", value: allExpenses.filter((e:any)=>e.status==="pending").length,    color:T.danger  },
          ].map(s => (
            <div key={s.label} style={{ ...card, padding:"14px 16px" }}>
              <div style={{ fontSize:11, color:T.textMuted, fontWeight:600, textTransform:"uppercase", marginBottom:4 }}>{s.label}</div>
              <div style={{ fontSize:18, fontWeight:800, color:s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Date Filter */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16, flexWrap:'wrap' as const }}>
          {([['all','All'],['today','Today'],['week','This Week'],['last7','Last 7 Days'],['month','This Month'],['lastmonth','Last Month'],['custom','Custom']] as [string,string][]).map(([val,label])=>(
            <button key={val} onClick={()=>setDatePreset(val)}
              style={{ background:datePreset===val?T.primary:'#fff', color:datePreset===val?'#fff':T.textMuted,
                border:`1px solid ${datePreset===val?T.primary:T.border}`, borderRadius:8,
                padding:'6px 14px', cursor:'pointer', fontSize:12, fontWeight:datePreset===val?700:400, transition:'all 0.15s' }}>
              {label}
            </button>
          ))}
          {datePreset==='custom' && (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <DateInput value={customFrom} onChange={setCustomFrom}
                style={{ border:`1px solid ${T.border}`, borderRadius:8, padding:'6px 10px', fontSize:12, outline:'none' }} />
              <span style={{ fontSize:12, color:T.textMuted }}>to</span>
              <DateInput value={customTo} onChange={setCustomTo}
                style={{ border:`1px solid ${T.border}`, borderRadius:8, padding:'6px 10px', fontSize:12, outline:'none' }} />
            </div>
          )}
        </div>

        {/* Project Filters — cascading */}
        {(() => {
          // Only projects that have expenses in the role-filtered set
          const expenseProjectIds = new Set(roleFilteredExpenses.map((e:any) => e.projectId));
          // Base: expense-linked projects that match all OTHER active filters
          const cascadeProj = (exclude: string) => (projects as any[]).filter((p:any) => {
            if (!expenseProjectIds.has(p.id)) return false;
            if (exclude!=='vendor' && expVendorFilter.length && !expVendorFilter.includes(p.vendor||'— Unassigned —')) return false;
            if (exclude!=='pm'     && expPMFilter.length     && !expPMFilter.includes(p.pm||'— Unassigned —'))     return false;
            if (exclude!=='region' && expRegionFilter.length && !expRegionFilter.includes(p.region||'— Unassigned —')) return false;
            if (exclude!=='type'   && expTypeFilter.length   && !expTypeFilter.includes(p.type||'— Unassigned —'))   return false;
            return true;
          });
          const uniq = (arr: any[]) => Array.from(new Set(arr.filter(Boolean))).sort() as string[];
          return (
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' as const, marginBottom:16, alignItems:'center' }}>
            <select value={expStatusFilter} onChange={e=>setExpStatusFilter(e.target.value)}
              style={{ border:`1px solid ${T.border}`, borderRadius:8, padding:'6px 12px', fontSize:12, outline:'none', background:'#fff', cursor:'pointer' }}>
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>
            <MultiSelect options={['— Unassigned —', ...uniq(cascadeProj('vendor').map((p:any)=>p.vendor))]} value={expVendorFilter} onChange={setExpVendorFilter} placeholder="All Vendors"
              style={{ border:`1px solid ${T.border}`, borderRadius:8, padding:'6px 32px 6px 10px', fontSize:12 }} />
            {profile?.role !== 'project_manager' && (
              <MultiSelect options={['— Unassigned —', ...uniq(cascadeProj('pm').map((p:any)=>p.pm))]} value={expPMFilter} onChange={setExpPMFilter} placeholder="All PMs"
                style={{ border:`1px solid ${T.border}`, borderRadius:8, padding:'6px 32px 6px 10px', fontSize:12 }} />
            )}
            <MultiSelect options={['— Unassigned —', ...uniq(cascadeProj('region').map((p:any)=>p.region))]} value={expRegionFilter} onChange={setExpRegionFilter} placeholder="All Regions"
              style={{ border:`1px solid ${T.border}`, borderRadius:8, padding:'6px 32px 6px 10px', fontSize:12 }} />
            <MultiSelect options={['— Unassigned —', ...uniq(cascadeProj('type').map((p:any)=>p.type))]} value={expTypeFilter} onChange={setExpTypeFilter} placeholder="All Types"
              style={{ border:`1px solid ${T.border}`, borderRadius:8, padding:'6px 32px 6px 10px', fontSize:12 }} />
            {(expStatusFilter||expVendorFilter.length||expPMFilter.length||expRegionFilter.length||expTypeFilter.length) && (
              <button onClick={()=>{setExpStatusFilter('');setExpVendorFilter([]);setExpPMFilter([]);setExpRegionFilter([]);setExpTypeFilter([]);}}
                style={{ fontSize:11, color:'#DC2626', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:6, padding:'5px 10px', cursor:'pointer', fontWeight:600 }}>
                ✕ Clear
              </button>
            )}
          </div>
          );
        })()}

        {/* All Expenses Table */}
        <div style={card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ fontSize:14, fontWeight:700, color:T.text }}>
                {['project_manager','vendor'].includes(profile?.role||'') ? 'My Expenses' : 'All Expenses'}
                <span style={{ fontSize:12, fontWeight:400, color:T.textMuted, marginLeft:8 }}>{allExpenses.length} records</span>
              </div>
              {canManage && (
                <button onClick={()=>{
                  const hasAnyFilter = Boolean(
                    expVendorFilter.length || expPMFilter.length || expRegionFilter.length || expTypeFilter.length ||
                    datePreset !== 'all'
                  );
                  if (!hasAnyFilter) { setShowExportWarning(true); return; }
                  const rows = allExpenses.map((e:any, idx:number) => ({
                    'S.No': idx+1,
                    'Date': e.expenseDate ? new Date(e.expenseDate) : '',
                    'PO Number': (projects as any[]).find((p:any)=>p.id===e.projectId)?.poNo || e.projectId || '',
                    'Indus ID': (projects as any[]).find((p:any)=>p.id===e.projectId)?.indusId || '',
                    'Site': e.site||'',
                    'Expense Type': e.expenseType||'',
                    'Amount (₹)': Number(e.amount||0),
                    'Remarks': e.remarks||'',
                    'Vendor': e.vendor||'',
                    'Status': e.status||'',
                    'Txn Ref': e.paidTxnRef||'',
                  }));
                  const ws = XLSX.utils.json_to_sheet(rows, { cellDates: true, dateNF: 'dd-mm-yyyy' });
                  ws['!cols'] = [{wch:6},{wch:12},{wch:14},{wch:16},{wch:16},{wch:12},{wch:20},{wch:16},{wch:10},{wch:16}];
                  ws['!autofilter'] = { ref: ws['!ref'] || 'A1' };
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
                  XLSX.writeFile(wb, `Venus_Expenses_${new Date().toISOString().slice(0,10)}.xlsx`);
                }}
                  style={{ background:T.primaryLight, color:T.primary, border:`1px solid ${T.primaryMid}`, borderRadius:7, padding:'5px 12px', fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                  📥 Excel
                </button>
              )}
            </div>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search project, type, remarks…"
              style={{ border:`1px solid ${T.border}`, borderRadius:8, padding:"6px 12px", fontSize:13, outline:"none", width:220 }} />
          </div>
          <div style={{ overflowX:"auto" as const }}>
            <table style={{ width:"100%", borderCollapse:"collapse" as const, minWidth:1100 }}>
              <thead>
                <tr>
                  {["#","Req. Date","PO Number","Indus ID","Remarks","Expense Type","Amount (₹)","TXN Ref","Payment Mode","Txn Date","Status",""].map((h,i)=>(
                    <th key={i} style={{ ...thS, textAlign:i===6?"right" as const:"left" as const }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expLoading && <tr><td colSpan={12} style={{ padding:30, textAlign:"center" as const, color:T.textMuted }}>Loading...</td></tr>}
                {!expLoading && allExpenses.length === 0 && (
                  <tr><td colSpan={12} style={{ padding:30, textAlign:"center" as const, color:T.textDim }}>No expenses found</td></tr>
                )}
                {paginatedExp.map((e:any, idx:number) => {
                  const proj = (projects as any[]).find(p=>p.id===e.projectId);
                  const isPending = e.status === 'pending';
                  return (
                    <React.Fragment key={e.id}>
                    <tr
                      style={{ background:isPending ? '#FFFBEB' : idx%2===0?"#fff":T.bg, cursor:"pointer" }}
                      onMouseEnter={el=>(el.currentTarget as HTMLTableRowElement).style.background=T.primaryLight}
                      onMouseLeave={el=>(el.currentTarget as HTMLTableRowElement).style.background=isPending?'#FFFBEB':idx%2===0?"#fff":T.bg}>
                      <td style={{ ...tdS, color:T.textMuted, width:36 }}>{(page-1)*PER_PAGE+idx+1}</td>
                      <td style={{ ...tdS, whiteSpace:"nowrap" as const }}>{fmtD(e.expenseDate)}</td>
                      <td style={tdS} onClick={()=>{ if(e.projectId) window.open(`/projects/${e.projectId}`, '_blank'); }}>
                        <div style={{ fontWeight:600, fontSize:13, color:T.primary, cursor:'pointer' }}>{proj?.poNo || e.projectId || '—'}</div>
                        {proj?.site && <div style={{ fontSize:10, color:T.textMuted }}>{proj.site}</div>}
                      </td>
                      <td style={{ ...tdS, fontSize:12, color:T.textMuted }}>{proj?.indusId || '—'}</td>
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
                      <td style={{ ...tdS, whiteSpace:'nowrap' as const }}>
                        <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                          {canManage && (
                            <button onClick={ev=>{ ev.stopPropagation(); setEditExpId(editExpId===e.id?null:e.id); setEditExpRow({...e}); }}
                              style={{ background:editExpId===e.id?T.primary:'#F0FDFA', color:editExpId===e.id?'#fff':'#0D9488',
                                border:`1px solid #99F6E4`, borderRadius:6, padding:'3px 8px', fontSize:11, cursor:'pointer' }}>✏️</button>
                          )}
                          {canManage && (
                            <button onClick={async ev=>{ ev.stopPropagation(); if(window.confirm('Delete this expense permanently?')){ try { await deleteExpense(e.id); setToast({ msg:'✅ Expense deleted', type:'success' }); } catch(err:any){ setToast({ msg:'❌ '+err.message, type:'error' }); } } }}
                              style={{ background:'#FEF2F2', color:'#DC2626', border:'1px solid #FECACA', borderRadius:6, padding:'3px 8px', fontSize:11, cursor:'pointer' }}>🗑</button>
                          )}
                          {isPending && canManage && (
                            <button onClick={async ev=>{
                              ev.stopPropagation();
                              setPaidModal(e); setPaidForm({ txnRef:"", paymentMode:"NEFT", fromAccount:"", toAccount:(e as any).bankAccount||(e as any).upiId||"", txnDate:new Date().toISOString().split('T')[0], investorType:"", fundSource:"", fundType:"" });
                              setPaidModalPassbook(null);
                              if ((e as any).bankAccountId) {
                                const { data } = await createClient().from('vendor_bank_accounts').select('passbook_url,passbook_filename').eq('id', (e as any).bankAccountId).maybeSingle();
                                if (data) setPaidModalPassbook({ url: data.passbook_url, filename: data.passbook_filename || 'Passbook' });
                              }
                            }}
                              style={{ background:T.success, border:"none", borderRadius:6, padding:"5px 12px",
                                color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" as const }}>
                              💳 Make Payment
                            </button>
                          )}
                          {!isPending && (
                            <span style={{ fontSize:11, color:T.textDim }}>{e.paidAt ? fmtD(e.paidAt.split("T")[0]) : ""}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                    {editExpId === e.id && (
                      <tr style={{ background:'#F0FDFA' }}>
                        <td colSpan={12} style={{ padding:14, borderBottom:`1px solid ${T.border}` }}>
                          <div style={{ fontSize:12, fontWeight:700, color:T.primary, marginBottom:10 }}>✏️ Edit Expense</div>
                          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:8 }}>
                            <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>Date</div><input type="date" style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'5px 8px', fontSize:12, width:'100%', outline:'none' }} value={editExpRow.expenseDate||''} onChange={e=>setEditExpRow((p:any)=>({...p,expenseDate:e.target.value}))} /></div>
                            <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>Site</div><input style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'5px 8px', fontSize:12, width:'100%', outline:'none' }} value={editExpRow.site||''} onChange={e=>setEditExpRow((p:any)=>({...p,site:e.target.value}))} /></div>
                            <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>Expense Type</div>
                              <select style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'5px 8px', fontSize:12, width:'100%', outline:'none' }} value={editExpRow.expenseType||''} onChange={e=>setEditExpRow((p:any)=>({...p,expenseType:e.target.value}))}>
                                {['Advance','Material Purchase','Labour Charge','Transport','Equipment Rental','Miscellaneous'].map(t=><option key={t}>{t}</option>)}
                              </select>
                            </div>
                            <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>Amount (₹)</div><input type="number" style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'5px 8px', fontSize:12, width:'100%', outline:'none' }} value={editExpRow.amount||''} onChange={e=>setEditExpRow((p:any)=>({...p,amount:e.target.value}))} /></div>
                          </div>
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:8 }}>
                            <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>Remarks</div><input style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'5px 8px', fontSize:12, width:'100%', outline:'none' }} value={editExpRow.remarks||''} onChange={e=>setEditExpRow((p:any)=>({...p,remarks:e.target.value}))} /></div>
                            <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>Bank Account *</div><input style={{ border:`1px solid ${editExpBankErr?'#DC2626':T.border}`, borderRadius:6, padding:'5px 8px', fontSize:12, width:'100%', outline:'none', background: editExpBankErr ? '#FEF2F2' : '#fff' }} value={editExpRow.bankAccount||''} onChange={e=>{ setEditExpRow((p:any)=>({...p,bankAccount:e.target.value})); if(e.target.value.trim()) setEditExpBankErr(false); }} />
                              {editExpBankErr && <div style={{ fontSize:11, color:'#DC2626', marginTop:4 }}>Bank Account No is required</div>}
                            </div>
                            <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>TXN Ref</div><input style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'5px 8px', fontSize:12, width:'100%', outline:'none' }} value={editExpRow.paidTxnRef||''} onChange={e=>setEditExpRow((p:any)=>({...p,paidTxnRef:e.target.value}))} /></div>
                          </div>
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
                            <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>Payment Mode</div>
                              <select style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'5px 8px', fontSize:12, width:'100%', outline:'none' }} value={editExpRow.paidPaymentMode||''} onChange={e=>setEditExpRow((p:any)=>({...p,paidPaymentMode:e.target.value}))}>
                                <option value="">Select</option>
                                {['NEFT','RTGS','IMPS','UPI','Cash','Cheque'].map(m=><option key={m}>{m}</option>)}
                              </select>
                            </div>
                            <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>TXN Date</div><input type="date" style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'5px 8px', fontSize:12, width:'100%', outline:'none' }} value={editExpRow.txnDate||''} onChange={e=>setEditExpRow((p:any)=>({...p,txnDate:e.target.value}))} /></div>
                          </div>
                          <div style={{ display:'flex', gap:8 }}>
                            <button onClick={saveExpEdit}
                              style={{ background:T.primary, color:'#fff', border:'none', borderRadius:7, padding:'6px 18px', fontSize:12, fontWeight:600, cursor:'pointer' }}>💾 Save</button>
                            <button onClick={()=>{ setEditExpId(null); setEditExpRow({}); }}
                              style={{ background:'#fff', color:T.textMuted, border:`1px solid ${T.border}`, borderRadius:7, padding:'6px 18px', fontSize:12, cursor:'pointer' }}>Cancel</button>
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  );
                })}
              </tbody>
              {allExpenses.length > 0 && (
                <tfoot>
                  <tr style={{ background:T.primaryLight, fontWeight:700 }}>
                    <td colSpan={5} style={{ ...tdS, color:T.primary }}>Total</td>
                    <td style={{ ...tdS, textAlign:"right" as const, color:T.primary }}>{fmt(roleFilteredExpenses.reduce((a:number,e:any)=>a+Number(e.amount),0))}</td>
                    <td colSpan={6} style={tdS}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {/* Pagination — outside table */}
          {totalPages > 1 && (
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 4px', borderTop:`1px solid ${T.border}`, marginTop:4 }}>
              <div style={{ fontSize:12, color:'#6B7280' }}>
                Showing {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE, allExpenses.length)} of {allExpenses.length} records
              </div>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <button onClick={()=>{ const n=Math.max(1,page-1); setPage(n); router.push({query:{...router.query,page:n}},undefined,{shallow:true}); }} disabled={page===1}
                  style={{ padding:'5px 12px', borderRadius:6, border:`1px solid #E5E7EB`, background:'#fff', cursor:page===1?'not-allowed':'pointer', fontSize:12, opacity:page===1?0.5:1 }}>← Prev</button>
                {Array.from({length:totalPages},(_,i)=>i+1).filter(n=>n===1||n===totalPages||Math.abs(n-page)<=1).reduce((acc:number[],n,i,arr)=>{ if(i>0&&n-arr[i-1]>1) acc.push(-1); acc.push(n); return acc; },[] as number[]).map((n,i)=>
                  n===-1 ? <span key={`e${i}`} style={{ fontSize:12, color:'#9CA3AF' }}>…</span>
                  : <button key={n} onClick={()=>{ setPage(n); router.push({query:{...router.query,page:n}},undefined,{shallow:true}); }}
                      style={{ padding:'5px 10px', borderRadius:6, border:`1px solid ${page===n?T.primary:'#E5E7EB'}`, background:page===n?T.primary:'#fff', color:page===n?'#fff':'#374151', cursor:'pointer', fontSize:12, fontWeight:page===n?700:400, minWidth:32 }}>{n}</button>
                )}
                <button onClick={()=>{ const n=Math.min(totalPages,page+1); setPage(n); router.push({query:{...router.query,page:n}},undefined,{shallow:true}); }} disabled={page===totalPages}
                  style={{ padding:'5px 12px', borderRadius:6, border:`1px solid #E5E7EB`, background:'#fff', cursor:page===totalPages?'not-allowed':'pointer', fontSize:12, opacity:page===totalPages?0.5:1 }}>Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Paid Modal */}
      {paidModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.5)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:T.surface, borderRadius:16, padding:0, width:"100%", maxWidth: paidModalPassbook ? 880 : 420, maxHeight:"90vh", boxShadow:"0 20px 60px rgba(0,0,0,0.18)", display:"flex", overflow:"hidden" }}>
            <div style={{ flex: paidModalPassbook ? '0 0 420px' : '1', padding:28, overflowY:'auto' as const, maxHeight:"90vh" }}>
            <h3 style={{ fontSize:16, fontWeight:700, color:T.text, marginBottom:6 }}>✓ Mark as Paid</h3>
            <p style={{ fontSize:13, color:T.textMuted, marginBottom:20 }}>
              {paidModal.expenseType} — {fmt(paidModal.amount)} · PO: {(projects as any[]).find(p=>p.id===paidModal.projectId)?.poNo || paidModal.projectId} · Project ID: {(projects as any[]).find(p=>p.id===paidModal.projectId)?.projectId || '—'}
            </p>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:"block", fontSize:12, fontWeight:600, color:T.textMuted, marginBottom:6, textTransform:"uppercase" }}>Transaction Date</label>
              <DateInput value={paidForm.txnDate} onChange={v=>setPaidForm(p=>({...p,txnDate:v}))}
                style={{ ...inputStyle(), width:"100%", boxSizing:"border-box" as const }} />
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:"block", fontSize:12, fontWeight:600, color:T.textMuted, marginBottom:6, textTransform:"uppercase" }}>TXN Ref *</label>
              <input value={paidForm.txnRef} onChange={e=>setPaidForm(p=>({...p,txnRef:e.target.value}))}
                placeholder="e.g. NEFT2026001234 (min 10 chars)"
                style={{ ...inputStyle(), width:"100%", boxSizing:"border-box" as const,
                  borderColor: paidForm.txnRef && !/^[a-zA-Z0-9]{10,}$/.test(paidForm.txnRef.trim()) ? '#DC2626' : undefined }} />
              {paidForm.txnRef && !/^[a-zA-Z0-9]{10,}$/.test(paidForm.txnRef.trim()) && (
                <div style={{ fontSize:11, color:'#DC2626', marginTop:4 }}>
                  ⚠️ Must be at least 10 alphanumeric characters (no spaces or special characters)
                </div>
              )}
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
            <div style={{ marginBottom:14 }}>
              <label style={{ display:"block", fontSize:12, fontWeight:600, color:T.textMuted, marginBottom:6, textTransform:"uppercase" }}>Investor Type</label>
              <select value={paidForm.investorType} onChange={e=>setPaidForm(p=>({...p,investorType:e.target.value}))}
                style={{ ...inputStyle(), width:"100%", boxSizing:"border-box" as const, cursor:"pointer" }}>
                <option value="">— None —</option>
                <option value="Investor 1">Investor 1</option>
                <option value="Investor 2">Investor 2</option>
              </select>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:"block", fontSize:12, fontWeight:600, color:T.textMuted, marginBottom:6, textTransform:"uppercase" }}>Fund Source</label>
              <select value={paidForm.fundSource} onChange={e=>setPaidForm(p=>({...p,fundSource:e.target.value}))}
                style={{ ...inputStyle(), width:"100%", boxSizing:"border-box" as const, cursor:"pointer" }}>
                <option value="">— None —</option>
                <option value="Capital Fund">Capital Fund</option>
                <option value="Personal Fund">Personal Fund</option>
              </select>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:"block", fontSize:12, fontWeight:600, color:T.textMuted, marginBottom:6, textTransform:"uppercase" }}>Fund Type</label>
              <input value={paidForm.fundType} onChange={e=>setPaidForm(p=>({...p,fundType:e.target.value}))}
                placeholder="e.g. Equity, Loan, etc."
                style={{ ...inputStyle(), width:"100%", boxSizing:"border-box" as const }} />
            </div>
            {paidForm.fundSource === 'Capital Fund' && (
              <div style={{ marginBottom:20 }}>
                <label style={{ display:"block", fontSize:12, fontWeight:600, color:T.textMuted, marginBottom:6, textTransform:"uppercase" }}>Regain Capital (₹)</label>
                <div style={{ ...inputStyle(), width:"100%", boxSizing:"border-box" as const, background:T.bg, color:T.text }}>{fmt(regainCapitalLive)}</div>
                <p style={{ fontSize:13, color:T.textMuted, marginTop:6, marginBottom:0 }}>
                  Previous Regain Capital ({fmt(previousRegainCapital)}) minus this Expense Amount ({fmt(Number(paidModal?.amount||0))})
                </p>
              </div>
            )}
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
            {paidModalPassbook && (
              <div style={{ flex:1, background:T.bg, borderLeft:`1px solid ${T.border}`, display:'flex', flexDirection:'column' as const, maxHeight:"90vh" }}>
                <div style={{ padding:'14px 18px', borderBottom:`1px solid ${T.border}`, fontSize:13, fontWeight:700, color:T.text, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span>📄 Bank Passbook — {paidModal.bankAccount || 'N/A'}</span>
                  <a href={paidModalPassbook.url} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:T.primary }}>Open ↗</a>
                </div>
                <div style={{ flex:1, overflow:'auto' as const, display:'flex', alignItems:'center', justifyContent:'center', padding:10 }}>
                  {paidModalPassbook.url.toLowerCase().endsWith('.pdf') ? (
                    <iframe src={paidModalPassbook.url} style={{ width:'100%', height:'100%', border:'none', minHeight:500 }} />
                  ) : (
                    <img src={paidModalPassbook.url} alt="Passbook" style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain' as const, borderRadius:8 }} />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showExportWarning && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.5)', zIndex:1100, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'#fff', borderRadius:14, padding:28, width:'100%', maxWidth:380, boxShadow:'0 20px 60px rgba(0,0,0,0.2)', textAlign:'center' as const }}>
            <div style={{ fontSize:36, marginBottom:10 }}>⚠️</div>
            <div style={{ fontSize:15, fontWeight:700, color:T.text, marginBottom:8 }}>Cannot download all records</div>
            <div style={{ fontSize:13, color:T.textMuted, marginBottom:20 }}>Please select at least one filter before exporting to Excel.</div>
            <button onClick={()=>setShowExportWarning(false)}
              style={{ background:T.primary, color:'#fff', border:'none', borderRadius:8, padding:'8px 28px', fontSize:13, fontWeight:600, cursor:'pointer' }}>
              OK
            </button>
          </div>
        </div>
      )}
      {toast && <Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
    </Layout>
  );
}
