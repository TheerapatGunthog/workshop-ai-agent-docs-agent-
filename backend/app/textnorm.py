import re
import unicodedata

# PDF ภาษาไทยหลายไฟล์ extract ออกมาแล้วสระ/วรรณยุกต์ซ้ำ เช่น "พนัักงาน" หรือมี zero-width chars
_THAI_MARKS = "\u0E31\u0E34-\u0E3A\u0E47-\u0E4E"
_DUP_MARK = re.compile(f"([{_THAI_MARKS}])\\1+")
_ZERO_WIDTH = re.compile("[\u200B-\u200D\uFEFF]")


def clean_thai(text: str) -> str:
    text = unicodedata.normalize("NFC", text)
    text = _ZERO_WIDTH.sub("", text)
    text = _DUP_MARK.sub(r"\1", text)
    return text
