import React, { useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useExpenses } from '@/context/ExpenseContext';
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
  const { projects } = useProjects();

  const hasAccess = !authLoading && can('capital', 'read');

  const [fundSourceFilter, setFundSourceFilter] = useState('');
  const [investorFilter, setInvestorFilter] = useState('');
  const [search, setSearch] = useState('');

  // Only paid expenses carry meaningful Investor Type / Fund Source / Fund Type / Regain Capital values
  const capitalExpenses = useMemo(() => {
    return (expenses as any[]).filter(e => e.status === 'paid' && (e.investorType || e.fundSource || e.fundType));
  }, [expenses]);

  const capitalFundExpenses = useMemo(() => capitalExpenses.filter(e => e.fundSource === 'Capital Fund'), [capitalExpenses]);
  const personalFundExpenses = useMemo(() => capitalExpenses.filter(e => e.fundSource === 'Personal Fund'), [capitalExpenses]);
  const investor1Expenses = useMemo(() => capitalExpenses.filter(e => e.investorType === 'Investor 1'), [capitalExpenses]);
  const investor2Expenses = useMemo(() => capitalExpenses.filter(e => e.investorType === 'Investor 2'), [capitalExpenses]);

  const totalCapitalFund = capitalFundExpenses.reduce((a, e) => a + Number(e.amount||0), 0);
  const totalPersonalFund = personalFundExpenses.reduce((a, e) => a + Number(e.amount||0), 0);
  const totalInvestor1 = investor1Expenses.reduce((a, e) => a + Number(e.amount||0), 0);
  const totalInvestor2 = investor2Expenses.reduce((a, e) => a + Number(e.amount||0), 0);
  // Latest known Regain Capital snapshot (most recently paid Capital Fund expense's stored value)
  const latestRegainCapital = useMemo(() => {
    const sorted = [...capitalFundExpenses].sort((a,b) => new Date(b.paidAt||0).getTime() - new Date(a.paidAt||0).getTime());
    return sorted.length > 0 ? Number(sorted[0].regainCapital||0) : 0;
  }, [capitalFundExpenses]);

  const filteredTable = useMemo(() => {
    return capitalExpenses.filter(e => {
      if (fundSourceFilter && e.fundSource !== fundSourceFilter) return false;
      if (investorFilter && e.investorType !== investorFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const proj = (projects as any[]).find(p => p.id === e.projectId);
        const hay = `${e.site||''} ${proj?.poNo||''} ${proj?.indusId||''} ${e.fundType||''}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    }).sort((a,b) => new Date(b.paidAt||0).getTime() - new Date(a.paidAt||0).getTime());
  }, [capitalExpenses, fundSourceFilter, investorFilter, search, projects]);

  const isLoading = authLoading || expLoading;

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
            {isLoading ? 'Loading...' : `${capitalExpenses.length} capital-linked expense payments`}
          </div>
        </div>

        {isLoading && <div style={{ ...card, textAlign:'center' as const, padding:40, color:T.textMuted }}>Loading...</div>}

        {!isLoading && (
          <>
            {/* Summary cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14, marginBottom:20 }}>
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
              <div style={{ ...card, padding:'16px 18px', borderLeft:`4px solid #D97706` }}>
                <div style={{ fontSize:10, fontWeight:600, color:'#D97706', textTransform:'uppercase' as const, marginBottom:4 }}>Investor 1</div>
                <div style={{ fontSize:20, fontWeight:800, color:'#D97706' }}>{fmt(totalInvestor1)}</div>
                <div style={{ fontSize:10, color:T.textMuted }}>{investor1Expenses.length} payments</div>
              </div>
              <div style={{ ...card, padding:'16px 18px', borderLeft:`4px solid #7C3AED` }}>
                <div style={{ fontSize:10, fontWeight:600, color:'#7C3AED', textTransform:'uppercase' as const, marginBottom:4 }}>Investor 2</div>
                <div style={{ fontSize:20, fontWeight:800, color:'#7C3AED' }}>{fmt(totalInvestor2)}</div>
                <div style={{ fontSize:10, color:T.textMuted }}>{investor2Expenses.length} payments</div>
              </div>
              <div style={{ ...card, padding:'16px 18px', borderLeft:`4px solid #059669` }}>
                <div style={{ fontSize:10, fontWeight:600, color:'#059669', textTransform:'uppercase' as const, marginBottom:4 }}>Latest Regain Capital</div>
                <div style={{ fontSize:20, fontWeight:800, color:'#059669' }}>{fmt(latestRegainCapital)}</div>
                <div style={{ fontSize:10, color:T.textMuted }}>as of last Capital Fund payment</div>
              </div>
            </div>

            {/* Filters */}
            <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:14, flexWrap:'wrap' as const }}>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Search site, PO, Indus ID, fund type…"
                style={{ ...selStyle, width:280, cursor:'text' }} />
              <select value={fundSourceFilter} onChange={e=>setFundSourceFilter(e.target.value)} style={selStyle}>
                <option value="">All Fund Sources</option>
                <option value="Capital Fund">Capital Fund</option>
                <option value="Personal Fund">Personal Fund</option>
              </select>
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

            {/* Table */}
            {filteredTable.length === 0 && (
              <div style={{ ...card, textAlign:'center' as const, padding:40, color:T.textMuted }}>
                No capital-linked expense payments found.
              </div>
            )}

            {filteredTable.length > 0 && (
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
                      {filteredTable.map((e:any, idx:number) => {
                        const proj = (projects as any[]).find(p => p.id === e.projectId);
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
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
