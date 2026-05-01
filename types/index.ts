export type UserRole =
  | 'super_admin'
  | 'region_manager'
  | 'project_manager'
  | 'site_engineer'
  | 'viewer';

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  region_manager: 'Region Manager',
  project_manager: 'Project Manager',
  site_engineer: 'Site Engineer',
  viewer: 'Viewer',
};

export const ALL_MODULES = [
  'dashboard',
  'projects',
  'vendors',
  'billing',
  'attendance',
  'safety_compliance',
  'srn_return',
  'site_expenses',
  'reports',
] as const;

export type AppModule = (typeof ALL_MODULES)[number];

export const MODULE_LABELS: Record<AppModule, string> = {
  dashboard: 'Dashboard',
  projects: 'Projects',
  vendors: 'Vendors',
  billing: 'Billing & Invoices',
  attendance: 'Attendance',
  safety_compliance: 'Safety Compliance',
  srn_return: 'SRN Return',
  site_expenses: 'Site Expenses',
  reports: 'Reports',
};

export interface Permission {
  module: AppModule;
  can_create: boolean;
  can_read: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface UserPermissions {
  [module: string]: Permission;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  designation: string | null;
  department: string | null;
  region: string | null;
  role: UserRole;
  is_active: boolean;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  project_no: string;
  site_name: string;
  client: string | null;
  project_type: string | null;
  vendor_id: string | null;
  vendor_name?: string;
  po_value: number;
  aging_days: number;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  progress: number;
  region: string | null;
  created_at: string;
}

export interface Vendor {
  id: string;
  name: string;
  contact_person: string | null;
  contact_no: string | null;
  email: string | null;
  gst_no: string | null;
  is_active: boolean;
  on_time_delivery: number;
  quality_score: number;
  safety_score: number;
  billing_score: number;
  avg_score?: number;
  rating?: string;
  total_projects?: number;
  completed_projects?: number;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_no: string;
  project_id: string | null;
  project_no?: string;
  vendor_id: string | null;
  vendor_name?: string;
  invoice_date: string;
  amount: number;
  gst_amount: number;
  total_amount: number;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  payment_status: 'pending' | 'partial' | 'paid';
  due_date: string;
  created_at: string;
}
