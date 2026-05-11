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

    // 1. Get presigned URL
    const res = await fetch('/api/upload/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ fileName: file.name, contentType: file.type, folder }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to get upload URL');
    }

    const { presignedUrl, publicUrl, key } = await res.json();

    // 2. Upload directly to R2
    const uploadRes = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    });

    if (!uploadRes.ok) throw new Error('Upload to storage failed');

    const kb = file.size / 1024;
    const fileSize = kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;

    return { publicUrl, key, fileName: file.name, fileSize };
  };

  return { upload };
}
