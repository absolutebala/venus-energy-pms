import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';

const supabase = createClient();

export interface Invoice {
  id: string; invoiceNo: string; invoiceDate: string; workBoqRef: string;
  invoiceAmount: number; gst: number; totalAmount: number;
  invoiceStatus: string; paymentStatus: string; dueDate: string;
  projectId: string; poNo: string; createdBy: string;
  createdAt?: string; updatedAt?: string;
}

function mapRow(row: any): Invoice {
  return {
    id:            row.id            ?? '',
    invoiceNo:     row.invoice_no    ?? '',
    invoiceDate:   row.invoice_date  ?? '',
    workBoqRef:    row.work_boq_ref  ?? '',
    invoiceAmount: Number(row.invoice_amount ?? 0),
    gst:           Number(row.gst           ?? 0),
    totalAmount:   Number(row.total_amount  ?? 0),
    invoiceStatus: row.invoice_status ?? 'Draft',
    paymentStatus: row.payment_status ?? 'Pending',
    dueDate:       row.due_date       ?? '',
    projectId:     row.project_id     ?? '',
    poNo:          row.po_no          ?? '',
    createdBy:     row.created_by     ?? '',
    createdAt:     row.created_at     ?? '',
    updatedAt:     row.updated_at     ?? '',
  };
}

function mapToDb(inv: Partial<Invoice>): Record<string, any> {
  const db: Record<string, any> = {};
  const map: Record<string, string> = {
    invoiceNo:'invoice_no', invoiceDate:'invoice_date', workBoqRef:'work_boq_ref',
    invoiceAmount:'invoice_amount', totalAmount:'total_amount', invoiceStatus:'invoice_status',
    paymentStatus:'payment_status', dueDate:'due_date',
    projectId:'project_id', poNo:'po_no', createdBy:'created_by',
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
