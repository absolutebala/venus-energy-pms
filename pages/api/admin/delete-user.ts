import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const admin = createAdminClient();
  const token = req.headers.authorization?.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { data: callerProfile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (callerProfile?.role !== 'super_admin') return res.status(403).json({ error: 'Forbidden' });

  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  // Prevent deleting yourself
  if (userId === user.id) return res.status(400).json({ error: 'You cannot delete your own account.' });

  // Delete from profiles first
  const { error: profileErr, data: deletedRows } = await admin.from('profiles').delete().eq('id', userId).select();
  if (profileErr) {
    console.error('Profile delete error:', profileErr);
    return res.status(500).json({ error: 'Failed to delete profile: ' + profileErr.message });
  }
  if (!deletedRows || deletedRows.length === 0) {
    // No error was thrown, but nothing was actually deleted — almost certainly an RLS policy
    // silently blocking the delete rather than raising an error.
    return res.status(500).json({ error: 'Delete affected 0 rows — likely blocked by a Row Level Security policy on the profiles table, even though the admin client should bypass RLS. Check that SUPABASE_SERVICE_ROLE_KEY is set correctly.' });
  }

  // Delete from auth.users via SQL (bypass broken admin API)
  const { error: authDelErr } = await admin.rpc('delete_auth_user', { p_id: userId });
  if (authDelErr) {
    console.error('Auth delete error:', authDelErr);
    // Profile already deleted — log but don't fail
  }

  return res.status(200).json({ success: true });
}
