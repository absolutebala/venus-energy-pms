import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

const supabase = createClient();

export interface MaterialItem {
  id: string; projectId: string; code: string; description: string; uom: string;
  issuedQty: number; utilisedQty: number | null; utilisedStatus: string;
  pmApprovedQty: number; returnQty: number; srnQty: number;
  pmRemarks: string; utilisedRemarks: string; sortOrder: number;
}

function mapRow(row: any): MaterialItem {
  return {
    id:               row.id                ?? '',
    projectId:        row.project_id        ?? '',
    code:             row.code              ?? '',
    description:      row.description       ?? '',
    uom:              row.uom               ?? '',
    issuedQty:        Number(row.issued_qty    ?? 0),
    utilisedQty:      row.utilised_qty !== null ? Number(row.utilised_qty) : null,
    utilisedStatus:   row.utilised_status   ?? 'pending',
    pmApprovedQty:    Number(row.pm_approved_qty ?? 0),
    returnQty:        Number(row.return_qty  ?? 0),
    srnQty:           Number(row.srn_qty     ?? 0),
    pmRemarks:        row.pm_remarks         ?? '',
    utilisedRemarks:  row.utilised_remarks   ?? '',
    sortOrder:        Number(row.sort_order  ?? 0),
  };
}

interface MaterialContextType {
  allItems: MaterialItem[];
  loading: boolean;
  getByProject: (projectId: string) => Promise<MaterialItem[]>;
  updateItem: (id: string, updates: Partial<MaterialItem>) => Promise<void>;
  addItem: (item: Omit<MaterialItem, 'id'>) => Promise<MaterialItem>;
  refreshItems: () => Promise<void>;
}

const MaterialContext = createContext<MaterialContextType>({
  allItems: [], loading: true,
  getByProject: async () => [],
  updateItem:   async () => {},
  addItem:      async () => ({} as MaterialItem),
  refreshItems: async () => {},
});

export function MaterialProvider({ children }: { children: React.ReactNode }) {
  const [allItems, setAllItems] = useState<MaterialItem[]>([]);
  const [loading,  setLoading]  = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('material_items').select('*').order('project_id').order('sort_order');
    if (!error) setAllItems((data || []).map(mapRow));
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Re-fetch on window focus
  useEffect(() => {
    const onFocus = () => fetchAll();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchAll]);

  const getByProject = useCallback(async (projectId: string) => {
    const { data, error } = await supabase
      .from('material_items').select('*')
      .eq('project_id', projectId)
      .order('sort_order');
    if (error) return [];
    return (data || []).map(mapRow);
  }, []);

  const updateItem = useCallback(async (id: string, updates: Partial<MaterialItem>) => {
    const map: Record<string,string> = {
      utilisedQty:'utilised_qty', utilisedStatus:'utilised_status',
      pmApprovedQty:'pm_approved_qty', returnQty:'return_qty',
      srnQty:'srn_qty', pmRemarks:'pm_remarks', utilisedRemarks:'utilised_remarks',
    };
    const payload: Record<string,any> = { updated_at: new Date().toISOString() };
    for (const [key, val] of Object.entries(updates)) {
      const dbKey = map[key] || key;
      payload[dbKey] = val;
    }
    const { error } = await supabase.from('material_items').update(payload).eq('id', id);
    if (error) throw new Error(error.message);
  }, []);

  const addItem = useCallback(async (item: Omit<MaterialItem, 'id'>) => {
    const payload = {
      project_id: item.projectId, code: item.code, description: item.description,
      uom: item.uom, issued_qty: item.issuedQty, utilised_qty: item.utilisedQty,
      utilised_status: item.utilisedStatus, pm_approved_qty: item.pmApprovedQty,
      return_qty: item.returnQty, srn_qty: item.srnQty, sort_order: item.sortOrder,
    };
    const { data, error } = await supabase.from('material_items').insert(payload).select().single();
    if (error) throw new Error(error.message);
    return mapRow(data);
  }, []);

  return (
    <MaterialContext.Provider value={{ allItems, loading, getByProject, updateItem, addItem, refreshItems: fetchAll }}>
      {children}
    </MaterialContext.Provider>
  );
}

export const useMaterial = () => useContext(MaterialContext);
