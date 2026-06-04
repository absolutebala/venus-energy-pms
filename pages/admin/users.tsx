import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { T, card, badge, th, td, btnPrimary, btnSecondary, inputStyle } from '@/lib/theme';
import { ROLE_LABELS, UserRole } from '@/types';
import { createClient } from '@/lib/supabase';

const ROLES: UserRole[] = ['super_admin','region_manager','project_manager','site_engineer','viewer'];
const ASSIGNABLE_ROLES: UserRole[] = ['region_manager','project_manager','site_engineer','accounting_team','vendor','viewer'];
const ADMIN_ASSIGNABLE_ROLES: UserRole[] = ['super_admin','region_manager','project_manager','site_engineer','accounting_team','vendor','viewer'];

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  designation: string | null;
  region: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

type Modal = 'none' | 'invite' | 'create' | 'edit';


// ── Module-level components (outside AdminUsersPage to prevent cursor jump) ──

interface FormFieldProps {
  label: string; value: string; onChange: (v:string)=>void;
  type?: string; placeholder?: string; fkey?: string; readOnly?: boolean;
  focused: string|null; setFocused: (k:string|null)=>void;
}
function FormField({ label, value, onChange, type='text', placeholder, fkey='', readOnly=false, focused, setFocused }: FormFieldProps) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:6 }}>{label}</label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)}
        onFocus={()=>setFocused(fkey)} onBlur={()=>setFocused(null)}
        placeholder={placeholder} readOnly={readOnly}
        style={{ ...inputStyle(focused===fkey), ...(readOnly?{background:T.bg,color:T.textMuted,cursor:'not-allowed'}:{}), width:'100%' }} />
    </div>
  );
}

interface RoleSelectProps { value:string; onChange:(r:UserRole)=>void; roles: UserRole[]; }
function RoleSelect({ value, onChange, roles }: RoleSelectProps) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:6 }}>Role *</label>
      <select value={value} onChange={e=>onChange(e.target.value as UserRole)} style={{ ...inputStyle(), width:'100%', appearance:'none' }}>
        {roles.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
      </select>
    </div>
  );
}

interface ModalOverlayProps { children: React.ReactNode; onClose: ()=>void; }
function ModalOverlay({ children, onClose }: ModalOverlayProps) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:T.surface, borderRadius:16, padding:32, width:'100%', maxWidth:520, boxShadow:'0 20px 60px rgba(0,0,0,0.2)', maxHeight:'90vh', overflowY:'auto' }}>
        {children}
      </div>
    </div>
  );
}

interface MsgAlertProps { msg: {type:'success'|'error'; text:string}|null; }
function MsgAlert({ msg }: MsgAlertProps) {
  if (!msg) return null;
  return (
    <div style={{ padding:'10px 14px', borderRadius:8, fontSize:13, marginBottom:16,
      background:msg.type==='success'?T.successBg:T.dangerBg,
      border:`1px solid ${msg.type==='success'?'#BBF7D0':'#FECACA'}`,
      color:msg.type==='success'?T.success:T.danger }}>
      {msg.type==='success'?'✅':'⚠️'} {msg.text}
    </div>
  );
}




