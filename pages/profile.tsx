import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase';
import { T, card, inputStyle, btnPrimary, btnSecondary, badge } from '@/lib/theme';
import { ROLE_LABELS } from '@/types';

function Field({ label, value, type='text', onChange, placeholder, focusKey, focused, onFocus, onBlur, readOnly=false }: any) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 6 }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        onFocus={() => onFocus?.(focusKey)}
        onBlur={() => onBlur?.()}
        placeholder={placeholder}
        readOnly={readOnly}
        style={{ ...inputStyle(focused === focusKey), ...(readOnly ? { background: T.bg, color: T.textMuted, cursor: 'not-allowed' } : {}) }}
      />
    </div>
  );
}

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const supabase = createClient();

  const [fullName,    setFullName]    = useState('');
  const [phone,       setPhone]       = useState('');
  const [designation, setDesignation] = useState('');
  const [department,  setDepartment]  = useState('');
  const [region,      setRegion]      = useState('');
  const [saving,      setSaving]      = useState(false);
  const [profileMsg,  setProfileMsg]  = useState<{ type: 'success'|'error'; text: string } | null>(null);

  const [curPwd,  setCurPwd]  = useState('');
  const [newPwd,  setNewPwd]  = useState('');
  const [confPwd, setConfPwd] = useState('');
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdMsg,  setPwdMsg]  = useState<{ type: 'success'|'error'; text: string } | null>(null);
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [focused, setFocused] = useState<string|null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setDesignation(profile.designation || '');
      setDepartment(profile.department || '');
      setRegion(profile.region || '');
    }
  }, [profile]);

  const saveProfile = async () => {
    setSaving(true);
    setProfileMsg(null);
    const { error } = await supabase.from('profiles').update({
      full_name: fullName, phone, designation, department, region,
      updated_at: new Date().toISOString(),
    }).eq('id', profile!.id);
    setSaving(false);
    if (error) setProfileMsg({ type: 'error', text: error.message });
    else { setProfileMsg({ type: 'success', text: 'Profile updated successfully!' }); refreshProfile(); }
    setTimeout(() => setProfileMsg(null), 4000);
  };

  const changePassword = async () => {
    setPwdMsg(null);
    if (!curPwd) { setPwdMsg({ type: 'error', text: 'Please enter your current password.' }); return; }
    if (newPwd.length < 8) { setPwdMsg({ type: 'error', text: 'New password must be at least 8 characters.' }); return; }
    if (newPwd !== confPwd) { setPwdMsg({ type: 'error', text: 'New passwords do not match.' }); return; }

    setPwdBusy(true);
    // Re-authenticate then update
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: profile!.email, password: curPwd });
    if (signInErr) { setPwdBusy(false); setPwdMsg({ type: 'error', text: 'Current password is incorrect.' }); return; }

    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setPwdBusy(false);
    if (error) setPwdMsg({ type: 'error', text: error.message });
    else { setPwdMsg({ type: 'success', text: 'Password changed successfully!' }); setCurPwd(''); setNewPwd(''); setConfPwd(''); }
    setTimeout(() => setPwdMsg(null), 4000);
  };

  const Alert = ({ msg }: { msg: { type: 'success'|'error'; text: string } }) => (
    <div style={{
      padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16,
      background: msg.type === 'success' ? T.successBg : T.dangerBg,
      border: `1px solid ${msg.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
      color: msg.type === 'success' ? T.success : T.danger,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      {msg.type === 'success' ? '✅' : '⚠️'} {msg.text}
    </div>
  );

  return (
    <Layout>
      <div className="fade-in" style={{ maxWidth: 760, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: `linear-gradient(135deg, ${T.primary}, #0F766E)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 24, fontWeight: 700,
            boxShadow: `0 4px 14px ${T.primary}40`,
          }}>
            {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text }}>{profile?.full_name || 'User'}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={badge('Active')}>Active</span>
              <span style={{ fontSize: 12, color: T.textMuted }}>
                {ROLE_LABELS[profile?.role as keyof typeof ROLE_LABELS] || profile?.role}
              </span>
              {profile?.region && <span style={{ fontSize: 12, color: T.textMuted }}>· {profile.region}</span>}
            </div>
          </div>
        </div>

        {/* Personal Info */}
        <div style={{ ...card, marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 4 }}>Personal Information</div>
          <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 20 }}>Update your name, contact, and work details.</div>

          {profileMsg && <Alert msg={profileMsg} />}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            <Field label="Full Name" value={fullName} onChange={setFullName} placeholder="John Doe" focusKey="name" focused={focused} onFocus={setFocused} onBlur={() => setFocused(null)} />
            <Field label="Email Address" value={profile?.email || ''} readOnly focusKey="email" focused={focused} onFocus={setFocused} onBlur={() => setFocused(null)} />
            <Field label="Phone Number" value={phone} onChange={setPhone} placeholder="+91 98765 43210" focusKey="phone" focused={focused} onFocus={setFocused} onBlur={() => setFocused(null)} />
            <Field label="Designation" value={designation} onChange={setDesignation} placeholder="Project Manager" focusKey="desig" focused={focused} onFocus={setFocused} onBlur={() => setFocused(null)} />
            <Field label="Department" value={department} onChange={setDepartment} placeholder="Engineering" focusKey="dept" focused={focused} onFocus={setFocused} onBlur={() => setFocused(null)} />
            <Field label="Region" value={region} onChange={setRegion} placeholder="Tamil Nadu" focusKey="region" focused={focused} onFocus={setFocused} onBlur={() => setFocused(null)} />
          </div>

          <div style={{ marginTop: 4 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 6 }}>Role</label>
            <input value={ROLE_LABELS[profile?.role as keyof typeof ROLE_LABELS] || profile?.role || ''} readOnly style={{ ...inputStyle(), background: T.bg, color: T.textMuted, cursor: 'not-allowed', width: '100%' }} />
            <p style={{ fontSize: 11, color: T.textDim, marginTop: 4 }}>Role can only be changed by a Super Admin.</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <button onClick={saveProfile} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
              {saving ? <><div className="spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)', width: 14, height: 14 }} /> Saving…</> : '💾 Save Changes'}
            </button>
          </div>
        </div>

        {/* Change Password */}
        <div style={card}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 4 }}>Change Password</div>
          <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 20 }}>Use a strong password of at least 8 characters.</div>

          {pwdMsg && <Alert msg={pwdMsg} />}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 20px' }}>
            {/* Current password */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 6 }}>Current Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showCur ? 'text' : 'password'} value={curPwd} onChange={e => setCurPwd(e.target.value)} onFocus={() => setFocused('curPwd')} onBlur={() => setFocused(null)} placeholder="••••••••" style={{ ...inputStyle(focused === 'curPwd'), paddingRight: 40, width: '100%' }} />
                <button type="button" onClick={() => setShowCur(s => !s)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: T.textDim }}>{showCur ? '🙈' : '👁'}</button>
              </div>
            </div>
            {/* New password */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 6 }}>New Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showNew ? 'text' : 'password'} value={newPwd} onChange={e => setNewPwd(e.target.value)} onFocus={() => setFocused('newPwd')} onBlur={() => setFocused(null)} placeholder="••••••••" style={{ ...inputStyle(focused === 'newPwd'), paddingRight: 40, width: '100%' }} />
                <button type="button" onClick={() => setShowNew(s => !s)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: T.textDim }}>{showNew ? '🙈' : '👁'}</button>
              </div>
            </div>
            {/* Confirm */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 6 }}>Confirm New Password</label>
              <input type="password" value={confPwd} onChange={e => setConfPwd(e.target.value)} onFocus={() => setFocused('confPwd')} onBlur={() => setFocused(null)} placeholder="••••••••" style={{ ...inputStyle(focused === 'confPwd'), width: '100%' }} />
            </div>
          </div>

          {/* Strength meter */}
          {newPwd.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Password strength: {newPwd.length >= 12 ? '💪 Strong' : newPwd.length >= 8 ? '👍 Good' : '⚠️ Too short'}</div>
              <div style={{ height: 4, background: T.border, borderRadius: 2 }}>
                <div style={{ height: '100%', borderRadius: 2, transition: 'width 0.2s', background: newPwd.length >= 12 ? T.success : newPwd.length >= 8 ? T.warning : T.danger, width: `${Math.min((newPwd.length / 16) * 100, 100)}%` }} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={changePassword} disabled={pwdBusy} style={{ ...btnPrimary, opacity: pwdBusy ? 0.7 : 1 }}>
              {pwdBusy ? <><div className="spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)', width: 14, height: 14 }} /> Updating…</> : '🔒 Update Password'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
