import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard, FolderOpen, Building2, Package, Wallet,
  FileText, BarChart3, Shield, User, Users, Lock,
  ChevronLeft, ChevronRight, Boxes, ClipboardList,
  Settings, Bell, TrendingUp
} from 'lucide-react';

interface NavItem { href: string; label: string; icon: React.ReactNode; module?: string; }

const iconSize = 17;
const iconProps = { size: iconSize, strokeWidth: 1.75 };

// ── Per-role nav configs ─────────────────────────────────────────
const SA_NAV: NavItem[] = [
  { href:'/dashboard',         label:'Dashboard',        icon:<LayoutDashboard {...iconProps} />, module:'dashboard'         },
  { href:'/projects',          label:'Projects',         icon:<FolderOpen {...iconProps} />,      module:'projects'          },
  { href:'/vendors',           label:'Vendors',          icon:<Building2 {...iconProps} />,        module:'vendors'           },
  { href:'/srn-return',        label:'STN / SRN Status', icon:<Package {...iconProps} />,          module:'srn_return'        },
  { href:'/site-expenses',     label:'Expenses',         icon:<Wallet {...iconProps} />,           module:'site_expenses'     },
  { href:'/invoices',          label:'Invoices',         icon:<FileText {...iconProps} />,         module:'invoices'          },
  { href:'/reports',           label:'Reports',          icon:<BarChart3 {...iconProps} />,        module:'reports'           },
  { href:'/safety-compliance', label:'Safety Compliance',icon:<Shield {...iconProps} />,           module:'safety_compliance' },
];

const VENDOR_NAV: NavItem[] = [
  { href:'/dashboard', label:'Dashboard',    icon:<LayoutDashboard {...iconProps} />, module:'dashboard' },
  { href:'/projects',  label:'My Projects', icon:<FolderOpen {...iconProps} />,      module:'projects'  },
];

const PM_NAV: NavItem[] = [
  { href:'/dashboard',     label:'Dashboard',       icon:<LayoutDashboard {...iconProps} />, module:'dashboard'     },
  { href:'/projects',      label:'My Projects',     icon:<FolderOpen {...iconProps} />,      module:'projects'      },
  { href:'/srn-return',    label:'STN / SRN Status',icon:<Package {...iconProps} />,          module:'srn_return'    },
  { href:'/site-expenses', label:'Expenses',        icon:<Wallet {...iconProps} />,           module:'site_expenses' },
  { href:'/invoices',      label:'Invoices',        icon:<FileText {...iconProps} />,         module:'invoices'      },
  { href:'/profile',       label:'Profile',         icon:<User {...iconProps} />                                    },
];

const RM_NAV: NavItem[] = [
  { href:'/dashboard',         label:'Dashboard',        icon:<LayoutDashboard {...iconProps} />, module:'dashboard'         },
  { href:'/projects',          label:'Projects',         icon:<FolderOpen {...iconProps} />,      module:'projects'          },
  { href:'/invoices',          label:'Invoices',         icon:<FileText {...iconProps} />,         module:'invoices'          },
  { href:'/reports',           label:'Reports',          icon:<BarChart3 {...iconProps} />,        module:'reports'           },
  { href:'/safety-compliance', label:'Safety Compliance',icon:<Shield {...iconProps} />,           module:'safety_compliance' },
];

const ACCOUNTING_NAV: NavItem[] = [
  { href:'/dashboard',         label:'Dashboard',        icon:<LayoutDashboard {...iconProps} />, module:'dashboard'         },
  { href:'/projects',          label:'Projects',         icon:<FolderOpen {...iconProps} />,      module:'projects'          },
  { href:'/vendors',           label:'Vendors',          icon:<Building2 {...iconProps} />,        module:'vendors'           },
  { href:'/invoices',          label:'Invoices',         icon:<FileText {...iconProps} />,         module:'invoices'          },
  { href:'/reports',           label:'Reports',          icon:<BarChart3 {...iconProps} />,        module:'reports'           },
  { href:'/safety-compliance', label:'Safety Compliance',icon:<Shield {...iconProps} />,           module:'safety_compliance' },
];

const ADMIN_NAV: NavItem[] = [
  { href:'/admin/users', label:'User Management',    icon:<Users {...iconProps} /> },
  { href:'/admin/roles', label:'Role & Permissions', icon:<Lock {...iconProps} /> },
];

interface Props { collapsed: boolean; onCollapse: (v: boolean) => void; }

