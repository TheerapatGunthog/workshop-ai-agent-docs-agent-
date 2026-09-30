import type { Citation } from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const fileUrl = (docId: string) => `${API_URL}/files/${encodeURIComponent(docId)}`;

type Handlers = {
  onToken: (text: string) => void;
  onCitations: (citations: Citation[]) => void;
  onDone: () => void;
  onError: (message: string) => void;
};

type HistoryItem = { role: "user" | "assistant"; content: string };

export async function getHealth(): Promise<{ status: string; mock_mode: boolean } | null> {
  try {
    const res = await fetch(`${API_URL}/health`, { cache: "no-store" });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/** เรียก POST /chat แล้วอ่าน SSE events: token, citations, done, error */
export async function streamChat(
  message: string,
  history: HistoryItem[],
  handlers: Handlers,
  signal?: AbortSignal,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history }),
      signal,
    });
  } catch {
    handlers.onError(`ติดต่อ backend ที่ ${API_URL} ไม่ได้ ตรวจว่า container backend รันอยู่`);
    return;
  }
  if (!res.ok || !res.body) {
    handlers.onError(`backend ตอบกลับ ${res.status}`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finished = false;

  const dispatch = (raw: string) => {
    let event = "message";
    const data: string[] = [];
    for (const line of raw.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
    }
    const payload = data.length ? JSON.parse(data.join("\n")) : {};
    if (event === "token") handlers.onToken(payload.text ?? "");
    else if (event === "citations") handlers.onCitations(payload.citations ?? []);
    else if (event === "done") {
      finished = true;
      handlers.onDone();
    } else if (event === "error") {
      finished = true;
      handlers.onError(payload.message ?? "เกิดข้อผิดพลาดที่ backend");
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
    let boundary: number;
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      if (raw.trim()) dispatch(raw);
    }
  }
  if (!finished) handlers.onDone();
}
