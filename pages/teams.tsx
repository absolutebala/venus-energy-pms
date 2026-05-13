import React, { useState } from 'react';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { T, card, badge, th, td, btnPrimary, btnSecondary, inputStyle } from '@/lib/theme';
import { ROLE_LABELS, UserRole } from '@/types';
import { TEAM_MEMBERS } from '@/lib/teamData';

// Roles available for team creation (no super_admin)
const ASSIGNABLE_ROLES: UserRole[] = ['region_manager','project_manager','site_engineer','viewer'];
const EXTENDED_ROLES = [...ASSIGNABLE_ROLES, 'accounting_team' as UserRole];

const ROLE_LABELS_EXT: Record<string,string> = {
  ...ROLE_LABELS,
  accounting_team: 'Accounting Team',
};

const REGIONS = ['Tamil Nadu','Karnataka','Telangana','Maharashtra','Delhi','Kerala','West Bengal','Gujarat','Rajasthan','Head Office'];

const emptyForm = () => ({ full_name:'', email:'', phone:'', designation:'', role:'project_manager' as UserRole, region:'Tamil Nadu' });


// ── Isolated form component — prevents cursor jump on keystroke ──
interface TeamFormProps {
  initial: ReturnType<typeof emptyForm>;
  editMember: any;
  onSave: (form: ReturnType<typeof emptyForm>) => void;
  onClose: () => void;
  saving: boolean;
}

function TeamMemberForm({ initial, editMember, onSave, onClose, saving }: TeamFormProps) {
  const [form, setForm] = React.useState(initial);

  const inp = (label: string, field: string, type='text', placeholder='', readOnly=false) => (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:5 }}>{label}</label>
      <input
        type={type}
        value={(form as any)[field]}
        onChange={e => { const v = e.target.value; setForm(p => ({ ...p, [field]: v })); }}
        placeholder={placeholder}
        readOnly={readOnly}
        style={{ ...inputStyle(), width:'100%', boxSizing:'border-box' as const, ...(readOnly?{background:T.bg,color:T.textMuted,cursor:'not-allowed'}:{}) }}
      />
    </div>
  );

  const sel = (label: string, field: string, options: string[]) => (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:5 }}>{label}</label>
      <select value={(form as any)[field]} onChange={e => { const v = e.target.value; setForm(p => ({ ...p, [field]: v })); }} style={{ ...inputStyle(), width:'100%' }}>
        {options.map(o => <option key={o} value={o}>{ROLE_LABELS_EXT[o] || o}</option>)}
      </select>
    </div>
  );

  return (
    <>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
        <div style={{ gridColumn:'1/-1' }}>{inp('Full Name *', 'full_name', 'text', 'Full name')}</div>
        {inp('Email Address *', 'email', 'email', 'email@venusenergy.com', !!editMember)}
        {inp('Phone', 'phone', 'text', '9876543210')}
        {sel('Role *', 'role', EXTENDED_ROLES)}
        {sel('Region', 'region', REGIONS)}
        <div style={{ gridColumn:'1/-1' }}>{inp('Designation', 'designation', 'text', 'e.g. Project Manager')}</div>
      </div>
      {!editMember && (
        <div style={{ background:T.infoBg, border:'1px solid #BFDBFE', borderRadius:8, padding:'10px 14px', marginBottom:14, fontSize:12, color:T.info }}>
          ℹ️ An invitation email will be sent to the user after creation.
        </div>
      )}
      <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:8 }}>
        <button onClick={onClose} style={btnSecondary}>Cancel</button>
        <button onClick={() => onSave(form)} disabled={saving} style={{ ...btnPrimary, opacity:saving?0.8:1, minWidth:130 }}>
          {saving ? <><div className="spinner" style={{ borderTopColor:'#fff', borderColor:'rgba(255,255,255,0.3)', width:14, height:14 }} /> Saving…</> : editMember ? '💾 Update' : '+ Add Member'}
        </button>
      </div>
    </>
  );
}

