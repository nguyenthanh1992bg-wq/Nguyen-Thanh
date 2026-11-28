# Thiết kế English Recovery 6

## Kiến trúc
React + TypeScript + Vite, ưu tiên điện thoại, không backend riêng. Giá trị sư phạm nằm ở logic thuần có test.

| Lớp | Thư mục | Ghi chú |
|---|---|---|
| Nội dung | `data/` | chương trình 12 tuần, 89 câu hỏi, 7 bài, từ vựng có hình, cửa hàng |
| Logic | `logic/` | `grading`, `srs`, `progress`, `placement`, `lessonFlow`, `daily`, `game`, `games`, `reminders`, `report`, `quality` |
| Lưu trữ | `storage/` | `DataStore`: `LocalStorageStore`, `MemoryStore`, `cloudStore` (đồng bộ tài khoản) |
| Trạng thái | `state/` | reducer thuần |
| Gia sư | `tutor/` | gợi ý theo bậc từ nội dung đã duyệt (chưa dùng AI) |
| UI | `screens/`, `components/` | đường học, bài học, game, thưởng, báo cáo, đánh giá chất lượng |

## Quy tắc sư phạm đã hiện thực
- Không kết luận khi thiếu bằng chứng (< 2 lần làm; đầu vào < 30/40 câu), có bài đánh giá bổ sung.
- Phân loại lỗi: chưa biết / nhầm quy tắc / làm vội / chưa vận dụng ổn định.
- "Thành thạo" = ≥ 3 câu khác nhau đúng không gợi ý + chính xác gần đây ≥ 80% + nhớ sau ≥ 3 ngày. Đúng nhờ gợi ý chỉ tính 0,5.
- Bài bị khóa khi kiến thức tiên quyết yếu; chưa đạt cuối bài (< 2/3) thì không sang bài mới, không tự tăng độ khó.
- Sai → lý do cụ thể + gợi ý + thử lại; sai lần 2 mới hiện đáp án. Sai lặp lại → giải thích đơn giản + câu tự làm.
- Ôn cách quãng 1 → 3 → 7 → 14 → 30 ngày, điều chỉnh theo kết quả.
- Game/thưởng không thay việc học: xu từ game giới hạn 30/ngày; chủ yếu kiếm xu bằng học bài (5 điểm = 1 xu), rương ngày (≥ 10 câu; đúng ≥ 85% được nhiều hơn), rương tuần (5 ngày và 50 câu), huy hiệu.
- Đánh giá ngày bằng sao (1–3), đánh giá tuần (Xuất sắc/Tốt/Khá/Cần cố gắng hơn).

## Quyền riêng tư
Không mật khẩu, không API key trong mã. Chỉ lưu biệt danh tùy chọn và lịch sử làm bài. Dữ liệu gửi đi để đánh giá chất lượng chỉ là số liệu tổng hợp ẩn danh và chỉ khi bấm gửi.
