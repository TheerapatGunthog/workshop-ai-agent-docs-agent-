"use client";

import { citationMap, parseAnswer } from "@/lib/citations";
import type { Citation, Message } from "@/lib/types";

type Props = {
  message: Message;
  activeId: string | null;
  onOpenCitation: (c: Citation) => void;
};

export default function Answer({ message, activeId, onOpenCitation }: Props) {
  const map = citationMap(message.citations);
  const streaming = message.status === "streaming";
  const isActive = (c: Citation) => activeId === `${c.doc_id}:${c.id}`;

  return (
    <>
      <p className="answer">
        {parseAnswer(message.content).map((part, i) => {
          if (part.kind === "text") return <span key={i}>{part.text}</span>;
          const c = map.get(part.id);
          if (c) {
            return (
              <button
                key={i}
                className={`cite${isActive(c) ? " cite-active" : ""}`}
                onClick={() => onOpenCitation(c)}
                title={`${c.filename} หน้า ${c.page}`}
                aria-label={`เปิดแหล่งอ้างอิง ${c.id}: ${c.filename} หน้า ${c.page}`}
              >
                {c.id}
              </button>
            );
          }
          // ระหว่าง stream citations ยังมาไม่ถึง แสดง marker ไว้ก่อน
          // หลังจบแล้วยังไม่มีใน citations แปลว่าถูก validate ตัดทิ้ง จึงไม่แสดง
          return streaming ? (
            <span key={i} className="cite-pending">
              {part.raw}
            </span>
          ) : null;
        })}
        {streaming && <span className="caret" aria-hidden />}
      </p>

      {message.status === "error" && <p className="answer-error">{message.error}</p>}

      {message.citations.length > 0 && (
        <ol className="sources" aria-label="แหล่งอ้างอิง">
          {message.citations.map((c) => (
            <li key={c.id}>
              <button
                className={`source${isActive(c) ? " source-active" : ""}`}
                onClick={() => onOpenCitation(c)}
              >
                <span className="source-id">{c.id}</span>
                <span className="source-name">{c.filename}</span>
                <span className="source-page">หน้า {c.page}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
