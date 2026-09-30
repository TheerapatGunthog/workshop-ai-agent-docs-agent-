# ทางลัดของคำสั่ง docker compose (Windows ที่ไม่มี make ใช้คำสั่งใน README ได้เลย)
.PHONY: up down logs ingest restart shell-backend

.env:
	cp .env.example .env

up: .env
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f backend

ingest: .env
	docker compose run --rm backend python ingest.py

restart:
	docker compose restart backend

shell-backend:
	docker compose exec backend bash
