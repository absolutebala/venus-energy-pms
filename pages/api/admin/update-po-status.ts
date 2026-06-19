import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabaseAdmin';
import formidable from 'formidable';
import fs from 'fs';
import * as XLSX from 'xlsx';

export const config = { api: { bodyParser: false } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const admin = createAdminClient();
  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'super_admin') return res.status(403).json({ error: 'Forbidden' });

  const form = formidable({ maxFileSize: 10 * 1024 * 1024 });
  const [, files] = await form.parse(req);
  const file = Array.isArray(files.file) ? files.file[0] : files.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const buf = fs.readFileSync(file.filepath);
    const wb  = XLSX.read(buf, { type: 'buffer' });
    const ws  = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

    if (!rows.length) return res.status(400).json({ error: 'Excel file is empty' });

    const firstRow = rows[0];
    const keys = Object.keys(firstRow);
    const poNumKey    = keys.find(k => k.toLowerCase().replace(/\s+/g,'').includes('ponumber') || k.toLowerCase().replace(/\s+/g,'').includes('pono'));
    const poStatusKey = keys.find(k => k.toLowerCase().replace(/\s+/g,'').includes('postatus') || k.toLowerCase().replace(/\s+/g,'').includes('status'));

    if (!poNumKey || !poStatusKey) {
      return res.status(400).json({ error: `Could not find required columns. Found: ${keys.join(', ')}. Expected "PO Number" and "PO Status".` });
    }

    // Build poNo -> status map, dedupe
    const poMap = new Map<string, string>();
    for (const row of rows) {
      const poNo = String(row[poNumKey] || '').trim();
      const poStatus = String(row[poStatusKey] || '').trim();
      if (poNo && poStatus) poMap.set(poNo, poStatus);
    }

    const totalPoNumbers = poMap.size;
    const notFound: string[] = [];
    const results: { poNo: string; status: string; projectsUpdated: number }[] = [];
    let totalUpdated = 0;

    // Group PO numbers by status so we can do one bulk update per status value
    const statusGroups = new Map<string, string[]>();
    for (const [poNo, status] of poMap.entries()) {
      if (!statusGroups.has(status)) statusGroups.set(status, []);
      statusGroups.get(status)!.push(poNo);
    }

    // Process each status group with chunked .in() updates (Supabase can handle large .in() arrays)
    const CHUNK_SIZE = 200;
    for (const [status, poNos] of statusGroups.entries()) {
      for (let i = 0; i < poNos.length; i += CHUNK_SIZE) {
        const chunk = poNos.slice(i, i + CHUNK_SIZE);
        const { data, error } = await admin
          .from('projects')
          .update({ po_status: status })
          .in('po_no', chunk)
          .select('id, po_no');

        if (error) {
          chunk.forEach(p => notFound.push(p));
          continue;
        }

        const updatedPoNos = new Set((data || []).map((d: any) => d.po_no));
        for (const poNo of chunk) {
          const count = (data || []).filter((d: any) => d.po_no === poNo).length;
          if (count === 0) notFound.push(poNo);
          else {
            totalUpdated += count;
            results.push({ poNo, status, projectsUpdated: count });
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      totalPoNumbers,
      totalProjectsUpdated: totalUpdated,
      notFound,
      results,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to process file: ' + err.message });
  }
}
