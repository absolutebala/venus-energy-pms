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
    if (!profile) return;
    const notifs: Notification[] = [];
    const now = new Date();
    const role = profile.role;
    const name = profile.full_name || '';
    const in30 = new Date(now.getTime() + 30*24*60*60*1000).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];
    const week  = new Date(now.getTime()-7*24*60*60*1000).toISOString();

    // ── Vendor: get their vendor name first ──────────────────────────────────
    let vendorName = '';
    if (role === 'vendor' && (profile as any).vendor_id) {
      const { data: vd } = await supabase.from('vendors').select('name').eq('id',(profile as any).vendor_id).single();
      if (vd?.name) vendorName = vd.name;
    }

    // ── Super Admin / Accounting: see everything ─────────────────────────────
    if (['super_admin','accounting_team'].includes(role)) {
      const { data: pendingInv } = await supabase.from('invoices').select('id,invoice_no').eq('invoice_status','Submitted');
      if (pendingInv?.length) notifs.push({ id:'inv-pending', type:'warning', is_read:false,
        title:`${pendingInv.length} Invoice${pendingInv.length>1?'s':''} Pending Approval`,
        message: pendingInv.slice(0,3).map((i:any)=>i.invoice_no).join(', '),
        link:'/invoices', created_at: now.toISOString() });

      const { data: delayedProj } = await supabase.from('projects').select('id,site,po_no,indus_id,type').eq('status','delayed');
      if (delayedProj?.length) notifs.push({ id:'proj-delayed', type:'error', is_read:false,
        title:`${delayedProj.length} Project${delayedProj.length>1?'s':''} Delayed`,
        message: delayedProj.slice(0,3).map((p:any)=>`${p.po_no||p.id} · ${p.indus_id||p.site}${p.type ? " · " + p.type : ""}`).join(', '),
        link:'/projects', created_at: new Date(now.getTime()-60000).toISOString() });

      const { data: ptwExpiring } = await supabase.from('projects').select('id,site,ptw_date_to,ptw_ticket_id')
        .not('ptw_date_to','is',null).neq('ptw_date_to','').lte('ptw_date_to',in30).gte('ptw_date_to',today);
      ptwExpiring?.forEach((p:any) => notifs.push({ id:`ptw-${p.id}`, type:'warning', is_read:false,
        title:`PTW Expiring: ${p.ptw_ticket_id||p.id}`,
        message:`Expires ${new Date(p.ptw_date_to).toLocaleDateString('en-IN')} — ${p.site}`,
        link:`/projects/${p.id}`, created_at: new Date(now.getTime()-120000).toISOString() }));

      const { data: billingProj } = await supabase.from('projects').select('id,site,po_no,indus_id,type').eq('status','billing_review');
      if (billingProj?.length) notifs.push({ id:'billing-review', type:'info', is_read:false,
        title:`${billingProj.length} Project${billingProj.length>1?'s':''} in Billing Review`,
        message: billingProj.slice(0,3).map((p:any)=>p.site).join(', '),
        link:'/invoices', created_at: new Date(now.getTime()-180000).toISOString() });

      const { data: recentAct } = await supabase.from('activity_log').select('project_id,action,by_name,created_at,projects(po_no,indus_id,type)')
        .gte('created_at',week).order('created_at',{ascending:false}).limit(5);
      recentAct?.forEach((a:any,i:number) => notifs.push({ id:`act-${i}`, type:'info', is_read:false,
        title:a.action, message:`${a.by_name} · PO: ${(a as any).projects?.po_no||a.project_id} · ${(a as any).projects?.indus_id||''}${(a as any).projects?.type ? " · " + (a as any).projects.type : ""}`,
        link:`/projects/${a.project_id}`, created_at: a.created_at }));
    }

    // ── Project Manager: only their projects ─────────────────────────────────
    else if (role === 'project_manager') {
      // STN items pending PM approval on their projects
      const { data: myProjects } = await supabase.from('projects').select('id,site').eq('pm', name);
      const myProjectIds = (myProjects||[]).map((p:any)=>p.id);

      if (myProjectIds.length > 0) {
        // Newly assigned projects (created in last 7 days)
        const { data: newAssigned } = await supabase.from('projects').select('id,site,po_no,indus_id,type')
          .eq('pm', name).gte('created_at', week);
        newAssigned?.forEach((p:any) => notifs.push({ id:`assigned-${p.id}`, type:'success', is_read:false,
          title:`Project Assigned to You`, message:`PO: ${p.po_no||p.id} · ${p.indus_id||p.site}${p.type ? " · " + p.type : ""}`,
          link:`/projects/${p.id}`, created_at: now.toISOString() }));

        // STN utilisation submitted pending PM approval
        const { data: stnPending } = await supabase.from('po_items').select('id,project_id,description')
          .in('project_id', myProjectIds).eq('utilised_status','submitted');
        if (stnPending?.length) notifs.push({ id:'stn-pending', type:'warning', is_read:false,
          title:`${stnPending.length} STN Item${stnPending.length>1?'s':''} Awaiting Your Approval`,
          message: Array.from(new Set(stnPending.map((i:any)=>i.project_id))).slice(0,3).join(', '),
          link:'/projects', created_at: new Date(now.getTime()-60000).toISOString() });

        // PTW expiring on their projects
        const { data: ptwExpiring } = await supabase.from('projects').select('id,site,ptw_date_to,ptw_ticket_id')
          .in('id', myProjectIds).not('ptw_date_to','is',null).neq('ptw_date_to','')
          .lte('ptw_date_to',in30).gte('ptw_date_to',today);
        ptwExpiring?.forEach((p:any) => notifs.push({ id:`ptw-${p.id}`, type:'warning', is_read:false,
          title:`PTW Expiring: ${p.ptw_ticket_id||p.id}`,
          message:`Expires ${new Date(p.ptw_date_to).toLocaleDateString('en-IN')} — ${p.site}`,
          link:`/projects/${p.id}`, created_at: new Date(now.getTime()-120000).toISOString() }));

        // Delayed projects
        const { data: delayed } = await supabase.from('projects').select('id,site,po_no,indus_id,type')
          .in('id', myProjectIds).eq('status','delayed');
        if (delayed?.length) notifs.push({ id:'pm-delayed', type:'error', is_read:false,
          title:`${delayed.length} of Your Projects Delayed`,
          message: delayed.slice(0,3).map((p:any)=>`${p.po_no||p.id} · ${p.indus_id||p.site}${p.type ? " · " + p.type : ""}`).join(', '),
          link:'/projects', created_at: new Date(now.getTime()-180000).toISOString() });

        // Recent activity on their projects
        const { data: recentAct } = await supabase.from('activity_log').select('project_id,action,by_name,created_at,projects(po_no,indus_id,type)')
          .in('project_id', myProjectIds.slice(0,50)).gte('created_at',week)
          .order('created_at',{ascending:false}).limit(5);
        recentAct?.forEach((a:any,i:number) => notifs.push({ id:`act-${i}`, type:'info', is_read:false,
          title:a.action, message:`${a.by_name} · PO: ${(a as any).projects?.po_no||a.project_id} · ${(a as any).projects?.indus_id||''}${(a as any).projects?.type ? " · " + (a as any).projects.type : ""}`,
          link:`/projects/${a.project_id}`, created_at: a.created_at }));
      }
    }

    // ── Region Manager: only their region projects ───────────────────────────
    else if (role === 'region_manager') {
      const { data: myProjects } = await supabase.from('projects').select('id,site,status').eq('rm', name);
      const myProjectIds = (myProjects||[]).map((p:any)=>p.id);

      if (myProjectIds.length > 0) {
        // Newly assigned
        const { data: newAssigned } = await supabase.from('projects').select('id,site,po_no,indus_id,type')
          .eq('rm', name).gte('created_at', week);
        newAssigned?.forEach((p:any) => notifs.push({ id:`assigned-${p.id}`, type:'success', is_read:false,
          title:`Project Assigned to Your Region`, message:`PO: ${p.po_no||p.id} · ${p.indus_id||p.site}${p.type ? " · " + p.type : ""}`,
          link:`/projects/${p.id}`, created_at: now.toISOString() }));

        // Delayed
        const delayed = (myProjects||[]).filter((p:any)=>p.status==='delayed');
        if (delayed.length) notifs.push({ id:'rm-delayed', type:'error', is_read:false,
          title:`${delayed.length} Project${delayed.length>1?'s':''} Delayed in Your Region`,
          message: delayed.slice(0,3).map((p:any)=>`${p.po_no||p.id} · ${p.indus_id||p.site}${p.type ? " · " + p.type : ""}`).join(', '),
          link:'/projects', created_at: new Date(now.getTime()-60000).toISOString() });

        // Billing review
        const billing = (myProjects||[]).filter((p:any)=>p.status==='billing_review');
        if (billing.length) notifs.push({ id:'rm-billing', type:'info', is_read:false,
          title:`${billing.length} Project${billing.length>1?'s':''} in Billing Review`,
          message: billing.slice(0,3).map((p:any)=>`${p.po_no||p.id} · ${p.indus_id||p.site}${p.type ? " · " + p.type : ""}`).join(', '),
          link:'/invoices', created_at: new Date(now.getTime()-120000).toISOString() });

        // Recent activity
        const { data: recentAct } = await supabase.from('activity_log').select('project_id,action,by_name,created_at,projects(po_no,indus_id,type)')
          .in('project_id', myProjectIds.slice(0,50)).gte('created_at',week)
          .order('created_at',{ascending:false}).limit(5);
        recentAct?.forEach((a:any,i:number) => notifs.push({ id:`act-${i}`, type:'info', is_read:false,
          title:a.action, message:`${a.by_name} · PO: ${(a as any).projects?.po_no||a.project_id} · ${(a as any).projects?.indus_id||''}${(a as any).projects?.type ? " · " + (a as any).projects.type : ""}`,
          link:`/projects/${a.project_id}`, created_at: a.created_at }));
      }
    }

    // ── Vendor: only their projects ──────────────────────────────────────────
    else if (role === 'vendor' && vendorName) {
      const { data: myProjects } = await supabase.from('projects').select('id,site,status').eq('vendor', vendorName);
      const myProjectIds = (myProjects||[]).map((p:any)=>p.id);

      if (myProjectIds.length > 0) {
        // Newly assigned projects
        const { data: newAssigned } = await supabase.from('projects').select('id,site')
          .eq('vendor', vendorName).gte('created_at', week);
        newAssigned?.forEach((p:any) => notifs.push({ id:`assigned-${p.id}`, type:'success', is_read:false,
          title:`New Project Assigned to You`, message:`PO: ${p.po_no||p.id} · ${p.indus_id||p.site}${p.type ? " · " + p.type : ""}`,
          link:`/projects/${p.id}`, created_at: now.toISOString() }));

        // STN items approved/rejected for them
        const { data: stnApproved } = await supabase.from('po_items').select('id,project_id,description')
          .in('project_id', myProjectIds).eq('utilised_status','pm_approved').gte('updated_at', week);
        if (stnApproved?.length) notifs.push({ id:'stn-approved', type:'success', is_read:false,
          title:`${stnApproved.length} STN Item${stnApproved.length>1?'s':''} Approved by PM`,
          message: Array.from(new Set(stnApproved.map((i:any)=>i.project_id))).slice(0,3).join(', '),
          link:'/projects', created_at: new Date(now.getTime()-60000).toISOString() });

        const { data: stnRejected } = await supabase.from('po_items').select('id,project_id,description')
          .in('project_id', myProjectIds).eq('utilised_status','pm_rejected').gte('updated_at', week);
        if (stnRejected?.length) notifs.push({ id:'stn-rejected', type:'error', is_read:false,
          title:`${stnRejected.length} STN Item${stnRejected.length>1?'s':''} Rejected — Resubmit`,
          message: Array.from(new Set(stnRejected.map((i:any)=>i.project_id))).slice(0,3).join(', '),
          link:'/projects', created_at: new Date(now.getTime()-120000).toISOString() });

        // Expenses approved/rejected
        const { data: expApproved } = await supabase.from('expenses').select('id,project_id,amount')
          .in('project_id', myProjectIds).eq('status','paid').gte('updated_at', week);
        if (expApproved?.length) notifs.push({ id:'exp-approved', type:'success', is_read:false,
          title:`${expApproved.length} Expense${expApproved.length>1?'s':''} Approved`,
          message: Array.from(new Set(expApproved.map((i:any)=>i.project_id))).slice(0,3).join(', '),
          link:'/site-expenses', created_at: new Date(now.getTime()-180000).toISOString() });

        // Recent activity on their projects
        const { data: recentAct } = await supabase.from('activity_log').select('project_id,action,by_name,created_at,projects(po_no,indus_id,type)')
          .in('project_id', myProjectIds.slice(0,50)).gte('created_at',week)
          .order('created_at',{ascending:false}).limit(5);
        recentAct?.forEach((a:any,i:number) => notifs.push({ id:`act-${i}`, type:'info', is_read:false,
          title:a.action, message:`${a.by_name} · PO: ${(a as any).projects?.po_no||a.project_id} · ${(a as any).projects?.indus_id||''}${(a as any).projects?.type ? " · " + (a as any).projects.type : ""}`,
          link:`/projects/${a.project_id}`, created_at: a.created_at }));
      }
    }

    // Sort by created_at desc
    notifs.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const readIds2 = (() => { try { return new Set(JSON.parse(localStorage.getItem("notif_read") || "[]")); } catch { return new Set<string>(); } })();
    const markedNotifs = notifs.map(n => ({ ...n, is_read: readIds2.has(n.id) }));
    setNotifications(markedNotifs.sort((a,b) => new Date(b.created_at).getTime()-new Date(a.created_at).getTime()));
  }, [profile?.role, profile?.full_name, (profile as any)?.vendor_id]);

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

  const getReadIds = (): Set<string> => {
    try { return new Set(JSON.parse(localStorage.getItem('notif_read') || '[]')); }
    catch { return new Set(); }
  };

  const markRead = (id: string) => {
    const ids = getReadIds(); ids.add(id);
    localStorage.setItem('notif_read', JSON.stringify(Array.from(ids)));
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = () => {
    const ids = getReadIds();
    notifications.forEach(n => ids.add(n.id));
    localStorage.setItem('notif_read', JSON.stringify(Array.from(ids)));
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
