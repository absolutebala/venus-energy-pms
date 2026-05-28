import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabaseAdmin';
import formidable from 'formidable';
import fs from 'fs';
import zlib from 'zlib';

export const config = { api: { bodyParser: false } };

// Pure Node.js text extraction from digital PDFs — no npm packages, no browser APIs
function extractTextFromPDF(buf: Buffer): string {
  const raw = buf.toString('latin1');
  const texts: string[] = [];

  // Decompress FlateDecode streams and extract text
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m: RegExpExecArray | null;

  while ((m = streamRegex.exec(raw)) !== null) {
    let content = m[1];

    // Try to decompress if it looks like compressed data
    if (content.charCodeAt(0) === 0x78) {
      try {
        const compressed = Buffer.from(content, 'latin1');
        content = zlib.inflateSync(compressed).toString('latin1');
      } catch { /* not compressed or decompress failed, use as-is */ }
    }

    // Extract text from Tj operator: (text)Tj
    const tjMatches = content.match(/\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*Tj/g) || [];
    tjMatches.forEach(t => {
      const txt = t.replace(/\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*Tj/, '$1')
        .replace(/\\n/g, ' ').replace(/\\r/g, '').replace(/\\\\/g, '\\')
        .replace(/\\([\(\)])/g, '$1');
      if (txt.trim()) texts.push(txt);
    });

    // Extract text from TJ operator: [(text)...]TJ
    const tjArrayMatches = content.match(/\[([^\]]*)\]\s*TJ/g) || [];
    tjArrayMatches.forEach(block => {
      const parts = block.match(/\(([^)\\]*(?:\\.[^)\\]*)*)\)/g) || [];
      const joined = parts.map(p => p.slice(1, -1)).join('');
      if (joined.trim()) texts.push(joined);
    });
  }

  return texts.join(' ').replace(/\s+/g, ' ').trim();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const admin = createAdminClient();
  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { data: profile } = await admin
    .from('profiles').select('openai_api_key').eq('role', 'super_admin').single();
  const apiKey = profile?.openai_api_key || process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(400).json({ error: 'NO_API_KEY', message: 'OpenAI API key not configured.' });

  const form = formidable({ maxFileSize: 20 * 1024 * 1024 });
  const [, files] = await form.parse(req);
  const file = Array.isArray(files.file) ? files.file[0] : files.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });
  if (!file.mimetype?.includes('pdf')) {
    return res.status(400).json({ error: 'Only PDF files are accepted.' });
  }

  const buf = fs.readFileSync(file.filepath);
  const pdfText = extractTextFromPDF(buf);

  console.log('PDF text length:', pdfText.length);
  console.log('poSection length:', poSection.length);
  console.log('poSection tail:', poSection.slice(-500));
  if (!pdfText.trim()) {
    return res.status(400).json({ error: 'No text found in PDF. Ensure it is a digital (not scanned) PDF.' });
  }

  // Only send the PO content section, not T&C pages
  const poSection = (() => {
    // Start from PURCHASE ORDER header
    const start = Math.max(0, pdfText.indexOf('PURCHASE ORDER'));
    // End right after Total Order Value line — before T&C pages
    const totalIdx = pdfText.indexOf('Total Order Value');
    const end = totalIdx > -1 ? Math.min(totalIdx + 200, pdfText.length) : Math.min(start + 15000, pdfText.length);
    return pdfText.slice(start, end);
  })();

  const prompt = `Extract data from this Indus Towers Purchase Order and return ONLY valid JSON (no markdown):
{
  "po_no": "",
  "po_date": "YYYY-MM-DD",
  "indus_id": "",
  "project_no": "",
  "region": "",
  "po_value": 0,
  "vendor_name": "",
  "items": [
    { "description": "", "hsn": "", "uom": "", "quantity": 0, "rate": 0, "gst_rate": 18, "amount": 0 }
  ]
}
- po_no: the PO number after "P.O No :" — a LONG NUMBER like 16030397730, NOT a currency amount. Found near Document Type/Date at top of document
- po_date: the date value after "Date :" converted to YYYY-MM-DD (e.g. 22-MAY-2026 → 2026-05-22)
- indus_id: Indus ID (e.g. IN-3460945)
- project_no: value after "Project No :" at the bottom of each line item (e.g. R/RL-8458254)
- region: Circle field
- po_value: subtotal EXCLUDING GST — look for "Total Value" row (NOT "Total Order Value" which includes tax). Return as plain number.
- items: ALL line items; use Item Code for hsn; gst_rate = SGST%+CGST%

PO TEXT:
${poSection}`;

  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!openaiRes.ok) {
    const err = await openaiRes.json();
    return res.status(400).json({ error: err.error?.message || 'OpenAI API error' });
  }

  const openaiData = await openaiRes.json();
  const raw = openaiData.choices?.[0]?.message?.content || '{}';

  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return res.status(200).json({ success: true, data: JSON.parse(cleaned) });
  } catch {
    return res.status(400).json({ error: 'Failed to parse AI response.' });
  }
}