export default function TeamsPage() {
  const [members, setMembers]     = useState(TEAM_MEMBERS);
  const [search, setSearch]       = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [focused, setFocused]     = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editMember, setEditMember] = useState<any>(null);
  const [form, setForm]           = useState(emptyForm());
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState<{msg:string;type:'success'|'error'|'info'}|null>(null);

  const filtered = members.filter(m => {
    if (roleFilter !== 'all' && m.role !== roleFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return m.full_name.toLowerCase().includes(s) || m.email.toLowerCase().includes(s);
    }
    return true;
  });

  const openNew  = () => { setForm(emptyForm()); setEditMember(null); setShowModal(true); };
  const openEdit = (m: any) => { setForm({ full_name:m.full_name, email:m.email, phone:m.phone, designation:m.designation, role:m.role, region:m.region }); setEditMember(m); setShowModal(true); };

  const handleSave = (form: ReturnType<typeof emptyForm>) => {
    if (!form.full_name || !form.email) { setToast({ msg:'Name and email are required.', type:'error' }); return; }
    setSaving(true);
    setTimeout(() => {
      if (editMember) {
        setMembers(prev => prev.map(m => m.id===editMember.id ? { ...m, ...form } : m));
        setToast({ msg:'Team member updated!', type:'success' });
      } else {
        const newId = `TM-0${String(members.length+1).padStart(2,'0')}`;
        setMembers(prev => [...prev, { id:newId, ...form, is_active:true }]);
        setToast({ msg:`${form.full_name} added to team. Send invitation to grant access.`, type:'success' });
      }
      setSaving(false); setShowModal(false);
    }, 600);
  };

  const toggleActive = (m: any) => {
    setMembers(prev => prev.map(x => x.id===m.id ? { ...x, is_active:!x.is_active } : x));
    setToast({ msg:`${m.full_name} ${m.is_active?'deactivated':'activated'}.`, type:'info' });
  };

  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting]         = useState(false);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setTimeout(() => {
      setMembers(prev => prev.filter(m => m.id !== deleteTarget.id));
      setToast({ msg:`${deleteTarget.full_name} has been deleted.`, type:'info' });
      setDeleting(false);
      setDeleteTarget(null);
    }, 400);
  };

  const roleSummary = EXTENDED_ROLES.map(r => ({ role:r, label:ROLE_LABELS_EXT[r], count:members.filter(m=>m.role===r).length }));

  // F is defined outside component to prevent re-render cursor loss

  return (
    <Layout>
      <div className="fade-in">
        {/* Summary cards */}
        <div style={{ display:'grid', gridTemplateColumns:`repeat(${EXTENDED_ROLES.length+1},1fr)`, gap:12, marginBottom:20 }}>
          <div style={{ ...card, position:'relative', overflow:'hidden', padding:'14px 16px' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:T.primary }} />
            <div style={{ fontSize:11, color:T.textMuted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>Total Members</div>
            <div style={{ fontSize:26, fontWeight:700, color:T.text }}>{members.length}</div>
          </div>
          {roleSummary.map((s,i) => (
            <div key={i} onClick={()=>setRoleFilter(roleFilter===s.role?'all':s.role)}
              style={{ ...card, position:'relative', overflow:'hidden', padding:'14px 16px', cursor:'pointer', borderColor:roleFilter===s.role?T.primary:T.border, transition:'all 0.15s' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:T.primary, opacity:roleFilter===s.role?1:0.3 }} />
              <div style={{ fontSize:10, color:T.textMuted, textTransform:'uppercase', letterSpacing:0.4, marginBottom:4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.label}</div>
              <div style={{ fontSize:24, fontWeight:700, color:roleFilter===s.role?T.primary:T.text }}>{s.count}</div>
            </div>
          ))}
        </div>

        <div style={card}>
          <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:16, flexWrap:'wrap' }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} placeholder="Search by name or email…" style={{ ...inputStyle(focused), width:240 }} />
            <select value={roleFilter} onChange={e=>setRoleFilter(e.target.value)} style={{ ...inputStyle(), width:'auto' }}>
              <option value="all">All Roles</option>
              {EXTENDED_ROLES.map(r=><option key={r} value={r}>{ROLE_LABELS_EXT[r]}</option>)}
            </select>
            <div style={{ marginLeft:'auto' }}>
              <button onClick={openNew} style={btnPrimary}>+ Add Team Member</button>
            </div>
          </div>

          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%' }}>
              <thead>
                <tr>{['#','Name','Email','Phone','Role','Region','Designation','Status','Actions'].map(h=><th key={h} style={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.length===0 ? (
                  <tr><td colSpan={9} style={{ ...td, textAlign:'center', padding:40, color:T.textDim }}>No members found.</td></tr>
                ) : filtered.map((m,i) => (
                  <tr key={i}
                    onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background=T.bg}
                    onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background='transparent'}>
                    <td style={{ ...td, color:T.textDim }}>{i+1}</td>
                    <td style={{ ...td, color:T.text, fontWeight:600 }}>{m.full_name}</td>
                    <td style={{ ...td, color:T.primary, fontSize:12 }}>{m.email}</td>
                    <td style={td}>{m.phone}</td>
                    <td style={td}>
                      <span style={{ fontSize:11, fontWeight:600, color:T.primary, background:T.primaryLight, padding:'3px 9px', borderRadius:20 }}>
                        {ROLE_LABELS_EXT[m.role] || m.role}
                      </span>
                    </td>
                    <td style={td}>{m.region}</td>
                    <td style={td}>{m.designation}</td>
                    <td style={td}><span style={badge(m.is_active?'Active':'Inactive')}>{m.is_active?'Active':'Inactive'}</span></td>
                    <td style={td}>
                      <div style={{ display:'flex', gap:5 }}>
                        <button onClick={()=>openEdit(m)} style={{ background:T.primaryLight, border:'none', borderRadius:5, padding:'4px 8px', color:T.primary, cursor:'pointer', fontSize:12 }}>✏️</button>
                        <button onClick={()=>toggleActive(m)} style={{ background:m.is_active?'#FEF2F2':T.successBg, border:'none', borderRadius:5, padding:'4px 8px', color:m.is_active?T.danger:T.success, cursor:'pointer', fontSize:11, fontWeight:500 }}>
                          {m.is_active?'Deactivate':'Activate'}
                        </button>
                        <button onClick={()=>setDeleteTarget(m)} style={{ background:'#FEF2F2', border:'none', borderRadius:5, padding:'4px 8px', color:T.danger, cursor:'pointer', fontSize:11, fontWeight:500 }}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding:'10px 0', borderTop:`1px solid ${T.border}`, fontSize:11, color:T.textDim, marginTop:4 }}>
            Showing {filtered.length} of {members.length} team members
          </div>
        </div>

        {/* Add / Edit Modal */}
        {showModal && (
          <Modal title={editMember ? `Edit — ${editMember.full_name}` : '+ Add Team Member'} onClose={() => setShowModal(false)} width={500}>
            <TeamMemberForm
              key={editMember?.id || 'new'}
              initial={form}
              editMember={editMember}
              onSave={handleSave}
              onClose={() => setShowModal(false)}
              saving={saving}
            />
          </Modal>
        )}

        {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

        {deleteTarget && (
          <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.5)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
            <div style={{ background:T.surface, borderRadius:16, padding:28, width:'100%', maxWidth:440, boxShadow:'0 20px 60px rgba(0,0,0,0.18)' }}>
              <h3 style={{ fontSize:16, fontWeight:700, color:T.text, marginBottom:10 }}>🗑 Delete Team Member</h3>
              <p style={{ fontSize:13, color:T.textMuted, marginBottom:20 }}>
                Are you sure you want to delete <strong style={{ color:T.text }}>{deleteTarget.full_name}</strong>? This cannot be undone.
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
      </div>
    </Layout>
  );
}
