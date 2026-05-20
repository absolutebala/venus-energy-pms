import React, { useState, useMemo } from 'react';
import { SHARED_INVOICES, INVOICE_PROJECTS, matchesPO } from '@/lib/invoiceData';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { T, card, btnPrimary, btnSecondary } from '@/lib/theme';
import Toast from '@/components/Toast';



const INV_STATUS_CFG: any = {
  'Approved':     { color:'#0D9488', bg:'#F0FDFA', border:'#99F6E4' },
  'Submitted':    { color:'#2563EB', bg:'#EFF6FF', border:'#BFDBFE' },
  'Under Review': { color:'#7C3AED', bg:'#F5F3FF', border:'#DDD6FE' },
  'Rejected':     { color:'#DC2626', bg:'#FEF2F2', border:'#FECACA' },
  'Draft':        { color:'#6B7280', bg:'#F9FAFB', border:'#E5E7EB' },
};
const PAY_STATUS_CFG: any = {
  'Paid':    { color:'#0D9488', bg:'#F0FDFA', border:'#99F6E4' },
  'Pending': { color:'#D97706', bg:'#FFFBEB', border:'#FDE68A' },
  'Partial': { color:'#2563EB', bg:'#EFF6FF', border:'#BFDBFE' },
};

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits:2 });
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';

type SortKey = 'invoiceNo'|'invoiceDate'|'invoiceAmount'|'totalAmount'|'dueDate'|'invoiceStatus'|'paymentStatus';

function StatusPill({ label, cfg }: { label:string; cfg:any }) {
  return <span style={{ fontSize:11, fontWeight:700, color:cfg.color, background:cfg.bg, border:`1px solid ${cfg.border}`, padding:'3px 10px', borderRadius:20, whiteSpace:'nowrap' as const }}>{label}</span>;
}

function SortIcon({ active, dir }: { active:boolean; dir:'asc'|'desc' }) {
  return (
    <span style={{ display:'inline-flex', flexDirection:'column' as const, marginLeft:4, opacity:active?1:0.35, lineHeight:1 }}>
      <span style={{ fontSize:8, color:active&&dir==='asc'?T.primary:'#9CA3AF', lineHeight:1 }}>▲</span>
      <span style={{ fontSize:8, color:active&&dir==='desc'?T.primary:'#9CA3AF', lineHeight:1 }}>▼</span>
    </span>
  );
}

