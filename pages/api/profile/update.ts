import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Get token from Authorization header (sent by client)
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '').trim();

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated. Please log in again.' });
  }

  // Verify token with admin client
  const admin = createAdminClient();
  const { data: { user }, error: authError } = await admin.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }

  const { full_name, phone, designation, department, region } = req.body;

  const { error } = await admin
    .from('profiles')
    .update({
      full_name:   full_name   ?? null,
      phone:       phone       ?? null,
      designation: designation ?? null,
      department:  department  ?? null,
      region:      region      ?? null,
      updated_at:  new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    console.error('Profile update error:', error);
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ success: true });
}
