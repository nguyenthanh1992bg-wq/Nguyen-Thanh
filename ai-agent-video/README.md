# AI Agent edit video "Ấm Cam" – tự động hoá toàn trình

```
Google Drive/AI AGENT VIDEO/VIDEO QUAY THÔ ──(quét mỗi 30')──► tải về ──► eac (cắt lặng, bóc băng, tăng tốc)
   ──► Claude viết plan.json theo SKILL + luật bộ não ──► eac check (tự sửa) ──► QA ảnh (tự sửa 1 vòng) ──► render Remotion
   ──► upload ► Drive/AI AGENT VIDEO/VIDEO AI AGENT DỰNG XONG ──► bộ não học ──► Telegram báo
Hàng đợi ──(08:00 & 20:00)──► đăng Fanpage Facebook ──► Telegram báo link ──► +24h lấy lượt xem ──► bộ não học tiếp
```

## Cần có
1. **Máy chạy 24/7** (VPS Ubuntu ≥ 4 vCPU / 8 GB RAM, hoặc Mac/PC để bật liên tục). Không chạy được trên container tạm của Claude.
2. `ANTHROPIC_API_KEY` (agent gọi Claude để viết kịch bản dựng + QA + học).
3. **Telegram bot**: Telegram → @BotFather → `/newbot` → lấy token → `.env`. Nhắn bot một tin, bot trả CHAT ID → điền `.env`.
4. **Google Drive OAuth**: Google Cloud Console → bật Drive API → OAuth client "Desktop app" → lưu `secrets/client_secret.json` → chạy `python -m agent.auth_drive` (máy có trình duyệt) → chép `secrets/drive_token.json` lên máy chủ.
5. **Facebook Fanpage**: tạo Meta App → lấy Page Access Token dài hạn + Page ID. ⚠ API **không đăng được lên trang cá nhân** (facebook.com/thanh…); cần Fanpage.

## Chạy
```bash
bash setup.sh
.venv/bin/python -m agent.main check     # kiểm tra Drive/Telegram/Facebook/Claude/ffmpeg/Remotion
./run.sh                                  # hoặc cài systemd: ai-agent-video.service
```
`FB_DRY_RUN=1` mặc định: đăng thử không lên thật; kiểm tra xong đổi 0.

## Telegram
`/status /queue /scan /post /pause /resume /brain /rollback /retry` · nhắn thẳng nhận xét ("chữ đè miệng quá") để dạy agent.

## Bộ não (tự học)
`data/brain/BRAIN.md` (đọc được) · `lessons.json` · `history.jsonl` · `versions/`. Sau MỖI video: số đo + QA → Claude cập nhật tối đa 30 luật (có độ tin cậy, tự gộp/bỏ); sau 24h đăng: lượt xem/like/bình luận → học tiếp; bạn nhắn Telegram → luật nguồn "owner" ưu tiên cao nhất. SKILL.md gốc không bị sửa; `/rollback` hoàn tác. Bộ não + state được sao lưu lên Drive (`BỘ NÃO AGENT`) và tự khôi phục khi đổi máy.

## Đã kiểm tra / chưa kiểm tra
- ✔ Render thật Remotion + trộn âm + ghép trên Linux (video giả); test logic bộ não + lịch 08:00/20:00 (`python -m unittest discover -s tests`).
- ✖ Chưa chạy với tài khoản thật: Drive, Telegram, Facebook, Claude API, bóc băng tiếng Việt (faster-whisper; Mac M-series tự dùng mlx-whisper). Chạy `check` + thử `FB_DRY_RUN=1` trước.
- Chi phí/ video: vài lần gọi Claude (plan + QA ảnh + học) – cỡ vài chục cent; render ~1 phút/15–50 s video trên máy mạnh, lâu hơn trên VPS yếu.
