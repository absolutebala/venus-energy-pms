import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';

const supabase = createClient();

export interface WorkDoc {
  id: string; projectId: string; docType: string;
  fileName: string; fileUrl: string; fileSize: string;
  uploadedByName: string; uploadedAt: string;
}

function mapRow(row: any): WorkDoc {
  return {
    id:             row.id              ?? '',
    projectId:      row.project_id      ?? '',
    docType:        row.doc_type        ?? '',
    fileName:       row.file_name       ?? '',
    fileUrl:        row.file_url        ?? '',
    fileSize:       row.file_size       ?? '',
    uploadedByName: row.uploaded_by_name ?? '',
    uploadedAt:     row.uploaded_at     ?? '',
  };
}

interface WorkDocContextType {
  docs: WorkDoc[];
  loading: boolean;
  getByProject: (projectId: string) => WorkDoc[];
  getDocStatus: (projectId: string) => Record<string, boolean>;
  addDoc: (doc: Omit<WorkDoc, 'id'|'uploadedAt'>) => Promise<WorkDoc>;
  deleteDoc: (id: string) => Promise<void>;
  refreshDocs: () => Promise<void>;
}

const WorkDocContext = createContext<WorkDocContextType>({
  docs: [], loading: true,
  getByProject: () => [],
  getDocStatus: () => ({}),
  addDoc: async () => ({} as WorkDoc),
  deleteDoc: async () => {},
  refreshDocs: async () => {},
});

export function WorkDocProvider({ children }: { children: React.ReactNode }) {
  const [docs,    setDocs]    = useState<WorkDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('work_documents').select('*').order('uploaded_at', { ascending: false });
    if (!error) setDocs((data || []).map(mapRow));
    setLoading(false);
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);
  // Re-fetch when browser tab regains focus (avoids stale data after navigation)
  useEffect(() => {
    const onFocus = () => fetchDocs();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchDocs]);


  const getByProject = useCallback(
    (projectId: string) => docs.filter(d => d.projectId === projectId),
    [docs]
  );

  // Returns { safety_photos: true/false, site_photos: true/false, ... }
  const getDocStatus = useCallback((projectId: string) => {
    const projectDocs = docs.filter(d => d.projectId === projectId);
    const DOC_KEYS = ['safety_photos','site_photos','jmr_document','ac_certificate','noc_document','drawing_document','ptw_document'];
    return Object.fromEntries(
      DOC_KEYS.map(key => [key, projectDocs.some(d => d.docType === key)])
    );
  }, [docs]);

  const addDoc = useCallback(async (doc: Omit<WorkDoc, 'id'|'uploadedAt'>) => {
    const payload = {
      project_id: doc.projectId, doc_type: doc.docType,
      file_name: doc.fileName, file_url: doc.fileUrl,
      file_size: doc.fileSize, uploaded_by_name: doc.uploadedByName,
    };
    const { data, error } = await supabase.from('work_documents').insert(payload).select().single();
    if (error) throw new Error(error.message);
    const newDoc = mapRow(data);
    setDocs(prev => [newDoc, ...prev]);
    return newDoc;
  }, []);

  const deleteDoc = useCallback(async (id: string) => {
    const { error } = await supabase.from('work_documents').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setDocs(prev => prev.filter(d => d.id !== id));
  }, []);

  return (
    <WorkDocContext.Provider value={{
      docs, loading, getByProject, getDocStatus,
      addDoc, deleteDoc, refreshDocs: fetchDocs,
    }}>
      {children}
    </WorkDocContext.Provider>
  );
}

export const useWorkDocs = () => useContext(WorkDocContext);
