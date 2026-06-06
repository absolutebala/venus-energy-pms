import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';

const supabase = createClient();

export interface Project {
  id: string; projectId: string; poNo: string; projectStatus: string; poStatus: string; indusId: string; site: string;
  region: string; type: string; pm: string; rm: string;
  vendor: string; vendorContact: string; vendorPhone: string; vendorEmail: string;
  status: string; poValue: number; billedAmount: number; paidAmount: number;
  progress: number; poDate: string; startDate: string; endDate: string;
  ptwTicketId: string; ptwSupervisor: string; ptwDateFrom: string; ptwDateTo: string;
  workScope: string; remarks: string;
  safetyPhotos: boolean; sitePhotos: boolean; jmrDocument: boolean;
  atCertificate: boolean; nocDocument: boolean; drawingDocument: boolean; ptwDocument: boolean;
  createdAt?: string; updatedAt?: string; updatedBy?: string;
  liftedDate?: string; gateEntryNo?: string; vehicleNo?: string;
}

// Map Supabase snake_case → camelCase used throughout the portal
function mapRow(row: any): Project {
  return {
    id:            row.id            ?? '',
    projectId:     row.project_id     ?? row.projectId     ?? '',
    projectStatus: row.project_status  ?? row.projectStatus ?? '',
    poStatus:      row.po_status       ?? row.poStatus       ?? '',
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
    poDate:        row.po_date        ?? row.poDate        ?? '',
    startDate:     row.start_date    ?? row.startDate    ?? '',
    endDate:       row.end_date      ?? row.endDate      ?? '',
    ptwTicketId:   row.ptw_ticket_id  ?? row.ptwTicketId  ?? '',
    ptwSupervisor: row.ptw_supervisor ?? row.ptwSupervisor ?? '',
    ptwDateFrom:   row.ptw_date_from  ?? row.ptwDateFrom  ?? '',
    ptwDateTo:     row.ptw_date_to    ?? row.ptwDateTo    ?? '',
    workScope:     row.work_scope    ?? row.workScope    ?? '',
    remarks:       row.remarks       ?? '',
    safetyPhotos:    Boolean(row.safety_photos),
    sitePhotos:      Boolean(row.site_photos),
    jmrDocument:     Boolean(row.jmr_document),
    atCertificate:   Boolean(row.at_certificate),
    nocDocument:     Boolean(row.noc_document),
    drawingDocument: Boolean(row.drawing_document),
    ptwDocument:     Boolean(row.ptw_document),
    createdAt:     row.created_at    ?? '',
    updatedAt:     row.updated_at    ?? '',
    updatedBy:     row.updated_by    ?? '',
    liftedDate:    row.lifted_date   ?? '',
    gateEntryNo:   row.gate_entry_no ?? '',
    vehicleNo:     row.vehicle_no    ?? '',
  };
}

// Valid Supabase column names for the projects table
const DB_COLUMNS = new Set([
  'id','project_id','project_status','po_status','po_no','indus_id','site','region','type','pm','rm',
  'vendor','vendor_contact','vendor_phone','vendor_email',
  'status','po_value','billed_amount','paid_amount','progress',
  'po_date','start_date','end_date','ptw_ticket_id','ptw_supervisor',
  'ptw_date_from','ptw_date_to','work_scope','remarks','safety_photos','site_photos','jmr_document','at_certificate','noc_document','drawing_document','ptw_document',
  'updated_at','updated_by','lifted_date','gate_entry_no','vehicle_no',
]);

// Map camelCase form updates → Supabase snake_case, filtering unknown columns
function mapToDb(updates: Partial<Project>): Record<string, any> {
  const camelToSnake: Record<string, string> = {
    projectId:'project_id', projectStatus:'project_status', poStatus:'po_status', poNo:'po_no', indusId:'indus_id', vendorContact:'vendor_contact',
    vendorPhone:'vendor_phone', vendorEmail:'vendor_email',
    poValue:'po_value', billedAmount:'billed_amount', paidAmount:'paid_amount',
    poDate:'po_date', startDate:'start_date', endDate:'end_date',
    ptwTicketId:'ptw_ticket_id', ptwSupervisor:'ptw_supervisor',
    ptwDateFrom:'ptw_date_from', ptwDateTo:'ptw_date_to',
    workScope:'work_scope', updatedBy:'updated_by',
    liftedDate:'lifted_date', gateEntryNo:'gate_entry_no', vehicleNo:'vehicle_no',
    safetyPhotos:'safety_photos', sitePhotos:'site_photos',
    jmrDocument:'jmr_document', atCertificate:'at_certificate',
    nocDocument:'noc_document', drawingDocument:'drawing_document', ptwDocument:'ptw_document',
  };
  const DATE_COLS = new Set(['po_date','start_date','end_date','ptw_date_from','ptw_date_to']);
  const db: Record<string, any> = {};
  for (const [key, val] of Object.entries(updates)) {
    const dbKey = camelToSnake[key] || key;
    if (DB_COLUMNS.has(dbKey)) {
      // Convert empty strings to null for date columns
      db[dbKey] = DATE_COLS.has(dbKey) && val === '' ? null : val;
    }
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
  // Re-fetch when browser tab regains focus (avoids stale data after navigation)
  useEffect(() => {
    const onFocus = () => fetchProjects();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchProjects]);


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
