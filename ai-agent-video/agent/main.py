"""AI AGENT EDIT VIDEO — vòng lặp chính.
  python -m agent.main            chạy thường trực (quét Drive 30 phút/lần, đăng 08:00 + 20:00, Telegram)
  python -m agent.main check      kiểm tra kết nối Drive / Telegram / Facebook / Claude rồi thoát
  python -m agent.main scan       quét + dựng ngay một lượt rồi thoát"""
import shutil
from pathlib import Path
import sys
import threading
import time
import traceback
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from .config import C, DATA, DOWNLOADS, ENGINE
from . import brain, editor, facebook, llm, state
from .telegram_bot import Telegram

HELP = """Lệnh:
/status – tình trạng agent
/queue – hàng đợi video
/scan – quét Drive ngay
/post – đăng video kế tiếp ngay
/pause, /resume – tạm dừng / chạy tiếp (quét + đăng)
/brain – xem bộ não (luật đã học)
/rollback – hoàn tác lần học gần nhất
/retry – chạy lại các video lỗi
/feedback <nhận xét> – dạy agent (hoặc cứ nhắn thẳng nhận xét, không cần gõ lệnh)"""


class Agent:
    def __init__(self):
        self.tz = ZoneInfo(C.tz)
        self.tg = Telegram(self.on_command)
        self.drive = None
        self.edit_lock = threading.Lock()
        self.post_lock = threading.Lock()
        self.current = None

    # ------------------------------------------------------------ tiện ích
    def now(self):
        return datetime.now(self.tz)

    def log(self, m):
        print(f"[{self.now():%m-%d %H:%M:%S}] {m}", flush=True)

    def say(self, m):
        self.log(m)
        self.tg.send(m)

    def get_drive(self):
        if self.drive is None:
            from .drive import Drive
            self.drive = Drive()
        return self.drive

    def backup_brain(self):
        try:
            d = self.get_drive()
            for fn in ("BRAIN.md", "lessons.json", "history.jsonl"):
                p = brain.BRAIN_DIR / fn
                if p.exists():
                    d.upsert_text(fn, p.read_text(encoding="utf-8"), C.drive_brain)
            st = state.FILE
            if st.exists():
                d.upsert_text("state.json", st.read_text(encoding="utf-8"), C.drive_brain)
        except Exception as e:
            self.log(f"sao lưu bộ não lỗi: {e}")

    def restore_brain(self):
        """Máy mới / mất ổ đĩa: lấy lại bộ não + state từ Drive."""
        try:
            if brain.LESSONS.exists():
                return
            d = self.get_drive()
            brain._ensure()
            for fn, dst in (("lessons.json", brain.LESSONS), ("history.jsonl", brain.HISTORY), ("BRAIN.md", brain.BRAIN_MD), ("state.json", state.FILE)):
                t = d.read_text(fn, C.drive_brain)
                if t and not dst.exists():
                    dst.write_text(t, encoding="utf-8")
                    self.log(f"khôi phục {fn} từ Drive")
        except Exception as e:
            self.log(f"khôi phục bộ não: {e}")

    # ------------------------------------------------------------ quét + dựng
    def scan(self, manual=False):
        if state.load().get("paused") and not manual:
            return
        if not self.edit_lock.acquire(blocking=False):
            if manual:
                self.say(f"Đang bận dựng: {self.current}")
            return
        try:
            d = self.get_drive()
            st = state.load()
            known = {k for k, v in st["videos"].items() if v["status"] not in ("retry",)}
            found = d.new_videos(known)
            state.update(lambda s: s.__setitem__("last_scan", self.now().strftime("%Y-%m-%d %H:%M:%S")))
            if not found:
                if manual:
                    self.say("Quét xong: không có video mới.")
                return
            self.say(f"📥 Phát hiện {len(found)} video mới: " + ", ".join(f["name"] for f in found))
            for f in found:
                self.process(f)
        except Exception as e:
            self.log(traceback.format_exc())
            self.say(f"⚠️ Lỗi khi quét Drive: {e}")
        finally:
            self.edit_lock.release()

    def process(self, f):
        sid, name = f["id"], f["name"]
        tries = state.load()["videos"].get(sid, {}).get("tries", 0) + 1
        state.set_video(sid, status="processing", name=name, tries=tries)
        self.current = name
        raw = None
        try:
            d = self.get_drive()
            self.say(f"⬇️ Tải về: {name} ({int(f.get('size', 0)) / 1e6:.0f} MB)")
            raw = d.download(f, DOWNLOADS)
            res = editor.edit(raw, name, notify=self.log)
            out_name = f"{raw.stem}_AMCAM_{self.now():%Y%m%d-%H%M}.mp4"
            self.say("⬆️ Upload thành phẩm lên Drive…")
            up = d.upload(res["final"], out_name, C.drive_out)
            ready_dir = DATA / "ready"
            ready_dir.mkdir(parents=True, exist_ok=True)
            ready = ready_dir / out_name
            shutil.copy(res["final"], ready)
            m = res["metrics"]
            state.set_video(sid, status="ready", job=res["job"], out_id=up["id"], out_link=up.get("webViewLink"), ready_path=str(ready),
                            duration=m["duration"], transcript=res["transcript"][:4000])
            self.say(f"✅ Dựng xong: {out_name}\n⏱ {m['duration']:.0f}s · face {m['face_pct']:.0f}% · nhịp {m['rate']:.2f}/s · QA {m['qa_score']}/10 · "
                     f"render {m['render_sec']}s\n📁 {up.get('webViewLink', '')}")
            brain.append_history(m)
            summ, changes = brain.reflect("edit", {"metrics": m, "qa": res["qa"], "plan_sketch": _sketch(res["plan"])})
            self.backup_brain()
            self.tg.send("🧠 Bộ não vừa học:\n" + summ + ("\n" + "\n".join(changes[:8]) if changes else ""))
            editor.cleanup(C.keep_jobs)
        except Exception as e:
            self.log(traceback.format_exc())
            final = tries >= C.max_retries
            state.set_video(sid, status="failed" if final else "retry", error=str(e)[:500])
            self.say(f"❌ Lỗi dựng {name} (lần {tries}/{C.max_retries}): {str(e)[:600]}" + ("\nĐã bỏ qua. Gõ /retry để thử lại." if final else "\nSẽ thử lại ở lượt quét sau."))
        finally:
            self.current = None
            if raw:
                raw.unlink(missing_ok=True)

    # ------------------------------------------------------------ đăng Facebook
    def pick_ready(self):
        vs = [(v.get("updated", ""), k, v) for k, v in state.load()["videos"].items() if v["status"] == "ready"]
        return sorted(vs)[0] if vs else None

    def caption(self, v):
        try:
            return llm.ask("Bạn viết caption Facebook tiếng Việt cho Page doanh nghiệp, giọng tự nhiên, tối đa 3 câu + 4-6 hashtag liên quan. Chỉ trả về caption, không giải thích, không bịa số liệu.",
                           "Nội dung video (lời nói):\n" + v.get("transcript", ""), C.brain_model, max_tokens=500).strip()
        except Exception:
            return (v.get("transcript", "")[:200]).strip()

    def post_next(self, slot_label="thủ công"):
        if not self.post_lock.acquire(blocking=False):
            return
        try:
            pick = self.pick_ready()
            if not pick:
                self.say(f"📭 Slot {slot_label}: không có video nào chờ đăng.")
                return False
            _, sid, v = pick
            path = v.get("ready_path")
            if not path or not Path(path).exists():
                self.log("file local mất, tải lại từ Drive")
                path = str(self.get_drive().download({"id": v["out_id"], "name": f"{sid}.mp4"}, DATA / "ready"))
            cap = self.caption(v)
            try:
                vid, link = facebook.post_video(path, cap, v.get("duration", 60))
            except Exception as e:
                n = v.get("post_tries", 0) + 1
                state.set_video(sid, post_tries=n, post_error=str(e)[:300])
                self.say(f"❌ Đăng Facebook lỗi (lần {n}): {e}")
                if n >= 3:
                    state.set_video(sid, status="post_failed")
                return False
            state.set_video(sid, status="posted", fb_id=vid, fb_link=link, posted_at=self.now().isoformat(), caption=cap)
            self.say(f"📣 ĐÃ ĐĂNG (slot {slot_label}) lên fanpage\n🎬 {v.get('name')}\n🔗 {link}\n📝 {cap[:300]}\n📦 Còn chờ đăng: {len([1 for x in state.load()['videos'].values() if x['status'] == 'ready'])} video")
            return True
        finally:
            self.post_lock.release()

    def check_slots(self):
        st = state.load()
        if st.get("paused"):
            return
        n = self.now()
        for t in C.post_times:
            h, m = map(int, t.split(":"))
            slot = n.replace(hour=h, minute=m, second=0, microsecond=0)
            key = slot.strftime("%Y-%m-%d %H:%M")
            if slot <= n < slot + timedelta(minutes=C.post_grace_min) and key not in st["slots"]:
                state.update(lambda s: s["slots"].__setitem__(key, "running"))
                ok = self.post_next(t)
                state.update(lambda s: s["slots"].__setitem__(key, "done" if ok is not False else "failed"))

    def check_insights(self):
        for sid, v in list(state.load()["videos"].items()):
            if v["status"] != "posted" or v.get("fb_checked") or not v.get("posted_at"):
                continue
            if self.now() - datetime.fromisoformat(v["posted_at"]) < timedelta(hours=24):
                continue
            ins = facebook.insights(v.get("fb_id"))
            state.set_video(sid, fb_checked=True, fb_insights=ins)
            if not ins or "error" in ins:
                continue
            brain.update_history(v["job"], fb=ins)
            summ, ch = brain.reflect("facebook", {"job": v["job"], "insights_24h": ins, "caption": v.get("caption"), "transcript": v.get("transcript", "")[:800]})
            self.backup_brain()
            self.tg.send(f"📊 Sau 24h: {v.get('name')}\n👁 {ins.get('views')} · 👍 {ins.get('likes')} · 💬 {ins.get('comments')}\n🧠 {summ}")

    # ------------------------------------------------------------ Telegram
    def on_command(self, text):
        cmd, _, arg = text.partition(" ")
        cmd = cmd.lower().split("@")[0]
        st = state.load()
        if cmd in ("/start", "/help"):
            self.tg.send("Chào chị Thanh! AI Agent edit video Ấm Cam đã sẵn sàng.\n" + HELP)
        elif cmd == "/status":
            c = {}
            for v in st["videos"].values():
                c[v["status"]] = c.get(v["status"], 0) + 1
            self.tg.send(f"{'⏸ ĐANG TẠM DỪNG' if st.get('paused') else '▶️ Đang chạy'}\nĐang dựng: {self.current or '—'}\nQuét gần nhất: {st.get('last_scan')}\n"
                         f"Trạng thái: {c}\nGiờ đăng: {', '.join(C.post_times)} ({C.tz})\nBộ não: {len(brain.load_lessons())} luật")
        elif cmd == "/queue":
            rows = [f"{v['status']:<10} {v.get('name', k)}" for k, v in sorted(st["videos"].items(), key=lambda kv: kv[1].get("updated", ""))[-15:]]
            self.tg.send("\n".join(rows) or "Chưa có video nào.")
        elif cmd == "/scan":
            threading.Thread(target=self.scan, args=(True,), daemon=True).start()
            self.tg.send("🔎 Đang quét Drive…")
        elif cmd == "/post":
            threading.Thread(target=self.post_next, daemon=True).start()
        elif cmd in ("/pause", "/resume"):
            state.update(lambda s: s.__setitem__("paused", cmd == "/pause"))
            self.tg.send("⏸ Đã tạm dừng." if cmd == "/pause" else "▶️ Đã chạy tiếp.")
        elif cmd == "/brain":
            ls = sorted(brain.load_lessons(), key=lambda l: -l.get("confidence", 0))[:12]
            self.tg.send("🧠 BỘ NÃO\n" + ("\n".join(f"{l['id']} ({l.get('confidence', 0):.1f}) {l['rule']}" for l in ls) or "Chưa học gì — sẽ học sau video đầu tiên.") + f"\n\nFile đầy đủ: {brain.BRAIN_MD}")
        elif cmd == "/rollback":
            self.tg.send("↩️ Đã hoàn tác." if brain.rollback() else "Không có phiên bản cũ.")
        elif cmd == "/retry":
            n = 0
            for k, v in st["videos"].items():
                if v["status"] in ("failed", "post_failed"):
                    state.set_video(k, status="retry" if v["status"] == "failed" else "ready", tries=0, post_tries=0)
                    n += 1
            self.tg.send(f"Đã xếp lại {n} video.")
        else:
            fb = arg if cmd == "/feedback" else text
            if not fb.strip():
                return self.tg.send("Gõ: /feedback <nhận xét>")
            def learn():
                s, ch = brain.reflect("owner_feedback", {"feedback": fb, "recent_jobs": [v.get("job") for v in list(st["videos"].values())[-3:]]})
                self.backup_brain()
                self.tg.send("🧠 Đã ghi nhớ: " + s + ("\n" + "\n".join(ch[:6]) if ch else ""))
            threading.Thread(target=learn, daemon=True).start()

    # ------------------------------------------------------------ vòng chính
    def run(self):
        DATA.mkdir(parents=True, exist_ok=True)
        self.tg.start()
        self.restore_brain()
        brain.render_md()
        self.say(f"🚀 Agent khởi động. Quét Drive mỗi {C.scan_minutes} phút · đăng {', '.join(C.post_times)} ({C.tz}).")
        next_scan, last_ins = 0, 0
        while True:
            try:
                if time.time() >= next_scan:
                    next_scan = time.time() + C.scan_minutes * 60
                    threading.Thread(target=self.scan, daemon=True).start()
                self.check_slots()
                if time.time() - last_ins > 1800:
                    last_ins = time.time()
                    self.check_insights()
            except Exception:
                self.log(traceback.format_exc())
            time.sleep(30)


