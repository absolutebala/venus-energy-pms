import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';

const supabase = createClient();

export interface WorkProgress {
  id: string; projectId: string; workDate: string;
  workDescription: string; workStatus: string;
  totalWorkStatus: string; remarks: string;
  createdBy: string; createdAt: string;
}

function mapRow(row: any): WorkProgress {
  return {
    id:               row.id              ?? '',
    projectId:        row.project_id      ?? '',
    workDate:         row.work_date       ?? '',
    workDescription:  row.work_description?? '',
    workStatus:       row.work_status     ?? '',
    totalWorkStatus:  row.total_work_status ?? '',
    remarks:          row.remarks         ?? '',
    createdBy:        row.created_by      ?? '',
    createdAt:        row.created_at      ?? '',
  };
}

interface WorkProgressContextType {
  items: WorkProgress[];
  loading: boolean;
  getByProject: (projectId: string) => WorkProgress[];
  addItem: (item: Omit<WorkProgress, 'id'|'createdAt'>) => Promise<WorkProgress>;
  updateItem: (id: string, updates: Partial<WorkProgress>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  refreshItems: () => Promise<void>;
}

const WorkProgressContext = createContext<WorkProgressContextType>({
  items: [], loading: true,
  getByProject: () => [],
  addItem: async () => ({} as WorkProgress),
  updateItem: async () => {},
  deleteItem: async () => {},
  refreshItems: async () => {},
});

export function WorkProgressProvider({ children }: { children: React.ReactNode }) {
  const [items,   setItems]   = useState<WorkProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('work_progress').select('*').order('work_date', { ascending: false });
    if (data) setItems(data.map(mapRow));
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const getByProject = useCallback((projectId: string) =>
    items.filter(i => i.projectId === projectId).sort((a,b) => b.workDate.localeCompare(a.workDate)),
  [items]);

  const addItem = useCallback(async (item: Omit<WorkProgress, 'id'|'createdAt'>) => {
    const payload = {
      project_id: item.projectId, work_date: item.workDate,
      work_description: item.workDescription, work_status: item.workStatus,
      total_work_status: item.totalWorkStatus, remarks: item.remarks,
      created_by: item.createdBy,
    };
    const { data, error } = await supabase.from('work_progress').insert(payload).select().single();
    if (error) throw error;
    const newItem = mapRow(data);
    setItems(prev => [newItem, ...prev]);
    return newItem;
  }, []);

  const updateItem = useCallback(async (id: string, updates: Partial<WorkProgress>) => {
    const payload: any = {};
    if (updates.workDate       !== undefined) payload.work_date         = updates.workDate;
    if (updates.workDescription!== undefined) payload.work_description  = updates.workDescription;
    if (updates.workStatus     !== undefined) payload.work_status        = updates.workStatus;
    if (updates.totalWorkStatus!== undefined) payload.total_work_status  = updates.totalWorkStatus;
    if (updates.remarks        !== undefined) payload.remarks             = updates.remarks;
    const { error } = await supabase.from('work_progress').update(payload).eq('id', id);
    if (error) throw error;
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    const { error } = await supabase.from('work_progress').delete().eq('id', id);
    if (error) throw error;
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  return (
    <WorkProgressContext.Provider value={{ items, loading, getByProject, addItem, updateItem, deleteItem, refreshItems: fetchItems }}>
      {children}
    </WorkProgressContext.Provider>
  );
}

export const useWorkProgress = () => useContext(WorkProgressContext);
