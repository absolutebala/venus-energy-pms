import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabaseAdmin';

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

// GPT-4o pricing (per 1M tokens)
const INPUT_COST_PER_M  = 2.50;
const OUTPUT_COST_PER_M = 10.00;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const admin = createAdminClient();
    const { data: { user }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { images, source = 'stn', projectId } = req.body as { images: string[]; source?: string; projectId?: string };
    if (!images?.length) return res.status(400).json({ error: 'No images provided' });

    const content: any[] = [
      {
        type: 'text',
        text: `You are parsing ONE PAGE of a delivery challan / STN from Indus Towers / Venus Energy.

CRITICAL INSTRUCTIONS:
1. Extract ALL item rows visible on this page. Each S.No. = ONE item.
2. ALWAYS include the S.No. value for each item — this is critical for detecting missing items.
3. CONTINUATION PAGE: If this page has no column headers but has data rows, extract every visible row.
4. DESCRIPTION: Combine all lines within a single table row into ONE description string.
5. STAMPS: If a rubber stamp overlaps the table, extract whatever data is still visible.
6. GRAND TOTAL: If this page shows "Total Value" or "Value" at the bottom, extract that number.
7. Item Code: Read EVERY character precisely e.g. "17-120000-0-01-ZZ-ZZ-133".
8. Gate Entry No: Read from rubber stamp — read EVERY digit.
9. HSN: numeric code only e.g. 83119000. Different from Item Code.

Return ONLY valid JSON, no markdown:
{
  "documentNo": "document number or empty",
  "liftedDate": "YYYY-MM-DD or empty",
  "gateEntryNo": "gate entry number or empty",
  "vehicleNo": "vehicle number or empty",
  "boqReqNo": "BOQ req number or empty",
  "siteId": "Site ID e.g. IN-1245636 or empty",
  "grandTotal": 0,
  "totalItemsOnPage": 0,
  "items": [
    {
      "sno": 1,
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
      body: JSON.stringify({ model: 'gpt-4o', max_tokens: 4000, messages: [{ role: 'user', content }] })
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      return res.status(500).json({ error: 'OpenAI error: ' + errText });
    }

    const openaiData = await openaiRes.json();
    const text = openaiData.choices?.[0]?.message?.content || '';

    // Log token usage
    const inputTokens  = openaiData.usage?.prompt_tokens || 0;
    const outputTokens = openaiData.usage?.completion_tokens || 0;
    const costUsd = (inputTokens / 1_000_000 * INPUT_COST_PER_M) + (outputTokens / 1_000_000 * OUTPUT_COST_PER_M);

    try {
      await admin.from('api_usage').insert({
        source,
        project_id: projectId || null,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_usd: costUsd,
        user_id: user.id,
      });
    } catch(logErr) { console.error('Usage log error:', logErr); }

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
