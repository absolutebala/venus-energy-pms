import type { NextApiRequest, NextApiResponse } from 'next';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createAdminClient } from '@/lib/supabaseAdmin';

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

  // Verify auth
  const token = req.headers.authorization?.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const admin = createAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' });

  // Check required env vars
  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME) {
    return res.status(500).json({ error: 'R2 environment variables not configured' });
  }

  const { fileName, contentType, folder = 'uploads' } = req.body;
  if (!fileName || !contentType) return res.status(400).json({ error: 'fileName and contentType required' });

  // Build a unique key
  const ext       = fileName.split('.').pop();
  const timestamp = Date.now();
  const key       = `${folder}/${timestamp}-${Math.random().toString(36).slice(2)}.${ext}`;

  const command = new PutObjectCommand({
    Bucket:      process.env.R2_BUCKET_NAME!,
    Key:         key,
    ContentType: contentType,
  });

  try {
    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
    const publicUrl    = `${process.env.R2_PUBLIC_URL}/${key}`;
    return res.status(200).json({ presignedUrl, publicUrl, key });
  } catch (err: any) {
    console.error('R2 presign error:', err);
    return res.status(500).json({ error: err.message || 'R2 presign failed' });
  }
}
