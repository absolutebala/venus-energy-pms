import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface Project {
  id: string; po_no: string; indus_id: string; site: string;
  region: string; type: string; pm: string; rm: string;
  vendor: string; vendor_contact: string; vendor_phone: string; vendor_email: string;
  status: string; po_value: number; billed_amount: number; paid_amount: number;
  progress: number; start_date: string; end_date: string;
  ptw_ticket_id: string; ptw_supervisor: string; ptw_date_from: string; ptw_date_to: string;
  work_scope: string; remarks: string;
  created_at?: string; updated_at?: string; updated_by?: string;
}

interface ProjectContextType {
  projects: Project[];
  loading: boolean;
  error: string | null;
  getProject: (id: string) => Project | undefined;
  updateProject: (id: string, updates: Partial<Project>, updatedBy?: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType>({
  projects: [], loading: true, error: null,
  getProject: () => undefined,
  updateProject: async () => {},
  refreshProjects: async () => {},
});

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('projects')
      .select('*')
      .order('id');
    if (err) { setError(err.message); setLoading(false); return; }
    setProjects(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const getProject = useCallback((id: string) =>
    projects.find(p => p.id === id), [projects]);

  const updateProject = useCallback(async (
    id: string, updates: Partial<Project>, updatedBy?: string
  ) => {
    const payload = { ...updates, updated_at: new Date().toISOString(), updated_by: updatedBy || '' };
    const { error: err } = await supabase.from('projects').update(payload).eq('id', id);
    if (err) throw new Error(err.message);
    // Update local state immediately (optimistic)
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...payload } : p));
  }, []);

  return (
    <ProjectContext.Provider value={{ projects, loading, error, getProject, updateProject, refreshProjects: fetchProjects }}>
      {children}
    </ProjectContext.Provider>
  );
}

export const useProjects = () => useContext(ProjectContext);
