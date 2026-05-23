import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';

const supabase = createClient();

export interface Expense {
  id: string; txnRef: string; expenseDate: string; site: string;
  expenseType: string; amount: number; paymentMode: string;
  projectId: string; poNo: string; remarks: string;
  createdBy: string; createdAt?: string; updatedAt?: string;
}

function mapRow(row: any): Expense {
  return {
    id:          row.id            ?? '',
    txnRef:      row.txn_ref       ?? '',
    expenseDate: row.expense_date  ?? '',
    site:        row.site          ?? '',
    expenseType: row.expense_type  ?? 'Advance',
    amount:      Number(row.amount ?? 0),
    paymentMode: row.payment_mode  ?? 'Bank Transfer',
    projectId:   row.project_id    ?? '',
    poNo:        row.po_no         ?? '',
    remarks:     row.remarks       ?? '',
    createdBy:   row.created_by    ?? '',
    createdAt:   row.created_at    ?? '',
    updatedAt:   row.updated_at    ?? '',
  };
}

function mapToDb(exp: Partial<Expense>): Record<string, any> {
  const db: Record<string, any> = {};
  const map: Record<string, string> = {
    txnRef:'txn_ref', expenseDate:'expense_date', expenseType:'expense_type',
    paymentMode:'payment_mode', projectId:'project_id', poNo:'po_no',
    createdBy:'created_by',
  };
  const VALID = new Set(['txn_ref','expense_date','site','expense_type','amount',
    'payment_mode','project_id','po_no','remarks','created_by']);
  for (const [key, val] of Object.entries(exp)) {
    const dbKey = map[key] || key;
    if (!VALID.has(dbKey)) continue;
    db[dbKey] = dbKey === 'expense_date' && val === '' ? null : val;
  }
  return db;
}

interface ExpenseContextType {
  expenses: Expense[];
  loading: boolean;
  getByProject: (projectId: string) => Expense[];
  addExpense: (exp: Omit<Expense, 'id'|'createdAt'|'updatedAt'>) => Promise<Expense>;
  deleteExpense: (id: string) => Promise<void>;
  refreshExpenses: () => Promise<void>;
}

const ExpenseContext = createContext<ExpenseContextType>({
  expenses: [], loading: true,
  getByProject: () => [],
  addExpense: async () => ({} as Expense),
  deleteExpense: async () => {},
  refreshExpenses: async () => {},
});

export function ExpenseProvider({ children }: { children: React.ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading,  setLoading]  = useState(true);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('expenses').select('*').order('expense_date', { ascending: false });
    if (!error) setExpenses((data || []).map(mapRow));
    setLoading(false);
  }, []);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);
  // Re-fetch when browser tab regains focus (avoids stale data after navigation)
  useEffect(() => {
    const onFocus = () => fetchExpenses();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchExpenses]);


  const getByProject = useCallback(
    (projectId: string) => expenses.filter(e => e.projectId === projectId),
    [expenses]
  );

  const addExpense = useCallback(async (exp: Omit<Expense, 'id'|'createdAt'|'updatedAt'>) => {
    // Duplicate txnRef check
    const dup = expenses.find(e => e.txnRef.trim().toLowerCase() === exp.txnRef.trim().toLowerCase());
    if (dup) throw new Error(`Transaction ref "${exp.txnRef}" already exists`);
    const payload = mapToDb(exp);
    const { data, error } = await supabase.from('expenses').insert(payload).select().single();
    if (error) throw new Error(error.message);
    const newExp = mapRow(data);
    setExpenses(prev => [newExp, ...prev]);
    return newExp;
  }, [expenses]);

  const deleteExpense = useCallback(async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setExpenses(prev => prev.filter(e => e.id !== id));
  }, []);

  return (
    <ExpenseContext.Provider value={{
      expenses, loading, getByProject,
      addExpense, deleteExpense,
      refreshExpenses: fetchExpenses,
    }}>
      {children}
    </ExpenseContext.Provider>
  );
}

export const useExpenses = () => useContext(ExpenseContext);
