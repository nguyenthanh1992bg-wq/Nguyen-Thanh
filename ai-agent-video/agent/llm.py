"""Gọi Claude (Anthropic API)."""
import base64
import json
import re
from .config import C

_client = None


def client():
    global _client
    if _client is None:
        import anthropic
        if not C.anthropic_key:
            raise RuntimeError("Thiếu ANTHROPIC_API_KEY trong .env")
        _client = anthropic.Anthropic(api_key=C.anthropic_key, max_retries=4)
    return _client


def ask(system, user, model, max_tokens=16000, images=None):
    content = []
    for p in images or []:
        content.append({"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": base64.b64encode(open(p, "rb").read()).decode()}})
    content.append({"type": "text", "text": user})
    r = client().messages.create(model=model, max_tokens=max_tokens, system=system, messages=[{"role": "user", "content": content}])
    return "".join(b.text for b in r.content if b.type == "text")


def parse_json(text):
    m = re.search(r"```(?:json)?\s*(.*?)```", text, re.S)
    raw = m.group(1) if m else text
    i, j = raw.find("{"), raw.rfind("}")
    return json.loads(raw[i:j + 1])
