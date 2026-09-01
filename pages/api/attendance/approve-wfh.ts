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

  const { logId, action } = req.body;
  if (!logId || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'logId and a valid action (approve/reject) are required' });
  }

  const { data: callerProfile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  const isSuperAdmin = callerProfile?.role === 'super_admin';

  const { data: log } = await admin.from('attendance_logs').select('id,user_id,work_mode').eq('id', logId).single();
  if (!log) return res.status(404).json({ error: 'Attendance log not found' });
  if (log.work_mode !== 'home') return res.status(400).json({ error: 'Only Work From Home entries require approval' });

  if (!isSuperAdmin) {
    const { data: targetProfile } = await admin.from('profiles').select('manager_id').eq('id', log.user_id).single();
    if (!targetProfile || targetProfile.manager_id !== user.id) {
      return res.status(403).json({ error: 'You are not the manager of this user' });
    }
  }

  const { data, error } = await admin.from('attendance_logs').update({
    wfh_status: action === 'approve' ? 'approved' : 'rejected',
    approved_by: user.id,
    approved_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', logId).select().single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ success: true, log: data });
}
