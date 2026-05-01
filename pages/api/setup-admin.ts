import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = createAdminClient();

  const email = 'admin@venusenergy.com';
  const password = 'Venus@2025';

  // Delete existing if any
  const { data: existing } = await admin.auth.admin.listUsers();
  const found = existing?.users?.find((u: any) => u.email === email);
  if (found) await admin.auth.admin.deleteUser(found.id);

  // Create fresh
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'super_admin', full_name: 'Super Admin' },
  });

  if (error) return res.status(400).json({ error: error.message });

  await admin.from('profiles').upsert({
    id: data.user.id,
    email,
    full_name: 'Super Admin',
    role: 'super_admin',
    is_active: true,
  }, { onConflict: 'id' });

  return res.status(200).json({
    success: true,
    message: 'Admin created!',
    credentials: { email, password }
  });
}
