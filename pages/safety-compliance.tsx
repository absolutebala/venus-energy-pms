import React, { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/Icon';
import Layout from '@/components/Layout';
import Toast from '@/components/Toast';
import { useAuth } from '@/context/AuthContext';
import { useProjects } from '@/context/ProjectContext';
import { createClient } from '@/lib/supabase';
import { T, card, btnPrimary, inputStyle } from '@/lib/theme';

const supabase = createClient();

interface SafetyCheck {
  id: string; projectId: string; supervisor: string; checkDate: string;
  score: number; totalItems: number; compliant: number; nonCompliant: number;
  expired: number; status: string; nextReview: string; remarks: string; createdBy: string;
}

function mapRow(row: any): SafetyCheck {
  return {
    id:           row.id            ?? '',
    projectId:    row.project_id    ?? '',
    supervisor:   row.supervisor    ?? '',
    checkDate:    row.check_date    ?? '',
    score:        Number(row.score        ?? 0),
    totalItems:   Number(row.total_items  ?? 12),
    compliant:    Number(row.compliant    ?? 0),
    nonCompliant: Number(row.non_compliant ?? 0),
    expired:      Number(row.expired      ?? 0),
    status:       row.status        ?? 'Compliant',
    nextReview:   row.next_review   ?? '',
    remarks:      row.remarks       ?? '',
    createdBy:    row.created_by    ?? '',
  };
}

const fmtDate = (d: string) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); }
  catch { return d; }
};

const STATUS_CFG: Record<string,{color:string;bg:string}> = {
  Compliant:    { color:T.success, bg:T.successBg },
  'Non-Compliant': { color:T.danger,  bg:'#FEF2F2'   },
  Expired:      { color:T.warning, bg:'#FFFBEB'   },
};

const CHECKLIST_ITEMS = [
  'STAC Certificate','PTW (Permit to Work)','Safety Induction','PPE Availability',
  'Fire Extinguisher','Electrical Safety','Scaffolding Safety','First Aid Kit',
  'Safety Signage','Housekeeping','Working at Height','Gas Cutting Safety',
];

