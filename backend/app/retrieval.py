"""Retrieval ที่เตรียมไว้ให้แล้ว — ห้ามแก้ใน workshop (ดู AGENTS.md)"""
from dataclasses import asdict, dataclass

from openai import OpenAI
from qdrant_client import QdrantClient

from .config import settings


@dataclass
class Chunk:
    doc_id: str
    filename: str
    page: int  # 1-based ตรงกับเลขหน้าที่ react-pdf ใช้
    text: str
    score: float

    def to_dict(self) -> dict:
        return asdict(self)


_embed_client = OpenAI(base_url=settings.embed_base_url, api_key=settings.embed_api_key)
_qdrant = QdrantClient(url=settings.qdrant_url)


def embed(texts: list[str]) -> list[list[float]]:
    if not settings.embed_model:
        raise RuntimeError("ยังไม่ได้ตั้ง EMBED_MODEL ใน .env")
    res = _embed_client.embeddings.create(model=settings.embed_model, input=texts)
    return [d.embedding for d in res.data]


def search(query: str, k: int = 5) -> list[Chunk]:
    """ค้นหา chunk ที่เกี่ยวข้องที่สุด k อัน พร้อม metadata doc_id / filename / page"""
    vector = embed([query])[0]
    hits = _qdrant.query_points(
        collection_name=settings.collection,
        query=vector,
        limit=k,
        with_payload=True,
    ).points
    return [
        Chunk(
            doc_id=h.payload["doc_id"],
            filename=h.payload["filename"],
            page=int(h.payload["page"]),
            text=h.payload["text"],
            score=float(h.score),
        )
        for h in hits
    ]