export default function InvoicesPage() {
  const router = useRouter();
  const { profile, can, loading } = useAuth();
  const role = profile?.role || 'viewer';
  const canCreate = !loading && (can('invoices','create'));

  const [poSearch,   setPoSearch]   = useState('');
  // poSearch updates live as user types
  const [cardFilter,  setCardFilter]  = useState<string|null>(null);
  const [poInput,    setPoInput]    = useState('');
  const [sortKey,    setSortKey]    = useState<SortKey>('invoiceDate');
  const [sortDir,    setSortDir]    = useState<'asc'|'desc'>('desc');
  const [showForm,   setShowForm]   = useState(false);
  const [toast,      setToast]      = useState<any>(null);
  const [invoices,   setInvoices]   = useState([...SHARED_INVOICES]);
  const [newInv,     setNewInv]     = useState({ invoiceNo:'', invoiceDate:'', workBoqRef:'', invoiceAmount:'', gst:'', dueDate:'', invoiceStatus:'Draft', paymentStatus:'Pending', projectId:'', poNo:'' });

  // Find project by PO
  const matchedProject = poSearch
    ? (Object.values(INVOICE_PROJECTS) as any[]).find(p =>
        matchesPO(p.poNo, poSearch) ||
        p.id.toLowerCase().includes(poSearch.toLowerCase())
      ) || null
    : null;

  const today2 = new Date();
  const displayInvoices = useMemo(() => {
    let list = poSearch && matchedProject ? invoices.filter(i => i.projectId === matchedProject.id) : [...invoices];
    if (cardFilter === 'pendingApproval') list = list.filter(i=>['Submitted','Under Review'].includes(i.invoiceStatus));
    if (cardFilter === 'pendingPayment')  list = list.filter(i=>i.paymentStatus==='Pending');
    if (cardFilter === 'overdue')         list = list.filter(i=>i.paymentStatus!=='Paid'&&i.dueDate&&new Date(i.dueDate)<today2);
    list.sort((a,b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (typeof va === 'number') return sortDir==='asc' ? (va as number)-(vb as number) : (vb as number)-(va as number);
      return sortDir==='asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
    return list;
  }, [invoices, poSearch, matchedProject, sortKey, sortDir, cardFilter]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d==='asc'?'desc':'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const totalInvoiced = displayInvoices.reduce((a,i)=>a+i.invoiceAmount,0);
  const totalGST      = displayInvoices.reduce((a,i)=>a+i.gst,0);
  const totalAmount   = displayInvoices.reduce((a,i)=>a+i.totalAmount,0);
  const totalPaid     = displayInvoices.filter(i=>i.paymentStatus==='Paid').reduce((a,i)=>a+i.totalAmount,0);

  const thStyle = (key?: SortKey): React.CSSProperties => ({
    padding:'10px 12px', fontSize:10, fontWeight:700, textTransform:'uppercase', background:T.primaryLight,
    color:T.primary, textAlign:'left' as const, borderBottom:`2px solid ${T.primaryMid}`, whiteSpace:'nowrap' as const,
    cursor: key ? 'pointer' : 'default', userSelect:'none' as const,
  });
  const tdStyle: React.CSSProperties = { padding:'10px 12px', fontSize:13, borderBottom:`1px solid ${T.border}`, verticalAlign:'middle' as const };

  const saveInvoice = () => {
    if (!newInv.invoiceNo||!newInv.invoiceDate||!newInv.invoiceAmount) return;
    const amt = Number(newInv.invoiceAmount);
    const gst = Number(newInv.gst);
    // Auto-link project from PO if not from search
    const linkedProj = matchedProject || (Object.values(INVOICE_PROJECTS) as any[]).find(p => matchesPO(p.poNo, newInv.poNo||''));
    setInvoices(prev=>[{ id:"INV-"+Date.now(), ...newInv, invoiceAmount:amt, gst, totalAmount:amt+gst, projectId:linkedProj?.id||'', poNo:newInv.poNo||linkedProj?.poNo||'', createdAt:new Date().toISOString().split('T')[0] }, ...prev]);
    setNewInv({ invoiceNo:'', invoiceDate:'', workBoqRef:'', invoiceAmount:'', gst:'', dueDate:'', invoiceStatus:'Draft', paymentStatus:'Pending', projectId:'', poNo:'' });
    setShowForm(false);
    setToast({ msg:'✅ Invoice added successfully', type:'success' });
  };

  return (
    <Layout>
      <div className="fade-in">
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <div style={{ fontSize:22, fontWeight:800, color:T.text }}>Invoices</div>
            <div style={{ fontSize:13, color:T.textMuted, marginTop:2 }}>Manage and track all project invoices</div>
          </div>
          {canCreate && (
            <button onClick={()=>setShowForm(true)} style={{ ...btnPrimary, fontSize:13 }}>+ New Invoice</button>
          )}
        </div>

        {/* PO Search */}
        <div style={{ ...card, marginBottom:16 }}>
          <div style={{ fontSize:13, fontWeight:600, color:T.text, marginBottom:10 }}>🔍 Search by PO Number or Project ID</div>
          <div style={{ display:'flex', gap:10 }}>
            <input value={poInput} onChange={e=>setPoInput(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&setPoSearch(poInput)}
              placeholder="e.g. PO-IND-2025-001 or VE-2025-001"
              style={{ flex:1, border:`1px solid ${T.border}`, borderRadius:8, padding:'10px 14px', fontSize:13, outline:'none', color:T.text }} />
            <button onClick={()=>setPoSearch(poInput)} style={{ ...btnPrimary }}>Search</button>
            {poSearch && <button onClick={()=>{ setPoSearch(''); setPoInput(''); }} style={{ ...btnSecondary }}>Clear</button>}
            {poSearch && !matchedProject && <span style={{ fontSize:12, color:T.danger, marginLeft:8 }}>⚠️ No project found for "{poSearch}"</span>}
          </div>
        </div>

        {/* Project Details when PO matched */}
        {matchedProject && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
            <div style={card}>
              <div style={{ fontSize:13, fontWeight:700, color:T.primary, marginBottom:12, paddingBottom:8, borderBottom:`2px solid ${T.primaryMid}` }}>📋 Project Details</div>
              {[['Project No',    matchedProject.id],['Site / Project', matchedProject.site],
                ['Region',       matchedProject.region],['Project Manager', matchedProject.pm],
                ['PO Number',    matchedProject.poNo],['Start Date',    fmtDate(matchedProject.startDate)],
                ['End Date',     fmtDate(matchedProject.endDate)],
              ].map(([label,val])=>(
                <div key={label} style={{ display:'flex', justifyContent:'space-between', marginBottom:8, fontSize:13 }}>
                  <span style={{ color:T.textMuted }}>{label}</span>
                  <span style={{ fontWeight:600, color:T.text }}>{val}</span>
                </div>
              ))}
              <button onClick={()=>router.push(`/projects/${matchedProject.id}`)}
                style={{ ...btnSecondary, fontSize:12, marginTop:8, width:'100%' }}>
                Open Project →
              </button>
            </div>
            <div style={card}>
              <div style={{ fontSize:13, fontWeight:700, color:T.primary, marginBottom:12, paddingBottom:8, borderBottom:`2px solid ${T.primaryMid}` }}>💰 Financial Summary</div>
              {[
                ['PO Value',       fmt(matchedProject.poValue),    T.text  ],
                ['Total Invoiced', fmt(totalInvoiced),              T.info  ],
                ['Total GST',      fmt(totalGST),                   T.textMuted],
                ['Grand Total',    fmt(totalAmount),                T.primary],
                ['Total Paid',     fmt(totalPaid),                  T.success],
                ['Balance Due',    fmt(totalAmount-totalPaid),      totalAmount-totalPaid>0?T.danger:T.success],
              ].map(([label,val,color])=>(
                <div key={label} style={{ display:'flex', justifyContent:'space-between', marginBottom:10, fontSize:13 }}>
                  <span style={{ color:T.textMuted }}>{label}</span>
                  <span style={{ fontWeight:700, color }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Invoice Form */}
        {showForm && canCreate && (
          <div style={{ ...card, marginBottom:16, border:`1.5px solid ${T.primaryMid}`, background:T.primaryLight }}>
            <div style={{ fontSize:14, fontWeight:700, color:T.primary, marginBottom:14 }}>+ New Invoice</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }}>
              {[['PO Number','poNo','text','PO-IND-2025-XXX'],['Invoice No *','invoiceNo','text','INV-2025-XXXX'],['Work/BOQ Ref','workBoqRef','text','BOQ-XXX-001'],['Invoice Date *','invoiceDate','date',''],['Due Date','dueDate','date',''],['Invoice Amount (₹) *','invoiceAmount','number','0'],['GST (₹)','gst','number','0']].map(([label,field,type,ph])=>(
                <div key={field}>
                  <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>{label}</label>
                  <input type={type} value={(newInv as any)[field]} placeholder={ph}
                    onChange={e=>setNewInv(p=>({...p,[field]:e.target.value}))}
                    style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'7px 10px', fontSize:13, width:'100%', boxSizing:'border-box' as const, outline:'none', background:'#fff' }} />
                </div>
              ))}
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>Invoice Status</label>
                <select value={newInv.invoiceStatus} onChange={e=>setNewInv(p=>({...p,invoiceStatus:e.target.value}))}
                  style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'7px 10px', fontSize:13, width:'100%', outline:'none', background:'#fff', cursor:'pointer' }}>
                  {['Draft','Submitted','Under Review','Approved','Rejected'].map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={saveInvoice} disabled={!newInv.invoiceNo||!newInv.invoiceDate||!newInv.invoiceAmount}
                style={{ ...btnPrimary, opacity:!newInv.invoiceNo||!newInv.invoiceDate||!newInv.invoiceAmount?0.5:1 }}>
                💾 Save Invoice
              </button>
              <button onClick={()=>setShowForm(false)} style={btnSecondary}>Cancel</button>
            </div>
          </div>
        )}

        {/* Clickable summary cards */}
        {(() => {
          const today = new Date();
          const pendingApproval = invoices.filter(i=>['Submitted','Under Review'].includes(i.invoiceStatus));
          const pendingPayment  = invoices.filter(i=>i.paymentStatus==='Pending');
          const overdue         = invoices.filter(i=>i.paymentStatus!=='Paid'&&i.dueDate&&new Date(i.dueDate)<today);
          const cards = [
            { label:'Total Invoices',    value:invoices.length,            sub:fmt(invoices.reduce((a,i)=>a+i.totalAmount,0)),    color:T.primary,  filter:null,              icon:'📄' },
            { label:'Pending Approval',  value:pendingApproval.length,     sub:`${pendingApproval.length} need review`,            color:'#2563EB',  filter:'pendingApproval', icon:'⏳' },
            { label:'Pending Payment',   value:pendingPayment.length,      sub:fmt(pendingPayment.reduce((a,i)=>a+i.totalAmount,0)),color:'#D97706', filter:'pendingPayment',  icon:'💳' },
            { label:'Overdue',           value:overdue.length,             sub:fmt(overdue.reduce((a,i)=>a+i.totalAmount,0)),      color:T.danger,   filter:'overdue',         icon:'⚠️' },
          ];
          return (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
              {cards.map(s=>(
                <div key={s.label} onClick={()=>setCardFilter(cardFilter===s.filter?null:s.filter)}
                  style={{ ...card, padding:'16px 18px', cursor:'pointer', border:`1.5px solid ${cardFilter===s.filter?s.color:T.border}`, background:cardFilter===s.filter?`${s.color}08`:'#fff', transition:'all 0.15s', position:'relative' as const }}>
                  <div style={{ fontSize:22, marginBottom:6 }}>{s.icon}</div>
                  <div style={{ fontSize:24, fontWeight:800, color:s.color, marginBottom:2 }}>{s.value}</div>
                  <div style={{ fontSize:11, fontWeight:700, color:T.textMuted, textTransform:'uppercase', marginBottom:4 }}>{s.label}</div>
                  <div style={{ fontSize:11, color:T.textDim }}>{s.sub}</div>
                  {cardFilter===s.filter&&s.filter&&(
                    <div style={{ position:'absolute' as const, top:8, right:8, fontSize:10, color:s.color, background:`${s.color}15`, padding:'2px 6px', borderRadius:4, fontWeight:600 }}>FILTERED</div>
                  )}
                </div>
              ))}
            </div>
          );
        })()}

        {/* Invoice Table */}
        <div style={{ ...card }}>
          <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:14 }}>
            {poSearch && matchedProject ? `Invoices for ${matchedProject.id} — ${matchedProject.site}` : 'All Invoices'}
            <span style={{ fontSize:12, fontWeight:400, color:T.textMuted, marginLeft:10 }}>{displayInvoices.length} record{displayInvoices.length!==1?'s':''}</span>
          </div>
          <div style={{ overflowX:'auto' as const }}>
            <table style={{ width:'100%', borderCollapse:'collapse' as const, minWidth:1000 }}>
              <thead>
                <tr>
                  <th style={thStyle()}>#</th>
                  {([['invoiceNo','Invoice No'],['invoiceDate','Invoice Date'],['workBoqRef','Work/BOQ Ref'],['invoiceAmount','Invoice Amount (₹)'],['gst','GST (₹)'],['totalAmount','Total Amount (₹)'],['invoiceStatus','Invoice Status'],['paymentStatus','Payment Status'],['dueDate','Due Date']] as [SortKey,string][]).map(([key,label])=>(
                    <th key={key} style={thStyle(key)} onClick={()=>handleSort(key)}>
                      {label}<SortIcon active={sortKey===key} dir={sortDir} />
                    </th>
                  ))}

                </tr>
              </thead>
              <tbody>
                {displayInvoices.length===0 && (
                  <tr><td colSpan={11} style={{ padding:32, textAlign:'center' as const, color:T.textDim }}>No invoices found</td></tr>
                )}
                {displayInvoices.map((inv,idx)=>{
                  const proj = INVOICE_PROJECTS[inv.projectId];
                  return (
                    <tr key={inv.id} style={{ background:idx%2===0?'#fff':T.bg, cursor:'pointer' }}
                      onClick={()=>inv.projectId&&router.push(`/projects/${inv.projectId}`)}
                      onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background=T.primaryLight}
                      onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background=idx%2===0?'#fff':T.bg}>
                      <td style={{ ...tdStyle, color:T.textMuted, width:36 }}>{idx+1}</td>
                      <td style={{ ...tdStyle }}>
                        <div style={{ fontWeight:700, color:T.primary, fontSize:13 }}>{inv.invoiceNo}</div>
                        {inv.poNo && <div style={{ fontSize:10, color:T.textMuted }}>{inv.poNo}</div>}
                      </td>
                      <td style={{ ...tdStyle, color:T.textMuted, whiteSpace:'nowrap' as const }}>{fmtDate(inv.invoiceDate)}</td>
                      <td style={{ ...tdStyle, color:T.text }}>{inv.workBoqRef}</td>
                      <td style={{ ...tdStyle, textAlign:'right' as const, fontWeight:600 }}>{fmt(inv.invoiceAmount)}</td>
                      <td style={{ ...tdStyle, textAlign:'right' as const, color:T.textMuted }}>{fmt(inv.gst)}</td>
                      <td style={{ ...tdStyle, textAlign:'right' as const, fontWeight:700, color:T.primary }}>{fmt(inv.totalAmount)}</td>
                      <td style={tdStyle}><StatusPill label={inv.invoiceStatus} cfg={INV_STATUS_CFG[inv.invoiceStatus]||INV_STATUS_CFG.Draft} /></td>
                      <td style={tdStyle}><StatusPill label={inv.paymentStatus} cfg={PAY_STATUS_CFG[inv.paymentStatus]||PAY_STATUS_CFG.Pending} /></td>
                      <td style={{ ...tdStyle, whiteSpace:'nowrap' as const, color:T.textMuted }}>{fmtDate(inv.dueDate)}</td>

                    </tr>
                  );
                })}
              </tbody>
              {displayInvoices.length > 0 && (
                <tfoot>
                  <tr style={{ background:T.primaryLight, fontWeight:700 }}>
                    <td colSpan={4} style={{ ...tdStyle, color:T.primary }}>Total</td>
                    <td style={{ ...tdStyle, textAlign:'right' as const, color:T.primary }}>{fmt(totalInvoiced)}</td>
                    <td style={{ ...tdStyle, textAlign:'right' as const, color:T.textMuted }}>{fmt(totalGST)}</td>
                    <td style={{ ...tdStyle, textAlign:'right' as const, color:T.primary }}>{fmt(totalAmount)}</td>
                    <td colSpan={4} style={tdStyle}></td>
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
