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

    const githubToken = process.env.GITHUB_TOKEN;
    const githubRepo  = process.env.GITHUB_REPO || 'absolutebala/venus-energy-pms';
    if (!githubToken) return res.status(500).json({ error: 'GITHUB_TOKEN not configured' });

    // Get latest commit SHA on main branch
    const branchRes = await fetch(`https://api.github.com/repos/${githubRepo}/branches/main`, {
      headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github+json' },
    });
    if (!branchRes.ok) throw new Error('Failed to fetch branch info: ' + await branchRes.text());
    const branchData = await branchRes.json();
    const sha     = branchData.commit.sha as string;
    const shortSha = sha.slice(0, 7);
    const commitMsg = branchData.commit.commit.message as string;
    const commitDate = branchData.commit.commit.committer.date as string;

    // Download repo ZIP at this commit
    const zipRes = await fetch(`https://api.github.com/repos/${githubRepo}/zipball/main`, {
      headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github+json' },
    });
    if (!zipRes.ok) throw new Error('Failed to download repo ZIP: ' + await zipRes.text());
    const zipBuffer = Buffer.from(await zipRes.arrayBuffer());

    // Upload to R2
    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
    });

    const timestamp = new Date().toISOString().split('T')[0];
    const key = `backups/venus-energy-code-${timestamp}-${shortSha}.zip`;
    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: zipBuffer,
      ContentType: 'application/zip',
      Metadata: {
        'commit-sha': sha,
        'commit-message': commitMsg.slice(0, 200),
        'commit-date': commitDate,
      },
    }));

    return res.status(200).json({
      success: true, key,
      commit: { sha: shortSha, message: commitMsg, date: commitDate },
      size: zipBuffer.length,
    });
  } catch (err: any) {
    console.error('GitHub backup error:', err);
    return res.status(500).json({ error: err.message });
  }
}
