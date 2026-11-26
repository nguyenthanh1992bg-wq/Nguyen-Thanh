---
name: video-edit-am-cam-tutorial
description: Edit video dọc 9:16 người nói theo style "Ấm Cam" giải mã bằng số đo từ video mẫu kênh Mike Like Design (hướng dẫn edit video với Claude) — giọng tăng tốc về 5,3 từ/giây, cắt lặng sát, nhạc deep house 129 BPM tự tổng hợp có intro/drop/break căn theo cảnh, tiếng ding có cao độ theo chữ, B-roll màn hình động (terminal Claude Code, chat, timeline editor, thư mục, trình duyệt có con trỏ), quạt/dải/tường ảnh, chữ sans đậm + serif nghiêng hiện từng từ, 3 bố cục FACE / SPLIT / DARK + LIGHT, nhảy zoom dày, chuẩn -14 LUFS. Ra MP4 bằng lệnh eac (~/projects/edit-am-cam, Remotion). Dùng khi người dùng nói "edit kiểu ấm cam", "edit giống video Mike Like Design", "style tutorial nâu cam", "edit như video edit với Claude", "edit theo skill đã train", hoặc đưa video quay thô bảo dựng theo style này.
---

# Edit video style "Ấm Cam" (tutorial nâu cam)

Giải mã đầy đủ (2 lần, có số đo): `references/decode.md`. Plan mẫu đã chạy (IMG_7390, 15,85 s): `references/plan-mau.json`.
Máy dựng: `~/projects/edit-am-cam` (Remotion 4 + ffmpeg 9 + mlx_whisper + `audio_gen.py`). Lệnh: `eac`.

## 6 con số phải khớp mẫu (đã đo, không đoán)
| Chỉ số | Mẫu | Máy làm thế nào |
|---|---|---|
| Tốc độ nói | **5,3 từ/giây** | `eac new` tự cắt lặng (d=0,2 s) + tăng tốc tới 5,3 (tối đa x1,3, giữ cao độ). `--speed 1.0` để tắt. |
| Nhạc | **129 BPM deep house, E thứ**, 4 đoạn intro → drop → break → drop | `audio_gen.py` tự tổng hợp, drop đầu = cảnh không-face đầu tiên sau ~20% thời lượng, break = cảnh `light` |
| Nhạc so với giọng | **thấp hơn 11,5 LU** (giọng -15,4 / nền -26,9 LUFS) | giọng chuẩn -15, nhạc -27 LUFS, ép nhẹ khi nói |
| SFX | tiếng **ding dịu có cao độ** ~0,4–0,6/giây + whoosh chuyển cảnh | tự gắn theo chữ serif/big, tag, thẻ, đổi cảnh, punch |
| Nhịp hình | mỗi ~1 s có thứ mới; punch zoom 2–4 s/lần | `eac check` báo lỗi nếu dưới 0,55 sự kiện/giây, cảnh face > 4 s không punch |
| Âm lượng xuất | -14 LUFS | loudnorm cuối |

## Quy trình (làm đủ, không bỏ bước)

1. **Tạo việc**
   ```bash
   eac new "<video_tho>" --name <ten-ngan> [--screens <thu_muc_quay_man_hinh>] [--speed 1.2]
   ```
   Tự: chuẩn hoá 1080x1920 30fps (chỉ lấy rãnh tiếng chính, bỏ rãnh âm thanh không gian của iPhone) → cắt lặng → bóc băng → tăng tốc → bóc băng lại → 6 thumbnail → chép 12 ảnh kho B-roll → `work/<job>/plan.json`.
   Kho B-roll trống/cũ thì chạy `eac broll-lib` (lấy khung từ video dọc thành phẩm trong ~/projects).

2. **Đọc** `work/<job>/transcript.txt` + `words.json`. Whisper nghe sai tên riêng: "cloud code / class code / Cloth" = Claude Code, "rè trừng" = dè chừng, "ưu ứng" = hiệu ứng. Chữ trên hình phải đúng. Câu nghe không chắc thì dùng từ khoá an toàn, báo người dùng.

