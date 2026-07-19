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

  const { images } = req.body as { images: string[] };
  if (!images?.length) return res.status(400).json({ error: 'No images provided' });

  const content: any[] = [
    {
      type: 'text',
      text: `This is a delivery challan / STN (Stock Transfer Note) from Indus Towers / Venus Energy.
Extract all fields carefully including from the "Project Details" section on the right side.

Field mapping guide:
- "documentNo": FA No or Document No field
- "liftedDate": Document Date field (convert to YYYY-MM-DD)
- "gateEntryNo": Gate Entry No field
- "vehicleNo": Vehicle No field (look in Project Details section, e.g. TN31Q1921)
- "boqReqNo": Move Order No or BOQ Req No or OM-RESPS number (look in Project Details section)
- items[].description: Item Description column
- items[].hsnCode: HSN or Item Code column  
- items[].uom: UOM column
- items[].quantity: Qty column
- items[].serialNo: Serial No column
- items[].amount: Amount column (Total Value if only one item)

Return ONLY valid JSON, no markdown:
{
  "documentNo": "",
  "liftedDate": "YYYY-MM-DD",
  "gateEntryNo": "",
  "vehicleNo": "",
  "boqReqNo": "",
  "items": [
    {
      "description": "",
      "hsnCode": "",
      "uom": "",
      "quantity": 1,
      "serialNo": "",
      "amount": 0
    }
  ]
}`
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
    const parsed = JSON.parse(clean);
    return res.status(200).json({ success: true, data: parsed });
  } catch {
    return res.status(500).json({ error: 'Failed to parse OpenAI response', raw: text });
  }
}
