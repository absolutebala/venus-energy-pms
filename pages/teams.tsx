import React, { useState } from 'react';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { T, card, badge, th, td, btnPrimary, btnSecondary, inputStyle } from '@/lib/theme';
import { ROLE_LABELS, UserRole } from '@/types';

export const TEAM_MEMBERS = [
  { id:'TM-001', full_name:'Ramesh Kumar',  email:'ramesh@venusenergy.com',  phone:'9876543210', role:'region_manager'  as UserRole, region:'Tamil Nadu',    designation:'Regional Manager',  is_active:true  },
  { id:'TM-002', full_name:'Amit Sharma',   email:'amit@venusenergy.com',    phone:'9876543211', role:'region_manager'  as UserRole, region:'Maharashtra',   designation:'Regional Manager',  is_active:true  },
  { id:'TM-003', full_name:'Arun Kumar',    email:'arun@venusenergy.com',    phone:'9876543212', role:'project_manager' as UserRole, region:'Tamil Nadu',    designation:'Project Manager',   is_active:true  },
  { id:'TM-004', full_name:'Vijay Kumar',   email:'vijay@venusenergy.com',   phone:'9876543213', role:'project_manager' as UserRole, region:'Telangana',     designation:'Project Manager',   is_active:true  },
  { id:'TM-005', full_name:'Priya Sharma',  email:'priya@venusenergy.com',   phone:'9876543214', role:'project_manager' as UserRole, region:'Karnataka',     designation:'Project Manager',   is_active:true  },
  { id:'TM-006', full_name:'Pooja Mehta',   email:'pooja@venusenergy.com',   phone:'9876543215', role:'project_manager' as UserRole, region:'Maharashtra',   designation:'Project Manager',   is_active:true  },
  { id:'TM-007', full_name:'Suresh Patel',  email:'suresh@venusenergy.com',  phone:'9876543216', role:'site_engineer'  as UserRole, region:'Tamil Nadu',    designation:'Site Engineer',     is_active:true  },
  { id:'TM-008', full_name:'Rajeev Singh',  email:'rajeev@venusenergy.com',  phone:'9876543217', role:'site_engineer'  as UserRole, region:'Delhi',         designation:'Site Engineer',     is_active:true  },
  { id:'TM-009', full_name:'Neha Verma',    email:'neha@venusenergy.com',    phone:'9876543218', role:'viewer'         as UserRole, region:'West Bengal',   designation:'Operations Lead',   is_active:true  },
  { id:'TM-010', full_name:'Deepak Nair',   email:'deepak@venusenergy.com',  phone:'9876543219', role:'accounting_team' as UserRole, region:'Head Office', designation:'Accounts Executive',is_active:false },
];

// Roles available for team creation (no super_admin)
const ASSIGNABLE_ROLES: UserRole[] = ['region_manager','project_manager','site_engineer','viewer'];
const EXTENDED_ROLES = [...ASSIGNABLE_ROLES, 'accounting_team' as UserRole];

const ROLE_LABELS_EXT: Record<string,string> = {
  ...ROLE_LABELS,
  accounting_team: 'Accounting Team',
};

const REGIONS = ['Tamil Nadu','Karnataka','Telangana','Maharashtra','Delhi','Kerala','West Bengal','Gujarat','Rajasthan','Head Office'];

const emptyForm = () => ({ full_name:'', email:'', phone:'', designation:'', role:'project_manager' as UserRole, region:'Tamil Nadu' });

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

  const handleSave = () => {
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

  const roleSummary = EXTENDED_ROLES.map(r => ({ role:r, label:ROLE_LABELS_EXT[r], count:members.filter(m=>m.role===r).length }));

  const F = ({ label, children }: { label:string; children:React.ReactNode }) => (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:5 }}>{label}</label>
      {children}
    </div>
  );

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
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
              <div style={{ gridColumn:'1/-1' }}>
                <F label="Full Name *">
                  <input value={form.full_name} onChange={e=>setForm(f=>({...f,full_name:e.target.value}))} placeholder="Full name" style={{ ...inputStyle(), width:'100%', boxSizing:'border-box' as const }} />
                </F>
              </div>
              <F label="Email Address *">
                <input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="email@venusenergy.com" readOnly={!!editMember} style={{ ...inputStyle(), width:'100%', boxSizing:'border-box' as const, ...(editMember?{background:T.bg,color:T.textMuted,cursor:'not-allowed'}:{}) }} />
              </F>
              <F label="Phone">
                <input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="9876543210" style={{ ...inputStyle(), width:'100%', boxSizing:'border-box' as const }} />
              </F>
              <F label="Role *">
                <select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value as UserRole}))} style={{ ...inputStyle(), width:'100%' }}>
                  {EXTENDED_ROLES.map(r=><option key={r} value={r}>{ROLE_LABELS_EXT[r]}</option>)}
                </select>
              </F>
              <F label="Region">
                <select value={form.region} onChange={e=>setForm(f=>({...f,region:e.target.value}))} style={{ ...inputStyle(), width:'100%' }}>
                  {REGIONS.map(r=><option key={r}>{r}</option>)}
                </select>
              </F>
              <F label="Designation">
                <input value={form.designation} onChange={e=>setForm(f=>({...f,designation:e.target.value}))} placeholder="e.g. Project Manager" style={{ ...inputStyle(), width:'100%', boxSizing:'border-box' as const }} />
              </F>
            </div>
            {!editMember && (
              <div style={{ background:T.infoBg, border:`1px solid #BFDBFE`, borderRadius:8, padding:'10px 14px', marginBottom:14, fontSize:12, color:T.info }}>
                ℹ️ An invitation email will be sent to the user after creation.
              </div>
            )}
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:8 }}>
              <button onClick={() => setShowModal(false)} style={btnSecondary}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, opacity:saving?0.8:1, minWidth:130 }}>
                {saving ? <><div className="spinner" style={{ borderTopColor:'#fff', borderColor:'rgba(255,255,255,0.3)', width:14, height:14 }} /> Saving…</> : editMember ? '💾 Update' : '+ Add Member'}
              </button>
            </div>
          </Modal>
        )}

        {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </Layout>
  );
}
