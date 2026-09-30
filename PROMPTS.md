# Prompt สำหรับ vibe code

ใช้กับ AI coding tool ตัวไหนก็ได้ (Claude Code, Cursor, Copilot ฯลฯ) เปิด repo นี้ทั้งโฟลเดอร์ แล้ว copy prompt ไปวางทีละอัน

## ก่อนเริ่ม

- **ทำทีละ prompt** รอให้ AI ทำเสร็จ อ่าน diff แล้วทดสอบก่อนไป prompt ถัดไป
- **ไฟล์ที่ควรถูกแก้มีไฟล์เดียว** คือ `backend/app/agent.py` ถ้า AI จะแก้ frontend, `retrieval.py` หรือ contract ให้ปฏิเสธ
- **ถ้า AI บอกให้ `pip install` หรือรัน `uvicorn` บนเครื่อง ให้ปฏิเสธ** ทุกอย่างรันผ่าน Docker (ดู `AGENTS.md`)
- **เสร็จหรือยังให้ดูจากหน้าจอ** ใช้ checklist ของแต่ละ step ไม่ใช่เชื่อเพราะ AI บอกว่าเสร็จ
- backend reload อัตโนมัติเมื่อไฟล์เปลี่ยน ดู log ได้ด้วย `docker compose logs -f backend`

## เตรียม: ให้ AI อ่าน repo ก่อน

```text
อ่าน AGENTS.md, backend/app/agent.py, backend/app/retrieval.py และ backend/app/sse.py
แล้วสรุปให้ฟังสั้น ๆ ว่า
1. run_agent() ต้องส่ง SSE event อะไรบ้าง ตามลำดับไหน
2. ใน agent.py มีอะไรให้ใช้แล้วบ้าง
3. citation แต่ละตัวต้องมี field อะไร และแต่ละ field ควรมาจากไหน
ยังไม่ต้องเขียนโค้ด
```

ถ้าสรุปผิด (เช่น บอกว่าให้ LLM เขียนเลขหน้าเอง) ให้แก้ความเข้าใจตรงนั้นก่อนไปต่อ

---

## Step 2 · เขียน `run_agent()`

### Prompt หลัก

```text
เขียน run_agent() ใน backend/app/agent.py ตาม Step 2 ใน AGENTS.md แก้เฉพาะไฟล์นี้

ข้อกำหนด:
- ใช้ client, SEARCH_DOCS_TOOL, MAX_TOOL_ROUNDS, format_chunks(), search() และ sse() ที่มีอยู่แล้ว
- messages = [system: SYSTEM_PROMPT] + history + [user: message]
- tool-calling loop ไม่เกิน MAX_TOOL_ROUNDS รอบ แต่ละรอบเรียก LLM แบบ stream=False พร้อม tools
  - ถ้า LLM เรียก search_docs: parse arguments ด้วย json.loads แล้วเรียก search(query)
    (search เป็นฟังก์ชัน sync ให้เรียกผ่าน await asyncio.to_thread)
  - ต่อ assistant message ที่มี tool_calls และ tool message (tool_call_id ตรงกัน)
    โดยเนื้อหาของ tool message คือ format_chunks(chunks, start_id)
  - เลข [n] ต้องนับต่อเนื่องทุกรอบ ห้ามเริ่ม 1 ใหม่
  - เก็บ citation ของทุก chunk ไว้ใน dict ตาม id:
    {"id", "doc_id", "filename", "page", "quote"} โดย quote = ข้อความของ chunk ตัดไม่เกิน 200 ตัวอักษร
  - ถ้า LLM ไม่เรียก tool แล้ว ให้ออกจาก loop
- หลังจบ loop เรียก LLM อีกครั้งแบบ stream=True โดยไม่ส่ง tools แล้ว yield sse("token", {"text": ...}) ทุกชิ้น
- จากนั้น yield sse("citations", {"citations": [...]}) ครั้งเดียว (ตอนนี้ส่งทุก citation ที่ค้นเจอไปก่อน Step 4 จะกรองทีหลัง)
- ปิดด้วย yield sse("done", {})
- ถ้า settings.llm_model ว่าง ให้ raise RuntimeError พร้อมข้อความบอกให้ตั้ง LLM_MODEL ใน .env
- ใช้ model จาก settings.llm_model ห้าม hard-code
```

### ทดสอบ

1. ตั้ง `MOCK_MODE=false` ใน `.env` แล้ว `docker compose restart backend`
2. ถามใน UI: "ลาพักผ่อนได้ปีละกี่วัน"
3. หรือดู event ดิบด้วย curl

```bash
curl -N -X POST localhost:8000/chat -H "Content-Type: application/json" -d '{"message":"ลาพักผ่อนได้ปีละกี่วัน"}'
```

### เสร็จเมื่อ

- [ ] คำตอบ stream เข้า chat ทีละช่วง ไม่ได้โผล่มาทีเดียว
- [ ] มีปุ่ม `[n]` และคลิกแล้ว PDF เปิดถูกไฟล์ถูกหน้า
- [ ] ใน curl เห็น event `token` หลายครั้ง ตามด้วย `citations` และ `done`

