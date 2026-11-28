# English Recovery 6

Ứng dụng web giúp học sinh lớp 6 (Việt Nam) lấy lại kiến thức tiếng Anh nền tảng: kiểm tra đầu vào → lộ trình cá nhân hóa → bài học → ôn cách quãng → game & phần thưởng → báo cáo phụ huynh → đánh giá chất lượng app hằng tháng.

## Mở app
- **Nhanh nhất:** tải `english-recovery-6.html`, bấm đúp để mở bằng trình duyệt (không cần cài gì, dữ liệu lưu trong trình duyệt đó).
- **Bằng wifi (điện thoại/máy tính bảng cùng mạng):** `npm install && npm run wifi`, rồi mở địa chỉ `http://<IP máy tính>:4173` in ra trên điện thoại.
- **Cài lên màn hình chính, dùng ngoại tuyến (PWA):** đưa thư mục `dist/` (`npm run build`) lên một dịch vụ hosting tĩnh có https (Netlify, Cloudflare Pages, GitHub Pages…), mở trên điện thoại và chọn "Thêm vào màn hình chính".
- **Mọi thiết bị, cùng tiến độ:** bản chạy dạng Artifact đồng bộ qua tài khoản (xem docs/ROADMAP.md).

```bash
npm install
npm run dev
npm test              # logic + dữ liệu + game + thưởng + nhắc + chất lượng
npm run typecheck && npm run build
npm run build:single  # tạo lại english-recovery-6.html
```

Tài liệu: [docs/DESIGN.md](docs/DESIGN.md) · [docs/QUALITY.md](docs/QUALITY.md) (đánh giá tháng) · [docs/ROADMAP.md](docs/ROADMAP.md).

## Cấu trúc
- `src/data/` chương trình, 89 câu hỏi, 7 bài học, từ vựng có hình (emoji), cửa hàng nhân vật
- `src/logic/` chấm điểm, ôn cách quãng, đầu vào, lộ trình, thưởng ngày/tuần, nhắc học, game, đánh giá chất lượng (hàm thuần, có test)
- `src/storage/` `DataStore` (localStorage; `cloudStore` đồng bộ tài khoản)
- `src/screens/`, `src/components/` giao diện; `public/` manifest, service worker, biểu tượng
