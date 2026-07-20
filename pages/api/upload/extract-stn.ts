import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabaseAdmin';

export const config = { api: { bodyParser: { sizeLimit: '25mb' } } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const admin = createAdminClient();
    const { data: { user }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { images } = req.body as { images: string[] };
    if (!images?.length) return res.status(400).json({ error: 'No images provided' });

    const content: any[] = [
      {
        type: 'text',
        text: `You are parsing one or more delivery challans / STNs from Indus Towers / Venus Energy. Extract ALL line items from ALL pages.

CRITICAL INSTRUCTIONS:
1. Extract EVERY item row from ALL pages — do not stop after 2-3 items. This PDF may have 20+ items.
2. "Gate Entry No" — in the rubber stamp at the BOTTOM. Read EVERY digit carefully.
3. "HSN" — numeric code like 83119000. Different from Item Code.
4. "Item Code" — product code like "17-120000-0-01-ZZ-ZZ-133". Different from HSN.
5. "Serial No" — from Serial No column. If empty, use Lot No value.
6. "Site ID" — like "IN-1245636" from Destination section.
7. If multiple challans exist, use the first document's header fields and combine ALL items.

Return ONLY valid JSON, no markdown:
{
  "documentNo": "document number",
  "liftedDate": "YYYY-MM-DD",
  "gateEntryNo": "full gate entry number from stamp",
  "vehicleNo": "vehicle number",
  "boqReqNo": "BOQ req number",
  "siteId": "Site ID e.g. IN-1245636",
  "items": [
    {
      "description": "item description",
      "hsnCode": "HSN number only",
      "itemCode": "item code",
      "uom": "unit of measure",
      "quantity": 1,
      "serialNo": "serial number or lot number",
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
      body: JSON.stringify({ model: 'gpt-4o', max_tokens: 8000, messages: [{ role: 'user', content }] })
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
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
