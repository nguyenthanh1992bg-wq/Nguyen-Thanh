"""Dựng 1 video: tải về -> eac new -> Claude viết plan.json -> eac check (tự sửa) -> QA ảnh -> eac render."""
import json
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

from .config import C, ENGINE, SKILL_DIR
from . import brain, llm

EAC = [sys.executable, "-I", str(ENGINE / "eac.py")]


def eac(*args, check=True, timeout=7200):
    r = subprocess.run([*EAC, *map(str, args)], cwd=ENGINE, capture_output=True, text=True, timeout=timeout)
    if check and r.returncode != 0:
        raise RuntimeError(f"eac {args[0]} lỗi:\n{(r.stdout + r.stderr)[-1500:]}")
    return r.stdout + r.stderr


def _skill_text():
    s = (SKILL_DIR / "SKILL.md").read_text(encoding="utf-8")
    s = s.split("---", 2)[-1]
    return s


def _system():
    return (
        "Bạn là biên tập viên dựng video của agent edit video dọc style Ấm Cam. Máy dựng (eac) đã chuẩn hoá, cắt lặng, tăng tốc và bóc băng; "
        "VIỆC DUY NHẤT CỦA BẠN: viết file plan.json đúng skill dưới đây. Agent tự chạy check/render, bạn KHÔNG chạy lệnh nào.\n"
        "Trả về DUY NHẤT một khối JSON (plan.json đầy đủ, giữ nguyên các khoá fps, duration, talk, speed, _assets đã có). Không giải thích.\n\n"
        "=== SKILL ===\n" + _skill_text() +
        "\n=== GIẢI MÃ CÓ SỐ ĐO ===\n" + (SKILL_DIR / "references" / "decode.md").read_text(encoding="utf-8") +
        "\n=== ĐẶC TẢ KIỂU (types.ts) ===\n" + (ENGINE / "src" / "types.ts").read_text(encoding="utf-8") +
        "\n=== PLAN MẪU ĐÃ CHẠY ĐƯỢC ===\n" + (SKILL_DIR / "references" / "plan-mau.json").read_text(encoding="utf-8") +
        "\n=== LUẬT BỘ NÃO ĐÃ HỌC TỪ CÁC VIDEO TRƯỚC (ưu tiên làm theo, trừ khi mâu thuẫn ràng buộc cứng của SKILL) ===\n" + brain.rules_for_prompt()
    )


def _user(wd, plan, extra=""):
    words = json.loads((wd / "words.json").read_text(encoding="utf-8"))
    wl = " ".join(f"{w['w']}@{w['s']}" for w in words)
    a = plan.get("_assets", {})
    return (f"Thời lượng talk: {plan['duration']}s, tốc độ đã tăng x{plan.get('speed')}.\n"
            f"Ảnh kho B-roll có sẵn (dùng nguyên chuỗi này trong floaters.images): {json.dumps(a.get('broll', []))}\n"
            f"Video quay màn hình thật (media): {json.dumps(a.get('screens', []))}\n\n"
            f"LỜI (câu):\n{(wd / 'transcript.txt').read_text(encoding='utf-8')}\n\nTỪNG TỪ (từ@giây):\n{wl}\n\n"
            f"plan.json hiện tại (khung):\n{json.dumps(plan, ensure_ascii=False)}\n{extra}")


def _check(job):
    out = eac("check", job, check=False)
    errs = [l.strip()[2:].strip() for l in out.splitlines() if l.strip().startswith("✗")]
    warns = [l.strip()[1:].strip() for l in out.splitlines() if l.strip().startswith("!")]
    return errs, warns, out


def _metrics(plan, warns):
    D = plan["duration"]
    sc = plan["scenes"]
    share = {k: sum(s["to"] - s["from"] for s in sc if s["layout"] == k) / D * 100 for k in ("face", "split", "dark", "light")}
    evs = len(sc) + sum(len(s.get("punches", [])) for s in sc) + sum(len(o.get("lines", o.get("items", [1]))) for o in plan["overlays"])
    return {"face_pct": share["face"], "split_pct": share["split"], "darklight_pct": share["dark"] + share["light"], "rate": evs / D,
            "scenes": len(sc), "overlays": len(plan["overlays"]), "warnings": warns}


QA_SYSTEM = """Bạn là giám khảo QA video dọc style Ấm Cam (nâu cam; chữ sans đậm + serif nghiêng; mặt toàn khung / màn hình trên + mặt dưới / thẻ số).
Xem các ảnh tĩnh (mỗi cảnh một khung) và lời. Chấm 0-10: chữ không đè miệng/mặt, đúng chính tả & tên riêng, dễ đọc, bố cục cân, B-roll khớp lời, không khung trống/lệch.
Trả về DUY NHẤT JSON: {"score":0-10,"issues":["..."],"fixes":["sửa cụ thể trong plan.json, vd: tăng captionY lên 1500"],"lessons":["bài học chung có thể dùng cho video sau"]}"""


