import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { T } from '@/lib/theme';

interface NavItem { href: string; label: string; icon: string; module?: string; }

const ADMIN_NAV: NavItem[] = [
  { href:'/dashboard',         label:'Dashboard',          icon:'▦'  },
  { href:'/projects',          label:'Projects',           icon:'📁' },
  { href:'/vendors',           label:'Vendors',            icon:'🏢' },
  { href:'/srn-return',        label:'STN / SRN Status',   icon:'📦' },
  { href:'/site-expenses',     label:'Site Expenses',      icon:'💰' },
  { href:'/teams',             label:'Teams',              icon:'👤' },
  { href:'/invoices', label:'Invoices', icon:'🧾', roles:['super_admin','accounting_team','region_manager','project_manager'] },
      { href:'/reports',           label:'Reports',            icon:'📊' },
];

const VENDOR_NAV: NavItem[] = [
  { href:'/vendor/projects', label:'My Projects', icon:'📁' },
];

const PM_NAV: NavItem[] = [
  { href:'/dashboard',      label:'Dashboard',   icon:'▦'  },
  { href:'/pm/projects',    label:'My Projects', icon:'📁' },
  { href:'/profile',        label:'Profile',     icon:'👤' },
];

const ACCOUNTING_NAV: NavItem[] = [
  { href:'/dashboard',  label:'Dashboard',         icon:'▦'  },
  { href:'/projects',   label:'Projects',           icon:'📁' },
  { href:'/invoices', label:'Invoices', icon:'🧾', roles:['super_admin','accounting_team','region_manager','project_manager'] },
      { href:'/reports',    label:'Reports',            icon:'📊' },
];

const RM_NAV: NavItem[] = [
  { href:'/dashboard',      label:'Dashboard',   icon:'▦'  },
  { href:'/rm/projects',    label:'My Projects', icon:'📁' },
  { href:'/vendors',        label:'Vendors',     icon:'🏢' },
  { href:'/invoices', label:'Invoices', icon:'🧾', roles:['super_admin','accounting_team','region_manager','project_manager'] },
      { href:'/reports',        label:'Reports',     icon:'📊' },
];

const SUPER_ADMIN_NAV: NavItem[] = [
  { href:'/admin/users', label:'User Management',    icon:'👥' },
  { href:'/admin/roles', label:'Role & Permissions', icon:'🔑' },
];

interface Props { collapsed: boolean; onCollapse: () => void; }

