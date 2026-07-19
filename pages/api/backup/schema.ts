import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabaseAdmin';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const admin = createAdminClient();
    const { data: { user }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'super_admin') return res.status(403).json({ error: 'Forbidden' });

    const projectRef = process.env.SUPABASE_PROJECT_REF;
    const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
    if (!projectRef || !accessToken) {
      return res.status(500).json({ error: 'SUPABASE_PROJECT_REF or SUPABASE_ACCESS_TOKEN not configured' });
    }

    // Use Supabase Management API to run schema export SQL
    const schemaQuery = `
      SELECT 
        'CREATE TABLE IF NOT EXISTS public.' || table_name || ' (' ||
        string_agg(
          column_name || ' ' || 
          upper(data_type) || 
          CASE WHEN character_maximum_length IS NOT NULL THEN '(' || character_maximum_length || ')' ELSE '' END ||
          CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END ||
          CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END,
          ', ' ORDER BY ordinal_position
        ) || ');' AS create_stmt,
        table_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      GROUP BY table_name
      ORDER BY table_name;
    `;

    const indexQuery = `SELECT indexdef || ';' AS idx FROM pg_indexes WHERE schemaname = 'public' AND indexdef NOT LIKE '%_pkey%';`;

    const policyQuery = `
      SELECT 
        'CREATE POLICY "' || policyname || '" ON public.' || tablename || 
        ' AS ' || permissive || ' FOR ' || cmd ||
        CASE WHEN qual IS NOT NULL THEN ' USING (' || qual || ')' ELSE '' END ||
        CASE WHEN with_check IS NOT NULL THEN ' WITH CHECK (' || with_check || ')' ELSE '' END ||
        ';' AS policy_stmt
      FROM pg_policies WHERE schemaname = 'public';
    `;

    const runQuery = async (sql: string) => {
      const r = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sql }),
      });
      if (!r.ok) throw new Error(`Management API error: ${await r.text()}`);
      return r.json();
    };

    const [tables, indexes, policies] = await Promise.all([
      runQuery(schemaQuery),
      runQuery(indexQuery),
      runQuery(policyQuery),
    ]);

    const lines = [
      `-- Venus Energy PMS — Database Schema Export`,
      `-- Generated: ${new Date().toISOString()}`,
      `-- Tables: ${tables.length} | Indexes: ${indexes.length} | Policies: ${policies.length}`,
      `-- ============================================`,
      ``,
      `-- ENABLE RLS ON ALL TABLES`,
    ];

    tables.forEach((t: any) => lines.push(`ALTER TABLE public.${t.table_name} ENABLE ROW LEVEL SECURITY;`));
    lines.push('');
    lines.push('-- ============================================');
    lines.push('-- TABLE DEFINITIONS');
    lines.push('-- ============================================');
    tables.forEach((t: any) => { lines.push(''); lines.push(t.create_stmt); });

    lines.push('');
    lines.push('-- ============================================');
    lines.push('-- INDEXES');
    lines.push('-- ============================================');
    indexes.forEach((i: any) => lines.push(i.idx));

    lines.push('');
    lines.push('-- ============================================');
    lines.push('-- RLS POLICIES');
    lines.push('-- ============================================');
    policies.forEach((p: any) => lines.push(p.policy_stmt));

    const schemaSQL = lines.join('\n');
    const timestamp = new Date().toISOString().split('T')[0];

    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
    });

    const key = `backups/venus-energy-schema-${timestamp}.sql`;
    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: schemaSQL,
      ContentType: 'text/plain',
    }));

    return res.status(200).json({ success: true, key, tables: tables.length, indexes: indexes.length, policies: policies.length });
  } catch (err: any) {
    console.error('Schema export error:', err);
    return res.status(500).json({ error: err.message });
  }
}
