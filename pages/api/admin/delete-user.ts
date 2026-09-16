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

  // Soft delete — keep the profile row and all attendance/activity history intact (a real hard
  // delete would violate foreign keys from attendance_logs, attendance_requests, etc., and even
  // where it could be forced through, it would permanently destroy that person's history). Instead:
  // mark is_deleted so they're excluded from the Users list, and is_active=false so they can't log in.
  const { error: updateErr, data: updatedRows } = await admin.from('profiles')
    .update({ is_deleted: true, is_active: false })
    .eq('id', userId)
    .select();
  if (updateErr) {
    console.error('Soft-delete error:', updateErr);
    return res.status(500).json({ error: 'Failed to delete user: ' + updateErr.message });
  }
  if (!updatedRows || updatedRows.length === 0) {
    return res.status(500).json({ error: 'Delete affected 0 rows — the user may not exist, or a Row Level Security policy is silently blocking the update.' });
  }

  return res.status(200).json({ success: true });
}
