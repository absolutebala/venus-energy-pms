import { UserRole, AppModule, Permission, UserPermissions } from '@/types';

// Default permission matrix — Super Admin always has full access.
// These are the fallback defaults; actual permissions are stored in DB.
export const DEFAULT_PERMISSIONS: Record<UserRole, Record<AppModule, Permission>> = {
  super_admin: buildFull(),
  region_manager: {
    dashboard:        perm(false, true, false, false),
    projects:         perm(true,  true, true,  false),
    vendors:          perm(true,  true, true,  false),
    billing:          perm(true,  true, true,  false),
    attendance:       perm(true,  true, true,  false),
    safety_compliance:perm(true,  true, true,  false),
    srn_return:       perm(true,  true, true,  false),
    site_expenses:    perm(true,  true, true,  false),
    reports:          perm(false, true, false, false),
  },
  project_manager: {
    dashboard:        perm(false, true, false, false),
    projects:         perm(true,  true, true,  false),
    vendors:          perm(false, true, false, false),
    billing:          perm(true,  true, false, false),
    attendance:       perm(true,  true, true,  false),
    safety_compliance:perm(true,  true, true,  false),
    srn_return:       perm(true,  true, false, false),
    site_expenses:    perm(true,  true, true,  false),
    reports:          perm(false, true, false, false),
  },
  site_engineer: {
    dashboard:        perm(false, true, false, false),
    projects:         perm(false, true, true,  false),
    vendors:          perm(false, true, false, false),
    billing:          perm(false, true, false, false),
    attendance:       perm(true,  true, true,  false),
    safety_compliance:perm(true,  true, true,  false),
    srn_return:       perm(true,  true, false, false),
    site_expenses:    perm(true,  true, false, false),
    reports:          perm(false, true, false, false),
  },
  viewer: {
    dashboard:        perm(false, true, false, false),
    projects:         perm(false, true, false, false),
    vendors:          perm(false, true, false, false),
    billing:          perm(false, true, false, false),
    attendance:       perm(false, true, false, false),
    safety_compliance:perm(false, true, false, false),
    srn_return:       perm(false, true, false, false),
    site_expenses:    perm(false, true, false, false),
    reports:          perm(false, true, false, false),
  },
};

function perm(
  can_create: boolean,
  can_read: boolean,
  can_edit: boolean,
  can_delete: boolean
): Permission {
  return { module: 'dashboard', can_create, can_read, can_edit, can_delete };
}

function buildFull(): Record<AppModule, Permission> {
  const modules: AppModule[] = [
    'dashboard','projects','vendors','billing','attendance',
    'safety_compliance','srn_return','site_expenses','reports',
  ];
  return Object.fromEntries(
    modules.map((m) => [m, { module: m, can_create: true, can_read: true, can_edit: true, can_delete: true }])
  ) as Record<AppModule, Permission>;
}

export function can(
  permissions: UserPermissions,
  module: AppModule,
  action: 'create' | 'read' | 'edit' | 'delete'
): boolean {
  const p = permissions[module];
  if (!p) return false;
  if (action === 'create') return p.can_create;
  if (action === 'read')   return p.can_read;
  if (action === 'edit')   return p.can_edit;
  if (action === 'delete') return p.can_delete;
  return false;
}
