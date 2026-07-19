import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { T } from '@/lib/theme';
import { createClient } from '@/lib/supabase';

const card: React.CSSProperties = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 };

export default function BackupsPage() {
  const { profile, loading: authLoading } = useAuth();
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (profile?.role !== 'super_admin') return;
    fetchBackups();
  }, [authLoading, profile]);

  const getToken = async () => {
    const { data: { session } } = await createClient().auth.getSession();
    return session?.access_token || '';
  };

  const fetchBackups = async () => {
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      const res = await fetch('/api/backup/list', { headers: { Authorization: `Bearer ${token}` } });
      const text = await res.text();
      let json: any;
      try { json = JSON.parse(text); } catch { setError('API error: ' + text.slice(0, 200)); return; }
      if (!res.ok) { setError(json.error || 'Failed to load backups'); return; }
      setBackups(json.backups || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadBackup = async (key: string, name: string) => {
    setDownloading(key);
    try {
      const token = await getToken();
      const res = await fetch(`/api/backup/download?key=${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (!res.ok) { setToast({ msg: '❌ ' + json.error, type: 'error' }); return; }
      // Trigger download
      const a = document.createElement('a');
      a.href = json.url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setToast({ msg: '✅ Download started', type: 'success' });
    } catch (e: any) {
      setToast({ msg: '❌ ' + e.message, type: 'error' });
    } finally {
      setDownloading(null);
    }
  };

  const fmtSize = (bytes?: number) => {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  const fmtDate = (d?: Date | string) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return String(d); }
  };

  if (!authLoading && profile?.role !== 'super_admin') {
    return <Layout><div style={{ padding: 40, color: T.danger }}>Access denied — Super Admin only.</div></Layout>;
  }

  return (
    <Layout>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toast.type === 'error' ? '#FEF2F2' : '#F0FDF4',
          border: `1px solid ${toast.type === 'error' ? '#FECACA' : '#BBF7D0'}`,
          color: toast.type === 'error' ? '#DC2626' : '#16A34A',
          borderRadius: 10, padding: '12px 20px', fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          {toast.msg}
          <span onClick={() => setToast(null)} style={{ marginLeft: 12, cursor: 'pointer', opacity: 0.6 }}>✕</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: T.text, margin: 0 }}>🗄️ Database Backups</h2>
          <p style={{ fontSize: 13, color: T.textMuted, margin: '4px 0 0' }}>Weekly automated backups stored in Cloudflare R2</p>
        </div>
        <button onClick={fetchBackups} disabled={loading}
          style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${T.border}`, background: '#fff',
            color: T.primary, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          🔄 Refresh
        </button>
      </div>

      <div style={card}>
        {loading ? (
          <div style={{ color: T.textMuted, textAlign: 'center', padding: 40 }}>Loading backups...</div>
        ) : error ? (
          <div style={{ color: T.danger, padding: 20 }}>❌ {error}</div>
        ) : backups.length === 0 ? (
          <div style={{ color: T.textMuted, textAlign: 'center', padding: 40 }}>No backups found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['#', 'Backup File', 'Date & Time', 'Size', 'Action'].map((h, i) => (
                  <th key={i} style={{ padding: '10px 12px', fontSize: 11, fontWeight: 700,
                    textTransform: 'uppercase', color: T.primary, background: T.primaryLight,
                    textAlign: 'left', borderBottom: `2px solid ${T.primaryMid}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {backups.map((b, i) => (
                <tr key={b.key} style={{ background: i % 2 === 0 ? '#fff' : T.bg }}>
                  <td style={{ padding: '12px', color: T.textMuted, fontSize: 12 }}>{i + 1}</td>
                  <td style={{ padding: '12px', fontWeight: 600, color: T.text, fontSize: 13 }}>
                    🗃️ {b.name}
                  </td>
                  <td style={{ padding: '12px', color: T.textMuted, fontSize: 13 }}>
                    {fmtDate(b.lastModified)}
                  </td>
                  <td style={{ padding: '12px', color: T.textMuted, fontSize: 13 }}>
                    {fmtSize(b.size)}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <button
                      onClick={() => downloadBackup(b.key, b.name)}
                      disabled={downloading === b.key}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                        color: '#166534', background: '#DCFCE7', border: '1px solid #86EFAC',
                        cursor: downloading === b.key ? 'not-allowed' : 'pointer',
                        opacity: downloading === b.key ? 0.7 : 1 }}>
                      {downloading === b.key ? '⏳ Preparing...' : '⬇️ Download'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ ...card, background: T.primaryLight, border: `1px solid ${T.primaryMid}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.primary, marginBottom: 6 }}>ℹ️ About Backups</div>
        <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.6 }}>
          Backups run automatically every Monday at 2AM UTC via Vercel cron. Each backup is a JSON file containing all project data including projects, invoices, expenses, STN/SRN items, activities and more. Download links expire after 5 minutes.
        </div>
      </div>
    </Layout>
  );
}
