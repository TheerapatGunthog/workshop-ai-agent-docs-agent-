"use client";

import { useEffect, useRef, useState } from "react";
import Answer from "./Answer";
import { streamChat } from "@/lib/api";
import type { Citation, Message } from "@/lib/types";

const SUGGESTIONS = [
  "ลาพักผ่อนได้ปีละกี่วัน และสะสมได้ไหม",
  "ลาป่วยกี่วันถึงต้องมีใบรับรองแพทย์",
  "ต้องยื่นคำขอลาล่วงหน้ากี่วัน",
];

const newId = () => Math.random().toString(36).slice(2);

type Props = {
  activeId: string | null;
  onOpenCitation: (c: Citation) => void;
};

export default function ChatPanel({ activeId, onOpenCitation }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const patch = (id: string, fn: (m: Message) => Message) =>
    setMessages((prev) => prev.map((m) => (m.id === id ? fn(m) : m)));

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;

    const history = messages
      .filter((m) => m.status === "done")
      .map((m) => ({ role: m.role, content: m.content }));
    const userMsg: Message = { id: newId(), role: "user", content: question, citations: [], status: "done" };
    const botId = newId();
    const botMsg: Message = { id: botId, role: "assistant", content: "", citations: [], status: "streaming" };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput("");
    setBusy(true);
    abortRef.current = new AbortController();

    await streamChat(
      question,
      history,
      {
        onToken: (t) => patch(botId, (m) => ({ ...m, content: m.content + t })),
        onCitations: (citations) => patch(botId, (m) => ({ ...m, citations })),
        onDone: () => patch(botId, (m) => ({ ...m, status: "done" })),
        onError: (error) => patch(botId, (m) => ({ ...m, status: "error", error })),
      },
      abortRef.current.signal,
    ).catch((err: unknown) => {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      patch(botId, (m) => ({
        ...m,
        status: aborted ? "done" : "error",
        error: aborted ? undefined : String(err),
      }));
    });
    setBusy(false);
  }

  return (
    <section className="chat" aria-label="บทสนทนา">
      <div className="chat-log" ref={listRef}>
        {messages.length === 0 ? (
          <div className="chat-empty">
            <p className="chat-empty-title">ถามอะไรก็ได้เกี่ยวกับเอกสารในระบบ</p>
            <p className="chat-empty-hint">
              คำตอบจะมีเลขอ้างอิงแบบนี้ <span className="cite-demo">1</span> คลิกเพื่อเปิดหน้าเอกสารที่ใช้ตอบ
            </p>
            <div className="suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="suggestion" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="msg msg-user">
                {m.content}
              </div>
            ) : (
              <div key={m.id} className="msg msg-bot">
                <Answer message={m} activeId={activeId} onOpenCitation={onOpenCitation} />
              </div>
            ),
          )
        )}
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <textarea
          className="composer-input"
          value={input}
          rows={2}
          placeholder="พิมพ์คำถาม แล้วกด Enter"
          aria-label="คำถาม"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send(input);
            }
          }}
        />
        {busy ? (
          <button type="button" className="btn btn-quiet" onClick={() => abortRef.current?.abort()}>
            หยุด
          </button>
        ) : (
          <button type="submit" className="btn" disabled={!input.trim()}>
            ถาม
          </button>
        )}
      </form>
    </section>
  );
}
