#!/usr/bin/env python3
"""eac — Xưởng edit "Ấm Cam" (style tutorial nâu cam, chữ sans + serif nghiêng).

Lệnh:
  eac new <video_tho> [--name ten] [--screens thu_muc] [--no-cut]   tạo việc: chuẩn hoá 1080x1920, cắt lặng, bóc băng
  eac check <job>                                                    soát plan.json
  eac still <job> <giay> [<giay> ...]                                 xuất ảnh tĩnh để soát
  eac render <job> [--preview]                                       dựng MP4 hoàn chỉnh (hình + nhạc + SFX + chuẩn -14 LUFS)
  eac studio <job>                                                   mở Remotion Studio để xem/sửa tay không tốn token
  eac list                                                           liệt kê việc
"""
import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
WORK = ROOT / "work"
PUB = ROOT / "public" / "jobs"
DONE = ROOT / "done"
SFX = ROOT / "assets" / "sfx"
MUSIC = ROOT / "assets" / "music"
FPS = 30


def sh(cmd, **kw):
    print("  $", " ".join(str(c) for c in cmd)[:200])
    return subprocess.run(cmd, check=True, **kw)


def probe_dur(p):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)],
                         capture_output=True, text=True).stdout.strip()
    return float(out)


def slug(s):
    s = re.sub(r"[^\w\-]+", "-", s, flags=re.U).strip("-")
    return s[:40] or "viec"


# ---------------------------------------------------------------- new
TARGET_WPS = 5.3
BROLL_LIB = ROOT / "assets" / "broll_lib"


def transcribe(wd, talk):
    """macOS Apple Silicon: mlx_whisper. Linux/Windows/Intel: faster-whisper (EAC_WHISPER_MODEL, mặc định large-v3-turbo)."""
    wav = wd / "a16.wav"
    sh(["ffmpeg", "-v", "error", "-y", "-i", str(talk), "-ar", "16000", "-ac", "1", str(wav)])
    words, lines = [], []
    if shutil.which("mlx_whisper") and os.environ.get("EAC_ASR", "auto") != "faster":
        sh(["mlx_whisper", str(wav), "--model", "mlx-community/whisper-large-v3-turbo", "--language", "vi",
            "--word-timestamps", "True", "--output-format", "json", "--output-dir", str(wd)], stdout=subprocess.DEVNULL)
        data = json.loads((wd / "a16.json").read_text())
        for s in data["segments"]:
            lines.append(f"[{s['start']:.2f}-{s['end']:.2f}] {s['text'].strip()}")
            for w in s.get("words", []):
                words.append({"w": w["word"].strip(), "s": round(w["start"], 2), "e": round(w["end"], 2)})
        return words, lines
    from faster_whisper import WhisperModel
    global _FW
    if "_FW" not in globals() or _FW is None:
        _FW = WhisperModel(os.environ.get("EAC_WHISPER_MODEL", "large-v3-turbo"), device=os.environ.get("EAC_WHISPER_DEVICE", "auto"),
                           compute_type=os.environ.get("EAC_WHISPER_COMPUTE", "int8"))
    segs, _ = _FW.transcribe(str(wav), language="vi", word_timestamps=True, vad_filter=True)
    for s in segs:
        lines.append(f"[{s.start:.2f}-{s.end:.2f}] {s.text.strip()}")
        for w in s.words or []:
            words.append({"w": w.word.strip(), "s": round(w.start, 2), "e": round(w.end, 2)})
    (wd / "a16.json").write_text(json.dumps({"words": words}, ensure_ascii=False))
    return words, lines


_FW = None


def copy_broll(pd, job, n=12):
    """Ảnh khung dọc từ các video bạn đã làm (kho assets/broll_lib) -> dùng cho quạt ảnh / dải ảnh / tường ảnh."""
    import random
    lib = sorted(BROLL_LIB.glob("*.jpg")) if BROLL_LIB.exists() else []
    if not lib:
        return []
    (pd / "broll").mkdir(exist_ok=True)
    out = []
    for f in random.sample(lib, min(n, len(lib))):
        shutil.copy(f, pd / "broll" / f.name)
        out.append(f"jobs/{job}/broll/{f.name}")
    return out


