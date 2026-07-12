import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@/lib/supabase';
const supabase = createClient();
import * as XLSX from 'xlsx';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useProjects } from '@/context/ProjectContext';
import { useInvoices } from '@/context/InvoiceContext';
import { useExpenses } from '@/context/ExpenseContext';
import { useMaterial } from '@/context/MaterialContext';
import { usePOItems } from '@/context/POItemContext';
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
    { key:'poValue', label:'PO Value'},
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
  const { expenses } = useExpenses();
  const [finPage, setFinPage] = React.useState(1);
  const FIN_PER_PAGE = 10;
  const { allItems: materials, loading: matLoading } = useMaterial();
  const { items: poItems } = usePOItems();

  const [colConfigs,  setColConfigs]  = useState<Record<string,string[]>>({});
  const [wccPage,  setWccPage]  = useState(1);
  const [negPage,  setNegPage]  = useState(1);
  const [nearPage, setNearPage] = useState(1);
  const PM_INSIGHT_PER_PAGE = 10;
  const [vWccPage,  setVWccPage]  = useState(1);
  const [vNegPage,  setVNegPage]  = useState(1);
  const [vNearPage, setVNearPage] = useState(1);
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
  const [vendorFilter, setVendorFilter] = useState('All');

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

  const statusFilteredProjects = React.useMemo(() => agingFilter
    ? projects.filter((p:any)=>{ const a=getAging(p.startDate,p.status,p.endDate); return a>=agingFilter.min && a<=agingFilter.max; })
    : projects
  , [projects, agingFilter]);
  const statusTotalPages = Math.ceil(statusFilteredProjects.length / STATUS_PER_PAGE);
  const statusPageData = statusFilteredProjects.slice((statusPage-1)*STATUS_PER_PAGE, statusPage*STATUS_PER_PAGE);

  const regions = useMemo(() => Array.from(new Set((rawProjects as any[]).map((p:any)=>p.region).filter(Boolean))), [rawProjects]);

  const totalPO      = projects.reduce((a,p:any)=>a+p.poValue,0);
  // Total Billed = sum of invoice amounts where payment status is Paid
  const totalBilled  = invoices.filter(i=>i.paymentStatus==='Paid').reduce((a,i)=>a+Number(i.invoiceAmount||0),0);
  // Total Paid = sum of paid expense amounts
  const totalPaid    = expenses.filter(e=>e.status==='paid').reduce((a,e)=>a+Number(e.amount||0),0);
  // Total Invoices Unpaid = total invoice amount where payment status is NOT Paid
  const totalUnpaidInvoices = invoices.filter(i=>i.paymentStatus!=='Paid').reduce((a,i)=>a+Number(i.invoiceAmount||0),0);
  const totalPending = totalBilled - totalPaid;

  // Executive Summary metrics — computed at component level
  const execMetrics = React.useMemo(() => {
    const total       = (projects as any[]).length;
    const wccRaised   = (projects as any[]).filter(p=>(p as any).projectStatus==='WCC Raised').length;
    const wccPct      = total ? Math.round(wccRaised/total*100) : 0;
    const avgAging    = total ? Math.round((projects as any[]).reduce((a,p:any)=>a+(p.aging||0),0)/total) : 0;
    const delayed     = (projects as any[]).filter(p=>p.aging>90).length;
    const poOpen      = (projects as any[]).filter(p=>(p as any).poStatus==='Open').length;
    const poClosed    = (projects as any[]).filter(p=>(p as any).poStatus==='Closed').length;
    const today       = new Date();
    const WCC_DONE    = ['WCC Raised','Work Completed / Approval Pending','Invoice Submitted – Payment Pending','Invoice Submitted – Payment Received','Billing Shared','Already Billed with Another PO'];
    const wccAlertCount = (projects as any[]).filter(p => {
      if (WCC_DONE.some(s=>s===(p as any).projectStatus)) return false;
      const projExp = expenses.filter((e:any)=>e.projectId===p.id&&e.paidAt&&e.status==='paid');
      if (!projExp.length) return false;
      const firstPaid = new Date(projExp.sort((a:any,b:any)=>new Date(a.paidAt as string).getTime()-new Date(b.paidAt as string).getTime())[0].paidAt as string);
      return Math.floor((today.getTime()-firstPaid.getTime())/(1000*60*60*24))>15;
    }).length;
    const negProjCount = (projects as any[]).filter(p=>{const b=Number((p as any).billedAmount||0),pd=Number((p as any).paidAmount||0);return b>0&&(b-pd)<0;}).length;
    const nearlyCount  = (projects as any[]).filter(p=>(p as any).projectStatus==='Work Completed / Approval Pending'&&poItems.some(m=>m.projectId===p.id&&m.utilisedStatus!=='pm_approved')).length;
    const stnTotal     = poItems.length;
    const stnApproved  = poItems.filter(m=>m.utilisedStatus==='pm_approved').length;
    const stnPending   = poItems.filter(m=>m.utilisedStatus==='submitted').length;
    const stnNotSub    = poItems.filter(m=>m.utilisedStatus==='pending'||!m.utilisedStatus).length;
    const stnApprPct   = stnTotal ? Math.round(stnApproved/stnTotal*100) : 0;
    const ptwRaised    = new Set(materials.map((m:any)=>m.projectId)).size;
    const ptwCoverage  = total ? Math.round(ptwRaised/total*100) : 0;
    return { total, wccRaised, wccPct, avgAging, delayed, poOpen, poClosed,
      wccAlertCount, negProjCount, nearlyCount,
      stnTotal, stnApproved, stnPending, stnNotSub, stnApprPct, ptwRaised, ptwCoverage };
  }, [projects, expenses, poItems, materials]);

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
    const completed  = ps.filter((p:any)=>(p as any).projectStatus==='WCC Raised').length;
    const delayed    = ps.filter((p:any)=>p.aging>90).length;
    const poValue    = ps.reduce((a,p:any)=>a+Number(p.poValue||0),0);
    const avgAging   = ps.length ? Math.round(ps.reduce((a,p:any)=>a+(p.aging||0),0)/ps.length) : 0;
    const cleanPct   = ps.length ? Math.round(ps.filter((p:any)=>p.aging<=90).length/ps.length*100) : 0;
    // STN metrics
    const pmProjectIds = new Set(ps.map((p:any)=>p.id));
    const pmStnItems = materials.filter(m => pmProjectIds.has(m.projectId));
    const stnTotal    = pmStnItems.length;
    const stnApproved = pmStnItems.filter(m => m.utilisedStatus==='pm_approved').length;
    const stnPending  = pmStnItems.filter(m => m.utilisedStatus==='submitted').length;
    const stnRate     = stnTotal ? Math.round(stnApproved/stnTotal*100) : 0;
    const completionRate = ps.length ? Math.round(completed/ps.length*100) : 0;
    return {
      name: pm, total: ps.length, completed, delayed, poValue, avgAging,
      cleanPct, stnTotal, stnApproved, stnPending, stnRate, completionRate,
      onTime: Math.round(100-(delayed/Math.max(ps.length,1)*100)),
    };
  }).filter(pm => pm.total > 0)
    .filter(pm => vendorFilter === 'All' || projects.some((p:any) => p.pm === pm.name && p.vendor === vendorFilter));

  const vendors = Array.from(new Set(projects.map((p:any)=>p.vendor).filter(Boolean))) as string[];
  const vendorData = vendors.map(v => {
    const ps = projects.filter((p:any)=>p.vendor===v);
    const completed       = ps.filter((p:any)=>(p as any).projectStatus==='WCC Raised').length;
    const delayed         = ps.filter((p:any)=>p.aging>90).length;
    const poValue         = ps.reduce((a,p:any)=>a+Number(p.poValue||0),0);
    const avgAging        = ps.length ? Math.round(ps.reduce((a,p:any)=>a+(p.aging||0),0)/ps.length) : 0;
    const cleanPct        = ps.length ? Math.round(ps.filter((p:any)=>p.aging<=90).length/ps.length*100) : 0;
    const completionRate  = ps.length ? Math.round(completed/ps.length*100) : 0;
    return {
      name: v.length>20?v.substring(0,18)+'…':v, fullName:v,
      total:ps.length, completed, delayed, poValue, avgAging, cleanPct, completionRate,
    };
  }).filter(v => v.total > 0);

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
        'Completed (WCC Raised)': p.completed, 'Completion Rate (%)': p.completionRate,
        'Delayed (>90d)': p.delayed, 'Avg Aging (days)': p.avgAging,
        'Clean Portfolio (%)': p.cleanPct,
        'PO Value (₹)': p.poValue,
        'STN Total': p.stnTotal, 'STN Approved': p.stnApproved, 'STN Approval Rate (%)': p.stnRate,
      }));
    } else if (active === 'vendor') {
      sheetName = 'Vendor Performance';
      rows = vendorData.map(v => ({
        'Vendor': v.fullName, 'Total Projects': v.total,
        'Completed': v.completed, 'Delayed': v.delayed,
        'PO Value': v.poValue,
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
          <select value={vendorFilter} onChange={e=>setVendorFilter(e.target.value)} style={selS}>
              <option>All</option>{Array.from(new Set((rawProjects as any[]).map((p:any)=>p.vendor).filter(Boolean))).sort().map((v:any)=><option key={v}>{v}</option>)}
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
                {/* Row 1 — Portfolio Overview */}
                <div style={{ fontSize:13, fontWeight:700, color:T.textMuted, textTransform:'uppercase' as const, letterSpacing:0.5, marginBottom:8 }}>Portfolio Overview</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:10, marginBottom:16 }}>
                  <KPI label="Total Projects"  value={execMetrics.total}       color={T.primary}  sub="All projects" />
                  <KPI label="PO Open"         value={execMetrics.poOpen}      color='#059669'    sub="Active POs" />
                  <KPI label="PO Closed"       value={execMetrics.poClosed}    color={T.danger}   sub="Closed POs" />
                  <KPI label="WCC Raised"      value={`${execMetrics.wccPct}%`} color={T.success} sub={`${execMetrics.wccRaised} of ${execMetrics.total} projects`} />
                  <KPI label="Avg Aging"       value={`${execMetrics.avgAging}d`} color={execMetrics.avgAging>90?T.danger:execMetrics.avgAging>60?T.warning:T.success} sub="Across all projects" />
                  <KPI label="Delayed (>90d)"  value={execMetrics.delayed}     color={T.warning}  sub="Projects overdue" />
                </div>

                {/* Row 2 — Financial Health */}
                <div style={{ fontSize:13, fontWeight:700, color:T.textMuted, textTransform:'uppercase' as const, letterSpacing:0.5, marginBottom:8 }}>Financial Health</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
                  <KPI label="Total PO Value"      value={fmtCr(totalPO)}              color={T.text}    sub="Across all projects" />
                  <KPI label="Total Billed"         value={fmt(totalBilled)}             color={T.info}    sub="Paid invoice amount" />
                  <KPI label="Total Paid (Expenses)"value={fmt(totalPaid)}              color={T.success} sub="Paid expense amount" />
                  <KPI label="Invoices Unpaid"      value={fmt(totalUnpaidInvoices)}    color={T.danger}  sub="Pending payment" />
                </div>

                {/* Row 3 — Alert Summary */}
                <div style={{ fontSize:13, fontWeight:700, color:T.textMuted, textTransform:'uppercase' as const, letterSpacing:0.5, marginBottom:8 }}>Alerts & Action Required</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
                  <div onClick={()=>setActiveWithUrl('pm')} style={{ ...card, cursor:'pointer', borderLeft:`4px solid ${T.danger}`, marginBottom:0, padding:'14px 16px' }}>
                    <div style={{ fontSize:11, color:T.textMuted, textTransform:'uppercase' as const, marginBottom:4 }}>⏱️ WCC Aging Alert</div>
                    <div style={{ fontSize:28, fontWeight:800, color:T.danger }}>{execMetrics.wccAlertCount}</div>
                    <div style={{ fontSize:11, color:T.textMuted }}>projects with expense &gt;15d, no WCC</div>
                  </div>
                  <div onClick={()=>setActiveWithUrl('pm')} style={{ ...card, cursor:'pointer', borderLeft:`4px solid #7C3AED`, marginBottom:0, padding:'14px 16px' }}>
                    <div style={{ fontSize:11, color:T.textMuted, textTransform:'uppercase' as const, marginBottom:4 }}>📉 Negative Projection</div>
                    <div style={{ fontSize:28, fontWeight:800, color:'#7C3AED' }}>{execMetrics.negProjCount}</div>
                    <div style={{ fontSize:11, color:T.textMuted }}>projects where billed &lt; paid expenses</div>
                  </div>
                  <div onClick={()=>setActiveWithUrl('pm')} style={{ ...card, cursor:'pointer', borderLeft:`4px solid ${T.warning}`, marginBottom:0, padding:'14px 16px' }}>
                    <div style={{ fontSize:11, color:T.textMuted, textTransform:'uppercase' as const, marginBottom:4 }}>🏁 Nearly Completing</div>
                    <div style={{ fontSize:28, fontWeight:800, color:T.warning }}>{execMetrics.nearlyCount}</div>
                    <div style={{ fontSize:11, color:T.textMuted }}>WC/Approval Pending with pending STN</div>
                  </div>
                </div>

                {/* Row 4 — STN/SRN + PTW Summary */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 }}>
                  <div style={card}>
                    <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:12 }}>📦 STN Summary</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                      {[
                        { label:'Total Items', value:execMetrics.stnTotal, color:T.primary },
                        { label:'Approved', value:execMetrics.stnApproved, color:T.success },
                        { label:'Pending Approval', value:execMetrics.stnPending, color:T.warning },
                        { label:'Not Submitted', value:execMetrics.stnNotSub, color:'#6B7280' },
                      ].map(m=>(
                        <div key={m.label} style={{ background:T.bg, borderRadius:8, padding:'10px 12px', textAlign:'center' as const }}>
                          <div style={{ fontSize:10, color:T.textMuted, fontWeight:600, marginBottom:4 }}>{m.label}</div>
                          <div style={{ fontSize:20, fontWeight:800, color:m.color }}>{m.value}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop:10, height:6, background:T.border, borderRadius:3 }}>
                      <div style={{ height:'100%', width:`${execMetrics.stnApprPct}%`, background:T.success, borderRadius:3 }} />
                    </div>
                    <div style={{ fontSize:11, color:T.textMuted, marginTop:4 }}>{execMetrics.stnApprPct}% approval rate</div>
                  </div>
                  <div style={card}>
                    <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:12 }}>🔐 PTW Coverage</div>
                    <div style={{ display:'flex', alignItems:'center', gap:20 }}>
                      <div style={{ textAlign:'center' as const }}>
                        <div style={{ fontSize:40, fontWeight:800, color:execMetrics.ptwCoverage>=50?T.success:T.warning }}>{execMetrics.ptwCoverage}%</div>
                        <div style={{ fontSize:12, color:T.textMuted }}>projects with PTW raised</div>
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ marginBottom:8 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}>
                            <span style={{ color:T.textMuted }}>PTW Raised</span>
                            <span style={{ fontWeight:700, color:T.success }}>{execMetrics.ptwRaised}</span>
                          </div>
                          <div style={{ height:6, background:T.border, borderRadius:3 }}>
                            <div style={{ height:'100%', width:`${execMetrics.ptwCoverage}%`, background:T.success, borderRadius:3 }} />
                          </div>
                        </div>
                        <div>
                          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}>
                            <span style={{ color:T.textMuted }}>Not Raised</span>
                            <span style={{ fontWeight:700, color:T.danger }}>{execMetrics.total-execMetrics.ptwRaised}</span>
                          </div>
                          <div style={{ height:6, background:T.border, borderRadius:3 }}>
                            <div style={{ height:'100%', width:`${100-execMetrics.ptwCoverage}%`, background:T.danger, borderRadius:3 }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row 5 — Charts */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                  <div style={card}>
                    <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:14 }}>📊 Project Status Distribution</div>
                    <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                      <ResponsiveContainer width={130} height={160}>
                        <PieChart><Pie data={statusData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" paddingAngle={3}>
                          {statusData.map((d,i)=><Cell key={i} fill={d.color} />)}
                        </Pie><Tooltip contentStyle={{ fontSize:12 }} /></PieChart>
                      </ResponsiveContainer>
                      <div style={{ flex:1, maxHeight:160, overflowY:'auto' as const }}>
                        {statusData.map((d,i)=>(
                          <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                            <div style={{ width:8, height:8, borderRadius:2, background:d.color, flexShrink:0 }} />
                            <span style={{ fontSize:11, color:T.textMuted, flex:1 }}>{d.name}</span>
                            <span style={{ fontSize:11, fontWeight:700 }}>{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={card}>
                    <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:14 }}>⏳ PO Aging Distribution</div>
                    <ResponsiveContainer width="100%" height={160}>
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
                    <tbody>{statusPageData.map((p:any,i:number)=>(
                      <tr key={p.id} style={{ background:i%2===0?'#fff':T.bg, borderBottom:`1px solid ${T.border}` }}>
                        {getVisibleCols('status').map(k=>(
                          <td key={k} style={{ padding:'9px 10px', fontSize:12,
                            whiteSpace: 'nowrap' as const,
                            color: k==='poNo'?T.primary:k==='aging'&&p.aging>90?T.danger:k==='aging'&&p.aging>60?'#D97706':T.text,
                            fontWeight: k==='poNo'||k==='poValue'||k==='billedAmt'?700:400 }}>
                            {k==='poNo' ? <span onClick={()=>router.push('/projects/'+p.id)} style={{ cursor:'pointer', color:T.primary, textDecoration:'underline', fontWeight:700 }}>{getCellValue(k,p)}</span> : getCellValue(k, p)}
                          </td>
                        ))}
                      </tr>
                    ))}</tbody>
                  </table>
                  {statusTotalPages > 1 && (
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 4px', borderTop:`1px solid ${T.border}`, marginTop:8 }}>
                      <span style={{ fontSize:12, color:T.textMuted }}>
                        Showing {Math.min((statusPage-1)*STATUS_PER_PAGE+1, statusFilteredProjects.length)}–{Math.min(statusPage*STATUS_PER_PAGE, statusFilteredProjects.length)} of {statusFilteredProjects.length} projects
                      </span>
                      <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                        <button onClick={()=>setStatusPage(p=>Math.max(1,p-1))} disabled={statusPage===1}
                          style={{ padding:'5px 12px', borderRadius:6, border:`1px solid ${T.border}`, background:'#fff', cursor:statusPage===1?'not-allowed':'pointer', opacity:statusPage===1?0.4:1, fontSize:12 }}>← Prev</button>
                        <span style={{ padding:'4px 10px', fontSize:12, color:T.text, fontWeight:600 }}>{statusPage} / {statusTotalPages}</span>
                        <button onClick={()=>setStatusPage(p=>Math.min(statusTotalPages,p+1))} disabled={statusPage>=statusTotalPages}
                          style={{ padding:'5px 12px', borderRadius:6, border:`1px solid ${T.border}`, background:'#fff', cursor:statusPage>=statusTotalPages?'not-allowed':'pointer', opacity:statusPage>=statusTotalPages?0.4:1, fontSize:12 }}>Next →</button>
                      </div>
                    </div>
                  )}
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

                {/* ── Project List below Financial by Region ── */}
                <div style={card}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:T.text }}>Project Financial Details</div>
                    <button onClick={()=>{
                      const rows = (rawProjects as any[]).map((p:any,i:number)=>{
                        const expPaid = expenses.filter((e:any)=>e.projectId===p.id&&e.status==='paid').reduce((a:number,e:any)=>a+Number(e.amount||0),0);
                        const billed  = invoices.filter((inv:any)=>inv.projectId===p.id&&(inv.invoiceStatus==='Approved'||inv.paymentStatus==='Paid')).reduce((a:number,inv:any)=>a+Number(inv.invoiceAmount||0),0);
                        const pl      = billed - expPaid;
                        return {
                          'S.No': i+1,
                          'Project No': p.id||'—',
                          'Project ID': p.projectId||'—',
                          'Indus ID': p.indusId||'—',
                          'Region': p.region||'—',
                          'PO Number': p.poNo||'—',
                          'Project Type': p.type||'—',
                          'Site Name': p.site||'—',
                          'Project Status': p.projectStatus||'—',
                          'PO Value (₹)': p.poValue||0,
                          'Expense Paid (₹)': expPaid,
                          'Billed Amount (₹)': billed,
                          'P/L Projection (₹)': pl,
                        };
                      });
                      const ws = XLSX.utils.json_to_sheet(rows);
                      ws['!cols'] = [{wch:6},{wch:14},{wch:16},{wch:14},{wch:16},{wch:16},{wch:20},{wch:20},{wch:24},{wch:14},{wch:16},{wch:16},{wch:16}];
                      // Force numeric cells to be numbers so pivot tables work correctly
                      const numericCols = ['PO Value (₹)', 'Expense Paid (₹)', 'Billed Amount (₹)', 'P/L Projection (₹)'];
                      const textCols = ['S.No', 'Project No', 'Project ID', 'Indus ID', 'Region', 'PO Number', 'Project Type', 'Site Name', 'Project Status'];
                      Object.keys(ws).filter(k => !k.startsWith('!')).forEach(cellAddr => {
                        const cell = ws[cellAddr];
                        if (!cell || cell.t === undefined) return;
                        // Get the header for this column
                        const col = cellAddr.replace(/[0-9]/g, '');
                        const headerCell = ws[col + '1'];
                        if (!headerCell) return;
                        const header = headerCell.v;
                        if (numericCols.includes(header)) {
                          const num = Number(cell.v);
                          if (!isNaN(num)) { cell.t = 'n'; cell.v = num; delete cell.w; }
                        } else if (textCols.includes(header)) {
                          cell.t = 's'; cell.v = String(cell.v ?? '');
                        }
                      });
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, 'Financial Details');
                      XLSX.writeFile(wb, `Venus_Financial_${new Date().toISOString().slice(0,10)}.xlsx`);
                    }}
                      style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 12px', fontSize:12, fontWeight:600,
                        color:'#166534', background:'#DCFCE7', border:'1px solid #86EFAC', borderRadius:7, cursor:'pointer' }}>
                      📥 Excel
                    </button>
                  </div>
                  <div style={{ overflowX:'auto' as const }}>
                    <table style={{ width:'100%', borderCollapse:'collapse' as const, fontSize:12 }}>
                      <thead>
                        <tr style={{ background:T.primaryLight }}>
                          {['#','Project No','Project ID','Indus ID','Region','PO Number','Project Type','Site Name','Project Status','PO Value','Expense Paid','Billed Amount','P/L Projection'].map((h,i)=>(
                            <th key={i} style={{ padding:'8px 10px', fontSize:10, fontWeight:700, textTransform:'uppercase' as const, color:T.primary, textAlign:i>=9?'right' as const:'left' as const, borderBottom:`2px solid ${T.primaryMid}`, whiteSpace:'nowrap' as const }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(rawProjects as any[]).slice((finPage-1)*FIN_PER_PAGE, finPage*FIN_PER_PAGE).map((p:any, idx:number)=>{ const absIdx = (finPage-1)*FIN_PER_PAGE + idx;
                          const expPaid = expenses.filter((e:any)=>e.projectId===p.id&&e.status==='paid').reduce((a:number,e:any)=>a+Number(e.amount||0),0);
                          const billed  = invoices.filter((inv:any)=>inv.projectId===p.id&&(inv.invoiceStatus==='Approved'||inv.paymentStatus==='Paid')).reduce((a:number,inv:any)=>a+Number(inv.invoiceAmount||0),0);
                          const pl      = billed - expPaid;
                          const plColor = pl >= 0 ? T.success : T.danger;
                          return (
                            <tr key={p.id} style={{ background:idx%2===0?'#fff':T.bg, borderBottom:`1px solid ${T.border}` }}>
                              <td style={{ padding:'8px 10px', color:T.textMuted }}>{absIdx+1}</td>
                              <td style={{ padding:'8px 10px', fontWeight:600, color:T.primary, fontSize:11 }}>{p.id||'—'}</td>
                              <td style={{ padding:'8px 10px', fontSize:11, color:T.textMuted }}>{p.projectId||'—'}</td>
                              <td style={{ padding:'8px 10px', fontSize:11, color:T.textMuted }}>{p.indusId||'—'}</td>
                              <td style={{ padding:'8px 10px', fontSize:11 }}>{p.region||'—'}</td>
                              <td style={{ padding:'8px 10px', fontWeight:600, color:T.primary }}>{p.poNo||'—'}</td>
                              <td style={{ padding:'8px 10px', fontSize:11 }}>{p.type||'—'}</td>
                              <td style={{ padding:'8px 10px' }}>{p.site||'—'}</td>
                              <td style={{ padding:'8px 10px' }}><span style={{ fontSize:10, fontWeight:600, color:'#6B7280', background:'#F3F4F6', padding:'2px 8px', borderRadius:10 }}>{p.projectStatus||'—'}</span></td>
                              <td style={{ padding:'8px 10px', textAlign:'right' as const, fontWeight:600 }}>{fmt(p.poValue||0)}</td>
                              <td style={{ padding:'8px 10px', textAlign:'right' as const, color:T.textMuted }}>{fmt(expPaid)}</td>
                              <td style={{ padding:'8px 10px', textAlign:'right' as const, color:T.info, fontWeight:600 }}>{fmt(billed)}</td>
                              <td style={{ padding:'8px 10px', textAlign:'right' as const, fontWeight:700, color:plColor }}>{pl>=0?'+':''}{fmt(pl)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination */}
                  {Math.ceil((rawProjects as any[]).length / FIN_PER_PAGE) > 1 && (
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 4px', borderTop:`1px solid ${T.border}`, marginTop:4 }}>
                      <div style={{ fontSize:12, color:'#6B7280' }}>
                        Showing {(finPage-1)*FIN_PER_PAGE+1}–{Math.min(finPage*FIN_PER_PAGE, (rawProjects as any[]).length)} of {(rawProjects as any[]).length} projects
                      </div>
                      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                        <button onClick={()=>setFinPage(n=>Math.max(1,n-1))} disabled={finPage===1}
                          style={{ padding:'5px 12px', borderRadius:6, border:`1px solid #E5E7EB`, background:'#fff', cursor:finPage===1?'not-allowed':'pointer', fontSize:12, opacity:finPage===1?0.5:1 }}>← Prev</button>
                        {Array.from({length:Math.ceil((rawProjects as any[]).length/FIN_PER_PAGE)},(_,i)=>i+1).filter(n=>n===1||n===Math.ceil((rawProjects as any[]).length/FIN_PER_PAGE)||Math.abs(n-finPage)<=1).reduce((acc:number[],n,i,arr)=>{ if(i>0&&n-arr[i-1]>1) acc.push(-1); acc.push(n); return acc; },[] as number[]).map((n,i)=>
                          n===-1 ? <span key={`e${i}`} style={{ fontSize:12, color:'#9CA3AF' }}>…</span>
                          : <button key={n} onClick={()=>setFinPage(n)}
                              style={{ padding:'5px 10px', borderRadius:6, border:`1px solid ${finPage===n?T.primary:'#E5E7EB'}`, background:finPage===n?T.primary:'#fff', color:finPage===n?'#fff':'#374151', cursor:'pointer', fontSize:12, fontWeight:finPage===n?700:400, minWidth:32 }}>{n}</button>
                        )}
                        <button onClick={()=>setFinPage(n=>Math.min(Math.ceil((rawProjects as any[]).length/FIN_PER_PAGE),n+1))} disabled={finPage>=Math.ceil((rawProjects as any[]).length/FIN_PER_PAGE)}
                          style={{ padding:'5px 12px', borderRadius:6, border:`1px solid #E5E7EB`, background:'#fff', cursor:finPage>=Math.ceil((rawProjects as any[]).length/FIN_PER_PAGE)?'not-allowed':'pointer', fontSize:12, opacity:finPage>=Math.ceil((rawProjects as any[]).length/FIN_PER_PAGE)?0.5:1 }}>Next →</button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* ── PM Performance Leaderboard ── */}
            {active==='pm' && (() => {
              const medal = (i:number) => i===0?'🥇':i===1?'🥈':i===2?'🥉':'';
              const RankRow = ({ rank, name, value, sub, color, bar, barColor }: any) => (
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:rank===0?'#FFFBEB':rank===1?'#F8FAFC':rank===2?'#FFF7ED':'#fff',
                  borderRadius:8, marginBottom:6, border:`1px solid ${rank===0?'#FDE68A':rank===1?'#E2E8F0':rank===2?'#FED7AA':T.border}` }}>
                  <div style={{ fontSize:18, width:28, textAlign:'center' as const }}>{medal(rank)||<span style={{ fontSize:13, color:T.textMuted, fontWeight:700 }}>#{rank+1}</span>}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:T.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{name}</div>
                    {sub && <div style={{ fontSize:11, color:T.textMuted }}>{sub}</div>}
                    {bar !== undefined && (
                      <div style={{ height:4, background:T.border, borderRadius:2, marginTop:4 }}>
                        <div style={{ height:'100%', width:`${Math.min(bar,100)}%`, background:barColor||T.primary, borderRadius:2, transition:'width 0.5s' }} />
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize:16, fontWeight:800, color:color||T.primary, whiteSpace:'nowrap' as const }}>{value}</div>
                </div>
              );
              return (
                <>
                <div style={card}>
                  <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:12 }}>👤 PM List — Click to view detailed report</div>
                  <div style={{ display:'flex', flexWrap:'wrap' as const, gap:8 }}>
                    {[...pmData].sort((a,b)=>b.total-a.total).map(pm => (
                      <button key={pm.name} onClick={()=>router.push(`/reports/pm/${encodeURIComponent(pm.name)}`)}
                        style={{ background:T.primaryLight, color:T.primary, border:`1px solid ${T.primaryMid}`,
                          borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:600, cursor:'pointer',
                          display:'flex', alignItems:'center', gap:6 }}>
                        👤 {pm.name}
                        <span style={{ fontSize:11, background:T.primary, color:'#fff', borderRadius:20, padding:'1px 7px' }}>{pm.total}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  {/* Card 1 — PO Value Champion */}
                  <div style={card}>
                    <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:12 }}>💰 PO Value Champion</div>
                    {[...pmData].sort((a,b)=>b.poValue-a.poValue).slice(0,5).map((pm,i)=>(
                      <RankRow key={pm.name} rank={i} name={pm.name}
                        value={fmt(pm.poValue)} sub={`${pm.total} projects`}
                        color='#7C3AED' bar={pm.poValue/Math.max(...pmData.map(p=>p.poValue))*100} barColor='#7C3AED' />
                    ))}
                  </div>
                  {/* Card 2 — Completion Race */}
                  <div style={card}>
                    <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:12 }}>🏁 Completion Race (WCC Raised)</div>
                    {[...pmData].sort((a,b)=>b.completionRate-a.completionRate).slice(0,5).map((pm,i)=>(
                      <RankRow key={pm.name} rank={i} name={pm.name}
                        value={`${pm.completionRate}%`} sub={`${pm.completed} of ${pm.total} completed`}
                        color={pm.completionRate>=50?T.success:T.warning} bar={pm.completionRate} barColor={pm.completionRate>=50?T.success:T.warning} />
                    ))}
                  </div>
                  {/* Card 3 — Speed Champion */}
                  <div style={card}>
                    <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:12 }}>⚡ Speed Champion <span style={{ fontSize:10, color:T.textMuted, fontWeight:400 }}>(lower avg aging = better)</span></div>
                    {[...pmData].sort((a,b)=>a.avgAging-b.avgAging).slice(0,5).map((pm,i)=>(
                      <RankRow key={pm.name} rank={i} name={pm.name}
                        value={`${pm.avgAging}d`} sub={`${pm.delayed} delayed (>90d)`}
                        color={pm.avgAging<=60?T.success:pm.avgAging<=90?T.warning:T.danger} />
                    ))}
                  </div>
                  {/* Card 4 — Clean Portfolio */}
                  <div style={card}>
                    <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:12 }}>🛡️ Clean Portfolio <span style={{ fontSize:10, color:T.textMuted, fontWeight:400 }}>(aging ≤90d)</span></div>
                    {[...pmData].sort((a,b)=>b.cleanPct-a.cleanPct).slice(0,5).map((pm,i)=>(
                      <RankRow key={pm.name} rank={i} name={pm.name}
                        value={`${pm.cleanPct}%`} sub={`${pm.total-pm.delayed} of ${pm.total} on track`}
                        color={pm.cleanPct>=80?T.success:pm.cleanPct>=60?T.warning:T.danger} bar={pm.cleanPct} barColor={pm.cleanPct>=80?T.success:pm.cleanPct>=60?T.warning:T.danger} />
                    ))}
                  </div>
                </div>
                </>
              );
            })()}

            {/* ── PM Performance Insight Cards ── */}
            {active==='pm' && (() => {
              const WCC_DONE = ['WCC Raised','Work Completed / Approval Pending',
                'Invoice Submitted – Payment Pending','Invoice Submitted – Payment Received',
                'Billing Shared','Already Billed with Another PO'];
              const today = new Date();

              // WCC Aging Alert
              const wccAlert = (projects as any[]).filter(p => {
                if (WCC_DONE.some(s => p.projectStatus === s)) return false;
                const projExp = expenses.filter((e:any) => e.projectId === p.id && e.paidAt && e.status === 'paid');
                if (!projExp.length) return false;
                const firstPaid = new Date(projExp.sort((a:any,b:any)=>new Date(a.paidAt as string).getTime()-new Date(b.paidAt as string).getTime())[0].paidAt as string);
                return Math.floor((today.getTime()-firstPaid.getTime())/(1000*60*60*24)) > 15;
              }).map(p => {
                const projExp = expenses.filter((e:any) => e.projectId === p.id && e.paidAt && e.status === 'paid');
                const firstPaid = new Date(projExp.sort((a:any,b:any)=>new Date(a.paidAt as string).getTime()-new Date(b.paidAt as string).getTime())[0].paidAt as string);
                const days = Math.floor((today.getTime()-firstPaid.getTime())/(1000*60*60*24));
                return { ...p, firstPaidDate: firstPaid.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}), days };
              }).sort((a:any,b:any)=>b.days-a.days);

              // Negative Projection
              const negProj = (projects as any[]).filter(p => {
                const billed = Number(p.billedAmount||0);
                const paid   = Number(p.paidAmount||0);
                return billed > 0 && (billed - paid) < 0;
              });

              // Nearly Completing — WC/Approval Pending with pending STN (using po_items)
              const nearlyComp = (projects as any[]).filter(p => p.projectStatus === 'Work Completed / Approval Pending').filter(p => {
                return poItems.some((m:any) => m.projectId === p.id && m.utilisedStatus !== 'pm_approved');
              });

              const thS: React.CSSProperties = { padding:'6px 8px', fontSize:10, fontWeight:700, textTransform:'uppercase' as const,
                color:T.primary, background:T.primaryLight, textAlign:'left' as const, borderBottom:`2px solid ${T.primaryMid}`, whiteSpace:'nowrap' as const };
              const tdS: React.CSSProperties = { padding:'6px 8px', fontSize:11, borderBottom:`1px solid ${T.border}` };

              const InsightPagination = ({ page, total, setPage }: { page:number; total:number; setPage:(n:number)=>void }) =>
                total > 1 ? (
                  <div style={{ display:'flex', justifyContent:'center', gap:6, marginTop:10 }}>
                    <button onClick={()=>setPage(Math.max(1,page-1))} disabled={page===1}
                      style={{ padding:'3px 10px', borderRadius:6, border:`1px solid ${T.border}`, background:page===1?T.bg:'#fff', cursor:page===1?'default':'pointer', fontSize:11 }}>← Prev</button>
                    <span style={{ fontSize:11, color:T.textMuted, padding:'3px 8px' }}>Page {page} of {total}</span>
                    <button onClick={()=>setPage(Math.min(total,page+1))} disabled={page===total}
                      style={{ padding:'3px 10px', borderRadius:6, border:`1px solid ${T.border}`, background:page===total?T.bg:'#fff', cursor:page===total?'default':'pointer', fontSize:11 }}>Next →</button>
                  </div>
                ) : null;

              return (
                <>
                {/* WCC Aging Alert */}
                <div style={{ ...card, marginTop:14 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:10 }}>
                    ⏱️ WCC Aging Alert <span style={{ fontSize:11, color:T.textMuted, fontWeight:400 }}>— paid expense &gt;15 days, WCC not raised ({wccAlert.length} projects)</span>
                  </div>
                  {wccAlert.length === 0 ? (
                    <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:8, padding:'10px 14px', color:'#166534', fontSize:12 }}>✅ No projects pending WCC beyond 15 days.</div>
                  ) : (
                    <>
                    <div style={{ overflowX:'auto' as const }}>
                      <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
                        <thead><tr>{['PM','PO Number','Indus ID','Region','Status','First Expense Paid','Days'].map((h,i)=><th key={i} style={thS}>{h}</th>)}</tr></thead>
                        <tbody>{wccAlert.slice((wccPage-1)*PM_INSIGHT_PER_PAGE, wccPage*PM_INSIGHT_PER_PAGE).map((p:any,i:number)=>(
                          <tr key={p.id} style={{ background:i%2===0?'#fff':T.bg }}>
                            <td style={{ ...tdS, fontWeight:600 }}>{p.pm||'—'}</td>
                            <td style={{ ...tdS, color:T.primary, fontWeight:600 }}>{p.poNo||'—'}</td>
                            <td style={{ ...tdS, color:T.textMuted }}>{p.indusId||'—'}</td>
                            <td style={tdS}>{p.region||'—'}</td>
                            <td style={tdS}><span style={{ fontSize:10, background:'#F3F4F6', padding:'2px 8px', borderRadius:10 }}>{p.projectStatus||'—'}</span></td>
                            <td style={tdS}>{p.firstPaidDate}</td>
                            <td style={{ ...tdS, fontWeight:700, color:p.days>30?T.danger:T.warning }}>{p.days}d</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                    <InsightPagination page={wccPage} total={Math.ceil(wccAlert.length/PM_INSIGHT_PER_PAGE)} setPage={setWccPage} />
                    </>
                  )}
                </div>

                {/* Negative Projection */}
                <div style={{ ...card, marginTop:14 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:10 }}>
                    📉 Negative Projection <span style={{ fontSize:11, color:T.textMuted, fontWeight:400 }}>— Billed &lt; Paid Expenses ({negProj.length} projects)</span>
                  </div>
                  {negProj.length === 0 ? (
                    <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:8, padding:'10px 14px', color:'#166534', fontSize:12 }}>✅ No projects with negative projection.</div>
                  ) : (
                    <>
                    <div style={{ overflowX:'auto' as const }}>
                      <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
                        <thead><tr>{['PM','PO Number','Indus ID','Region','Billed','Paid','Projection'].map((h,i)=><th key={i} style={thS}>{h}</th>)}</tr></thead>
                        <tbody>{negProj.slice((negPage-1)*PM_INSIGHT_PER_PAGE, negPage*PM_INSIGHT_PER_PAGE).map((p:any,i:number)=>{
                          const billed=Number(p.billedAmount||0); const paid=Number(p.paidAmount||0);
                          return (
                            <tr key={p.id} style={{ background:i%2===0?'#fff':T.bg }}>
                              <td style={{ ...tdS, fontWeight:600 }}>{p.pm||'—'}</td>
                              <td style={{ ...tdS, color:T.primary, fontWeight:600 }}>{p.poNo||'—'}</td>
                              <td style={{ ...tdS, color:T.textMuted }}>{p.indusId||'—'}</td>
                              <td style={tdS}>{p.region||'—'}</td>
                              <td style={tdS}>{fmt(billed)}</td>
                              <td style={tdS}>{fmt(paid)}</td>
                              <td style={{ ...tdS, fontWeight:700, color:T.danger }}>{fmt(billed-paid)}</td>
                            </tr>
                          );
                        })}</tbody>
                      </table>
                    </div>
                    <InsightPagination page={negPage} total={Math.ceil(negProj.length/PM_INSIGHT_PER_PAGE)} setPage={setNegPage} />
                    </>
                  )}
                </div>

                {/* Nearly Completing */}
                <div style={{ ...card, marginTop:14 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:10 }}>
                    🏁 Nearly Completing — Pending STN <span style={{ fontSize:11, color:T.textMuted, fontWeight:400 }}>({nearlyComp.length} projects with pending STN)</span>
                  </div>
                  {nearlyComp.length === 0 ? (
                    <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:8, padding:'10px 14px', color:'#166534', fontSize:12 }}>✅ No nearly completing projects have pending STN items.</div>
                  ) : (
                    <>
                    <div style={{ overflowX:'auto' as const }}>
                      <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
                        <thead><tr>{['PM','PO Number','Indus ID','Region','Pending STN Items'].map((h,i)=><th key={i} style={thS}>{h}</th>)}</tr></thead>
                        <tbody>{nearlyComp.slice((nearPage-1)*PM_INSIGHT_PER_PAGE, nearPage*PM_INSIGHT_PER_PAGE).map((p:any,i:number)=>{
                          const pendingStn = poItems.filter((m:any)=>m.projectId===p.id&&m.utilisedStatus!=='pm_approved').length;
                          return (
                            <tr key={p.id} style={{ background:i%2===0?'#fff':T.bg }}>
                              <td style={{ ...tdS, fontWeight:600 }}>{p.pm||'—'}</td>
                              <td style={{ ...tdS, color:T.primary, fontWeight:600 }}>{p.poNo||'—'}</td>
                              <td style={{ ...tdS, color:T.textMuted }}>{p.indusId||'—'}</td>
                              <td style={tdS}>{p.region||'—'}</td>
                              <td style={{ ...tdS, fontWeight:700, color:T.warning }}>{pendingStn}</td>
                            </tr>
                          );
                        })}</tbody>
                      </table>
                    </div>
                    <InsightPagination page={nearPage} total={Math.ceil(nearlyComp.length/PM_INSIGHT_PER_PAGE)} setPage={setNearPage} />
                    </>
                  )}
                </div>
                </>
              );
            })()}

            {/* ── Vendor Performance ── */}
            {active==='vendor' && (() => {
              const medal = (i:number) => i===0?'🥇':i===1?'🥈':i===2?'🥉':'';
              const RankRow = ({ rank, name, value, sub, color, bar, barColor }: any) => (
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                  background:rank===0?'#FFFBEB':rank===1?'#F8FAFC':rank===2?'#FFF7ED':'#fff',
                  borderRadius:8, marginBottom:6,
                  border:`1px solid ${rank===0?'#FDE68A':rank===1?'#E2E8F0':rank===2?'#FED7AA':T.border}` }}>
                  <div style={{ fontSize:18, width:28, textAlign:'center' as const }}>{medal(rank)||`#${rank+1}`}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:T.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{name}</div>
                    {sub && <div style={{ fontSize:11, color:T.textMuted }}>{sub}</div>}
                    {bar !== undefined && (
                      <div style={{ height:4, background:T.border, borderRadius:2, marginTop:4 }}>
                        <div style={{ height:'100%', width:`${Math.min(bar,100)}%`, background:barColor||T.primary, borderRadius:2 }} />
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize:16, fontWeight:800, color:color||T.primary, whiteSpace:'nowrap' as const }}>{value}</div>
                </div>
              );

              const today = new Date();
              const WCC_DONE = ['WCC Raised','Work Completed / Approval Pending',
                'Invoice Submitted – Payment Pending','Invoice Submitted – Payment Received',
                'Billing Shared','Already Billed with Another PO'];

              const vWccAlert = (projects as any[]).filter(p => {
                if (WCC_DONE.some(s => (p as any).projectStatus === s)) return false;
                const projExp = expenses.filter((e:any) => e.projectId===p.id && e.paidAt && e.status==='paid');
                if (!projExp.length) return false;
                const firstPaid = new Date(projExp.sort((a:any,b:any)=>new Date(a.paidAt as string).getTime()-new Date(b.paidAt as string).getTime())[0].paidAt as string);
                return Math.floor((today.getTime()-firstPaid.getTime())/(1000*60*60*24)) > 15;
              }).map(p => {
                const projExp = expenses.filter((e:any) => e.projectId===p.id && e.paidAt && e.status==='paid');
                const firstPaid = new Date(projExp.sort((a:any,b:any)=>new Date(a.paidAt as string).getTime()-new Date(b.paidAt as string).getTime())[0].paidAt as string);
                const days = Math.floor((today.getTime()-firstPaid.getTime())/(1000*60*60*24));
                return { ...p, firstPaidDate: firstPaid.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}), days };
              }).sort((a:any,b:any)=>b.days-a.days);

              const vNegProj = (projects as any[]).filter(p => {
                const billed=Number((p as any).billedAmount||0); const paid=Number((p as any).paidAmount||0);
                return billed>0 && (billed-paid)<0;
              });

              const vNearlyComp = (projects as any[]).filter(p => (p as any).projectStatus==='Work Completed / Approval Pending').filter(p =>
                poItems.some((m:any)=>m.projectId===p.id && m.utilisedStatus!=='pm_approved')
              );

              const thV: React.CSSProperties = { padding:'6px 8px', fontSize:10, fontWeight:700, textTransform:'uppercase' as const,
                color:T.primary, background:T.primaryLight, textAlign:'left' as const, borderBottom:`2px solid ${T.primaryMid}`, whiteSpace:'nowrap' as const };
              const tdV: React.CSSProperties = { padding:'6px 8px', fontSize:11, borderBottom:`1px solid ${T.border}` };

              const VPagination = ({ page, total, setPage }: { page:number; total:number; setPage:(n:number)=>void }) =>
                total > 1 ? (
                  <div style={{ display:'flex', justifyContent:'center', gap:6, marginTop:10 }}>
                    <button onClick={()=>setPage(Math.max(1,page-1))} disabled={page===1}
                      style={{ padding:'3px 10px', borderRadius:6, border:`1px solid ${T.border}`, background:page===1?T.bg:'#fff', cursor:page===1?'default':'pointer', fontSize:11 }}>← Prev</button>
                    <span style={{ fontSize:11, color:T.textMuted, padding:'3px 8px' }}>Page {page} of {total}</span>
                    <button onClick={()=>setPage(Math.min(total,page+1))} disabled={page===total}
                      style={{ padding:'3px 10px', borderRadius:6, border:`1px solid ${T.border}`, background:page===total?T.bg:'#fff', cursor:page===total?'default':'pointer', fontSize:11 }}>Next →</button>
                  </div>
                ) : null;

              return (
                <>
                {/* Vendor List buttons */}
                <div style={card}>
                  <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:12 }}>🏢 Vendor List — Click to view detailed report</div>
                  <div style={{ display:'flex', flexWrap:'wrap' as const, gap:8 }}>
                    {[...vendorData].sort((a,b)=>b.total-a.total).map(v => (
                      <button key={v.fullName} onClick={()=>router.push(`/reports/vendor/${encodeURIComponent(v.fullName)}`)}
                        style={{ background:T.primaryLight, color:T.primary, border:`1px solid ${T.primaryMid}`,
                          borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:600, cursor:'pointer',
                          display:'flex', alignItems:'center', gap:6 }}>
                        🏢 {v.fullName}
                        <span style={{ fontSize:11, background:T.primary, color:'#fff', borderRadius:20, padding:'1px 7px' }}>{v.total}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Leaderboard */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
                  <div style={card}>
                    <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:12 }}>💰 PO Value Champion</div>
                    {[...vendorData].sort((a,b)=>b.poValue-a.poValue).slice(0,5).map((v,i)=>(
                      <RankRow key={v.fullName} rank={i} name={v.fullName} value={fmt(v.poValue)}
                        sub={`${v.total} projects`} color='#7C3AED'
                        bar={v.poValue/Math.max(...vendorData.map(x=>x.poValue))*100} barColor='#7C3AED' />
                    ))}
                  </div>
                  <div style={card}>
                    <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:12 }}>🏁 Completion Race (WCC Raised)</div>
                    {[...vendorData].sort((a,b)=>b.completionRate-a.completionRate).slice(0,5).map((v,i)=>(
                      <RankRow key={v.fullName} rank={i} name={v.fullName} value={`${v.completionRate}%`}
                        sub={`${v.completed} of ${v.total} completed`}
                        color={v.completionRate>=50?T.success:T.warning}
                        bar={v.completionRate} barColor={v.completionRate>=50?T.success:T.warning} />
                    ))}
                  </div>
                  <div style={card}>
                    <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:12 }}>⚡ Speed Champion <span style={{ fontSize:10, color:T.textMuted, fontWeight:400 }}>(lower avg aging = better)</span></div>
                    {[...vendorData].sort((a,b)=>a.avgAging-b.avgAging).slice(0,5).map((v,i)=>(
                      <RankRow key={v.fullName} rank={i} name={v.fullName} value={`${v.avgAging}d`}
                        sub={`${v.delayed} delayed (>90d)`}
                        color={v.avgAging<=60?T.success:v.avgAging<=90?T.warning:T.danger} />
                    ))}
                  </div>
                  <div style={card}>
                    <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:12 }}>🛡️ Clean Portfolio <span style={{ fontSize:10, color:T.textMuted, fontWeight:400 }}>(aging ≤90d)</span></div>
                    {[...vendorData].sort((a,b)=>b.cleanPct-a.cleanPct).slice(0,5).map((v,i)=>(
                      <RankRow key={v.fullName} rank={i} name={v.fullName} value={`${v.cleanPct}%`}
                        sub={`${v.total-v.delayed} of ${v.total} on track`}
                        color={v.cleanPct>=80?T.success:v.cleanPct>=60?T.warning:T.danger}
                        bar={v.cleanPct} barColor={v.cleanPct>=80?T.success:v.cleanPct>=60?T.warning:T.danger} />
                    ))}
                  </div>
                </div>

                {/* WCC Aging Alert */}
                <div style={{ ...card, marginTop:14 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:10 }}>
                    ⏱️ WCC Aging Alert <span style={{ fontSize:11, color:T.textMuted, fontWeight:400 }}>({vWccAlert.length} projects)</span>
                  </div>
                  {vWccAlert.length === 0 ? (
                    <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:8, padding:'10px 14px', color:'#166534', fontSize:12 }}>✅ No projects pending WCC beyond 15 days.</div>
                  ) : (
                    <>
                    <div style={{ overflowX:'auto' as const }}>
                      <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
                        <thead><tr>{['Vendor','PM','PO Number','Indus ID','Region','Status','First Expense Paid','Days'].map((h,i)=><th key={i} style={thV}>{h}</th>)}</tr></thead>
                        <tbody>{vWccAlert.slice((vWccPage-1)*10,vWccPage*10).map((p:any,i:number)=>(
                          <tr key={p.id} style={{ background:i%2===0?'#fff':T.bg }}>
                            <td style={{ ...tdV, fontWeight:600 }}>{(p as any).vendor||'—'}</td>
                            <td style={tdV}>{(p as any).pm||'—'}</td>
                            <td style={{ ...tdV, color:T.primary, fontWeight:600 }}>{(p as any).poNo||'—'}</td>
                            <td style={{ ...tdV, color:T.textMuted }}>{(p as any).indusId||'—'}</td>
                            <td style={tdV}>{(p as any).region||'—'}</td>
                            <td style={tdV}><span style={{ fontSize:10, background:'#F3F4F6', padding:'2px 8px', borderRadius:10 }}>{(p as any).projectStatus||'—'}</span></td>
                            <td style={tdV}>{(p as any).firstPaidDate}</td>
                            <td style={{ ...tdV, fontWeight:700, color:(p as any).days>30?T.danger:T.warning }}>{(p as any).days}d</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                    <VPagination page={vWccPage} total={Math.ceil(vWccAlert.length/10)} setPage={setVWccPage} />
                    </>
                  )}
                </div>

                {/* Negative Projection */}
                <div style={{ ...card, marginTop:14 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:10 }}>
                    📉 Negative Projection <span style={{ fontSize:11, color:T.textMuted, fontWeight:400 }}>({vNegProj.length} projects)</span>
                  </div>
                  {vNegProj.length === 0 ? (
                    <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:8, padding:'10px 14px', color:'#166534', fontSize:12 }}>✅ No projects with negative projection.</div>
                  ) : (
                    <>
                    <div style={{ overflowX:'auto' as const }}>
                      <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
                        <thead><tr>{['Vendor','PM','PO Number','Indus ID','Region','Billed','Paid','Projection'].map((h,i)=><th key={i} style={thV}>{h}</th>)}</tr></thead>
                        <tbody>{vNegProj.slice((vNegPage-1)*10,vNegPage*10).map((p:any,i:number)=>{
                          const billed=Number((p as any).billedAmount||0); const paid=Number((p as any).paidAmount||0);
                          return (
                            <tr key={(p as any).id} style={{ background:i%2===0?'#fff':T.bg }}>
                              <td style={{ ...tdV, fontWeight:600 }}>{(p as any).vendor||'—'}</td>
                              <td style={tdV}>{(p as any).pm||'—'}</td>
                              <td style={{ ...tdV, color:T.primary, fontWeight:600 }}>{(p as any).poNo||'—'}</td>
                              <td style={{ ...tdV, color:T.textMuted }}>{(p as any).indusId||'—'}</td>
                              <td style={tdV}>{(p as any).region||'—'}</td>
                              <td style={tdV}>{fmt(billed)}</td>
                              <td style={tdV}>{fmt(paid)}</td>
                              <td style={{ ...tdV, fontWeight:700, color:T.danger }}>{fmt(billed-paid)}</td>
                            </tr>
                          );
                        })}</tbody>
                      </table>
                    </div>
                    <VPagination page={vNegPage} total={Math.ceil(vNegProj.length/10)} setPage={setVNegPage} />
                    </>
                  )}
                </div>

                {/* Nearly Completing */}
                <div style={{ ...card, marginTop:14 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:10 }}>
                    🏁 Nearly Completing — Pending STN <span style={{ fontSize:11, color:T.textMuted, fontWeight:400 }}>({vNearlyComp.length} projects)</span>
                  </div>
                  {vNearlyComp.length === 0 ? (
                    <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:8, padding:'10px 14px', color:'#166534', fontSize:12 }}>✅ No nearly completing projects have pending STN items.</div>
                  ) : (
                    <>
                    <div style={{ overflowX:'auto' as const }}>
                      <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
                        <thead><tr>{['Vendor','PM','PO Number','Indus ID','Region','Pending STN'].map((h,i)=><th key={i} style={thV}>{h}</th>)}</tr></thead>
                        <tbody>{vNearlyComp.slice((vNearPage-1)*10,vNearPage*10).map((p:any,i:number)=>{
                          const pendingStn=poItems.filter((m:any)=>m.projectId===p.id&&m.utilisedStatus!=='pm_approved').length;
                          return (
                            <tr key={(p as any).id} style={{ background:i%2===0?'#fff':T.bg }}>
                              <td style={{ ...tdV, fontWeight:600 }}>{(p as any).vendor||'—'}</td>
                              <td style={tdV}>{(p as any).pm||'—'}</td>
                              <td style={{ ...tdV, color:T.primary, fontWeight:600 }}>{(p as any).poNo||'—'}</td>
                              <td style={{ ...tdV, color:T.textMuted }}>{(p as any).indusId||'—'}</td>
                              <td style={tdV}>{(p as any).region||'—'}</td>
                              <td style={{ ...tdV, fontWeight:700, color:T.warning }}>{pendingStn}</td>
                            </tr>
                          );
                        })}</tbody>
                      </table>
                    </div>
                    <VPagination page={vNearPage} total={Math.ceil(vNearlyComp.length/10)} setPage={setVNearPage} />
                    </>
                  )}
                </div>
                </>
              );
            })()}

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
