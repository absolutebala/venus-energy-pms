import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabaseAdmin';
import formidable from 'formidable';
import fs from 'fs';
// @ts-ignore
import pdfParse from 'pdf-parse';

export const config = { api: { bodyParser: false } };

/* ─── helpers ─────────────────────────────────────── */
function grab(text: string, pattern: RegExp): string {
  return (text.match(pattern)?.[1] ?? '').trim();
}

function parseDate(raw: string): string {
  // "22-MAY-2026 18:27:53" or "17-MAY-26" → YYYY-MM-DD
  const months: Record<string,string> = { JAN:'01',FEB:'02',MAR:'03',APR:'04',MAY:'05',JUN:'06',JUL:'07',AUG:'08',SEP:'09',OCT:'10',NOV:'11',DEC:'12' };
  const m = raw.match(/(\d{1,2})-([A-Z]{3})-(\d{2,4})/);
  if (!m) return '';
  const day  = m[1].padStart(2,'0');
  const mon  = months[m[2]] || '01';
  const year = m[3].length === 2 ? '20' + m[3] : m[3];
  return `${year}-${mon}-${day}`;
}

function parseAmount(raw: string): number {
  return parseFloat(raw.replace(/,/g,'')) || 0;
}

/* ─── Item parser ─────────────────────────────────── */
interface POItem {
  description: string; hsn: string; uom: string;
  quantity: number; rate: number; gst_rate: number; amount: number;
}

function parseItems(text: string): POItem[] {
  const items: POItem[] = [];

  // Split into item blocks: each block starts with "\n{digit(s)} {ITEM-CODE}"
  // Item codes look like: 29-100000-0-00-ZZ-ZZ816
  const blockSplitter = /\n(\d{1,3})\s+([\w-]{15,})\n/g;
  const matches = Array.from(text.matchAll(blockSplitter));

  for (let i = 0; i < matches.length; i++) {
    const m        = matches[i];
    const blockStart = m.index! + m[0].length;
    const blockEnd   = matches[i + 1]?.index ?? text.indexOf('Total Value');
    const block      = text.slice(blockStart, blockEnd < blockStart ? text.length : blockEnd);
    const itemCode   = m[2];

    // HSN / SAC
    const hsn = grab(block, /HSN No\s*:\s*(\S+)/) || grab(block, /SAC No\s*:\s*(\S+)/);

    // Rate line: "{qty} {UOM} {rate} INR {amount} {date}"
    const rateLine = block.match(/(\d[\d.]*)\s+(Each|Meter|KILOME\s*TER|Nos|Set|KG|Lot|Box|Bag|MT|RMT|Cum|Mtr|[A-Z]+)\s+([\d,]+\.?\d*)\s+INR\s+([\d,]+\.?\d*)/i);
    if (!rateLine) continue;

    const qty    = parseFloat(rateLine[1]);
    const uom    = rateLine[2].replace(/\s+/,'').replace('KILOMETER','Kilometer');
    const rate   = parseAmount(rateLine[3]);
    const amount = parseAmount(rateLine[4]);

    // GST: look for SGST/CGST percentages — sum them
    const gstMatches = Array.from(block.matchAll(/[SC]GST\s*-?\s*(\d+)%/gi));
    const gstRate = gstMatches.reduce((sum, gm) => sum + parseInt(gm[1]), 0) || 18;

    // Description: text between SAC line and the rate line
    const sacIdx  = block.search(/SAC No\s*:/);
    const sacEnd  = block.indexOf('\n', sacIdx) + 1;
    const rateIdx = block.search(/(\d[\d.]*)\s+(Each|Meter|KILOME|Nos|Set|KG|Lot|Box|Bag|MT|RMT|Cum|Mtr)/i);
    const descRaw = block.slice(sacEnd, rateIdx).replace(/HSN No\s*:[^\n]*/g,'').trim();
    const description = descRaw.replace(/\n+/g,' ').replace(/\s{2,}/g,' ').trim()
      || itemCode;

    items.push({ description, hsn: itemCode, uom, quantity: qty, rate, gst_rate: gstRate, amount });
  }

  return items;
}

/* ─── Main handler ────────────────────────────────── */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const admin = createAdminClient();
  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  const form = formidable({ maxFileSize: 20 * 1024 * 1024 });
  const [, files] = await form.parse(req);
  const file = Array.isArray(files.file) ? files.file[0] : files.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  let text = '';
  try {
    const buf = fs.readFileSync(file.filepath);
    const parsed = await pdfParse(buf);
    text = parsed.text;
  } catch (err: any) {
    return res.status(400).json({ error: 'Could not read PDF: ' + err.message });
  }

  // ── Extract header fields ──
  const poNo     = grab(text, /P\.O No\s*\n?\s*:\s*([\d]+)/);
  const dateRaw  = grab(text, /Date\s*\n?\s*:\s*([\d]{1,2}-[A-Z]{3}-[\d]{2,4}[^\n]*)/);
  const poDate   = parseDate(dateRaw);
  const indusId  = grab(text, /Indus ID\s*:\s*(IN-[\d]+)/);
  const projectNo = grab(text, /Project No\s*:\s*([\w/RL-]+)/);
  const region   = grab(text, /Circle\s*:\s*(\w[\w\s]*?)(?:\n|Warehouse)/);
  const totalRaw = grab(text, /Total Order Value\s*[:\s]+([\d,]+\.?\d*)/);
  const poValue  = parseAmount(totalRaw);
  const vendor   = grab(text, /Supplier Name\s*\n?\s*:\s*([^\n]+)/);

  // ── Extract items ──
  const items = parseItems(text);

  const data = {
    po_no: poNo,
    po_date: poDate,
    indus_id: indusId,
    project_no: projectNo,
    region: region.replace('Karnataka','Karnataka').trim(),
    po_value: poValue,
    vendor_name: vendor,
    items,
  };

  return res.status(200).json({ success: true, data });
}
