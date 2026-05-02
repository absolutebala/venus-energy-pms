import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { T } from '@/lib/theme';

interface NavItem { href: string; label: string; icon: string; module?: string; }

const NAV: NavItem[] = [
  { href:'/dashboard',         label:'Dashboard',          icon:'▦'  },
  { href:'/projects',          label:'Projects',           icon:'📁' },
  { href:'/vendors',           label:'Vendors',            icon:'🏢' },
  { href:'/billing',           label:'Billing & Invoices', icon:'💳' },
  { href:'/attendance',        label:'Attendance',         icon:'📅' },
  { href:'/safety-compliance', label:'Safety Compliance',  icon:'🛡' },
  { href:'/srn-return',        label:'SRN Return',         icon:'↩' },
  { href:'/site-expenses',     label:'Site Expenses',      icon:'💰' },
  { href:'/reports',           label:'Reports',            icon:'📊' },
];

const ADMIN_NAV: NavItem[] = [
  { href:'/admin/users', label:'User Management',    icon:'👥' },
  { href:'/admin/roles', label:'Role & Permissions', icon:'🔑' },
];

const QUICK_ACTIONS = [
  { label:'New Project',    icon:'📁', href:'/projects?action=new'    },
  { label:'Create Invoice', icon:'💳', href:'/billing?action=new'     },
  { label:'Add Expense',    icon:'💰', href:'/site-expenses?action=new'},
  { label:'Mark Attendance',icon:'📅', href:'/attendance?action=mark' },
  { label:'Add SRN Return', icon:'↩', href:'/srn-return?action=new'  },
];

interface Props { collapsed: boolean; onCollapse: () => void; }

export default function Sidebar({ collapsed, onCollapse }: Props) {
  const router = useRouter();
  const { pathname } = router;
  const { profile, can, loading } = useAuth();
  const isSuperAdmin = profile?.role === 'super_admin';

  const isActive = (href: string) => {
    const base = href.split('?')[0];
    return pathname === base || (base !== '/dashboard' && pathname.startsWith(base));
  };

  const shouldShow = (item: NavItem) => {
    if (loading || isSuperAdmin) return true;
    if (!item.module) return true;
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

  return (
    <aside style={{ width:collapsed?58:220, background:T.sidebar, borderRight:`1px solid ${T.sidebarBorder}`, display:'flex', flexDirection:'column', transition:'width 0.2s ease', flexShrink:0, overflow:'hidden', height:'100vh', position:'sticky', top:0 }}>

      {/* Logo */}
      <div style={{ padding:'16px 14px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:10, minHeight:64, flexShrink:0 }}>
        <div style={{ width:34, height:34, background:`linear-gradient(135deg, ${T.primary}, #0F766E)`, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0, color:'#fff', fontWeight:700 }}>⚡</div>
        {!collapsed && (
          <div style={{ overflow:'hidden' }}>
            <div style={{ fontWeight:700, fontSize:14, color:T.primary, whiteSpace:'nowrap' }}>Venus Energy</div>
            <div style={{ fontSize:9, color:T.textDim, textTransform:'uppercase', letterSpacing:1 }}>Project Control</div>
          </div>
        )}
      </div>

      {/* Scrollable nav area */}
      <div style={{ flex:1, overflowY:'auto', overflowX:'hidden', display:'flex', flexDirection:'column' }}>

        {/* Primary Nav */}
        <nav style={{ padding:'10px 8px' }}>
          {NAV.filter(shouldShow).map(navLink)}

          {(isSuperAdmin || loading) && (
            <>
              <div style={{ fontSize:9, fontWeight:600, textTransform:'uppercase', letterSpacing:1, color:T.textDim, padding:collapsed?'12px 0 4px':'14px 14px 4px', textAlign:collapsed?'center':'left' }}>
                {collapsed ? '—' : 'Admin'}
              </div>
              {ADMIN_NAV.map(navLink)}
            </>
          )}
        </nav>

        {/* Quick Actions — always visible below nav */}
        {!collapsed && (
          <div style={{ margin:'0 8px 8px', borderRadius:10, background:T.primaryLight, border:`1px solid ${T.primaryMid}`, overflow:'hidden', flexShrink:0 }}>
            <div style={{ padding:'10px 12px 6px', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:0.8, color:T.primary }}>
              ⚡ Quick Actions
            </div>
            {QUICK_ACTIONS.map((a, i) => (
              <Link key={i} href={a.href} style={{ textDecoration:'none' }}>
                <div
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 12px', cursor:'pointer', fontSize:12, color:T.primary, fontWeight:500, borderTop:i===0?'none':`1px solid ${T.primaryMid}` }}
                  onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background=T.primaryMid}
                  onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background='transparent'}>
                  <span style={{ fontSize:13 }}>{a.icon}</span>
                  <span>{a.label}</span>
                  <span style={{ marginLeft:'auto', fontSize:11, opacity:0.6 }}>›</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {collapsed && (
          <div style={{ padding:'8px 0', display:'flex', flexDirection:'column', alignItems:'center', gap:4, flexShrink:0 }}>
            {QUICK_ACTIONS.map((a,i) => (
              <Link key={i} href={a.href} style={{ textDecoration:'none' }}>
                <div title={a.label} style={{ width:34, height:34, borderRadius:8, background:T.primaryLight, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, cursor:'pointer' }}
                  onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background=T.primaryMid}
                  onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background=T.primaryLight}>
                  {a.icon}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Profile + branding + collapse */}
      <div style={{ padding:'10px 8px', borderTop:`1px solid ${T.border}`, flexShrink:0 }}>
        <Link href="/profile" style={{ textDecoration:'none' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:collapsed?'8px':'9px 10px', justifyContent:collapsed?'center':'flex-start', borderRadius:8, cursor:'pointer', background:isActive('/profile')?T.primaryMid:'transparent' }}
            onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background=T.primaryLight}
            onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background=isActive('/profile')?T.primaryMid:'transparent'}>
            <div style={{ width:28, height:28, borderRadius:'50%', background:`linear-gradient(135deg, ${T.primary}, #0F766E)`, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11, fontWeight:700, flexShrink:0 }}>
              {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
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
