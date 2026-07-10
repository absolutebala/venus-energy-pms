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
  returnReceived?: boolean;
  liftedDate?: string; gateEntryNo?: string; vehicleNo?: string;
  pmComment?: string | null;
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
    returnReceived: row.return_received ?? false,
    liftedDate:    row.lifted_date    ?? '',
    gateEntryNo:   row.gate_entry_no  ?? '',
    vehicleNo:     row.vehicle_no     ?? '',
    pmComment:     row.pm_comment     ?? null,
  };
}

function mapToDb(item: Partial<POItem>): Record<string, any> {
  const db: Record<string, any> = {};
  const map: Record<string, string> = {
    projectId:'project_id', hsnCode:'hsn_code', gstRate:'gst_rate', sortOrder:'sort_order', serialNo:'serial_no', documentNo:'document_no', boqReqNo:'boq_req_no', utilisedQty:'utilised_qty', utilisedStatus:'utilised_status', pmApprovedQty:'pm_approved_qty', returnQty:'return_qty', srnStatus:'srn_status', srnDate:'srn_date', returnReceived:'return_received', liftedDate:'lifted_date', gateEntryNo:'gate_entry_no', vehicleNo:'vehicle_no', pmComment:'pm_comment',
  };
  const VALID = new Set(['project_id','description','hsn_code','uom','quantity','rate','gst_rate','amount','sort_order','serial_no','document_no','boq_req_no','utilised_qty','utilised_status','pm_approved_qty','return_qty','srn_status','srn_date','return_received','lifted_date','gate_entry_no','vehicle_no','pm_comment']);
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

  // fetchId prevents race conditions: if a new fetch starts while one is in progress,
  // the older fetch is abandoned so stale/partial data never overwrites fresh data.
  const fetchIdRef = React.useRef(0);

  const fetchItems = useCallback(async () => {
    const myId = ++fetchIdRef.current;
    setLoading(true);
    const BATCH = 1000;
    let allRows: any[] = [];
    let from = 0;
    while (true) {
      // Abort if a newer fetch has started
      if (fetchIdRef.current !== myId) return;
      const { data, error } = await supabase
        .from('po_items').select('*').order('project_id').order('sort_order')
        .range(from, from + BATCH - 1);
      if (error) break;
      const rows = data || [];
      allRows = allRows.concat(rows);
      if (rows.length < BATCH) break;
      from += BATCH;
    }
    // Only commit results if this is still the latest fetch
    if (fetchIdRef.current !== myId) return;
    setItems(allRows.map(mapRow));
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  // Re-fetch when auth session is established (fixes empty data after login)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchItems();
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchItems]);
  // Re-fetch when browser tab regains focus (avoids stale data after navigation)
  useEffect(() => {
    let focusTimer: ReturnType<typeof setTimeout>;
    const onFocus = () => { clearTimeout(focusTimer); focusTimer = setTimeout(() => fetchItems(), 500); };
    window.addEventListener('focus', onFocus);
    return () => { window.removeEventListener('focus', onFocus); clearTimeout(focusTimer); };
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
    const { data, error } = await supabase.from('po_items').update(payload).eq('id', id).select();
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      throw new Error('Update was not saved — you may not have permission to edit this item.');
    }
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
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
