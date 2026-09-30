"""Docs Agent — ส่วนที่ผู้เข้าร่วมต้องเขียนใน workshop

Step 2 · run_agent       : tool-calling loop + stream SSE
Step 4 · SYSTEM_PROMPT    : สั่งให้ LLM อ้างอิงด้วย [n]
Step 4 · validate_citations : ตัด citation ที่ LLM แต่งขึ้นเอง

สิ่งที่มีให้แล้ว: search() ใน retrieval.py, sse() ใน sse.py, SEARCH_DOCS_TOOL, format_chunks()
เปลี่ยน MOCK_MODE=false ใน .env เพื่อให้ /chat เรียกไฟล์นี้แทน mock
"""
from typing import AsyncIterator

from openai import AsyncOpenAI

from .config import settings
from .retrieval import Chunk, search  # noqa: F401
from .sse import sse  # noqa: F401

client = AsyncOpenAI(base_url=settings.llm_base_url, api_key=settings.llm_api_key)

# TODO (Step 4): เขียน system prompt ที่สั่งให้ตอบจากผลค้นหาเท่านั้น และอ้างอิงด้วย [n]
SYSTEM_PROMPT = """คุณคือผู้ช่วยตอบคำถามจากเอกสาร"""

SEARCH_DOCS_TOOL = {
    "type": "function",
    "function": {
        "name": "search_docs",
        "description": "ค้นหาข้อความที่เกี่ยวข้องจากเอกสาร PDF ในระบบ",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "คำค้นหา"},
            },
            "required": ["query"],
        },
    },
}

MAX_TOOL_ROUNDS = 3


def format_chunks(chunks: list[Chunk], start_id: int) -> str:
    """แปลง chunks เป็นข้อความสำหรับส่งกลับให้ LLM โดยกำกับเลข [n] ต่อจาก start_id

    ตัวอย่าง:
        [1] (leave-handbook.pdf หน้า 2)
        พนักงานที่ทำงานครบหนึ่งปี...
    """
    return "\n\n".join(
        f"[{start_id + i}] ({c.filename} หน้า {c.page})\n{c.text}" for i, c in enumerate(chunks)
    )


async def run_agent(message: str, history: list[dict]) -> AsyncIterator[str]:
    """TODO (Step 2): ทำ tool-calling loop แล้ว yield SSE ตาม contract

    ลำดับที่ต้อง yield:
        sse("token", {"text": ...})           หลายครั้ง ระหว่าง stream คำตอบ
        sse("citations", {"citations": [...]}) ครั้งเดียว หลัง validate
        sse("done", {})

    citation แต่ละตัวต้องมี: id, doc_id, filename, page, quote
    ข้อควรระวัง: ถ้าเรียก tool หลายรอบ ต้องนับเลข [n] ต่อเนื่อง ไม่เริ่ม 1 ใหม่
    """
    raise NotImplementedError("Step 2: ยังไม่ได้เขียน run_agent() ใน backend/app/agent.py")
    yield  # ทำให้ฟังก์ชันนี้เป็น async generator


def validate_citations(answer: str, citations: list[dict]) -> list[dict]:
    """TODO (Step 4): คืนเฉพาะ citation ที่ถูกอ้างถึงใน answer จริง และมีอยู่ในผลค้นหาจริง"""
    raise NotImplementedError("Step 4: ยังไม่ได้เขียน validate_citations()")
