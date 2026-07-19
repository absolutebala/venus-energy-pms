import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabaseAdmin';
import formidable from 'formidable';
import fs from 'fs';

export const config = { api: { bodyParser: false } };

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

  const buf = fs.readFileSync(file.filepath);

  // Extract text using pdf-parse
  let pdfText = '';
  try {
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buf);
    pdfText = data.text || '';
  } catch (e) {
    console.error('pdf-parse error:', e);
  }

  if (!pdfText.trim()) {
    return res.status(400).json({ error: 'Could not extract text from PDF. Please ensure the PDF contains selectable text.' });
  }

  // Send extracted text to OpenAI GPT-4o-mini
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
          content: `You are a delivery challan / STN (Stock Transfer Note) parser for Indus Towers / Venus Energy.
Extract all line items and header fields from the provided challan text.
Return ONLY valid JSON with this exact structure, no markdown, no explanation:
{
  "documentNo": "FA number or document number (look for FA No, Document No)",
  "liftedDate": "date in YYYY-MM-DD format (look for Document Date or Date)",
  "gateEntryNo": "gate entry number or empty string",
  "vehicleNo": "vehicle number or empty string",
  "items": [
    {
      "description": "full item description (look for Item Description column)",
      "hsnCode": "HSN code or item code (look for Item Code or HSN)",
      "uom": "unit of measure e.g. Each, Nos, Meter (look for UOM column)",
      "quantity": 1,
      "serialNo": "serial number (look for Serial No column) or empty string",
      "amount": 0
    }
  ]
}
Extract ALL line items from the table. If a field is not found, use empty string or 0.`
        },
        {
          role: 'user',
          content: `Parse this delivery challan / STN document:\n\n${pdfText.slice(0, 8000)}`
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
