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

    // Get all tables in public schema
    const { data: tables } = await admin.rpc('get_schema_sql') as any;
    
    // Fallback: query information_schema directly
    const { data: cols } = await admin
      .from('information_schema.columns' as any)
      .select('table_name, column_name, data_type, column_default, is_nullable, character_maximum_length, numeric_precision, numeric_scale, ordinal_position')
      .eq('table_schema', 'public')
      .order('table_name')
      .order('ordinal_position');

    const { data: tableList } = await admin
      .from('information_schema.tables' as any)
      .select('table_name, table_type')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE');

    const { data: constraints } = await admin
      .from('information_schema.table_constraints' as any)
      .select('table_name, constraint_name, constraint_type')
      .eq('table_schema', 'public');

    const { data: indexes } = await admin
      .from('pg_indexes' as any)
      .select('tablename, indexname, indexdef')
      .eq('schemaname', 'public');

    const { data: policies } = await admin
      .from('pg_policies' as any)
      .select('tablename, policyname, permissive, roles, cmd, qual, with_check')
      .eq('schemaname', 'public');

    // Generate SQL
    const lines: string[] = [
      `-- Venus Energy PMS Schema Export`,
      `-- Generated: ${new Date().toISOString()}`,
      `-- ============================================`,
      '',
    ];

    // Group columns by table
    const colsByTable: Record<string, any[]> = {};
    (cols || []).forEach((col: any) => {
      if (!colsByTable[col.table_name]) colsByTable[col.table_name] = [];
      colsByTable[col.table_name].push(col);
    });

    // Generate CREATE TABLE statements
    (tableList || []).forEach((t: any) => {
      const tableCols = colsByTable[t.table_name] || [];
      lines.push(`-- Table: ${t.table_name}`);
      lines.push(`CREATE TABLE IF NOT EXISTS public.${t.table_name} (`);
      tableCols.sort((a: any, b: any) => a.ordinal_position - b.ordinal_position).forEach((col: any, i: number) => {
        let type = col.data_type.toUpperCase();
        if (col.character_maximum_length) type += `(${col.character_maximum_length})`;
        else if (col.numeric_precision && col.data_type === 'numeric') type += `(${col.numeric_precision},${col.numeric_scale||0})`;
        let colDef = `  ${col.column_name} ${type}`;
        if (col.column_default) colDef += ` DEFAULT ${col.column_default}`;
        if (col.is_nullable === 'NO') colDef += ' NOT NULL';
        if (i < tableCols.length - 1) colDef += ',';
        lines.push(colDef);
      });
      lines.push(');');
      lines.push('');
    });

    // Add indexes
    lines.push('-- ============================================');
    lines.push('-- INDEXES');
    lines.push('-- ============================================');
    (indexes || []).forEach((idx: any) => {
      if (!idx.indexdef.includes('PRIMARY KEY')) {
        lines.push(`${idx.indexdef};`);
      }
    });
    lines.push('');

    // Add RLS policies
    lines.push('-- ============================================');
    lines.push('-- ROW LEVEL SECURITY POLICIES');
    lines.push('-- ============================================');
    (policies || []).forEach((p: any) => {
      lines.push(`-- Policy: ${p.policyname} on ${p.tablename}`);
      lines.push(`CREATE POLICY "${p.policyname}" ON public.${p.tablename}`);
      lines.push(`  AS ${p.permissive} FOR ${p.cmd}`);
      if (p.roles?.length) lines.push(`  TO ${p.roles.join(', ')}`);
      if (p.qual) lines.push(`  USING (${p.qual})`);
      if (p.with_check) lines.push(`  WITH CHECK (${p.with_check})`);
      lines.push(';');
      lines.push('');
    });

    const schemaSQL = lines.join('\n');
    const timestamp = new Date().toISOString().split('T')[0];

    // Upload to R2
    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });

    const key = `backups/venus-energy-schema-${timestamp}.sql`;
    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: schemaSQL,
      ContentType: 'text/plain',
    }));

    return res.status(200).json({
      success: true,
      key,
      tables: (tableList || []).length,
      indexes: (indexes || []).length,
      policies: (policies || []).length,
    });
  } catch (err: any) {
    console.error('Schema export error:', err);
    return res.status(500).json({ error: err.message });
  }
}
