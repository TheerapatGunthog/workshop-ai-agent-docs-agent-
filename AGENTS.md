# AGENTS.md — context สำหรับ AI coding tool

อ่านไฟล์นี้ก่อนแก้โค้ดทุกครั้ง ข้อกำหนดตรงนี้สำคัญกว่าค่า default ของ tool

## โปรเจกต์นี้คืออะไร

Docs agent ตัวเดียว (single agent) ที่ตอบคำถามจาก PDF ด้วย RAG และแนบ citation `[n]`
ที่คลิกแล้วเปิด PDF ไปหน้าที่อ้างอิงพร้อม highlight

- `frontend/` Next.js 14 (App Router) + react-pdf — **ทำเสร็จแล้ว**
- `backend/` FastAPI — ส่วนที่ต้องเขียนคือ `backend/app/agent.py`
- `contract/chat-response.json` ตัวอย่าง response ที่ frontend คาดหวัง

## กฎบังคับ

1. **รันทุกอย่างผ่าน Docker เท่านั้น** ห้ามแนะนำ `pip install`, `uvicorn`, `npm run dev` บนเครื่อง
   - เริ่มระบบ: `docker compose up --build`
   - รันคำสั่งใน backend: `docker compose exec backend <command>`
   - เพิ่ม Python package: แก้ `backend/requirements.txt` แล้ว `docker compose up --build backend`
   - ingest PDF: `docker compose run --rm backend python ingest.py`
2. **ห้ามเปลี่ยน shape ของ citation contract** (ด้านล่าง)
3. **ห้ามแก้** `backend/app/retrieval.py`, `backend/ingest.py`, `contract/`, และ `frontend/` เว้นแต่ผู้ใช้สั่งตรง ๆ
4. ใช้ `openai` SDK ที่ชี้ไป `LLM_BASE_URL` (OpenAI-compatible) ห้ามเพิ่ม framework agent อื่น
5. อ่านค่าจาก `app/config.py` (`settings`) ห้าม hard-code URL หรือชื่อ model

## Citation contract

```json
{
  "answer": "ข้อความคำตอบ พร้อม marker [1] [2]",
  "citations": [
    { "id": 1, "doc_id": "leave-handbook", "filename": "leave-handbook.pdf", "page": 2, "quote": "ข้อความจาก chunk" }
  ]
}
```

- `answer` มาจาก LLM ส่วนทุก field ใน `citations` มาจากผลของ `search()` **ห้ามให้ LLM แต่งเลขหน้าหรือชื่อไฟล์**
- `page` เป็น **1-based**
- `id` ของ citation ต้องต่อเนื่องทั้งคำถาม ถ้าเรียก tool หลายรอบห้ามเริ่มนับ 1 ใหม่

## SSE ที่ `POST /chat` ต้องส่ง (ใช้ `sse()` จาก `app/sse.py`)

| event | data | เมื่อไร |
| --- | --- | --- |
| `token` | `{"text": "..."}` | หลายครั้งระหว่าง stream คำตอบ |
| `citations` | `{"citations": [Citation]}` | ครั้งเดียว หลัง validate แล้ว |
| `done` | `{}` | จบคำตอบ |
| `error` | `{"message": "..."}` | เกิดข้อผิดพลาด (main.py จัดการให้แล้ว) |

Frontend สร้างปุ่มเฉพาะ `[n]` ที่มีอยู่ใน event `citations` เท่านั้น

## งานของ workshop

### Step 2 · `run_agent()` ใน `backend/app/agent.py`
Tool-calling loop: ส่ง messages + `SEARCH_DOCS_TOOL` ให้ LLM → ถ้ามี tool call ให้เรียก `search()`
แล้วส่งผลกลับด้วย `format_chunks()` → วนจนไม่มี tool call (ไม่เกิน `MAX_TOOL_ROUNDS`)
→ stream คำตอบสุดท้ายเป็น event `token` → ส่ง `citations` → `done`

เสร็จเมื่อ: ตั้ง `MOCK_MODE=false` แล้วถามคำถามใน UI ได้คำตอบจริง และปุ่ม `[n]` เปิดไฟล์/หน้าที่ถูกต้อง

### Step 4 · `SYSTEM_PROMPT` และ `validate_citations()`
- prompt สั่งให้ตอบจากผลค้นหาเท่านั้น ใส่ `[n]` ท้ายประโยค ใช้เฉพาะเลขที่มีในผลค้นหา
  ถ้าไม่พบให้ตอบว่า "ไม่พบข้อมูลในเอกสาร" และตอบเป็นภาษาไทย
- `validate_citations()` คืนเฉพาะ citation ที่ถูกอ้างถึงใน answer จริง

เสร็จเมื่อ: ถามเรื่องที่ไม่มีในเอกสารแล้วได้ "ไม่พบข้อมูลในเอกสาร" และไม่มีปุ่ม citation ที่ชี้ไปที่ไม่มีอยู่จริง
