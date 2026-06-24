import React, { createContext, useContext, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';

const supabase = createClient();

export interface ActivityEntry {
  id: string; projectId: string; action: string;
  byName: string; byRole: string; createdAt: string;
  previousStatus?: string | null; currentStatus?: string | null;
}

function mapRow(row: any): ActivityEntry {
  return {
    id:             row.id              ?? '',
    projectId:      row.project_id      ?? '',
    action:         row.action          ?? '',
    byName:         row.by_name         ?? '',
    byRole:         row.by_role         ?? '',
    createdAt:      row.created_at      ?? '',
    previousStatus: row.previous_status ?? null,
    currentStatus:  row.current_status  ?? null,
  };
}

interface ActivityContextType {
  getByProject: (projectId: string) => Promise<ActivityEntry[]>;
  logActivity: (
    projectId: string, action: string, byName: string, byRole: string,
    previousStatus?: string, currentStatus?: string
  ) => Promise<void>;
}

const ActivityContext = createContext<ActivityContextType>({
  getByProject: async () => [],
  logActivity:  async () => {},
});

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const getByProject = useCallback(async (projectId: string): Promise<ActivityEntry[]> => {
    const { data, error } = await supabase
      .from('activity_log').select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return [];
    return (data || []).map(mapRow);
  }, []);

  const logActivity = useCallback(async (
    projectId: string, action: string, byName: string, byRole: string,
    previousStatus?: string, currentStatus?: string
  ) => {
    await supabase.from('activity_log').insert({
      project_id: projectId, action, by_name: byName, by_role: byRole,
      previous_status: previousStatus ?? null,
      current_status: currentStatus ?? null,
    });
  }, []);

  return (
    <ActivityContext.Provider value={{ getByProject, logActivity }}>
      {children}
    </ActivityContext.Provider>
  );
}

export const useActivity = () => useContext(ActivityContext);
