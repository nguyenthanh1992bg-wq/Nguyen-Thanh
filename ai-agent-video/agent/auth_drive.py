"""Chạy MỘT LẦN trên máy có trình duyệt: cấp quyền Google Drive -> tạo secrets/drive_token.json (rồi chép lên máy chủ).
   python -m agent.auth_drive
Cần secrets/client_secret.json (Google Cloud Console -> APIs & Services -> Credentials -> OAuth client ID, loại Desktop app, bật Drive API)."""
from pathlib import Path
from google_auth_oauthlib.flow import InstalledAppFlow
from .config import C
from .drive import SCOPES

flow = InstalledAppFlow.from_client_secrets_file(C.drive_client_secret, SCOPES)
creds = flow.run_local_server(port=0, access_type="offline", prompt="consent")
Path(C.drive_token).parent.mkdir(parents=True, exist_ok=True)
Path(C.drive_token).write_text(creds.to_json())
print("Đã lưu", C.drive_token)
