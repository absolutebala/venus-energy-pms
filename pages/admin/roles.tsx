import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { T, card, btnPrimary } from '@/lib/theme';
import { ROLE_LABELS, MODULE_LABELS, ALL_MODULES, UserRole, AppModule } from '@/types';
import { DEFAULT_PERMISSIONS } from '@/lib/permissions';
import { createClient } from '@/lib/supabase';

const EDITABLE_ROLES: UserRole[] = ['region_manager', 'project_manager', 'site_engineer', 'viewer'];
type PermKey = 'can_create' | 'can_read' | 'can_edit' | 'can_delete';
const PERM_KEYS: PermKey[] = ['can_create', 'can_read', 'can_edit', 'can_delete'];
const PERM_LABELS: Record<PermKey, string> = { can_create:'Create', can_read:'Read', can_edit:'Edit', can_delete:'Delete' };

type PermMatrix = Record<string, Record<string, Record<PermKey, boolean>>>;

export default function AdminRolesPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [selectedRole, setSelectedRole] = useState<UserRole>('region_manager');
  const [matrix, setMatrix] = useState<PermMatrix>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{type:'success'|'error'; text:string}|null>(null);

  useEffect(() => {
    if (profile && profile.role !== 'super_admin') router.replace('/dashboard');
  }, [profile, router]);

  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('role_permissions').select('*');
    const m: PermMatrix = {};

    // Seed with defaults first
    EDITABLE_ROLES.forEach(role => {
      m[role] = {};
      ALL_MODULES.forEach(mod => {
        const def = DEFAULT_PERMISSIONS[role]?.[mod];
        m[role][mod] = { can_create: def?.can_create??false, can_read: def?.can_read??true, can_edit: def?.can_edit??false, can_delete: def?.can_delete??false };
      });
    });

    // Override with DB data
    if (data) {
      data.forEach((p: any) => {
        if (!m[p.role]) m[p.role] = {};
        if (!m[p.role][p.module]) m[p.role][p.module] = { can_create:false, can_read:true, can_edit:false, can_delete:false };
        m[p.role][p.module] = { can_create:p.can_create, can_read:p.can_read, can_edit:p.can_edit, can_delete:p.can_delete };
      });
    }
    setMatrix(m);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPermissions(); }, [fetchPermissions]);

  const toggle = (module: AppModule, key: PermKey) => {
    setMatrix(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[selectedRole]) next[selectedRole] = {};
      if (!next[selectedRole][module]) next[selectedRole][module] = { can_create:false, can_read:true, can_edit:false, can_delete:false };
      // can_read cannot be disabled
      if (key === 'can_read') return next;
      next[selectedRole][module][key] = !next[selectedRole][module][key];
      return next;
    });
  };

  const savePermissions = async () => {
    setSaving(true);
    setMsg(null);
    const rolePerms = matrix[selectedRole];
    if (!rolePerms) { setSaving(false); return; }

    const upsertData = ALL_MODULES.map(mod => ({
      role: selectedRole,
      module: mod,
      ...(rolePerms[mod] || { can_create:false, can_read:true, can_edit:false, can_delete:false }),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from('role_permissions').upsert(upsertData, { onConflict: 'role,module' });
    setSaving(false);
    if (error) setMsg({ type:'error', text: error.message });
    else setMsg({ type:'success', text:`Permissions saved for ${ROLE_LABELS[selectedRole]}!` });
    setTimeout(() => setMsg(null), 3000);
  };

  const resetToDefault = () => {
    setMatrix(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next[selectedRole] = {};
      ALL_MODULES.forEach(mod => {
        const def = DEFAULT_PERMISSIONS[selectedRole]?.[mod];
        next[selectedRole][mod] = { can_create:def?.can_create??false, can_read:def?.can_read??true, can_edit:def?.can_edit??false, can_delete:def?.can_delete??false };
      });
      return next;
    });
  };

  const Checkbox = ({ checked, onChange, disabled=false }: { checked:boolean; onChange:()=>void; disabled?:boolean }) => (
    <button onClick={!disabled?onChange:undefined} style={{
      width:24, height:24, borderRadius:6, border:`2px solid`,
      borderColor: disabled ? T.border : checked ? T.primary : T.border,
      background: disabled ? T.bg : checked ? T.primary : T.surface,
      display:'flex', alignItems:'center', justifyContent:'center',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition:'all 0.15s',
    }}>
      {checked && <span style={{ color:'#fff', fontSize:12, fontWeight:700, lineHeight:1 }}>✓</span>}
    </button>
  );

  const currentPerms = matrix[selectedRole] || {};

  return (
    <Layout>
      <div className="fade-in">
        <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>

          {/* Role selector sidebar */}
          <div style={{ ...card, width:200, flexShrink:0 }}>
            <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:14 }}>Roles</div>
            {EDITABLE_ROLES.map(role => (
              <button key={role} onClick={()=>setSelectedRole(role)} style={{
                width:'100%', textAlign:'left', padding:'10px 12px', borderRadius:8, border:'none',
                background: selectedRole===role ? T.primaryLight : 'transparent',
                color: selectedRole===role ? T.primary : T.textMuted,
                fontWeight: selectedRole===role ? 700 : 400,
                fontSize:13, cursor:'pointer', marginBottom:4,
                borderLeft: selectedRole===role ? `3px solid ${T.primary}` : '3px solid transparent',
              }}>
                {ROLE_LABELS[role]}
              </button>
            ))}

            <div style={{ marginTop:14, padding:'12px', background:T.primaryLight, borderRadius:8 }}>
              <div style={{ fontSize:11, fontWeight:700, color:T.primary, marginBottom:4 }}>Super Admin</div>
              <div style={{ fontSize:11, color:T.textMuted }}>Always has full access to all modules. Cannot be restricted.</div>
            </div>
          </div>

          {/* Permissions matrix */}
          <div style={{ ...card, flex:1 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:T.text }}>{ROLE_LABELS[selectedRole]}</div>
                <div style={{ fontSize:12, color:T.textMuted }}>Click checkboxes to toggle permissions. Read access is always enabled.</div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={resetToDefault} style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:7, padding:'7px 14px', fontSize:12, color:T.textMuted, cursor:'pointer' }}>
                  ↩ Reset Defaults
                </button>
                <button onClick={savePermissions} disabled={saving} style={{ ...btnPrimary, opacity:saving?0.7:1 }}>
                  {saving?'Saving…':'💾 Save Permissions'}
                </button>
              </div>
            </div>

            {msg && (
              <div style={{ padding:'10px 14px', borderRadius:8, fontSize:13, marginBottom:16, marginTop:12, background:msg.type==='success'?T.successBg:T.dangerBg, border:`1px solid ${msg.type==='success'?'#BBF7D0':'#FECACA'}`, color:msg.type==='success'?T.success:T.danger }}>
                {msg.type==='success'?'✅':'⚠️'} {msg.text}
              </div>
            )}

            {loading ? (
              <div style={{ display:'flex', justifyContent:'center', padding:60 }}><div className="spinner" /></div>
            ) : (
              <div style={{ overflowX:'auto', marginTop:16 }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom:`2px solid ${T.border}` }}>
                      <th style={{ textAlign:'left', padding:'10px 12px', fontSize:12, fontWeight:700, color:T.text, width:200 }}>Module</th>
                      {PERM_KEYS.map(k => (
                        <th key={k} style={{ textAlign:'center', padding:'10px 20px', fontSize:12, fontWeight:700, color:T.text }}>
                          {PERM_LABELS[k]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ALL_MODULES.map((mod, i) => {
                      const perms = currentPerms[mod] || { can_create:false, can_read:true, can_edit:false, can_delete:false };
                      return (
                        <tr key={mod} style={{ background: i%2===0 ? T.bg : T.surface, borderBottom:`1px solid ${T.border}` }}>
                          <td style={{ padding:'12px 12px' }}>
                            <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{MODULE_LABELS[mod]}</div>
                          </td>
                          {PERM_KEYS.map(key => (
                            <td key={key} style={{ textAlign:'center', padding:'12px 20px' }}>
                              <div style={{ display:'flex', justifyContent:'center' }}>
                                <Checkbox
                                  checked={perms[key]}
                                  onChange={() => toggle(mod, key)}
                                  disabled={key==='can_read'}
                                />
                              </div>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ marginTop:14, padding:'10px 14px', background:T.bg, borderRadius:8, fontSize:11, color:T.textDim }}>
              💡 Tip: Changes take effect on the user's next login or page refresh. Read access is always on and cannot be disabled.
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
