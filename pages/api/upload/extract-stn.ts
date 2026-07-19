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
    const tjArrMatches = content.match(/\[([^\]]*)\]\s*TJ/g) || [];
    tjArrMatches.forEach(block => {
      const parts = block.match(/\(([^)\\]*(?:\\.[^)\\]*)*)\)/g) || [];
      const joined = parts.map(p => p.slice(1,-1)).join('');
      if (joined.trim()) texts.push(joined);
    });
  }
  return texts.join(' ').replace(/\s+/g,' ').trim();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const admin = createAdminClient();
  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  const form = formidable({ maxFileSize: 20 * 1024 * 1024 });
  const [, files] = await form.parse(req);
  const file = Array.isArray(files.file) ? files.file[0] : files.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });
  if (!file.mimetype?.includes('pdf')) return res.status(400).json({ error: 'Only PDF files accepted.' });

  let pdfText = '';
  try {
    const buf = fs.readFileSync(file.filepath);
    pdfText = extractTextFromPDF(buf);
  } catch (err: any) {
    return res.status(400).json({ error: 'Could not read PDF: ' + String(err.message) });
  }
  if (!pdfText.trim()) return res.status(400).json({ error: 'No text found in PDF.' });

  // Call OpenAI to extract STN fields
  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 2000,
      messages: [
        {
          role: 'system',
          content: `You are a delivery challan / STN (Stock Transfer Note) parser. Extract all line items from the provided text.
Return ONLY valid JSON with this exact structure, no markdown, no explanation:
{
  "documentNo": "FA number or document number",
  "liftedDate": "YYYY-MM-DD format or empty string",
  "gateEntryNo": "gate entry number or empty string",
  "vehicleNo": "vehicle number or empty string",
  "items": [
    {
      "description": "full item description",
      "hsnCode": "HSN or item code",
      "uom": "unit of measure e.g. Each, Nos, Meter",
      "quantity": 1,
      "serialNo": "serial number or empty string",
      "amount": 0
    }
  ]
}
Extract ALL line items from the table. If a field is not found, use empty string or 0.`
        },
        {
          role: 'user',
          content: `Parse this delivery challan / STN document and extract all items:\n\n${pdfText.slice(0, 8000)}`
        }
      ]
    })
  });

  if (!openaiRes.ok) {
    const errText = await openaiRes.text();
    return res.status(500).json({ error: 'OpenAI error: ' + errText });
  }

  const openaiData = await openaiRes.json();
  const content = openaiData.choices?.[0]?.message?.content || '';

  let parsed: any;
  try {
    const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(clean);
  } catch {
    return res.status(500).json({ error: 'Failed to parse OpenAI response', raw: content });
  }

  return res.status(200).json({ success: true, data: parsed });
}
