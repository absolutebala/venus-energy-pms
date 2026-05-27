import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const admin = createAdminClient();

  // Accept Bearer token from Authorization header (frontend sends token in header)
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { data: callerProfile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (!callerProfile || callerProfile.role !== 'super_admin') return res.status(403).json({ error: 'Forbidden' });

  const { email, password, full_name, phone, designation, region, role } = req.body;
  if (!email || !password || !role) return res.status(400).json({ error: 'Email, password, and role are required' });


  // Try admin.createUser first; fall back to signUp if admin API fails
  let userId: string | null = null;

  const { data: adminData, error: adminError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, full_name: full_name || '' },
  });

  if (adminError) {
    console.error('admin.createUser error:', JSON.stringify(adminError, null, 2));

    // Fallback: use signUp with service role (skips email confirmation on some configs)
    const anonAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: signUpData, error: signUpError } = await anonAdmin.auth.signUp({
      email,
      password,
      options: { data: { role, full_name: full_name || '' } },
    });

    if (signUpError) {
      console.error('signUp fallback error:', JSON.stringify(signUpError, null, 2));
      return res.status(400).json({ error: signUpError.message, code: (signUpError as any).code });
    }

    userId = signUpData.user?.id ?? null;
  } else {
    userId = adminData.user?.id ?? null;
  }

  if (!userId) return res.status(500).json({ error: 'User created but no ID returned' });

  const { error: profileError } = await admin.from('profiles').upsert({
    id: userId,
    email,
    full_name: full_name || null,
    phone: phone || null,
    designation: designation || null,
    region: region || null,
    role,
    is_active: true,
  }, { onConflict: 'id' });

  if (profileError) {
    console.error('profile upsert error:', JSON.stringify(profileError, null, 2));
    return res.status(500).json({ error: 'User auth created but profile save failed: ' + profileError.message });
  }

  return res.status(200).json({ success: true });
}
