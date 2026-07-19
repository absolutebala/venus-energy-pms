import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabaseAdmin';

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const admin = createAdminClient();
  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { images } = req.body as { images: string[] }; // base64 JPEG images of PDF pages
  if (!images?.length) return res.status(400).json({ error: 'No images provided' });

  // Build message content with all page images
  const content: any[] = [
    {
      type: 'text',
      text: `This is a delivery challan / STN (Stock Transfer Note) from Indus Towers / Venus Energy.
Extract all line items and header fields. Return ONLY valid JSON with this exact structure, no markdown:
{
  "documentNo": "FA number or document number",
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
Extract ALL line items from the table. Use empty string or 0 if field not found.`
    },
    ...images.map((img: string) => ({
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${img}`, detail: 'high' }
    }))
  ];

  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: 'gpt-4o', max_tokens: 2000, messages: [{ role: 'user', content }] })
  });

  if (!openaiRes.ok) {
    const errText = await openaiRes.text();
    return res.status(500).json({ error: 'OpenAI error: ' + errText });
  }

  const openaiData = await openaiRes.json();
  const text = openaiData.choices?.[0]?.message?.content || '';
  try {
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return res.status(200).json({ success: true, data: JSON.parse(clean) });
  } catch {
    return res.status(500).json({ error: 'Failed to parse OpenAI response', raw: text });
  }
}
