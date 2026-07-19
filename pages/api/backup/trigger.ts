import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabaseAdmin';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export const config = { api: { bodyParser: false, responseLimit: false } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const admin = createAdminClient();
    const { data: { user }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'super_admin') return res.status(403).json({ error: 'Forbidden' });

    const timestamp = new Date().toISOString().split('T')[0];
    const backup: Record<string, any[]> = {};

    const tables = [
      'projects','invoices','expenses','po_items','srn',
      'activity_log','ptw_items','profiles','role_permissions',
    ];

    for (const table of tables) {
      const BATCH = 1000;
      let allRows: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await admin.from(table).select('*').range(from, from + BATCH - 1);
        if (error) break;
        const rows = data || [];
        allRows = allRows.concat(rows);
        if (rows.length < BATCH) break;
        from += BATCH;
      }
      backup[table] = allRows;
    }

    const totalRecords = Object.values(backup).reduce((a, v) => a + v.length, 0);
    const summary = {
      exported_at: new Date().toISOString(),
      tables: Object.keys(backup).length,
      total_records: totalRecords,
      counts: Object.fromEntries(Object.entries(backup).map(([k, v]) => [k, v.length])),
      triggered_by: user.email,
    };

    const backupPayload = JSON.stringify({ summary, data: backup }, null, 2);

    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });

    const key = `backups/venus-energy-backup-${timestamp}-manual.json`;
    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: backupPayload,
      ContentType: 'application/json',
    }));

    return res.status(200).json({ success: true, summary, key });
  } catch (err: any) {
    console.error('Manual backup error:', err);
    return res.status(500).json({ error: err.message });
  }
}