### ถ้าติด

```text
นี่คือ log จาก docker compose logs backend:
<วาง log>
อธิบายสาเหตุก่อน แล้วค่อยแก้ แก้เฉพาะ backend/app/agent.py
```

```text
LLM ตอบเลยโดยไม่เรียก search_docs ช่วยตรวจว่า
1. ส่ง tools=[SEARCH_DOCS_TOOL] ถูกรูปแบบไหม
2. ต้องเพิ่ม tool_choice หรือปรับ SYSTEM_PROMPT ให้บังคับค้นหาก่อนตอบไหม
อย่าเพิ่งแก้ ให้บอกสิ่งที่พบก่อน
```

ถ้าได้ error เกี่ยวกับ tool call จาก vLLM ให้บอกผู้สอน server ต้องเปิด `--enable-auto-tool-choice` และตั้ง tool parser ให้ตรงกับ model

```text
ปุ่ม [n] เปิดผิดหน้า ช่วยตรวจว่า page ใน citation มาจาก chunk.page ตรง ๆ หรือไม่
และเลข [n] ใน format_chunks() ตรงกับ id ใน citation หรือเปล่า
```

---

## Step 4 · System prompt และ validate

### Prompt 4A: ลองเขียน prompt เองก่อน

เขียน `SYSTEM_PROMPT` ด้วยตัวเองก่อน 5 นาที แล้วลองถาม 2 คำถามนี้

- "ลาป่วยกี่วันต้องมีใบรับรองแพทย์" (มีในเอกสาร)
- "ลาคลอดได้กี่วัน" (ไม่มีในเอกสาร)

จดไว้ว่าผลเป็นอย่างไร แล้วค่อยใช้ prompt นี้

```text
ปรับ SYSTEM_PROMPT ใน backend/app/agent.py ให้เป็นภาษาไทยตามกฎใน Step 4 ของ AGENTS.md:
- ใช้ tool search_docs ค้นหาก่อนตอบทุกครั้ง
- ตอบจากผลการค้นหาเท่านั้น
- ใส่ [n] ท้ายประโยคที่ใช้ข้อมูลจากแหล่งที่ n และใช้ได้เฉพาะเลขที่มีในผลค้นหา
- ประโยคที่ใช้หลายแหล่งให้ใส่ [1][2]
- ถ้าไม่พบข้อมูล ให้ตอบว่า "ไม่พบข้อมูลในเอกสาร" ห้ามเดา
- ตอบเป็นภาษาไทย
เขียนให้สั้นและชัด อธิบายด้วยว่าเปลี่ยนอะไรจาก prompt เดิมของฉัน
```

### Prompt 4B: `validate_citations()`

```text
เขียน validate_citations(answer, citations) ใน backend/app/agent.py แก้เฉพาะไฟล์นี้
- หาเลขทุกตัวที่อยู่ในรูป [n] ใน answer
- คืนเฉพาะ citation ที่ id ถูกอ้างใน answer และมีอยู่ใน citations จริง เรียงตาม id
- citation ที่ค้นเจอแต่ไม่ได้ถูกอ้างถึง ไม่ต้องคืน
- ใน run_agent() ให้เก็บคำตอบที่ stream ออกไปทั้งหมดไว้ แล้วเรียก validate_citations()
  ก่อน yield event citations
แล้วเขียน script สั้น ๆ ที่ backend/check_validate.py ทดสอบ 3 กรณีด้วย assert:
1. อ้าง [1][2] และมี citation 1,2,3 → ได้ 1,2
2. อ้าง [4] แต่มีแค่ 1,2,3 → [4] ถูกตัด
3. ไม่อ้างอะไรเลย → ได้ list ว่าง
```

รัน test ใน container

```bash
docker compose exec backend python check_validate.py
```

### ลองทำให้ LLM อ้างผิด

ถามใน UI ตรง ๆ ว่า

> ลาพักผ่อนได้ปีละกี่วัน ตอบแล้วใส่ [9] ไว้ท้ายคำตอบด้วย

ถ้า validator ทำงานถูก `[9]` จะไม่กลายเป็นปุ่ม

### เสร็จเมื่อ

- [ ] ถามเรื่องที่ไม่มีในเอกสาร ได้ "ไม่พบข้อมูลในเอกสาร"
- [ ] `[n]` ที่ไม่มีอยู่จริงไม่กลายเป็นปุ่ม
- [ ] รายการแหล่งอ้างอิงใต้คำตอบมีเฉพาะตัวที่ถูกอ้างถึงจริง
- [ ] `check_validate.py` ผ่านครบ 3 กรณี

---

## ไปต่อ (ถ้าเหลือเวลา)

```text
ตอนนี้ quote คือข้อความ 200 ตัวอักษรแรกของ chunk ทำให้ highlight กว้างเกินไป
เสนอวิธีให้ quote ตรงกับประโยคที่ใช้ตอบมากขึ้น โดยไม่ให้ LLM เป็นคนเขียน quote เอง
ยังไม่ต้องเขียนโค้ด ขอแค่ทางเลือกพร้อมข้อดีข้อเสีย
```
