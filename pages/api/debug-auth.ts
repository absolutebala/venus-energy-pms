import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const results: any = {};

  // 1. Check env vars are loaded
  results.envCheck = {
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    urlPreview: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
  };

  // 2. Try listing users with admin client
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.listUsers();
    results.listUsers = error ? { error: error.message } : {
      count: data.users.length,
      users: data.users.map((u: any) => ({
        email: u.email,
        confirmed: u.email_confirmed_at ? true : false,
        created: u.created_at,
      }))
    };
  } catch (e: any) {
    results.listUsers = { error: e.message };
  }

  // 3. Try direct sign in with anon key
  try {
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error } = await client.auth.signInWithPassword({
      email: 'admin@venusenergy.com',
      password: 'Venus@2025',
    });
    results.signInTest = error ? { error: error.message, status: error.status } : { success: true, userId: data.user?.id };
  } catch (e: any) {
    results.signInTest = { error: e.message };
  }

  // 4. Check profiles table
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from('profiles').select('email, role, is_active');
    results.profiles = error ? { error: error.message } : data;
  } catch (e: any) {
    results.profiles = { error: e.message };
  }

  return res.status(200).json(results);
}
