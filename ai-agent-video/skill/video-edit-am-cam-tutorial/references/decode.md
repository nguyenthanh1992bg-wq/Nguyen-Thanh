# DECODE video mẫu "Hơn 1 phút hướng dẫn edit video với Claude" (kênh Mike Like Design)

File gốc: `~/Downloads/snaptik.vn_7709864339909430546.mp4` · 576x1024 (đăng 1080x1920), 30fps, 86,8 giây. Giải mã ngày 26/11/2026.

## 1. Cấu trúc nội dung (86,8 giây)
| Giây | Phần | Việc |
|---|---|---|
| 0–4,5 | HOOK | Mặt toàn khung, chữ ở ĐỈNH: "hơn / **1 phút**", "người mới / *edit với Claude*", "tạo giao diện *editor* / không tốn token". 2 thẻ ảnh nghiêng bay vào 2 bên đầu. Mở đầu nhoè → nét. |
| 4,5–33 | 5 BƯỚC | Chủ yếu bố cục SPLIT (màn hình trên, mặt dưới) xen thẻ số tối ("Claude Code cần Claude Pro" → **20 đô**), sơ đồ thư mục "Bước 2/5", nhãn "5 công cụ miễn phí". |
| 33–55 | VẤN ĐỀ | Mặt toàn khung + chữ dưới ngực; trích dẫn trên nền tối ("bỏ video vào thư mục RAW, dán prompt 3"); nhãn chồng góc trái; thanh tiến độ "60%"; chuỗi mũi tên "chưa ưng → bắt sửa → ghi quy tắc". |
| 55–75 | GIẢI PHÁP | Dải ảnh chạy ngang; cảnh sáng "AI chưa bao giờ đúng **100%**" (số đếm lên); split giới thiệu cửa sổ editor; checklist "Tách sẵn chi tiết"; so sánh "tốn token vs **0 token**". |
| 75–86,8 | CTA | Ô bình luận gõ chữ + thẻ tài liệu "3 prompt setup + Editor"; "không muốn mất *thời gian*"; quạt ảnh điện thoại; thẻ Follow → "Đã follow". |

