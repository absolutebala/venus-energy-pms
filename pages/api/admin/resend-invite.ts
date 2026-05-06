import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const admin = createAdminClient();
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { data: callerProfile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (!callerProfile || callerProfile.role !== 'super_admin') return res.status(403).json({ error: 'Forbidden' });

  const { email, role, full_name } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    data: { role: role || 'vendor', full_name: full_name || '' },
  });

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ success: true });
}
