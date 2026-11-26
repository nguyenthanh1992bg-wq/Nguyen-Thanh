"""BỘ NÃO: học từ mỗi video đã dựng -> tự viết lại 'luật học được' dùng cho lần dựng sau.

data/brain/
  BRAIN.md          bộ não đọc được (người đọc được, cũng là thứ đưa vào prompt)
  lessons.json      các luật đã học (độ tin cậy, số lần được xác nhận)
  history.jsonl     nhật ký số đo của từng video (hình, âm, QA, lượt xem sau khi đăng)
  versions/         bản chụp lessons trước mỗi lần sửa (hoàn tác bằng /rollback)

SKILL.md gốc KHÔNG bị sửa; chỉ lớp 'luật học được' này được chèn thêm, có giới hạn số lượng + độ dài để không phình/lệch.
"""
import json
import shutil
import time
from .config import BRAIN_DIR, C
from . import llm

MAX_RULES = 30
LESSONS = BRAIN_DIR / "lessons.json"
HISTORY = BRAIN_DIR / "history.jsonl"
BRAIN_MD = BRAIN_DIR / "BRAIN.md"

REFLECT_SYSTEM = """Bạn là bộ não tự học của một AI agent edit video dọc style "Ấm Cam". Agent viết plan.json (kịch bản dựng) theo SKILL cố định.
Việc của bạn: từ số đo + nhận xét QA + phản hồi của chủ kênh + số liệu Facebook, cập nhật danh sách LUẬT HỌC ĐƯỢC (bổ sung cho SKILL, không thay SKILL).
Quy tắc:
- Mỗi luật: 1 câu mệnh lệnh cụ thể, đo được, về cách VIẾT PLAN (bố cục, chữ, nhịp, B-roll, âm thanh, hook, CTA). Tối đa 280 ký tự.
- Chỉ thêm luật khi có bằng chứng (số đo/nhận xét/phản hồi). Luật đã có mà lần này lại đúng -> tăng evidence, tăng confidence. Luật bị phản chứng -> giảm confidence, sửa hoặc xoá.
- Phản hồi trực tiếp của chủ kênh (source=owner) có trọng số cao nhất: confidence khởi đầu 0.9 và không được xoá nếu chưa có phản hồi ngược của chính chủ kênh.
- Số liệu Facebook: so sánh video tốt/xấu cùng kỳ, chỉ rút luật khi chênh rõ và nói rõ là giả thuyết (confidence <= 0.5) nếu mẫu < 5 video.
- Không bịa số. Không đụng tới ràng buộc cứng: 1080x1920, -14 LUFS, schema plan, không bịa số liệu/tên riêng trong chữ hiển thị.
- Tối đa 30 luật; gộp luật trùng; bỏ luật confidence < 0.2.
Trả về DUY NHẤT một JSON: {"lessons":[{"id":"L01","rule":"...","why":"...","confidence":0.0-1.0,"evidence":n,"source":"auto|qa|owner|facebook"}],"summary":"2-3 câu: học được gì lần này","changes":["+ thêm ...","~ sửa ...","- bỏ ..."]}"""


def _ensure():
    BRAIN_DIR.mkdir(parents=True, exist_ok=True)
    (BRAIN_DIR / "versions").mkdir(exist_ok=True)


def load_lessons():
    _ensure()
    if LESSONS.exists():
        return json.loads(LESSONS.read_text(encoding="utf-8"))
    return []


def rules_for_prompt():
    ls = sorted(load_lessons(), key=lambda l: -l.get("confidence", 0))
    if not ls:
        return "(Chưa có luật học được — dựng đúng SKILL.)"
    return "\n".join(f"- [{l['id']} · tin cậy {l.get('confidence', 0):.1f}] {l['rule']}" for l in ls)


