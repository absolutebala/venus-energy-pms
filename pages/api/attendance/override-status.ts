import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const admin = createAdminClient();
  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { targetUserId, requestDate, newStatus } = req.body;
  if (!targetUserId || !requestDate || !['present', 'absent'].includes(newStatus)) {
    return res.status(400).json({ error: 'targetUserId, requestDate, and a valid newStatus (present/absent) are required' });
  }

  const { data: callerProfile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  const isSuperAdmin = callerProfile?.role === 'super_admin';

  if (!isSuperAdmin) {
    const { data: targetProfile } = await admin.from('profiles').select('manager_id').eq('id', targetUserId).single();
    if (!targetProfile || targetProfile.manager_id !== user.id) {
      return res.status(403).json({ error: 'You are not the manager of this user' });
    }
  }

  const { data, error } = await admin.from('attendance_requests').insert({
    user_id: targetUserId,
    request_date: requestDate,
    requested_status: newStatus,
    reason: null,
    status: 'approved',
    source: 'admin',
    requested_by: user.id,
    approved_by: user.id,
    approved_at: new Date().toISOString(),
  }).select().single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ success: true, request: data });
}
