# Giới hạn và kế hoạch tiếp theo

## Giới hạn hiện tại
- Chỉ **7 bài học** và **89 câu hỏi**. 13 nhóm kiến thức còn lại mới có 2 câu đầu vào, chưa có bài dạy; giao diện ghi rõ.
- Nội dung do nhóm dự án tự biên soạn, **cần giáo viên tiếng Anh duyệt** và đối chiếu sách giáo khoa của trường. Kiểm tra tự động chỉ bắt lỗi cấu trúc.
- Chưa chấm phát âm. Phần nghe dùng giọng đọc của thiết bị (có nút bỏ qua).
- Màn quản lý nội dung chỉ xem/lọc/thử/kiểm tra; chưa soạn thảo.
- Chưa có mã PIN phụ huynh: phần đặt thưởng em cũng mở được.

## Mở app, wifi, nhiều thiết bị
- Tệp `english-recovery-6.html` mở bằng bấm đúp. `npm run wifi` mở cho thiết bị cùng mạng wifi.
- PWA (cài lên màn hình chính, ngoại tuyến) cần hosting có https.
- **Đồng bộ nhiều thiết bị:** hiện chỉ hoạt động khi mở bản Artifact có đăng nhập (kho riêng từng người). Bản HTML/PWA độc lập chỉ lưu trên máy. Tài khoản riêng cho học sinh/phụ huynh ngoài Artifact cần backend: thêm `ApiStore implements DataStore` (REST + Postgres), đăng nhập phụ huynh (hồ sơ con), đồng ý của phụ huynh, mã hóa, chính sách xóa dữ liệu, tuân thủ Nghị định 13/2023/NĐ-CP.

## Nhắc học
Banner trong app, chấm đỏ trên tab, thông báo trình duyệt (chỉ khi app mở/chạy nền) và lịch lặp hằng ngày qua Google Calendar/.ics. Web không tự báo được khi đã đóng hẳn; muốn vậy cần Web Push (backend) hoặc app di động.

## Hình ảnh và video
Hình minh họa dùng emoji (tự do, chạy ngoại tuyến); có thể thay bằng tranh vẽ riêng. Chưa có video thật: bài học có ô `video` (liên kết ngoài do giáo viên cung cấp) và "clip ví dụ" tự chạy có đọc to.

## Gia sư AI (khi cần)
Backend proxy giữ API key; chỉ giải thích dựa trên câu hỏi + giải thích đã duyệt; không lộ đáp án khi luyện; không bịa quy tắc; giới hạn tốc độ; log để giáo viên rà soát. Câu chấm điểm vẫn dùng ngân hàng đã duyệt. Cài `TutorService` mới, không đổi màn hình.

## Vòng cải tiến hằng tháng
Xem docs/QUALITY.md.

## Ưu tiên tiếp theo
1. Viết bài + ≥ 3 câu bổ sung cho 13 nhóm thiếu; giáo viên duyệt.
2. Thêm 2–3 câu đầu vào mỗi nhóm.
3. Backend + tài khoản + PIN phụ huynh.
4. Tranh vẽ riêng và video bài giảng.
