# Prompt สั่งงาน AI แบบรอบเดียวจบ: Workshop 1 → Workshop 2

ใช้กับ AI coding agent ที่รันคำสั่งเองได้ (Antigravity, Claude Code ฯลฯ) เปิด repo แล้ว copy prompt ของ step นั้นไปวางทั้งก้อน prompt แต่ละอันระบุครบทั้งงาน ข้อห้าม วิธีทดสอบ และเงื่อนไขว่าเสร็จ จึงไม่ต้องแก้หรือสั่งเพิ่ม


| Workshop | Step                               | Prompt              |
| -------- | ---------------------------------- | ------------------- |
| 1        | Step 2 · run\_agent()              | [W1-S2](#w1-s2)     |
| 1        | Step 4 · SYSTEM\_PROMPT + validate | [W1-S4](#w1-s4)     |
| —        | เตรียม workshop 2                  | [W2-PREP](#w2-prep) |
| 2        | Step 1 · Agentic RAG               | [W2-S1](#w2-s1)     |
| 2        | Step 2 · MCP client                | [W2-S2](#w2-s2)     |
| 2        | Step 3 · Memory                    | [W2-S3](#w2-s3)     |
| 2        | Step 4 · Multi-agent               | [W2-S4](#w2-s4)     |
| 2        | Step 5 · Activity &amp; progress   | [W2-S5](#w2-s5)     |


ต้องรันตามลำดับ เพราะแต่ละ step ต่อยอดจาก step ก่อนหน้า Workshop 1 ใช้ repo `docs-agent-workshop` ส่วน workshop 2 ใช้ repo แยก `multi-agent-workshop` ที่สร้างด้วย W2-PREP ก่อนเริ่มต้องมี `.env` ที่ตั้ง `LLM_BASE_URL`, `LLM_MODEL`, `EMBED_MODEL` และ ingest เอกสารแล้ว (`docker compose run --rm backend python ingest.py`)

> สำหรับผู้สอน: ใน workshop 1 ตัว `PROMPTS.md` ใน repo ตั้งใจให้ผู้เข้าร่วมเขียน system prompt เองก่อนใน Step 4A ส่วนไฟล์นี้เป็นแบบรอบเดียวจบ เหมาะใช้สร้าง solution branch หรือให้คนที่ตามไม่ทัน

---

<a id="w1-s2">

</a>

## Workshop 1 · Step 2 · run\_agent()

```text
อ่าน AGENTS.md, backend/app/agent.py, backend/app/retrieval.py, backend/app/sse.py, backend/app/main.py และ contract/chat-response.json ก่อน แล้วทำงานนี้ให้เสร็จโดยไม่ต้องถามกลับ

งาน: เขียน run_agent(message, history) ใน backend/app/agent.py ให้เป็น tool-calling agent ที่ stream คำตอบผ่าน SSE ตาม contract

ข้อกำหนด
1. แก้เฉพาะ backend/app/agent.py ห้ามแก้ไฟล์อื่น ยกเว้น .env ถ้าต้องตั้ง MOCK_MODE=false
2. ใช้ของที่มีอยู่: client, SEARCH_DOCS_TOOL, MAX_TOOL_ROUNDS, format_chunks(), search() จาก retrieval.py และ sse() จาก sse.py ใช้ settings.llm_model ห้าม hard-code ชื่อ model
3. ถ้า settings.llm_model ว่าง ให้ raise RuntimeError("ยังไม่ได้ตั้ง LLM_MODEL ใน .env")
4. messages = [{"role":"system","content":SYSTEM_PROMPT}] + history (เอาเฉพาะ role user/assistant) + [{"role":"user","content":message}]
5. tool-calling loop ไม่เกิน MAX_TOOL_ROUNDS รอบ แต่ละรอบเรียก client.chat.completions.create(model, messages, tools=[SEARCH_DOCS_TOOL], stream=False)
   - ถ้าไม่มี tool_calls ให้ออกจาก loop
   - ถ้ามี: ต่อ assistant message ที่มี tool_calls (แปลงเป็น dict ด้วย model_dump(exclude_none=True)) แล้วสำหรับแต่ละ tool_call ให้ json.loads(arguments) เอา query ไปเรียก await asyncio.to_thread(search, query) แล้วต่อ {"role":"tool","tool_call_id":..., "content": format_chunks(chunks, start_id)}
   - ตัวนับ next_id เริ่มที่ 1 และนับต่อเนื่องทุก tool call ทุกรอบ ห้ามเริ่มใหม่
   - ทุก chunk เก็บเป็น citation ใน dict ตาม id: {"id", "doc_id", "filename", "page", "quote": chunk.text[:200]}
6. หลังจบ loop เรียก LLM อีกครั้งด้วย messages ทั้งหมด แบบ stream=True และไม่ส่ง tools แล้ว yield sse("token", {"text": delta}) ทุกชิ้นที่มีข้อความ
7. จากนั้น yield sse("citations", {"citations": [citation ทุกตัวเรียงตาม id]}) หนึ่งครั้ง แล้ว yield sse("done", {})
8. ปล่อย validate_citations() ไว้ตามเดิม (Step 4 จะทำ)

ทดสอบ (รันเองทั้งหมด ถ้าไม่ผ่านให้แก้จนผ่าน)
- ตั้ง MOCK_MODE=false ใน .env แล้ว docker compose restart backend
- docker compose exec backend python -m py_compile app/agent.py
- curl -N -X POST localhost:8000/chat -H "Content-Type: application/json" -d '{"message":"ลาพักผ่อนได้ปีละกี่วัน"}'
  ต้องเห็น event token หลายครั้ง ตามด้วย citations ที่มี doc_id/page จริง และ done ปิดท้าย และไม่มี event error
- ถ้าได้ error เกี่ยวกับ tool call จาก LLM server ให้หยุดและรายงานว่าต้องเปิด tool calling ที่ vLLM อย่าแก้โค้ดเลี่ยง

เสร็จแล้วสรุป: ไฟล์ที่แก้, ผลของ curl แบบย่อ (จำนวน token event, citations ที่ได้)
```

---

<a id="w1-s4">

</a>

## Workshop 1 · Step 4 · SYSTEM\_PROMPT + validate\_citations()

```text
อ่าน AGENTS.md และ backend/app/agent.py ก่อน (run_agent() ทำงานได้แล้วจาก Step 2) แล้วทำงานนี้ให้เสร็จโดยไม่ต้องถามกลับ

งาน: ทำให้ agent อ้างอิงด้วย [n] อย่างถูกต้อง และตัด citation ที่ LLM แต่งขึ้นเอง

ข้อกำหนด
1. แก้เฉพาะ backend/app/agent.py และสร้างไฟล์ใหม่ backend/check_validate.py ได้ ห้ามแก้ไฟล์อื่น
2. แทนที่ SYSTEM_PROMPT ด้วยข้อความนี้ตรงตัว:
คุณคือผู้ช่วยตอบคำถามจากเอกสาร ใช้ tool search_docs ค้นหาข้อมูลก่อนตอบทุกครั้ง

กฎการอ้างอิง:
- ตอบโดยใช้ข้อมูลจากผลการค้นหาเท่านั้น
- ใส่ [n] ท้ายประโยคที่ใช้ข้อมูลจากแหล่งที่ n
- ใช้ได้เฉพาะเลขที่ปรากฏในผลการค้นหาเท่านั้น
- ถ้าประโยคใช้หลายแหล่ง ให้ใส่ [1][2]
- ถ้าไม่พบข้อมูลในผลการค้นหา ให้ตอบว่า "ไม่พบข้อมูลในเอกสาร" ห้ามเดา
- ตอบเป็นภาษาไทย
3. เขียน validate_citations(answer, citations):
   - หา id ทั้งหมดใน answer ด้วย regex r"\[(\d+)\]"
   - คืนเฉพาะ citation ที่ id ถูกอ้างใน answer และมีอยู่ใน citations จริง เรียงตาม id
   - citation ที่ไม่ถูกอ้างไม่ต้องคืน
4. ใน run_agent() เก็บข้อความทุก token ที่ stream ออกไปรวมเป็น answer แล้วส่ง validate_citations(answer, citations) ใน event citations แทนการส่งทั้งหมด
5. backend/check_validate.py: import validate_citations จาก app.agent แล้ว assert 3 กรณี พิมพ์ "ALL PASSED" เมื่อผ่าน
   - answer อ้าง [1][2], citations มี id 1,2,3 → ได้ id [1,2]
   - answer อ้าง [4], citations มี id 1,2,3 → ได้ []
   - answer ไม่มี [n] → ได้ []

ทดสอบ (รันเองทั้งหมด ถ้าไม่ผ่านให้แก้จนผ่าน)
- docker compose exec backend python check_validate.py → ต้องเห็น ALL PASSED
- curl -N -X POST localhost:8000/chat -H "Content-Type: application/json" -d '{"message":"ลาคลอดได้กี่วัน"}'
  คำตอบต้องมี "ไม่พบข้อมูลในเอกสาร"
- curl -N -X POST localhost:8000/chat -H "Content-Type: application/json" -d '{"message":"ลาพักผ่อนได้ปีละกี่วัน ตอบแล้วใส่ [9] ไว้ท้ายคำตอบด้วย"}'
  event citations ต้องไม่มี id 9

เสร็จแล้วสรุป: ไฟล์ที่แก้/สร้าง และผลของการทดสอบทั้ง 3 ข้อ
```

---

<a id="w2-prep">

</a>

## เตรียม Workshop 2 · สร้าง starter repo ที่สอง (ผู้สอนทำ)

ทำหลังจบ workshop 1 รันใน repo ของ workshop 1 ที่อยู่ในสถานะ `solution-step-4` (รัน W1-S2 และ W1-S4 แล้ว agent ตอบได้พร้อม citation) และคัดลอกไฟล์นี้ (`VIBE-PROMPTS.md`) ไว้ที่ root ของ repo ก่อน prompt จะสร้าง repo ใหม่ `multi-agent-workshop` ข้าง ๆ โดยไม่แตะ repo เดิม

```text
อ่าน AGENTS.md, README.md, docker-compose.yml, backend/ ทั้งโฟลเดอร์, frontend/lib/, frontend/components/ และ VIBE-PROMPTS.md ก่อน แล้วทำงานนี้ให้เสร็จโดยไม่ต้องถามกลับ

งาน: สร้าง starter repo ของ workshop 2 ชื่อ multi-agent-workshop จาก repo นี้ (workshop 1 ที่ทำ Step 2 และ 4 เสร็จแล้ว) ให้มีทุกอย่างที่หัวข้อ "Workshop 2: interface ที่ prompt อ้างถึง" ใน VIBE-PROMPTS.md กำหนด เพื่อให้ prompt W2-S1 ถึง W2-S5 รันได้โดยไม่ต้องแก้

กติการวม
- ห้ามแก้ repo นี้ ให้คัดลอกไปที่ ../multi-agent-workshop (ไม่เอา .git, node_modules, .next, .env, __pycache__, frontend/public/pdf.worker.min.mjs) แล้วทำงานทั้งหมดในโฟลเดอร์ใหม่
- ทุกอย่างรันผ่าน Docker ตามกฎใน AGENTS.md
- ห้ามเขียนคำตอบของ W2-S1 ถึง W2-S5 ลงในไฟล์รอเขียน ให้มีแค่ signature และ docstring
- ชื่อไฟล์ ฟังก์ชัน และ signature ต้องตรงตามที่ระบุด้านล่างทุกตัว

1. Docker และ config
   - docker-compose.yml: name: multi-agent-workshop, เพิ่ม service docs-mcp และ hr-mcp (build จาก mcp_servers/docs_mcp และ mcp_servers/hr_mcp) โดย backend depends_on ทั้งสอง
     docs-mcp ใช้ env_file .env (required: false) ตั้ง QDRANT_URL=http://qdrant:6333, PDF_DIR=/data/pdfs, mount ./data/pdfs:/data/pdfs:ro และมี extra_hosts host.docker.internal:host-gateway เหมือน backend
   - backend/Dockerfile เพิ่ม ENV PYTHONPATH=/app (script ใน backend/scripts ต้อง import app ได้)
   - backend/app/config.py เพิ่ม docs_mcp_url (default http://docs-mcp:8000/mcp) และ hr_mcp_url (default http://hr-mcp:8000/mcp) อ่านจาก env DOCS_MCP_URL, HR_MCP_URL
   - backend/requirements.txt เพิ่ม mcp แบบ pin เวอร์ชันที่ติดตั้งได้จริง
   - สร้าง backend/scripts/ (มี .gitkeep)

2. MCP servers (ใช้ FastMCP จาก mcp.server.fastmcp, transport streamable-http, host 0.0.0.0 port 8000, path /mcp)
   - mcp_servers/docs_mcp/: server.py, requirements.txt, Dockerfile (python:3.12-slim)
     tool search_docs(query: str, k: int = 5) -> list[dict] คืน {doc_id, filename, page, text, score} ใช้ logic เดียวกับ backend/app/retrieval.py (คัดลอกโค้ด embedding + Qdrant มา ห้าม import ข้าม container)
     tool get_page(doc_id: str, page: int) -> dict คืน {doc_id, filename, page, text} อ่านจาก PDF ด้วย pymupdf และผ่าน clean_thai (คัดลอกจาก backend/app/textnorm.py) page เป็น 1-based ตรวจ doc_id ด้วย regex ^[A-Za-z0-9_-]+$
     คำอธิบาย tool เขียนเป็นภาษาไทยให้ LLM เข้าใจว่าใช้เมื่อไร
   - mcp_servers/hr_mcp/: server.py, requirements.txt, Dockerfile
     tool leave_balance(employee_id: str) -> dict คืน {employee_id, annual_left, sick_used} จากข้อมูล mock E001–E005 (ตัวเลขต่างกันทุกคน) ถ้าไม่พบคืน {"employee_id": ..., "error": "ไม่พบพนักงานรหัสนี้"}
     ใส่ comment ว่าเป็นข้อมูลสมมติสำหรับ workshop

3. Backend ที่ทำไว้ให้ (เขียนให้เสร็จและมี test)
   - backend/app/registry.py: class CitationRegistry
     register(chunk) -> int รับ dict หรือ object ที่มี doc_id, filename, page, text; chunk ที่ (doc_id, page, text) เดิมได้ id เดิม; id เริ่มที่ 1
     get(cid) -> dict คืน {"id","doc_id","filename","page","quote": text 200 ตัวอักษรแรก}
     ids() -> set[int]
     validate(markdown) -> list[dict] หา [n] ด้วย regex r"\[(\d+)\]" คืน get() ของ id ที่ถูกอ้างและมีอยู่จริง เรียงตาม id
   - backend/check_registry.py: assert ทั้ง chunk ซ้ำได้ id เดิม, validate ตัด id ที่ไม่มี, ไม่ถูกอ้างไม่คืน พิมพ์ ALL PASSED
   - backend/app/events.py: class EventBus ใช้ asyncio.Queue ต่อ request
     async emit(event, data) ใส่ sse(event, data) ลง queue
     async activity(agent, task_id, kind, message) = emit("activity", {...})
     async progress(done, total, current_task) = emit("progress", {...})
     async close() ใส่ sentinel
     async stream() yield SSE string จนเจอ sentinel ถ้าไม่มี event 15 วินาทีให้ yield ": ping\n\n"
   - backend/check_events.py: ส่ง activity, progress แล้ว close แล้ว assert ว่า stream คืน 2 event ตามลำดับแล้วจบ พิมพ์ ALL PASSED

4. ไฟล์รอเขียน (signature + docstring ภาษาไทยบอกว่าเป็นงานของ step ไหน + raise NotImplementedError)
   - backend/app/research.py: async def run_research(task: dict, registry, bus=None) -> dict
   - backend/app/tools.py: class ToolHub (connect, openai_tools, call, close) และ async def get_tool_hub()
   - backend/app/memory.py: class ConversationMemory และ def get_memory(session_id: str)
   - backend/app/agents/__init__.py
   - backend/app/agents/planner.py: async def make_plan(message: str, context: list[dict]) -> dict
   - backend/app/agents/docs_writer.py: async def write_document(goal, outline, notes, registry) -> str และ async def write_answer(question, notes, registry) (async generator)
   - backend/app/agents/orchestrator.py: async def run(message: str, session_id: str, bus) -> None
   - คง backend/app/agent.py และ /chat เดิมของ workshop 1 ไว้ให้ทำงานได้ (W2-S3 และ W2-S4 จะเปลี่ยนเอง) ห้ามเพิ่ม session_id ใน ChatRequest ตอนนี้

5. Frontend (ใช้ design token และ class เดิมใน globals.css ห้ามเพิ่ม dependency)
   - lib/types.ts เพิ่ม type ของ plan, activity, progress, document
   - lib/api.ts: streamChat รองรับ handler เพิ่ม onPlan, onActivity, onProgress, onDocument (optional ไม่ส่งก็ไม่พัง) และส่ง session_id ใน body โดยสร้างครั้งเดียวต่อการเปิดหน้า (crypto.randomUUID)
   - components/ActivityPanel.tsx: แสดงเมื่อมี plan หรือ activity ของข้อความนั้น มี progress bar (done/total, current_task), รายการ task จาก plan แต่ละ task มีสถานะ รอ/กำลังทำ/เสร็จ/ไม่สำเร็จ และ timeline ของ activity ที่จัดกลุ่มตาม task_id (kind error เป็นสีแดง) พับเก็บได้
   - components/DocumentView.tsx: render markdown แบบพื้นฐานเอง (##, ###, ย่อหน้า, bullet, **ตัวหนา**) แปลง [n] เป็นปุ่ม citation แบบเดียวกับ Answer.tsx (เฉพาะ id ที่อยู่ใน citations) คลิกแล้วเปิด PDF viewer เดิม มีหัวเรื่องจาก title
   - ChatPanel/Answer: ข้อความของ assistant แสดง ActivityPanel ด้านบน ถ้าได้ event document ให้แสดง DocumentView แทนข้อความคำตอบ
   - ตรวจ type: docker compose exec frontend npx tsc --noEmit ต้องผ่าน

6. ข้อมูล
   - เพิ่ม PDF สมมติภาษาไทย 2 ไฟล์ใน data/pdfs: welfare-handbook.pdf (สวัสดิการ: ค่ารักษาผู้ป่วยนอกเบิกได้ปีละไม่เกิน 20,000 บาท, ค่ารักษาผู้ป่วยในตามจริงไม่เกิน 100,000 บาทต่อปี, ต้องแนบใบเสร็จและใบรับรองแพทย์, ตรวจสุขภาพประจำปีฟรี) และ expense-policy.pdf (ค่าเดินทางไปปฏิบัติงานกิโลเมตรละ 5 บาท, ค่าที่พักไม่เกินคืนละ 1,500 บาท, ยื่นเบิกภายใน 30 วัน, หัวหน้าอนุมัติภายใน 5 วันทำงาน) ไฟล์ละ 3–4 หน้า หน้าแรกบอกว่าเป็นเอกสารสมมติสำหรับ workshop
   - สร้างด้วย script backend/scripts/make_sample_pdfs.py ใช้ pymupdf.Story กับฟอนต์ Sarabun (ดาวน์โหลด Sarabun-Regular.ttf และ Sarabun-Bold.ttf จาก https://github.com/google/fonts/tree/main/ofl/sarabun ไปไว้ที่ backend/scripts/fonts พร้อมไฟล์ OFL.txt) เพื่อให้สระและวรรณยุกต์ไทยวางถูกตำแหน่ง
   - ตรวจ: เปิดทุกหน้าด้วย pymupdf แล้ว extract text ต้องเจอวลีหลักครบ และ render หน้าแรกเป็น PNG ไว้ที่ backend/scripts/preview/ ให้ผู้สอนดู

7. เอกสาร
   - AGENTS.md: เขียนใหม่สำหรับ workshop 2 คงกฎ Docker-only และหลัก citation มาจาก retrieval เพิ่ม contract ของ CitationRegistry, plan, research note และ SSE events (plan, activity, progress, document) พร้อมตารางว่าแต่ละ step แก้ไฟล์ไหนได้ และไฟล์ที่ห้ามแก้ (registry.py, events.py, mcp_servers/, frontend/)
   - PROMPTS.md: คัดลอกหัวข้อ "Workshop 2: interface ที่ prompt อ้างถึง" และ prompt W2-S1 ถึง W2-S5 จาก VIBE-PROMPTS.md มาทั้งหมดโดยไม่แก้เนื้อหา
   - README.md: วิธีเริ่ม (cp .env.example .env, docker compose up --build, docker compose run --rm backend python ingest.py) รายการ container และลำดับ step
   - .env.example เพิ่ม DOCS_MCP_URL, HR_MCP_URL (ค่า default) และคง MOCK_MODE=true

8. ตรวจทั้งหมด (รันเองทั้งหมด ถ้าไม่ผ่านให้แก้จนผ่าน)
   - cd ../multi-agent-workshop แล้ว cp .env ของ repo เดิมมาใช้ docker compose up -d --build แล้ว container ทั้ง 5 ตัวต้องรันอยู่
   - docker compose run --rm backend python ingest.py ต้อง ingest ครบ 3 ไฟล์
   - docker compose exec backend python check_registry.py และ python check_events.py ต้อง ALL PASSED
   - สร้าง backend/scripts/check_prep.py ที่ใช้ MCP Python SDK ต่อทั้งสอง server โดยตรง list_tools แล้วเรียก search_docs("ค่ารักษาพยาบาล") และ leave_balance("E001") แล้วพิมพ์ผล รันด้วย docker compose exec backend python scripts/check_prep.py ต้องได้ผลจากทั้งสอง server
   - curl -N -X POST localhost:8000/chat -H "Content-Type: application/json" -d '{"message":"ลาพักผ่อนได้ปีละกี่วัน"}' ต้องได้ token, citations, done ทั้งตอน MOCK_MODE=true และ false
   - docker compose exec frontend npx tsc --noEmit ต้องผ่าน และเปิด http://localhost:3000 ได้
   - ไฟล์รอเขียนทุกไฟล์ import ได้ (python -c "import app.research, app.tools, app.memory, app.agents.planner, app.agents.docs_writer, app.agents.orchestrator")
   - git init, commit ทั้งหมดเป็น "workshop 2 starter" บน branch main

เสร็จแล้วสรุป: โครงไฟล์ของ repo ใหม่, ผลของการตรวจทุกข้อ, และสิ่งที่ผู้สอนต้องตรวจเองด้วยตา (preview PDF และหน้าเว็บ)
```

---

## Workshop 2: interface ที่ prompt อ้างถึง

prompt ของ workshop 2 รันใน repo `multi-agent-workshop` ที่สร้างด้วย W2-PREP repo นั้นต้องมีสิ่งเหล่านี้ตามชื่อและ signature นี้ prompt จึงรันได้โดยไม่ต้องแก้

- `backend/app/registry.py` → `CitationRegistry` มี `register(chunk) -> int` (chunk มี doc\_id, filename, page, text; chunk เดิมได้ id เดิม), `get(cid) -> dict`, `ids() -> set[int]`, `validate(markdown) -> list[dict]`
- `backend/app/events.py` → `EventBus` มี `async emit(event, data)`, `async activity(agent, task_id, kind, message)`, `async progress(done, total, current_task)`, `async close()` และ `stream()` ที่คืน SSE string ต่อเนื่องจนปิด
- `settings.docs_mcp_url`, `settings.hr_mcp_url` ใน `config.py` และ MCP server 2 ตัวใน `docker-compose.yml` (Streamable HTTP)
  - docs-mcp: `search_docs(query: str, k: int = 5)` คืน list ของ `{doc_id, filename, page, text, score}`, `get_page(doc_id: str, page: int)`
  - hr-mcp: `leave_balance(employee_id: str)` คืน `{employee_id, annual_left, sick_used}`
- `frontend` รองรับ event `plan`, `activity`, `progress`, `document` และส่ง `session_id` มากับ `POST /chat`
- ไฟล์ว่างรอเขียน: `research.py`, `tools.py`, `memory.py`, `agents/planner.py`, `agents/orchestrator.py`, `agents/docs_writer.py`

---

<a id="w2-s1">

</a>

## Workshop 2 · Step 1 · Agentic RAG

```text
อ่าน AGENTS.md, backend/app/registry.py, backend/app/retrieval.py, backend/app/config.py และ backend/app/agent.py ก่อน แล้วทำงานนี้ให้เสร็จโดยไม่ต้องถามกลับ

งาน: เขียน backend/app/research.py เป็น Research agent แบบ agentic RAG ที่รับ task แล้วคืน research note

ข้อกำหนด
1. แก้/สร้างได้เฉพาะ backend/app/research.py และ backend/scripts/try_research.py
2. ฟังก์ชันหลัก: async def run_research(task: dict, registry: CitationRegistry, bus=None) -> dict
   task มี "id" และ "question" ถ้า bus ไม่ใช่ None ยังไม่ต้องส่ง event (Step 5 จะทำ)
3. ใช้ AsyncOpenAI ชี้ settings.llm_base_url / llm_api_key / llm_model ทุก LLM call ที่ต้องการ JSON ให้ใช้
   response_format={"type":"json_schema","json_schema":{"name": <ชื่อ>, "schema": <schema>}} แล้ว json.loads ผลลัพธ์
   ถ้า parse ไม่ได้ให้ลองใหม่อีก 1 ครั้ง ถ้ายังไม่ได้ให้ใช้ค่า fallback ตามข้อด้านล่าง
4. loop ไม่เกิน MAX_ROUNDS = 3 รอบ แต่ละรอบ:
   a. สร้าง query: LLM รับคำถาม task + สรุปสิ่งที่ค้นเจอแล้ว + ประเด็นที่ยังขาด แล้วคืน {"queries": [1–3 ข้อความ]}
      แตกคำถามหลายส่วนเป็นคำถามย่อย และใช้คำที่น่าจะอยู่ในเอกสาร (fallback: [task["question"]])
   b. ค้นทุก query ด้วย await asyncio.to_thread(search, q, 5) ตัด chunk ซ้ำ (doc_id, page, text เดียวกัน) และข้าม chunk ที่คัดไว้แล้วในรอบก่อน
   c. คัด chunk ใน LLM call เดียว: ส่ง chunk ใหม่แบบมีเลขลำดับ คืน {"relevant": [ลำดับ], "enough": bool, "missing": [ประเด็นที่ยังขาด]}
      (fallback: ถือว่าทุก chunk relevant และ enough=true)
   d. chunk ที่ relevant ให้ registry.register(chunk) แล้วเก็บ id
   e. ถ้า enough เป็นจริง ให้ออกจาก loop
5. เขียน note ด้วย LLM อีกหนึ่ง call ให้ส่ง chunk ที่คัดแล้วในรูป "[<registry id>] (<filename> หน้า <page>)\n<text>"
   คืนตาม schema {"findings":[{"text":str,"citations":[int]}], "gaps":[str]}
   กฎใน prompt: ใช้ข้อมูลจาก chunk เท่านั้น แต่ละ finding ต้องอ้าง id ที่ให้ไปอย่างน้อยหนึ่งตัว สิ่งที่ถามแต่ไม่พบให้ใส่ใน gaps ตอบเป็นภาษาไทย
6. ทำความสะอาดก่อนคืน: ตัด citation id ที่ไม่ได้มาจาก task นี้ ตัด finding ที่ไม่เหลือ citation
   ถ้าไม่มี chunk ที่ relevant เลย ให้ findings=[] และ gaps=[task["question"]]
7. คืน {"task_id": task["id"], "findings": [...], "data": [], "gaps": [...]}
8. backend/scripts/try_research.py: รับคำถามจาก argv สร้าง CitationRegistry() เรียก run_research({"id":"t1","question":...}, registry)
   แล้วพิมพ์ note เป็น JSON ภาษาไทยอ่านได้ (ensure_ascii=False, indent=2) ตามด้วย registry.get(id) ของทุก id ที่ใช้

ทดสอบ (รันเองทั้งหมด ถ้าไม่ผ่านให้แก้จนผ่าน)
- docker compose exec backend python scripts/try_research.py "ลาพักผ่อนกี่วัน และลาป่วยกี่วันต้องมีใบแพทย์"
  ต้องมี findings ครอบคลุมทั้งเรื่องลาพักผ่อนและลาป่วย และทุก citation id อยู่ใน registry
- docker compose exec backend python scripts/try_research.py "ลาคลอดได้กี่วัน"
  findings ต้องว่าง และมี gaps
- docker compose exec backend python -m py_compile app/research.py

เสร็จแล้วสรุป: ไฟล์ที่สร้าง จำนวนรอบที่ใช้ในแต่ละคำถามทดสอบ และ note ที่ได้แบบย่อ
```

---

<a id="w2-s2">

</a>

## Workshop 2 · Step 2 · MCP client

```text
อ่าน AGENTS.md, backend/app/research.py, backend/app/config.py, docker-compose.yml และโค้ดใน mcp_servers/ ก่อน แล้วทำงานนี้ให้เสร็จโดยไม่ต้องถามกลับ

งาน: เขียน MCP client ใน backend/app/tools.py แล้วให้ Research agent ค้นเอกสารผ่าน docs-mcp และดึงข้อมูลจาก hr-mcp ได้

ข้อกำหนด
1. แก้/สร้างได้เฉพาะ backend/app/tools.py, backend/app/research.py, backend/scripts/try_tools.py และ backend/requirements.txt (เพิ่ม mcp ถ้ายังไม่มี แล้ว docker compose up -d --build backend)
2. ใช้ MCP Python SDK: ClientSession กับ streamablehttp_client (mcp.client.streamable_http) ต่อ settings.docs_mcp_url และ settings.hr_mcp_url
3. class ToolHub:
   - async connect(): เปิด session ทั้งสอง server ด้วย AsyncExitStack, initialize, list_tools แล้วเก็บ tool ไว้
   - ชื่อ tool ที่เปิดให้ LLM ใช้ prefix ด้วย "docs__" หรือ "hr__" (ใช้ __ เพราะชื่อ function ของ OpenAI ห้ามมีจุด)
   - openai_tools(prefix=None) -> list: แปลงเป็น {"type":"function","function":{"name","description","parameters": inputSchema}} กรองตาม prefix ได้
   - async call(name, arguments) -> Any: ตัด prefix แล้วเรียก call_tool บน server ที่ถูกต้อง ใช้ structuredContent ถ้ามี ไม่งั้น json.loads ข้อความใน content (ถ้า parse ไม่ได้คืนเป็นข้อความ) timeout 20 วินาที
   - async close()
   - get_tool_hub(): singleton ที่ connect ครั้งแรกที่ถูกเรียก (ใช้ asyncio.Lock) ถ้าการเรียกล้มเพราะ connection ให้ reconnect หนึ่งครั้ง
4. แก้ research.py:
   - ค้นเอกสารผ่าน await hub.call("docs__search_docs", {"query": q, "k": 5}) แทน search() โดยตรง ผลลัพธ์ต้อง register ลง registry เหมือนเดิม
   - ในขั้นสร้าง query ของรอบแรก ให้ส่งรายการ tool ของ hr (ชื่อ, คำอธิบาย, parameters) ไปด้วย และขยาย schema เป็น
     {"queries":[...], "tool_calls":[{"name": str, "arguments": object}]} ให้ LLM เลือกเรียก hr tool เฉพาะเมื่อคำถามต้องใช้ข้อมูลระบบ
   - เรียก tool_calls ที่ชื่อขึ้นต้นด้วย "hr__" ผ่าน hub.call แล้วเก็บใน note["data"] เป็น {"source":"hr-mcp","text": <สรุปผลเป็นข้อความไทยสั้น ๆ พร้อมค่าตัวเลข>}
   - ข้อมูลจาก hr ห้ามลง registry และห้ามมี citation
   - ถ้า hr tool ล้ม ให้เพิ่มใน gaps ว่า "ดึงข้อมูลจากระบบ HR ไม่สำเร็จ" แล้วทำงานต่อ
5. backend/scripts/try_tools.py: พิมพ์ชื่อ tool ทั้งหมดจาก openai_tools() แล้วเรียก docs__search_docs("ลาพักผ่อน") กับ hr__leave_balance({"employee_id":"E001"}) และพิมพ์ผล

ทดสอบ (รันเองทั้งหมด ถ้าไม่ผ่านให้แก้จนผ่าน)
- docker compose exec backend python scripts/try_tools.py → ต้องเห็น docs__search_docs, docs__get_page, hr__leave_balance และผลจากทั้งสอง server
- docker compose exec backend python scripts/try_research.py "ลาพักผ่อนได้กี่วัน และพนักงาน E001 เหลือกี่วัน"
  findings ต้องมีเรื่องสิทธิลาพร้อม citation และ data ต้องมีวันลาคงเหลือจาก hr-mcp โดยไม่มี citation
- docker compose exec backend python scripts/try_research.py "ลาพักผ่อนกี่วัน และลาป่วยกี่วันต้องมีใบแพทย์" ยังได้ผลเหมือน Step 1
- docker compose stop hr-mcp แล้วรันคำถามเรื่อง E001 อีกครั้ง ต้องไม่ crash และ gaps มีข้อความว่าดึงข้อมูลไม่สำเร็จ จากนั้น docker compose start hr-mcp

เสร็จแล้วสรุป: ไฟล์ที่แก้ รายชื่อ tool ที่เห็น และผลของการทดสอบทั้ง 4 ข้อ
```

---

<a id="w2-s3">

</a>

## Workshop 2 · Step 3 · Memory

```text
อ่าน AGENTS.md, backend/app/main.py, backend/app/agent.py และ backend/app/config.py ก่อน แล้วทำงานนี้ให้เสร็จโดยไม่ต้องถามกลับ

งาน: เขียน backend/app/memory.py ให้บทสนทนาจำได้ยาวโดย prompt ไม่เกิน budget ด้วย sliding window + running summary แล้วต่อเข้ากับ /chat

ข้อกำหนด
1. แก้/สร้างได้เฉพาะ backend/app/memory.py, backend/app/agent.py, backend/app/main.py และ backend/scripts/try_memory.py
2. count_tokens(text) = ceil(len(text) / 2.5) เป็นค่าประมาณ (เขียน comment บอกว่าเป็นค่าประมาณ)
3. MEMORY_TOKEN_BUDGET อ่านจาก env ค่า default 1500 (ตั้งต่ำเพื่อให้เห็นการ summarize ใน demo)
4. class ConversationMemory:
   - summary: str และ turns: list[{"user": str, "assistant": str}]
   - add_turn(user, assistant): ตัด [n] ทั้งหมดออกจาก assistant ด้วย regex r"\[\d+\]" ก่อนเก็บ (registry เป็นของแต่ละ request เลขเก่าจึงใช้ข้าม turn ไม่ได้)
   - async compact(): ถ้า token รวมของ turns เกิน budget ให้ดึง turn เก่าที่สุดออกจนเหลือไม่เกิน 60% ของ budget แล้วเรียก LLM หนึ่งครั้งเพื่อรวม summary เดิมกับ turn ที่ถูกดึงออกเป็น summary ใหม่ภาษาไทยไม่เกิน 800 ตัวอักษร
     เก็บข้อเท็จจริงเกี่ยวกับผู้ใช้ (ชื่อ แผนก สิ่งที่ขอ) และหัวข้อที่คุยไปแล้ว ห้ามมี [n]
   - build_messages(system_prompt, user_message) -> list: system, ตามด้วย {"role":"system","content":"สรุปบทสนทนาก่อนหน้า: ..."} ถ้ามี summary, ตามด้วย turns เป็นคู่ user/assistant, ปิดด้วย user_message
   - last_prompt_tokens: จำนวน token ประมาณของ messages ล่าสุดที่ build
5. get_memory(session_id) -> ConversationMemory เก็บใน dict ระดับ process
6. main.py: เพิ่ม session_id: str = "default" ใน ChatRequest ส่งให้ run_agent
7. agent.py: run_agent(message, history, session_id="default") สร้าง messages ด้วย memory.build_messages แทนการใช้ history จาก frontend
   หลังส่ง done แล้วให้ memory.add_turn(message, คำตอบเต็ม) แล้ว await memory.compact()
8. backend/scripts/try_memory.py: ใช้ session ใหม่ ส่ง 10 turn เข้า run_agent ตามลำดับ (อ่านผลจาก SSE string ที่ yield ออกมา)
   turn 1: "สวัสดี ผมชื่อสมชาย อยู่แผนกบัญชี" แล้วถามเรื่องลาพักผ่อน ลาป่วย ขั้นตอนขอลา สลับกันไปจนถึง turn 9
   turn 10: "ผมชื่ออะไร และอยู่แผนกไหน"
   พิมพ์ last_prompt_tokens ของแต่ละ turn, ความยาว summary และคำตอบของ turn 10

ทดสอบ (รันเองทั้งหมด ถ้าไม่ผ่านให้แก้จนผ่าน)
- docker compose exec backend python scripts/try_memory.py
  last_prompt_tokens ทุก turn ต้องไม่เกิน budget + ขนาด system prompt + ข้อความล่าสุด, summary ต้องไม่ว่างภายใน turn 10 และคำตอบ turn 10 ต้องมี "สมชาย" และ "บัญชี"
- summary และ turns ที่เก็บต้องไม่มี [n]
- curl คำถามเดิมจาก workshop 1 ผ่าน /chat ยังได้ token, citations, done ครบ

เสร็จแล้วสรุป: ไฟล์ที่แก้ ตาราง prompt tokens ต่อ turn และคำตอบของ turn 10
```

---

<a id="w2-s4">

</a>

## Workshop 2 · Step 4 · Multi-agent

```text
อ่าน AGENTS.md, backend/app/research.py, backend/app/tools.py, backend/app/memory.py, backend/app/registry.py, backend/app/events.py, backend/app/main.py และโฟลเดอร์ backend/app/agents/ ก่อน แล้วทำงานนี้ให้เสร็จโดยไม่ต้องถามกลับ

งาน: สร้าง Planning agent, Docs agent และ Orchestrator แล้วให้ /chat ใช้ Orchestrator

ข้อกำหนด
1. แก้/สร้างได้เฉพาะ backend/app/agents/planner.py, orchestrator.py, docs_writer.py, backend/app/main.py และ backend/scripts/try_orchestrator.py
2. planner.py → async def make_plan(message: str, context: list[dict]) -> dict
   - LLM call ด้วย json_schema ตาม plan: {"goal": str, "tasks":[{"id": str, "agent": "research"|"docs", "question"?: str, "outline"?: [str], "depends_on":[str]}]}
   - กฎใน prompt: คำถามทั่วไปให้มี research task เดียวและไม่มี docs task; คำขอให้สร้างเอกสาร สรุป คู่มือ หรือรายงาน ให้แตก research ตามหัวข้อ (ไม่เกิน 4) แล้วตามด้วย docs task เดียวที่ depends_on ทุก research และมี outline
   - ตรวจหลัง parse: id ไม่ซ้ำ, depends_on อ้าง task ที่มีจริงและไม่วน, รวมไม่เกิน 5 task, research ต้องมี question, docs ต้องมี outline
   - ไม่ผ่านให้ลองใหม่อีก 1 ครั้ง ถ้ายังไม่ผ่านใช้ fallback {"goal": message, "tasks":[{"id":"t1","agent":"research","question": message,"depends_on":[]}]}
3. docs_writer.py
   - async def write_document(goal, outline, notes, registry) -> str: LLM stream=True เขียน markdown ภาษาไทย หัวข้อ ## ตาม outline ใช้เฉพาะ findings และ data ใน notes
     ส่ง findings พร้อม id ให้ LLM อ้างด้วย [id], data จาก hr-mcp เขียนโดยระบุว่ามาจากระบบ HR และห้ามมี [n], gaps เขียนว่า "ไม่พบข้อมูลในเอกสาร" ห้ามเติมความรู้อื่น
   - async def write_answer(question, notes, registry) -> AsyncIterator[str]: stream คำตอบสั้นแบบ chat จาก notes ด้วยกฎการอ้างอิงเดียวกัน yield ทีละชิ้นข้อความ
4. orchestrator.py → async def run(message: str, session_id: str, bus: EventBus)
   - สร้าง CitationRegistry() ใหม่ต่อ request, memory = get_memory(session_id), context = memory.build_messages("", message)[1:-1]
   - plan = await make_plan(message, context) แล้ว await bus.emit("plan", {"tasks":[{"id","agent","title": question หรือ "เขียนเอกสาร"}]})
   - ไม่มี docs task (โหมด chat): run_research task เดียว แล้ว stream write_answer เป็น event token; หลังจบ emit citations = registry.validate(คำตอบเต็ม) แล้ว done
   - มี docs task (โหมดเอกสาร): จัด research เป็นระดับตาม depends_on รัน task ในระดับเดียวกันพร้อมกันด้วย asyncio.gather(..., return_exceptions=True)
     task ที่ล้มให้ได้ note {"task_id", "findings":[], "data":[], "gaps":["ค้นข้อมูลหัวข้อนี้ไม่สำเร็จ"]} แล้วทำงานต่อ
     emit progress {"done","total","current_task"} ทุกครั้งที่ task เริ่มและจบ (total = จำนวน task ทั้งหมด)
     จากนั้น markdown = await write_document(...) แล้ว emit document {"title": plan["goal"], "markdown": markdown}, citations = registry.validate(markdown), done
   - ทุกกรณีจบด้วย memory.add_turn(message, คำตอบหรือ markdown) และ await memory.compact() แล้ว await bus.close()
   - exception ที่หลุดถึงระดับบนสุดให้ emit error {"message": ข้อความสั้น} แล้ว close
5. main.py: เมื่อ MOCK_MODE=false ให้ /chat สร้าง EventBus เริ่ม orchestrator.run เป็น background task (asyncio.create_task) แล้วคืน StreamingResponse(bus.stream(), media_type="text/event-stream") พร้อม header no-cache เดิม คงโหมด mock ไว้ตามเดิม
6. backend/scripts/try_orchestrator.py: รับข้อความจาก argv รัน orchestrator กับ EventBus แล้วพิมพ์ event ทั้งหมดที่ได้จาก bus.stream() ตามลำดับ (ตัด markdown ให้เหลือ 300 ตัวอักษรตอนพิมพ์)

ทดสอบ (รันเองทั้งหมด ถ้าไม่ผ่านให้แก้จนผ่าน)
- docker compose exec backend python scripts/try_orchestrator.py "สรุปสิทธิการลาทั้งหมดเป็นเอกสารสำหรับพนักงานใหม่"
  ต้องเห็น plan ที่มี research หลายตัวและ docs หนึ่งตัว, progress ไปถึง done == total, document ที่มีหัวข้อครบตาม outline และ citations ที่ทุก id อยู่ใน registry
- docker compose exec backend python scripts/try_orchestrator.py "ลาพักผ่อนได้ปีละกี่วัน"
  ต้องเป็นโหมด chat: มี token, citations, done และไม่มี document
- chunk ที่ research สองตัวเจอซ้ำต้องได้ id เดียวกัน (ตรวจจาก citations ของเอกสารว่าไม่มี doc_id+page+quote ซ้ำด้วย id ต่างกัน)
- curl -N -X POST localhost:8000/chat -H "Content-Type: application/json" -d '{"message":"สรุปสิทธิการลาทั้งหมดเป็นเอกสารสำหรับพนักงานใหม่","session_id":"test"}' ได้ event ครบเหมือนข้อแรก

เสร็จแล้วสรุป: ไฟล์ที่แก้/สร้าง, plan ที่ได้, จำนวน citation ในเอกสาร และเวลาที่ใช้ของแต่ละคำขอ
```

---

<a id="w2-s5">

</a>

## Workshop 2 · Step 5 · Activity &amp; progress

```text
อ่าน AGENTS.md, backend/app/events.py, backend/app/research.py, backend/app/tools.py, backend/app/agents/orchestrator.py และ frontend/components/ActivityPanel.tsx ก่อน แล้วทำงานนี้ให้เสร็จโดยไม่ต้องถามกลับ

งาน: ให้ทุก agent ส่ง activity ที่คนอ่านรู้เรื่อง เพื่อให้ Activity panel แสดงความคืบหน้าแยกตาม task

ข้อกำหนด
1. แก้ได้เฉพาะ backend/app/research.py, backend/app/tools.py, backend/app/agents/orchestrator.py, backend/app/agents/docs_writer.py และ backend/app/events.py ห้ามแก้ frontend
2. ส่งต่อ bus และ task_id ไปถึงทุกฟังก์ชันที่ต้องส่ง event (research, tools, docs_writer) ทุก event ต้องมี task_id
3. activity ที่ต้องมี (message เป็นภาษาไทยสั้น ไม่เกิน 120 ตัวอักษร ห้ามใส่ prompt, JSON ดิบ หรือข้อความจาก chunk):
   - research เริ่ม: kind "thinking" เช่น "เริ่มค้นหัวข้อ: สิทธิลาพักผ่อน"
   - ก่อนค้นเอกสาร: kind "tool_call" เช่น "ค้นเอกสาร: ลาพักผ่อน สะสมวันลา"
   - หลังคัด chunk: kind "tool_result" เช่น "เจอ 6 ส่วน ใช้ 2 ส่วน (รอบที่ 1)"
   - เรียก hr tool: kind "tool_call" เช่น "ดึงวันลาคงเหลือจากระบบ HR" และผลเป็น "tool_result"
   - research จบ: kind "note" เช่น "ได้ข้อมูล 3 ข้อ ขาด 1 ประเด็น"
   - task ล้ม: kind "error" บอกว่าอะไรล้มและผลกระทบ เช่น "ติดต่อระบบ HR ไม่ได้ เอกสารจะระบุว่าข้อมูลส่วนนี้ขาด"
   - planner: agent "planner" task_id "plan" บอกจำนวนหัวข้อที่แตกได้
   - docs writer: agent "docs" kind "thinking" ตอนเริ่มเขียน และ "note" ตอนเขียนเสร็จพร้อมจำนวนหัวข้อ
4. progress: ตรวจว่า orchestrator ส่งทุกครั้งที่ task เริ่มและจบ current_task เป็นชื่อหัวข้อ ไม่ใช่ id
5. events.py: ถ้า stream() ยังไม่มี keepalive ให้ส่ง ": ping\n\n" ทุก 15 วินาทีที่ไม่มี event เพื่อกัน proxy ตัด SSE ถ้ามีอยู่แล้วไม่ต้องแก้
6. ห้ามเปลี่ยน shape ของ event หรือชื่อ field จาก contract

ทดสอบ (รันเองทั้งหมด ถ้าไม่ผ่านให้แก้จนผ่าน)
- docker compose exec backend python scripts/try_orchestrator.py "สรุปสิทธิการลาทั้งหมดเป็นเอกสารสำหรับพนักงานใหม่ รวมวันลาคงเหลือของพนักงาน E001"
  ทุก activity ต้องมี task_id, ไม่มี message ใดยาวเกิน 120 ตัวอักษรหรือมี "{" หรือ "role", และต้องเห็น kind ครบ thinking, tool_call, tool_result, note
- docker compose stop hr-mcp แล้วรันคำสั่งเดิมอีกครั้ง ต้องเห็น activity kind "error" ของ task นั้น และยังได้ document กับ done จากนั้น docker compose start hr-mcp
- เปิด http://localhost:3000 ส่งคำขอเดิม แล้วตรวจว่า Activity panel แสดงแต่ละ task และ progress ขึ้นจนครบ (ถ้าตรวจผ่าน browser ไม่ได้ ให้บอกว่าข้ามข้อนี้)

เสร็จแล้วสรุป: ไฟล์ที่แก้ ตัวอย่าง activity 10 บรรทัดแรกจากการทดสอบ และผลของกรณี hr-mcp ล่ม
```

