"""Ingest PDF ใน data/pdfs เข้า Qdrant

รัน:  docker compose run --rm backend python ingest.py
"""
import uuid

import pymupdf
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

from app.config import settings
from app.docker_guard import require_docker
from app.retrieval import embed
from app.textnorm import clean_thai

CHUNK_SIZE = 600
CHUNK_OVERLAP = 120
BATCH = 32


def chunk_text(text: str) -> list[str]:
    text = " ".join(text.split())
    if not text:
        return []
    chunks, start = [], 0
    while start < len(text):
        chunks.append(text[start : start + CHUNK_SIZE])
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks


def load_chunks() -> list[dict]:
    items = []
    for path in sorted(settings.pdf_dir.glob("*.pdf")):
        with pymupdf.open(path) as doc:
            for index, page in enumerate(doc):
                for text in chunk_text(clean_thai(page.get_text())):
                    items.append(
                        {
                            "doc_id": path.stem,
                            "filename": path.name,
                            "page": index + 1,  # PyMuPDF นับจาก 0 แต่ contract ใช้ 1-based
                            "text": text,
                        }
                    )
            print(f"  {path.name}: {doc.page_count} หน้า")
    return items


def main() -> None:
    require_docker()
    print(f"อ่าน PDF จาก {settings.pdf_dir}")
    items = load_chunks()
    if not items:
        raise SystemExit("ไม่พบข้อความใน PDF — ใส่ไฟล์ .pdf ไว้ที่ data/pdfs ก่อน")

    vectors = []
    for i in range(0, len(items), BATCH):
        vectors += embed([it["text"] for it in items[i : i + BATCH]])

    client = QdrantClient(url=settings.qdrant_url)
    if client.collection_exists(settings.collection):
        client.delete_collection(settings.collection)
    client.create_collection(
        settings.collection,
        vectors_config=VectorParams(size=len(vectors[0]), distance=Distance.COSINE),
    )
    client.upsert(
        settings.collection,
        points=[
            PointStruct(
                id=str(uuid.uuid5(uuid.NAMESPACE_URL, f"{it['doc_id']}:{it['page']}:{n}")),
                vector=vec,
                payload=it,
            )
            for n, (it, vec) in enumerate(zip(items, vectors))
        ],
    )
    print(f"เสร็จ: {len(items)} chunks ใน collection '{settings.collection}'")


if __name__ == "__main__":
    main()
