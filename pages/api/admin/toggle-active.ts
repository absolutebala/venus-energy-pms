import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const admin = createAdminClient();
    const { data: { user }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { data: caller } = await admin.from('profiles').select('role').eq('id', user.id).single();
    if (caller?.role !== 'super_admin') return res.status(403).json({ error: 'Forbidden' });

    const { userId, is_active } = req.body as { userId: string; is_active: boolean };
    if (!userId) return res.status(400).json({ error: 'userId required' });

    // 1. Update profiles table
    await admin.from('profiles').update({ is_active }).eq('id', userId);

    // 2. Ban or unban in Supabase Auth
    if (!is_active) {
      // Ban for 100 years — effectively permanent
      await admin.auth.admin.updateUserById(userId, { ban_duration: '876600h' });
    } else {
      // Remove ban
      await admin.auth.admin.updateUserById(userId, { ban_duration: 'none' });
    }

    return res.status(200).json({ success: true, is_active });
  } catch (err: any) {
    console.error('toggleActive error:', err);
    return res.status(500).json({ error: err.message });
  }
}
