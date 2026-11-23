# Hoàng Gia PS – Quản trị công nợ & dòng tiền

Chương trình chạy **offline trong trình duyệt** (1 file HTML, không cần cài đặt, dữ liệu lưu trên máy bạn).

**Mở file `Quan_tri_dong_tien_Hoang_Gia.html`** → tab *Dữ liệu & giả định* → nạp Excel phải thu / phải trả (hoặc “Nạp dữ liệu mẫu” để xem thử).

## Chức năng
| Tab | Nội dung |
|---|---|
| Tổng quan | Điểm sức khỏe dòng tiền 0–100, cảnh báo điểm hụt, biểu đồ số dư 13 tuần (3 kịch bản) |
| Phải thu | Tuổi nợ, chấm điểm tín dụng khách (hạng A–D), phân khúc chiến lược, hóa đơn chi tiết |
| Phải trả | Lịch đến hạn, nhóm NCC, dư địa giãn hạn |
| Dòng tiền | 13 tuần / 12 tháng, 3 kịch bản, điểm hụt + nguyên nhân, xuất Excel |
| Đề xuất tháng | Mô phỏng 10 phương án, chấm điểm, chọn **2 phương án tốt nhất** + SOP + khách mục tiêu; chốt & theo dõi kết quả |
| Định hướng 12 tháng | Mục tiêu DSO/nợ >60/Top5, nhóm cần tập trung, lộ trình 4 quý, SOP hằng tháng |

## Chấm điểm phương án (0–100)
Tác động dòng tiền 40% · Tốc độ ra tiền 20% · Khả thi 25% · Chi phí & rủi ro 15% (chỉnh được). Vay/đảo nợ chỉ là phương án dự phòng.

## Phát triển
```bash
python3 build.py                 # ghép src/ -> Quan_tri_dong_tien_Hoang_Gia.html
node tests/engine.test.js        # kiểm thử lõi tính toán
NODE_PATH=$(npm root -g) node tests/smoke.js   # kiểm thử giao diện (Playwright)
```
Dữ liệu mẫu là hư cấu. Thư viện SheetJS (Apache-2.0) nằm trong `vendor/`.
