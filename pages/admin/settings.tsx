import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { T, btnPrimary } from '@/lib/theme';
import { createClient } from '@/lib/supabase';

const ORACLE_KEYS = [
  { key: 'oracle_base_url',       label: 'Oracle Base URL',       placeholder: 'https://your-instance.oraclecloud.com', secret: false },
  { key: 'oracle_token_url',      label: 'Oracle Token URL',      placeholder: 'https://your-instance.oraclecloud.com/oauth/token', secret: false },
  { key: 'oracle_client_id',      label: 'Oracle Client ID',      placeholder: 'Enter client ID', secret: false },
  { key: 'oracle_client_secret',  label: 'Oracle Client Secret',  placeholder: 'Enter client secret', secret: true },
];

function SecretField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.textMuted, marginBottom: 5, textTransform: 'uppercase' as const }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${T.border}`, borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
        <input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          style={{ flex: 1, border: 'none', outline: 'none', padding: '9px 12px', fontSize: 13, color: T.text, background: 'transparent' }} />
        <button type="button" onClick={() => setShow(s => !s)}
          style={{ background: 'none', border: 'none', padding: '0 12px', cursor: 'pointer', fontSize: 15, color: T.textMuted }}>
          {show ? '🙈' : '👁'}
        </button>
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.textMuted, marginBottom: 5, textTransform: 'uppercase' as const }}>{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', border: `1px solid ${T.border}`, borderRadius: 8, padding: '9px 12px', fontSize: 13, color: T.text, outline: 'none', background: '#fff', boxSizing: 'border-box' as const }} />
    </div>
  );
}

export default function AdminSettingsPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [credentials, setCredentials] = useState<Record<string, string>>({
    oracle_base_url: '', oracle_token_url: '', oracle_client_id: '', oracle_client_secret: '',
  });
  const [loadingCreds, setLoadingCreds] = useState(true);
  const [savingCreds, setSavingCreds] = useState(false);
  const [credMsg, setCredMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && profile?.role !== 'super_admin') router.replace('/dashboard');
  }, [authLoading, profile]);

  useEffect(() => {
    (async () => {
      setLoadingCreds(true);
      const { data } = await supabase.from('system_settings').select('key,value').in('key', ORACLE_KEYS.map(k => k.key));
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((r: any) => { map[r.key] = r.value || ''; });
        setCredentials(prev => ({ ...prev, ...map }));
      }
      setLoadingCreds(false);
    })();
  }, []);

  const saveCredentials = async () => {
    setSavingCreds(true); setCredMsg(null);
    try {
      const updatedBy = profile?.full_name || 'super_admin';
      const upserts = ORACLE_KEYS.map(k => ({
        key: k.key, value: credentials[k.key] || '', updated_at: new Date().toISOString(), updated_by: updatedBy,
      }));
      const { error } = await supabase.from('system_settings').upsert(upserts, { onConflict: 'key' });
      if (error) setCredMsg({ type: 'error', text: error.message });
      else setCredMsg({ type: 'success', text: 'Credentials saved successfully!' });
    } catch { setCredMsg({ type: 'error', text: 'Failed to save. Please try again.' }); }
    setSavingCreds(false);
    setTimeout(() => setCredMsg(null), 4000);
  };

  const handleOracleSync = async () => {
    setSyncing(true); setSyncResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/oracle/sync-po', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const json = await res.json();
      if (!res.ok) setSyncResult({ type: 'error', message: json.error || 'Sync failed' });
      else {
        setSyncResult({ type: 'success', message: `${json.created} new PO${json.created !== 1 ? 's' : ''} created, ${json.skipped} skipped` });
        setLastSynced(new Date().toLocaleString('en-IN'));
      }
    } catch { setSyncResult({ type: 'error', message: 'Network error. Please try again.' }); }
    setSyncing(false);
  };

  if (authLoading || profile?.role !== 'super_admin') return null;

  const card: React.CSSProperties = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '20px 24px', marginBottom: 20 };
  const btnSave: React.CSSProperties = { ...btnPrimary, opacity: savingCreds ? 0.7 : 1, cursor: savingCreds ? 'not-allowed' : 'pointer' };

  return (
    <Layout>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 0' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, marginBottom: 4 }}>⚙️ Admin Settings</h1>
          <div style={{ fontSize: 13, color: T.textMuted }}>System configuration and integrations</div>
        </div>

        {/* Oracle Credentials */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ fontSize: 20 }}>🔗</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Oracle ERP Cloud — API Credentials</div>
              <div style={{ fontSize: 12, color: T.textMuted }}>Stored securely in Supabase. Used for Purchase Order sync.</div>
            </div>
          </div>
          <div style={{ height: 1, background: T.border, marginBottom: 16 }} />
          {loadingCreds ? <div style={{ color: T.textMuted, fontSize: 13 }}>Loading saved credentials…</div> : (
            <>
              {ORACLE_KEYS.map(field => field.secret ? (
                <SecretField key={field.key} label={field.label} value={credentials[field.key] || ''} placeholder={field.placeholder}
                  onChange={v => setCredentials(p => ({ ...p, [field.key]: v }))} />
              ) : (
                <TextField key={field.key} label={field.label} value={credentials[field.key] || ''} placeholder={field.placeholder}
                  onChange={v => setCredentials(p => ({ ...p, [field.key]: v }))} />
              ))}
              {credMsg && (
                <div style={{ padding: '9px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13, fontWeight: 600,
                  background: credMsg.type === 'success' ? '#F0FDF4' : '#FEF2F2',
                  color: credMsg.type === 'success' ? '#166534' : '#DC2626',
                  border: `1px solid ${credMsg.type === 'success' ? '#BBF7D0' : '#FECACA'}` }}>
                  {credMsg.type === 'success' ? '✅' : '❌'} {credMsg.text}
                </div>
              )}
              <button onClick={saveCredentials} disabled={savingCreds} style={btnSave}>
                {savingCreds ? 'Saving…' : '💾 Save Credentials'}
              </button>
            </>
          )}
        </div>

        {/* Oracle Sync */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ fontSize: 20 }}>🔄</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Oracle ERP Cloud — PO Sync</div>
              <div style={{ fontSize: 12, color: T.textMuted }}>Sync Purchase Orders from Oracle into the portal. Runs automatically every hour.</div>
            </div>
          </div>
          <div style={{ height: 1, background: T.border, marginBottom: 16 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Sync Direction', value: 'Oracle → Portal (one-way)', icon: '→' },
              { label: 'Auto Sync', value: 'Every hour (Vercel cron)', icon: '⏱' },
              { label: 'Last Manual Sync', value: lastSynced || 'Not yet synced this session', icon: '🕐' },
            ].map(item => (
              <div key={item.label} style={{ background: T.bg, borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{item.icon} {item.value}</div>
              </div>
            ))}
          </div>
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#2563EB', marginBottom: 6 }}>How it works</div>
            <div style={{ fontSize: 12, color: '#1E40AF', lineHeight: 1.7 }}>
              1. Authenticates with Oracle ERP Cloud using credentials saved above<br />
              2. Fetches all Purchase Orders from Oracle FSCM REST API<br />
              3. Creates new projects for each new PO — never overwrites existing data<br />
              4. Logs every sync to the Activities page
            </div>
          </div>
          {syncResult && (
            <div style={{ padding: '9px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13, fontWeight: 600,
              background: syncResult.type === 'success' ? '#F0FDF4' : '#FEF2F2',
              color: syncResult.type === 'success' ? '#166534' : '#DC2626',
              border: `1px solid ${syncResult.type === 'success' ? '#BBF7D0' : '#FECACA'}` }}>
              {syncResult.type === 'success' ? '✅' : '❌'} {syncResult.message}
            </div>
          )}
          <button onClick={handleOracleSync} disabled={syncing} style={{
            background: syncing ? T.bg : '#2563EB', color: syncing ? T.textMuted : '#fff',
            border: `1px solid ${syncing ? T.border : '#2563EB'}`, borderRadius: 8,
            padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: syncing ? 'not-allowed' : 'pointer' }}>
            {syncing ? '⏳ Syncing from Oracle…' : '🔄 Sync Purchase Orders Now'}
          </button>
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 8 }}>Only new POs will be created. Existing projects will never be overwritten.</div>
        </div>

        {/* Backup Info */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ fontSize: 20 }}>☁️</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Cloudflare R2 Backup</div>
              <div style={{ fontSize: 12, color: T.textMuted }}>Automated weekly backup of all portal data</div>
            </div>
          </div>
          <div style={{ height: 1, background: T.border, marginBottom: 16 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[
              { label: 'Schedule', value: 'Every Monday at 2AM UTC', icon: '📅' },
              { label: 'Tables Backed Up', value: '14 tables (all data)', icon: '🗄️' },
              { label: 'Supabase Backup', value: 'Daily (Pro plan)', icon: '🛡️' },
            ].map(item => (
              <div key={item.label} style={{ background: T.bg, borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{item.icon} {item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
