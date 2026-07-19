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

  // Read PDF as base64 and send to OpenAI
  const buf = fs.readFileSync(file.filepath);
  const base64 = buf.toString('base64');

  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `This is a delivery challan / STN (Stock Transfer Note) document from Indus Towers / Venus Energy.
Extract all line items and header fields. Return ONLY valid JSON with this exact structure, no markdown, no explanation:
{
  "documentNo": "FA number or document number from the challan",
  "liftedDate": "date in YYYY-MM-DD format or empty string",
  "gateEntryNo": "gate entry number or empty string",
  "vehicleNo": "vehicle number or empty string",
  "items": [
    {
      "description": "full item description",
      "hsnCode": "HSN code or item code",
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
              type: 'image_url',
              image_url: {
                url: `data:application/pdf;base64,${base64}`,
                detail: 'high'
              }
            }
          ]
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
