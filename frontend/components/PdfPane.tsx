"use client";

import dynamic from "next/dynamic";
import type { ActiveCitation } from "@/lib/types";

// pdf.js ใช้ API ของ browser เท่านั้น จึงต้องปิด SSR
const PdfViewer = dynamic(() => import("./PdfViewer"), {
  ssr: false,
  loading: () => <div className="viewer-empty">กำลังโหลดตัวแสดง PDF</div>,
});

export default function PdfPane({ citation }: { citation: ActiveCitation | null }) {
  return (
    <section className="viewer" aria-label="เอกสารอ้างอิง">
      {citation ? (
        <PdfViewer citation={citation} />
      ) : (
        <div className="viewer-empty">
          <div className="viewer-empty-sheet" aria-hidden>
            <span />
            <span />
            <mark />
            <span />
          </div>
          <p>คลิกเลขอ้างอิงในคำตอบ เพื่อเปิดหน้าเอกสารที่ใช้ตอบ</p>
        </div>
      )}
    </section>
  );
}