def render_md(summary="", changes=None):
    ls = sorted(load_lessons(), key=lambda l: -l.get("confidence", 0))
    hist = read_history()
    n = len(hist)
    avg_qa = [h["qa_score"] for h in hist if h.get("qa_score") is not None]
    views = [h["fb"]["views"] for h in hist if isinstance(h.get("fb"), dict) and h["fb"].get("views") is not None]
    lines = ["# BỘ NÃO AGENT EDIT VIDEO ẤM CAM", f"_Cập nhật: {time.strftime('%Y-%m-%d %H:%M')}_", "",
             f"- Số video đã dựng: **{n}**",
             f"- QA trung bình: **{sum(avg_qa) / len(avg_qa):.1f}/10**" if avg_qa else "- QA trung bình: (chưa có)",
             f"- Lượt xem Facebook TB: **{sum(views) / len(views):.0f}**" if views else "- Lượt xem Facebook: (chưa có)", "",
             "## Lần học gần nhất", summary or "(chưa có)", ""]
    if changes:
        lines += ["Thay đổi:"] + [f"- {c}" for c in changes] + [""]
    lines += ["## Luật học được (chèn vào prompt khi dựng)", ""]
    lines += [f"{i}. **{l['id']}** (tin cậy {l.get('confidence', 0):.1f}, xác nhận {l.get('evidence', 1)} lần, nguồn {l.get('source', 'auto')}): {l['rule']}\n   _Vì:_ {l.get('why', '')}" for i, l in enumerate(ls, 1)] or ["(trống)"]
    lines += ["", "## 10 video gần nhất", "", "| Job | Thời lượng | Face% | Nhịp/s | QA | Thử lại | FB views |", "|---|---|---|---|---|---|---|"]
    for h in hist[-10:]:
        fb = h.get("fb") if isinstance(h.get("fb"), dict) else {}
        lines.append(f"| {h['job'][-22:]} | {h.get('duration', 0):.0f}s | {h.get('face_pct', 0):.0f} | {h.get('rate', 0):.2f} | {h.get('qa_score', '-')} | {h.get('retries', 0)} | {fb.get('views', '-')} |")
    BRAIN_MD.write_text("\n".join(lines), encoding="utf-8")


def read_history():
    _ensure()
    if not HISTORY.exists():
        return []
    return [json.loads(l) for l in HISTORY.read_text(encoding="utf-8").splitlines() if l.strip()]


def append_history(rec):
    _ensure()
    with open(HISTORY, "a", encoding="utf-8") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")


def update_history(job, **kw):
    hist = read_history()
    for h in hist:
        if h["job"] == job:
            h.update(kw)
    HISTORY.write_text("".join(json.dumps(h, ensure_ascii=False) + "\n" for h in hist), encoding="utf-8")


def _valid(ls):
    out, seen = [], set()
    for l in ls:
        if not isinstance(l, dict) or not l.get("rule"):
            continue
        l["rule"] = str(l["rule"])[:280]
        l["confidence"] = max(0.0, min(1.0, float(l.get("confidence", 0.5))))
        if l["confidence"] < 0.2 or l["rule"] in seen:
            continue
        seen.add(l["rule"])
        out.append(l)
    out.sort(key=lambda l: -l["confidence"])
    out = out[:MAX_RULES]
    for i, l in enumerate(out, 1):
        l["id"] = l.get("id") or f"L{i:02d}"
    return out


def reflect(event, payload):
    """event: 'edit' | 'owner_feedback' | 'facebook'. Trả về (summary, changes). Không bao giờ ném lỗi làm hỏng luồng chính."""
    _ensure()
    cur = load_lessons()
    hist = read_history()[-12:]
    user = (f"SỰ KIỆN: {event}\nDỮ LIỆU:\n{json.dumps(payload, ensure_ascii=False, indent=1)}\n\n"
            f"LUẬT HIỆN TẠI:\n{json.dumps(cur, ensure_ascii=False, indent=1)}\n\n"
            f"12 VIDEO GẦN NHẤT (số đo):\n{json.dumps(hist, ensure_ascii=False)}")
    try:
        res = llm.parse_json(llm.ask(REFLECT_SYSTEM, user, C.brain_model, max_tokens=8000))
        new = _valid(res["lessons"])
    except Exception as e:
        return f"(không cập nhật được bộ não: {e})", []
    if LESSONS.exists():
        shutil.copy(LESSONS, BRAIN_DIR / "versions" / f"lessons-{time.strftime('%Y%m%d-%H%M%S')}.json")
    LESSONS.write_text(json.dumps(new, ensure_ascii=False, indent=1), encoding="utf-8")
    render_md(res.get("summary", ""), res.get("changes", []))
    return res.get("summary", ""), res.get("changes", [])


def rollback():
    vs = sorted((BRAIN_DIR / "versions").glob("lessons-*.json"))
    if not vs:
        return False
    shutil.copy(vs[-1], LESSONS)
    vs[-1].unlink()
    render_md("(đã hoàn tác về phiên bản trước)")
    return True
