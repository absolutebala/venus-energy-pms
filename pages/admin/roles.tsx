import React, { useState } from 'react';
import Layout from '@/components/Layout';
import Toast from '@/components/Toast';
import { T, card, btnPrimary } from '@/lib/theme';
import { DEFAULT_PERMISSIONS } from '@/lib/permissions';
import { UserRole } from '@/types';

const ROLES: { key: UserRole; label: string; icon: string; desc: string }[] = [
  { key:'super_admin',    label:'Super Admin',    icon:'👑', desc:'Full access — all modules'                              },
  { key:'region_manager', label:'Region Manager', icon:'📍', desc:'Regional projects, vendors, PTW, approve utilisations'  },
  { key:'project_manager',label:'Project Manager',icon:'📋', desc:'Project edit, vendor assign, PTW, approve utilisations' },
  { key:'site_engineer',  label:'Site Engineer',  icon:'👷', desc:'Read-only — projects in their region'                   },
  { key:'accounting_team',label:'Accounting',     icon:'💳', desc:'Site Expenses full access, STN/SRN reconciliation'     },
  { key:'vendor',         label:'Vendor',         icon:'🏢', desc:'Upload docs, submit utilisation per item'               },
  { key:'viewer',         label:'Viewer',         icon:'👁',  desc:'Read-only access to all modules'                       },
];

const MODULES: { key: string; label: string; icon: string; desc: string; note?: string }[] = [
  { key:'dashboard',    label:'Dashboard',        icon:'▦',  desc:'Role-specific dashboard and KPIs'                      },
  { key:'projects',     label:'Projects',         icon:'📁', desc:'Project list, details, edit, vendor assign, PTW'       },
  { key:'vendors',      label:'Vendors',          icon:'🏢', desc:'Vendor management, invite, activate, deactivate'       },
  { key:'srn_return',   label:'STN / SRN Status', icon:'📦', desc:'Material tracking — Read: all | Edit: SA/RM/PM approve, Vendor submit utilisation', note:'⚠️ Create = recording STN from Indus (future feature). Currently Indus issues STN externally.' },
  { key:'site_expenses',label:'Site Expenses',    icon:'💰', desc:'Payments to vendors per project | Accounting adds, others view only'                },
  { key:'ptw',          label:'PTW Management',   icon:'🔑', desc:'Permit to Work inside project detail | SA/RM/PM can create & edit'                 },
  { key:'reports',      label:'Reports',          icon:'📊', desc:'Auto-generated reports — Read only for all roles (no manual create)'               },
];


const PROJECT_SECTIONS: { key: string; label: string; icon: string; desc: string }[] = [
  { key:'sec_project_details',  label:'Project Details',         icon:'📋', desc:'Project No, PO Number, Indus ID, Site, Region, Job Type, Dates, PM, RM' },
  { key:'sec_financial',        label:'Financial Summary',        icon:'💰', desc:'PO Value, Billed Amount, Paid Amount, Pending, PO Aging'                },
  { key:'sec_vendor_assignment',label:'Vendor Assignment',        icon:'🏢', desc:'Vendor selection, contact details, work scope'                          },
  { key:'sec_ptw',              label:'PTW — Permit to Work',     icon:'🔑', desc:'Ticket ID, Supervisor Name, Allowed Date From/To, status indicator'     },
  { key:'sec_work_documents',   label:'Work Documents',           icon:'📂', desc:'6 document types with thumbnail preview and upload'                     },
  { key:'sec_stn_srn',          label:'STN/SRN Material Tracking',icon:'📦', desc:'Materials issued by Indus, utilisation per item, return qty'            },
  { key:'sec_billing_review',   label:'Billing Review Checklist', icon:'✅', desc:'STN ✓ SRN ✓ PTW ✓ Materials Returned to Indus ✓ — payment release'      },
  { key:'sec_activity_log',     label:'Activity Log',             icon:'📝', desc:'Full timeline — project creation to billing, all actions by all roles'  },
];

