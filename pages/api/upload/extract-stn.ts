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
        text: `You are parsing a delivery challan / STN from Indus Towers / Venus Energy.

CRITICAL INSTRUCTIONS:
1. NUMBER OF ITEMS: Use the "S.No." column to count items. Each S.No. number = exactly ONE item. Do NOT split a single row into multiple items even if the description spans multiple lines.
2. DESCRIPTION: Combine all lines of text within a single table row into ONE description string. Multi-line descriptions in the same row belong to the SAME item.
3. ITEM ORDER: Extract items in the exact order they appear (S.No. 1, 2, 3...). Do not reorder.
4. "Gate Entry No" — read from the rubber stamp at the bottom. Read EVERY digit carefully.
5. "HSN" — numeric code like 83119000. Different from Item Code.
6. "Item Code" — product code like "17-120000-0-01-ZZ-ZZ-133". Read EVERY character precisely.
7. "Serial No" — from Serial No column. If empty, use Lot No value.
8. "Site ID" — like "IN-1245636" from Destination section.

Return ONLY valid JSON, no markdown:
{
  "documentNo": "document number",
  "liftedDate": "YYYY-MM-DD",
  "gateEntryNo": "full gate entry number from stamp - read every digit",
  "vehicleNo": "vehicle number",
  "boqReqNo": "BOQ req number",
  "siteId": "Site ID e.g. IN-1245636",
  "items": [
    {
      "description": "complete item description - combine all lines within the same S.No. row",
      "hsnCode": "HSN number only e.g. 83119000",
      "itemCode": "item code e.g. 17-120000-0-01-ZZ-ZZ-133",
      "uom": "unit of measure",
      "quantity": 1,
      "serialNo": "serial number or lot number if serial is empty",
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
