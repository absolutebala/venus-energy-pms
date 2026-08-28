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

  const { requestId, action } = req.body;
  if (!requestId || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'requestId and a valid action (approve/reject) are required' });
  }

  const { data: request } = await admin.from('attendance_requests').select('id,user_id').eq('id', requestId).single();
  if (!request) return res.status(404).json({ error: 'Request not found' });

  const { data: callerProfile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  const isSuperAdmin = callerProfile?.role === 'super_admin';

  if (!isSuperAdmin) {
    const { data: targetProfile } = await admin.from('profiles').select('manager_id').eq('id', request.user_id).single();
    if (!targetProfile || targetProfile.manager_id !== user.id) {
      return res.status(403).json({ error: 'You are not the manager of this user' });
    }
  }

  const { error } = await admin.from('attendance_requests').update({
    status: action === 'approve' ? 'approved' : 'rejected',
    approved_by: user.id,
    approved_at: new Date().toISOString(),
  }).eq('id', requestId);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ success: true });
}
