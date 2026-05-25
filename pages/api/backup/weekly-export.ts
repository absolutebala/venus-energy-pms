import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabaseAdmin';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Weekly backup — runs every Monday at 2AM UTC via Vercel cron
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify Vercel cron secret
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const admin = createAdminClient();
  const timestamp = new Date().toISOString().split('T')[0];
  const backup: Record<string, any[]> = {};

  try {
    // ── 1. Export all key tables ──────────────────────────────
    const tables = [
      'projects','invoices','expenses','work_documents','po_items',
      'material_items','activity_log','safety_checks','ptw_items',
      'profiles','role_permissions','notifications','report_configs',
      'project_drafts',
    ];

    for (const table of tables) {
      const { data, error } = await admin.from(table).select('*');
      if (!error && data) backup[table] = data;
      else console.warn(`Backup: could not export ${table}:`, error?.message);
    }

    const totalRecords = Object.values(backup).reduce((a,v)=>a+v.length, 0);
    const summary = {
      exported_at:  new Date().toISOString(),
      tables:       Object.keys(backup).length,
      total_records: totalRecords,
      counts:       Object.fromEntries(Object.entries(backup).map(([k,v])=>[k,v.length])),
    };

    const backupPayload = JSON.stringify({ summary, data: backup }, null, 2);

    // ── 2. Upload to Cloudflare R2 ────────────────────────────
    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: {
        accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });

    const key = `backups/venus-energy-backup-${timestamp}.json`;

    await s3.send(new PutObjectCommand({
      Bucket:      process.env.R2_BUCKET_NAME!,
      Key:         key,
      Body:        backupPayload,
      ContentType: 'application/json',
      Metadata: {
        'backup-date':    timestamp,
        'total-records':  String(totalRecords),
        'tables-count':   String(Object.keys(backup).length),
      },
    }));

    const backupUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

    // ── 3. Log to activity_log ────────────────────────────────
    await admin.from('activity_log').insert({
      project_id:   'SYSTEM',
      action:       `Weekly backup saved to R2 — ${Object.keys(backup).length} tables, ${totalRecords} records — ${key}`,
      performed_by: 'System Cron',
      role:         'system',
    }).catch(console.error);

    console.log('✅ Backup complete:', summary);

    return res.status(200).json({
      success:  true,
      summary,
      storage:  { bucket: process.env.R2_BUCKET_NAME, key, url: backupUrl },
      message:  `Backup saved to R2: ${key}`,
    });

  } catch (err: any) {
    console.error('❌ Backup failed:', err);

    // Log failure
    await admin.from('activity_log').insert({
      project_id:   'SYSTEM',
      action:       `Weekly backup FAILED: ${err.message}`,
      performed_by: 'System Cron',
      role:         'system',
    }).catch(console.error);

    return res.status(500).json({ error: err.message });
  }
}
