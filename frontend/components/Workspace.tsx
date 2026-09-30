"use client";

import { useEffect, useState } from "react";
import ChatPanel from "./ChatPanel";
import PdfPane from "./PdfPane";
import { getHealth } from "@/lib/api";
import type { ActiveCitation, Citation } from "@/lib/types";

type Health = { status: string; mock_mode: boolean } | null | "loading";

export default function Workspace() {
  const [active, setActive] = useState<ActiveCitation | null>(null);
  const [health, setHealth] = useState<Health>("loading");

  useEffect(() => {
    getHealth().then(setHealth);
  }, []);

  const openCitation = (citation: Citation) =>
    setActive({ ...citation, nonce: Date.now() });

  return (
    <div className="shell">
      <header className="topbar">
        <h1 className="brand">ถามเอกสาร</h1>
        <BackendStatus health={health} />
      </header>
      <main className="split">
        <ChatPanel activeId={active ? `${active.doc_id}:${active.id}` : null} onOpenCitation={openCitation} />
        <PdfPane citation={active} />
      </main>
    </div>
  );
}

function BackendStatus({ health }: { health: Health }) {
  if (health === "loading") return <span className="status">กำลังตรวจ backend</span>;
  if (!health) return <span className="status status-bad">backend ไม่ตอบ</span>;
  return (
    <span className={`status ${health.mock_mode ? "status-mock" : "status-live"}`}>
      {health.mock_mode ? "Mock mode: ตอบจาก contract" : "Agent mode: ตอบจาก LLM"}
    </span>
  );
}
