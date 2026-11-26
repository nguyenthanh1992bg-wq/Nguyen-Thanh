# Skill edit video "Ấm Cam" cho Claude Code

Edit video dọc 9:16 người nói theo style tutorial nâu cam: chữ sans đậm + serif nghiêng hiện từng từ, 3 bố cục (mặt toàn khung / màn hình trên + mặt dưới / thẻ số phát sáng), B-roll màn hình động, nhạc deep house 129 BPM tự tổng hợp, tiếng "ding" theo chữ, giọng tự tăng tốc về 5,3 từ/giây, xuất -14 LUFS.

## Yêu cầu
- macOS chip Apple M (M1 trở lên), có mạng lần đầu (tải thư viện + font Google)
- Claude Code (app Claude, tab Code, hoặc CLI)
- Homebrew: `brew install node ffmpeg python`

## Cài (1 lệnh)
```bash
bash install.sh
```
Script tự: kiểm tra công cụ → cài numpy, scipy, mlx-whisper → chép máy dựng vào `~/projects/edit-am-cam` → `npm ci` → tạo lệnh `eac` → cài skill vào `~/.claude/skills/`.
Muốn cài chỗ khác: `EAC_HOME=/duong/dan bash install.sh`.

## Dùng
Trong Claude Code, kéo video quay thô vào và nói:
> edit kiểu ấm cam

Claude sẽ tự chạy `eac new` → đọc lời → viết kịch bản dựng → soát ảnh → `eac render`. Thành phẩm ở `~/projects/edit-am-cam/done/`.

Muốn khung màn hình là quay màn hình thật (giống mẫu nhất): bỏ các file quay màn hình vào một thư mục và nói kèm đường dẫn thư mục đó (`--screens`).

Lệnh tay:
```
eac new <video> [--name ten] [--screens thu_muc] [--speed 1.2]
eac check <job>      soát kịch bản
eac still <job> 3.5  xuất ảnh tĩnh để xem
eac render <job>     dựng MP4
eac studio <job>     mở Remotion Studio xem/tua (sửa không tốn token)
eac broll-lib        tạo kho ảnh B-roll từ video dọc đã làm
```

## Trong gói
- `skill/video-edit-am-cam-tutorial/` — SKILL.md (luật dựng), references/decode.md (giải mã có số đo), plan-mau.json
- `engine/edit-am-cam/` — mã Remotion (src/), eac.py, audio_gen.py (tổng hợp nhạc + SFX), assets/sfx, assets/music (CC0, xem LICENSES.txt / GIAY-PHEP.txt)

Không kèm `node_modules` (npm tự cài) và không kèm ảnh/video cá nhân.
