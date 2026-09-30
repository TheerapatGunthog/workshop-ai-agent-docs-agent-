// ต้องตรงกับ contract/chat-response.json — ห้ามเปลี่ยน shape
export type Citation = {
  id: number;
  doc_id: string;
  filename: string;
  page: number; // 1-based
  quote: string;
};

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  status: "streaming" | "done" | "error";
  error?: string;
};

// citation ที่ถูกเปิดอยู่ใน viewer (nonce ทำให้คลิกซ้ำแล้ว scroll ใหม่ได้)
export type ActiveCitation = Citation & { nonce: number };
