FROM python:3.12-slim

# ใช้เป็นสัญญาณว่ากำลังรันใน container (โค้ดจะไม่ยอมรันนอก Docker)
ENV IN_DOCKER=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
