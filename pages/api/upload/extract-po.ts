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
  // Split on item boundaries: number + item code pattern (e.g. "2 22-205830-C-00-ZZ")
  const itemCodePattern = /\b(\d{1,2})\s+([\w]{2,3}-[\w-]{10,})/g;
  const boundaries: {idx: number, num: number, code: string}[] = [];
  let bm: RegExpExecArray | null;
  while ((bm = itemCodePattern.exec(text)) !== null) {
    const num = parseInt(bm[1]);
    if (num >= 1 && num <= 50) {
      boundaries.push({ idx: bm.index, num, code: bm[2] });
    }
  }

  for (let i = 0; i < boundaries.length; i++) {
    const start = boundaries[i].idx;
    const end   = boundaries[i+1]?.idx ?? text.length;
    const block = text.slice(start, end);
    const code  = boundaries[i].code;

    // Extract quantity, UOM, rate, amount from pattern: {qty} {UOM} {rate} INR {amount}
    const rateMatch = block.match(/(\d[\d.]*)\s+(Each|Meter|Nos|Set|Bag|KG|Lot|Box|MT|RMT|Cum|Mtr|KILOME\s*TER|[A-Z]{2,10})\s+([\d,]+\.?\d*)\s+INR\s+([\d,]+\.?\d*)/i);
    if (!rateMatch) continue;

    const qty    = parseFloat(rateMatch[1]);
    const uom    = rateMatch[2].replace(/\s+/,'');
    const rate   = parseFloat(rateMatch[3].replace(/,/g,''));
    const amount = parseFloat(rateMatch[4].replace(/,/g,''));

    // GST: sum of all SGST/CGST percentages in block
    const gstMatches = Array.from(block.matchAll(/[SC]GST\s*-?\s*(\d+)%/gi));
    const gstRate = gstMatches.reduce((s, gm) => s + parseInt(gm[1]), 0) || 18;

    // Description: text between SAC/HSN lines and the rate line
    const sacIdx  = Math.max(block.search(/SAC No\s*:/), block.search(/HSN No\s*:/));
    const sacEnd  = sacIdx > -1 ? block.indexOf(' ', block.indexOf(':', sacIdx)+2)+1 : 0;
    const rateIdx = block.search(/\d[\d.]*\s+(Each|Meter|Nos|Set|Bag|KG|Lot|Box|MT|RMT|Cum|Mtr|KILOME|[A-Z]{2,10})\s+[\d,]+/i);
    const rawDesc = sacEnd > 0 && rateIdx > sacEnd
      ? block.slice(sacEnd, rateIdx)
      : block.slice(code.length + 5, rateIdx > 0 ? rateIdx : 80);

    const description = rawDesc.replace(/\s+/g,' ').replace(/HSN No[^:]*:[^\s]*/g,'')
      .replace(/SAC No[^:]*:[^\s]*/g,'').trim().slice(0, 100) || code;

    items.push({ description, hsn: code, uom, quantity: qty, rate, gst_rate: gstRate, amount });
  }
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
