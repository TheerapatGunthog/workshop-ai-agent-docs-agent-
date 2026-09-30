"""Workshop นี้บังคับรันผ่าน Docker เท่านั้น เพื่อให้ทุกคนมี environment เหมือนกัน"""
import os
import sys


def require_docker() -> None:
    if os.getenv("IN_DOCKER") != "1":
        sys.exit(
            "\n[docs-agent-workshop] ต้องรันผ่าน Docker เท่านั้น\n"
            "  ใช้คำสั่ง: docker compose up --build\n"
            "  หรือรันคำสั่งใน container: docker compose exec backend <command>\n"
        )
