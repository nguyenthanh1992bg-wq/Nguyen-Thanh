# Đánh giá chất lượng ứng dụng theo tháng

Mục tiêu: mỗi cuối tháng, xem toàn bộ chuỗi **kiểm tra đầu vào → lộ trình → bài học → ôn tập → thói quen** hoạt động ra sao với học sinh thật; **điểm tốt thì giữ và phát huy, điểm chưa tốt thì cải thiện và nâng cấp**.

## Cách chạy
1. Trong app: Phụ huynh → "Đánh giá chất lượng tháng" (nhắc tự hiện từ ngày 25).
2. App tự tính số liệu từ lịch sử học (`src/logic/quality.ts`, có test) và đưa ra: *Điểm tốt*, *Cần cải thiện* (kèm hành động nâng cấp, xếp theo ưu tiên), *Kế hoạch nâng cấp tháng sau*.
3. Bấm "Gửi số liệu": ghi bản tổng hợp **ẩn danh** (không tên, chỉ con số và mã câu hỏi) vào kho dùng chung `reports/<YYYY-MM>`. Không có tài khoản thì dùng "Sao chép báo cáo".
4. Người phát triển đọc số liệu, chọn hạng mục nâng cấp, cập nhật nội dung/mã, chạy test, phát hành bản mới.

Kho riêng của học sinh (`data/users/<id>`) là riêng tư, kể cả với người phát triển; vì vậy cần bước gửi số liệu tổng hợp ở (3).

## Chỉ số và ngưỡng (đều nằm trong `judge()`)
| Khía cạnh | Giữ & phát huy khi | Cải thiện khi |
|---|---|---|
| Đầu vào | ≥ 30/40 câu và < 40% nhóm cần xác nhận | chưa làm; chưa đủ dữ liệu; ≥ 40% nhóm cần xác nhận (mỗi nhóm mới có 2 câu) |
| Nội dung bài | mọi nhóm cần học đều có bài | có nhóm "cần học" nhưng chưa có bài (ưu tiên cao) |
| Hiệu quả lộ trình | độ chính xác sau học tăng ≥ 25 điểm % so với đầu vào (≥ 2 nhóm) | tăng < 25 điểm % (ưu tiên cao) |
| Bài học | ≥ 70% bài đạt (≥ 3 bài) | < 70% bài đạt; bài có tỉ lệ đúng cuối bài < 55% |
| Sai → gợi ý → thử lại | ≥ 50% tự sửa được (≥ 5 lần sai) | < 50% |
| Ghi nhớ | ≥ 75% đúng khi ôn (≥ 10 lượt) | < 60% (ưu tiên cao) |
| Nhắc ôn tập | < 30% thẻ quá hạn > 3 ngày | ≥ 30% quá hạn |
| Thói quen | ≥ 12 ngày có học/tháng | < 8 ngày có học (ưu tiên cao) |
| Cân bằng học – chơi | lượt chơi ≤ 3 × số ngày học | nhiều hơn |
| Câu hỏi | không có câu bất thường | câu sai ≥ 70% (quá khó/đáp án nghi sai); một đáp án sai chiếm ≥ 60% lỗi (bẫy) |
Tháng chưa đủ dữ liệu (< 30 câu hoặc < 5 ngày học) chỉ ra nhận định tạm thời và nói rõ như vậy.

## Giới hạn
- Một học sinh/tháng chưa đủ để kết luận mang tính thống kê; nên gộp nhiều học sinh khi có.
- Ngưỡng là giả định ban đầu, cần chỉnh theo dữ liệu thực tế sau 2–3 tháng.
