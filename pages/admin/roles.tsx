import React, { useState } from 'react';
import Layout from '@/components/Layout';
import Toast from '@/components/Toast';
import { T, card, btnPrimary } from '@/lib/theme';
import { DEFAULT_PERMISSIONS } from '@/lib/permissions';
import { UserRole } from '@/types';

const ROLES: { key: UserRole; label: string; icon: string; desc: string }[] = [
  { key:'super_admin',    label:'Super Admin',    icon:'👑', desc:'Full access to all modules and settings'      },
  { key:'region_manager', label:'Region Manager', icon:'📍', desc:'Manages projects and PMs in their region'     },
  { key:'project_manager',label:'Project Manager',icon:'📋', desc:'Handles project execution and vendor assignment'},
  { key:'site_engineer',  label:'Site Engineer',  icon:'👷', desc:'Views projects in their region'               },
  { key:'accounting_team',label:'Accounting',     icon:'💳', desc:'Billing, STN/SRN reconciliation, reports'     },
  { key:'vendor',         label:'Vendor',         icon:'🏢', desc:'Uploads work documents and material utilisation'},
  { key:'viewer',         label:'Viewer',         icon:'👁',  desc:'Read-only access to all project data'        },
];

const MODULES = [
  { key:'dashboard',    label:'Dashboard',       icon:'▦',  desc:'Role-specific dashboard and KPIs'            },
  { key:'projects',     label:'Projects',        icon:'📁', desc:'Project list, details, edit, vendor assign'  },
  { key:'vendors',      label:'Vendors',         icon:'🏢', desc:'Vendor management, invite, activate'         },
  { key:'srn_return',   label:'STN / SRN Status',icon:'📦', desc:'Material tracking, utilisation, returns'     },
  { key:'site_expenses',label:'Site Expenses',   icon:'💰', desc:'Expense logging and approval'                },
  { key:'ptw',          label:'PTW Management',  icon:'🔑', desc:'Permit to Work tickets, supervisor, dates'   },
  { key:'reports',      label:'Reports',         icon:'📊', desc:'All management and performance reports'      },
];

type Action = 'can_create'|'can_read'|'can_edit'|'can_delete';
const ACTIONS: { key: Action; label: string; short: string }[] = [
  { key:'can_read',   label:'Read',   short:'R' },
  { key:'can_create', label:'Create', short:'C' },
  { key:'can_edit',   label:'Edit',   short:'E' },
  { key:'can_delete', label:'Delete', short:'D' },
];

const ACTION_COLOR: Record<Action,{on:string;bg:string}> = {
  can_read:   { on:'#2563EB', bg:'#EFF6FF' },
  can_create: { on:'#16A34A', bg:'#F0FDF4' },
  can_edit:   { on:'#D97706', bg:'#FFFBEB' },
  can_delete: { on:'#DC2626', bg:'#FEF2F2' },
};

