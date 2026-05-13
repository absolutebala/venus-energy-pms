import { UserRole, AppModule, Permission, UserPermissions } from '@/types';

function perm(can_create:boolean, can_read:boolean, can_edit:boolean, can_delete:boolean): Permission {
  return { module:'dashboard', can_create, can_read, can_edit, can_delete };
}

function buildFull(): Record<AppModule, Permission> {
  const modules: AppModule[] = ['dashboard','projects','vendors','srn_return','site_expenses','ptw','reports'];
  return Object.fromEntries(modules.map(m=>[m,{ module:m, can_create:true, can_read:true, can_edit:true, can_delete:true }])) as Record<AppModule, Permission>;
}

export const DEFAULT_PERMISSIONS: Record<UserRole, Record<AppModule, Permission>> = {
  super_admin: buildFull(),
  region_manager: {
    dashboard:    perm(false,true, false,false),
    projects:     perm(true, true, true, false),
    vendors:      perm(true, true, true, false),
    srn_return:   perm(false,true, false,false),
    site_expenses:perm(true, true, true, false),
    ptw:          perm(true, true, true, false),
    reports:      perm(false,true, false,false),
  },
  project_manager: {
    dashboard:    perm(false,true, false,false),
    projects:     perm(false,true, true, false),
    vendors:      perm(false,true, false,false),
    srn_return:   perm(false,true, true, false),
    site_expenses:perm(true, true, true, false),
    ptw:          perm(true, true, true, false),
    reports:      perm(false,true, false,false),
  },
  site_engineer: {
    dashboard:    perm(false,true, false,false),
    projects:     perm(false,true, false,false),
    vendors:      perm(false,false,false,false),
    srn_return:   perm(false,true, false,false),
    site_expenses:perm(true, true, false,false),
    ptw:          perm(false,true, false,false),
    reports:      perm(false,false,false,false),
  },
  viewer: {
    dashboard:    perm(false,true, false,false),
    projects:     perm(false,true, false,false),
    vendors:      perm(false,true, false,false),
    srn_return:   perm(false,true, false,false),
    site_expenses:perm(false,true, false,false),
    ptw:          perm(false,true, false,false),
    reports:      perm(false,true, false,false),
  },
  accounting_team: {
    dashboard:    perm(false,true, false,false),
    projects:     perm(false,true, false,false),
    vendors:      perm(false,true, false,false),
    srn_return:   perm(false,true, true, false),
    site_expenses:perm(false,true, false,false),
    ptw:          perm(false,true, false,false),
    reports:      perm(true, true, true, false),
  },
  vendor: {
    dashboard:    perm(false,true, false,false),
    projects:     perm(false,true, true, false),
    vendors:      perm(false,false,false,false),
    srn_return:   perm(true, true, true, false),
    site_expenses:perm(false,false,false,false),
    ptw:          perm(false,true, false,false),
    reports:      perm(false,false,false,false),
  },
};

export function can(permissions: UserPermissions, module: AppModule, action:'create'|'read'|'edit'|'delete'): boolean {
  const p = permissions[module];
  if (!p) return false;
  if (action==='create') return p.can_create;
  if (action==='read')   return p.can_read;
  if (action==='edit')   return p.can_edit;
  return p.can_delete;
}
