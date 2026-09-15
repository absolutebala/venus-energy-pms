import React from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { useProjects } from '@/context/ProjectContext';
import { createClient } from '@/lib/supabase';
import { T, btnPrimary } from '@/lib/theme';

const supabase = createClient();
const REGIONS = ['Tamil Nadu', 'Karnataka', 'Telangana', 'Maharashtra', 'Delhi', 'Kerala', 'West Bengal'];

const card: React.CSSProperties = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '20px 24px', marginBottom: 20 };
const selectStyle: React.CSSProperties = { border: `1px solid ${T.border}`, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', background: '#fff' };

function ReassignSection({ field, label, allProjects, refreshProjects, actorName }: {
  field: 'pm' | 'rm'; label: string; allProjects: any[]; refreshProjects: () => Promise<void>; actorName: string;
}) {
  const [fromValue, setFromValue] = React.useState('');
  const [toValue, setToValue] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'non_completed' | 'all'>('non_completed');
  const [regionFilter, setRegionFilter] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const distinctValues = React.useMemo(() => {
    const set = new Set<string>();
    allProjects.forEach((p: any) => { const v = p[field]; if (v) set.add(v); });
    return Array.from(set).sort();
  }, [allProjects, field]);

  const matching = React.useMemo(() => {
    if (!fromValue) return [];
    return allProjects.filter((p: any) => {
      if (p[field] !== fromValue) return false;
      if (statusFilter === 'non_completed' && p.status === 'completed') return false;
      if (regionFilter && p.region !== regionFilter) return false;
      return true;
    });
  }, [allProjects, fromValue, statusFilter, regionFilter, field]);

  // All matching projects are selected by default when the filter changes — individual rows
  // can be unchecked, or "Select All" toggled, before committing the reassignment.
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  React.useEffect(() => { setSelectedIds(new Set(matching.map((p: any) => p.id))); }, [matching]);
  const selected = React.useMemo(() => matching.filter((p: any) => selectedIds.has(p.id)), [matching, selectedIds]);
  const allSelected = matching.length > 0 && selected.length === matching.length;
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(matching.map((p: any) => p.id)));
  const toggleOne = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const handleReassign = async () => {
    if (!fromValue || !toValue || selected.length === 0) return;
    if (fromValue === toValue) { setMsg({ type: 'error', text: 'From and To are the same — nothing to reassign' }); return; }
    const confirmed = window.confirm(
      `Reassign ${selected.length} project(s) from "${fromValue}" to "${toValue}" (${label})?\n\nThis cannot be undone automatically — you'd need to reassign back manually.`
    );
    if (!confirmed) return;

    setBusy(true); setMsg(null);
    try {
      const ids = selected.map((p: any) => p.id);
      const { error } = await supabase.from('projects')
        .update({ [field]: toValue, updated_at: new Date().toISOString(), updated_by: actorName })
        .in('id', ids);
      if (error) { setMsg({ type: 'error', text: error.message }); return; }

      await supabase.from('activity_log').insert(
        ids.map((id: string) => ({
          project_id: id,
          action: `Bulk reassigned ${label} from ${fromValue} to ${toValue}`,
          by_name: actorName,
          created_at: new Date().toISOString(),
        }))
      );

      setMsg({ type: 'success', text: `${ids.length} project(s) reassigned from ${fromValue} to ${toValue}` });
      setFromValue(''); setToValue('');
      await refreshProjects();
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(null), 6000);
    }
  };

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ fontSize: 20 }}>🔁</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Reassign {label}</div>
          <div style={{ fontSize: 12, color: T.textMuted }}>Move all matching projects from one {label} to another in one action.</div>
        </div>
      </div>
      <div style={{ height: 1, background: T.border, marginBottom: 16 }} />

      {msg && (
        <div style={{ padding: '9px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13, fontWeight: 600,
          background: msg.type === 'success' ? '#F0FDF4' : '#FEF2F2',
          color: msg.type === 'success' ? '#166534' : '#DC2626',
          border: `1px solid ${msg.type === 'success' ? '#BBF7D0' : '#FECACA'}` }}>
          {msg.type === 'success' ? '✅' : '❌'} {msg.text}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' as const, alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.textMuted, marginBottom: 5, textTransform: 'uppercase' as const }}>From {label}</label>
          <select value={fromValue} onChange={e => setFromValue(e.target.value)} style={{ ...selectStyle, minWidth: 180 }}>
            <option value="">Select…</option>
            {distinctValues.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div style={{ fontSize: 18, color: T.textMuted, paddingBottom: 8 }}>→</div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.textMuted, marginBottom: 5, textTransform: 'uppercase' as const }}>To {label}</label>
          <select value={toValue} onChange={e => setToValue(e.target.value)} style={{ ...selectStyle, minWidth: 180 }}>
            <option value="">Select…</option>
            {distinctValues.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.textMuted, marginBottom: 5, textTransform: 'uppercase' as const }}>Status</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} style={selectStyle}>
            <option value="non_completed">Active / Non-completed only</option>
            <option value="all">All statuses</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.textMuted, marginBottom: 5, textTransform: 'uppercase' as const }}>Region</label>
          <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)} style={selectStyle}>
            <option value="">All Regions</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {fromValue && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 8 }}>
            {selected.length} of {matching.length} project{matching.length !== 1 ? 's' : ''} selected
          </div>
          {matching.length > 0 && (
            <div style={{ maxHeight: 220, overflowY: 'auto' as const, border: `1px solid ${T.border}`, borderRadius: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 12 }}>
                <thead>
                  <tr style={{ background: T.bg }}>
                    <th style={{ padding: '7px 10px', width: 30 }}>
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                    </th>
                    <th style={{ padding: '7px 10px', textAlign: 'left' as const, fontWeight: 700, color: T.textMuted }}>Project No</th>
                    <th style={{ padding: '7px 10px', textAlign: 'left' as const, fontWeight: 700, color: T.textMuted }}>Site</th>
                    <th style={{ padding: '7px 10px', textAlign: 'left' as const, fontWeight: 700, color: T.textMuted }}>Status</th>
                    <th style={{ padding: '7px 10px', textAlign: 'left' as const, fontWeight: 700, color: T.textMuted }}>Region</th>
                  </tr>
                </thead>
                <tbody>
                  {matching.map((p: any) => (
                    <tr key={p.id} style={{ borderTop: `1px solid ${T.border}` }}>
                      <td style={{ padding: '7px 10px' }}>
                        <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleOne(p.id)} />
                      </td>
                      <td style={{ padding: '7px 10px' }}>{p.id}</td>
                      <td style={{ padding: '7px 10px' }}>{p.site || '—'}</td>
                      <td style={{ padding: '7px 10px' }}>{p.status}</td>
                      <td style={{ padding: '7px 10px' }}>{p.region || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <button onClick={handleReassign} disabled={busy || !fromValue || !toValue || selected.length === 0}
        style={{ ...btnPrimary, opacity: busy || !fromValue || !toValue || selected.length === 0 ? 0.6 : 1 }}>
        {busy ? 'Reassigning…' : `Reassign ${selected.length || ''} Project${selected.length === 1 ? '' : 's'}`}
      </button>
    </div>
  );
}

export default function BulkReassignPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { projects, refreshProjects } = useProjects();

  React.useEffect(() => {
    if (!authLoading && profile?.role !== 'super_admin') router.replace('/dashboard');
  }, [authLoading, profile]);

  if (authLoading || profile?.role !== 'super_admin') return null;

  return (
    <Layout>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 0' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, marginBottom: 4 }}>🔁 Bulk Reassign</h1>
          <div style={{ fontSize: 13, color: T.textMuted }}>Move projects from one PM or RM to another in bulk</div>
        </div>

        <ReassignSection field="pm" label="PM" allProjects={projects} refreshProjects={refreshProjects} actorName={profile?.full_name || 'super_admin'} />
        <ReassignSection field="rm" label="RM" allProjects={projects} refreshProjects={refreshProjects} actorName={profile?.full_name || 'super_admin'} />
      </div>
    </Layout>
  );
}