// Default section permissions per role
const DEFAULT_SECTION_PERMS: Record<string, Record<string, Record<string, boolean>>> = {
  super_admin: {
    sec_project_details:   { can_read:true,  can_create:true,  can_edit:true,  can_delete:true  },
    sec_financial:         { can_read:true,  can_create:true,  can_edit:true,  can_delete:false },
    sec_vendor_assignment: { can_read:true,  can_create:true,  can_edit:true,  can_delete:false },
    sec_ptw:               { can_read:true,  can_create:true,  can_edit:true,  can_delete:true  },
    sec_work_documents:    { can_read:true,  can_create:true,  can_edit:true,  can_delete:true  },
    sec_stn_srn:           { can_read:true,  can_create:false, can_edit:true,  can_delete:false },
    sec_billing_review:    { can_read:true,  can_create:false, can_edit:true,  can_delete:false },
    sec_activity_log:      { can_read:true,  can_create:false, can_edit:false, can_delete:false },
  },
  region_manager: {
    sec_project_details:   { can_read:true,  can_create:false, can_edit:true,  can_delete:false },
    sec_financial:         { can_read:true,  can_create:false, can_edit:false, can_delete:false },
    sec_vendor_assignment: { can_read:true,  can_create:false, can_edit:true,  can_delete:false },
    sec_ptw:               { can_read:true,  can_create:true,  can_edit:true,  can_delete:false },
    sec_work_documents:    { can_read:true,  can_create:false, can_edit:false, can_delete:false },
    sec_stn_srn:           { can_read:true,  can_create:false, can_edit:true,  can_delete:false },
    sec_billing_review:    { can_read:true,  can_create:false, can_edit:false, can_delete:false },
    sec_activity_log:      { can_read:true,  can_create:false, can_edit:false, can_delete:false },
  },
  project_manager: {
    sec_project_details:   { can_read:true,  can_create:false, can_edit:true,  can_delete:false },
    sec_financial:         { can_read:true,  can_create:false, can_edit:false, can_delete:false },
    sec_vendor_assignment: { can_read:true,  can_create:true,  can_edit:true,  can_delete:false },
    sec_ptw:               { can_read:true,  can_create:true,  can_edit:true,  can_delete:false },
    sec_work_documents:    { can_read:true,  can_create:false, can_edit:false, can_delete:false },
    sec_stn_srn:           { can_read:true,  can_create:false, can_edit:true,  can_delete:false },
    sec_billing_review:    { can_read:true,  can_create:false, can_edit:true,  can_delete:false },
    sec_activity_log:      { can_read:true,  can_create:false, can_edit:false, can_delete:false },
  },
  site_engineer: {
    sec_project_details:   { can_read:true,  can_create:false, can_edit:false, can_delete:false },
    sec_financial:         { can_read:false, can_create:false, can_edit:false, can_delete:false },
    sec_vendor_assignment: { can_read:true,  can_create:false, can_edit:false, can_delete:false },
    sec_ptw:               { can_read:true,  can_create:false, can_edit:false, can_delete:false },
    sec_work_documents:    { can_read:true,  can_create:false, can_edit:false, can_delete:false },
    sec_stn_srn:           { can_read:true,  can_create:false, can_edit:false, can_delete:false },
    sec_billing_review:    { can_read:false, can_create:false, can_edit:false, can_delete:false },
    sec_activity_log:      { can_read:true,  can_create:false, can_edit:false, can_delete:false },
  },
  accounting_team: {
    sec_project_details:   { can_read:true,  can_create:false, can_edit:false, can_delete:false },
    sec_financial:         { can_read:true,  can_create:false, can_edit:true,  can_delete:false },
    sec_vendor_assignment: { can_read:true,  can_create:false, can_edit:false, can_delete:false },
    sec_ptw:               { can_read:true,  can_create:false, can_edit:false, can_delete:false },
    sec_work_documents:    { can_read:true,  can_create:false, can_edit:false, can_delete:false },
    sec_stn_srn:           { can_read:true,  can_create:false, can_edit:false, can_delete:false },
    sec_billing_review:    { can_read:true,  can_create:false, can_edit:true,  can_delete:false },
    sec_activity_log:      { can_read:true,  can_create:false, can_edit:false, can_delete:false },
  },
  vendor: {
    sec_project_details:   { can_read:true,  can_create:false, can_edit:false, can_delete:false },
    sec_financial:         { can_read:false, can_create:false, can_edit:false, can_delete:false },
    sec_vendor_assignment: { can_read:true,  can_create:false, can_edit:false, can_delete:false },
    sec_ptw:               { can_read:true,  can_create:false, can_edit:false, can_delete:false },
    sec_work_documents:    { can_read:true,  can_create:true,  can_edit:true,  can_delete:false },
    sec_stn_srn:           { can_read:true,  can_create:false, can_edit:true,  can_delete:false },
    sec_billing_review:    { can_read:false, can_create:false, can_edit:false, can_delete:false },
    sec_activity_log:      { can_read:true,  can_create:false, can_edit:false, can_delete:false },
  },
  viewer: {
    sec_project_details:   { can_read:true,  can_create:false, can_edit:false, can_delete:false },
    sec_financial:         { can_read:true,  can_create:false, can_edit:false, can_delete:false },
    sec_vendor_assignment: { can_read:true,  can_create:false, can_edit:false, can_delete:false },
    sec_ptw:               { can_read:true,  can_create:false, can_edit:false, can_delete:false },
    sec_work_documents:    { can_read:true,  can_create:false, can_edit:false, can_delete:false },
    sec_stn_srn:           { can_read:true,  can_create:false, can_edit:false, can_delete:false },
    sec_billing_review:    { can_read:true,  can_create:false, can_edit:false, can_delete:false },
    sec_activity_log:      { can_read:true,  can_create:false, can_edit:false, can_delete:false },
  },
};

