import type { NextApiRequest, NextApiResponse } from 'next';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createAdminClient } from '@/lib/supabaseAdmin';
import formidable from 'formidable';
import fs from 'fs';

export const config = { api: { bodyParser: false } };

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const admin = createAdminClient();
  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID ||
      !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME) {
    return res.status(500).json({ error: 'R2 environment variables not configured' });
  }

  try {
    const form = formidable({ maxFileSize: 10 * 1024 * 1024 });
    const [fields, files] = await form.parse(req);

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const folder = Array.isArray(fields.folder) ? fields.folder[0] : (fields.folder || 'uploads');

    if (!file) return res.status(400).json({ error: 'No file provided' });

    const ext       = file.originalFilename?.split('.').pop() || 'bin';
    const timestamp = Date.now();
    const key       = `${folder}/${timestamp}-${Math.random().toString(36).slice(2)}.${ext}`;
    const fileBuffer = fs.readFileSync(file.filepath);
    const kb = file.size / 1024;
    const fileSize = kb > 1024 ? `${(kb/1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;

    await s3.send(new PutObjectCommand({
      Bucket:      process.env.R2_BUCKET_NAME!,
      Key:         key,
      Body:        fileBuffer,
      ContentType: file.mimetype || 'application/octet-stream',
    }));

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
    return res.status(200).json({ publicUrl, key, fileName: file.originalFilename, fileSize });
  } catch (err: any) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: err.message || 'Upload failed' });
  }
}
