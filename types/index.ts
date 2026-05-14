export type UserRole =
  | 'super_admin'
  | 'region_manager'
  | 'project_manager'
  | 'site_engineer'
  | 'viewer'
  | 'vendor'
  | 'accounting_team';

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin:     'Super Admin',
  region_manager:  'Region Manager',
  project_manager: 'Project Manager',
  site_engineer:   'Site Engineer',
  viewer:          'Viewer',
  vendor:          'Vendor',
  accounting_team: 'Accounting Team',
};

export const ALL_MODULES = [
  'dashboard', 'projects', 'vendors', 'srn_return', 'ptw',
  'site_expenses', 'reports',
  'sec_project_details', 'sec_financial', 'sec_vendor_assignment',
  'sec_ptw', 'sec_work_documents', 'sec_stn_srn', 'sec_billing_review', 'sec_activity_log',
] as const;

export type AppModule =
  | 'dashboard'
  | 'projects'
  | 'vendors'
  | 'srn_return'
  | 'site_expenses'
  | 'ptw'
  | 'reports'
  | 'sec_project_details'
  | 'sec_financial'
  | 'sec_vendor_assignment'
  | 'sec_ptw'
  | 'sec_work_documents'
  | 'sec_stn_srn'
  | 'sec_billing_review'
  | 'sec_activity_log';

export const MODULE_LABELS: Record<AppModule, string> = {
  dashboard:              'Dashboard',
  projects:               'Projects',
  vendors:                'Vendors',
  srn_return:             'STN / SRN Status',
  site_expenses:          'Site Expenses',
  ptw:                    'PTW Management',
  reports:                'Reports',
  sec_project_details:    'Project Details Section',
  sec_financial:          'Financial Summary Section',
  sec_vendor_assignment:  'Vendor Assignment Section',
  sec_ptw:                'PTW Section',
  sec_work_documents:     'Work Documents Section',
  sec_stn_srn:            'STN/SRN Section',
  sec_billing_review:     'Billing Review Section',
  sec_activity_log:       'Activity Log Section',
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