export default function SafetyCompliancePage() {
  const { profile, can, loading: authLoading } = useAuth();
  const { projects } = useProjects();
  const [checks,   setChecks]   = useState<SafetyCheck[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [focused,  setFocused]  = useState(false);
  const [selected, setSelected] = useState<SafetyCheck|null>(null);
  const [adding,   setAdding]   = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState<any>(null);
  const [newCheck, setNewCheck] = useState({
    projectId:'', supervisor:'', checkDate:'', score:'',
    compliant:'', nonCompliant:'', expired:'', status:'Compliant', remarks:'',
  });

  const canAdd = !authLoading && can('safety_compliance','create');

  const fetchChecks = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('safety_checks').select('*').order('check_date',{ascending:false});
    if (!error && data) {
      const mapped = data.map(mapRow);
      setChecks(mapped);
      if (mapped.length > 0 && !selected) setSelected(mapped[0]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchChecks(); }, [fetchChecks]);
  useEffect(() => {
    const onFocus = () => fetchChecks();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchChecks]);

  const getProjectSite = (id: string) => (projects as any[]).find(p=>p.id===id)?.site || id;

  const filtered = checks.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return c.id.toLowerCase().includes(s) ||
           c.projectId.toLowerCase().includes(s) ||
           getProjectSite(c.projectId).toLowerCase().includes(s) ||
           c.supervisor.toLowerCase().includes(s);
  });

  const saveCheck = async () => {
    if (!newCheck.projectId || !newCheck.checkDate || !newCheck.score) {
      setToast({ msg:'Please fill Project, Date and Score', type:'error' }); return;
    }
    setSaving(true);
    const total = 12;
    const comp  = Number(newCheck.compliant)||0;
    const nc    = Number(newCheck.nonCompliant)||0;
    const exp   = Number(newCheck.expired)||0;
    const nextR = new Date(newCheck.checkDate);
    nextR.setDate(nextR.getDate()+7);
    const nextReview = nextR.toISOString().split('T')[0];
    const newId = 'SC-' + new Date().getFullYear() + '-' + String(checks.length+46).padStart(3,'0');
    try {
      const { data, error } = await supabase.from('safety_checks').insert({
        id: newId, project_id: newCheck.projectId, supervisor: newCheck.supervisor,
        check_date: newCheck.checkDate, score: Number(newCheck.score),
        total_items: total, compliant: comp, non_compliant: nc, expired: exp,
        status: newCheck.status, next_review: nextReview, remarks: newCheck.remarks,
        created_by: profile?.full_name||'',
      }).select().single();
      if (error) throw new Error(error.message);
      const newEntry = mapRow(data);
      setChecks(prev => [newEntry, ...prev]);
      setSelected(newEntry);
      setAdding(false);
      setNewCheck({ projectId:'', supervisor:'', checkDate:'', score:'', compliant:'', nonCompliant:'', expired:'', status:'Compliant', remarks:'' });
      setToast({ msg:'✅ Safety check recorded', type:'success' });
    } catch(err:any) {
      setToast({ msg:'❌ '+err.message, type:'error' });
    } finally { setSaving(false); }
  };

  const thS: React.CSSProperties = { padding:'9px 12px', fontSize:10, fontWeight:700, textTransform:'uppercase',
    color:T.primary, background:T.primaryLight, textAlign:'left' as const, borderBottom:`2px solid ${T.primaryMid}` };
  const tdS: React.CSSProperties = { padding:'10px 12px', fontSize:13, borderBottom:`1px solid ${T.border}`, verticalAlign:'middle' as const };

  return (
    <Layout>
      <div className="fade-in">
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <div style={{ fontSize:22, fontWeight:800, color:T.text }}>Safety Compliance</div>
            <div style={{ fontSize:13, color:T.textMuted, marginTop:2 }}>
              {loading ? 'Loading...' : `${checks.length} safety checks · Live from Supabase`}
            </div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
              placeholder="Search project, site, supervisor…"
              style={{ ...inputStyle(focused), width:240 }} />
            {canAdd && (
              <button onClick={()=>setAdding(true)} style={{ ...btnPrimary, fontSize:13 }}>+ New Check</button>
            )}
          </div>
        </div>

        {/* Summary cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
          {[
            { label:'Total Checks',   value:checks.length,                                         color:T.primary, icon:'shield' },
            { label:'Compliant',      value:checks.filter(c=>c.status==='Compliant').length,        color:T.success, icon:'check' },
            { label:'Non-Compliant',  value:checks.filter(c=>c.status==='Non-Compliant').length,    color:T.danger,  icon:'warning' },
            { label:'Avg Score',      value:`${Math.round(checks.reduce((a,c)=>a+c.score,0)/(checks.length||1))}%`, color:T.info, icon:'reports' },
          ].map((s,i)=>(
            <div key={i} style={{ ...card, position:'relative', overflow:'hidden', padding:'16px 18px' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:s.color }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:11, color:T.textMuted, textTransform:'uppercase', marginBottom:4 }}>{s.label}</div>
                  <div style={{ fontSize:26, fontWeight:700, color:s.color }}>{s.value}</div>
                </div>
                <div style={{ fontSize:22 }}>{s.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Add form */}
        {adding && canAdd && (
          <div style={{ ...card, marginBottom:16, border:`1.5px solid ${T.primaryMid}`, background:T.primaryLight }}>
            <div style={{ fontSize:14, fontWeight:700, color:T.primary, marginBottom:14 }}>New Safety Check</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>Project *</label>
                <select value={newCheck.projectId} onChange={e=>setNewCheck(p=>({...p,projectId:e.target.value}))}
                  style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'7px 10px', fontSize:13, width:'100%', outline:'none', background:'#fff' }}>
                  <option value="">— Select Project —</option>
                  {(projects as any[]).map(p=>(
                    <option key={p.id} value={p.id}>{p.id} — {p.site}</option>
                  ))}
                </select>
              </div>
              {([['Supervisor','supervisor','text'],['Check Date *','checkDate','date'],
                 ['Score (%) *','score','number'],['Compliant Items','compliant','number'],
                 ['Non-Compliant','nonCompliant','number'],['Expired Items','expired','number']] as [string,string,string][]).map(([l,f,t])=>(
                <div key={f}>
                  <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>{l}</label>
                  <input type={t} value={(newCheck as any)[f]} onChange={e=>setNewCheck(p=>({...p,[f]:e.target.value}))}
                    style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'7px 10px', fontSize:13, width:'100%', boxSizing:'border-box' as const, outline:'none', background:'#fff' }} />
                </div>
              ))}
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:4, textTransform:'uppercase' as const }}>Status</label>
                <select value={newCheck.status} onChange={e=>setNewCheck(p=>({...p,status:e.target.value}))}
                  style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:'7px 10px', fontSize:13, width:'100%', outline:'none', background:'#fff' }}>
                  {['Compliant','Non-Compliant','Expired'].map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={saveCheck} disabled={saving||!newCheck.projectId||!newCheck.checkDate||!newCheck.score}
                style={{ ...btnPrimary, opacity:saving?0.5:1 }}>{saving?'Saving…':'💾 Save Check'}</button>
              <button onClick={()=>setAdding(false)}
                style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:8, padding:'8px 18px', color:T.text, cursor:'pointer', fontSize:13 }}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          {/* Checks list */}
          <div style={card}>
            <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:14 }}>
              Safety Checks <span style={{ fontSize:12, fontWeight:400, color:T.textMuted }}>({filtered.length})</span>
            </div>
            {loading && <div style={{ padding:20, textAlign:'center' as const, color:T.textMuted }}>Loading...</div>}
            {!loading && filtered.length === 0 && (
              <div style={{ padding:20, textAlign:'center' as const, color:T.textDim }}>No safety checks found</div>
            )}
            {filtered.map(c => {
              const cfg = STATUS_CFG[c.status] || STATUS_CFG.Compliant;
              const isSelected = selected?.id === c.id;
              return (
                <div key={c.id} onClick={()=>setSelected(c)}
                  style={{ padding:'12px 14px', borderRadius:10, marginBottom:8, cursor:'pointer',
                    border:`1.5px solid ${isSelected?T.primary:T.border}`,
                    background:isSelected?T.primaryLight:'#fff' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                    <div>
                      <div style={{ fontWeight:700, color:T.primary, fontSize:12 }}>{c.id}</div>
                      <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{getProjectSite(c.projectId)}</div>
                      <div style={{ fontSize:11, color:T.textMuted }}>{c.projectId} · {c.supervisor}</div>
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, color:cfg.color, background:cfg.bg,
                      padding:'2px 8px', borderRadius:20, whiteSpace:'nowrap' as const }}>{c.status}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:T.textMuted }}>
                    <span>📅 {fmtDate(c.checkDate)}</span>
                    <span>Score: <strong style={{ color:c.score>=80?T.success:c.score>=60?T.warning:T.danger }}>{c.score}%</strong></span>
                    <span>Next: {fmtDate(c.nextReview)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail panel */}
          {selected && (
            <div>
              <div style={{ ...card, marginBottom:14 }}>
                <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:14 }}>
                  {selected.id} — {getProjectSite(selected.projectId)}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
                  {[
                    ['Project',    selected.projectId],
                    ['Site',       getProjectSite(selected.projectId)],
                    ['Supervisor', selected.supervisor],
                    ['Check Date', fmtDate(selected.checkDate)],
                    ['Next Review',fmtDate(selected.nextReview)],
                    ['Status',     selected.status],
                  ].map(([l,v])=>(
                    <div key={l}>
                      <div style={{ fontSize:10, color:T.textMuted, fontWeight:600, textTransform:'uppercase', marginBottom:3 }}>{l}</div>
                      <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                  {[
                    { label:'Score',          value:`${selected.score}%`,  color:selected.score>=80?T.success:selected.score>=60?T.warning:T.danger },
                    { label:'Compliant',       value:selected.compliant,    color:T.success },
                    { label:'Non-Compliant',   value:selected.nonCompliant, color:T.danger  },
                    { label:'Expired',         value:selected.expired,      color:T.warning },
                  ].map(s=>(
                    <div key={s.label} style={{ background:T.bg, borderRadius:8, padding:'10px 12px', textAlign:'center' as const }}>
                      <div style={{ fontSize:10, color:T.textMuted, marginBottom:3, textTransform:'uppercase' as const }}>{s.label}</div>
                      <div style={{ fontSize:20, fontWeight:800, color:s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Score bar */}
              <div style={{ ...card, marginBottom:14 }}>
                <div style={{ fontSize:13, fontWeight:600, color:T.text, marginBottom:10 }}>Compliance Score</div>
                <div style={{ height:12, background:T.border, borderRadius:6, marginBottom:8 }}>
                  <div style={{ height:'100%', width:`${selected.score}%`,
                    background:selected.score>=80?T.success:selected.score>=60?T.warning:T.danger,
                    borderRadius:6, transition:'width 0.5s' }} />
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:T.textMuted }}>
                  <span>0%</span>
                  <span style={{ fontWeight:700, color:T.primary }}>{selected.score}% compliant</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Checklist */}
              <div style={card}>
                <div style={{ fontSize:13, fontWeight:600, color:T.text, marginBottom:12 }}>Standard Checklist Items</div>
                {CHECKLIST_ITEMS.map((item, i) => {
                  const isCompliant = i < selected.compliant;
                  const isExpired   = i >= selected.compliant + selected.nonCompliant && i < selected.compliant + selected.nonCompliant + selected.expired;
                  const itemStatus  = isExpired ? 'Expired' : isCompliant ? 'Compliant' : 'Non-Compliant';
                  const cfg = STATUS_CFG[itemStatus];
                  return (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                      padding:'8px 0', borderBottom:i<CHECKLIST_ITEMS.length-1?`1px solid ${T.border}`:'none' }}>
                      <div style={{ fontSize:12, color:T.text }}>{item}</div>
                      <span style={{ fontSize:11, fontWeight:600, color:cfg.color, background:cfg.bg,
                        padding:'2px 8px', borderRadius:20, whiteSpace:'nowrap' as const }}>{itemStatus}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
    </Layout>
  );
}
