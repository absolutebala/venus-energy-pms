import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabaseAdmin';
import formidable from 'formidable';
import fs from 'fs';

export const config = { api: { bodyParser: false } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Auth check
  const token = req.headers.authorization?.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const admin = createAdminClient();
  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  // Get OpenAI API key from super admin profile
  const { data: profile } = await admin
    .from('profiles')
    .select('openai_api_key')
    .eq('role', 'super_admin')
    .single();

  const apiKey = profile?.openai_api_key;
  if (!apiKey) return res.status(400).json({ error: 'NO_API_KEY', message: 'OpenAI API key not configured. Please add it in Admin Profile Settings.' });

  // Parse uploaded file
  const form = formidable({ maxFileSize: 10 * 1024 * 1024 });
  const [, files] = await form.parse(req);
  const file = Array.isArray(files.file) ? files.file[0] : files.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  const fileData = fs.readFileSync(file.filepath);
  const base64  = fileData.toString('base64');
  const mimeType = file.mimetype || 'application/pdf';

  // Call GPT-4o
  const prompt = `You are a PO (Purchase Order) data extraction assistant. Extract all fields from this PO document and return ONLY a valid JSON object with these exact keys:
{
  "project_name": "",
  "project_no": "",
  "site_name": "",
  "indus_id": "",
  "po_no": "",
  "po_date": "YYYY-MM-DD",
  "vendor_name": "",
  "contact_person": "",
  "contact_phone": "",
  "contact_email": "",
  "delivery_address": "",
  "delivery_date": "YYYY-MM-DD",
  "payment_terms": "",
  "currency": "INR",
  "region": "",
  "project_type": "",
  "regional_manager": "",
  "project_manager": "",
  "remarks": "",
  "items": [
    {
      "description": "",
      "hsn": "",
      "uom": "",
      "quantity": 0,
      "rate": 0,
      "gst_rate": 18
    }
  ]
}
Return ONLY the JSON, no explanation or markdown.`;

  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'high' } },
        ],
      }],
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
    return res.status(400).json({ error: 'Failed to parse extracted data. Try a clearer PDF.' });
  }
}