3. **Viết plan.json** theo luật bên dưới. Mốc = GIÂY trên `talk.mp4` (đã cắt + tăng tốc). `at` của dòng chữ = `s` của từ đầu dòng trong `words.json`.

4. **Soát**: `eac check <job>` phải "Không lỗi". `eac still <job> <giay> ...` mỗi cảnh 1 mốc, XEM ảnh `work/<job>/stills/`. Sửa: chữ đè miệng → tăng `captionY`; khung mặt PIP lệch → chỉnh `faceY` (mặt to giữa khung ≈ 0,6–0,65; mặt nhỏ ≈ 0,42).

5. **Dựng**: `eac render <job>` → `~/projects/edit-am-cam/done/<job>.mp4` (~1 phút / 15–50 s video). In ra điểm drop/break nhạc và số SFX.

6. **Sửa tay không tốn token**: `eac studio <job>`; sửa `plan.json` rồi render lại.

7. Báo người dùng: đường dẫn, thời lượng, tốc độ đã tăng, tỉ lệ bố cục, B-roll nào là màn hình mô phỏng (nên thay bằng quay màn hình thật).

## Luật dựng

**Tỉ lệ bố cục**: face 40–55%, split 30–35%, dark+light 15–25%. Đổi bố cục mỗi 2–6 s.

**Cảnh face**: luôn có `punches` 2–4 s một lần, xen phóng gần (1,12–1,18) và lùi xa (1,00–1,05), đặt đúng đầu ý mới. `zoom`/`zoomTo` trôi chậm +0,04.

**HOOK 0–3,7 s**: face + chữ `pos:"top"` (sans + serif hoặc big) + `floaters` `sides` 2 ảnh kho B-roll + 1 punch giữa hook.

**Chữ** (nhịp như mẫu):
- Mỗi caption sống 1,2–2,3 s, tối đa 2 dòng: dòng 1 `sans` ≤ 30 ký tự, dòng 2 `serif` ≤ 18 hoặc `big` ≤ 12. Chỉ TỪ KHOÁ.
- face → `low` (vùng ngực), split → `mid`, hook → `top`.
- `accent` 1–2 từ (tên sản phẩm, con số). `pill: true` cho cụm nhãn.

**B-roll — mọi cảnh split phải có hình động** (thứ tự ưu tiên):
1. `media`: quay màn hình thật trong `--screens`.
2. `ui` mô phỏng khớp lời nói, mỗi `steps[].at` trùng từ khoá:
   - `terminal`: nói về Claude Code, lệnh, cài đặt. Dòng `">..."` là lệnh gõ, `"✓ ..."` là kết quả xanh, còn lại có chấm cam.
   - `chat`: hỏi AI, dán prompt. Bước 1 là câu người dùng gõ, các bước sau là câu trả lời.
   - `editor`: edit, phụ đề, timeline. `steps` = tên rãnh/việc, `caption` = chữ trong khung xem trước.
   - `folder`: thư mục, file. Tên có dấu chấm thì hiện ảnh, không có thì hiện thư mục.
   - `browser`: web, YouTube, Pinterest, tải video mẫu. Bước 1 là địa chỉ gõ, các bước sau con trỏ bấm.
3. `tree`: hướng dẫn tạo thư mục.

   Thêm `card` (thẻ kính "5 / công cụ miễn phí") khi nói một con số về thứ đang hiện trên màn hình.

**Ảnh nổi** (`floaters`, dùng `_assets.broll`): `sides` khi hook; `strip` khi liệt kê nhiều thứ/nhiều video; `fan` khi nói "video mẫu", "nhiều kiểu"; `wall` (+`title`) khi khoe kho/kết quả/"xem trong tài liệu".

