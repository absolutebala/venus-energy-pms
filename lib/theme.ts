export const T = {
  // Core
  bg:           '#F8FAFC',
  surface:      '#FFFFFF',
  surfaceHover: '#F0FDFA',
  border:       '#E2E8F0',
  borderFocus:  '#0D9488',

  // Teal primary
  primary:      '#0D9488',
  primaryHover: '#0F766E',
  primaryLight: '#F0FDFA',
  primaryMid:   '#CCFBF1',
  primaryText:  '#FFFFFF',

  // Text
  text:         '#0F172A',
  textMuted:    '#64748B',
  textDim:      '#94A3B8',

  // Sidebar
  sidebar:      '#FFFFFF',
  sidebarBorder:'#E2E8F0',

  // Status
  success:      '#16A34A',
  successBg:    '#F0FDF4',
  warning:      '#D97706',
  warningBg:    '#FFFBEB',
  danger:       '#DC2626',
  dangerBg:     '#FEF2F2',
  info:         '#2563EB',
  infoBg:       '#EFF6FF',
  purple:       '#7C3AED',
  purpleBg:     '#F5F3FF',

  // Input
  input:        '#FFFFFF',
  inputBorder:  '#CBD5E1',
  inputFocus:   '#0D9488',

  // Shadow
  shadow:       '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
  shadowMd:     '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.05)',
  shadowLg:     '0 10px 15px -3px rgba(0,0,0,0.07), 0 4px 6px -2px rgba(0,0,0,0.04)',
};

export const badge = (status: string): React.CSSProperties => {
  const map: Record<string, [string, string, string]> = {
    'In Progress':   ['#EFF6FF', '#1D4ED8', '#BFDBFE'],
    'in_progress':   ['#EFF6FF', '#1D4ED8', '#BFDBFE'],
    'Completed':     ['#F0FDF4', '#15803D', '#BBF7D0'],
    'completed':     ['#F0FDF4', '#15803D', '#BBF7D0'],
    'Pending':       ['#FFFBEB', '#B45309', '#FDE68A'],
    'pending':       ['#FFFBEB', '#B45309', '#FDE68A'],
    'Delayed':       ['#FEF2F2', '#B91C1C', '#FECACA'],
    'delayed':       ['#FEF2F2', '#B91C1C', '#FECACA'],
    'Approved':      ['#F0FDF4', '#15803D', '#BBF7D0'],
    'approved':      ['#F0FDF4', '#15803D', '#BBF7D0'],
    'Submitted':     ['#EFF6FF', '#1D4ED8', '#BFDBFE'],
    'submitted':     ['#EFF6FF', '#1D4ED8', '#BFDBFE'],
    'Under Review':  ['#F5F3FF', '#6D28D9', '#DDD6FE'],
    'under_review':  ['#F5F3FF', '#6D28D9', '#DDD6FE'],
    'Rejected':      ['#FEF2F2', '#B91C1C', '#FECACA'],
    'rejected':      ['#FEF2F2', '#B91C1C', '#FECACA'],
    'Paid':          ['#F0FDF4', '#15803D', '#BBF7D0'],
    'paid':          ['#F0FDF4', '#15803D', '#BBF7D0'],
    'Partial':       ['#FFFBEB', '#B45309', '#FDE68A'],
    'partial':       ['#FFFBEB', '#B45309', '#FDE68A'],
    'Draft':         ['#F8FAFC', '#64748B', '#CBD5E1'],
    'draft':         ['#F8FAFC', '#64748B', '#CBD5E1'],
    'Active':        ['#F0FDF4', '#15803D', '#BBF7D0'],
    'Inactive':      ['#FEF2F2', '#B91C1C', '#FECACA'],
  };
  const [bg, color, border] = map[status] || ['#F8FAFC', '#64748B', '#CBD5E1'];
  return {
    background: bg, color, border: `1px solid ${border}`,
    padding: '3px 10px', borderRadius: 20, fontSize: 11,
    fontWeight: 600, display: 'inline-block', whiteSpace: 'nowrap',
  } as React.CSSProperties;
};

export const card: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: 12,
  padding: 20,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
};

export const inputStyle = (focused?: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '9px 12px',
  background: '#FFFFFF',
  border: `1.5px solid ${focused ? '#0D9488' : '#CBD5E1'}`,
  borderRadius: 8,
  fontSize: 14,
  color: '#0F172A',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
});

export const btnPrimary: React.CSSProperties = {
  background: '#0D9488',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: 8,
  padding: '9px 18px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  transition: 'background 0.15s',
};

export const btnSecondary: React.CSSProperties = {
  background: '#FFFFFF',
  color: '#0D9488',
  border: '1.5px solid #0D9488',
  borderRadius: 8,
  padding: '8px 18px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

export const btnDanger: React.CSSProperties = {
  background: '#FEF2F2',
  color: '#DC2626',
  border: '1.5px solid #FECACA',
  borderRadius: 8,
  padding: '8px 18px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

export const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  fontWeight: 600,
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: 0.7,
  color: '#64748B',
  background: '#F8FAFC',
  whiteSpace: 'nowrap',
  borderBottom: '1px solid #E2E8F0',
};

export const td: React.CSSProperties = {
  padding: '12px 12px',
  color: '#475569',
  fontSize: 13,
  borderBottom: '1px solid #F1F5F9',
};
