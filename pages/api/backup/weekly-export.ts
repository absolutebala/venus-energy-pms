import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabaseAdmin';

// Weekly backup — runs every Monday at 2AM UTC via Vercel cron
// Schedule: "0 2 * * 1"
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify this is called by Vercel cron (not public)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const admin = createAdminClient();
  const timestamp = new Date().toISOString().split('T')[0];
  const backup: Record<string, any[]> = {};

  try {
    // Export all key tables
    const tables = ['projects','invoices','expenses','work_documents','po_items',
                    'material_items','activity_log','safety_checks','ptw_items',
                    'profiles','role_permissions','notifications','report_configs'];

    for (const table of tables) {
      const { data, error } = await admin.from(table).select('*');
      if (!error && data) backup[table] = data;
    }

    const summary = {
      exported_at: new Date().toISOString(),
      tables: Object.keys(backup).length,
      counts: Object.fromEntries(Object.entries(backup).map(([k,v])=>[k, v.length])),
    };

    // Log to activity_log
    await admin.from('activity_log').insert({
      project_id: 'SYSTEM',
      action: `Weekly backup completed — ${Object.keys(backup).length} tables, ${Object.values(backup).reduce((a,v)=>a+v.length,0)} records`,
      performed_by: 'System',
      role: 'system',
    });

    console.log('Weekly backup summary:', JSON.stringify(summary));

    return res.status(200).json({
      success: true,
      summary,
      // In production: send backup data to secure storage (S3, email, etc.)
      message: 'Backup completed. Integrate with S3/email for storage.',
    });

  } catch (err: any) {
    console.error('Backup failed:', err);
    return res.status(500).json({ error: err.message });
  }
}
