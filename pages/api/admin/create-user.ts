import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabaseAdmin';
import { randomUUID } from 'crypto';

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

  const { email, password, full_name, phone, region, role, vendor_id } = req.body;
  if (!email || !password || !role) return res.status(400).json({ error: 'Email, password, and role are required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const newUserId = randomUUID();

  // Use SQL RPC to bypass broken Supabase auth API (unexpected_failure on this project)
  const { error: rpcError } = await admin.rpc('create_auth_user', {
    p_id:        newUserId,
    p_email:     email,
    p_password:  password,
    p_full_name: full_name || '',
    p_role:      role,
  });

  if (rpcError) {
    console.error('create_auth_user RPC error:', JSON.stringify(rpcError, null, 2));
    // Check for duplicate email
    if (rpcError.message?.includes('duplicate') || rpcError.code === '23505') {
      return res.status(400).json({ error: 'A user with this email already exists.' });
    }
    return res.status(500).json({ error: 'Failed to create user: ' + rpcError.message });
  }

  // Save profile
  const { error: profileError } = await admin.from('profiles').upsert({
    id:          newUserId,
    email,
    full_name:   full_name   || null,
    phone:       phone       || null,
    vendor_id: vendor_id || null,
    region:      region      || null,
    role,
    is_active:   true,
  }, { onConflict: 'id' });

  if (profileError) {
    console.error('profile upsert error:', JSON.stringify(profileError, null, 2));
    return res.status(500).json({ error: 'User created but profile save failed: ' + profileError.message });
  }

  return res.status(200).json({ success: true });
}