export default function Sidebar({ collapsed, onCollapse }: Props) {
  const { pathname } = useRouter();
  const { profile, can, loading, isVendor } = useAuth();
  const isPM          = !loading && profile?.role === 'project_manager';
  const isRM          = !loading && profile?.role === 'region_manager';
  const isAccounting  = !loading && profile?.role === 'accounting_team';
  const isSuperAdmin = !loading && profile?.role === 'super_admin';

  const isActive = (href: string) => {
    if (pathname === href) return true;
    if (href === '/dashboard') return false;
    if (href === '/projects') return pathname === '/projects' || pathname.startsWith('/projects/');
    if (href === '/pm/projects') return pathname === '/pm/projects' || pathname.startsWith('/pm/projects/');
    if (href === '/rm/projects') return pathname === '/rm/projects' || pathname.startsWith('/rm/projects/');
    if (href === '/vendor/projects') return pathname === '/vendor/projects' || pathname.startsWith('/vendor/projects/');
    return pathname.startsWith(href);
  };

  const shouldShow = (item: NavItem) => {
    if (isSuperAdmin) return true;
    if (!item.module) return true;
    if (loading) return true; // show all main nav during load (no admin-only items in ADMIN_NAV)
    return can(item.module as any, 'read');
  };

  const navLink = (item: NavItem) => {
    const active = isActive(item.href);
    return (
      <Link key={item.href} href={item.href} style={{ textDecoration:'none' }}>
        <div
          style={{ display:'flex', alignItems:'center', gap:10, padding:collapsed?'10px':'9px 14px', justifyContent:collapsed?'center':'flex-start', borderRadius:8, background:active?T.primaryMid:'transparent', color:active?T.primary:T.textMuted, fontWeight:active?600:400, fontSize:13, marginBottom:2, cursor:'pointer', borderLeft:active?`3px solid ${T.primary}`:'3px solid transparent', transition:'all 0.15s', overflow:'hidden', whiteSpace:'nowrap' }}
          onMouseEnter={e=>{ if(!active)(e.currentTarget as HTMLDivElement).style.background='#F0FDFA'; }}
          onMouseLeave={e=>{ if(!active)(e.currentTarget as HTMLDivElement).style.background='transparent'; }}>
          <span style={{ fontSize:15, flexShrink:0, lineHeight:1 }}>{item.icon}</span>
          {!collapsed && <span>{item.label}</span>}
        </div>
      </Link>
    );
  };

  const navItems = isVendor ? VENDOR_NAV : isPM ? PM_NAV : isRM ? RM_NAV : isAccounting ? ACCOUNTING_NAV : ADMIN_NAV.filter(shouldShow);

  return (
    <aside style={{ width:collapsed?58:220, background:T.sidebar, borderRight:`1px solid ${T.sidebarBorder}`, display:'flex', flexDirection:'column', transition:'width 0.2s ease', flexShrink:0, overflow:'hidden', height:'100vh', position:'sticky', top:0 }}>
      {/* Logo */}
      <div style={{ padding:'16px 14px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:10, minHeight:64, flexShrink:0 }}>
        <div style={{ width:34, height:34, background:`linear-gradient(135deg, ${T.primary}, #0F766E)`, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0, color:'#fff', fontWeight:700 }}>⚡</div>
        {!collapsed && (
          <div style={{ overflow:'hidden' }}>
            <div style={{ fontWeight:700, fontSize:14, color:T.primary, whiteSpace:'nowrap' }}>Venus Energy</div>
            <div style={{ fontSize:9, color:T.textDim, textTransform:'uppercase', letterSpacing:1 }}>
              {isVendor ? 'Vendor Portal' : isPM ? 'Project Manager' : isRM ? 'Region Manager' : isAccounting ? 'Accounting Team' : 'Project Control'}
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ padding:'10px 8px', flex:1, overflowY:'auto', overflowX:'hidden' }}>
        {navItems.map(navLink)}

        {!isVendor && isSuperAdmin && !loading && (
          <>
            <div style={{ fontSize:9, fontWeight:600, textTransform:'uppercase', letterSpacing:1, color:T.textDim, padding:collapsed?'12px 0 4px':'14px 14px 4px', textAlign:collapsed?'center':'left' }}>
              {collapsed ? '—' : 'Admin'}
            </div>
            {SUPER_ADMIN_NAV.map(navLink)}
          </>
        )}
      </nav>

      {/* Profile + branding + collapse */}
      <div style={{ padding:'10px 8px', borderTop:`1px solid ${T.border}`, flexShrink:0 }}>
        <Link href="/profile" style={{ textDecoration:'none' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:collapsed?'8px':'9px 10px', justifyContent:collapsed?'center':'flex-start', borderRadius:8, cursor:'pointer', background:isActive('/profile')?T.primaryMid:'transparent' }}
            onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background=T.primaryLight}
            onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background=isActive('/profile')?T.primaryMid:'transparent'}>
            <div style={{ width:28, height:28, borderRadius:'50%', background:`linear-gradient(135deg, ${T.primary}, #0F766E)`, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11, fontWeight:700, flexShrink:0 }}>
              {profile?.full_name?.charAt(0).toUpperCase() || profile?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            {!collapsed && (
              <div style={{ overflow:'hidden' }}>
                <div style={{ fontSize:12, fontWeight:600, color:T.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:130 }}>{profile?.full_name || profile?.email || 'User'}</div>
                <div style={{ fontSize:10, color:T.textDim, whiteSpace:'nowrap' }}>{profile?.role?.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</div>
              </div>
            )}
          </div>
        </Link>

        {!collapsed && (
          <div style={{ padding:'6px 10px 2px', fontSize:10, color:T.textDim, textAlign:'center' }}>
            Powered by{' '}
            <a href="https://www.absoluteapplabs.com" target="_blank" rel="noopener noreferrer" style={{ color:T.primary, fontWeight:600, textDecoration:'none' }}>
              Absolute App Labs
            </a>
          </div>
        )}

        <button onClick={onCollapse} style={{ width:'100%', marginTop:6, padding:'6px', background:'#F8FAFC', border:`1px solid ${T.border}`, borderRadius:7, color:T.textMuted, cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
          <span>{collapsed?'›':'‹'}</span>
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
