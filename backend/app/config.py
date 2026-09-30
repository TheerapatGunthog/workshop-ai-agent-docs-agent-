import os
from pathlib import Path


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


class Settings:
    # LLM สำหรับ agent (OpenAI-compatible เช่น vLLM)
    llm_base_url = _env("LLM_BASE_URL", "http://host.docker.internal:8001/v1")
    llm_api_key = _env("LLM_API_KEY", "EMPTY")
    llm_model = _env("LLM_MODEL")

    # Embedding สำหรับ retrieval (ถ้าไม่ตั้ง จะใช้ endpoint เดียวกับ LLM)
    embed_base_url = _env("EMBED_BASE_URL") or llm_base_url
    embed_api_key = _env("EMBED_API_KEY") or llm_api_key
    embed_model = _env("EMBED_MODEL")

    qdrant_url = _env("QDRANT_URL", "http://qdrant:6333")
    collection = _env("QDRANT_COLLECTION", "docs")

    pdf_dir = Path(_env("PDF_DIR", "/data/pdfs"))
    contract_path = Path(_env("CONTRACT_PATH", "/contract/chat-response.json"))

    # true = /chat stream คำตอบจาก contract/chat-response.json (ไม่เรียก LLM)
    mock_mode = _env("MOCK_MODE", "true").lower() == "true"

    cors_origins = [o.strip() for o in _env("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()]


settings = Settings()
