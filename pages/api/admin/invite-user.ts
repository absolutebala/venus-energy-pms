import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabaseAdmin';
import { createServerClient } from '@supabase/ssr';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Verify the caller is a super admin
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => req.cookies[n], set: () => {}, remove: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!callerProfile || callerProfile.role !== 'super_admin') return res.status(403).json({ error: 'Forbidden — Super Admin only' });

  const { email, role, full_name } = req.body;
  if (!email || !role) return res.status(400).json({ error: 'Email and role are required' });

  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    data: { role, full_name: full_name || '' },
  });

  if (error) return res.status(400).json({ error: error.message });

  // Create profile row immediately so admin can see the user
  if (data.user) {
    await admin.from('profiles').upsert({
      id: data.user.id,
      email,
      full_name: full_name || null,
      role,
      is_active: true,
    }, { onConflict: 'id' });
  }

  return res.status(200).json({ success: true });
}