def _stills(job, plan):
    mids = []
    for s in plan["scenes"][:8]:
        mids.append(round((s["from"] + s["to"]) / 2, 2))
    mids = mids[:6]
    eac("still", job, *mids, timeout=1800)
    wd = ENGINE / "work" / job / "stills"
    return [wd / f"{m}.jpg" for m in mids if (wd / f"{m}.jpg").exists()]


def edit(raw_path, name, notify=lambda m: None):
    """Trả về dict kết quả. Ném lỗi nếu hỏng."""
    t0 = time.time()
    slug = re.sub(r"[^\w\-]+", "-", Path(name).stem, flags=re.U).strip("-")[:30] or "video"
    notify("⏳ Bước 1/5: chuẩn hoá, cắt lặng, bóc băng…")
    out = eac("new", raw_path, "--name", slug)
    job = re.search(r"Job: (\S+)", out).group(1)
    wd = ENGINE / "work" / job
    plan0 = json.loads((wd / "plan.json").read_text(encoding="utf-8"))
    sysmsg = _system()

    notify("🧠 Bước 2/5: Claude viết kịch bản dựng…")
    extra, plan, retries = "", None, 0
    for attempt in range(C.max_retries + 1):
        plan = llm.parse_json(llm.ask(sysmsg, _user(wd, plan0, extra), C.plan_model))
        for k in ("fps", "duration", "talk", "speed", "_assets"):
            plan[k] = plan0[k]
        plan.setdefault("overlays", [])
        plan.setdefault("music", {"gen": True})
        (wd / "plan.json").write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding="utf-8")
        errs, warns, _ = _check(job)
        if not errs:
            break
        retries += 1
        extra = "\n\nLẦN TRƯỚC CHƯA ĐẠT eac check. Sửa các lỗi này và trả lại plan.json đầy đủ:\n" + "\n".join(f"- {e}" for e in errs + warns)
    else:
        raise RuntimeError("Kịch bản không qua eac check sau nhiều lần sửa: " + "; ".join(errs))

    qa = {"score": None, "issues": [], "fixes": [], "lessons": []}
    if C.qa_vision:
        notify("🔍 Bước 3/5: soát ảnh tĩnh (QA)…")
        for rnd in range(2 if C.qa_autofix else 1):
            try:
                imgs = _stills(job, plan)
                qa = llm.parse_json(llm.ask(QA_SYSTEM, "Lời:\n" + (wd / "transcript.txt").read_text(encoding="utf-8"), C.brain_model, max_tokens=2000, images=imgs))
            except Exception as e:
                qa = {"score": None, "issues": [f"QA lỗi: {e}"], "fixes": [], "lessons": []}
                break
            if rnd == 0 and C.qa_autofix and qa.get("score") is not None and qa["score"] < C.qa_min_score and qa.get("fixes"):
                notify(f"♻️ QA {qa['score']}/10 < {C.qa_min_score}, tự sửa 1 vòng…")
                fix = "\n\nGIÁM KHẢO QA YÊU CẦU SỬA (plan hiện tại bên dưới):\n" + "\n".join(f"- {x}" for x in qa["fixes"]) + "\n" + json.dumps(plan, ensure_ascii=False)
                new = llm.parse_json(llm.ask(sysmsg, _user(wd, plan0, fix), C.plan_model))
                for k in ("fps", "duration", "talk", "speed", "_assets"):
                    new[k] = plan0[k]
                (wd / "plan.json").write_text(json.dumps(new, ensure_ascii=False, indent=2), encoding="utf-8")
                errs2, warns2, _ = _check(job)
                if errs2:  # bản sửa hỏng -> giữ bản cũ
                    (wd / "plan.json").write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding="utf-8")
                    break
                plan, warns = new, warns2
                retries += 1
                continue
            break

    notify("🎬 Bước 4/5: dựng hình + nhạc + SFX (vài phút)…")
    t1 = time.time()
    eac("render", job, timeout=7200)
    final = ENGINE / "done" / f"{job}.mp4"
    if not final.exists():
        raise RuntimeError("Render xong nhưng không thấy file thành phẩm")
    m = _metrics(plan, warns)
    m.update({"job": job, "source": name, "duration": plan["duration"], "speed": plan.get("speed"), "retries": retries,
              "qa_score": qa.get("score"), "qa_issues": qa.get("issues", []), "render_sec": round(time.time() - t1), "total_sec": round(time.time() - t0),
              "at": time.strftime("%Y-%m-%d %H:%M:%S")})
    transcript = " ".join(w["w"] for w in json.loads((wd / "words.json").read_text(encoding="utf-8")))
    return {"job": job, "final": final, "plan": plan, "metrics": m, "qa": qa, "transcript": transcript}


def cleanup(keep):
    jobs = sorted([d for d in (ENGINE / "work").glob("*") if d.is_dir()], key=lambda d: d.name)
    for d in jobs[:-keep] if keep > 0 else jobs:
        shutil.rmtree(d, ignore_errors=True)
        shutil.rmtree(ENGINE / "public" / "jobs" / d.name, ignore_errors=True)
        (ENGINE / "done" / f"{d.name}.mp4").unlink(missing_ok=True)
