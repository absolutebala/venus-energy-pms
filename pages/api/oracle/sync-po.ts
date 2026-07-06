import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabaseAdmin';

// ── Oracle ERP Cloud → Venus Energy PMS: Purchase Order Sync ─────────────
// Reads POs from Oracle via REST API and creates new projects in Supabase.
// Never overwrites existing projects — only creates new ones.
// Triggered manually (POST from UI) or automatically (Vercel cron, GET with cron secret).

async function getOracleToken(): Promise<string> {
  const tokenUrl  = process.env.ORACLE_TOKEN_URL!;
  const clientId  = process.env.ORACLE_CLIENT_ID!;
  const clientSecret = process.env.ORACLE_CLIENT_SECRET!;

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

async function fetchOraclePOs(token: string): Promise<any[]> {
  const baseUrl = process.env.ORACLE_BASE_URL!;
  // Oracle FSCM REST API endpoint for Purchase Orders
  const url = `${baseUrl}/fscmRestApi/resources/11.13.18.05/purchaseOrders?limit=500&fields=OrderNumber,OrderDate,Amount,Supplier,SupplierSiteCode,Description,BuyerEmail,BuyerName,Status,CurrencyCode`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Oracle PO fetch error (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.items || [];
}

function mapOraclePOToProject(po: any): Record<string, any> {
  // Map Oracle PO fields to Venus Energy portal project schema
  const poDate = po.OrderDate ? new Date(po.OrderDate).toISOString().split('T')[0] : null;
  return {
    po_no:          po.OrderNumber      || '',
    po_date:        poDate,
    po_value:       Number(po.Amount)   || 0,
    vendor:         po.Supplier         || '',
    site:           po.Description      || '',
    pm:             po.BuyerName        || '',
    po_status:      po.Status === 'OPEN' ? 'Open' : po.Status === 'CLOSED' ? 'Closed' : 'Open',
    project_status: 'Yet to Start',
    status:         'not_started',
    source:         'oracle_erp',      // mark as oracle-synced
    created_at:     new Date().toISOString(),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow GET (cron) with cron secret, or POST (manual) with user auth
  const isCron = req.method === 'GET';
  const isManual = req.method === 'POST';

  if (!isCron && !isManual) return res.status(405).json({ error: 'Method not allowed' });

  // Cron auth
  if (isCron) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  // Manual auth — verify super_admin
  if (isManual) {
    const admin = createAdminClient();
    const token = req.headers.authorization?.replace('Bearer ', '').trim();
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const { data: { user }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });
    const { data: callerProfile } = await admin.from('profiles').select('role').eq('id', user.id).single();
    if (callerProfile?.role !== 'super_admin') return res.status(403).json({ error: 'Forbidden — super admin only' });
  }

  const admin = createAdminClient();

  try {
    // 1. Get Oracle OAuth token
    const oracleToken = await getOracleToken();

    // 2. Fetch POs from Oracle
    const oraclePOs = await fetchOraclePOs(oracleToken);
    if (!oraclePOs.length) {
      return res.status(200).json({ success: true, created: 0, skipped: 0, message: 'No POs returned from Oracle' });
    }

    // 3. Get existing PO numbers from Supabase to avoid duplicates
    const { data: existingProjects } = await admin.from('projects').select('po_no');
    const existingPoNos = new Set((existingProjects || []).map((p: any) => p.po_no).filter(Boolean));

    // 4. Filter to only new POs
    const newPOs = oraclePOs.filter(po => po.OrderNumber && !existingPoNos.has(po.OrderNumber));

    // 5. Generate project IDs and insert new projects
    let created = 0;
    const errors: string[] = [];

    for (const po of newPOs) {
      try {
        // Generate next project number via RPC
        const { data: nextNum } = await admin.rpc('get_next_project_num');
        const projectId = `VE-${new Date().getFullYear()}-${String(nextNum).padStart(3, '0')}`;

        const project = mapOraclePOToProject(po);
        await admin.from('projects').insert({ id: projectId, ...project });

        // Log to activity
        await admin.from('activity_log').insert({
          project_id:   projectId,
          action:       `Project created from Oracle ERP sync — PO ${po.OrderNumber}`,
          performed_by: 'Oracle Sync',
          role:         'system',
        }).catch(() => {});

        created++;
      } catch (err: any) {
        errors.push(`PO ${po.OrderNumber}: ${err.message}`);
      }
    }

    const summary = {
      success:  true,
      total:    oraclePOs.length,
      created,
      skipped:  oraclePOs.length - newPOs.length,
      errors:   errors.length ? errors : undefined,
      syncedAt: new Date().toISOString(),
    };

    // Log sync result to activity
    await admin.from('activity_log').insert({
      project_id:   'SYSTEM',
      action:       `Oracle ERP PO sync complete — ${created} created, ${oraclePOs.length - newPOs.length} skipped (already exist)`,
      performed_by: 'Oracle Sync',
      role:         'system',
    }).catch(() => {});

    return res.status(200).json(summary);

  } catch (err: any) {
    console.error('Oracle sync error:', err);
    await admin.from('activity_log').insert({
      project_id:   'SYSTEM',
      action:       `Oracle ERP PO sync FAILED: ${err.message}`,
      performed_by: 'Oracle Sync',
      role:         'system',
    }).catch(() => {});
    return res.status(500).json({ error: err.message });
  }
}
