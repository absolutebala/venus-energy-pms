export type UserRole =
  | 'super_admin'
  | 'region_manager'
  | 'project_manager'
  | 'site_engineer'
  | 'viewer'
  | 'vendor';

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin:     'Super Admin',
  region_manager:  'Region Manager',
  project_manager: 'Project Manager',
  site_engineer:   'Site Engineer',
  viewer:          'Viewer',
  vendor:          'Vendor',
};

export const ALL_MODULES = [
  'dashboard', 'projects', 'vendors', 'billing',
  'attendance', 'safety_compliance', 'srn_return',
  'site_expenses', 'reports',
] as const;

export type AppModule = (typeof ALL_MODULES)[number];

export const MODULE_LABELS: Record<AppModule, string> = {
  dashboard:        'Dashboard',
  projects:         'Projects',
  vendors:          'Vendors',
  billing:          'Billing & Invoices',
  attendance:       'Attendance',
  safety_compliance:'Safety Compliance',
  srn_return:       'SRN Return',
  site_expenses:    'Site Expenses',
  reports:          'Reports',
};

export interface Permission {
  module: AppModule;
  can_create: boolean;
  can_read:   boolean;
  can_edit:   boolean;
  can_delete: boolean;
}

export interface UserPermissions { [module: string]: Permission; }

export interface Profile {
  id:          string;
  email:       string;
  full_name:   string | null;
  phone:       string | null;
  designation: string | null;
  department:  string | null;
  region:      string | null;
  role:        UserRole;
  vendor_id:   string | null; // links profile to vendors table when role=vendor
  is_active:   boolean;
  avatar_url:  string | null;
  created_at:  string;
  updated_at:  string;
}

// Project workflow statuses
export type ProjectStatus =
  | 'pending'          // Not started
  | 'in_progress'      // Vendor working
  | 'submitted'        // Vendor submitted for PM review
  | 'under_review'     // PM reviewing
  | 'rejected'         // PM rejected, back to vendor
  | 'pm_approved'      // PM approved, sent to billing
  | 'billing_review'   // Billing team reviewing
  | 'completed'        // Fully done
  | 'delayed';         // Overdue

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  pending:       'Pending',
  in_progress:   'In Progress',
  submitted:     'Submitted for Review',
  under_review:  'Under PM Review',
  rejected:      'Rejected',
  pm_approved:   'PM Approved',
  billing_review:'Billing Review',
  completed:     'Completed',
  delayed:       'Delayed',
};

export interface WorkDocument {
  type: 'safety_photos' | 'site_photos' | 'jmr_document' | 'ac_certificate' | 'noc_document' | 'drawing_document';
  label: string;
  status: 'pending' | 'uploaded';
  fileName?: string;
}

export const WORK_DOCUMENTS: WorkDocument[] = [
  { type:'safety_photos',   label:'Safety Photos',   status:'pending' },
  { type:'site_photos',     label:'Site Photos',     status:'pending' },
  { type:'jmr_document',    label:'JMR Document',    status:'pending' },
  { type:'ac_certificate',  label:'AC Certificate',  status:'pending' },
  { type:'noc_document',    label:'NOC Document',    status:'pending' },
  { type:'drawing_document',label:'Drawing Document',status:'pending' },
];
