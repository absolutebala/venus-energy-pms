import React from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { T, card, badge, th, td } from '@/lib/theme';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const fmt = (v: number) => `₹${(v / 100000).toFixed(2)}L`;

const kpis = [
  { label: 'Total PO Value',   value: '₹12.45 Cr', icon: '📋', color: T.primary,  trend: '+12%', up: true  },
  { label: 'Pending Billing',  value: '₹2.35 Cr',  icon: '⏳', color: T.warning,  trend: '-5%',  up: false },
  { label: 'Active Projects',  value: '48',          icon: '⚡', color: T.success,  trend: '+3',   up: true  },
  { label: 'PO Aging >30d',    value: '16',          icon: '⏰', color: T.danger,   trend: '+2',   up: false },
  { label: 'Total Expenses',   value: '₹1.25 Cr',  icon: '💰', color: T.purple,   trend: '+8%',  up: false },
];

const statusData = [
  { name: 'Completed',   value: 19, color: '#16A34A' },
  { name: 'In Progress', value: 14, color: '#2563EB' },
  { name: 'Pending',     value: 10, color: '#D97706' },
  { name: 'Delayed',     value:  8, color: '#DC2626' },
];

const agingData = [
  { range: '0–30d',  count: 26, fill: '#16A34A' },
  { range: '31–60d', count: 14, fill: '#2563EB' },
  { range: '61–90d', count:  6, fill: '#D97706' },
  { range: '90+d',   count:  4, fill: '#DC2626' },
];

const recentProjects = [
  { id: 'VE-2025-001', site: 'Chennai North',     type: 'Tower Erection',       po: 1850000, aging: 12, status: 'In Progress' },
  { id: 'VE-2025-002', site: 'Bengaluru East',    type: 'Maintenance',           po:  420000, aging: 78, status: 'Delayed'     },
  { id: 'VE-2025-003', site: 'Hyderabad Central', type: 'Component Replacement', po:  760000, aging: 22, status: 'Completed'   },
  { id: 'VE-2025-004', site: 'Chennai South',     type: 'Fiber Installation',    po: 1230000, aging: 12, status: 'In Progress' },
  { id: 'VE-2025-005', site: 'Coimbatore',        type: 'Tower Erection',        po: 2200000, aging:  8, status: 'Pending'     },
];

const alerts = [
  { type: 'danger', title: 'Delayed Projects (>60d)', count: 3,  msg: 'VE-002, 006, 009 — critical overdue'     },
  { type: 'warn',   title: 'Safety Cert. Expiring',   count: 5,  msg: '5 certificates expire within 7 days'     },
  { type: 'info',   title: 'Pending Billing',          count: 12, msg: '12 invoices awaiting approval'           },
  { type: 'warn',   title: 'SRN Material Return',      count: 7,  msg: '7 material returns outstanding'         },
];

const alertColors: Record<string, string> = { danger: T.danger, warn: T.warning, info: T.info };
const alertBgs:    Record<string, string> = { danger: T.dangerBg, warn: T.warningBg, info: T.infoBg };

export default function Dashboard() {
  const { profile } = useAuth();

  return (
    <Layout>
      <div className="fade-in">
        {/* Welcome bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: T.text }}>
              Welcome back, {profile?.full_name?.split(' ')[0] || 'User'} 👋
            </h2>
            <p style={{ fontSize: 13, color: T.textMuted }}>Here's what's happening across all your projects today.</p>
          </div>
          <div style={{ fontSize: 12, color: T.textDim }}>
            {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 20 }}>
          {kpis.map((k, i) => (
            <div key={i} style={{ ...card, position: 'relative', overflow: 'hidden', padding: '16px 18px' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.color }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 500, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{k.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: -0.5 }}>{k.value}</div>
                </div>
                <div style={{ width: 36, height: 36, background: `${k.color}15`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{k.icon}</div>
              </div>
              <div style={{ fontSize: 11, color: k.up ? T.success : T.danger, marginTop: 10, fontWeight: 500 }}>
                {k.up ? '▲' : '▼'} {k.trend} vs last month
              </div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
          {/* Status pie */}
          <div style={card}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 14 }}>Project Status Distribution</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={44} outerRadius={68} dataKey="value" paddingAngle={3}>
                    {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1 }}>
                {statusData.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: T.textMuted, flex: 1 }}>{d.name}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{d.value}</span>
                    <span style={{ fontSize: 11, color: T.textDim }}>({Math.round(d.value / 51 * 100)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Aging bar */}
          <div style={card}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 14 }}>PO Aging Analysis (Days)</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={agingData} barSize={36}>
                <XAxis dataKey="range" tick={{ fontSize: 12, fill: T.textMuted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: T.textMuted }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12 }} cursor={{ fill: '#F1F5F9' }} />
                <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                  {agingData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Projects table + Alerts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14 }}>
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Recent Projects</div>
              <button style={{ fontSize: 12, color: T.primary, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>View All →</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%' }}>
                <thead>
                  <tr>{['Project ID','Site','Job Type','PO Value','Aging','Status'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {recentProjects.map((p, i) => (
                    <tr key={i}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = T.bg}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}>
                      <td style={{ ...td, color: T.primary, fontWeight: 700 }}>{p.id}</td>
                      <td style={{ ...td, color: T.text, fontWeight: 500 }}>{p.site}</td>
                      <td style={td}><span style={{ fontSize: 11, background: T.primaryLight, color: T.primary, padding: '2px 8px', borderRadius: 5, fontWeight: 500 }}>{p.type}</span></td>
                      <td style={{ ...td, fontWeight: 600, color: T.text }}>{fmt(p.po)}</td>
                      <td style={td}><span style={{ color: p.aging > 60 ? T.danger : p.aging > 30 ? T.warning : T.success, fontWeight: 700 }}>{p.aging}d</span></td>
                      <td style={td}><span style={badge(p.status)}>{p.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Alerts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>🔔 Alerts & Notifications</div>
            {alerts.map((a, i) => (
              <div key={i} style={{ ...card, padding: 12, borderLeft: `3px solid ${alertColors[a.type]}`, background: alertBgs[a.type] }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{a.title}</div>
                  <div style={{ background: alertColors[a.type], color: '#fff', borderRadius: 12, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>{a.count}</div>
                </div>
                <div style={{ fontSize: 11, color: T.textMuted }}>{a.msg}</div>
              </div>
            ))}

            {/* Quick Actions */}
            <div style={{ ...card, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 10 }}>⚡ Quick Actions</div>
              {['Create New Project','Add Work Update','Upload SRN Return','Create Invoice'].map((a, i, arr) => (
                <button key={i} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: '9px 0', background: 'none', border: 'none', color: T.primary, cursor: 'pointer', fontSize: 12, fontWeight: 500, borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                  <span>{a}</span><span>›</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