def cmd_broll_lib(args):
    """Quét video dọc thành phẩm trên máy, mỗi video lấy 1 khung -> assets/broll_lib (chạy 1 lần, chạy lại để làm mới)."""
    roots = [Path(a).expanduser() for a in args] or [Path.home() / "projects"]
    BROLL_LIB.mkdir(parents=True, exist_ok=True)
    seen = 0
    for r in roots:
        for f in sorted(r.rglob("*.mp4")):
            if "node_modules" in f.parts or "edit-am-cam" in f.parts or f.stat().st_size < 1_000_000:
                continue
            if not re.search(r"(final|done|output|thanh-pham|out)", str(f), re.I):
                continue
            wh = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", str(f)],
                                capture_output=True, text=True).stdout.strip().split(",")
            try:
                w, h = int(wh[0]), int(wh[1])
            except Exception:
                continue
            if h <= w:
                continue
            dst = BROLL_LIB / (slug(f.parent.name + "-" + f.stem) + ".jpg")
            if dst.exists():
                continue
            d = probe_dur(f)
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{d*0.35:.2f}", "-i", str(f), "-frames:v", "1", "-vf", "scale=360:-2", "-q:v", "4", str(dst)])
            seen += 1
            if seen >= 40:
                break
    print(f"Kho B-roll: {len(list(BROLL_LIB.glob('*.jpg')))} ảnh ở {BROLL_LIB}")
def speech_segments(src, noise="-34dB", d=0.2, pad=0.05):
    r = subprocess.run(["ffmpeg", "-i", str(src), "-af", f"silencedetect=noise={noise}:d={d}", "-f", "null", "-"],
                       capture_output=True, text=True)
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", r.stderr)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", r.stderr)]
    total = probe_dur(src)
    sil = list(zip(starts, ends + [total] * (len(starts) - len(ends))))
    segs, cur = [], 0.0
    for a, b in sil:
        if a - cur > 0.05:
            segs.append([max(0, cur - pad), min(total, a + pad)])
        cur = b
    if total - cur > 0.05:
        segs.append([max(0, cur - pad), total])
    merged = []
    for s in segs:
        if merged and s[0] - merged[-1][1] < 0.12:
            merged[-1][1] = s[1]
        else:
            merged.append(s)
    return merged, total


