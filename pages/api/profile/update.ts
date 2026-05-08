import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabaseAdmin';
import { createServerClient } from '@supabase/ssr';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const admin = createAdminClient();
  let userId: string | null = null;

  // Strategy 1: Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '').trim();

  if (token) {
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (!error && user) userId = user.id;
  }

  // Strategy 2: Cookie-based session (fallback for SSR)
  if (!userId) {
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (n: string) => req.cookies[n], set: () => {}, remove: () => {} } }
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (user) userId = user.id;
    } catch (_) {}
  }

  if (!userId) {
    return res.status(401).json({ error: 'Session expired. Please log out and log in again.' });
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
    .eq('id', userId);

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ success: true });
}