interface PasswordFieldProps {
  label: string; value: string; onChange: (v:string)=>void;
  placeholder?: string; fkey?: string;
  focused: string|null; setFocused: (k:string|null)=>void;
}
function PasswordField({ label, value, onChange, placeholder, fkey='', focused, setFocused }: PasswordFieldProps) {
  const [show, setShow] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const copy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:6 }}>{label}</label>
      <div style={{ display:'flex', alignItems:'center', border:`1px solid ${focused===fkey?T.primary:'#E2E8F0'}`, borderRadius:8, background:'#fff', overflow:'hidden' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(fkey)}
          onBlur={() => setFocused(null)}
          placeholder={placeholder}
          style={{ flex:1, border:'none', outline:'none', padding:'9px 12px', fontSize:13, color:T.text, background:'transparent' }}
        />
        <button type="button" onClick={() => setShow(s => !s)}
          title={show ? 'Hide password' : 'Show password'}
          style={{ background:'none', border:'none', padding:'0 8px', cursor:'pointer', fontSize:15, color:T.textMuted, lineHeight:1 }}>
          {show ? '🙈' : '👁'}
        </button>
        <button type="button" onClick={copy}
          title="Copy password"
          style={{ background:'none', border:'none', padding:'0 10px 0 4px', cursor:'pointer', fontSize:13, color:copied ? T.success : T.textMuted, fontWeight:600, lineHeight:1 }}>
          {copied ? '✅' : '📋'}
        </button>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [modal, setModal] = useState<Modal>('none');
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type:'success'|'error'; text:string }|null>(null);
  const [focused, setFocused] = useState<string|null>(null);

  // Form state
  const [fEmail, setFEmail]           = useState('');
  const [fName, setFName]             = useState('');
  const [fPhone, setFPhone]           = useState('');
  const [fDesig, setFDesig]           = useState('');
  const [fRegion, setFRegion]         = useState('');
  const [fRole,    setFRole]    = useState<UserRole>('viewer');
  const [fVendorId, setFVendorId] = useState('');
  const [vendorList, setVendorList] = useState<{id:string;name:string}[]>([]);

  React.useEffect(() => {
    const sb = createClient();
    sb.from('vendors').select('id,name').order('name').then(({data}) => {
      if (data) setVendorList(data);
    });
  }, []);
  const [fPassword, setFPassword]     = useState('');
  const [fActive, setFActive]         = useState(true);

  // Guard — super admin only
  useEffect(() => {
    if (profile && profile.role !== 'super_admin') router.replace('/dashboard');
  }, [profile, router]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setLoading(false); return; }
      const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.users) setUsers(json.users as UserRow[]);
    } catch(err) { console.error('fetchUsers error:', err); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openInvite = () => { resetForm(); setModal('invite'); };
  const openCreate = () => { resetForm(); setModal('create'); };
  const openEdit = (u: UserRow) => {
    setFName(u.full_name || '');
    setFEmail(u.email);
    setFPhone(u.phone || '');
    setFDesig(u.designation || '');
    setFRegion(u.region || ''); setFVendorId((u as any).vendor_id || '');
    setFRole(u.role);
    setFActive(u.is_active);
    setEditUser(u);
    setModal('edit');
  };

  const resetForm = () => {
    setFEmail(''); setFName(''); setFPhone(''); setFDesig('');
    setFRegion(''); setFRole('viewer'); setFPassword(''); setFActive(true); setFVendorId('');
    setEditUser(null); setMsg(null);
  };

  const handleInvite = async () => {
    if (!fEmail || !fRole) { setMsg({ type:'error', text:'Email and role are required.' }); return; }
    setBusy(true);
    const { data: { session: invSess } } = await supabase.auth.getSession();
    const res = await fetch('/api/admin/invite-user', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', Authorization: `Bearer ${invSess?.access_token||''}` },
      body: JSON.stringify({ email: fEmail, role: fRole, full_name: fName }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) setMsg({ type:'error', text: data.error || 'Failed to send invite.' });
    else { setMsg({ type:'success', text:`Invite sent to ${fEmail}!` }); fetchUsers(); setTimeout(() => { setModal('none'); resetForm(); }, 2000); }
  };

  const handleCreate = async () => {
    if (!fEmail || !fPassword || !fRole) { setMsg({ type:'error', text:'Email, password, and role are required.' }); return; }
    if (fPassword.length < 8) { setMsg({ type:'error', text:'Password must be at least 8 characters.' }); return; }
    setBusy(true);
    const { data: { session: crSess } } = await supabase.auth.getSession();
    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', Authorization: `Bearer ${crSess?.access_token||''}` },
      body: JSON.stringify({ email:fEmail, password:fPassword, full_name:fName, phone:fPhone, region:fRegion, role:fRole, vendor_id:fRole==='vendor'?fVendorId:null }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) setMsg({ type:'error', text: data.error || 'Failed to create user.' });
    else { setMsg({ type:'success', text:`User ${fEmail} created!` }); fetchUsers(); setTimeout(() => { setModal('none'); resetForm(); }, 2000); }
  };

  const handleEdit = async () => {
    if (!editUser) return;
    setBusy(true);
    const { data: { session: edSess } } = await supabase.auth.getSession();
    const res = await fetch('/api/admin/update-user', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', Authorization: `Bearer ${edSess?.access_token||''}` },
      body: JSON.stringify({ userId: editUser.id, full_name:fName, phone:fPhone, region:fRegion, role:fRole, is_active:fActive, vendor_id:fRole==='vendor'?fVendorId:null }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) setMsg({ type:'error', text: data.error || 'Failed to update user.' });
    else { setMsg({ type:'success', text:'User updated!' }); fetchUsers(); setTimeout(() => { setModal('none'); resetForm(); }, 1500); }
  };

  const toggleActive = async (u: UserRow) => {
    await supabase.from('profiles').update({ is_active: !u.is_active }).eq('id', u.id);
    fetchUsers();
  };

  const [deleteTarget, setDeleteTarget] = useState<UserRow|null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization: `Bearer ${session?.access_token||''}` },
        body: JSON.stringify({ userId: deleteTarget.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ type:'error', text: data.error || 'Failed to delete user.' });
      } else {
        await fetchUsers();
      }
    } catch(err: any) {
      setMsg({ type:'error', text: err.message || 'Delete failed.' });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const filtered = users.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (u.full_name || '').toLowerCase().includes(s) || u.email.toLowerCase().includes(s);
    }
    return true;
  });









  return (
    <Layout>
      <div className="fade-in">
        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
          {[
            { label:'Total Users', value:users.length, icon:'👥', color:T.primary },
            { label:'Active',      value:users.filter(u=>u.is_active).length, icon:'✅', color:T.success },
            { label:'Inactive',    value:users.filter(u=>!u.is_active).length, icon:'⛔', color:T.danger  },
            { label:'Admins',      value:users.filter(u=>u.role==='super_admin').length, icon:'🔑', color:T.warning },
          ].map((s,i) => (
            <div key={i} style={{ ...card, position:'relative', overflow:'hidden', padding:'16px 18px' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:s.color }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:11, color:T.textMuted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>{s.label}</div>
                  <div style={{ fontSize:28, fontWeight:700, color:T.text }}>{s.value}</div>
                </div>
                <div style={{ fontSize:22 }}>{s.icon}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={card}>
          {/* Toolbar */}
          <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:18, flexWrap:'wrap' }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or email…" style={{ ...inputStyle(), width:220 }} />
            <select value={roleFilter} onChange={e=>setRoleFilter(e.target.value)} style={{ ...inputStyle(), width:'auto', appearance:'none', paddingRight:28 }}>
              <option value="all">All Roles</option>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            <div style={{ flex:1 }} />
            <button onClick={openInvite} style={btnSecondary}>✉️ Invite by Email</button>
            <button onClick={openCreate} style={btnPrimary}>+ Create User</button>
          </div>

          {/* Table */}
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%' }}>
              <thead>
                <tr>{['#','Name','Email','Role','Region','Status','Joined','Actions'].map(h=><th key={h} style={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} style={{ ...td, textAlign:'center', padding:40 }}><div className="spinner" style={{ margin:'0 auto' }} /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} style={{ ...td, textAlign:'center', padding:40, color:T.textDim }}>No users found.</td></tr>
                ) : filtered.map((u,i) => (
                  <tr key={u.id}
                    onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background=T.bg}
                    onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background='transparent'}>
                    <td style={{ ...td, color:T.textDim }}>{i+1}</td>
                    <td style={{ ...td, color:T.text, fontWeight:600 }}>{u.full_name || '—'}</td>
                    <td style={{ ...td, color:T.primary }}>{u.email}</td>
                    <td style={td}><span style={{ fontSize:11, background:T.primaryLight, color:T.primary, padding:'3px 9px', borderRadius:20, fontWeight:600 }}>{ROLE_LABELS[u.role]}</span></td>
                    <td style={td}>{u.region || '—'}</td>

                    <td style={td}><span style={badge(u.is_active?'Active':'Inactive')}>{u.is_active?'Active':'Inactive'}</span></td>
                    <td style={{ ...td, whiteSpace:'nowrap' }}>{new Date(u.created_at).toLocaleDateString('en-IN')}</td>
                    <td style={td}>
                      <div style={{ display:'flex', gap:5 }}>
                        <button onClick={()=>openEdit(u)} style={{ background:T.primaryLight, border:'none', borderRadius:6, padding:'5px 10px', color:T.primary, cursor:'pointer', fontSize:12, fontWeight:500 }}>Edit</button>
                        <button onClick={()=>toggleActive(u)} style={{ background:u.is_active?T.dangerBg:T.successBg, border:'none', borderRadius:6, padding:'5px 10px', color:u.is_active?T.danger:T.success, cursor:'pointer', fontSize:12, fontWeight:500 }}>
                          {u.is_active?'Deactivate':'Activate'}
                        </button>
                        <button onClick={()=>setDeleteTarget(u)} style={{ background:T.dangerBg, border:'none', borderRadius:6, padding:'5px 10px', color:T.danger, cursor:'pointer', fontSize:12, fontWeight:500 }}>🗑 Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding:'10px 0', borderTop:`1px solid ${T.border}`, fontSize:11, color:T.textDim, marginTop:4 }}>Showing {filtered.length} of {users.length} users</div>
        </div>
      </div>

      {/* Invite Modal */}
      {modal === 'invite' && (
        <ModalOverlay onClose={()=>{setModal('none');resetForm();}}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <h3 style={{ fontSize:17, fontWeight:700, color:T.text }}>✉️ Invite User by Email</h3>
            <button onClick={()=>{setModal('none');resetForm();}} style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:T.textDim }}>✕</button>
          </div>
          <p style={{ fontSize:13, color:T.textMuted, marginBottom:20 }}>An invitation email with a sign-in link will be sent. The user sets their own password.</p>
          <MsgAlert msg={msg} />
          <FormField label="Email Address *" value={fEmail} onChange={setFEmail} type="email" placeholder="user@venusenergyindia.com" fkey="ie"  focused={focused} setFocused={setFocused}/>
          <FormField label="Full Name" value={fName} onChange={setFName} placeholder="Full name (optional)" fkey="in"  focused={focused} setFocused={setFocused}/>
          <RoleSelect value={fRole} onChange={setFRole}  roles={profile?.role === "super_admin" ? ADMIN_ASSIGNABLE_ROLES : ASSIGNABLE_ROLES}/>
          <FormField label="Region" value={fRegion} onChange={setFRegion} placeholder="e.g. Tamil Nadu" fkey="ir"  focused={focused} setFocused={setFocused}/>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
            <button onClick={()=>{setModal('none');resetForm();}} style={btnSecondary}>Cancel</button>
            <button onClick={handleInvite} disabled={busy} style={{ ...btnPrimary, opacity:busy?0.7:1 }}>
              {busy?'Sending…':'✉️ Send Invite'}
            </button>
          </div>
        </ModalOverlay>
      )}

      {/* Create Modal */}
      {modal === 'create' && (
        <ModalOverlay onClose={()=>{setModal('none');resetForm();}}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <h3 style={{ fontSize:17, fontWeight:700, color:T.text }}>+ Create User with Password</h3>
            <button onClick={()=>{setModal('none');resetForm();}} style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:T.textDim }}>✕</button>
          </div>
          <p style={{ fontSize:13, color:T.textMuted, marginBottom:20 }}>Create a user account and share the temporary password manually.</p>
          <MsgAlert msg={msg} />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
            <FormField label="Full Name" value={fName} onChange={setFName} placeholder="Full name" fkey="cn"  focused={focused} setFocused={setFocused}/>
            <FormField label="Email Address *" value={fEmail} onChange={setFEmail} type="email" placeholder="user@venusenergyindia.com" fkey="ce"  focused={focused} setFocused={setFocused}/>
            <FormField label="Temporary Password *" value={fPassword} onChange={setFPassword} type="password" placeholder="Min. 8 characters" fkey="cp"  focused={focused} setFocused={setFocused}/>
            <FormField label="Phone" value={fPhone} onChange={setFPhone} placeholder="+91 98765 43210" fkey="cph"  focused={focused} setFocused={setFocused}/>

            <FormField label="Region" value={fRegion} onChange={setFRegion} placeholder="Tamil Nadu" fkey="cr"  focused={focused} setFocused={setFocused}/>
          </div>
          <RoleSelect value={fRole} onChange={setFRole}  roles={profile?.role === "super_admin" ? ADMIN_ASSIGNABLE_ROLES : ASSIGNABLE_ROLES}/>
          {fRole === 'vendor' && (
            <div style={{ marginBottom:12 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:T.textMuted, marginBottom:6 }}>VENDOR *</label>
              <select value={fVendorId} onChange={e=>setFVendorId(e.target.value)}
                style={{ width:'100%', border:`1px solid ${T.border}`, borderRadius:8, padding:'10px 12px', fontSize:13, outline:'none', background:'#fff' }}>
                <option value="">— Select Vendor —</option>
                {vendorList.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          )}
          <div style={{ background:T.warningBg, border:`1px solid #FDE68A`, borderRadius:8, padding:'10px 14px', fontSize:12, color:T.warning }}>
            ⚠️ Share the temporary password securely. The user should change it upon first login.
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
            <button onClick={()=>{setModal('none');resetForm();}} style={btnSecondary}>Cancel</button>
            <button onClick={handleCreate} disabled={busy} style={{ ...btnPrimary, opacity:busy?0.7:1 }}>
              {busy?'Creating…':'+ Create User'}
            </button>
          </div>
        </ModalOverlay>
      )}

      {/* Edit Modal */}
      {modal === 'edit' && editUser && (
        <ModalOverlay onClose={()=>{setModal('none');resetForm();}}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <h3 style={{ fontSize:17, fontWeight:700, color:T.text }}>✏️ Edit User</h3>
            <button onClick={()=>{setModal('none');resetForm();}} style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:T.textDim }}>✕</button>
          </div>
          <MsgAlert msg={msg} />
          <FormField label="Email" value={fEmail} onChange={()=>{}} readOnly fkey="ee"  focused={focused} setFocused={setFocused}/>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
            <FormField label="Full Name" value={fName} onChange={setFName} fkey="eName"  focused={focused} setFocused={setFocused}/>
            <FormField label="Phone" value={fPhone} onChange={setFPhone} fkey="ePhone"  focused={focused} setFocused={setFocused}/>

            <FormField label="Region" value={fRegion} onChange={setFRegion} fkey="eRegion"  focused={focused} setFocused={setFocused}/>
          </div>
          <RoleSelect value={fRole} onChange={setFRole}  roles={profile?.role === "super_admin" ? ADMIN_ASSIGNABLE_ROLES : ASSIGNABLE_ROLES}/>
          {fRole === 'vendor' && (
            <div style={{ marginBottom:12 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:T.textMuted, marginBottom:6 }}>VENDOR *</label>
              <select value={fVendorId} onChange={e=>setFVendorId(e.target.value)}
                style={{ width:'100%', border:`1px solid ${T.border}`, borderRadius:8, padding:'10px 12px', fontSize:13, outline:'none', background:'#fff' }}>
                <option value="">— Select Vendor —</option>
                {vendorList.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          )}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
            <label style={{ fontSize:13, fontWeight:600, color:T.text }}>Account Status:</label>
            <button onClick={()=>setFActive(a=>!a)} style={{ background:fActive?T.successBg:T.dangerBg, border:`1px solid ${fActive?'#BBF7D0':'#FECACA'}`, borderRadius:20, padding:'4px 14px', fontSize:12, fontWeight:600, color:fActive?T.success:T.danger, cursor:'pointer' }}>
              {fActive?'✅ Active':'⛔ Inactive'}
            </button>
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
            <button onClick={()=>{setModal('none');resetForm();}} style={btnSecondary}>Cancel</button>
            <button onClick={handleEdit} disabled={busy} style={{ ...btnPrimary, opacity:busy?0.7:1 }}>
              {busy?'Saving…':'💾 Save Changes'}
            </button>
          </div>
        </ModalOverlay>
      )}
      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.5)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:T.surface, borderRadius:16, padding:28, width:'100%', maxWidth:440, boxShadow:'0 20px 60px rgba(0,0,0,0.18)' }}>
            <h3 style={{ fontSize:16, fontWeight:700, color:T.text, marginBottom:10 }}>🗑 Delete User</h3>
            <p style={{ fontSize:13, color:T.textMuted, marginBottom:6 }}>
              Are you sure you want to delete <strong style={{ color:T.text }}>{deleteTarget.full_name || deleteTarget.email}</strong>?
            </p>
            <p style={{ fontSize:12, color:T.textDim, marginBottom:20 }}>
              This will mark the account as inactive. The user will no longer be able to log in.
            </p>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
              <button onClick={()=>setDeleteTarget(null)} style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:8, padding:'8px 18px', fontSize:13, cursor:'pointer', color:T.text }}>Cancel</button>
              <button onClick={confirmDelete} disabled={deleting} style={{ background:T.danger, border:'none', borderRadius:8, padding:'8px 18px', fontSize:13, fontWeight:600, color:'#fff', cursor:'pointer', opacity:deleting?0.8:1 }}>
                {deleting ? 'Deleting…' : '🗑 Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
