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

  const { dates, reason } = req.body as { dates: string[]; reason: string };
  if (!Array.isArray(dates) || dates.length === 0) {
    return res.status(400).json({ error: 'At least one date is required' });
  }
  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'Reason is required' });
  }

  const rows = dates.map((d) => ({
    user_id: user.id,
    request_date: d,
    requested_status: 'leave',
    reason: reason.trim(),
    status: 'pending',
    source: 'user',
    requested_by: user.id,
  }));

  const { data, error } = await admin.from('attendance_requests').insert(rows).select();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ success: true, requests: data });
}
