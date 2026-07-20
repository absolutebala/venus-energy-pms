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
        text: `You are parsing a delivery challan / STN from Indus Towers / Venus Energy. Extract all fields with high precision.

CRITICAL INSTRUCTIONS:
1. "Gate Entry No" — This appears in a rubber stamp or handwritten area at the BOTTOM of the document, often labeled "Gate Entry No" or "Gate Entg No". Read EVERY digit carefully. Common mistake: missing digits. Double-check the full number.
2. "HSN" — numeric code like 83119000. Do NOT confuse with Item Code.
3. "Item Code" — product code like "12-440000-0-01-ZZ-ZZ-000". This is DIFFERENT from HSN.
4. "Serial No" — from the "Serial No" column. If empty, use "Lot No" value instead.
5. "Site ID" — a code like "IN-1038303" from the Destination section.
6. "Document No" — main document number from Source section.
7. "BOQ Req No" or "BOQ Req. No" — numeric reference.
8. "Vehicle No" — like TS15UC2295.

Return ONLY valid JSON with NO markdown:
{
  "documentNo": "document number",
  "liftedDate": "YYYY-MM-DD",
  "gateEntryNo": "FULL gate entry number - read every digit from the stamp at bottom",
  "vehicleNo": "vehicle number",
  "boqReqNo": "BOQ req number",
  "siteId": "Site ID e.g. IN-1038303",
  "items": [
    {
      "description": "item description",
      "hsnCode": "HSN number only e.g. 83119000",
      "itemCode": "item code e.g. 12-440000-0-01-ZZ-ZZ-000",
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
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
