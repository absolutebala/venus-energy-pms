import { useAuth } from '@/context/AuthContext';

export interface UploadResult {
  publicUrl: string;
  key: string;
  fileName: string;
  fileSize: string;
}

export function useUpload() {
  const { getAccessToken } = useAuth();

  const upload = async (file: File, folder = 'uploads'): Promise<UploadResult> => {
    const token = await getAccessToken();
    if (!token) throw new Error('Not authenticated');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const res = await fetch('/api/upload/presign', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Upload failed');
    }

    const data = await res.json();
    return {
      publicUrl: data.publicUrl,
      key:       data.key,
      fileName:  data.fileName || file.name,
      fileSize:  data.fileSize || `${Math.round(file.size/1024)} KB`,
    };
  };

  return { upload };
}
