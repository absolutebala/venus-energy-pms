import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '@/context/AuthContext';
import { T, inputStyle } from '@/lib/theme';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, user, loading } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [busy, setBusy]         = useState(false);
  const [showPwd, setShowPwd]   = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setBusy(true);
    setError('');
    const { error: err } = await signIn(email, password);
    setBusy(false);
    if (err) setError(err);
    else router.replace('/dashboard');
  };

  return (
    <>
      <Head><title>Sign In — Venus Energy PMS</title></Head>
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, #F0FDFA 0%, #E8F5F3 40%, #F8FAFC 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        fontFamily: "'Inter', sans-serif",
      }}>

        {/* Decorative circles */}
        <div style={{ position: 'fixed', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: `${T.primary}12`, pointerEvents: 'none' }} />
        <div style={{ position: 'fixed', bottom: -100, left: -60, width: 260, height: 260, borderRadius: '50%', background: `${T.primary}0A`, pointerEvents: 'none' }} />

        <div style={{ width: '100%', maxWidth: 420 }}>
          {/* Logo card */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              width: 56, height: 56,
              background: `linear-gradient(135deg, ${T.primary}, #0F766E)`,
              borderRadius: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, margin: '0 auto 14px',
              boxShadow: `0 8px 25px ${T.primary}35`,
            }}>⚡</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, marginBottom: 4 }}>Venus Energy</h1>
            <p style={{ fontSize: 13, color: T.textMuted }}>Project Management System</p>
          </div>

          {/* Form card */}
          <div style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 16,
            padding: 32,
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 6 }}>Sign in to your account</h2>
            <p style={{ fontSize: 13, color: T.textMuted, marginBottom: 24 }}>Enter your credentials to access the dashboard.</p>

            {error && (
              <div style={{
                background: T.dangerBg, border: `1px solid #FECACA`,
                borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                fontSize: 13, color: T.danger, display: 'flex', alignItems: 'center', gap: 8,
              }}>⚠️ {error}</div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 6 }}>
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="you@venusenergyindia.com"
                  autoComplete="email"
                  style={inputStyle(focusedField === 'email')}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Password</label>
                  <button
                    type="button"
                    onClick={() => {/* TODO: forgot password flow */}}
                    style={{ fontSize: 12, color: T.primary, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                    Forgot password?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    style={{ ...inputStyle(focusedField === 'password'), paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(s => !s)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: T.textDim,
                    }}>
                    {showPwd ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                style={{
                  width: '100%',
                  background: busy ? '#5EEAD4' : T.primary,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 9,
                  padding: '11px 0',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: busy ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'background 0.15s',
                  boxShadow: busy ? 'none' : `0 4px 14px ${T.primary}40`,
                }}>
                {busy ? <><div className="spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> Signing in…</> : '→  Sign In'}
              </button>
            </form>
          </div>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: T.textDim }}>
            © 2025 Venus Energy Pvt. Ltd. · All rights reserved.
          </p>
        </div>
      </div>
    </>
  );
}
