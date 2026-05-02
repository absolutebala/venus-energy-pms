import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Get the current user from the session cookie
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => req.cookies[n], set: () => {}, remove: () => {} } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: 'Not authenticated. Please log in again.' });
  }

  const { full_name, phone, designation, department, region } = req.body;

  // Use admin client to bypass RLS for the update
  const admin = createAdminClient();

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