export default function Sidebar({ collapsed, onCollapse }: Props) {
  const { pathname } = useRouter();
  const { profile, can, loading, isVendor } = useAuth();
  const isPM         = !loading && profile?.role === 'project_manager';
  const isRM         = !loading && profile?.role === 'region_manager';
  const isAccounting = !loading && profile?.role === 'accounting_team';
  const isSuperAdmin = !loading && profile?.role === 'super_admin';

  const isActive = (href: string) => {
    if (pathname === href) return true;
    if (href === '/dashboard') return false;
    if (href === '/projects') return pathname === '/projects' || pathname.startsWith('/projects/');
    return pathname.startsWith(href);
  };

  const shouldShow = (item: NavItem) => {
    if (!item.module) return true;
    if (loading) return true;
    return can(item.module as any, 'read');
  };

  const mainNav: NavItem[] = isVendor ? VENDOR_NAV
    : isPM         ? PM_NAV
    : isRM         ? RM_NAV
    : isAccounting ? ACCOUNTING_NAV
    : SA_NAV;

  const T = {
    primary: '#0D9488',
    primaryLight: '#F0FDFA',
    bg: '#F8FAFC',
    text: '#1E293B',
    textMuted: '#64748B',
    border: '#E2E8F0',
  };

  const navLink = (item: NavItem) => {
    if (!shouldShow(item)) return null;
    const active = isActive(item.href);
    return (
      <Link key={item.href} href={item.href}
        style={{ display:'flex', alignItems:'center', gap:10, padding:collapsed?'10px':'10px 14px',
          borderRadius:9, marginBottom:2, textDecoration:'none', transition:'all 0.15s',
          justifyContent: collapsed ? 'center' : 'flex-start',
          background: active ? T.primaryLight : 'transparent',
          color: active ? T.primary : T.textMuted,
        }}
        title={collapsed ? item.label : undefined}
        onMouseEnter={e=>{if(!active)(e.currentTarget as HTMLElement).style.background='#F1F5F9';}}
        onMouseLeave={e=>{if(!active)(e.currentTarget as HTMLElement).style.background='transparent';}}>
        <span style={{ color: active ? T.primary : T.textMuted, display:'flex', alignItems:'center', flexShrink:0 }}>
          {item.icon}
        </span>
        {!collapsed && (
          <span style={{ fontSize:13, fontWeight: active ? 600 : 400, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {item.label}
          </span>
        )}
        {!collapsed && active && (
          <span style={{ marginLeft:'auto', width:5, height:5, borderRadius:'50%', background:T.primary, flexShrink:0 }} />
        )}
      </Link>
    );
  };

  const showAdmin = isSuperAdmin;

  return (
    <div style={{ width: collapsed ? 60 : 220, minHeight:'100vh', background:'#fff',
      borderRight:`1px solid ${T.border}`, display:'flex', flexDirection:'column',
      transition:'width 0.2s', position:'relative', flexShrink:0 }}>

      {/* Logo */}
      <div style={{ padding: collapsed ? '18px 0' : '18px 20px', borderBottom:`1px solid ${T.border}`,
        display:'flex', alignItems:'center', gap:10, justifyContent: collapsed ? 'center' : 'flex-start' }}>
        <div style={{ width:32, height:32, borderRadius:9, background:`linear-gradient(135deg,${T.primary},#0F766E)`,
          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Boxes size={18} color="#fff" strokeWidth={1.75} />
        </div>
        {!collapsed && (
          <div>
            <div style={{ fontSize:13, fontWeight:800, color:T.text, lineHeight:1.2 }}>Venus Energy</div>
            <div style={{ fontSize:9, color:T.textMuted, textTransform:'uppercase', letterSpacing:0.8 }}>Project Control</div>
          </div>
        )}
      </div>

      {/* Main nav */}
      <div style={{ flex:1, padding: collapsed ? '12px 8px' : '12px 10px', overflowY:'auto' }}>
        {mainNav.map(navLink)}

        {/* Admin section */}
        {showAdmin && (
          <>
            <div style={{ margin:'12px 4px 6px', fontSize:9, fontWeight:700, textTransform:'uppercase',
              letterSpacing:1, color:T.textMuted, display: collapsed ? 'none' : 'block' }}>
              Admin
            </div>
            {ADMIN_NAV.map(navLink)}
          </>
        )}
      </div>

      {/* Collapse toggle */}
      <div style={{ padding:'12px 10px', borderTop:`1px solid ${T.border}` }}>
        <button onClick={()=>onCollapse(!collapsed)}
          style={{ width:'100%', display:'flex', alignItems:'center', justifyContent: collapsed ? 'center' : 'flex-end',
            gap:6, background:'none', border:'none', cursor:'pointer', color:T.textMuted, padding:'6px 4px',
            borderRadius:7, fontSize:12 }}>
          {collapsed ? <ChevronRight size={16} /> : <><span>Collapse</span><ChevronLeft size={16} /></>}
        </button>
      </div>

      {/* User info */}
      {!collapsed && profile && (
        <div style={{ padding:'10px 14px', borderTop:`1px solid ${T.border}`,
          display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:'50%', background:`linear-gradient(135deg,${T.primary},#0F766E)`,
            display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:13, fontWeight:700, flexShrink:0 }}>
            {(profile.full_name||'U')[0].toUpperCase()}
          </div>
          <div style={{ overflow:'hidden' }}>
            <div style={{ fontSize:13, fontWeight:600, color:T.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {profile.full_name||'User'}
            </div>
            <div style={{ fontSize:10, color:T.textMuted, textTransform:'capitalize' }}>
              {profile.role?.replace(/_/g,' ')||''}
            </div>
          </div>
        </div>
      )}

      {/* Powered by */}
      {!collapsed && (
        <div style={{ padding:'8px 14px', borderTop:`1px solid ${T.border}`, textAlign:'center' }}>
          <div style={{ fontSize:10, color:T.textMuted }}>
            Powered by <span style={{ color:T.primary, fontWeight:600 }}>Absolute App Labs</span>
          </div>
        </div>
      )}
    </div>
  );
}
