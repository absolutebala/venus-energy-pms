import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabaseAdmin';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const token = req.headers.authorization?.replace('Bearer ', '').trim();
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const admin = createAdminClient();
    const { data: { user }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'super_admin') return res.status(403).json({ error: 'Forbidden' });

    // Check R2 env vars
    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME) {
      return res.status(500).json({ error: 'R2 environment variables not configured on this deployment' });
    }

    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: {
        accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });

    const result = await s3.send(new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME!,
      Prefix: 'backups/',
      MaxKeys: 50,
    }));

    const backups = (result.Contents || [])
      .filter(obj => obj.Key?.endsWith('.json') || obj.Key?.endsWith('.sql') || obj.Key?.endsWith('.zip'))
      .sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0))
      .map(obj => ({
        key:          obj.Key,
        size:         obj.Size,
        lastModified: obj.LastModified,
        name:         obj.Key?.split('/').pop() || obj.Key,
      }));

    return res.status(200).json({ success: true, backups });
  } catch (err: any) {
    console.error('Backup list error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
