"""Telegram bot (long polling, chỉ nghe đúng TELEGRAM_CHAT_ID)."""
import threading
import time
import requests
from .config import C
from . import state


class Telegram:
    def __init__(self, on_command):
        self.base = f"https://api.telegram.org/bot{C.tg_token}"
        self.on_command = on_command
        self.enabled = bool(C.tg_token)

    def send(self, text, chat=None):
        if not self.enabled:
            print("[telegram off]", text)
            return
        chat = chat or C.tg_chat
        if not chat:
            print("[telegram chưa có CHAT_ID]", text)
            return
        for i in range(0, len(text), 3900):
            try:
                requests.post(f"{self.base}/sendMessage", json={"chat_id": chat, "text": text[i:i + 3900], "disable_web_page_preview": True}, timeout=30)
            except Exception as e:
                print("telegram lỗi gửi:", e)

    def send_photo(self, path, caption=""):
        if not (self.enabled and C.tg_chat):
            return
        try:
            with open(path, "rb") as f:
                requests.post(f"{self.base}/sendPhoto", data={"chat_id": C.tg_chat, "caption": caption[:900]}, files={"photo": f}, timeout=60)
        except Exception as e:
            print("telegram lỗi ảnh:", e)

    def poll_forever(self):
        if not self.enabled:
            return
        while True:
            try:
                off = state.load().get("tg_offset", 0)
                r = requests.get(f"{self.base}/getUpdates", params={"offset": off, "timeout": 50}, timeout=60).json()
                for u in r.get("result", []):
                    state.update(lambda st: st.__setitem__("tg_offset", u["update_id"] + 1))
                    m = u.get("message") or {}
                    text = (m.get("text") or "").strip()
                    cid = str((m.get("chat") or {}).get("id", ""))
                    if not text:
                        continue
                    if not C.tg_chat:  # chưa cấu hình: trả lời chat id để người dùng điền vào .env
                        self.send(f"Chat ID của bạn: {cid}\nĐiền vào .env: TELEGRAM_CHAT_ID={cid} rồi khởi động lại agent.", cid)
                        continue
                    if cid != str(C.tg_chat):
                        continue
                    try:
                        self.on_command(text)
                    except Exception as e:
                        self.send(f"Lỗi khi xử lý lệnh: {e}")
            except Exception as e:
                print("telegram poll lỗi:", e)
                time.sleep(5)

    def start(self):
        threading.Thread(target=self.poll_forever, daemon=True, name="telegram").start()
