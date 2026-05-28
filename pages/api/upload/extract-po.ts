import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabaseAdmin';
import formidable from 'formidable';
import fs from 'fs';
import zlib from 'zlib';

export const config = { api: { bodyParser: false } };

function extractTextFromPDF(buf: Buffer): string {
  const raw = buf.toString('latin1');
  const texts: string[] = [];
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m: RegExpExecArray | null;
  while ((m = streamRegex.exec(raw)) !== null) {
    let content = m[1];
    if (content.charCodeAt(0) === 0x78) {
      try { content = zlib.inflateSync(Buffer.from(content, 'latin1')).toString('latin1'); } catch { }
    }
    const tjMatches = content.match(/\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*Tj/g) || [];
    tjMatches.forEach(t => {
      const txt = t.replace(/\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*Tj/, '$1')
        .replace(/\\n/g,' ').replace(/\\r/g,'').replace(/\\\\/g,'\\').replace(/\\([\(\)])/g,'$1');
      if (txt.trim()) texts.push(txt);
    });
    const tjArrMatches = content.match(/\[([^\]]*)\]\s*TJ/g) || [];
    tjArrMatches.forEach(block => {
      const parts = block.match(/\(([^)\\]*(?:\\.[^)\\]*)*)\)/g) || [];
      const joined = parts.map(p => p.slice(1,-1)).join('');
      if (joined.trim()) texts.push(joined);
    });
  }
  return texts.join(' ').replace(/\s+/g,' ').trim();
}

function grab(text: string, pattern: RegExp): string {
  return (text.match(pattern)?.[1] ?? '').trim();
}

function parseDate(raw: string): string {
  const months: Record<string,string> = {JAN:'01',FEB:'02',MAR:'03',APR:'04',MAY:'05',JUN:'06',JUL:'07',AUG:'08',SEP:'09',OCT:'10',NOV:'11',DEC:'12'};
  const m = raw.match(/(\d{1,2})-([A-Z]{3})-(\d{2,4})/);
  if (!m) return '';
  return `${m[3].length===2?'20'+m[3]:m[3]}-${months[m[2]]||'01'}-${m[1].padStart(2,'0')}`;
}

function parseItems(text: string): any[] {
  const items: any[] = [];

  // Each item in Indus Towers PO ends with "Indus ID : IN-XXXXX" — use as reliable delimiter
  const blocks = text.split(/Indus ID\s*:\s*IN-\d+/);
  // Remove last block (it's the footer after last item)
  const itemBlocks = blocks.slice(0, -1);

  for (const block of itemBlocks) {
    if (!block.trim()) continue;

    // Extract item code: pattern like 22-205830-C-00-ZZ-ZZ051
    const codeMatch = block.match(/([\w]{2,3}-[\w-]{10,})/);
    const code = codeMatch?.[1] || '';

    // Extract quantity, UOM, rate, amount
    const rateMatch = block.match(/(\d[\d.]*)\s+(Each|Meter|Nos|Set|Bag|KG|Lot|Box|MT|RMT|Cum|Mtr|KILOME\s*TER|[A-Z]{2,10})\s+([\d,]+\.?\d*)\s+INR\s+([\d,]+\.?\d*)/i);
    if (!rateMatch) continue;

    const qty    = parseFloat(rateMatch[1]);
    const uom    = rateMatch[2].replace(/\s+/g,'');
    const rate   = parseFloat(rateMatch[3].replace(/,/g,''));
    const amount = parseFloat(rateMatch[4].replace(/,/g,''));

    // GST rate
    const gstMatches = Array.from(block.matchAll(/[SC]GST\s*-?\s*(\d+)%/gi));
    const gstRate = gstMatches.reduce((s: number, gm: any) => s + parseInt(gm[1]), 0) || 18;

    // Description: text after SAC/HSN line, before rate line
    const sacIdx  = Math.max(block.search(/SAC No\s*:\s*\S*/), block.search(/HSN No\s*:\s*\S*/));
    const afterSac = sacIdx > -1 ? block.slice(sacIdx).replace(/^(SAC|HSN) No\s*:\s*\S*\s*/, '').trim() : block;
    const rateIdx = afterSac.search(/\d[\d.]*\s+(Each|Meter|Nos|Set|Bag|KG|Lot|Box|MT|RMT|Cum|Mtr|KILOME)/i);
    const rawDesc = rateIdx > 0 ? afterSac.slice(0, rateIdx) : afterSac.slice(0, 100);
    const description = rawDesc.replace(/\s+/g,' ').trim().slice(0, 100) || code;

    if (code || description) {
      items.push({ description, hsn: code, uom, quantity: qty, rate, gst_rate: gstRate, amount });
    }
  }

  console.log(`parseItems: found ${itemBlocks.length} blocks, extracted ${items.length} items`);
  return items;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.replace('Bearer ','').trim();
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const admin = createAdminClient();
  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  const form = formidable({ maxFileSize: 20*1024*1024 });
  const [, files] = await form.parse(req);
  const file = Array.isArray(files.file) ? files.file[0] : files.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });
  if (!file.mimetype?.includes('pdf')) return res.status(400).json({ error: 'Only PDF files are accepted.' });

  let pdfText = '';
  try {
    const buf = fs.readFileSync(file.filepath);
    pdfText = extractTextFromPDF(buf);
  } catch (err: any) {
    return res.status(400).json({ error: 'Could not read PDF: ' + String(err.message) });
  }
  if (!pdfText.trim()) return res.status(400).json({ error: 'No text found in PDF.' });

  // ── Extract all fields with regex — no AI needed ──
  const po_no      = grab(pdfText, /P\.O No\s*:?\s*\n?\s*:?\s*(\d{8,})/);
  const dateRaw    = grab(pdfText, /Date\s*:?\s*\n?\s*:?\s*(\d{1,2}-[A-Z]{3}-\d{2,4})/);
  const po_date    = parseDate(dateRaw);
  const indus_id   = grab(pdfText, /Indus ID\s*:\s*(IN-[\d]+)/);
  const project_no = grab(pdfText, /Project No\s*:\s*([\w/\-]+)/);
  const region     = grab(pdfText, /Circle\s*:\s*([\w][\w\s]*?)(?:\s+Warehouse|\s+Username|\n|$)/);
  const valueRaw   = grab(pdfText, /Total Value\s*:\s*([\d,]+\.?\d*)/);
  const po_value   = parseFloat(valueRaw.replace(/,/g,'')) || 0;

  // Parse items section
  const itemsStart = pdfText.indexOf('Sr.No.');
  const itemsEnd   = pdfText.indexOf('Total Value');
  const itemsText  = itemsStart > -1 ? pdfText.slice(itemsStart, itemsEnd > itemsStart ? itemsEnd+50 : pdfText.length) : pdfText;
  const items      = parseItems(itemsText);

  console.log(`Extracted: po_no=${po_no}, items=${items.length}`);

  return res.status(200).json({
    success: true,
    data: { po_no, po_date, indus_id, project_no, region, po_value, items },
  });
}