export default function RolesPage() {
  const [perms, setPerms]     = useState(() => JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS)));
  const [activeRole, setRole] = useState<UserRole>('super_admin');
  const [saving,   setSaving] = useState(false);
  const [toast, setToast]     = useState<{msg:string;type:'success'|'error'|'info'}|null>(null);

  const toggle = (module: string, action: Action) => {
    if (activeRole === 'super_admin') return; // SA always full
    setPerms((p:any) => ({
      ...p,
      [activeRole]: {
        ...p[activeRole],
        [module]: { ...p[activeRole][module], [action]: !p[activeRole][module]?.[action] }
      }
    }));
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => { setSaving(false); setToast({ msg:'Permissions saved!', type:'success' }); }, 600);
  };

  const currentRole = ROLES.find(r=>r.key===activeRole)!;

  return (
    <Layout>
      <div className="fade-in">
        <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:16 }}>
          {/* Role list */}
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:12 }}>Select Role</div>
            {ROLES.map(r=>(
              <div key={r.key} onClick={()=>setRole(r.key)}
                style={{ padding:'12px 14px', borderRadius:10, marginBottom:8, cursor:'pointer', border:`1.5px solid ${activeRole===r.key?T.primary:T.border}`, background:activeRole===r.key?T.primaryLight:T.surface, transition:'all 0.15s' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                  <span style={{ fontSize:16 }}>{r.icon}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:activeRole===r.key?T.primary:T.text }}>{r.label}</span>
                </div>
                <div style={{ fontSize:11, color:T.textMuted, lineHeight:1.4 }}>{r.desc}</div>
              </div>
            ))}
          </div>

          {/* Permission matrix */}
          <div>
            <div style={{ ...card, marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:16, fontWeight:700, color:T.text }}>{currentRole.icon} {currentRole.label} Permissions</div>
                  <div style={{ fontSize:12, color:T.textMuted, marginTop:3 }}>{currentRole.desc}</div>
                </div>
                {activeRole !== 'super_admin' && (
                  <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, opacity:saving?0.8:1 }}>
                    {saving?'Saving…':'💾 Save Permissions'}
                  </button>
                )}
              </div>

              {activeRole === 'super_admin' && (
                <div style={{ background:T.primaryLight, border:`1px solid ${T.primaryMid}`, borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13, color:T.primary, fontWeight:500 }}>
                  👑 Super Admin has full access to all modules and cannot be restricted.
                </div>
              )}

              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:T.bg }}>
                    <th style={{ padding:'10px 14px', fontSize:12, fontWeight:700, color:T.textMuted, textAlign:'left', width:'40%' }}>Module</th>
                    {ACTIONS.map(a=>(
                      <th key={a.key} style={{ padding:'10px 14px', fontSize:12, fontWeight:700, color:ACTION_COLOR[a.key].on, textAlign:'center' }}>{a.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map((mod,i)=>{
                    const modPerms = perms[activeRole]?.[mod.key] || {};
                    return (
                      <tr key={mod.key} style={{ borderTop:`1px solid ${T.border}`, background:i%2===0?'#fff':T.bg }}>
                        <td style={{ padding:'12px 14px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ fontSize:16 }}>{mod.icon}</span>
                            <div>
                              <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{mod.label}</div>
                              <div style={{ fontSize:11, color:T.textMuted }}>{mod.desc}</div>
                            </div>
                          </div>
                        </td>
                        {ACTIONS.map(action=>{
                          const enabled = activeRole==='super_admin' ? true : !!modPerms[action.key];
                          const c = ACTION_COLOR[action.key];
                          return (
                            <td key={action.key} style={{ padding:'12px 14px', textAlign:'center' }}>
                              <div onClick={()=>toggle(mod.key,action.key)}
                                style={{ width:32, height:32, borderRadius:8, border:`2px solid ${enabled?c.on:T.border}`, background:enabled?c.bg:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:activeRole==='super_admin'?'not-allowed':'pointer', margin:'0 auto', transition:'all 0.15s' }}>
                                {enabled && <span style={{ fontSize:14, fontWeight:700, color:c.on }}>✓</span>}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div style={{ ...card }}>
              <div style={{ fontSize:13, fontWeight:600, color:T.text, marginBottom:12 }}>Permission Legend</div>
              <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                {ACTIONS.map(a=>(
                  <div key={a.key} style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:24, height:24, borderRadius:6, background:ACTION_COLOR[a.key].bg, border:`2px solid ${ACTION_COLOR[a.key].on}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <span style={{ fontSize:11, fontWeight:700, color:ACTION_COLOR[a.key].on }}>✓</span>
                    </div>
                    <span style={{ fontSize:13, color:T.text }}>{a.label} — {a.key==='can_read'?'View data':a.key==='can_create'?'Add new records':a.key==='can_edit'?'Modify existing':'Remove records'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
    </Layout>
  );
}
