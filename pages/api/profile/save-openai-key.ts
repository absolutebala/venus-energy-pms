import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const admin = createAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' });

  // Only super admin can save API key
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'super_admin') return res.status(403).json({ error: 'Forbidden' });

  const { openai_api_key } = req.body;

  const { error: updateErr } = await admin
    .from('profiles')
    .update({ openai_api_key, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (updateErr) return res.status(400).json({ error: updateErr.message });
  return res.status(200).json({ success: true });
}
