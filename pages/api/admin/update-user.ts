import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabaseAdmin';
import { createServerClient } from '@supabase/ssr';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => req.cookies[n], set: () => {}, remove: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!callerProfile || callerProfile.role !== 'super_admin') return res.status(403).json({ error: 'Forbidden' });

  const { userId, full_name, phone, designation, region, role, is_active } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  const admin = createAdminClient();

  const { error } = await admin.from('profiles').update({
    full_name: full_name || null,
    phone: phone || null,
    designation: designation || null,
    region: region || null,
    role,
    is_active: is_active ?? true,
    updated_at: new Date().toISOString(),
  }).eq('id', userId);

  if (error) return res.status(400).json({ error: error.message });

  return res.status(200).json({ success: true });
}
