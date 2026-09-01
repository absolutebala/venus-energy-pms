import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // VERCEL_GIT_COMMIT_SHA is automatically set by Vercel on every deployment — a reliable,
  // zero-config fingerprint that changes every time new code goes live. Falls back to
  // VERCEL_DEPLOYMENT_ID or 'dev' for local/non-Vercel environments.
  const buildId = process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || 'dev';
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ buildId });
}