## 2. Ba bố cục (tỉ lệ thời gian ~ 55% face / 30% split / 15% dark+light)
- **FACE**: quay mặt toàn khung, zoom chậm 1,00→1,06; punch-in (nhảy 1,10–1,18) khi đổi ý. Grade ấm nhẹ, tối mép trên/dưới.
- **SPLIT**: nền kem đào (#FBF1E8 + đốm #F6BE9B mờ, hạt mịn). Khung màn hình trắng bo 24px ở 8%–41% chiều cao, đổ bóng nâu. Khung mặt bo 26px viền trắng ở 73%–98%, rộng 78%. Chữ ở giữa (~46–55%).
- **DARK**: chính video mặt bị nhoè 46px, phủ nâu cam (#963C1E→#46200C), lưới 54px, quầng cam giữa, viền tối. Thẻ cam phát sáng (#E07448→#B4472A, viền kem, glow), chấm halftone quanh thẻ. Giọng vẫn chạy.
- **LIGHT**: nền kem, vòng tròn mảnh, chấm halftone cam, số lớn chữ gradient cam đếm lên.

## 3. Chữ (font + màu)
- Hai họ chữ: **sans đậm** (đo được giống SF Pro/Inter Bold, ta dùng Be Vietnam Pro 700–800) + **serif nghiêng đậm** (giống Playfair Display Bold Italic).
- Mẫu ghép quen thuộc: dòng nhỏ sans (46px) + dòng to serif nghiêng (92px) — "không muốn mất / *thời gian*".
- Trên mặt: trắng, bóng đổ mềm; từ nhấn màu đào #FFB592. Trên nền kem: sans nâu #3A2418, từ nhấn + serif màu cam #E06C32.
- Hiệu ứng chữ: HIỆN TỪNG TỪ theo lời, mỗi từ nhoè 9px → nét + trồi 16px trong ~7 khung; thoát nhoè + mờ 6 khung.
- Nhãn kính nâu (rgba(62,34,20,.58), viền kem 45%) cho tag, chuỗi mũi tên, checklist, thanh tiến độ, thẻ follow. Nhãn đang nói = nền cam sáng.

## 4. Chuyển cảnh
- Cảnh mới hiện từ nhoè 22px + phóng 1,06 → 1 trong 8 khung, đè lên cảnh cũ. Đầu video nhoè 30px trong 12 khung.
- Không dùng chuyển cảnh lố (xoay, trượt). Các thẻ/khung vào bằng scale 0,9→1 + blur, dùng easing back nhẹ.

## 5. Âm thanh
- Giọng: nén mạnh, tổng -14,9 LUFS, LRA chỉ 2,7 LU (rất đều).
- Cắt lặng chặt: khoảng nghỉ giữa câu 0,1–0,2 giây.
- Nhạc nền nhẹ dưới giọng (~-30 dB), từ giây ~30 có nhịp kick ~130 BPM rõ hơn.
- SFX khoảng 1 cái / 3 giây, trùng lúc chữ lớn/thẻ xuất hiện (pop, whoosh, click). Không có SFX lúc chữ nhỏ hiện.

## 6. Phần không sao chép
Nhân vật, logo kênh, ảnh chụp màn hình riêng của tác giả. Skill chỉ lấy NGÔN NGỮ DỰNG (bố cục, chữ, nhịp, âm), dùng cho video của người dùng.

## 7. Giải mã lần 2 (26/11/2026, đo bằng số sau khi bản 1 bị chê lệch tốc độ, nhạc, B-roll)

### Tốc độ
- Mẫu: 462 từ / 86,8 s = **5,32 từ/giây** (5,72 từ/giây trong lúc nói). Khoảng nghỉ giữa từ trung vị 0 s: gần như không có chỗ thở.
- Giọng người thường ~4,1–4,4 từ/giây → mẫu đã tăng tốc giọng ~x1,2–1,3 (giữ cao độ).
- Máy: cắt lặng `silencedetect -34dB d=0,2 s pad 0,05 s`, rồi tự tăng tốc `setpts + atempo` cho tới 5,3 từ/giây (tối đa x1,3).

### Nhạc nền (tách bằng demucs htdemucs)
- **129 BPM**, deep house / lo-fi house, giọng E thứ (chroma D#-E-G).
- Giọng -15,4 LUFS, nền (nhạc+SFX) -26,9 LUFS → **nhạc thấp hơn giọng 11,5 LU**.
- Bố cục 4 đoạn: INTRO 0–30 s (pad + tiếng gảy + hi-hat, không kick, sáng) → DROP 30–60 s (kick 4/4 + sub, trầm dày) → BREAK 61–66 s (gần im, trùng cảnh "AI chưa bao giờ đúng 100%") → DROP 66 s tới hết. Có riser ngắn + cú sub trước mỗi lần vào drop.
- Máy tự tổng hợp nhạc cùng cấu trúc (`audio_gen.py`), căn ô nhịp trùng điểm drop: drop đầu = cảnh không-face đầu tiên sau ~20% thời lượng, break = cảnh `light`.

### SFX
- Không phải tiếng "pop": là tiếng **ding dịu có cao độ** (gốc ~680 Hz, hoạ âm 2-3-4 rơi ở 1,3–2,7 kHz), ngân ~0,5 s, khoảng 0,4–0,6 tiếng/giây, đúng lúc chữ to/thẻ hiện. Whoosh nhiễu ở chuyển cảnh.
- Máy: `am_ding_e/g/b/d/lo` (nốt trong giọng E thứ, xoay vòng), `am_whoosh`, `am_impact`, `am_tick`, `am_ding_soft`.

### B-roll đầy đủ trong mẫu (theo giây)
| Giây | B-roll |
|---|---|
| 0,5–4,5 | 2 thẻ video nghiêng hai bên đầu |
| 4,5–11 | quay màn hình app Claude (mở tab Code) có con trỏ |
| 12,5–21 | sơ đồ thư mục động + quay màn hình chọn "This Computer", hộp chọn thư mục |
| 23,8–30 | quay màn hình trang GitHub 5 công cụ + **thẻ kính "5 / công cụ miễn phí" nổi trên màn hình** |
| 42,5–43,5 | quạt 4 điện thoại trên đầu |
| 55–60 | dải ảnh chạy ngang trên đỉnh |
| 67–73 | quay màn hình cửa sổ editor (timeline nhiều rãnh, khung xem trước có phụ đề) |
| 84–85 | **tường ảnh 3x3** video của kênh trên nền kem, thu nhỏ dần |

Máy bù: `ui` (terminal / chat / editor / folder / browser có con trỏ + gõ chữ), `card` (thẻ kính trên màn hình), `floaters` mode `wall`, kho ảnh `assets/broll_lib` lấy từ video bạn đã làm (`eac broll-lib`).

### Nhịp hình
- Cảnh mặt có nhảy zoom (punch) khoảng 2–4 s một lần, xen 1,00 ↔ 1,12–1,18.
- Gần như mỗi giây có một thứ mới (từ chữ, thẻ, nhãn, zoom, đổi cảnh).
