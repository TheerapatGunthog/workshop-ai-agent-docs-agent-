import json

# SSE events ที่ frontend รองรับ (ดู AGENTS.md):
#   token     {"text": "..."}              ส่วนของคำตอบที่ stream ออกไป
#   citations {"citations": [Citation]}    ส่งครั้งเดียวหลัง validate แล้ว
#   done      {}                           จบคำตอบ
#   error     {"message": "..."}           เกิดข้อผิดพลาด


def sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
