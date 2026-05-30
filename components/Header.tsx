import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase';
import { T } from '@/lib/theme';
import { Bell, CheckCircle2, AlertTriangle, Info, XCircle, X, ExternalLink } from 'lucide-react';

const supabase = createClient();

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':       'Dashboard',
  '/vendors':         'Vendors',
  '/srn-return':      'STN / SRN Status',
  '/site-expenses':   'Site Expenses',
  '/reports':         'Reports',
  '/profile':         'Profile Settings',
  '/admin/users':     'User Management',
  '/admin/roles':     'Role & Permissions',
  '/projects':        'Projects',
  '/invoices':        'Invoices',
  '/billing':         'Billing',
  '/safety-compliance': 'Safety Compliance',
};

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

const TYPE_CFG = {
  info:    { color: '#2563EB', bg: '#EFF6FF', Icon: Info },
  warning: { color: '#D97706', bg: '#FFFBEB', Icon: AlertTriangle },
  success: { color: '#0D9488', bg: '#F0FDFA', Icon: CheckCircle2 },
  error:   { color: '#DC2626', bg: '#FEF2F2', Icon: XCircle },
};

const fmtTime = (d: string) => {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
  return `${Math.floor(diff/1440)}d ago`;
};

export default function Header() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [search, setSearch] = useState('');
  const [focused, setFocused] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const menuRef  = useRef<HTMLDivElement>(null);

  const unread = notifications.filter(n => !n.is_read).length;

  const fetchNotifications = useCallback(async () => {
    const notifs: Notification[] = [];
    const now = new Date();

    // 1. Invoices pending approval
    const { data: pendingInv } = await supabase
      .from('invoices').select('id,invoice_no,project_id').eq('invoice_status','Submitted');
    if (pendingInv && pendingInv.length > 0) {
      notifs.push({ id:'inv-pending', type:'warning', is_read:false,
        title:`${pendingInv.length} Invoice${pendingInv.length>1?'s':''} Pending Approval`,
        message: pendingInv.slice(0,3).map((i:any)=>i.invoice_no).join(', '),
        link:'/invoices', created_at: now.toISOString() });
    }

    // 2. Delayed projects
    const { data: delayedProj } = await supabase
      .from('projects').select('id,site').eq('status','delayed');
    if (delayedProj && delayedProj.length > 0) {
      notifs.push({ id:'proj-delayed', type:'error', is_read:false,
        title:`${delayedProj.length} Project${delayedProj.length>1?'s':''} Delayed`,
        message: delayedProj.slice(0,3).map((p:any)=>p.id).join(', '),
        link:'/projects', created_at: new Date(now.getTime()-60000).toISOString() });
    }

    // 3. PTW expiring within 30 days
    const in30 = new Date(now.getTime() + 30*24*60*60*1000).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];
    const { data: ptwExpiring } = await supabase
      .from('projects').select('id,site,ptw_date_to,ptw_ticket_id')
      .not('ptw_date_to','is',null).neq('ptw_date_to','')
      .lte('ptw_date_to', in30).gte('ptw_date_to', today);
    if (ptwExpiring && ptwExpiring.length > 0) {
      ptwExpiring.forEach((p:any) => {
        notifs.push({ id:`ptw-${p.id}`, type:'warning', is_read:false,
          title:`PTW Expiring: ${p.ptw_ticket_id||p.id}`,
          message:`Expires on ${new Date(p.ptw_date_to).toLocaleDateString('en-IN')} — ${p.site}`,
          link:`/projects/${p.id}`, created_at: new Date(now.getTime()-120000).toISOString() });
      });
    }

    // 4. Projects in billing review
    const { data: billingProj } = await supabase
      .from('projects').select('id,site').eq('status','billing_review');
    if (billingProj && billingProj.length > 0) {
      notifs.push({ id:'billing-review', type:'info', is_read:false,
        title:`${billingProj.length} Project${billingProj.length>1?'s':''} in Billing Review`,
        message: billingProj.slice(0,3).map((p:any)=>p.site).join(', '),
        link:'/invoices', created_at: new Date(now.getTime()-180000).toISOString() });
    }

    // 5. Recent documents (last 7 days)
    const week = new Date(now.getTime()-7*24*60*60*1000).toISOString();
    const { data: recentDocs } = await supabase
      .from('work_documents').select('project_id,doc_name').gte('created_at', week).limit(3);
    if (recentDocs && recentDocs.length > 0) {
      notifs.push({ id:'recent-docs', type:'success', is_read:false,
        title:`${recentDocs.length} Document${recentDocs.length>1?'s':''} Uploaded Recently`,
        message: recentDocs.map((d:any)=>d.doc_name||d.project_id).slice(0,2).join(', '),
        link:'/projects', created_at: new Date(now.getTime()-240000).toISOString() });
    }

    setNotifications(notifs);
  }, [profile?.role]);

  // Keep ref to latest fetchNotifications to avoid stale closure in Realtime
  const fetchRef = useRef(fetchNotifications);
  useEffect(() => { fetchRef.current = fetchNotifications; }, [fetchNotifications]);

  useEffect(() => { if (profile) fetchNotifications(); }, [profile, fetchNotifications]);

  // Polling fallback — refresh every 30 seconds
  useEffect(() => {
    if (!profile) return;
    const interval = setInterval(() => { fetchRef.current(); }, 30000);
    return () => clearInterval(interval);
  }, [profile?.role]);

  // Realtime: re-fetch notifications on any project/invoice change
  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' },
        () => { fetchRef.current(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' },
        () => { fetchRef.current(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.role]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const markRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleNotifClick = async (n: Notification) => {
    await markRead(n.id);
    setNotifOpen(false);
    if (n.link) router.push(n.link);
  };

  const title = PAGE_TITLES[router.pathname] || (router.pathname.startsWith('/projects/') ? 'Project Detail' : 'Venus Energy PMS');

  return (
    <div style={{ height: 56, background: '#fff', borderBottom: `1px solid ${T.border}`,
      display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, position: 'sticky', top: 0, zIndex: 100 }}>

      {/* Page title */}
      <div style={{ fontWeight: 700, fontSize: 16, color: T.text, flex: 1 }}>{title}</div>

      {/* Search */}
      <div style={{ position: 'relative', width: 260 }}>
        <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.textMuted }}>
          <Info size={14} strokeWidth={1.75} />
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search projects, sites..."
          style={{ width: '100%', paddingLeft: 32, paddingRight: 12, height: 34,
            border: `1px solid ${focused ? T.primary : T.border}`, borderRadius: 8,
            fontSize: 13, outline: 'none', background: T.bg, boxSizing: 'border-box' as const,
            color: T.text }} />
      </div>

      {/* Notification bell */}
      <div ref={notifRef} style={{ position: 'relative' }}>
        <button onClick={() => setNotifOpen(o => !o)}
          style={{ width: 36, height: 36, background: notifOpen ? T.primaryLight : T.bg,
            border: `1px solid ${notifOpen ? T.primary : T.border}`,
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', position: 'relative' }}>
          <Bell size={16} color={notifOpen ? T.primary : T.textMuted} strokeWidth={1.75} />
          {unread > 0 && (
            <span style={{ position: 'absolute', top: -4, right: -4,
              width: 17, height: 17, background: T.danger, borderRadius: '50%',
              fontSize: 9, fontWeight: 700, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid #fff' }}>{unread}</span>
          )}
        </button>

        {/* Notification dropdown */}
        {notifOpen && (
          <div style={{ position: 'absolute', right: 0, top: 42, width: 360,
            background: '#fff', border: `1px solid ${T.border}`, borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 200 }}>
            {/* Header */}
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.border}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>Notifications</div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                  {unread} unread · {notifications.length} total
                </div>
              </div>
              {unread > 0 && (
                <button onClick={markAllRead}
                  style={{ fontSize: 11, color: T.primary, background: 'none', border: 'none',
                    cursor: 'pointer', fontWeight: 600 }}>Mark all read</button>
              )}
            </div>

            {/* List */}
            <div style={{ maxHeight: 380, overflowY: 'auto' as const }}>
              {notifications.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center' as const, color: T.textMuted, fontSize: 13 }}>
                  No notifications
                </div>
              )}
              {notifications.map(n => {
                const cfg = TYPE_CFG[n.type] || TYPE_CFG.info;
                const IconComp = cfg.Icon;
                return (
                  <div key={n.id} onClick={() => handleNotifClick(n)}
                    style={{ padding: '12px 16px', cursor: 'pointer',
                      background: n.is_read ? '#fff' : cfg.bg,
                      borderBottom: `1px solid ${T.border}`,
                      display: 'flex', gap: 12, alignItems: 'flex-start' }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = T.bg}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = n.is_read ? '#fff' : cfg.bg}>
                    <div style={{ marginTop: 2, flexShrink: 0 }}>
                      <IconComp size={15} color={cfg.color} strokeWidth={1.75} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: n.is_read ? 400 : 600, color: T.text,
                        marginBottom: 2 }}>{n.title}</div>
                      {n.message && (
                        <div style={{ fontSize: 11, color: T.textMuted, lineHeight: 1.4 }}>{n.message}</div>
                      )}
                      <div style={{ fontSize: 10, color: T.textDim, marginTop: 4 }}>{fmtTime(n.created_at)}</div>
                    </div>
                    {!n.is_read && (
                      <div style={{ width: 7, height: 7, borderRadius: '50%',
                        background: cfg.color, flexShrink: 0, marginTop: 4 }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{ padding: '10px 16px', borderTop: `1px solid ${T.border}`,
              textAlign: 'center' as const }}>
              <button onClick={() => setNotifOpen(false)}
                style={{ fontSize: 12, color: T.textMuted, background: 'none', border: 'none', cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User menu */}
      <div ref={menuRef} style={{ position: 'relative' }}>
        <button onClick={() => setMenuOpen(o => !o)}
          style={{ display: 'flex', alignItems: 'center', gap: 9,
            background: T.bg, border: `1px solid ${T.border}`,
            borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%',
            background: `linear-gradient(135deg,${T.primary},#0F766E)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
            {(profile?.full_name || 'U')[0].toUpperCase()}
          </div>
          <div style={{ textAlign: 'left' as const }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, lineHeight: 1.2 }}>
              {profile?.full_name || 'User'}
            </div>
            <div style={{ fontSize: 10, color: T.textMuted, textTransform: 'capitalize' as const }}>
              {profile?.role?.replace(/_/g, ' ') || ''}
            </div>
          </div>
        </button>

        {menuOpen && (
          <div style={{ position: 'absolute', right: 0, top: 42, width: 180,
            background: '#fff', border: `1px solid ${T.border}`, borderRadius: 10,
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 200, overflow: 'hidden' }}>
            <Link href="/profile" onClick={() => setMenuOpen(false)}
              style={{ display: 'block', padding: '10px 14px', fontSize: 13,
                color: T.text, textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = T.bg}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = '#fff'}>
              Profile Settings
            </Link>
            <div style={{ height: 1, background: T.border }} />
            <button onClick={async () => { setMenuOpen(false); await signOut(); router.push('/login'); }}
              style={{ width: '100%', padding: '10px 14px', fontSize: 13,
                color: T.danger, background: 'none', border: 'none',
                cursor: 'pointer', textAlign: 'left' as const }}>
              Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
