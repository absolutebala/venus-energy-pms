import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { T } from '@/lib/theme';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':          '📊  Dashboard',
  '/projects':           '📁  Projects',
  '/vendors':            '🏢  Vendors',
  '/billing':            '💳  Billing & Invoices',
  '/attendance':         '📅  Attendance',
  '/safety-compliance':  '🛡  Safety Compliance',
  '/srn-return':         '↩  SRN Return',
  '/site-expenses':      '💰  Site Expenses',
  '/reports':            '📊  Reports',
  '/profile':            '👤  Profile Settings',
  '/admin/users':        '👥  User Management',
  '/admin/roles':        '🔑  Role & Permissions',
  '/projects/new':       '📋  Add Purchase Order',
  '/projects/[id]':      '📁  Project Details',
};

export default function Header() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');

  const title = PAGE_TITLES[router.pathname] || 'Venus Energy PMS';

  return (
    <header style={{
      height: 64,
      background: T.surface,
      borderBottom: `1px solid ${T.border}`,
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: 16,
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      {/* Title */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: T.text }}>{title}</div>
        <div style={{ fontSize: 11, color: T.textDim }}>Venus Energy Pvt. Ltd. · Telecom Infrastructure</div>
      </div>

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: T.bg, border: `1px solid ${T.border}`,
        borderRadius: 8, padding: '7px 12px', width: 220,
      }}>
        <span style={{ fontSize: 13, color: T.textDim }}>🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search projects, sites…"
          style={{
            background: 'none', border: 'none', outline: 'none',
            fontSize: 13, color: T.text, width: '100%',
          }}
        />
      </div>

      {/* Notifications */}
      <div style={{ position: 'relative', cursor: 'pointer' }}>
        <div style={{
          width: 36, height: 36, background: T.bg, border: `1px solid ${T.border}`,
          borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
        }}>🔔</div>
        <div style={{
          position: 'absolute', top: -4, right: -4,
          width: 17, height: 17, background: T.danger, borderRadius: '50%',
          fontSize: 9, fontWeight: 700, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid #fff',
        }}>6</div>
      </div>

      {/* User menu */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: 9,
            background: T.bg, border: `1px solid ${T.border}`,
            borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
          }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: `linear-gradient(135deg, ${T.primary}, #0F766E)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 11, fontWeight: 700,
          }}>
            {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{profile?.full_name || 'User'}</div>
            <div style={{ fontSize: 10, color: T.textDim }}>
              {profile?.role?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </div>
          </div>
          <span style={{ fontSize: 10, color: T.textDim }}>▾</span>
        </button>

        {menuOpen && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 200 }}
              onClick={() => setMenuOpen(false)}
            />
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0,
              background: T.surface, border: `1px solid ${T.border}`,
              borderRadius: 10, padding: 6, minWidth: 180,
              boxShadow: T.shadowLg, zIndex: 201,
            }}>
              <Link href="/profile" style={{ textDecoration: 'none' }}>
                <div style={{ padding: '8px 12px', borderRadius: 6, fontSize: 13, color: T.text, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                  onClick={() => setMenuOpen(false)}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = T.bg}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
                  👤 Profile Settings
                </div>
              </Link>
              <div style={{ height: 1, background: T.border, margin: '4px 0' }} />
              <div
                onClick={() => { setMenuOpen(false); signOut().then(() => router.push('/login')); }}
                style={{ padding: '8px 12px', borderRadius: 6, fontSize: 13, color: T.danger, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = T.dangerBg}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
                🚪 Sign Out
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
