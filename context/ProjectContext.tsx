import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';

const supabase = createClient();

export interface Project {
  id: string; poNo: string; indusId: string; site: string;
  region: string; type: string; pm: string; rm: string;
  vendor: string; vendorContact: string; vendorPhone: string; vendorEmail: string;
  status: string; poValue: number; billedAmount: number; paidAmount: number;
  progress: number; startDate: string; endDate: string;
  ptwTicketId: string; ptwSupervisor: string; ptwDateFrom: string; ptwDateTo: string;
  workScope: string; remarks: string;
  createdAt?: string; updatedAt?: string; updatedBy?: string;
}

// Map Supabase snake_case → camelCase used throughout the portal
function mapRow(row: any): Project {
  return {
    id:            row.id            ?? '',
    poNo:          row.po_no         ?? row.poNo         ?? '',
    indusId:       row.indus_id      ?? row.indusId      ?? '',
    site:          row.site          ?? '',
    region:        row.region        ?? '',
    type:          row.type          ?? '',
    pm:            row.pm            ?? '',
    rm:            row.rm            ?? '',
    vendor:        row.vendor        ?? '',
    vendorContact: row.vendor_contact ?? row.vendorContact ?? '',
    vendorPhone:   row.vendor_phone   ?? row.vendorPhone   ?? '',
    vendorEmail:   row.vendor_email   ?? row.vendorEmail   ?? '',
    status:        row.status        ?? 'not_started',
    poValue:       Number(row.po_value       ?? row.poValue       ?? 0),
    billedAmount:  Number(row.billed_amount  ?? row.billedAmount  ?? 0),
    paidAmount:    Number(row.paid_amount    ?? row.paidAmount    ?? 0),
    progress:      Number(row.progress ?? 0),
    startDate:     row.start_date    ?? row.startDate    ?? '',
    endDate:       row.end_date      ?? row.endDate      ?? '',
    ptwTicketId:   row.ptw_ticket_id  ?? row.ptwTicketId  ?? '',
    ptwSupervisor: row.ptw_supervisor ?? row.ptwSupervisor ?? '',
    ptwDateFrom:   row.ptw_date_from  ?? row.ptwDateFrom  ?? '',
    ptwDateTo:     row.ptw_date_to    ?? row.ptwDateTo    ?? '',
    workScope:     row.work_scope    ?? row.workScope    ?? '',
    remarks:       row.remarks       ?? '',
    createdAt:     row.created_at    ?? '',
    updatedAt:     row.updated_at    ?? '',
    updatedBy:     row.updated_by    ?? '',
  };
}

// Map camelCase form updates → Supabase snake_case column names
function mapToDb(updates: Partial<Project>): Record<string, any> {
  const db: Record<string, any> = {};
  const map: Record<string, string> = {
    poNo:'po_no', indusId:'indus_id', vendorContact:'vendor_contact',
    vendorPhone:'vendor_phone', vendorEmail:'vendor_email',
    poValue:'po_value', billedAmount:'billed_amount', paidAmount:'paid_amount',
    startDate:'start_date', endDate:'end_date',
    ptwTicketId:'ptw_ticket_id', ptwSupervisor:'ptw_supervisor',
    ptwDateFrom:'ptw_date_from', ptwDateTo:'ptw_date_to',
    workScope:'work_scope', updatedBy:'updated_by',
  };
  for (const [key, val] of Object.entries(updates)) {
    const dbKey = map[key] || key;
    db[dbKey] = val;
  }
  return db;
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
    try {
      const { data, error: err } = await supabase
        .from('projects')
        .select('*')
        .order('id');
      if (err) { setError(err.message); return; }
      setProjects((data || []).map(mapRow));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const getProject = useCallback(
    (id: string) => projects.find(p => p.id === id),
    [projects]
  );

  const updateProject = useCallback(async (
    id: string, updates: Partial<Project>, updatedBy?: string
  ) => {
    const dbPayload = mapToDb({ ...updates, updatedBy: updatedBy || '' });
    dbPayload.updated_at = new Date().toISOString();
    const { error: err } = await supabase
      .from('projects')
      .update(dbPayload)
      .eq('id', id);
    if (err) throw new Error(err.message);
    // Optimistic update with mapped camelCase
    const mapped = mapRow({ ...updates, id, updated_by: updatedBy || '' });
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...mapped } : p));
  }, []);

  return (
    <ProjectContext.Provider value={{
      projects, loading, error,
      getProject, updateProject,
      refreshProjects: fetchProjects,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export const useProjects = () => useContext(ProjectContext);
