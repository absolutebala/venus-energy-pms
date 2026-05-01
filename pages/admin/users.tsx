import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { T, card, badge, th, td, btnPrimary, btnSecondary, inputStyle } from '@/lib/theme';
import { ROLE_LABELS, UserRole } from '@/types';
import { createClient } from '@/lib/supabase';

const ROLES: UserRole[] = ['super_admin','region_manager','project_manager','site_engineer','viewer'];

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
  const [fRole, setFRole]             = useState<UserRole>('viewer');
  const [fPassword, setFPassword]     = useState('');
  const [fActive, setFActive]         = useState(true);

  // Guard — super admin only
  useEffect(() => {
    if (profile && profile.role !== 'super_admin') router.replace('/dashboard');
  }, [profile, router]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data as UserRow[]);
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
    setFRegion(u.region || '');
    setFRole(u.role);
    setFActive(u.is_active);
    setEditUser(u);
    setModal('edit');
  };

  const resetForm = () => {
    setFEmail(''); setFName(''); setFPhone(''); setFDesig('');
    setFRegion(''); setFRole('viewer'); setFPassword(''); setFActive(true);
    setEditUser(null); setMsg(null);
  };

  const handleInvite = async () => {
    if (!fEmail || !fRole) { setMsg({ type:'error', text:'Email and role are required.' }); return; }
    setBusy(true);
    const res = await fetch('/api/admin/invite-user', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
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
    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ email:fEmail, password:fPassword, full_name:fName, phone:fPhone, designation:fDesig, region:fRegion, role:fRole }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) setMsg({ type:'error', text: data.error || 'Failed to create user.' });
    else { setMsg({ type:'success', text:`User ${fEmail} created!` }); fetchUsers(); setTimeout(() => { setModal('none'); resetForm(); }, 2000); }
  };

  const handleEdit = async () => {
    if (!editUser) return;
    setBusy(true);
    const res = await fetch('/api/admin/update-user', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ userId: editUser.id, full_name:fName, phone:fPhone, designation:fDesig, region:fRegion, role:fRole, is_active:fActive }),
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

  const filtered = users.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (u.full_name || '').toLowerCase().includes(s) || u.email.toLowerCase().includes(s);
    }
    return true;
  });

  const ModalOverlay = ({ children }: { children: React.ReactNode }) => (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={e => { if (e.target === e.currentTarget) { setModal('none'); resetForm(); } }}>
      <div style={{ background:T.surface, borderRadius:16, padding:32, width:'100%', maxWidth:520, boxShadow:'0 20px 60px rgba(0,0,0,0.2)', maxHeight:'90vh', overflowY:'auto' }}>
        {children}
      </div>
    </div>
  );

  const FormField = ({ label, value, onChange, type='text', placeholder, fkey, readOnly=false }: any) => (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:6 }}>{label}</label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} onFocus={()=>setFocused(fkey)} onBlur={()=>setFocused(null)} placeholder={placeholder} readOnly={readOnly} style={{ ...inputStyle(focused===fkey), ...(readOnly?{background:T.bg,color:T.textMuted,cursor:'not-allowed'}:{}), width:'100%' }} />
    </div>
  );

  const RoleSelect = ({ value, onChange }: { value:string; onChange:(r:UserRole)=>void }) => (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:6 }}>Role *</label>
      <select value={value} onChange={e=>onChange(e.target.value as UserRole)} style={{ ...inputStyle(), width:'100%', appearance:'none' }}>
        {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
      </select>
    </div>
  );

  const MsgAlert = () => msg ? (
    <div style={{ padding:'10px 14px', borderRadius:8, fontSize:13, marginBottom:16, background:msg.type==='success'?T.successBg:T.dangerBg, border:`1px solid ${msg.type==='success'?'#BBF7D0':'#FECACA'}`, color:msg.type==='success'?T.success:T.danger }}>
      {msg.type==='success'?'✅':'⚠️'} {msg.text}
    </div>
  ) : null;

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
                <tr>{['#','Name','Email','Role','Region','Designation','Status','Joined','Actions'].map(h=><th key={h} style={th}>{h}</th>)}</tr>
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
                    <td style={td}>{u.designation || '—'}</td>
                    <td style={td}><span style={badge(u.is_active?'Active':'Inactive')}>{u.is_active?'Active':'Inactive'}</span></td>
                    <td style={{ ...td, whiteSpace:'nowrap' }}>{new Date(u.created_at).toLocaleDateString('en-IN')}</td>
                    <td style={td}>
                      <div style={{ display:'flex', gap:5 }}>
                        <button onClick={()=>openEdit(u)} style={{ background:T.primaryLight, border:'none', borderRadius:6, padding:'5px 10px', color:T.primary, cursor:'pointer', fontSize:12, fontWeight:500 }}>Edit</button>
                        <button onClick={()=>toggleActive(u)} style={{ background:u.is_active?T.dangerBg:T.successBg, border:'none', borderRadius:6, padding:'5px 10px', color:u.is_active?T.danger:T.success, cursor:'pointer', fontSize:12, fontWeight:500 }}>
                          {u.is_active?'Deactivate':'Activate'}
                        </button>
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
        <ModalOverlay>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <h3 style={{ fontSize:17, fontWeight:700, color:T.text }}>✉️ Invite User by Email</h3>
            <button onClick={()=>{setModal('none');resetForm();}} style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:T.textDim }}>✕</button>
          </div>
          <p style={{ fontSize:13, color:T.textMuted, marginBottom:20 }}>An invitation email with a sign-in link will be sent. The user sets their own password.</p>
          <MsgAlert />
          <FormField label="Email Address *" value={fEmail} onChange={setFEmail} type="email" placeholder="user@venusenergyindia.com" fkey="ie" />
          <FormField label="Full Name" value={fName} onChange={setFName} placeholder="Full name (optional)" fkey="in" />
          <RoleSelect value={fRole} onChange={setFRole} />
          <FormField label="Region" value={fRegion} onChange={setFRegion} placeholder="e.g. Tamil Nadu" fkey="ir" />
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
        <ModalOverlay>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <h3 style={{ fontSize:17, fontWeight:700, color:T.text }}>+ Create User with Password</h3>
            <button onClick={()=>{setModal('none');resetForm();}} style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:T.textDim }}>✕</button>
          </div>
          <p style={{ fontSize:13, color:T.textMuted, marginBottom:20 }}>Create a user account and share the temporary password manually.</p>
          <MsgAlert />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
            <FormField label="Full Name" value={fName} onChange={setFName} placeholder="Full name" fkey="cn" />
            <FormField label="Email Address *" value={fEmail} onChange={setFEmail} type="email" placeholder="user@venusenergyindia.com" fkey="ce" />
            <FormField label="Temporary Password *" value={fPassword} onChange={setFPassword} type="password" placeholder="Min. 8 characters" fkey="cp" />
            <FormField label="Phone" value={fPhone} onChange={setFPhone} placeholder="+91 98765 43210" fkey="cph" />
            <FormField label="Designation" value={fDesig} onChange={setFDesig} placeholder="Site Engineer" fkey="cd" />
            <FormField label="Region" value={fRegion} onChange={setFRegion} placeholder="Tamil Nadu" fkey="cr" />
          </div>
          <RoleSelect value={fRole} onChange={setFRole} />
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
        <ModalOverlay>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <h3 style={{ fontSize:17, fontWeight:700, color:T.text }}>✏️ Edit User</h3>
            <button onClick={()=>{setModal('none');resetForm();}} style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:T.textDim }}>✕</button>
          </div>
          <MsgAlert />
          <FormField label="Email" value={fEmail} onChange={()=>{}} readOnly fkey="ee" />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
            <FormField label="Full Name" value={fName} onChange={setFName} fkey="eName" />
            <FormField label="Phone" value={fPhone} onChange={setFPhone} fkey="ePhone" />
            <FormField label="Designation" value={fDesig} onChange={setFDesig} fkey="eDesig" />
            <FormField label="Region" value={fRegion} onChange={setFRegion} fkey="eRegion" />
          </div>
          <RoleSelect value={fRole} onChange={setFRole} />
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
    </Layout>
  );
}
