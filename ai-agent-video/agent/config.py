"""Cấu hình: đọc .env (hoặc biến môi trường)."""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENGINE = ROOT / "engine" / "edit-am-cam"
SKILL_DIR = ROOT / "skill" / "video-edit-am-cam-tutorial"
DATA = Path(os.environ.get("AGENT_DATA", ROOT / "data"))
BRAIN_DIR = DATA / "brain"
DOWNLOADS = DATA / "downloads"


def _load_env():
    f = ROOT / ".env"
    if f.exists():
        for line in f.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_load_env()


def env(name, default=""):
    return os.environ.get(name, default)


class C:
    tz = env("TZ_NAME", "Asia/Ho_Chi_Minh")
    scan_minutes = int(env("SCAN_INTERVAL_MIN", "30"))
    post_times = [t.strip() for t in env("POST_TIMES", "08:00,20:00").split(",") if t.strip()]
    post_grace_min = int(env("POST_GRACE_MIN", "90"))  # trễ tối đa bao nhiêu phút vẫn đăng bù

    drive_in = env("DRIVE_IN_PATH", "AI AGENT VIDEO/VIDEO QUAY THÔ")
    drive_out = env("DRIVE_OUT_PATH", "AI AGENT VIDEO/VIDEO AI AGENT DỰNG XONG")
    drive_brain = env("DRIVE_BRAIN_PATH", "AI AGENT VIDEO/BỘ NÃO AGENT")
    drive_client_secret = env("GOOGLE_CLIENT_SECRET_FILE", str(ROOT / "secrets" / "client_secret.json"))
    drive_token = env("GOOGLE_TOKEN_FILE", str(ROOT / "secrets" / "drive_token.json"))
    min_age_sec = int(env("DRIVE_MIN_AGE_SEC", "90"))  # file mới sửa < 90s coi như đang upload dở

    tg_token = env("TELEGRAM_BOT_TOKEN")
    tg_chat = env("TELEGRAM_CHAT_ID")  # chỉ chat này được điều khiển bot

    fb_page_id = env("FB_PAGE_ID")
    fb_token = env("FB_PAGE_ACCESS_TOKEN")
    fb_version = env("FB_GRAPH_VERSION", "v21.0")
    fb_dry_run = env("FB_DRY_RUN", "0") == "1"

    anthropic_key = env("ANTHROPIC_API_KEY")
    plan_model = env("PLAN_MODEL", "claude-sonnet-5-5")
    brain_model = env("BRAIN_MODEL", "claude-sonnet-5-5")
    qa_vision = env("QA_VISION", "1") == "1"
    qa_autofix = env("QA_AUTOFIX", "1") == "1"
    qa_min_score = float(env("QA_MIN_SCORE", "7"))

    max_retries = int(env("MAX_RETRIES", "3"))
    keep_jobs = int(env("KEEP_JOBS", "4"))
