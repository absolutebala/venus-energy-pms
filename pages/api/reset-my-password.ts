import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = createAdminClient();

  const { data: { users } } = await admin.auth.admin.listUsers();
  const user = users.find((u: any) => u.email === 'bala@digitalradium.com');

  if (!user) return res.status(404).json({ error: 'User not found' });

  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password: 'Venus@2025',
    email_confirm: true,
  });

  if (error) return res.status(400).json({ error: error.message });

  return res.status(200).json({
    success: true,
    email: 'bala@digitalradium.com',
    password: 'Venus@2025',
  });
}