def cmd_new(args):
    if not args:
        sys.exit("Thiếu đường dẫn video thô")
    raw = Path(args[0]).expanduser().resolve()
    name = args[args.index("--name") + 1] if "--name" in args else raw.stem
    screens = Path(args[args.index("--screens") + 1]).expanduser() if "--screens" in args else None
    no_cut = "--no-cut" in args
    job = time.strftime("%Y%m%d-%H%M%S") + "-" + slug(name)
    wd, pd = WORK / job, PUB / job
    wd.mkdir(parents=True)
    (pd / "thumbs").mkdir(parents=True)
    print(f"[1/4] Chuẩn hoá 1080x1920 30fps -> {job}")
    norm = wd / "norm.mp4"
    vf = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,format=yuv420p"
    sh(["ffmpeg", "-v", "error", "-y", "-i", str(raw), "-map", "0:v:0", "-map", "0:a:0", "-vf", vf, "-c:v", "libx264", "-crf", "17", "-preset", "fast",
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", str(norm)])
    talk = pd / "talk.mp4"
    if no_cut:
        shutil.copy(norm, talk)
        segs = None
    else:
        print("[2/4] Cắt khoảng lặng (jump cut)")
        segs, total = speech_segments(norm)
        n = len(segs)
        parts = []
        fc = [f"[0:v]split={n}" + "".join(f"[iv{i}]" for i in range(n)) + f";[0:a]asplit={n}" + "".join(f"[ia{i}]" for i in range(n))] if n > 1 else []
        for i, (a, b) in enumerate(segs):
            vi, ai = (f"iv{i}", f"ia{i}") if n > 1 else ("0:v", "0:a")
            fc.append(f"[{vi}]trim={a:.3f}:{b:.3f},setpts=PTS-STARTPTS[v{i}];[{ai}]atrim={a:.3f}:{b:.3f},asetpts=PTS-STARTPTS[a{i}]")
            parts.append(f"[v{i}][a{i}]")
        fc.append("".join(parts) + f"concat=n={len(segs)}:v=1:a=1[v][a]")
        (wd / "cut.txt").write_text(";\n".join(fc))
        sh(["ffmpeg", "-v", "error", "-y", "-i", str(norm), "-filter_complex", (wd / "cut.txt").read_text(), "-map", "[v]", "-map", "[a]",
            "-c:v", "libx264", "-crf", "17", "-preset", "fast", "-r", "30", "-c:a", "aac", "-b:a", "192k", str(talk)])
        kept = sum(b - a for a, b in segs)
        print(f"     giữ {kept:.1f}s / {total:.1f}s ({len(segs)} đoạn)")
    print("[3/4] Bóc băng tiếng Việt theo từng từ (mlx_whisper)")
    words, lines = transcribe(wd, talk)
    dur = probe_dur(talk)
    # TỐC ĐỘ: video mẫu nói 5,3 từ/giây (giọng đã tăng tốc). Tự đưa về mức đó, tối đa x1,3, giữ cao độ.
    wps = len(words) / dur if dur else 0
    speed = float(args[args.index("--speed") + 1]) if "--speed" in args else min(1.3, max(1.0, TARGET_WPS / wps if wps else 1.0))
    if speed > 1.02:
        print(f"     tốc độ gốc {wps:.2f} từ/giây -> tăng x{speed:.2f} (mẫu {TARGET_WPS})")
        fast = wd / "talk_fast.mp4"
        sh(["ffmpeg", "-v", "error", "-y", "-i", str(talk), "-filter_complex", f"[0:v]setpts=PTS/{speed:.4f},fps=30[v];[0:a]atempo={speed:.4f}[a]",
            "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-crf", "17", "-preset", "fast", "-c:a", "aac", "-b:a", "192k", str(fast)])
        shutil.move(fast, talk)
        words, lines = transcribe(wd, talk)
        dur = probe_dur(talk)
    (wd / "words.json").write_text(json.dumps(words, ensure_ascii=False, indent=0))
    (wd / "transcript.txt").write_text("\n".join(lines))
    print("[4/4] Ảnh thumbnail + màn hình")
    for i in range(6):
        t = dur * (0.08 + 0.16 * i)
        sh(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", str(talk), "-frames:v", "1", "-vf", "scale=540:-1", "-q:v", "3",
            str(pd / "thumbs" / f"t{i+1}.jpg")])
    shots = []
    if screens and screens.exists():
        (pd / "screens").mkdir()
        for f in sorted(screens.iterdir()):
            if f.suffix.lower() in (".mp4", ".mov", ".m4v", ".webm", ".png", ".jpg", ".jpeg", ".webp"):
                dst = pd / "screens" / f.name.replace(" ", "_")
                if f.suffix.lower() in (".mov", ".m4v", ".webm"):
                    dst = dst.with_suffix(".mp4")
                    sh(["ffmpeg", "-v", "error", "-y", "-i", str(f), "-an", "-vf", "scale=1280:-2,fps=30", "-c:v", "libx264", "-crf", "20", str(dst)])
                else:
                    shutil.copy(f, dst)
                shots.append(f"jobs/{job}/screens/{dst.name}")
    plan = {"fps": FPS, "duration": round(dur, 2), "talk": f"jobs/{job}/talk.mp4", "scenes": [], "overlays": [], "sfx": [],
            "music": {"gen": True}, "speed": round(speed, 3), "faceY": 0.42, "captionY": 1250,
            "_assets": {"thumbs": [f"jobs/{job}/thumbs/t{i+1}.jpg" for i in range(6)], "screens": shots, "broll": copy_broll(pd, job)}}
    (wd / "plan.json").write_text(json.dumps(plan, ensure_ascii=False, indent=2))
    print(f"\nXONG. Job: {job}\n  thời lượng sau cắt: {dur:.2f}s\n  lời: {wd/'transcript.txt'}\n  từng từ: {wd/'words.json'}\n  plan cần viết: {wd/'plan.json'}")


# ---------------------------------------------------------------- check
def load_plan(job):
    wd = WORK / job
    if not wd.exists():
        cand = [d for d in WORK.iterdir() if job in d.name]
        if len(cand) != 1:
            sys.exit(f"Không tìm thấy job '{job}'")
        wd = cand[0]
    return wd, json.loads((wd / "plan.json").read_text())


def cmd_check(args):
    wd, p = load_plan(args[0])
    errs, warns = [], []
    D = p["duration"]
    sc = sorted(p["scenes"], key=lambda s: s["from"])
    if not sc:
        errs.append("chưa có cảnh nào")
    else:
        if sc[0]["from"] > 0.01:
            errs.append("cảnh đầu phải bắt đầu ở 0")
        for a, b in zip(sc, sc[1:]):
            if abs(a["to"] - b["from"]) > 0.02:
                errs.append(f"hở/chồng cảnh: {a['to']} -> {b['from']}")
        if abs(sc[-1]["to"] - D) > 0.05:
            errs.append(f"cảnh cuối phải kết thúc ở {D}")
    for s in sc:
        if s["layout"] == "split" and s.get("media") and not (ROOT / "public" / s["media"]).exists():
            errs.append(f"thiếu media {s['media']}")
        if s["to"] - s["from"] < 0.6:
            warns.append(f"cảnh {s['from']} quá ngắn")
    faces = sum(s["to"] - s["from"] for s in sc if s["layout"] == "face")
    if D and faces / D > 0.75:
        warns.append(f"bố cục face chiếm {faces/D:.0%} (mẫu ~55%): thêm split/dark")
    for o in p["overlays"]:
        if o["to"] > D + 0.01 or o["from"] < 0 or o["to"] <= o["from"]:
            errs.append(f"lớp {o['type']} {o['from']}-{o['to']} sai thời gian")
        if o["type"] == "caption":
            for l in o["lines"]:
                n = len(l["t"])
                lim = {"serif": 18, "big": 12}.get(l.get("s", "sans"), 30)
                if n > lim:
                    warns.append(f"dòng dài {n} ký tự (> {lim}): '{l['t']}'")
        if o["type"] == "floaters":
            for im in o["images"]:
                if not (ROOT / "public" / im).exists():
                    errs.append(f"thiếu ảnh {im}")
    # NHỊP HÌNH (mẫu: ~0,8 sự kiện/giây — mỗi 1–1,5 s có chữ/thẻ/nhảy zoom/đổi cảnh mới)
    evs = len(sc) + sum(len(s.get("punches", [])) for s in sc)
    for o in p["overlays"]:
        evs += len(o.get("lines", o.get("items", [1])))
    rate = evs / D if D else 0
    (errs if rate < 0.55 else warns if rate < 0.7 else []).append(f"nhịp hình {rate:.2f} sự kiện/giây (mẫu ~0,8, tối thiểu 0,7)")
    for s in sc:
        if s["layout"] == "face":
            marks = sorted([s["from"]] + [x["at"] for x in s.get("punches", [])] + [s["to"]])
            gap = max(b - a for a, b in zip(marks, marks[1:]))
            if gap > 4.0:
                warns.append(f"cảnh face {s['from']}-{s['to']}: {gap:.1f}s không nhảy zoom (mẫu ≤ 4s)")
    # khoảng trống không chữ
    covered = sorted([(o["from"], o["to"]) for o in p["overlays"]] + [(s["from"], s["to"]) for s in sc if s["layout"] in ("dark", "light") or s.get("tree")])
    t = 0
    for a, b in covered:
        if a - t > 3.0:
            warns.append(f"{t:.1f}-{a:.1f}s không có chữ ({a-t:.1f}s)")
        t = max(t, b)
    print("LỖI:" if errs else "Không lỗi.")
    for e in errs:
        print("  ✗", e)
    for w in warns:
        print("  !", w)
    return not errs


# ---------------------------------------------------------------- audio
# Giải mã âm thanh mẫu (demucs): giọng -15,4 LUFS, nền nhạc+SFX -26,9 LUFS => nhạc thấp hơn giọng ~11,5 LU.
# SFX mẫu là tiếng "ding" dịu có cao độ (hoạ âm 1,3–2,7 kHz), ~0,4 cái/giây, + whoosh ở chuyển cảnh.
DINGS = ["am_ding_e", "am_ding_g", "am_ding_b", "am_ding_d", "am_ding_g", "am_ding_lo"]
AUTO = {
    "scene": ("am_whoosh", 0.32), "dark": ("am_impact", 0.45), "light": ("am_ding_soft", 0.5),
    "ding": ("DING", 0.30), "big": ("DING", 0.38), "stamp": ("am_impact", 0.35), "tag": ("DING", 0.28),
    "flow": ("am_tick", 0.35), "check": ("DING", 0.3), "follow": ("am_ding_soft", 0.4), "click": ("am_tick", 0.5),
    "float": ("am_whoosh", 0.28), "type": ("typing_soft_2s", 0.3), "punch": ("am_whoosh_out", 0.18),
}


def auto_sfx(p):
    ev = []
    add = lambda t, k: ev.append((round(t, 3), *AUTO[k]))
    for i, s in enumerate(sorted(p["scenes"], key=lambda s: s["from"])):
        if i > 0 and s["layout"] != "face":
            add(s["from"] - 0.12, "scene")
        if s["layout"] == "dark":
            if s.get("big"):
                add(s["from"] + 0.2, "big")
            if s.get("compare"):
                add(s["compare"]["left"]["at"], "ding")
                add(s["compare"]["right"]["at"], "big")
            if s.get("doc"):
                add(s["doc"].get("typeAt", s["from"] + 0.6), "type")
        if s["layout"] == "light":
            add(s["from"] + 0.25, "light")
        if s.get("tree"):
            add(s["tree"]["rootAt"], "ding")
            for c in s["tree"]["children"]:
                add(c["at"], "tag")
        if s.get("card"):
            add(s["card"]["at"], "big")
        for u in (s.get("ui") or {}).get("steps", []):
            if u.get("at") is not None:
                add(u["at"], "click")
        for pu in s.get("punches", []):
            add(pu["at"] - 0.05, "punch")
    for o in p["overlays"]:
        t = o["type"]
        if t == "caption":
            for j, l in enumerate(o["lines"]):
                if l.get("s") in ("big", "serif") or l.get("pill"):
                    add(l.get("at", o["from"] + j * 0.35), "ding")
        elif t == "stamp":
            add(o["from"], "stamp")
        elif t == "pill":
            add(o["from"], "ding")
        elif t in ("tags", "checklist"):
            for it in o["items"]:
                add(it["at"], "tag")
        elif t == "flow":
            for it in o["items"]:
                add(it["at"], "flow")
        elif t == "progress":
            add(o["from"], "ding")
        elif t == "follow":
            add(o["from"], "follow")
            if "clickAt" in o:
                add(o["clickAt"], "click")
        elif t == "floaters":
            add(o["from"], "float")
    ev.sort()
    out, k = [], 0
    for e in ev:  # cách nhau tối thiểu 0,3 s như mẫu
        if out and e[0] - out[-1][0] < 0.3:
            continue
        name = e[1]
        if name == "DING":
            name = DINGS[k % len(DINGS)]
            k += 1
        out.append((e[0], name, e[2]))
    for m in p.get("sfx", []):
        out.append((m["at"], m["name"], m.get("vol", 0.5)))
    return out


def music_plan(p):
    """Drop đầu = cảnh không-face đầu tiên sau ~20% thời lượng (mẫu: 30/87s); break = cảnh light (con số chốt)."""
    D = p["duration"]
    m = p.get("music") or {}
    sc = sorted(p["scenes"], key=lambda s: s["from"])
    drops = m.get("drops")
    if drops is None:
        cand = [s["from"] for s in sc if s["from"] >= 0.18 * D and s["layout"] != "face"] or [s["from"] for s in sc if s["from"] >= 0.18 * D]
        drops = [cand[0]] if cand else [min(4.0, D / 3)]
    breaks = m.get("breaks")
    if breaks is None:
        breaks = [[s["from"], s["to"]] for s in sc if s["layout"] == "light" and s["from"] > drops[0]]
    return drops, breaks


def build_audio(wd, p, talk, out_wav):
    D = p["duration"]
    music = p.get("music") or {}
    if music.get("file"):
        mfile = MUSIC / music["file"]
        drops, breaks = [], []
    else:
        drops, breaks = music_plan(p)
        mfile = wd / "music_gen.wav"
        sh([sys.executable, "-I", str(ROOT / "audio_gen.py"), "music", str(mfile), f"{D + 0.5:.3f}", "--drops", ",".join(f"{x:.3f}" for x in drops),
            "--breaks", ",".join(f"{a:.3f}-{b:.3f}" for a, b in breaks), "--bpm", str(music.get("bpm", 129))], stdout=subprocess.DEVNULL)
    mlufs = music.get("lufs", -27.0)
    sfx = []
    for e in auto_sfx(p):
        f = SFX / f"{e[1]}.wav"
        f = f if f.exists() else SFX / f"{e[1]}.flac"
        if 0 <= e[0] < D and f.exists():
            sfx.append((e[0], f, e[2]))
    (wd / "sfx_used.json").write_text(json.dumps([(t, f.name, v) for t, f, v in sfx], ensure_ascii=False, indent=0))
    (wd / "music_used.json").write_text(json.dumps({"drops": drops, "breaks": breaks, "file": str(mfile)}, ensure_ascii=False))
    inputs = ["-i", str(talk), "-stream_loop", "-1", "-i", str(mfile)]
    fc = [
        "[0:a]aresample=48000,highpass=f=80,acompressor=threshold=-22dB:ratio=4:attack=4:release=90:makeup=3,loudnorm=I=-15:TP=-1.5:LRA=4,asplit=2[voice][key]",
        f"[1:a]aresample=48000,atrim=0:{D:.3f},loudnorm=I={mlufs}:TP=-6:LRA=11,afade=t=in:d=0.3,afade=t=out:st={max(0, D-1.2):.3f}:d=1.2[mus]",
        "[mus][key]sidechaincompress=threshold=0.06:ratio=2.5:attack=30:release=300[duck]",
    ]
    labels = ["[voice]", "[duck]"]
    for k, (t, f, vol) in enumerate(sfx):
        inputs += ["-i", str(f)]
        ms = int(max(0, t) * 1000)
        fc.append(f"[{k+2}:a]aresample=48000,aformat=channel_layouts=stereo,volume={vol},adelay={ms}|{ms}[s{k}]")
        labels.append(f"[s{k}]")
    fc.append("".join(labels) + f"amix=inputs={len(labels)}:normalize=0:duration=longest,apad=whole_dur={D:.3f},atrim=0:{D:.3f}[mix]")
    fc.append("[mix]loudnorm=I=-14:TP=-1:LRA=6[out]")
    (wd / "mix.txt").write_text(";\n".join(fc))
    sh(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", (wd / "mix.txt").read_text(), "-map", "[out]", "-ar", "48000", str(out_wav)])
    print(f"     nhạc: drop {drops} break {breaks}")
    return len(sfx)


# ---------------------------------------------------------------- render
def remotion_extra():
    """Máy chủ Linux: EAC_BROWSER=/đường/dẫn/chromium (tuỳ chọn), EAC_CONCURRENCY=số luồng dựng."""
    x = []
    if os.environ.get("EAC_BROWSER"):
        x += [f"--browser-executable={os.environ['EAC_BROWSER']}"]
    if os.environ.get("EAC_CONCURRENCY"):
        x += [f"--concurrency={os.environ['EAC_CONCURRENCY']}"]
    return x


def props_file(wd, p):
    pf = wd / "props.json"
    clean = {k: v for k, v in p.items() if not k.startswith("_") or k == "_assets"}
    pf.write_text(json.dumps(clean, ensure_ascii=False))
    return pf


def cmd_render(args):
    wd, p = load_plan(args[0])
    preview = "--preview" in args
    if not cmd_check([wd.name]):
        sys.exit("Sửa plan.json trước khi dựng.")
    pf = props_file(wd, p)
    vid = wd / ("video_preview.mp4" if preview else "video.mp4")
    print("[1/3] Dựng hình (Remotion)")
    cmd = ["npx", "remotion", "render", "src/index.ts", "Main", str(vid), f"--props={pf}", "--muted", "--codec=h264", "--crf=18"]
    if preview:
        cmd += ["--scale=0.5"]
    cmd += remotion_extra()
    sh(cmd, cwd=ROOT)
    print("[2/3] Trộn âm: giọng + nhạc nền tự hạ + SFX, chuẩn -14 LUFS")
    wav = wd / "mix.wav"
    n = build_audio(wd, p, ROOT / "public" / p["talk"], wav)
    print(f"     {n} hiệu ứng âm thanh")
    print("[3/3] Ghép")
    DONE.mkdir(exist_ok=True)
    out = DONE / f"{wd.name}{'-preview' if preview else ''}.mp4"
    sh(["ffmpeg", "-v", "error", "-y", "-i", str(vid), "-i", str(wav), "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
        "-movflags", "+faststart", "-shortest", str(out)])
    print(f"\nTHÀNH PHẨM: {out}")


def cmd_still(args):
    wd, p = load_plan(args[0])
    pf = props_file(wd, p)
    (wd / "stills").mkdir(exist_ok=True)
    for s in args[1:]:
        fr = int(float(s) * FPS)
        sh(["npx", "remotion", "still", "src/index.ts", "Main", str(wd / "stills" / f"{s}.jpg"), f"--props={pf}", f"--frame={fr}",
            "--image-format=jpeg", "--scale=0.5", *remotion_extra()], cwd=ROOT, stdout=subprocess.DEVNULL)
    print(f"Ảnh ở {wd/'stills'}")


def cmd_studio(args):
    wd, p = load_plan(args[0])
    pf = props_file(wd, p)
    os.chdir(ROOT)
    os.execvp("npx", ["npx", "remotion", "studio", "src/index.ts", f"--props={pf}"])


def cmd_list(_):
    for d in sorted(WORK.iterdir()):
        if d.is_dir():
            done = (DONE / f"{d.name}.mp4").exists()
            print(("✓ " if done else "· ") + d.name)


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        print(__doc__)
        sys.exit(0)
    c, a = sys.argv[1], sys.argv[2:]
    {"new": cmd_new, "check": cmd_check, "render": cmd_render, "still": cmd_still, "studio": cmd_studio, "list": cmd_list, "broll-lib": cmd_broll_lib}.get(
        c, lambda _: sys.exit(f"Lệnh lạ: {c}"))(a)
