import { UserRole, AppModule, Permission, UserPermissions } from '@/types';

// Permissions reflect what is ACTUALLY available in the UI
// C=Create, R=Read, E=Edit, D=Delete
// STN/SRN: no Create (STN comes from Indus); Edit = approve/reject utilisations
// Site Expenses: only Accounting Team can Create/Edit payments
// Reports: Read only for all (auto-generated, no manual create)
// PTW: managed inside Project Detail by SA/RM/PM

function perm(can_create:boolean, can_read:boolean, can_edit:boolean, can_delete:boolean): Permission {
  return { module:'dashboard', can_create, can_read, can_edit, can_delete };
}

function buildFull(): Record<AppModule, Permission> {
  const modules: AppModule[] = ['dashboard','projects','vendors','srn_return','site_expenses','ptw','reports'];
  return Object.fromEntries(modules.map(m=>[m,{
    module:m,
    can_create: m !== 'srn_return' && m !== 'reports', // no create for STN/SRN or Reports
    can_read: true,
    can_edit: true,
    can_delete: m !== 'srn_return' && m !== 'reports',
  }])) as Record<AppModule, Permission>;
}

export const DEFAULT_PERMISSIONS: Record<UserRole, Record<AppModule, Permission>> = {
  super_admin: buildFull(),

  region_manager: {
    dashboard:     perm(false, true,  false, false),
    projects:      perm(true,  true,  true,  false), // create projects, edit via RM portal
    vendors:       perm(true,  true,  true,  false),
    srn_return:    perm(false, true,  true,  false), // can approve/reject utilisations
    site_expenses: perm(false, true,  false, false), // read-only
    ptw:           perm(true,  true,  true,  false), // can create/edit PTW
    reports:       perm(false, true,  false, false),
      sec_project_details:   perm(false,true, true, false),
    sec_financial:         perm(false,true, false,false),
    sec_vendor_assignment: perm(false,true, true, false),
    sec_ptw:               perm(true, true, true, false),
    sec_work_documents:    perm(false,true, false,false),
    sec_stn_srn:           perm(false,true, true, false),
    sec_billing_review:    perm(false,true, false,false),
    sec_activity_log:      perm(false,true, false,false),
  },

  project_manager: {
    dashboard:     perm(false, true,  false, false),
    projects:      perm(false, true,  true,  false), // edit project details, vendor assign
    vendors:       perm(false, true,  false, false),
    srn_return:    perm(false, true,  true,  false), // approve/reject utilisations
    site_expenses: perm(false, true,  false, false), // read-only
    ptw:           perm(true,  true,  true,  false), // create/edit PTW
    reports:       perm(false, true,  false, false),
      sec_project_details:   perm(false,true, true, false),
    sec_financial:         perm(false,true, false,false),
    sec_vendor_assignment: perm(true, true, true, false),
    sec_ptw:               perm(true, true, true, false),
    sec_work_documents:    perm(false,true, false,false),
    sec_stn_srn:           perm(false,true, true, false),
    sec_billing_review:    perm(false,true, true, false),
    sec_activity_log:      perm(false,true, false,false),
  },

  site_engineer: {
    dashboard:     perm(false, true,  false, false),
    projects:      perm(false, true,  false, false), // read-only
    vendors:       perm(false, false, false, false),
    srn_return:    perm(false, true,  false, false), // read-only (region filtered)
    site_expenses: perm(false, false, false, false),
    ptw:           perm(false, true,  false, false), // read-only
    reports:       perm(false, false, false, false),
      sec_project_details:   perm(false,true, false,false),
    sec_financial:         perm(false,false,false,false),
    sec_vendor_assignment: perm(false,true, false,false),
    sec_ptw:               perm(false,true, false,false),
    sec_work_documents:    perm(false,true, false,false),
    sec_stn_srn:           perm(false,true, false,false),
    sec_billing_review:    perm(false,false,false,false),
    sec_activity_log:      perm(false,true, false,false),
  },

  accounting_team: {
    dashboard:     perm(false, true,  false, false),
    projects:      perm(false, true,  false, false), // read-only
    vendors:       perm(false, true,  false, false),
    srn_return:    perm(false, true,  false, false), // view reconciliation + payment summary
    site_expenses: perm(true,  true,  true,  false), // full access — add payments
    ptw:           perm(false, true,  false, false), // read-only
    reports:       perm(false, true,  false, false), // read all reports
      sec_project_details:   perm(false,true, false,false),
    sec_financial:         perm(false,true, true, false),
    sec_vendor_assignment: perm(false,true, false,false),
    sec_ptw:               perm(false,true, false,false),
    sec_work_documents:    perm(false,true, false,false),
    sec_stn_srn:           perm(false,true, false,false),
    sec_billing_review:    perm(false,true, true, false),
    sec_activity_log:      perm(false,true, false,false),
  },

  vendor: {
    dashboard:     perm(false, true,  false, false),
    projects:      perm(false, true,  true,  false), // upload docs, submit utilisation
    vendors:       perm(false, false, false, false),
    srn_return:    perm(false, true,  true,  false), // submit utilisation per item
    site_expenses: perm(false, false, false, false),
    ptw:           perm(false, true,  false, false), // read-only (upload PTW doc)
    reports:       perm(false, false, false, false),
      sec_project_details:   perm(false,true, false,false),
    sec_financial:         perm(false,false,false,false),
    sec_vendor_assignment: perm(false,true, false,false),
    sec_ptw:               perm(false,true, false,false),
    sec_work_documents:    perm(true, true, true, false),
    sec_stn_srn:           perm(false,true, true, false),
    sec_billing_review:    perm(false,false,false,false),
    sec_activity_log:      perm(false,true, false,false),
  },

  viewer: {
    dashboard:     perm(false, true,  false, false),
    projects:      perm(false, true,  false, false),
    vendors:       perm(false, true,  false, false),
    srn_return:    perm(false, true,  false, false),
    site_expenses: perm(false, true,  false, false),
    ptw:           perm(false, true,  false, false),
    reports:       perm(false, true,  false, false),
      sec_project_details:   perm(false,true, false,false),
    sec_financial:         perm(false,true, false,false),
    sec_vendor_assignment: perm(false,true, false,false),
    sec_ptw:               perm(false,true, false,false),
    sec_work_documents:    perm(false,true, false,false),
    sec_stn_srn:           perm(false,true, false,false),
    sec_billing_review:    perm(false,true, false,false),
    sec_activity_log:      perm(false,true, false,false),
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
