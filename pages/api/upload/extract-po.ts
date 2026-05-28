import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabaseAdmin';
import formidable from 'formidable';
import fs from 'fs';
import zlib from 'zlib';

export const config = { api: { bodyParser: false } };

function extractTextFromPDF(buf: Buffer): string {
  const raw = buf.toString('latin1');
  const texts: string[] = [];
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m: RegExpExecArray | null;
  while ((m = streamRegex.exec(raw)) !== null) {
    let content = m[1];
    if (content.charCodeAt(0) === 0x78) {
      try { content = zlib.inflateSync(Buffer.from(content, 'latin1')).toString('latin1'); } catch { }
    }
    const tjMatches = content.match(/\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*Tj/g) || [];
    tjMatches.forEach(t => {
      const txt = t.replace(/\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*Tj/, '$1')
        .replace(/\\n/g,' ').replace(/\\r/g,'').replace(/\\\\/g,'\\').replace(/\\([\(\)])/g,'$1');
      if (txt.trim()) texts.push(txt);
    });
    const tjArrayMatches = content.match(/\[([^\]]*)\]\s*TJ/g) || [];
    tjArrayMatches.forEach(block => {
      const parts = block.match(/\(([^)\\]*(?:\\.[^)\\]*)*)\)/g) || [];
      const joined = parts.map(p => p.slice(1, -1)).join('');
      if (joined.trim()) texts.push(joined);
    });
  }
  return texts.join(' ').replace(/\s+/g, ' ').trim();
}

function grab(text: string, pattern: RegExp): string {
  return (text.match(pattern)?.[1] ?? '').trim();
}

function parseDate(raw: string): string {
  const months: Record<string,string> = {JAN:'01',FEB:'02',MAR:'03',APR:'04',MAY:'05',JUN:'06',JUL:'07',AUG:'08',SEP:'09',OCT:'10',NOV:'11',DEC:'12'};
  const m = raw.match(/(\d{1,2})-([A-Z]{3})-(\d{2,4})/);
  if (!m) return '';
  return `${m[3].length===2?'20'+m[3]:m[3]}-${months[m[2]]||'01'}-${m[1].padStart(2,'0')}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const admin = createAdminClient();
  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { data: profile } = await admin.from('profiles').select('openai_api_key').eq('role', 'super_admin').single();
  const apiKey = profile?.openai_api_key || process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(400).json({ error: 'NO_API_KEY', message: 'OpenAI API key not configured.' });

  const form = formidable({ maxFileSize: 20 * 1024 * 1024 });
  const [, files] = await form.parse(req);
  const file = Array.isArray(files.file) ? files.file[0] : files.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });
  if (!file.mimetype?.includes('pdf')) return res.status(400).json({ error: 'Only PDF files are accepted.' });

  let pdfText = '';
  try {
    const buf = fs.readFileSync(file.filepath);
    pdfText = extractTextFromPDF(buf);
  } catch (err: any) {
    return res.status(400).json({ error: 'Could not read PDF: ' + String(err.message) });
  }

  if (!pdfText.trim()) return res.status(400).json({ error: 'No text found in PDF.' });

  // ── STEP 1: Extract header fields with regex (instant, no AI needed) ──
  const po_no     = grab(pdfText, /P\.O No\s*:?\s*\n?\s*:?\s*(\d{8,})/);
  const dateRaw   = grab(pdfText, /Date\s*:?\s*\n?\s*:?\s*(\d{1,2}-[A-Z]{3}-\d{2,4})/);
  const po_date   = parseDate(dateRaw);
  const indus_id  = grab(pdfText, /Indus ID\s*:\s*(IN-\d+)/);
  const project_no = grab(pdfText, /Project No\s*:\s*([\w/RL\-]+)/);
  const region    = grab(pdfText, /Circle\s*:\s*([\w][\w\s]*?)(?:\s+Warehouse|\s+Username|\s*$)/m);
  const valueRaw  = grab(pdfText, /Total Value\s*:\s*([\d,]+\.?\d*)/);
  const po_value  = parseFloat(valueRaw.replace(/,/g, '')) || 0;

  // ── STEP 2: Extract items section for GPT (focused, no header clutter) ──
  const itemsStart = pdfText.indexOf('Sr.No.');
  const itemsEnd   = pdfText.indexOf('Total Value');
  const itemsText  = itemsStart > -1 && itemsEnd > itemsStart
    ? pdfText.slice(itemsStart, itemsEnd + 100)
    : pdfText.slice(0, 8000);

  // ── STEP 3: Use GPT ONLY for items array ──
  const prompt = `Extract ALL purchase order line items from this text and return ONLY a valid JSON array (no other text, no markdown):
[{"description":"...","hsn":"...","uom":"...","quantity":0,"rate":0,"gst_rate":18,"amount":0}]

Rules:
- Extract EVERY item — do not stop early. There should be around 15-20 items.
- hsn = Item Code value (e.g. 29-100000-0-00-ZZ-ZZ816)
- description = max 80 chars, first line only
- gst_rate = Karnataka SGST% + CGST% (usually 18)
- quantity, rate, amount = numbers only

PO ITEMS TEXT:
${itemsText}`;

  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 6000,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!openaiRes.ok) {
    const err = await openaiRes.json();
    return res.status(400).json({ error: err.error?.message || 'OpenAI error' });
  }

  const openaiData = await openaiRes.json();
  const raw = openaiData.choices?.[0]?.message?.content || '[]';

  let items: any[] = [];
  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    items = JSON.parse(cleaned);
  } catch {
    items = [];
  }

  return res.status(200).json({
    success: true,
    data: { po_no, po_date, indus_id, project_no, region, po_value, items },
  });
}
