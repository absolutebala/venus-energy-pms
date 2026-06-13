import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@/lib/supabase';
const supabase = createClient();
import * as XLSX from 'xlsx';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useProjects } from '@/context/ProjectContext';
import { useInvoices } from '@/context/InvoiceContext';
import { useMaterial } from '@/context/MaterialContext';
import { T, card, badge , fmtINR} from '@/lib/theme';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const fmt    = fmtINR;
const fmtCr  = fmtINR;
const PCT_CLR= (v:number) => v>=80?T.success:v>=50?T.info:T.danger;
const getAging = (startDate:string, status?:string, endDate?:string) => {
  if (!startDate) return 0;
  if (status === "completed" && endDate)
    return Math.floor((new Date(endDate).getTime()-new Date(startDate).getTime())/86400000);
  return Math.floor((Date.now()-new Date(startDate).getTime())/86400000);
};
const fmtDate  = (d:string) => { try { return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); } catch { return d||'—'; }};

const PROGRESS_MAP: Record<string,number> = {
  not_started:0, pending:5, in_progress:45, delayed:40, submitted:70,
  under_review:75, pm_approved:85, billing_review:90, completed:100,
};

const REPORTS = [
  { key:'executive', label:'Executive Summary',      icon:'📊', desc:'KPIs, status distribution, aging overview' },
  { key:'status',    label:'Project Status Report',  icon:'📋', desc:'All projects by status, region, aging'    },
  { key:'financial', label:'Financial Summary',      icon:'💰', desc:'PO value, billed, paid by region'         },
  { key:'pm',        label:'PM Performance',         icon:'👤', desc:'On-time rate, delayed, completed per PM'  },
  { key:'vendor',    label:'Vendor Performance',     icon:'🏢', desc:'Completion rate, delays per vendor'       },
  { key:'aging',     label:'PO Aging Analysis',      icon:'⏰', desc:'Aging buckets, overdue projects'          },
];

const PIE_COLORS = ['#2563EB','#DC2626','#16A34A','#D97706','#7C3AED','#6B7280'];


// ── Available columns per report type ────────────────────────────
const ALL_COLS: Record<string, {key:string; label:string}[]> = {
  status: [
    { key:'poNo',      label:'PO Number'    },
    { key:'indusId',   label:'Indus ID'     },
    { key:'region',    label:'Region'       },
    { key:'status',    label:'Status'       },
    { key:'pm',        label:'PM'           },
    { key:'rm',        label:'RM'           },
    { key:'vendor',    label:'Vendor'       },
    { key:'aging',     label:'Aging (days)' },
    { key:'poValue',   label:'PO Value'     },
    { key:'billedAmt', label:'Billed'       },
    { key:'paidAmt',   label:'Paid'         },
  ],
  stnsrn: [
    { key:'id',       label:'Project ID'    },
    { key:'vendor',   label:'Vendor'        },
    { key:'issued',   label:'Issued Qty'    },
    { key:'returned', label:'Returned Qty'  },
    { key:'balance',  label:'Balance'       },
    { key:'pct',      label:'Utilised %'    },
  ],
  vendor: [
    { key:'fullName',       label:'Vendor Name'      },
    { key:'total',          label:'Total Projects'   },
    { key:'completed',      label:'Completed'        },
    { key:'delayed',        label:'Delayed'          },
    { key:'completionRate', label:'Completion Rate %'},
  ],
  aging: [
    { key:'id',        label:'Project ID'   },
    { key:'region',    label:'Region'       },
    { key:'status',    label:'Status'       },
    { key:'aging',     label:'Aging (days)' },
    { key:'poValue',   label:'PO Value'     },
    { key:'startDate', label:'Start Date'   },
    { key:'pm',        label:'PM'           },
    { key:'vendor',    label:'Vendor'       },
  ],
};

const CONFIGURABLE = ['status','stnsrn','vendor','aging'];