def _sketch(plan):
    return {"scenes": [(s["layout"], round(s["from"], 1), round(s["to"], 1)) for s in plan["scenes"]],
            "overlay_types": [o["type"] for o in plan["overlays"]], "ui": [s.get("ui", {}).get("kind") for s in plan["scenes"] if s.get("ui")]}


def check_connections():
    ok = True
    def t(name, fn):
        nonlocal ok
        try:
            print(f"✓ {name}: {fn()}")
        except Exception as e:
            ok = False
            print(f"✗ {name}: {e}")
    import requests
    def drive():
        from .drive import Drive
        d = Drive()
        return f"vào={d.folder_id(C.drive_in)} ra={d.folder_id(C.drive_out, create=True)}"
    t("Google Drive", drive)
    t("Telegram", lambda: requests.get(f"https://api.telegram.org/bot{C.tg_token}/getMe", timeout=20).json()["result"]["username"])
    t("Facebook Page", lambda: requests.get(f"https://graph.facebook.com/{C.fb_version}/{C.fb_page_id}", params={"fields": "name", "access_token": C.fb_token}, timeout=20).json()["name"])
    t("Claude API", lambda: llm.ask("Trả lời 1 từ.", "Nói OK", C.brain_model, max_tokens=10))
    t("ffmpeg", lambda: shutil.which("ffmpeg") or (_ for _ in ()).throw(RuntimeError("thiếu")))
    t("Remotion (node_modules)", lambda: "ok" if (ENGINE / "node_modules").exists() else (_ for _ in ()).throw(RuntimeError("chạy setup.sh")))
    return ok


if __name__ == "__main__":
    a = sys.argv[1] if len(sys.argv) > 1 else "run"
    if a == "check":
        sys.exit(0 if check_connections() else 1)
    ag = Agent()
    if a == "scan":
        ag.restore_brain()
        ag.scan(manual=True)
    else:
        ag.run()
