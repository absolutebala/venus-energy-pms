import { PROJECTS, SHARED_EXPENSES } from './seedData';

export { SHARED_EXPENSES };
export type { Expense } from './seedData';

export const VENDOR_PROJECTS: Record<string, any[]> = (PROJECTS as any[]).reduce((acc:any, p:any) => {
  if (!acc[p.vendor]) acc[p.vendor] = [];
  acc[p.vendor].push(p);
  return acc;
}, {});

export const PAYMENT_TRANSACTIONS: any[] = [];

export const getPaidAmount = (projectId: string) =>
  (SHARED_EXPENSES as any[]).filter(e => e.projectId === projectId).reduce((a,e) => a + Number(e.amount), 0);

export const getProjectTransactions = (projectId: string) =>
  (SHARED_EXPENSES as any[]).filter(e => e.projectId === projectId);

export interface PaymentTransaction {
  id: string; projectId: string; vendor: string; amount: number; date: string;
  bankTxnNo?: string; notes?: string; txnNumber?: string;
  description?: string; addedBy?: string; addedAt?: string;
}

export interface Expense {
  id: number; txnRef: string; date: string; site: string;
  expenseType: string; amount: number; paymentMode: string; projectId: string;
}
