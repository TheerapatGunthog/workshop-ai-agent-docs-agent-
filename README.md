# Docs Agent Workshop — starter repo

Docs agent ที่ตอบคำถามจาก PDF พร้อม citation `[n]` คลิกแล้วเปิด PDF ไปหน้าที่อ้างอิงและ highlight ข้อความ
Frontend ทำเสร็จแล้ว งานใน workshop คือเขียน agent ฝั่ง backend

## เริ่มต้น (ต้องใช้ Docker)

```bash
cp .env.example .env
docker compose up --build        # หรือ make up
```

เปิด http://localhost:3000 แล้วกดคำถามตัวอย่าง ตอนนี้ระบบอยู่ใน **Mock mode**
คำตอบมาจาก `contract/chat-response.json` จึงลองคลิก citation และดู PDF ได้ทันทีโดยยังไม่ต้องมี LLM

> Workshop นี้บังคับรันผ่าน Docker ถ้ารัน `uvicorn` หรือ `npm run dev` บนเครื่องโดยตรง โปรแกรมจะหยุดพร้อมบอกคำสั่งที่ถูกต้อง

## เปลี่ยนไปใช้ agent จริง

1. ใส่ค่าใน `.env`: `LLM_BASE_URL`, `LLM_MODEL`, `EMBED_MODEL` (และ `EMBED_BASE_URL` ถ้าแยกจาก LLM)
   LLM ที่รันบนเครื่องตัวเองให้ใช้ `http://host.docker.internal:<port>/v1` แทน `localhost`
2. Ingest PDF ใน `data/pdfs/` เข้า Qdrant
   ```bash
   docker compose run --rm backend python ingest.py      # หรือ make ingest
   ```
3. ตั้ง `MOCK_MODE=false` แล้ว `docker compose restart backend`
4. เขียน `backend/app/agent.py` ตาม Step 2 และ 4 โดยใช้ prompt ใน `PROMPTS.md`

ก่อนเขียน `run_agent()` เสร็จ UI จะแสดงข้อความว่ายังขาด step ไหน

## คำสั่งที่ใช้บ่อย

| ต้องการ | คำสั่ง |
| --- | --- |
| เปิดระบบ | `docker compose up --build` |
| ดู log backend | `docker compose logs -f backend` |
| รันคำสั่งใน backend | `docker compose exec backend <command>` |
| เพิ่ม Python package | แก้ `backend/requirements.txt` แล้ว `docker compose up --build backend` |
| เพิ่ม npm package | `docker compose exec frontend npm install <package>` แล้ว `docker compose up --build frontend` |
| ปิดระบบ | `docker compose down` |

Backend และ frontend reload อัตโนมัติเมื่อแก้โค้ด ไม่ต้อง restart

## โครงสร้าง

```
AGENTS.md / CLAUDE.md     context สำหรับ AI coding tool (contract, กฎ, acceptance criteria)
PROMPTS.md                prompt สำหรับ vibe code Step 2 และ 4 พร้อม checklist
contract/                 ตัวอย่าง response ที่ frontend คาดหวัง
data/pdfs/                PDF ที่ใช้ใน workshop (leave-handbook.pdf เป็นเอกสารสมมติ)
backend/
  app/agent.py            ← ส่วนที่ต้องเขียน (Step 2, Step 4)
  app/retrieval.py        search() พร้อมใช้
  app/main.py             /health /documents /files/{doc_id} /chat
  app/mock.py             Mock mode
  ingest.py               PDF → chunks (+ doc_id, page) → Qdrant
frontend/
  components/Answer.tsx   แปลง [n] เป็นปุ่ม citation
  components/PdfViewer.tsx  react-pdf + กระโดดหน้า + highlight
  lib/citations.ts        parse [n] และหา quote ในหน้า PDF
  lib/api.ts              อ่าน SSE จาก /chat
```

## ปัญหาที่รู้แล้ว: text layer ของ PDF ภาษาไทย

pdf.js มักอ่านข้อความไทยจาก PDF ได้เพี้ยน เช่น "ได้" กลายเป็น "ได1", "สิทธิ" กลายเป็น "สำทธ"
หรือสระถูกแยกเป็น control character การค้นหา quote แบบตรงตัวจึงไม่เจอ
`lib/citations.ts` แก้ด้วยการเทียบเฉพาะ "โครงพยัญชนะ" (ก–ฮ) ของทั้งสองฝั่ง ซึ่งแทบไม่เพี้ยน
ถ้าหาไม่เจอจริง ๆ viewer ยังเปิดถูกหน้าเสมอ แค่ไม่มี highlight

ฝั่ง ingest (PyMuPDF) ก็เจอปัญหาคล้ายกันคือสระซ้ำ เช่น "พนัักงาน" จึงผ่าน `clean_thai()` ใน `app/textnorm.py` ก่อนเก็บ
