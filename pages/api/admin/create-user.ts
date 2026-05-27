import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const admin = createAdminClient();

  // Accept Bearer token from Authorization header (frontend sends token in header)
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { data: callerProfile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (!callerProfile || callerProfile.role !== 'super_admin') return res.status(403).json({ error: 'Forbidden' });

  const { email, password, full_name, phone, designation, region, role } = req.body;
  if (!email || !password || !role) return res.status(400).json({ error: 'Email, password, and role are required' });


  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, full_name: full_name || '' },
  });

  if (error) return res.status(400).json({ error: error.message });

  if (data.user) {
    await admin.from('profiles').upsert({
      id: data.user.id,
      email,
      full_name: full_name || null,
      phone: phone || null,
      designation: designation || null,
      region: region || null,
      role,
      is_active: true,
    }, { onConflict: 'id' });
  }

  return res.status(200).json({ success: true });
}
