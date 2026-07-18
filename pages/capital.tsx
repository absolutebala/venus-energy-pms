import React, { useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useExpenses } from '@/context/ExpenseContext';
import { useInvoices } from '@/context/InvoiceContext';
import { useProjects } from '@/context/ProjectContext';
import { T, card } from '@/lib/theme';

const fmt = (n: number) => '₹' + Number(n||0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
const fmtD = (d: string) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }); }
  catch { return d; }
};

export default function CapitalPage() {
  const { profile, can, loading: authLoading } = useAuth();
  const { expenses, loading: expLoading } = useExpenses();
  const { invoices, loading: invLoading } = useInvoices();
  const { projects } = useProjects();
  const projectMap = React.useMemo(() => {
    const m = new Map<string, any>();
    (projects as any[]).forEach(p => m.set(p.id, p));
    return m;
  }, [projects]);

  const hasAccess = !authLoading && can('capital', 'read');

  const [fundSourceFilter, setFundSourceFilter] = useState('');
  const [investorFilter, setInvestorFilter] = useState('');
  const [search, setSearch] = useState('');
  const [tableMode, setTableMode] = useState<'expenses'|'invoices'>('expenses');

  // ── Expense side: Capital Fund / Personal Fund payments ──────────────────
  const capitalExpenses = useMemo(() => {
    return (expenses as any[]).filter(e => e.status === 'paid' && (e.investorType || e.fundSource || e.fundType));
  }, [expenses]);

  const capitalFundExpenses = useMemo(() => capitalExpenses.filter(e => e.fundSource === 'Capital Fund'), [capitalExpenses]);
  const personalFundExpenses = useMemo(() => capitalExpenses.filter(e => e.fundSource === 'Personal Fund'), [capitalExpenses]);

  const totalCapitalFund = capitalFundExpenses.reduce((a, e) => a + Number(e.amount||0), 0);
  const totalPersonalFund = personalFundExpenses.reduce((a, e) => a + Number(e.amount||0), 0);
  // Regain Capital split by investor
  const regainCapitalSplit = useMemo(() => {
    const paidInvoiceProjectIds = new Set((invoices as any[]).filter(i => i.paymentStatus === 'Paid').map(i => i.projectId));
    const paidExp = (expenses as any[]).filter(e => e.status === 'paid' && paidInvoiceProjectIds.has(e.projectId));
    const inv1 = paidExp.filter(e => e.investorType === 'Investor 1').reduce((a, e) => a + Number(e.amount||0), 0);
    const inv2 = paidExp.filter(e => e.investorType === 'Investor 2').reduce((a, e) => a + Number(e.amount||0), 0);
    const total = paidExp.reduce((a, e) => a + Number(e.amount||0), 0);
    return { inv1, inv2, total };
  }, [expenses, invoices]);
  const latestRegainCapital = regainCapitalSplit.total;
  // Pending Invoice Amount = total of ALL paid expenses portal-wide, minus the live Regain Capital figure above
  const totalPaidExpensesAll = useMemo(() => (expenses as any[]).filter(e => e.status === 'paid').reduce((a, e) => a + Number(e.amount||0), 0), [expenses]);
  const pendingInvoiceAmount = totalPaidExpensesAll - latestRegainCapital;

  // ── Invoice side: Investor 1 / Investor 2 profit totals ───────────────────
  const investor1Invoices = useMemo(() => (invoices as any[]).filter(i => i.investor === 'Investor 1'), [invoices]);
  const investor2Invoices = useMemo(() => (invoices as any[]).filter(i => i.investor === 'Investor 2'), [invoices]);

  const investor1Totals = useMemo(() => investor1Invoices.reduce((acc, i) => ({
    paidAmount: acc.paidAmount + Number(i.investor1PaidAmount||0),
    profit1: acc.profit1 + Number(i.investor1Profit1||0),
    profit2: acc.profit2 + Number(i.investor1Profit2||0),
    additionalCapital: acc.additionalCapital + Number(i.investor1AdditionalCapital||0),
    interest: acc.interest + Number(i.investor1Interest||0),
    otherExpenses: acc.otherExpenses + Number(i.investor1OtherExpenses||0),
    incentive: acc.incentive + Number(i.investor1Incentive||0),
    balanceAmount: acc.balanceAmount + Number(i.investor1BalanceAmount||0),
  }), { paidAmount:0, profit1:0, profit2:0, additionalCapital:0, interest:0, otherExpenses:0, incentive:0, balanceAmount:0 }), [investor1Invoices]);

  const investor2Totals = useMemo(() => investor2Invoices.reduce((acc, i) => ({
    profit1: acc.profit1 + Number(i.investor2Profit1||0),
    profit2: acc.profit2 + Number(i.investor2Profit2||0),
  }), { profit1:0, profit2:0 }), [investor2Invoices]);

  const investor1TotalProfit = investor1Totals.profit1 + investor1Totals.profit2;
  const investor2TotalProfit = investor2Totals.profit1 + investor2Totals.profit2;

  // ── Combined filterable table (expenses OR invoices, toggleable) ─────────
  const filteredExpenseTable = useMemo(() => {
    return capitalExpenses.filter(e => {
      if (fundSourceFilter && e.fundSource !== fundSourceFilter) return false;
      if (investorFilter && e.investorType !== investorFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const proj = projectMap.get(e.projectId);
        const hay = `${e.site||''} ${proj?.poNo||''} ${proj?.indusId||''} ${e.fundType||''}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    }).sort((a,b) => new Date(b.paidAt||0).getTime() - new Date(a.paidAt||0).getTime());
  }, [capitalExpenses, fundSourceFilter, investorFilter, search, projects]);

  const filteredInvoiceTable = useMemo(() => {
    return (invoices as any[]).filter(i => {
      if (!i.investor) return false;
      if (investorFilter && i.investor !== investorFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const proj = projectMap.get(i.projectId);
        const hay = `${i.invoiceNo||''} ${i.poNo||''} ${proj?.indusId||''} ${proj?.site||''}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    }).sort((a,b) => new Date(b.invoiceDate||0).getTime() - new Date(a.invoiceDate||0).getTime());
  }, [invoices, investorFilter, search, projects]);

  const isLoading = authLoading || expLoading || invLoading;

  if (!authLoading && !hasAccess) {
    return (
      <Layout>
        <div style={{ ...card, padding: 40, textAlign: 'center' as const, color: T.textMuted }}>
          You don't have access to this page.
        </div>
      </Layout>
    );
  }

  const thS: React.CSSProperties = { padding:'9px 12px', fontSize:10, fontWeight:700, textTransform:'uppercase' as const, color:T.primary, background:T.primaryLight, textAlign:'left' as const, borderBottom:`2px solid ${T.primaryMid}`, whiteSpace:'nowrap' as const };
  const tdS: React.CSSProperties = { padding:'9px 12px', fontSize:12, borderBottom:`1px solid ${T.border}`, verticalAlign:'middle' as const };
  const selStyle: React.CSSProperties = { background:'#fff', border:`1px solid ${T.border}`, borderRadius:7, padding:'7px 10px', fontSize:13, color:T.text, outline:'none', cursor:'pointer' };

  return (
    <Layout>
      <div className="fade-in">
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.text }}>Capital</div>
          <div style={{ fontSize: 13, color: T.textMuted, marginTop: 2 }}>
            {isLoading ? 'Loading...' : `${capitalExpenses.length} capital-linked expenses · ${investor1Invoices.length + investor2Invoices.length} investor invoices`}
          </div>
        </div>

        {isLoading && <div style={{ ...card, textAlign:'center' as const, padding:40, color:T.textMuted }}>Loading...</div>}

        {!isLoading && (
          <>
            {/* Fund summary cards (from Expenses) */}
            <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:10 }}>💰 Fund Summary (from Expense Payments)</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
              <div style={{ ...card, padding:'16px 18px', borderLeft:`4px solid #0D9488` }}>
                <div style={{ fontSize:10, fontWeight:600, color:'#0D9488', textTransform:'uppercase' as const, marginBottom:4 }}>Capital Fund</div>
                <div style={{ fontSize:20, fontWeight:800, color:'#0D9488' }}>{fmt(totalCapitalFund)}</div>
                <div style={{ fontSize:10, color:T.textMuted }}>{capitalFundExpenses.length} payments</div>
              </div>
              <div style={{ ...card, padding:'16px 18px', borderLeft:`4px solid #2563EB` }}>
                <div style={{ fontSize:10, fontWeight:600, color:'#2563EB', textTransform:'uppercase' as const, marginBottom:4 }}>Personal Fund</div>
                <div style={{ fontSize:20, fontWeight:800, color:'#2563EB' }}>{fmt(totalPersonalFund)}</div>
                <div style={{ fontSize:10, color:T.textMuted }}>{personalFundExpenses.length} payments</div>
              </div>
              <div style={{ ...card, padding:'16px 18px', borderLeft:`4px solid #059669` }}>
                <div style={{ fontSize:10, fontWeight:600, color:'#059669', textTransform:'uppercase' as const, marginBottom:4 }}>Regain Capital</div>
                <div style={{ fontSize:20, fontWeight:800, color:'#059669' }}>{fmt(latestRegainCapital)}</div>
                <div style={{ fontSize:10, color:T.textMuted, marginTop:4 }}>
                  <span style={{ color:'#0D9488' }}>Inv 1: {fmt(regainCapitalSplit.inv1)}</span>
                  {' · '}
                  <span style={{ color:'#2563EB' }}>Inv 2: {fmt(regainCapitalSplit.inv2)}</span>
                </div>
              </div>
              <div style={{ ...card, padding:'16px 18px', borderLeft:`4px solid #DC2626` }}>
                <div style={{ fontSize:10, fontWeight:600, color:'#DC2626', textTransform:'uppercase' as const, marginBottom:4 }}>Pending Invoice Amount</div>
                <div style={{ fontSize:20, fontWeight:800, color:'#DC2626' }}>{fmt(pendingInvoiceAmount)}</div>
                <div style={{ fontSize:10, color:T.textMuted }}>total expenses paid − Regain Capital</div>
              </div>
            </div>

            {/* Investor profit summary (from Invoices) */}
            <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:10 }}>📈 Investor Profit Summary (from Invoices)</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:24 }}>
              <div style={{ ...card, padding:'18px 20px' }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#D97706', marginBottom:12 }}>Investor 1 ({investor1Invoices.length} invoices)</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {[
                    ['Total Profit', fmt(investor1TotalProfit)],
                    ['Paid Amount', fmt(investor1Totals.paidAmount)],
                    ['Profit 1', fmt(investor1Totals.profit1)],
                    ['Profit 2', fmt(investor1Totals.profit2)],
                    ['Additional Capital', fmt(investor1Totals.additionalCapital)],
                    ['Interest', fmt(investor1Totals.interest)],
                    ['Other Expenses', fmt(investor1Totals.otherExpenses)],
                    ['Incentive', fmt(investor1Totals.incentive)],
                    ['Balance Amount', fmt(investor1Totals.balanceAmount)],
                  ].map(([label,val]) => (
                    <div key={label}>
                      <div style={{ fontSize:10, fontWeight:600, color:T.textMuted, textTransform:'uppercase' as const, marginBottom:2 }}>{label}</div>
                      <div style={{ fontSize:14, fontWeight:700, color:T.text }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ ...card, padding:'18px 20px' }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#7C3AED', marginBottom:12 }}>Investor 2 ({investor2Invoices.length} invoices)</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {[
                    ['Total Profit', fmt(investor2TotalProfit)],
                    ['Profit 1', fmt(investor2Totals.profit1)],
                    ['Profit 2', fmt(investor2Totals.profit2)],
                  ].map(([label,val]) => (
                    <div key={label}>
                      <div style={{ fontSize:10, fontWeight:600, color:T.textMuted, textTransform:'uppercase' as const, marginBottom:2 }}>{label}</div>
                      <div style={{ fontSize:14, fontWeight:700, color:T.text }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Table mode toggle + filters */}
            <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:14, flexWrap:'wrap' as const }}>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={()=>setTableMode('expenses')}
                  style={{ background:tableMode==='expenses'?T.primary:'#fff', color:tableMode==='expenses'?'#fff':T.textMuted,
                    border:`1px solid ${tableMode==='expenses'?T.primary:T.border}`, borderRadius:7, padding:'7px 14px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                  Expense Payments
                </button>
                <button onClick={()=>setTableMode('invoices')}
                  style={{ background:tableMode==='invoices'?T.primary:'#fff', color:tableMode==='invoices'?'#fff':T.textMuted,
                    border:`1px solid ${tableMode==='invoices'?T.primary:T.border}`, borderRadius:7, padding:'7px 14px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                  Investor Invoices
                </button>
              </div>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Search site, PO, Indus ID…"
                style={{ ...selStyle, width:260, cursor:'text' }} />
              {tableMode === 'expenses' && (
                <select value={fundSourceFilter} onChange={e=>setFundSourceFilter(e.target.value)} style={selStyle}>
                  <option value="">All Fund Sources</option>
                  <option value="Capital Fund">Capital Fund</option>
                  <option value="Personal Fund">Personal Fund</option>
                </select>
              )}
              <select value={investorFilter} onChange={e=>setInvestorFilter(e.target.value)} style={selStyle}>
                <option value="">All Investor Types</option>
                <option value="Investor 1">Investor 1</option>
                <option value="Investor 2">Investor 2</option>
              </select>
              {(fundSourceFilter || investorFilter || search) && (
                <button onClick={()=>{ setFundSourceFilter(''); setInvestorFilter(''); setSearch(''); }}
                  style={{ fontSize:11, color:T.danger, background:'#FEF2F2', border:`1px solid #FECACA`, borderRadius:6, padding:'6px 12px', cursor:'pointer' }}>
                  ✕ Clear
                </button>
              )}
            </div>

            {/* Expense Payments table */}
            {tableMode === 'expenses' && (
              filteredExpenseTable.length === 0 ? (
                <div style={{ ...card, textAlign:'center' as const, padding:40, color:T.textMuted }}>
                  No capital-linked expense payments found.
                </div>
              ) : (
                <div style={{ ...card, padding:0, overflow:'hidden' }}>
                  <div style={{ overflowX:'auto' as const }}>
                    <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
                      <thead>
                        <tr>
                          {['Site / Vendor', 'PO No', 'Indus ID', 'Investor Type', 'Fund Source', 'Fund Type', 'Amount (₹)', 'Regain Capital (₹)', 'Paid On'].map((h,i)=>(
                            <th key={i} style={thS}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredExpenseTable.map((e:any, idx:number) => {
                          const proj = projectMap.get(e.projectId);
                          return (
                            <tr key={e.id} style={{ background: idx % 2 === 0 ? '#fff' : T.bg }}>
                              <td style={{ ...tdS, fontWeight:600 }}>{e.site || '—'}</td>
                              <td style={tdS}>{proj?.poNo || '—'}</td>
                              <td style={tdS}>{proj?.indusId || '—'}</td>
                              <td style={tdS}>
                                {e.investorType
                                  ? <span style={{ fontSize:11, fontWeight:600, color:'#D97706', background:'#FFFBEB', padding:'2px 8px', borderRadius:20 }}>{e.investorType}</span>
                                  : '—'}
                              </td>
                              <td style={tdS}>
                                {e.fundSource
                                  ? <span style={{ fontSize:11, fontWeight:600, color: e.fundSource==='Capital Fund'?'#0D9488':'#2563EB', background: e.fundSource==='Capital Fund'?'#F0FDFA':'#EFF6FF', padding:'2px 8px', borderRadius:20 }}>{e.fundSource}</span>
                                  : '—'}
                              </td>
                              <td style={tdS}>{e.fundType || '—'}</td>
                              <td style={{ ...tdS, textAlign:'right' as const, fontWeight:700, color:T.primary }}>{fmt(e.amount)}</td>
                              <td style={{ ...tdS, textAlign:'right' as const, color:T.textMuted }}>{e.fundSource==='Capital Fund' ? fmt(e.regainCapital) : '—'}</td>
                              <td style={{ ...tdS, whiteSpace:'nowrap' as const, color:T.textMuted }}>{fmtD(e.paidAt)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            )}

            {/* Investor Invoices table */}
            {tableMode === 'invoices' && (
              filteredInvoiceTable.length === 0 ? (
                <div style={{ ...card, textAlign:'center' as const, padding:40, color:T.textMuted }}>
                  No investor-linked invoices found.
                </div>
              ) : (
                <div style={{ ...card, padding:0, overflow:'hidden' }}>
                  <div style={{ overflowX:'auto' as const }}>
                    <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
                      <thead>
                        <tr>
                          {['Invoice No', 'Site', 'PO No', 'Indus ID', 'Investor', 'Invoice Amount (₹)', 'Profit 1 (₹)', 'Profit 2 (₹)', 'Date'].map((h,i)=>(
                            <th key={i} style={thS}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredInvoiceTable.map((inv:any, idx:number) => {
                          const proj = (projects as any[]).find(p => p.id === inv.projectId);
                          const isInv1 = inv.investor === 'Investor 1';
                          return (
                            <tr key={inv.id} style={{ background: idx % 2 === 0 ? '#fff' : T.bg }}>
                              <td style={{ ...tdS, fontWeight:700, color:T.primary }}>{inv.invoiceNo}</td>
                              <td style={tdS}>{proj?.site || '—'}</td>
                              <td style={tdS}>{proj?.poNo || inv.poNo || '—'}</td>
                              <td style={tdS}>{proj?.indusId || '—'}</td>
                              <td style={tdS}>
                                <span style={{ fontSize:11, fontWeight:600, color: isInv1?'#D97706':'#7C3AED', background: isInv1?'#FFFBEB':'#F5F3FF', padding:'2px 8px', borderRadius:20 }}>{inv.investor}</span>
                              </td>
                              <td style={{ ...tdS, textAlign:'right' as const, fontWeight:700, color:T.primary }}>{fmt(inv.invoiceAmount)}</td>
                              <td style={{ ...tdS, textAlign:'right' as const }}>{fmt(isInv1 ? inv.investor1Profit1 : inv.investor2Profit1)}</td>
                              <td style={{ ...tdS, textAlign:'right' as const }}>{fmt(isInv1 ? inv.investor1Profit2 : inv.investor2Profit2)}</td>
                              <td style={{ ...tdS, whiteSpace:'nowrap' as const, color:T.textMuted }}>{fmtD(inv.invoiceDate)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
