import re
from typing import AsyncIterator

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel

from .agent import run_agent
from .config import settings
from .docker_guard import require_docker
from .mock import mock_stream
from .sse import sse

require_docker()

app = FastAPI(title="Docs Agent Workshop")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

DOC_ID = re.compile(r"^[A-Za-z0-9_-]+$")


class HistoryItem(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[HistoryItem] = []


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "mock_mode": settings.mock_mode}


@app.get("/documents")
def documents() -> list[dict]:
    return [{"doc_id": p.stem, "filename": p.name} for p in sorted(settings.pdf_dir.glob("*.pdf"))]


@app.get("/files/{doc_id}")
def get_file(doc_id: str) -> FileResponse:
    if not DOC_ID.match(doc_id):
        raise HTTPException(400, "doc_id ไม่ถูกต้อง")
    path = settings.pdf_dir / f"{doc_id}.pdf"
    if not path.is_file():
        raise HTTPException(404, f"ไม่พบไฟล์ {doc_id}.pdf")
    return FileResponse(path, media_type="application/pdf")


async def _guarded(stream: AsyncIterator[str]) -> AsyncIterator[str]:
    try:
        async for chunk in stream:
            yield chunk
    except NotImplementedError as exc:
        yield sse("error", {"message": str(exc)})
    except Exception as exc:  # แสดง error ให้เห็นใน UI ระหว่าง workshop
        yield sse("error", {"message": f"{type(exc).__name__}: {exc}"})


@app.post("/chat")
async def chat(req: ChatRequest) -> StreamingResponse:
    history = [h.model_dump() for h in req.history]
    stream = mock_stream() if settings.mock_mode else run_agent(req.message, history)
    return StreamingResponse(
        _guarded(stream),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
