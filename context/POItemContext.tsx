import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';

const supabase = createClient();

export interface POItem {
  id: string; projectId: string; description: string; hsnCode: string;
  uom: string; quantity: number; rate: number; gstRate: number;
  amount: number; sortOrder: number;
  serialNo?: string; documentNo?: string; boqReqNo?: string;
  utilisedQty?: number | null; utilisedStatus?: string;
  pmApprovedQty?: number | null; returnQty?: number | null;
  srnStatus?: string; srnDate?: string | null;
}

function mapRow(row: any): POItem {
  return {
    id:          row.id          ?? '',
    projectId:   row.project_id  ?? '',
    description: row.description ?? '',
    hsnCode:     row.hsn_code    ?? '',
    uom:         row.uom         ?? '',
    quantity:    Number(row.quantity ?? 0),
    rate:        Number(row.rate     ?? 0),
    gstRate:     Number(row.gst_rate ?? 18),
    amount:      Number(row.amount   ?? 0),
    sortOrder:   Number(row.sort_order ?? 0),
    serialNo:    row.serial_no    ?? '',
    documentNo:  row.document_no  ?? '',
    boqReqNo:      row.boq_req_no    ?? '',
    utilisedQty:   row.utilised_qty  ?? null,
    utilisedStatus:row.utilised_status ?? 'pending',
    pmApprovedQty: row.pm_approved_qty ?? null,
    returnQty:     row.return_qty     ?? null,
    srnStatus:     row.srn_status     ?? 'pending',
    srnDate:       row.srn_date       ?? null,
  };
}

function mapToDb(item: Partial<POItem>): Record<string, any> {
  const db: Record<string, any> = {};
  const map: Record<string, string> = {
    projectId:'project_id', hsnCode:'hsn_code', gstRate:'gst_rate', sortOrder:'sort_order', serialNo:'serial_no', documentNo:'document_no', boqReqNo:'boq_req_no', utilisedQty:'utilised_qty', utilisedStatus:'utilised_status', pmApprovedQty:'pm_approved_qty', returnQty:'return_qty', srnStatus:'srn_status', srnDate:'srn_date',
  };
  const VALID = new Set(['project_id','description','hsn_code','uom','quantity','rate','gst_rate','amount','sort_order','serial_no','document_no','boq_req_no','utilised_qty','utilised_status','pm_approved_qty','return_qty','srn_status','srn_date']);
  for (const [key, val] of Object.entries(item)) {
    const dbKey = map[key] || key;
    if (VALID.has(dbKey)) db[dbKey] = val;
  }
  return db;
}

interface POItemContextType {
  items: POItem[];
  loading: boolean;
  getByProject: (projectId: string) => POItem[];
  addItem: (item: Omit<POItem, 'id'>) => Promise<POItem>;
  updateItem: (id: string, updates: Partial<POItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  refreshItems: () => Promise<void>;
}

const POItemContext = createContext<POItemContextType>({
  items: [], loading: true,
  getByProject: () => [],
  addItem: async () => ({} as POItem),
  updateItem: async () => {},
  deleteItem: async () => {},
  refreshItems: async () => {},
});

export function POItemProvider({ children }: { children: React.ReactNode }) {
  const [items,   setItems]   = useState<POItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('po_items').select('*').order('project_id').order('sort_order');
    if (!error) setItems((data || []).map(mapRow));
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  // Re-fetch when browser tab regains focus (avoids stale data after navigation)
  useEffect(() => {
    const onFocus = () => fetchItems();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchItems]);


  const getByProject = useCallback(
    (projectId: string) => items.filter(i => i.projectId === projectId),
    [items]
  );

  const addItem = useCallback(async (item: Omit<POItem, 'id'>) => {
    const payload = mapToDb(item);
    const { data, error } = await supabase.from('po_items').insert(payload).select().single();
    if (error) throw new Error(error.message);
    const newItem = mapRow(data);
    setItems(prev => [...prev, newItem]);
    return newItem;
  }, []);

  const updateItem = useCallback(async (id: string, updates: Partial<POItem>) => {
    const payload = mapToDb(updates);
    const { error } = await supabase.from('po_items').update(payload).eq('id', id);
    if (error) throw new Error(error.message);
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates, amount: (updates.quantity??i.quantity) * (updates.rate??i.rate) } : i));
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    const { error } = await supabase.from('po_items').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  return (
    <POItemContext.Provider value={{
      items, loading, getByProject,
      addItem, updateItem, deleteItem,
      refreshItems: fetchItems,
    }}>
      {children}
    </POItemContext.Provider>
  );
}

export const usePOItems = () => useContext(POItemContext);
