import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';

const supabase = createClient();

export interface Invoice {
  id: string; invoiceNo: string; invoiceDate: string;
  invoiceAmount: number; gst: number; totalAmount: number;
  wccNo: string; receiptNo: string;
  invoiceStatus: string; paymentStatus: string; dueDate: string;
  projectId: string; poNo: string; createdBy: string;
  investor?: string;
  investor1PaidAmount?: number; investor1Profit1?: number; investor1Profit2?: number; investor1OtherExpenses?: number;
  investor2Profit1?: number; investor2Profit2?: number;
  investor1AdditionalCapital?: number; investor1Interest?: number;
  investor1Incentive?: number; investor1BalanceAmount?: number;
  createdAt?: string; updatedAt?: string;
}

function mapRow(row: any): Invoice {
  return {
    id:            row.id            ?? '',
    invoiceNo:     row.invoice_no    ?? '',
    invoiceDate:   row.invoice_date  ?? '',
    invoiceAmount: Number(row.invoice_amount ?? 0),
    gst:           Number(row.gst           ?? 0),
    totalAmount:   Number(row.total_amount  ?? 0),
    wccNo:         row.wcc_no       ?? '',
    receiptNo:     row.receipt_no   ?? '',
    invoiceStatus: row.invoice_status ?? 'Draft',
    paymentStatus: row.payment_status ?? 'Pending',
    dueDate:       row.due_date       ?? '',
    projectId:     row.project_id     ?? '',
    poNo:          row.po_no          ?? '',
    createdBy:     row.created_by     ?? '',
    investor:               row.investor                  ?? '',
    investor1PaidAmount:    Number(row.investor1_paid_amount    ?? 0),
    investor1Profit1:       Number(row.investor1_profit1        ?? 0),
    investor1Profit2:       Number(row.investor1_profit2        ?? 0),
    investor1OtherExpenses: Number(row.investor1_other_expenses ?? 0),
    investor2Profit1:       Number(row.investor2_profit1        ?? 0),
    investor2Profit2:       Number(row.investor2_profit2        ?? 0),
    investor1AdditionalCapital: Number(row.investor1_additional_capital ?? 0),
    investor1Interest:          Number(row.investor1_interest          ?? 0),
    investor1Incentive:         Number(row.investor1_incentive         ?? 0),
    investor1BalanceAmount:     Number(row.investor1_balance_amount    ?? 0),
    createdAt:     row.created_at     ?? '',
    updatedAt:     row.updated_at     ?? '',
  };
}

function mapToDb(inv: Partial<Invoice>): Record<string, any> {
  const db: Record<string, any> = {};
  const map: Record<string, string> = {
    invoiceNo:'invoice_no', invoiceDate:'invoice_date',
    invoiceAmount:'invoice_amount', totalAmount:'total_amount', invoiceStatus:'invoice_status',
    wccNo:'wcc_no', receiptNo:'receipt_no',
    paymentStatus:'payment_status', dueDate:'due_date',
    projectId:'project_id', poNo:'po_no', createdBy:'created_by',
    investor1PaidAmount:'investor1_paid_amount', investor1Profit1:'investor1_profit1',
    investor1Profit2:'investor1_profit2', investor1OtherExpenses:'investor1_other_expenses',
    investor2Profit1:'investor2_profit1', investor2Profit2:'investor2_profit2',
    investor1AdditionalCapital:'investor1_additional_capital', investor1Interest:'investor1_interest',
    investor1Incentive:'investor1_incentive', investor1BalanceAmount:'investor1_balance_amount',
  };
  const DATE_COLS = new Set(['invoice_date','due_date']);
  for (const [key, val] of Object.entries(inv)) {
    const dbKey = map[key] || key;
    if (dbKey === 'id' || dbKey === 'created_at' || dbKey === 'updated_at') continue;
    db[dbKey] = DATE_COLS.has(dbKey) && val === '' ? null : val;
  }
  return db;
}

interface InvoiceContextType {
  invoices: Invoice[];
  loading: boolean;
  getByProject: (projectId: string) => Invoice[];
  addInvoice: (inv: Omit<Invoice, 'id'|'createdAt'|'updatedAt'>) => Promise<Invoice>;
  updateInvoice: (id: string, updates: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  refreshInvoices: () => Promise<void>;
}

const InvoiceContext = createContext<InvoiceContextType>({
  invoices: [], loading: true,
  getByProject: () => [],
  addInvoice: async () => ({} as Invoice),
  updateInvoice: async () => {},
  deleteInvoice: async () => {},
  refreshInvoices: async () => {},
});

export function InvoiceProvider({ children }: { children: React.ReactNode }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading,  setLoading]  = useState(true);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('invoices').select('*').order('invoice_date', { ascending: false });
    if (!error) setInvoices((data || []).map(mapRow));
    setLoading(false);
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);
  // Re-fetch when browser tab regains focus (avoids stale data after navigation)
  useEffect(() => {
    const onFocus = () => fetchInvoices();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchInvoices]);


  const getByProject = useCallback(
    (projectId: string) => invoices.filter(i => i.projectId === projectId),
    [invoices]
  );


  // Recalculate and update project's billed_amount from all its invoices
  const updateProjectBilled = useCallback(async (projectId: string, updatedInvoices: Invoice[]) => {
    const total = updatedInvoices
      .filter(i => i.projectId === projectId)
      .reduce((sum, i) => sum + (i.invoiceAmount || 0), 0);
    await supabase.from('projects').update({ billed_amount: total }).eq('id', projectId);
  }, []);

  const addInvoice = useCallback(async (inv: Omit<Invoice, 'id'|'createdAt'|'updatedAt'>) => {
    const duplicate = invoices.find(i => i.invoiceNo.trim().toLowerCase() === inv.invoiceNo.trim().toLowerCase());
    if (duplicate) throw new Error(`Invoice number "${inv.invoiceNo}" already exists for project ${duplicate.projectId}`);
    const payload = mapToDb(inv);
    const { data, error } = await supabase.from('invoices').insert(payload).select().single();
    if (error) throw new Error(error.message);
    const newInv = mapRow(data);
    const updated = [newInv, ...invoices];
    setInvoices(updated);
    await updateProjectBilled(inv.projectId, updated);
    return newInv;
  }, [invoices, updateProjectBilled]);

  const updateInvoice = useCallback(async (id: string, updates: Partial<Invoice>) => {
    const payload = { ...mapToDb(updates), updated_at: new Date().toISOString() };
    const { error } = await supabase.from('invoices').update(payload).eq('id', id);
    if (error) throw new Error(error.message);
    const updated = invoices.map(i => i.id === id ? { ...i, ...updates } : i);
    setInvoices(updated);
    const inv = invoices.find(i => i.id === id);
    if (inv?.projectId) await updateProjectBilled(inv.projectId, updated);
  }, [invoices, updateProjectBilled]);

  const deleteInvoice = useCallback(async (id: string) => {
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setInvoices(prev => prev.filter(i => i.id !== id));
  }, []);

  return (
    <InvoiceContext.Provider value={{
      invoices, loading, getByProject,
      addInvoice, updateInvoice, deleteInvoice,
      refreshInvoices: fetchInvoices,
    }}>
      {children}
    </InvoiceContext.Provider>
  );
}

export const useInvoices = () => useContext(InvoiceContext);