export default function ReportsPage() {
  const { profile } = useAuth();
  const { projects: rawProjects, loading: projLoading } = useProjects();
  const { invoices, loading: invLoading } = useInvoices();
  const { allItems: materials, loading: matLoading } = useMaterial();

  const [colConfigs,  setColConfigs]  = useState<Record<string,string[]>>({});
  const [agingFilter, setAgingFilter]  = useState<{min:number;max:number}|null>(null);
  const [statusPage,  setStatusPage]   = useState(1);
  const STATUS_PER_PAGE = 25;
  const [configError, setConfigError] = useState<string|null>(null);
  const [colModal,   setColModal]   = useState<string|null>(null); // active report key
  const [savingCols, setSavingCols] = useState(false);
  const [draftCols,  setDraftCols]  = useState<string[]>([]);

  // Load column configs from Supabase
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.from('report_configs').select('report_key,visible_cols');
        if (error) {
          console.error('Failed to load column configs:', error.message);
          setConfigError('Column preferences could not be loaded. Using defaults.');
        } else if (data) {
          const map: Record<string,string[]> = {};
          data.forEach((r:any) => { map[r.report_key] = r.visible_cols; });
          setColConfigs(map);
        }
      } catch(err: any) {
        console.error('Column config fetch error:', err);
        setConfigError('Unable to connect. Using default columns.');
      }
    })();
  }, []);

  const getVisibleCols = (key: string) => colConfigs[key] || ALL_COLS[key]?.map(c=>c.key) || [];
  const getCellValue = (colKey: string, row: any): string => {
    const v = row[colKey];
    if (v === null || v === undefined || v === '') return '—';
    if (colKey === 'poValue' || colKey === 'billedAmt' || colKey === 'paidAmt') return fmt(Number(v));
    if (colKey === 'aging') return `${v}d`;
    if (colKey === 'completionRate') return `${v}%`;
    if (colKey === 'utilisedStatus') return String(v).replace(/_/g,' '); if (colKey === 'status') return row.projectStatus || String(v).replace(/_/g,' ');
    return String(v);
  };

  const getColLabel = (reportKey: string, colKey: string): string => {
    return ALL_COLS[reportKey]?.find(c=>c.key===colKey)?.label || colKey;
  };



  const openColModal = (key: string) => {
    setDraftCols(getVisibleCols(key));
    setColModal(key);
  };

  const toggleCol = (key: string) => {
    setDraftCols(prev => prev.includes(key) ? prev.filter(k=>k!==key) : [...prev, key]);
  };

  const moveCol = (key: string, dir: 'up'|'down') => {
    setDraftCols(prev => {
      const idx = prev.indexOf(key);
      if (dir==='up' && idx>0) { const a=[...prev]; [a[idx-1],a[idx]]=[a[idx],a[idx-1]]; return a; }
      if (dir==='down' && idx<prev.length-1) { const a=[...prev]; [a[idx],a[idx+1]]=[a[idx+1],a[idx]]; return a; }
      return prev;
    });
  };

  const saveCols = async () => {
    if (!colModal) return;
    setSavingCols(true);
    try {
      const { error } = await supabase.from('report_configs').upsert({
        report_key: colModal, visible_cols: draftCols
      }, { onConflict: 'report_key' });
      if (error) throw new Error(error.message);
      setColConfigs(prev => ({ ...prev, [colModal!]: draftCols }));
      setColModal(null);
    } catch(err: any) {
      alert('Failed to save column preferences: ' + err.message);
    } finally {
      setSavingCols(false);
    }
  };

  const router = useRouter();
  const [active, setActive] = useState(()=>{
    if (typeof window === 'undefined') return 'executive';
    const s = new URLSearchParams(window.location.search).get('section');
    return s || 'executive';
  });
  const setActiveWithUrl = (key: string) => {
    setActive(key);
    router.push(`/reports?section=${key}`, undefined, { shallow: true });
  };
  const [region,   setRegion]   = useState('All');

  const role = profile?.role || 'viewer';
  const loading = projLoading || invLoading;
  const hasData = (rawProjects as any[]).length > 0 || invoices.length > 0;

  // Enrich projects with computed fields
  const projects = useMemo(() => {
    return (rawProjects as any[]).map(p => {
      const aging    = getAging(p.startDate, p.status, p.endDate);
      const progress = PROGRESS_MAP[p.status] || 0;
      const projInvs = invoices.filter(i => i.projectId === p.id);
      const billedAmt = projInvs.filter(i => ['Approved','Submitted','Under Review'].includes(i.invoiceStatus))
                          .reduce((a,i) => a + i.totalAmount, 0);
      return { ...p, aging, progress, billedAmt, paidAmt: p.paidAmount||0 };
    }).filter((p:any) => region === 'All' || p.region === region);
  }, [rawProjects, invoices, region]);

  const regions = useMemo(() => Array.from(new Set((rawProjects as any[]).map((p:any)=>p.region).filter(Boolean))), [rawProjects]);

  const totalPO      = projects.reduce((a,p:any)=>a+p.poValue,0);
  const totalBilled  = projects.reduce((a,p:any)=>a+p.billedAmt,0);
  const totalPaid    = projects.reduce((a,p:any)=>a+p.paidAmt,0);
  const totalPending = totalBilled - totalPaid;

  const statusData = [
    { name:'PO Open',   value:projects.filter((p:any)=>(p as any).poStatus==='Open').length,   color:'#059669' },
    { name:'PO Closed', value:projects.filter((p:any)=>(p as any).poStatus==='Closed').length, color:'#DC2626' },
    { name:'Not Set',   value:projects.filter((p:any)=>!(p as any).poStatus).length,           color:'#9CA3AF' },
  ].filter(s=>s.value>0);

  const activeProjects = projects.filter((p:any) => p.status !== "completed");
  const agingData = [
    { range:'0–30d',  count:activeProjects.filter((p:any)=>p.aging<=30).length,  color:T.success },
    { range:'31–60d', count:activeProjects.filter((p:any)=>p.aging>30&&p.aging<=60).length, color:T.info },
    { range:'61–90d', count:activeProjects.filter((p:any)=>p.aging>60&&p.aging<=90).length, color:T.warning },
    { range:'90+d',   count:activeProjects.filter((p:any)=>p.aging>90).length,  color:T.danger },
  ];

  const pms = Array.from(new Set(projects.map((p:any)=>p.pm).filter(Boolean))) as string[];
  const pmData = pms.map(pm => {
    const ps = projects.filter((p:any)=>p.pm===pm);
    const completed = ps.filter((p:any)=>['completed','billing_review'].includes(p.status)).length;
    return {
      name: pm, total: ps.length,
      delayed:   ps.filter((p:any)=>p.status==='delayed').length,
      completed,
      onTime: Math.round(100-(ps.filter((p:any)=>p.status==='delayed').length/ps.length*100)),
    };
  });

  const vendors = Array.from(new Set(projects.map((p:any)=>p.vendor).filter(Boolean))) as string[];
  const vendorData = vendors.map(v => {
    const ps = projects.filter((p:any)=>p.vendor===v);
    const completed = ps.filter((p:any)=>['completed','billing_review'].includes(p.status)).length;
    return {
      name: v.length>20?v.substring(0,18)+'…':v, fullName:v,
      total:ps.length, completed,
      delayed:ps.filter((p:any)=>p.status==='delayed').length,
      completionRate:Math.round(completed/ps.length*100),
    };
  });

  const regionFinancial = (regions as string[]).map(r=>({
    region: r.length>12?r.substring(0,10)+'…':r,
    poValue: projects.filter((p:any)=>p.region===r).reduce((a,p:any)=>a+p.poValue,0)/100000,
    billed:  projects.filter((p:any)=>p.region===r).reduce((a,p:any)=>a+p.billedAmt,0)/100000,
    paid:    projects.filter((p:any)=>p.region===r).reduce((a,p:any)=>a+p.paidAmt,0)/100000,
  }));

  // STN/SRN grouped by project
  const stnSrnData = useMemo(() => {
    const map: Record<string,any[]> = {};
    for (const m of materials) { if (!map[m.projectId]) map[m.projectId]=[]; map[m.projectId].push(m); }
    return Object.entries(map).map(([projectId, mats]) => {
      const proj = (rawProjects as any[]).find(p=>p.id===projectId);
      const issued   = mats.reduce((a,m)=>a+(m.issuedQty||0),0);
      const returned = mats.reduce((a,m)=>a+(m.returnQty||0),0);
      const balance  = mats.reduce((a,m)=>a+Math.max(0,(m.issuedQty||0)-(m.pmApprovedQty||m.utilisedQty||0)),0);
      return { id:projectId, vendor:proj?.vendor||'—', issued, returned, balance, pct:issued?Math.round((issued-balance)/issued*100):0 };
    });
  }, [materials, rawProjects]);

  const selS: React.CSSProperties = { background:'#fff', border:`1px solid ${T.border}`, borderRadius:7, padding:'6px 10px', fontSize:12, color:T.text, outline:'none' };

  const KPI = ({ label, value, sub, color }: any) => (
    <div style={{ ...card, padding:'16px 18px' }}>
      <div style={{ fontSize:11, color:T.textMuted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:5 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:700, color:color||T.text }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:T.textDim, marginTop:3 }}>{sub}</div>}
    </div>
  );

  const thS: React.CSSProperties = { padding:'8px 10px', fontSize:11, fontWeight:700, textTransform:'uppercase',
    color:T.primary, background:T.primaryLight, textAlign:'left' as const, borderBottom:`2px solid ${T.primaryMid}` };

  const visibleReports = REPORTS.filter(r => {
    if (role === 'vendor') return false;
    if (role === 'site_engineer') return ['executive','status'].includes(r.key);
    if (role === 'accounting_team') return ['executive','financial','stnsrn','vendor'].includes(r.key);
    return true;
  });


  const fmt = (v:number) => `₹${v.toLocaleString('en-IN')}`;

  // ── Excel export ──────────────────────────────────────────────
  const exportExcel = useCallback(() => {
    try {
    let rows: any[] = [];
    let sheetName = active;

    if (active === 'status') {
      sheetName = 'Project Status';
      rows = projects.map((p:any) => ({
        'Project ID': p.id, 'Site': p.site, 'Region': p.region,
        'Status': p.status, 'PM': p.pm, 'RM': p.rm,
        'Start Date': p.startDate, 'End Date': p.endDate,
        'Aging (days)': p.aging, 'PO Value': p.poValue,
        'Billed': p.billedAmt, 'Paid': p.paidAmt,
      }));
    } else if (active === 'financial') {
      sheetName = 'Financial Summary';
      rows = regionFinancial.map(r => ({
        'Region': r.region,
        'PO Value (L)': r.poValue.toFixed(2),
        'Billed (L)': r.billed.toFixed(2),
        'Paid (L)': r.paid.toFixed(2),
        'Pending (L)': (r.billed - r.paid).toFixed(2),
      }));
    } else if (active === 'pm') {
      sheetName = 'PM Performance';
      rows = pmData.map(p => ({
        'Project Manager': p.name, 'Total Projects': p.total,
        'Completed': p.completed, 'Delayed': p.delayed,
        'On-Time Rate (%)': p.onTime,
      }));
    } else if (active === 'vendor') {
      sheetName = 'Vendor Performance';
      rows = vendorData.map(v => ({
        'Vendor': v.fullName, 'Total Projects': v.total,
        'Completed': v.completed, 'Delayed': v.delayed,
        'Completion Rate (%)': v.completionRate,
      }));
    } else if (active === 'aging') {
      sheetName = 'PO Aging';
      rows = activeProjects.filter((p:any)=>p.aging>60).sort((a:any,b:any)=>b.aging-a.aging).map((p:any) => ({
        'Project ID': p.id, 'Site': p.site, 'Region': p.region,
        'Status': p.status, 'Aging (days)': p.aging,
        'PO Value': p.poValue, 'Start Date': p.startDate,
      }));
    } else if (active === 'stnsrn') {
      sheetName = 'STN-SRN Report';
      rows = Object.entries(stnSrnData).flatMap(([projId, items]:any) =>
        items.map((m:any) => ({
          'Project ID': projId, 'Code': m.code, 'Description': m.description,
          'Issued Qty': m.issuedQty, 'Utilised Qty': m.utilisedQty,
          'Return Qty': m.returnQty||0, 'Status': m.utilisedStatus,
        }))
      );
    } else if (active === 'ptw') {
      sheetName = 'PTW Compliance';
      rows = projects.filter((p:any)=>p.ptwTicketId).map((p:any) => ({
        'Project ID': p.id, 'Site': p.site, 'PTW Ticket': p.ptwTicketId,
        'Supervisor': p.ptwSupervisor, 'Valid From': p.ptwDateFrom,
        'Valid To': p.ptwDateTo, 'Status': p.status,
      }));
    } else {
      sheetName = 'Executive Summary';
      rows = [
        { Metric: 'Total Projects', Value: projects.length },
        { Metric: 'In Progress', Value: projects.filter((p:any)=>p.status==='in_progress').length },
        { Metric: 'Delayed', Value: projects.filter((p:any)=>p.status==='delayed').length },
        { Metric: 'Completed', Value: projects.filter((p:any)=>p.status==='completed').length },
        { Metric: 'Total PO Value', Value: fmt(totalPO) },
        { Metric: 'Total Billed', Value: fmt(totalBilled) },
        { Metric: 'Total Paid', Value: fmt(totalPaid) },
        { Metric: 'Pending', Value: fmt(totalPending) },
      ];
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `Venus_Energy_${sheetName}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch(err: any) {
      alert('Excel export failed: ' + err.message);
    }
  }, [active, projects, regionFinancial, pmData, vendorData, activeProjects, stnSrnData, totalPO, totalBilled, totalPaid, totalPending]);



  return (
    <Layout>
      <div className="fade-in">
        {configError && (
          <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:8,
            padding:'10px 14px', marginBottom:14, fontSize:13, color:'#D97706',
            display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span>⚠️ {configError}</span>
            <button onClick={()=>setConfigError(null)}
              style={{ background:'none', border:'none', cursor:'pointer', color:'#D97706', fontSize:16 }}>✕</button>
          </div>
        )}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:12 }}>
          <div>
            <h2 style={{ fontSize:16, fontWeight:700, color:T.text, margin:0 }}>Management Reports</h2>
            <p style={{ fontSize:12, color:T.textMuted, margin:'2px 0 0' }}>
              {loading ? 'Loading data…' : `${projects.length} projects · Live data from Supabase`}
            </p>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {CONFIGURABLE.includes(active) && (
            <button onClick={() => openColModal(active)}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px',
                background:'#7C3AED', color:'#fff', border:'none', borderRadius:8,
                cursor:'pointer', fontSize:12, fontWeight:600 }}>
              ⚙ Columns
            </button>
          )}
          <button onClick={exportExcel}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px',
              background:'#16A34A', color:'#fff', border:'none', borderRadius:8,
              cursor:'pointer', fontSize:12, fontWeight:600 }}>
            📊 Excel
          </button>

          <select value={region} onChange={e=>setRegion(e.target.value)} style={selS}>
              <option>All</option>{(regions as string[]).map(r=><option key={r}>{r}</option>)}
            </select>

          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:16 }}>
          {/* Report list */}
          <div>
            {visibleReports.map(r=>(
              <div key={r.key} onClick={()=>setActiveWithUrl(r.key)}
                style={{ padding:'10px 12px', borderRadius:9, marginBottom:6, cursor:'pointer',
                  border:`1.5px solid ${active===r.key?T.primary:T.border}`,
                  background:active===r.key?T.primaryLight:T.surface }}>
                <div style={{ fontSize:13, fontWeight:600, color:active===r.key?T.primary:T.text }}>{r.icon} {r.label}</div>
                <div style={{ fontSize:11, color:T.textMuted, marginTop:2 }}>{r.desc}</div>
              </div>
            ))}
          </div>

          {/* Report content */}
          <div>
            {/* ── Executive Summary ── */}
            {active==='executive' && (
              <div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
                  <KPI label="Total Projects"    value={projects.length}                                                            color={T.primary} />
                  <KPI label="Total PO Value"    value={fmtCr(totalPO)}                                                             color={T.text}    />
                  <KPI label="Total Billed"      value={fmt(totalBilled)}                                                           color={T.info}    />
                  <KPI label="Total Paid"        value={fmt(totalPaid)}                                                             color={T.success} />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
                  <KPI label="Regions"           value={new Set(projects.map((p:any)=>p.region).filter(Boolean)).size}             color='#7C3AED'   sub="Unique regions" />
                  <KPI label="Aging (60d+)"      value={projects.filter((p:any)=>getAging(p.startDate,p.status,p.endDate)>60).length} color={T.warning} sub="Projects overdue" />
                  <KPI label="PO Open"           value={projects.filter((p:any)=>(p as any).poStatus==='Open').length}             color='#059669'   />
                  <KPI label="PO Closed"         value={projects.filter((p:any)=>(p as any).poStatus==='Closed').length}           color={T.danger}  />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                  <div style={card}>
                    <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:14 }}>Status Distribution</div>
                    <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                      <ResponsiveContainer width={130} height={130}>
                        <PieChart><Pie data={statusData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" paddingAngle={3}>
                          {statusData.map((d,i)=><Cell key={i} fill={d.color} />)}
                        </Pie><Tooltip contentStyle={{ fontSize:12 }} /></PieChart>
                      </ResponsiveContainer>
                      <div style={{ flex:1 }}>
                        {statusData.map((d,i)=>(
                          <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                            <div style={{ width:8, height:8, borderRadius:2, background:d.color }} />
                            <span style={{ fontSize:12, color:T.textMuted, flex:1 }}>{d.name}</span>
                            <span style={{ fontSize:12, fontWeight:700 }}>{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={card}>
                    <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:14 }}>PO Aging Overview</div>
                    <ResponsiveContainer width="100%" height={130}>
                      <BarChart data={agingData} barSize={32}>
                        <XAxis dataKey="range" tick={{ fontSize:11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize:11 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ fontSize:12 }} />
                        <Bar dataKey="count" radius={[5,5,0,0]}>{agingData.map((d,i)=><Cell key={i} fill={d.color} />)}</Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* ── Project Status ── */}
            {active==='status' && (
              <div style={card}>
                <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:14 }}>
                  All Projects — Status Overview <span style={{ fontSize:12, fontWeight:400, color:T.textMuted }}>({projects.length} records)</span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
                  {[
                    { label:'0–30 Days',    min:0,   max:30,  color:'#059669', bg:'#D1FAE5' },
                    { label:'31–60 Days',   min:31,  max:60,  color:'#2563EB', bg:'#EFF6FF' },
                    { label:'61–90 Days',   min:61,  max:90,  color:'#D97706', bg:'#FFFBEB' },
                    { label:'91–120 Days',  min:91,  max:120, color:'#DC2626', bg:'#FEF2F2' },
                    { label:'121–180 Days', min:121, max:180, color:'#7C3AED', bg:'#F5F3FF' },
                    { label:'180+ Days',    min:181, max:99999,color:'#9F1239',bg:'#FFF1F2' },
                  ].map(b=>(
                    <div key={b.label} onClick={()=>{ setAgingFilter(agingFilter?.min===b.min?null:{min:b.min,max:b.max}); setStatusPage(1); }} style={{ background:b.bg, border:`1px solid ${agingFilter?.min===b.min?b.color:b.color+'30'}`, borderRadius:10, padding:'12px 14px', cursor:'pointer', boxShadow:agingFilter?.min===b.min?`0 0 0 2px ${b.color}40`:'none', transition:'all 0.15s' }}>
                      <div style={{ fontSize:10, fontWeight:600, color:b.color, textTransform:'uppercase' as const, marginBottom:4 }}>{b.label}</div>
                      <div style={{ fontSize:22, fontWeight:800, color:b.color }}>
                        {projects.filter((p:any)=>{ const a=getAging(p.startDate,p.status,p.endDate); return a>=b.min && a<=b.max; }).length}
                      </div>
                      <div style={{ fontSize:10, color:b.color, opacity:0.7 }}>projects</div>
                    </div>
                  ))}
                </div>
                <div style={{ overflowX:'auto' as const }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
                    <thead><tr>{getVisibleCols('status').map(k=>(
                      <th key={k} style={{ ...thS,
                        maxWidth: k==='indusId'?80:k==='status'?120:k==='poNo'?110:undefined,
                        minWidth: k==='indusId'?60:k==='status'?100:undefined,
                        overflow:'hidden', textOverflow:'ellipsis' }}>{getColLabel('status',k)}</th>
                    ))}</tr></thead>
                    {(() => {
                      const filteredP = agingFilter ? projects.filter((p:any)=>{ const a=getAging(p.startDate,p.status,p.endDate); return a>=agingFilter.min && a<=agingFilter.max; }) : projects;
                      const totalPages = Math.ceil(filteredP.length/STATUS_PER_PAGE);
                      const pageData = filteredP.slice((statusPage-1)*STATUS_PER_PAGE, statusPage*STATUS_PER_PAGE);
                      return <>
                    <tbody>{pageData.map((p:any,i:number)=>(
                      <tr key={p.id} style={{ background:i%2===0?'#fff':T.bg, borderBottom:`1px solid ${T.border}` }}>
                        {getVisibleCols('status').map(k=>(
                          <td key={k} style={{ padding:'9px 10px', fontSize:12,
                            whiteSpace: 'nowrap' as const,
                            color: k==='poNo'?T.primary:k==='aging'&&p.aging>90?T.danger:k==='aging'&&p.aging>60?'#D97706':T.text,
                            fontWeight: k==='poNo'||k==='poValue'||k==='billedAmt'?700:400 }}>
                            {getCellValue(k, p)}
                          </td>
                        ))}
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Financial ── */}
            {active==='financial' && (
              <div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
                  <KPI label="Total PO Value"  value={fmtCr(totalPO)}    color={T.primary} />
                  <KPI label="Total Billed"    value={fmt(totalBilled)}  color={T.info}    />
                  <KPI label="Total Paid"      value={fmt(totalPaid)}    color={T.success} />
                  <KPI label="Outstanding"     value={fmt(totalPending)} color={T.warning} />
                </div>
                <div style={card}>
                  <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:14 }}>Financial by Region (₹ Lakhs)</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={regionFinancial} barGap={4}>
                      <XAxis dataKey="region" tick={{ fontSize:11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize:11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ fontSize:12 }} formatter={(v:any)=>`₹${v}L`} />
                      <Legend />
                      <Bar dataKey="poValue" name="PO Value" fill={T.primary} radius={[4,4,0,0]} barSize={20} />
                      <Bar dataKey="billed"  name="Billed"   fill={T.info}    radius={[4,4,0,0]} barSize={20} />
                      <Bar dataKey="paid"    name="Paid"     fill={T.success} radius={[4,4,0,0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ── PM Performance ── */}
            {active==='pm' && (
              <div style={card}>
                <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:14 }}>PM Performance Overview</div>
                {pmData.map((pm,i)=>(
                  <div key={i} style={{ padding:'14px 16px', background:T.bg, borderRadius:10, marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                      <div style={{ fontSize:14, fontWeight:700 }}>{pm.name}</div>
                      <div style={{ display:'flex', gap:8 }}>
                        <span style={{ fontSize:12, color:T.info, background:T.primaryLight, padding:'2px 10px', borderRadius:10, fontWeight:600 }}>{pm.total} projects</span>
                        {pm.delayed>0&&<span style={{ fontSize:12, color:T.danger, background:'#FEF2F2', padding:'2px 10px', borderRadius:10, fontWeight:600 }}>{pm.delayed} delayed</span>}
                        <span style={{ fontSize:12, color:T.success, background:T.successBg, padding:'2px 10px', borderRadius:10, fontWeight:600 }}>{pm.completed} completed</span>
                      </div>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                      <span style={{ fontSize:12, color:T.textMuted }}>On-Time Rate</span>
                      <span style={{ fontSize:12, fontWeight:700, color:PCT_CLR(pm.onTime) }}>{pm.onTime}%</span>
                    </div>
                    <div style={{ height:6, background:T.border, borderRadius:3 }}>
                      <div style={{ height:'100%', width:`${pm.onTime}%`, background:PCT_CLR(pm.onTime), borderRadius:3 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Vendor Performance ── */}
            {active==='vendor' && (
              <div style={card}>
                <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:14 }}>Vendor Performance Overview</div>
                <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
                  <thead><tr>{getVisibleCols('vendor').map(k=>(
                    <th key={k} style={thS}>{getColLabel('vendor',k)}</th>
                  ))}</tr></thead>
                  <tbody>{vendorData.map((v,i)=>(
                    <tr key={i} style={{ background:i%2===0?'#fff':T.bg, borderBottom:`1px solid ${T.border}` }}>
                      <td style={{ padding:'10px', fontWeight:600, fontSize:13 }}>{v.fullName}</td>
                      <td style={{ padding:'10px', textAlign:'center', fontWeight:700 }}>{v.total}</td>
                      <td style={{ padding:'10px', textAlign:'center', color:T.success, fontWeight:600 }}>{v.completed}</td>
                      <td style={{ padding:'10px', textAlign:'center', color:v.delayed>0?T.danger:T.success, fontWeight:600 }}>{v.delayed}</td>
                      <td style={{ padding:'10px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ flex:1, height:6, background:T.border, borderRadius:3 }}>
                            <div style={{ height:'100%', width:`${v.completionRate}%`, background:PCT_CLR(v.completionRate), borderRadius:3 }} />
                          </div>
                          <span style={{ fontSize:12, fontWeight:700, color:PCT_CLR(v.completionRate), minWidth:36 }}>{v.completionRate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}

            {/* ── Aging ── */}
            {active==='aging' && (
              <div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
                  {agingData.map((a,i)=>(
                    <div key={i} style={{ ...card, borderTop:`4px solid ${a.color}` }}>
                      <div style={{ fontSize:11, color:T.textMuted, textTransform:'uppercase', marginBottom:5 }}>{a.range}</div>
                      <div style={{ fontSize:28, fontWeight:700, color:a.color }}>{a.count}</div>
                      <div style={{ fontSize:11, color:T.textDim }}>projects</div>
                    </div>
                  ))}
                </div>
                <div style={card}>
                  <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:14 }}>High Aging Projects (&gt;60 days)</div>
                  <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
                    <thead><tr>{getVisibleCols('aging').map(k=>(
                      <th key={k} style={thS}>{getColLabel('aging',k)}</th>
                    ))}</tr></thead>
                    <tbody>{projects.filter((p:any)=>p.aging>60&&p.status!=="completed").sort((a:any,b:any)=>b.aging-a.aging).map((p:any,i:number)=>(
                      <tr key={p.id} style={{ background:i%2===0?'#fff':T.bg, borderBottom:`1px solid ${T.border}` }}>
                        <td style={{ padding:'9px 10px', color:T.primary, fontWeight:700 }}>{p.id}</td>
                        <td style={{ padding:'9px 10px', fontSize:12 }}>{p.pm}</td>
                        <td style={{ padding:'9px 10px', fontSize:12, color:T.textMuted }}>{p.region}</td>
                        <td style={{ padding:'9px 10px', fontSize:12 }}>{p.vendor||'—'}</td>
                        <td style={{ padding:'9px 10px' }}><span style={{ fontWeight:700, color:p.aging>90?T.danger:'#D97706' }}>{p.aging}d</span></td>
                        <td style={{ padding:'9px 10px' }}>
                          <span style={{ fontSize:11, fontWeight:700, color:T.textMuted, background:T.bg, padding:'2px 8px', borderRadius:20 }}>
                            {p.status?.replace(/_/g,' ')}
                          </span>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── STN/SRN ── */}
            {active==='stnsrn' && (
              <div style={card}>
                <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:8 }}>STN/SRN Material Utilisation Report</div>
                <div style={{ fontSize:12, color:T.textMuted, marginBottom:16 }}>Live data from Supabase material_items table</div>
                <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
                  <thead><tr>{getVisibleCols('stnsrn').map(k=>(
                    <th key={k} style={thS}>{getColLabel('stnsrn',k)}</th>
                  ))}</tr></thead>
                  <tbody>{(stnSrnData as any[]).map((r:any,i:number)=>(
                    <tr key={r.id} style={{ background:i%2===0?'#fff':T.bg, borderBottom:`1px solid ${T.border}` }}>
                      <td style={{ padding:'9px 10px', color:T.primary, fontWeight:700, fontSize:12 }}>{r.id}</td>
                      <td style={{ padding:'9px 10px', fontSize:12 }}>{r.vendor}</td>
                      <td style={{ padding:'9px 10px', textAlign:'right', fontWeight:600 }}>{r.issued}</td>
                      <td style={{ padding:'9px 10px', textAlign:'right', color:T.success, fontWeight:600 }}>{r.returned}</td>
                      <td style={{ padding:'9px 10px', textAlign:'right', fontWeight:700, color:r.balance>0?T.danger:T.success }}>{r.balance}</td>
                      <td style={{ padding:'9px 10px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div style={{ flex:1, height:6, background:T.border, borderRadius:3 }}>
                            <div style={{ height:'100%', width:`${r.pct}%`, background:PCT_CLR(r.pct), borderRadius:3 }} />
                          </div>
                          <span style={{ fontSize:11, fontWeight:700, color:PCT_CLR(r.pct) }}>{r.pct}%</span>
                        </div>
                      </td>
                      <td style={{ padding:'9px 10px' }}>
                        <span style={{ fontSize:11, fontWeight:700,
                          color:r.balance===0?T.success:T.danger,
                          background:r.balance===0?T.successBg:'#FEF2F2',
                          padding:'2px 8px', borderRadius:10 }}>
                          {r.balance===0?'✅ Cleared':'⏳ Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}

            {/* ── PTW Compliance ── */}
            {active==='ptw' && (
              <div style={card}>
                <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:8 }}>PTW Compliance Report</div>
                <div style={{ fontSize:12, color:T.textMuted, marginBottom:16 }}>Permit to Work status from project records</div>
                <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
                  <thead><tr>{['Project','PM','PTW Ticket','Supervisor','Valid From','Valid To','Status'].map(h=>(
                    <th key={h} style={thS}>{h}</th>
                  ))}</tr></thead>
                  <tbody>{(rawProjects as any[]).filter(p=>p.ptwTicketId||p.ptwDateFrom).map((p:any,i:number)=>{
                    const expired = p.ptwDateTo && new Date(p.ptwDateTo) < new Date();
                    return (
                      <tr key={p.id} style={{ background:i%2===0?'#fff':T.bg, borderBottom:`1px solid ${T.border}` }}>
                        <td style={{ padding:'9px 10px', color:T.primary, fontWeight:700, fontSize:12 }}>{p.id}</td>
                        <td style={{ padding:'9px 10px', fontSize:12 }}>{p.pm}</td>
                        <td style={{ padding:'9px 10px', fontSize:12, fontWeight:600 }}>{p.ptwTicketId||'—'}</td>
                        <td style={{ padding:'9px 10px', fontSize:12 }}>{p.ptwSupervisor||'—'}</td>
                        <td style={{ padding:'9px 10px', fontSize:12, color:T.textMuted }}>{fmtDate(p.ptwDateFrom)}</td>
                        <td style={{ padding:'9px 10px', fontSize:12, color:T.textMuted }}>{fmtDate(p.ptwDateTo)}</td>
                        <td style={{ padding:'9px 10px' }}>
                          <span style={{ fontSize:11, fontWeight:700,
                            color:expired?T.warning:T.success,
                            background:expired?'#FFFBEB':T.successBg,
                            padding:'2px 8px', borderRadius:10 }}>
                            {expired?'⏰ Expired':'✅ Active'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Column Manager Modal */}
      {colModal && ALL_COLS[colModal] && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1000,
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:16, width:480, maxHeight:'80vh',
            display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding:'18px 20px', borderBottom:`1px solid ${T.border}`,
              display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:T.text }}>Manage Columns</div>
                <div style={{ fontSize:12, color:T.textMuted, marginTop:2 }}>
                  Select and order columns for this report
                </div>
              </div>
              <button onClick={()=>setColModal(null)}
                style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:T.textMuted }}>✕</button>
            </div>

            <div style={{ padding:'16px 20px', overflowY:'auto', flex:1 }}>
              {/* Selected columns in order first, then unchecked */}
              <div style={{ fontSize:11, fontWeight:700, color:T.textMuted, textTransform:'uppercase',
                letterSpacing:0.5, marginBottom:10 }}>Available Columns</div>
              {[
                ...draftCols.map(k => ALL_COLS[colModal!].find(c=>c.key===k)).filter(Boolean),
                ...ALL_COLS[colModal!].filter(col => !draftCols.includes(col!.key))
              ].filter((col): col is {key:string;label:string} => !!col).map(col => (
                <div key={col.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'8px 12px', borderRadius:8, marginBottom:4,
                  background: draftCols.includes(col.key) ? T.primaryLight : T.bg,
                  border:`1px solid ${draftCols.includes(col.key) ? T.primaryMid : T.border}` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <input type="checkbox" checked={draftCols.includes(col.key)}
                      onChange={()=>toggleCol(col.key)}
                      style={{ cursor:'pointer', accentColor:T.primary }} />
                    <span style={{ fontSize:13, color:T.text, fontWeight: draftCols.includes(col.key)?600:400 }}>
                      {col.label}
                    </span>
                  </div>
                  {draftCols.includes(col.key) && (
                    <div style={{ display:'flex', gap:4 }}>
                      <button onClick={()=>moveCol(col.key,'up')}
                        style={{ background:'none', border:`1px solid ${T.border}`, borderRadius:5,
                          padding:'2px 6px', cursor:'pointer', fontSize:11, color:T.textMuted }}>↑</button>
                      <button onClick={()=>moveCol(col.key,'down')}
                        style={{ background:'none', border:`1px solid ${T.border}`, borderRadius:5,
                          padding:'2px 6px', cursor:'pointer', fontSize:11, color:T.textMuted }}>↓</button>
                    </div>
                  )}
                </div>
              ))}

              {/* Column order preview */}
              {draftCols.length > 0 && (
                <div style={{ marginTop:16 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:T.textMuted, textTransform:'uppercase',
                    letterSpacing:0.5, marginBottom:8 }}>Column Order Preview</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {draftCols.map((k,i) => {
                      const col = ALL_COLS[colModal!].find(c=>c.key===k);
                      return (
                        <span key={k} style={{ fontSize:11, padding:'3px 10px', borderRadius:20,
                          background:T.primary, color:'#fff', fontWeight:500 }}>
                          {i+1}. {col?.label||k}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding:'14px 20px', borderTop:`1px solid ${T.border}`,
              display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <button onClick={()=>setDraftCols(ALL_COLS[colModal!].map(c=>c.key))}
                style={{ fontSize:12, color:T.textMuted, background:'none', border:'none', cursor:'pointer' }}>
                Reset to Default
              </button>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={()=>setColModal(null)}
                  style={{ padding:'8px 16px', background:T.bg, border:`1px solid ${T.border}`,
                    borderRadius:8, cursor:'pointer', fontSize:13, color:T.text }}>Cancel</button>
                <button onClick={saveCols} disabled={savingCols||draftCols.length===0}
                  style={{ padding:'8px 20px', background:T.primary, color:'#fff', border:'none',
                    borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600,
                    opacity: savingCols||draftCols.length===0 ? 0.6 : 1 }}>
                  {savingCols ? 'Saving…' : '💾 Save Columns'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}
