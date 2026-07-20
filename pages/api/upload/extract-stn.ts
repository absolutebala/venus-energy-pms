import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabaseAdmin';

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

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
        text: `You are parsing a delivery challan / STN (Stock Transfer Note) from Indus Towers / Venus Energy.

Extract fields carefully. Pay special attention to:
- "HSN" or "HSN No" field — this is a numeric code like 83119000. Do NOT confuse with Item Code.
- "Item Code" — this is the product code like "12-440000-0-01-ZZ-ZZ-000". This is DIFFERENT from HSN.
- "Gate Entry No" — look at the outward stamp/seal at the bottom of the document. Read every digit carefully.
- "Serial No" — look specifically in the "Serial No" column. If empty, use the "Lot No" value instead.
- "Site ID" or "Site Id" — a code like "IN-1038303". Extract this for project validation.
- "Document No" — the main document number (e.g. 11270165101).
- "Vehicle No" — like TS15UC2295.
- "BOQ Req No" or "BOQ Req. No" — a numeric reference.

Return ONLY valid JSON with NO markdown:
{
  "documentNo": "document number from Source section",
  "liftedDate": "document date in YYYY-MM-DD format",
  "gateEntryNo": "gate entry number from the outward stamp at bottom - read every digit carefully",
  "vehicleNo": "vehicle number",
  "boqReqNo": "BOQ req number",
  "siteId": "Site ID from destination section e.g. IN-1038303",
  "items": [
    {
      "description": "item description text",
      "hsnCode": "HSN number only e.g. 83119000 - NOT the item code",
      "itemCode": "item code e.g. 12-440000-0-01-ZZ-ZZ-000",
      "uom": "unit of measure",
      "quantity": 1,
      "serialNo": "serial number from Serial No column, or Lot No if serial no is empty",
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
  } catch (err: any) {
    console.error('STN extract error:', err);
    return res.status(500).json({ error: err.message });
  }
}
