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

    const { images, batchStartPage } = req.body as { images: string[]; batchStartPage?: number };
    if (!images?.length) return res.status(400).json({ error: 'No images provided' });

    const content: any[] = [
      {
        type: 'text',
        text: `You are parsing delivery challan / STN pages from Indus Towers / Venus Energy.

CRITICAL INSTRUCTIONS:
1. CONTINUATION PAGES: Some pages may be continuation of a table from the previous page — they will NOT have column headers visible but will have rows of data. Extract ALL rows you can see, even if there are no column headers on that page.
2. NUMBER OF ITEMS: Use S.No. column to identify items. Each S.No. = ONE item. If S.No. is not visible (continuation page), extract each visible data row as a separate item.
3. DESCRIPTION: Combine all lines within a single table row into ONE description. Multi-line text in the same row = same item.
4. STAMPS: If a rubber stamp overlaps the table, extract whatever data is still visible around the stamp.
5. MULTIPLE CHALLANS: If this page belongs to a different challan than previous pages, still extract all items.
6. Gate Entry No: Read from rubber stamp at bottom — read EVERY digit carefully.
7. Item Code: Read EVERY character precisely e.g. "17-120000-0-01-ZZ-ZZ-133".
8. Site ID: e.g. "IN-1245636" from Destination section.

Return ONLY valid JSON, no markdown:
{
  "documentNo": "document number or empty if not visible",
  "liftedDate": "YYYY-MM-DD or empty",
  "gateEntryNo": "gate entry number or empty",
  "vehicleNo": "vehicle number or empty",
  "boqReqNo": "BOQ req number or empty",
  "siteId": "Site ID or empty",
  "items": [
    {
      "description": "item description",
      "hsnCode": "HSN number",
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
