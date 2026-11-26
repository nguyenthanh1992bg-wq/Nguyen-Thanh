"""Đăng video lên Fanpage Facebook bằng Graph API (Reels cho video dọc <= 90 s, còn lại đăng video thường).
LƯU Ý: Facebook chỉ cho đăng tự động lên FANPAGE (Page) bằng Page Access Token — không đăng được lên trang cá nhân."""
import time
from pathlib import Path
import requests
from .config import C


class FacebookError(RuntimeError):
    pass


def _check(r):
    try:
        j = r.json()
    except Exception:
        raise FacebookError(f"HTTP {r.status_code}: {r.text[:300]}")
    if r.status_code >= 400 or "error" in j:
        raise FacebookError(str(j.get("error", j))[:500])
    return j


def post_reel(path, description, duration):
    g = f"https://graph.facebook.com/{C.fb_version}/{C.fb_page_id}/video_reels"
    tok = {"access_token": C.fb_token}
    j = _check(requests.post(g, data={**tok, "upload_phase": "start"}, timeout=60))
    vid, upload_url = j["video_id"], j["upload_url"]
    size = Path(path).stat().st_size
    with open(path, "rb") as f:
        r = requests.post(upload_url, data=f, timeout=1800,
                          headers={"Authorization": f"OAuth {C.fb_token}", "offset": "0", "file_size": str(size), "Content-Type": "application/octet-stream"})
    _check(r)
    _check(requests.post(g, data={**tok, "upload_phase": "finish", "video_id": vid, "video_state": "PUBLISHED", "description": description}, timeout=60))
    for _ in range(40):  # chờ Facebook xử lý xong
        s = requests.get(f"https://graph.facebook.com/{C.fb_version}/{vid}", params={**tok, "fields": "status,permalink_url"}, timeout=30).json()
        st = (s.get("status") or {}).get("video_status")
        if st in ("ready", "published"):
            return vid, "https://www.facebook.com" + (s.get("permalink_url") or f"/reel/{vid}")
        if st == "error":
            raise FacebookError(f"Facebook xử lý lỗi: {s}")
        time.sleep(15)
    return vid, f"https://www.facebook.com/reel/{vid}"


def post_video(path, description, duration):
    if C.fb_dry_run:
        return "DRY_RUN", "https://facebook.com/(chế độ thử, chưa đăng thật)"
    if not (C.fb_page_id and C.fb_token):
        raise FacebookError("Chưa cấu hình FB_PAGE_ID / FB_PAGE_ACCESS_TOKEN trong .env")
    if duration <= 90:
        return post_reel(path, description, duration)
    with open(path, "rb") as f:
        j = _check(requests.post(f"https://graph-video.facebook.com/{C.fb_version}/{C.fb_page_id}/videos",
                                 data={"access_token": C.fb_token, "description": description}, files={"source": f}, timeout=3600))
    return j["id"], f"https://www.facebook.com/{j['id']}"


def insights(video_id):
    """Số liệu để bộ não học: lượt xem, tim, bình luận."""
    if video_id == "DRY_RUN" or not C.fb_token:
        return None
    try:
        j = requests.get(f"https://graph.facebook.com/{C.fb_version}/{video_id}",
                         params={"access_token": C.fb_token, "fields": "views,likes.summary(true).limit(0),comments.summary(true).limit(0)"}, timeout=30).json()
        if "error" in j:
            return {"error": str(j["error"])[:200]}
        return {"views": j.get("views"), "likes": (j.get("likes") or {}).get("summary", {}).get("total_count"),
                "comments": (j.get("comments") or {}).get("summary", {}).get("total_count")}
    except Exception as e:
        return {"error": str(e)}
