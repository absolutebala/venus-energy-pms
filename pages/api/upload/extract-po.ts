import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabaseAdmin';
import formidable from 'formidable';
import fs from 'fs';

export const config = { api: { bodyParser: false } };

// Extract text from digital PDF without canvas/DOMMatrix (serverless safe)
async function extractPDFText(buf: Buffer): Promise<string> {
  // Use lib file directly to skip test-file loading in main entry
  const pdfParse = require('pdf-parse/lib/pdf-parse');

  // Custom page renderer — only uses getTextContent(), no canvas needed
  const pagerender = async (pageData: any) => {
    const tc = await pageData.getTextContent();
    return tc.items.map((item: any) => item.str + (item.hasEOL ? '\n' : ' ')).join('');
  };

  const result = await pdfParse(buf, { pagerender });
  return result.text;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const admin = createAdminClient();
  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  // Get OpenAI key from super_admin profile (same as original approach)
  const { data: profile } = await admin
    .from('profiles').select('openai_api_key').eq('role', 'super_admin').single();
  const apiKey = profile?.openai_api_key || process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(400).json({ error: 'NO_API_KEY', message: 'OpenAI API key not configured.' });

  // Parse uploaded file — PDF only
  const form = formidable({ maxFileSize: 20 * 1024 * 1024 });
  const [, files] = await form.parse(req);
  const file = Array.isArray(files.file) ? files.file[0] : files.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });
  if (!file.mimetype?.includes('pdf')) {
    return res.status(400).json({ error: 'Only PDF files are accepted.' });
  }

  // Extract text from PDF
  let pdfText = '';
  try {
    const buf = fs.readFileSync(file.filepath);
    pdfText = await extractPDFText(buf);
  } catch (err: any) {
    console.error('PDF text extraction error:', err);
    return res.status(400).json({ error: 'Could not read PDF: ' + String(err.message || err) });
  }

  if (!pdfText.trim()) {
    return res.status(400).json({ error: 'No text found in PDF. Make sure it is a digital (not scanned) PDF.' });
  }

  // Send extracted text to GPT-4o-mini
  const prompt = `Extract data from this Indus Towers Purchase Order text and return ONLY a valid JSON object with these exact keys (no markdown, no explanation):
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
Rules:
- po_no: the P.O No value
- po_date: convert to YYYY-MM-DD
- indus_id: Indus ID field (e.g. IN-3460945)
- project_no: Project No field
- region: Circle field value
- po_value: Total Order Value as number
- items: ALL line items. Use Item Code column for hsn field. gst_rate = SGST% + CGST%
- Return ONLY the JSON, nothing else.

PO TEXT:
${pdfText.slice(0, 12000)}`;

  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 3000,
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
    const extracted = JSON.parse(cleaned);
    return res.status(200).json({ success: true, data: extracted });
  } catch {
    return res.status(400).json({ error: 'Failed to parse extracted data.' });
  }
}
