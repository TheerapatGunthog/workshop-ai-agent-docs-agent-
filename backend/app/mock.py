"""Mock mode: stream คำตอบจาก contract/chat-response.json ผ่าน SSE แบบเดียวกับ agent จริง"""
import asyncio
import json
from typing import AsyncIterator

from .config import settings
from .sse import sse


async def mock_stream() -> AsyncIterator[str]:
    payload = json.loads(settings.contract_path.read_text(encoding="utf-8"))
    answer: str = payload["answer"]
    for i in range(0, len(answer), 4):
        yield sse("token", {"text": answer[i : i + 4]})
        await asyncio.sleep(0.015)
    yield sse("citations", {"citations": payload["citations"]})
    yield sse("done", {})
