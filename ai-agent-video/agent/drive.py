"""Google Drive: quét thư mục quay thô, tải về, upload thành phẩm (OAuth người dùng, refresh token)."""
import io
import time
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

from .config import C

SCOPES = ["https://www.googleapis.com/auth/drive"]
FOLDER = "application/vnd.google-apps.folder"


def _norm(s):
    return " ".join(unicodedata.normalize("NFC", s).casefold().split())


class Drive:
    def __init__(self):
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build
        tf = Path(C.drive_token)
        if not tf.exists():
            raise RuntimeError(f"Chưa có {tf}. Chạy: python -m agent.auth_drive (một lần, trên máy có trình duyệt)")
        creds = Credentials.from_authorized_user_file(str(tf), SCOPES)
        if not creds.valid:
            creds.refresh(Request())
            tf.write_text(creds.to_json())
        self.svc = build("drive", "v3", credentials=creds, cache_discovery=False)
        self._cache = {}

    # ---- thư mục theo đường dẫn "A/B/C" (bỏ khoảng trắng thừa, không phân biệt hoa/thường)
    def folder_id(self, path, create=False):
        if path in self._cache:
            return self._cache[path]
        parent = "root"
        for part in [p for p in path.split("/") if p.strip()]:
            kids = self._list(f"'{parent}' in parents and mimeType='{FOLDER}' and trashed=false")
            hit = next((k for k in kids if _norm(k["name"]) == _norm(part)), None)
            if not hit:
                if not create:
                    raise RuntimeError(f"Không thấy thư mục '{part}' trong đường dẫn '{path}' trên Google Drive")
                hit = self.svc.files().create(body={"name": part.strip(), "mimeType": FOLDER, "parents": [parent]}, fields="id,name").execute()
            parent = hit["id"]
        self._cache[path] = parent
        return parent

    def _list(self, q, fields="id,name,mimeType,size,modifiedTime,md5Checksum"):
        out, tok = [], None
        while True:
            r = self.svc.files().list(q=q, fields=f"nextPageToken,files({fields})", pageSize=200, pageToken=tok,
                                      supportsAllDrives=True, includeItemsFromAllDrives=True).execute()
            out += r.get("files", [])
            tok = r.get("nextPageToken")
            if not tok:
                return out

    def new_videos(self, known_ids):
        """Video trong thư mục quay thô mà agent chưa biết và đã upload xong (không còn thay đổi)."""
        fid = self.folder_id(C.drive_in)
        res = []
        now = datetime.now(timezone.utc)
        for f in self._list(f"'{fid}' in parents and trashed=false and mimeType!='{FOLDER}'"):
            if not (f["mimeType"].startswith("video/") or f["name"].lower().endswith((".mp4", ".mov", ".m4v", ".mkv", ".webm"))):
                continue
            if f["id"] in known_ids:
                continue
            age = (now - datetime.fromisoformat(f["modifiedTime"].replace("Z", "+00:00"))).total_seconds()
            if age < C.min_age_sec or int(f.get("size", 0)) == 0:
                continue
            res.append(f)
        return sorted(res, key=lambda f: f["modifiedTime"])

    def download(self, f, dest_dir):
        from googleapiclient.http import MediaIoBaseDownload
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / f["name"].replace("/", "_")
        with open(dest, "wb") as fh:
            req = self.svc.files().get_media(fileId=f["id"], supportsAllDrives=True)
            dl = MediaIoBaseDownload(fh, req, chunksize=32 * 1024 * 1024)
            done = False
            while not done:
                _, done = dl.next_chunk(num_retries=3)
        if f.get("size") and dest.stat().st_size != int(f["size"]):
            raise RuntimeError(f"Tải thiếu: {dest.stat().st_size}/{f['size']} byte")
        return dest

    def upload(self, path, name, folder_path, mime="video/mp4"):
        from googleapiclient.http import MediaFileUpload
        fid = self.folder_id(folder_path, create=True)
        media = MediaFileUpload(str(path), mimetype=mime, resumable=True, chunksize=16 * 1024 * 1024)
        req = self.svc.files().create(body={"name": name, "parents": [fid]}, media_body=media, fields="id,name,webViewLink", supportsAllDrives=True)
        resp = None
        while resp is None:
            _, resp = req.next_chunk(num_retries=5)
        return resp

    def upsert_text(self, name, text, folder_path):
        """Sao lưu file nhỏ (bộ não) lên Drive: ghi đè nếu đã có."""
        from googleapiclient.http import MediaIoBaseUpload
        fid = self.folder_id(folder_path, create=True)
        media = MediaIoBaseUpload(io.BytesIO(text.encode("utf-8")), mimetype="text/plain")
        ex = self._list(f"'{fid}' in parents and name='{name}' and trashed=false")
        if ex:
            self.svc.files().update(fileId=ex[0]["id"], media_body=media, supportsAllDrives=True).execute()
        else:
            self.svc.files().create(body={"name": name, "parents": [fid]}, media_body=media, supportsAllDrives=True).execute()

    def read_text(self, name, folder_path):
        try:
            fid = self.folder_id(folder_path)
        except RuntimeError:
            return None
        ex = self._list(f"'{fid}' in parents and name='{name}' and trashed=false")
        if not ex:
            return None
        return self.svc.files().get_media(fileId=ex[0]["id"], supportsAllDrives=True).execute().decode("utf-8")
