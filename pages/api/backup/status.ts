import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabaseAdmin';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const admin = createAdminClient();
    const { data: { user }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'super_admin') return res.status(200).json({ schemaAlert: false, codeAlert: false });

    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME) {
      return res.status(200).json({ schemaAlert: false, codeAlert: false });
    }

    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
    });

    const result = await s3.send(new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET_NAME!, Prefix: 'backups/', MaxKeys: 50 }));
    const files = result.Contents || [];

    // Latest schema backup
    const schemaFiles = files.filter(f => f.Key?.endsWith('.sql')).sort((a,b)=>(b.LastModified?.getTime()||0)-(a.LastModified?.getTime()||0));
    const lastSchema = schemaFiles[0]?.LastModified;
    const schemaAlert = !lastSchema || (Date.now() - new Date(lastSchema).getTime()) > 7 * 24 * 60 * 60 * 1000;

    // Latest code backup vs latest GitHub commit
    let codeAlert = false;
    const zipFiles = files.filter(f => f.Key?.endsWith('.zip')).sort((a,b)=>(b.LastModified?.getTime()||0)-(a.LastModified?.getTime()||0));
    const lastZip = zipFiles[0]?.LastModified;

    let githubDebug: any = {};
    if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPO) {
      try {
        const ghRes = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPO}/branches/main`, {
          headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' },
        });
        githubDebug.status = ghRes.status;
        if (ghRes.ok) {
          const ghData = await ghRes.json();
          const latestCommitDate = new Date(ghData.commit.commit.committer.date);
          githubDebug.latestCommit = latestCommitDate;
          githubDebug.lastZip = lastZip;
          codeAlert = !lastZip || latestCommitDate > new Date(lastZip);
        } else {
          githubDebug.error = await ghRes.text();
        }
      } catch(e: any) { githubDebug.exception = e.message; }
    } else {
      githubDebug.missing = { token: !process.env.GITHUB_TOKEN, repo: !process.env.GITHUB_REPO };
    }

    return res.status(200).json({
      schemaAlert,
      codeAlert,
      lastSchemaBackup: lastSchema || null,
      lastCodeBackup: lastZip || null,
      githubDebug,
    });
  } catch (err: any) {
    return res.status(200).json({ schemaAlert: false, codeAlert: false });
  }
}
