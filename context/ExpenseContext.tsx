import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';

const supabase = createClient();

export interface Expense {
  id: string; txnRef: string; expenseDate: string; site: string;
  expenseType: string; amount: number; paymentMode: string;
  projectId: string; poNo: string; remarks: string;
  createdBy: string; createdAt?: string; updatedAt?: string;
  status: string;
  paidTxnRef?: string; paidPaymentMode?: string; paidAt?: string; txnDate?: string;
  bankAccount?: string; bankAccountId?: string; upiId?: string; upiAccountId?: string; paidFromAccount?: string; paidToAccount?: string;
  investorType?: string; fundSource?: string; fundType?: string; regainCapital?: number;
}

function mapRow(row: any): Expense {
  return {
    id:              row.id                ?? '',
    txnRef:          row.txn_ref           ?? '',
    expenseDate:     row.expense_date      ?? '',
    site:            row.site              ?? '',
    expenseType:     row.expense_type      ?? 'Advance',
    amount:          Number(row.amount     ?? 0),
    paymentMode:     row.payment_mode      ?? '',
    projectId:       row.project_id        ?? '',
    poNo:            row.po_no             ?? '',
    remarks:         row.remarks           ?? '',
    createdBy:       row.created_by        ?? '',
    createdAt:       row.created_at        ?? '',
    updatedAt:       row.updated_at        ?? '',
    status:          row.status            ?? 'pending',
    paidTxnRef:      row.paid_txn_ref      ?? '',
    bankAccount:     row.bank_account      ?? '',
    bankAccountId:   row.bank_account_id   ?? '',
    upiAccountId:    row.upi_account_id    ?? '',
    upiId:           row.upi_id            ?? '',
    paidFromAccount: row.paid_from_account ?? '',
    paidToAccount:   row.paid_to_account   ?? '',
    paidPaymentMode: row.paid_payment_mode ?? '',
    paidAt:          row.paid_at           ?? '',
    txnDate:         row.txn_date          ?? '',
    investorType:    row.investor_type     ?? '',
    fundSource:      row.fund_source       ?? '',
    fundType:        row.fund_type         ?? '',
    regainCapital:   Number(row.regain_capital ?? 0),
  };
}

const VALID_DB_COLS = new Set([
  'txn_ref','expense_date','site','expense_type','amount',
  'payment_mode','project_id','po_no','remarks','created_by',
  'status','paid_txn_ref','paid_payment_mode','paid_at','txn_date',
  'bank_account','bank_account_id','upi_id','upi_account_id','paid_from_account','paid_to_account',
  'investor_type','fund_source','fund_type','regain_capital',
]);

const CAMEL_TO_SNAKE: Record<string,string> = {
  txnRef:'txn_ref', expenseDate:'expense_date', expenseType:'expense_type',
  paymentMode:'payment_mode', projectId:'project_id', poNo:'po_no',
  createdBy:'created_by', paidTxnRef:'paid_txn_ref',
  paidPaymentMode:'paid_payment_mode', paidAt:'paid_at', txnDate:'txn_date',
  bankAccount:'bank_account', bankAccountId:'bank_account_id', upiId:'upi_id', upiAccountId:'upi_account_id', paidFromAccount:'paid_from_account', paidToAccount:'paid_to_account',
  investorType:'investor_type', fundSource:'fund_source', fundType:'fund_type', regainCapital:'regain_capital',
};

const UUID_COLS = new Set(['bank_account_id', 'upi_account_id']);

function mapToDb(exp: Partial<Expense>): Record<string, any> {
  const db: Record<string, any> = {};
  for (const [key, val] of Object.entries(exp)) {
    const dbKey = CAMEL_TO_SNAKE[key] || key;
    if (!VALID_DB_COLS.has(dbKey)) continue;
    if (UUID_COLS.has(dbKey) && val === '') { db[dbKey] = null; continue; }
    db[dbKey] = (dbKey === 'expense_date' && val === '') ? null : val;
  }
  return db;
}

interface ExpenseContextType {
  expenses: Expense[];
  loading: boolean;
  getByProject: (projectId: string) => Expense[];
  addExpense: (exp: Omit<Expense, 'id'|'createdAt'|'updatedAt'>) => Promise<Expense>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  refreshExpenses: () => Promise<void>;
}

const ExpenseContext = createContext<ExpenseContextType>({
  expenses: [], loading: true,
  getByProject: () => [],
  addExpense: async () => ({} as Expense),
  updateExpense: async () => {},
  deleteExpense: async () => {},
  refreshExpenses: async () => {},
});

export function ExpenseProvider({ children }: { children: React.ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading,  setLoading]  = useState(true);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
    setExpenses((data || []).map(mapRow));
    setLoading(false);
  }, []);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const getByProject = useCallback((projectId: string) =>
    expenses.filter(e => e.projectId === projectId), [expenses]);

  const addExpense = useCallback(async (exp: Omit<Expense,'id'|'createdAt'|'updatedAt'>) => {
    const db = mapToDb({ ...exp, status: exp.status || 'pending' });
    const { data, error } = await supabase.from('expenses').insert(db).select().single();
    if (error) throw new Error(error.message);
    const newExp = mapRow(data);
    setExpenses(prev => [newExp, ...prev]);
    return newExp;
  }, []);

  const updateExpense = useCallback(async (id: string, updates: Partial<Expense>) => {
    const db = mapToDb(updates);
    const { error } = await supabase.from('expenses').update(db).eq('id', id);
    if (error) throw new Error(error.message);
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, []);

  const deleteExpense = useCallback(async (id: string) => {
    await supabase.from('expenses').delete().eq('id', id);
    setExpenses(prev => prev.filter(e => e.id !== id));
  }, []);

  const refreshExpenses = useCallback(fetchExpenses, [fetchExpenses]);

  return (
    <ExpenseContext.Provider value={{ expenses, loading, getByProject, addExpense, updateExpense, deleteExpense, refreshExpenses }}>
      {children}
    </ExpenseContext.Provider>
  );
}

export function useExpenses() { return useContext(ExpenseContext); }
