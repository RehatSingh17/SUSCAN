import re


def clean_text(raw: str) -> str:
    if not raw:
        return ""

    text = raw

    text = text.encode("utf-8", errors="ignore").decode("utf-8")

    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)

    text = text.replace("\u2018", "'").replace("\u2019", "'")
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    text = text.replace("\u2013", "-").replace("\u2014", "-")
    text = text.replace("\u2026", "...")

    text = re.sub(r"https?://\S+", "", text)

    text = re.sub(r"([!?.]){3,}", r"\1", text)

    text = re.sub(r"[ \t]+", " ", text)

    text = re.sub(r"\n{3,}", "\n\n", text)

    lines = [line.strip() for line in text.splitlines()]
    text = "\n".join(lines).strip()

    return text


def word_count(text: str) -> int:
    return len(text.split()) if text else 0