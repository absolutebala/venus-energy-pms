import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabaseAdmin';

async function getSettings(admin: any): Promise<Record<string, string>> {
  const { data } = await admin.from('system_settings').select('key,value');
  const map: Record<string, string> = {};
  (data || []).forEach((r: any) => { map[r.key] = r.value || ''; });
  return map;
}

async function getOracleToken(settings: Record<string, string>): Promise<string> {
  const tokenUrl     = settings['oracle_token_url'];
  const clientId     = settings['oracle_client_id'];
  const clientSecret = settings['oracle_client_secret'];

  if (!tokenUrl || !clientId || !clientSecret) {
    throw new Error('Oracle credentials not configured. Please set them in Admin → Settings.');
  }

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     clientId,
      client_secret: clientSecret,
      scope:         'openid',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Oracle token error (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}

async function fetchOraclePOs(token: string, baseUrl: string): Promise<any[]> {
  const url = `${baseUrl}/fscmRestApi/resources/11.13.18.05/purchaseOrders?limit=500&fields=OrderNumber,OrderDate,Amount,Supplier,Description,BuyerName,Status`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Oracle PO fetch error (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.items || [];
}

function mapOraclePOToProject(po: any): Record<string, any> {
  const poDate = po.OrderDate ? new Date(po.OrderDate).toISOString().split('T')[0] : null;
  return {
    po_no:          po.OrderNumber   || '',
    po_date:        poDate,
    po_value:       Number(po.Amount) || 0,
    vendor:         po.Supplier      || '',
    site:           po.Description   || '',
    pm:             po.BuyerName     || '',
    po_status:      po.Status === 'OPEN' ? 'Open' : po.Status === 'CLOSED' ? 'Closed' : 'Open',
    project_status: 'Yet to Start',
    status:         'not_started',
    source:         'oracle_erp',
    created_at:     new Date().toISOString(),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const isCron   = req.method === 'GET';
  const isManual = req.method === 'POST';
  if (!isCron && !isManual) return res.status(405).json({ error: 'Method not allowed' });

  const admin = createAdminClient();

  // Cron auth
  if (isCron) {
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  // Manual auth — super_admin only
  if (isManual) {
    const token = req.headers.authorization?.replace('Bearer ', '').trim();
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const { data: { user }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });
    const { data: callerProfile } = await admin.from('profiles').select('role').eq('id', user.id).single();
    if (callerProfile?.role !== 'super_admin') return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    // 1. Load Oracle credentials from system_settings
    const settings = await getSettings(admin);

    // 2. Get Oracle OAuth token
    const oracleToken = await getOracleToken(settings);

    // 3. Fetch POs from Oracle
    const oraclePOs = await fetchOraclePOs(oracleToken, settings['oracle_base_url']);
    if (!oraclePOs.length) {
      return res.status(200).json({ success: true, created: 0, skipped: 0, message: 'No POs returned from Oracle' });
    }

    // 4. Get existing PO numbers from Supabase
    const { data: existingProjects } = await admin.from('projects').select('po_no');
    const existingPoNos = new Set((existingProjects || []).map((p: any) => p.po_no).filter(Boolean));

    // 5. Filter to only new POs
    const newPOs = oraclePOs.filter(po => po.OrderNumber && !existingPoNos.has(po.OrderNumber));

    let created = 0;
    const errors: string[] = [];

    for (const po of newPOs) {
      try {
        const { data: nextNum } = await admin.rpc('get_next_project_num');
        const projectId = `VE-${new Date().getFullYear()}-${String(nextNum).padStart(3, '0')}`;
        const project = mapOraclePOToProject(po);
        await admin.from('projects').insert({ id: projectId, ...project });
        try {
          await admin.from('activity_log').insert({
            project_id: projectId,
            action: `Project created from Oracle ERP sync — PO ${po.OrderNumber}`,
            performed_by: 'Oracle Sync', role: 'system',
          });
        } catch {}
        created++;
      } catch (err: any) {
        errors.push(`PO ${po.OrderNumber}: ${err.message}`);
      }
    }

    const summary = {
      success: true, total: oraclePOs.length, created,
      skipped: oraclePOs.length - newPOs.length,
      errors: errors.length ? errors : undefined,
      syncedAt: new Date().toISOString(),
    };

    try {
      await admin.from('activity_log').insert({
        project_id: 'SYSTEM',
        action: `Oracle ERP PO sync complete — ${created} created, ${oraclePOs.length - newPOs.length} skipped`,
        performed_by: 'Oracle Sync', role: 'system',
      });
    } catch {}

    return res.status(200).json(summary);

  } catch (err: any) {
    console.error('Oracle sync error:', err);
    try {
      await admin.from('activity_log').insert({
        project_id: 'SYSTEM',
        action: `Oracle ERP PO sync FAILED: ${err.message}`,
        performed_by: 'Oracle Sync', role: 'system',
      });
    } catch {}
    return res.status(500).json({ error: err.message });
  }
}
