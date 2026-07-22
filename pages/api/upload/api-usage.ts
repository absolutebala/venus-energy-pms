import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabaseAdmin';

const BUDGET_USD = 10.00;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const admin = createAdminClient();
    const { data: { user }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'super_admin') return res.status(403).json({ error: 'Forbidden' });

    const { data, error } = await admin
      .from('api_usage')
      .select('source, input_tokens, output_tokens, cost_usd');

    if (error) throw error;

    const totalCost        = (data||[]).reduce((a, r) => a + Number(r.cost_usd||0), 0);
    const totalInputTokens = (data||[]).reduce((a, r) => a + Number(r.input_tokens||0), 0);
    const totalOutputTokens= (data||[]).reduce((a, r) => a + Number(r.output_tokens||0), 0);
    const stnCost          = (data||[]).filter(r=>r.source==='stn').reduce((a,r)=>a+Number(r.cost_usd||0),0);
    const srnCost          = (data||[]).filter(r=>r.source==='srn').reduce((a,r)=>a+Number(r.cost_usd||0),0);
    const callCount        = (data||[]).length;

    return res.status(200).json({
      success: true,
      totalCost,
      budgetUsd: BUDGET_USD,
      remainingUsd: Math.max(0, BUDGET_USD - totalCost),
      percentUsed: Math.min(100, (totalCost / BUDGET_USD) * 100),
      totalInputTokens,
      totalOutputTokens,
      stnCost,
      srnCost,
      callCount,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
