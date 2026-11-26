"""Trạng thái bền (data/state.json): video nào đã xử lý, đã đăng chưa."""
import json
import os
import threading
import time
from .config import DATA

_lock = threading.RLock()
FILE = DATA / "state.json"


def _now():
    return time.strftime("%Y-%m-%d %H:%M:%S")


def load():
    with _lock:
        if FILE.exists():
            return json.loads(FILE.read_text(encoding="utf-8"))
        return {"videos": {}, "slots": {}, "paused": False, "last_scan": None, "tg_offset": 0}


def save(st):
    with _lock:
        DATA.mkdir(parents=True, exist_ok=True)
        tmp = FILE.with_suffix(".tmp")
        tmp.write_text(json.dumps(st, ensure_ascii=False, indent=1), encoding="utf-8")
        os.replace(tmp, FILE)


def update(fn):
    """Đọc-sửa-ghi an toàn giữa các luồng."""
    with _lock:
        st = load()
        r = fn(st)
        save(st)
        return r


def set_video(src_id, **kw):
    def f(st):
        v = st["videos"].setdefault(src_id, {"status": "new", "tries": 0, "added": _now()})
        v.update(kw)
        v["updated"] = _now()
    update(f)
