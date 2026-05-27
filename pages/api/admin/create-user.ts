import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Verify caller is super_admin via Bearer token
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const admin = createAdminClient();
  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { data: callerProfile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (!callerProfile || callerProfile.role !== 'super_admin') return res.status(403).json({ error: 'Forbidden' });

  const { email, password, full_name, phone, designation, region, role } = req.body;
  if (!email || !password || !role) return res.status(400).json({ error: 'Email, password, and role are required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // Call Supabase auth admin REST API directly (bypasses JS client version issues)
  const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { role, full_name: full_name || '' },
    }),
  });

  const createData = await createRes.json();

  if (!createRes.ok) {
    console.error('REST createUser error:', JSON.stringify(createData, null, 2));
    return res.status(400).json({ error: createData.msg || createData.message || 'Failed to create user' });
  }

  const newUserId = createData.id;
  if (!newUserId) return res.status(500).json({ error: 'User created but no ID returned' });

  // Save profile
  const { error: profileError } = await admin.from('profiles').upsert({
    id: newUserId,
    email,
    full_name: full_name || null,
    phone: phone || null,
    designation: designation || null,
    region: region || null,
    role,
    is_active: true,
  }, { onConflict: 'id' });

  if (profileError) {
    console.error('profile upsert error:', JSON.stringify(profileError, null, 2));
    return res.status(500).json({ error: 'User created but profile save failed: ' + profileError.message });
  }

  return res.status(200).json({ success: true });
}
