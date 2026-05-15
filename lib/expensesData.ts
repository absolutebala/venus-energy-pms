export { SHARED_EXPENSES } from './seedData';
export type { Expense } from './seedData';

// Legacy helpers
export const PAYMENT_TRANSACTIONS = [] as any[];
export const getPaidAmount = (projectId: string) => 0;
export const getProjectTransactions = (projectId: string) => [] as any[];

export interface PaymentTransaction {
  id: string;
  projectId: string;
  vendor: string;
  amount: number;
  date: string;
  bankTxnNo: string;
  notes?: string;
}

export const VENDOR_PROJECTS: Record<string, string[]> = {
  'ABC Telecom Services':     ['VE-2025-001','VE-2025-007','VE-2025-013'],
  'XYZ Infra Solutions':      ['VE-2025-002','VE-2025-008','VE-2025-014'],
  'TowerTech Pvt Ltd':        ['VE-2025-003','VE-2025-009','VE-2025-015'],
  'NetConnect Services':      ['VE-2025-004','VE-2025-010'],
  'PowerSys India':           ['VE-2025-005','VE-2025-011'],
  'BuildRight Constructions': ['VE-2025-006','VE-2025-012'],
};
