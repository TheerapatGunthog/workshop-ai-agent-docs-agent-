// คัดลอก pdf.js worker ไปไว้ใน public/ ให้ตรงกับเวอร์ชัน pdfjs-dist ที่ติดตั้งจริง
// (bundle worker ผ่าน webpack ของ Next 14 แล้ว Terser พัง จึงเสิร์ฟเป็นไฟล์ static แทน)
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const pdfjsDir = dirname(require.resolve("pdfjs-dist/package.json"));
mkdirSync("public", { recursive: true });
copyFileSync(join(pdfjsDir, "build", "pdf.worker.min.mjs"), join("public", "pdf.worker.min.mjs"));
