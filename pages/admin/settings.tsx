import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { useTheme } from '@/lib/theme';
import { createClient } from '@/lib/supabase';

export default function AdminSettingsPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const T = useTheme();
  const supabase = createClient();

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  React.useEffect(() => {
    if (!authLoading && profile?.role !== 'super_admin') router.replace('/dashboard');
  }, [authLoading, profile]);

  const card: React.CSSProperties = {
    background: T.surface, border: `1px solid ${T.border}`,
    borderRadius: 12, padding: '20px 24px', marginBottom: 20,
  };

  const handleOracleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/oracle/sync-po', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        setSyncResult({ type: 'error', message: json.error || 'Sync failed' });
      } else {
        const msg = `${json.created} new PO${json.created !== 1 ? 's' : ''} created, ${json.skipped} skipped (already exist)`;
        setSyncResult({ type: 'success', message: msg });
        setLastSynced(new Date().toLocaleString('en-IN'));
      }
    } catch {
      setSyncResult({ type: 'error', message: 'Network error. Please try again.' });
    }
    setSyncing(false);
  };

  if (authLoading || profile?.role !== 'super_admin') return null;

  return (
    <Layout>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 0' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, marginBottom: 4 }}>⚙️ Admin Settings</h1>
          <div style={{ fontSize: 13, color: T.textMuted }}>System configuration and integrations</div>
        </div>

        {/* ── Oracle ERP Integration ── */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ fontSize: 20 }}>🔗</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Oracle ERP Cloud Integration</div>
              <div style={{ fontSize: 12, color: T.textMuted }}>Sync Purchase Orders from Oracle ERP Cloud into Venus Energy PMS</div>
            </div>
          </div>

          <div style={{ height: 1, background: T.border, margin: '16px 0' }} />

          {/* Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
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

          {/* How it works */}
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#2563EB', marginBottom: 8 }}>How it works</div>
            <div style={{ fontSize: 12, color: '#1E40AF', lineHeight: 1.7 }}>
              1. Authenticates with Oracle ERP Cloud using OAuth 2.0 (credentials stored in Vercel env vars)<br />
              2. Fetches all Purchase Orders from Oracle FSCM REST API<br />
              3. Compares with existing projects — skips any PO already in the portal<br />
              4. Creates new projects for each new PO with PO Number, Date, Value, Vendor, Site, PM and Status<br />
              5. Logs each sync to the Activities page
            </div>
          </div>

          {/* Env vars checklist */}
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#92400E', marginBottom: 8 }}>⚠️ Required Environment Variables (set in Vercel)</div>
            {[
              'ORACLE_BASE_URL',
              'ORACLE_CLIENT_ID',
              'ORACLE_CLIENT_SECRET',
              'ORACLE_TOKEN_URL',
            ].map(v => (
              <div key={v} style={{ fontSize: 12, color: '#78350F', fontFamily: 'monospace', marginBottom: 3 }}>• {v}</div>
            ))}
          </div>

          {/* Sync result */}
          {syncResult && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 600,
              background: syncResult.type === 'success' ? '#F0FDF4' : '#FEF2F2',
              color: syncResult.type === 'success' ? '#166534' : '#DC2626',
              border: `1px solid ${syncResult.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
            }}>
              {syncResult.type === 'success' ? '✅' : '❌'} {syncResult.message}
            </div>
          )}

          {/* Manual sync button */}
          <button onClick={handleOracleSync} disabled={syncing} style={{
            background: syncing ? T.bg : '#2563EB', color: syncing ? T.textMuted : '#fff',
            border: `1px solid ${syncing ? T.border : '#2563EB'}`, borderRadius: 8,
            padding: '10px 24px', fontSize: 14, fontWeight: 600,
            cursor: syncing ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
          }}>
            {syncing ? '⏳ Syncing from Oracle…' : '🔄 Sync Purchase Orders Now'}
          </button>
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 8 }}>
            Only new POs will be created. Existing projects in the portal will never be overwritten.
          </div>
        </div>

        {/* ── Backup ── */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ fontSize: 20 }}>☁️</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Cloudflare R2 Backup</div>
              <div style={{ fontSize: 12, color: T.textMuted }}>Automated weekly backup of all portal data to Cloudflare R2</div>
            </div>
          </div>
          <div style={{ height: 1, background: T.border, margin: '16px 0' }} />
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