**Con số** → `light` (số chốt, nhạc tự rơi vào break) hoặc `dark.big`. **So sánh** → `dark.compare`. **Câu chốt cảm xúc** → `dark.quote`. **Liệt kê** → `tags`/`checklist`. **Nhân quả** → `flow`. Không bịa số không có trong lời.

**CTA**: `dark.doc` khi kêu bình luận nhận tài liệu; `follow` khi kêu follow (tên + handle hỏi người dùng, không bịa).

**Âm thanh**: mặc định `"music": {"gen": true}`. Chỉnh tay: `drops: [giây]`, `breaks: [[a,b]]`, `bpm`, `lufs` (mặc định -27). Dùng nhạc file: `{"file": "<tên trong assets/music>"}`. Thêm SFX: `sfx: [{at, name, vol}]` (tên file trong `assets/sfx/`, ưu tiên `am_*`).

## Tham chiếu plan.json (rút gọn từ plan đã chạy)
```jsonc
{
  "duration": 15.85, "talk": "jobs/<job>/talk.mp4", "speed": 1.22,
  "faceY": 0.64, "captionY": 1470, "music": {"gen": true},
  "scenes": [
    {"from":0,"to":3.72,"layout":"face","zoom":1.0,"zoomTo":1.05,"punches":[{"at":1.84,"z":1.13}]},
    {"from":3.72,"to":5.94,"layout":"split","ui":{"kind":"terminal","steps":[
      {"t":"> edit video IMG_7390.mov theo style Ấm Cam","at":3.78},{"t":"Cắt khoảng lặng, tăng tốc x1,22","at":4.42},{"t":"✓ Xuất video hoàn chỉnh","at":5.52}]}},
    {"from":5.94,"to":9.24,"layout":"face","punches":[{"at":7.1,"z":1.16},{"at":8.6,"z":1.02}]},
    {"from":9.24,"to":10.82,"layout":"light","light":{"title":"AI hoàn toàn làm được","value":100,"suffix":"%"}},
    {"from":10.82,"to":13.68,"layout":"split","ui":{"kind":"editor","caption":"edit trọn video","dur":2.9,"steps":[{"t":"Cắt cảnh","at":10.9},{"t":"Phụ đề","at":11.5}]},
      "card":{"big":"5","sub":"công cụ miễn phí","at":12.0}},
    {"from":13.68,"to":15.85,"layout":"dark","compare":{"left":{"v":"nhân viên edit","sub":"trước đây","at":14.08},"right":{"v":"0 nhân viên","sub":"chỉ cần AI","at":15.06}}}
  ],
  "overlays": [
    {"type":"floaters","from":0.2,"to":1.82,"images":["<broll1>","<broll2>"],"mode":"sides"},
    {"type":"caption","from":0,"to":1.82,"pos":"top","lines":[{"t":"AI bây giờ","at":0.78,"accent":["AI"]},{"t":"quá nguy hiểm","s":"serif","at":1.16}]},
    {"type":"floaters","from":7.1,"to":9.24,"images":["<broll...>"],"mode":"strip"},
    {"type":"floaters","from":20,"to":22,"images":["<broll...>"],"mode":"wall","title":"Xem trong tài liệu"},
    {"type":"pill","from":12.52,"to":13.66,"text":"edit trọn video"}
    // còn: tags, flow, progress, checklist, stamp, follow (xem types.ts)
  ]
}
```
Kiểu dòng `s`: sans · serif · big · small. `pos`: top · mid · low · center · right. Các cảnh phải liền mạch 0 → duration.

## Lỗi hay gặp
- `.mov` iPhone có rãnh âm thanh APAC → đã xử lý (`-map 0:a:0`).
- Hở/chồng cảnh → `to` trước = `from` sau.
- `eac check` báo nhịp hình thấp → thêm punch, tách caption ngắn hơn, thêm tag/thẻ.
- Không có ảnh kho → `eac broll-lib`.
- Font Google tải lần đầu cần mạng.
