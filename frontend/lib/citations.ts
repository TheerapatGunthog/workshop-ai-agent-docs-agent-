import type { Citation } from "./types";

export type AnswerPart = { kind: "text"; text: string } | { kind: "cite"; id: number; raw: string };

/** แยก answer เป็นข้อความกับ marker [n] */
export function parseAnswer(answer: string): AnswerPart[] {
  const parts: AnswerPart[] = [];
  const re = /\[(\d{1,3})\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(answer)) !== null) {
    if (m.index > last) parts.push({ kind: "text", text: answer.slice(last, m.index) });
    parts.push({ kind: "cite", id: Number(m[1]), raw: m[0] });
    last = m.index + m[0].length;
  }
  if (last < answer.length) parts.push({ kind: "text", text: answer.slice(last) });
  return parts;
}

export const citationMap = (citations: Citation[]) => new Map(citations.map((c) => [c.id, c]));

/*
 * การหา quote ในหน้า PDF
 *
 * PDF ภาษาไทยหลายไฟล์ให้ text layer ที่ "แตก" มาก: ข้อความถูกหั่นเป็นชิ้นเล็ก ๆ
 * สระ/วรรณยุกต์หายหรือกลายเป็นตัวอื่น เช่น "ได้" → "ได1", "สิทธิ" → "สำทธ", "พัก" → "พ\x0f" + "ก"
 * ถ้าเทียบแบบ exact จะไม่เจอเลย วิธีที่ใช้คือ
 *   1. ลดข้อความทั้งสองฝั่งให้เหลือ "โครงพยัญชนะ" (เฉพาะ ก-ฮ) ซึ่งแทบไม่เพี้ยน
 *      (quote ที่ไม่ใช่ภาษาไทย ใช้ตัวอักษรและตัวเลขแทน)
 *   2. ต่อข้อความทุกชิ้นในหน้าเข้าด้วยกัน แล้วหาตำแหน่งของ quote
 *   3. คืน index ของชิ้นที่ซ้อนทับช่วงนั้น เพื่อให้ viewer ครอบด้วย <mark>
 */
const THAI_CONSONANTS = /[\u0E01-\u0E2E]/g;
const NOT_BASE = /[^\p{L}\p{N}]/gu;

function skeleton(text: string, thai: boolean): string {
  if (thai) return (text.match(THAI_CONSONANTS) ?? []).join("");
  return text.normalize("NFC").replace(NOT_BASE, "").toLowerCase();
}

export function findQuoteItems(items: string[], quote: string | undefined): Set<number> {
  const hits = new Set<number>();
  if (!quote) return hits;
  const thai = (quote.match(THAI_CONSONANTS)?.length ?? 0) >= 8;
  const target = skeleton(quote, thai);
  if (!target) return hits;

  let page = "";
  const starts: number[] = [];
  for (const item of items) {
    starts.push(page.length);
    page += skeleton(item, thai);
  }

  // ถ้าหาทั้งประโยคไม่เจอ ลองใช้แค่ช่วงต้นของ quote
  let from = page.indexOf(target);
  let length = target.length;
  if (from === -1 && target.length > 24) {
    length = Math.max(12, Math.floor(target.length * 0.5));
    from = page.indexOf(target.slice(0, length));
  }
  if (from === -1) return hits;

  const to = from + length;
  let first = -1;
  let last = -1;
  items.forEach((_, i) => {
    const start = starts[i];
    const end = i + 1 < starts.length ? starts[i + 1] : page.length;
    if (end > start && start < to && end > from) {
      if (first === -1) first = i;
      last = i;
    }
  });
  // รวมชิ้นเล็ก ๆ ที่ไม่มีพยัญชนะ (ตัวเลข สระลอย ช่องว่าง) ที่อยู่ระหว่างกลางด้วย ไม่ให้ highlight ขาดเป็นท่อน
  for (let i = first; first !== -1 && i <= last; i++) hits.add(i);
  return hits;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** customTextRenderer ของ react-pdf: ครอบชิ้นข้อความที่อยู่ใน quote ด้วย <mark> */
export function makeHighlighter(hits: Set<number>) {
  return ({ str, itemIndex }: { str: string; itemIndex: number }) =>
    hits.has(itemIndex) ? `<mark class="cite-mark">${escapeHtml(str)}</mark>` : escapeHtml(str);
}