type Action = 'can_create'|'can_read'|'can_edit'|'can_delete';
const ACTIONS: { key: Action; label: string; color: string; bg: string; what: string }[] = [
  { key:'can_read',   label:'Read',   color:'#2563EB', bg:'#EFF6FF', what:'View data'          },
  { key:'can_create', label:'Create', color:'#16A34A', bg:'#F0FDF4', what:'Add new records'    },
  { key:'can_edit',   label:'Edit',   color:'#D97706', bg:'#FFFBEB', what:'Modify existing'    },
  { key:'can_delete', label:'Delete', color:'#DC2626', bg:'#FEF2F2', what:'Remove records'     },
];

export default function RolesPage() {
  const [perms, setPerms]         = useState(() => JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS)));
  const [sectionPerms, setSectionPerms] = useState(() => JSON.parse(JSON.stringify(DEFAULT_SECTION_PERMS)));
  const [activeRole, setRole] = useState<UserRole>('region_manager');
  const [saving,    setSaving] = useState(false);
  const [toast, setToast]     = useState<{msg:string;type:'success'|'error'|'info'}|null>(null);

  const toggle = (module: string, action: Action) => {
    if (activeRole === 'super_admin') return;
    setPerms((p:any) => ({
      ...p,
      [activeRole]: {
        ...p[activeRole],
        [module]: { ...p[activeRole][module], [action]: !p[activeRole][module]?.[action] }
      }
    }));
  };

  const toggleSection = (section: string, action: Action) => {
    if (activeRole === 'super_admin') return;
    setSectionPerms((p:any) => ({
      ...p,
      [activeRole]: {
        ...p[activeRole],
        [section]: { ...(p[activeRole]?.[section] || {}), [action]: !p[activeRole]?.[section]?.[action] }
      }
    }));
  };

  const currentRole = ROLES.find(r => r.key === activeRole)!;

  return (
    <Layout>
      <div className="fade-in">
        <div style={{ display:'grid', gridTemplateColumns:'240px 1fr', gap:16 }}>
          {/* Role list */}
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:12 }}>Select Role</div>
            <div style={{ fontSize:11, color:T.textMuted, marginBottom:10, fontWeight:500 }}>
              Click a role to edit its permissions:
            </div>
            {ROLES.map(r => (
              <div key={r.key} onClick={()=>setRole(r.key)}
                style={{ padding:'12px 14px', borderRadius:10, marginBottom:8, cursor:'pointer', border:`1.5px solid ${activeRole===r.key?T.primary:T.border}`, background:activeRole===r.key?T.primaryLight:T.surface, transition:'all 0.15s' }}
                onMouseEnter={e=>{if(r.key!=='super_admin')(e.currentTarget as HTMLDivElement).style.borderColor=T.primaryMid;}}
                onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.borderColor=activeRole===r.key?T.primary:T.border;}}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:3 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:16 }}>{r.icon}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:activeRole===r.key?T.primary:T.text }}>{r.label}</span>
                  </div>
                  {r.key === 'super_admin'
                    ? <span style={{ fontSize:9, color:T.textDim, background:T.bg, padding:'2px 6px', borderRadius:4, fontWeight:600 }}>LOCKED</span>
                    : <span style={{ fontSize:9, color:T.success, background:T.successBg, padding:'2px 6px', borderRadius:4, fontWeight:600 }}>EDITABLE</span>
                  }
                </div>
                <div style={{ fontSize:11, color:T.textMuted, lineHeight:1.4 }}>{r.desc}</div>
              </div>
            ))}
          </div>

          {/* Permission matrix */}
          <div>
            <div style={card}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:16, fontWeight:700, color:T.text }}>{currentRole.icon} {currentRole.label}</div>
                  <div style={{ fontSize:12, color:T.textMuted, marginTop:3 }}>{currentRole.desc}</div>
                </div>
                {activeRole !== 'super_admin' && (
                  <button onClick={()=>{ setSaving(true); setTimeout(()=>{ setSaving(false); setToast({ msg:`Permissions saved for ${ROLES.find(r=>r.key===activeRole)?.label}!`, type:'success' }); },600); }}
                    disabled={saving} style={{ ...btnPrimary, opacity:saving?0.8:1 }}>
                    {saving ? 'Saving…' : `💾 Save ${ROLES.find(r=>r.key===activeRole)?.label} Permissions`}
                  </button>
                )}
              </div>

              {activeRole === 'super_admin' && (
                <div style={{ background:T.primaryLight, border:`1px solid ${T.primaryMid}`, borderRadius:8, padding:'12px 16px', marginBottom:16 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:T.primary, marginBottom:4 }}>👑 Super Admin — Always Full Access</div>
                  <div style={{ fontSize:12, color:T.textMuted }}>Super Admin permissions are fixed and cannot be changed. Select any other role from the left panel to view and edit their permissions.</div>
                </div>
              )}

              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:T.bg }}>
                    <th style={{ padding:'10px 14px', fontSize:12, fontWeight:700, color:T.textMuted, textAlign:'left', width:'45%', borderBottom:`2px solid ${T.border}` }}>Module</th>
                    {ACTIONS.map(a=>(
                      <th key={a.key} style={{ padding:'10px 14px', fontSize:12, fontWeight:700, color:a.color, textAlign:'center', borderBottom:`2px solid ${T.border}` }}>
                        <div>{a.label}</div>
                        <div style={{ fontSize:10, color:T.textDim, fontWeight:400 }}>{a.what}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map((mod, i) => {
                    const modPerms = perms[activeRole]?.[mod.key] || {};
                    return (
                      <React.Fragment key={mod.key}>
                        <tr style={{ borderTop:`1px solid ${T.border}`, background:i%2===0?'#fff':T.bg }}>
                          <td style={{ padding:'12px 14px' }}>
                            <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                              <span style={{ fontSize:16, flexShrink:0, marginTop:2 }}>{mod.icon}</span>
                              <div>
                                <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{mod.label}</div>
                                <div style={{ fontSize:11, color:T.textMuted, lineHeight:1.4, marginTop:2 }}>{mod.desc}</div>
                                {mod.note && <div style={{ fontSize:10, color:'#D97706', marginTop:3, background:'#FFFBEB', padding:'2px 6px', borderRadius:4 }}>{mod.note}</div>}
                              </div>
                            </div>
                          </td>
                          {ACTIONS.map(action => {
                            const enabled = activeRole==='super_admin'
                              ? perms['super_admin']?.[mod.key]?.[action.key] ?? false
                              : !!modPerms[action.key];
                            return (
                              <td key={action.key} style={{ padding:'12px 14px', textAlign:'center' }}>
                                <div onClick={()=>toggle(mod.key, action.key)}
                                  style={{ width:32, height:32, borderRadius:8, border:`2px solid ${enabled?action.color:T.border}`, background:enabled?action.bg:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:activeRole==='super_admin'?'default':'pointer', margin:'0 auto', transition:'all 0.15s' }}>
                                  {enabled && <span style={{ fontSize:14, fontWeight:700, color:action.color }}>✓</span>}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>


            {/* Project Detail Sections */}
            <div style={{ ...card, marginTop:14 }}>
              <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:4 }}>📁 Project Detail Sections</div>
              <div style={{ fontSize:12, color:T.textMuted, marginBottom:14 }}>
                Fine-grained permissions for each section within a project. Controls what each role can see and do inside the project detail view.
              </div>

              <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
                <thead>
                  <tr style={{ background:T.bg }}>
                    <th style={{ padding:'10px 14px', fontSize:12, fontWeight:700, color:T.textMuted, textAlign:'left', width:'45%', borderBottom:`2px solid ${T.border}` }}>Project Section</th>
                    {ACTIONS.map(a=>(
                      <th key={a.key} style={{ padding:'10px 14px', fontSize:12, fontWeight:700, color:a.color, textAlign:'center', borderBottom:`2px solid ${T.border}` }}>
                        <div>{a.label}</div>
                        <div style={{ fontSize:10, color:T.textDim, fontWeight:400 }}>{a.what}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PROJECT_SECTIONS.map((sec, i) => {
                    const secPerms = sectionPerms[activeRole]?.[sec.key] || {};
                    return (
                      <tr key={sec.key} style={{ borderTop:`1px solid ${T.border}`, background:i%2===0?'#fff':T.bg }}>
                        <td style={{ padding:'12px 14px' }}>
                          <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                            <span style={{ fontSize:16, flexShrink:0, marginTop:2 }}>{sec.icon}</span>
                            <div>
                              <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{sec.label}</div>
                              <div style={{ fontSize:11, color:T.textMuted, marginTop:2 }}>{sec.desc}</div>
                            </div>
                          </div>
                        </td>
                        {ACTIONS.map(action => {
                          const enabled = activeRole==='super_admin'
                            ? DEFAULT_SECTION_PERMS['super_admin']?.[sec.key]?.[action.key] ?? false
                            : !!secPerms[action.key];
                          return (
                            <td key={action.key} style={{ padding:'12px 14px', textAlign:'center' as const }}>
                              <div onClick={()=>toggleSection(sec.key, action.key)}
                                style={{ width:32, height:32, borderRadius:8, border:`2px solid ${enabled?action.color:T.border}`, background:enabled?action.bg:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:activeRole==='super_admin'?'default':'pointer', margin:'0 auto', transition:'all 0.15s' }}>
                                {enabled && <span style={{ fontSize:14, fontWeight:700, color:action.color }}>✓</span>}
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
            <div style={{ ...card, marginTop:14 }}>
              <div style={{ fontSize:13, fontWeight:600, color:T.text, marginBottom:10 }}>Permission Legend</div>
              <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
                {ACTIONS.map(a=>(
                  <div key={a.key} style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:22, height:22, borderRadius:6, background:a.bg, border:`2px solid ${a.color}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <span style={{ fontSize:11, fontWeight:700, color:a.color }}>✓</span>
                    </div>
                    <span style={{ fontSize:12, color:T.text }}><strong>{a.label}</strong> — {a.what}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:12, padding:'10px 14px', background:'#FFFBEB', borderRadius:8, fontSize:12, color:'#92400E' }}>
                ℹ️ These permissions reflect what is currently available in the UI. Grayed checkboxes indicate the feature is not yet implemented for that role.
              </div>
            </div>
          </div>
        </div>
      </div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
    </Layout>
  );
}
