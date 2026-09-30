"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import { fileUrl } from "@/lib/api";
import { findQuoteItems, makeHighlighter } from "@/lib/citations";
import type { ActiveCitation } from "@/lib/types";

// worker ถูกคัดลอกไป public/ ตอนเริ่ม dev server (scripts/copy-pdf-worker.mjs)
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export default function PdfViewer({ citation }: { citation: ActiveCitation }) {
  const [page, setPage] = useState(citation.page);
  const [numPages, setNumPages] = useState(0);
  const [width, setWidth] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hits, setHits] = useState<Set<number>>(new Set());
  const bodyRef = useRef<HTMLDivElement>(null);

  // เปลี่ยน citation (หรือคลิกซ้ำ) → กระโดดไปหน้าที่อ้างอิง
  useEffect(() => {
    setPage(citation.page);
  }, [citation.nonce, citation.page]);

  useEffect(() => {
    setLoadError(null);
  }, [citation.doc_id]);

  // ล้าง highlight เดิมทุกครั้งที่เปลี่ยนหน้า รอให้ text ของหน้าใหม่โหลดก่อน
  useEffect(() => {
    setHits(new Set());
  }, [page, citation.nonce]);

  // ให้หน้ากว้างพอดี panel
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width) - 48));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const file = useMemo(() => fileUrl(citation.doc_id), [citation.doc_id]);
  const onCitedPage = page === citation.page;
  const renderText = useMemo(() => makeHighlighter(hits), [hits]);

  const scrollToMark = () => {
    const mark = bodyRef.current?.querySelector("mark.cite-mark");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    mark?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div className="viewer-frame">
      <div className="viewer-bar">
        <div className="viewer-file">
          <span className="viewer-filename">{citation.filename}</span>
          {onCitedPage ? (
            <span className="viewer-note">หน้าที่อ้างอิงใน [{citation.id}]</span>
          ) : (
            <button className="link" onClick={() => setPage(citation.page)}>
              กลับไปหน้าที่อ้างอิง ({citation.page})
            </button>
          )}
        </div>
        <div className="pager">
          <button
            className="btn btn-quiet btn-small"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            aria-label="หน้าก่อนหน้า"
          >
            ก่อนหน้า
          </button>
          <span className="pager-count">
            {page} / {numPages || "–"}
          </span>
          <button
            className="btn btn-quiet btn-small"
            onClick={() => setPage((p) => Math.min(numPages || p, p + 1))}
            disabled={!numPages || page >= numPages}
            aria-label="หน้าถัดไป"
          >
            ถัดไป
          </button>
        </div>
      </div>

      <div className="viewer-body" ref={bodyRef}>
        {loadError ? (
          <div className="viewer-empty">
            <p>เปิด {citation.filename} ไม่ได้: {loadError}</p>
          </div>
        ) : (
          <Document
            file={file}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            onLoadError={(err) => setLoadError(err.message)}
            loading={<div className="viewer-empty">กำลังเปิดเอกสาร</div>}
          >
            {width > 0 && (
              <Page
                key={`${citation.doc_id}-${page}-${citation.nonce}`}
                pageNumber={page}
                width={Math.min(width, 900)}
                customTextRenderer={renderText}
                onGetTextSuccess={({ items }) =>
                  setHits(
                    findQuoteItems(
                      items.map((item) => ("str" in item ? item.str : "")),
                      onCitedPage ? citation.quote : undefined,
                    ),
                  )
                }
                onRenderTextLayerSuccess={scrollToMark}
                className="pdf-page"
              />
            )}
          </Document>
        )}
      </div>
    </div>
  );
}
