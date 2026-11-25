/* Quay video hướng dẫn: node tools/make_video.js <file_html> <thư_mục_ra>  (phụ đề tiếng Việt, không tiếng) */
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const html = process.argv[2], out = process.argv[3];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 }, recordVideo: { dir: out, size: { width: 1366, height: 768 } } });
  const p = await ctx.newPage();
  await p.goto('file://' + path.resolve(html)); await p.waitForSelector('.hs .big');
  await p.addStyleTag({ content: `#cap{position:fixed;left:50%;bottom:34px;transform:translateX(-50%);max-width:1100px;background:#0b1b3aee;color:#fff;font:600 22px/1.4 "DejaVu Sans",Segoe UI,sans-serif;padding:14px 26px;border-radius:14px;z-index:99999;text-align:center;box-shadow:0 8px 30px #0008;white-space:pre-line}
    #stp{position:fixed;top:12px;right:16px;background:#1d4ed8;color:#fff;font:700 15px "DejaVu Sans",sans-serif;padding:6px 14px;border-radius:99px;z-index:99999}
    .hlx{outline:4px solid #f59e0b!important;outline-offset:3px;border-radius:8px;position:relative;z-index:5}` });
  await p.evaluate(() => { const c = document.createElement('div'); c.id = 'cap'; document.body.appendChild(c); const s = document.createElement('div'); s.id = 'stp'; document.body.appendChild(s); });
  const say = async (t, ms, step) => { await p.evaluate(([t, s]) => { document.getElementById('cap').textContent = t; document.getElementById('cap').style.display = t ? 'block' : 'none'; if (s) document.getElementById('stp').textContent = s; }, [t, step]); await p.waitForTimeout(ms); };
  const hl = async sel => { await p.evaluate(s => { document.querySelectorAll('.hlx').forEach(e => e.classList.remove('hlx')); const e = s && document.querySelector(s); if (e) e.classList.add('hlx'); }, sel); };
  const tab = async k => { await p.click(`#nav [data-v=${k}]`); await p.waitForTimeout(500); await p.evaluate(() => document.getElementById('main').scrollTo(0, 0)); };
  const scroll = async y => { await p.evaluate(y => document.getElementById('main').scrollTo({ top: y, behavior: 'smooth' }), y); await p.waitForTimeout(900); };
  await say('HƯỚNG DẪN SỬ DỤNG – Finance OS Hoàng Gia PS\nQuản lý công nợ & dòng tiền', 4500, 'Mở đầu');
  await tab('home'); await hl('.hs'); await say('1) TỔNG QUAN: điểm sức khỏe dòng tiền (0–100) và 5 thành phần cấu thành.', 6000, 'Bước 1/10');
  await hl('.alert.bad'); await say('Khung cảnh báo cho biết NGÀY HẾT TIỀN dự kiến, nợ quá hạn vượt mục tiêu, khoản vay sắp đáo hạn.', 6500);
  await hl('.kpis'); await say('Các chỉ số chính: số dư tiền, phải thu, phải trả, DSO/DPO, số dư thấp nhất 13 tuần.', 5500);
  await hl(null); await scroll(520); await say('Biểu đồ số dư 13 tuần theo 3 kịch bản; đường xanh ngọc = nếu thực hiện 2 phương án đề xuất.', 6500); await scroll(0);
  await say('Thanh bên trái: chuyển nhanh giữa các màn hình. Nhấn Ctrl+K để tìm lệnh, khách hàng, nhà cung cấp.', 5500, 'Bước 2/10');
  await p.keyboard.press('Control+k'); await p.keyboard.type('samju', { delay: 120 }); await say('Ví dụ: gõ tên khách → nhảy thẳng tới hóa đơn của khách đó.', 4500); await p.keyboard.press('Escape');
  await tab('ar'); await say('3) PHẢI THU: tuổi nợ theo hạn thanh toán, phân khúc chiến lược, chấm điểm tín dụng từng khách (hạng A–D).', 7000, 'Bước 3/10');
  await scroll(430); await say('Bảng khách hàng: sắp xếp theo cột, lọc theo hạng, nhóm chiến lược; nhấn tên khách để xem hóa đơn chi tiết.', 7000);
  await tab('ap'); await say('4) PHẢI TRẢ: lịch đến hạn theo tuần, nhóm nhà cung cấp và số tiền có thể đàm phán giãn hạn.', 7000, 'Bước 4/10');
  await tab('cash'); await say('5) DÒNG TIỀN & ĐIỂM HỤT: bảng 13 tuần / 12 tháng, 3 kịch bản; chỉ rõ kỳ nào hụt và khoản chi nào gây hụt.', 7500, 'Bước 5/10');
  await p.click('[data-act=scen][data-v=cons]'); await say('Đổi sang kịch bản THẬN TRỌNG (khách trả chậm hơn).', 3500); await p.click('[data-act=view][data-v=month]'); await say('Chuyển sang xem 12 tháng.', 3500);
  await tab('plan'); await say('6) ĐỀ XUẤT THÁNG: hệ thống mô phỏng 10 phương án, chấm điểm 0–100 và chọn 2 phương án tốt nhất.', 7500, 'Bước 6/10');
  await hl('.pick'); await say('Mỗi phương án có: điểm 4 tiêu chí, tác động, chi phí, thời điểm, rủi ro, khả thi, BỘ PHẬN CHỊU TRÁCH NHIỆM và các bước làm cụ thể.', 8500);
  await hl(null); await scroll(1700); await say('Bảng xếp hạng toàn bộ phương án – tick chọn để giả lập tổ hợp riêng. Quyết định do Ban giám đốc phê duyệt.', 7000); await scroll(0);
  await tab('ktrep'); await say('7) BÁO CÁO DÒNG TIỀN THEO TUẦN – đúng mẫu của kế toán: Kế hoạch / Thực hiện / Còn phải TH / Tỷ lệ.', 7500, 'Bước 7/10');
  await p.click('[data-act=ktsrc][data-v=sys]'); await say('Nút “Kế hoạch hệ thống”: kế hoạch lập tự động từ lịch sử thu – chi T6–T10 để đối chiếu với kế hoạch của KT.', 7500);
  await p.click('[data-act=ktsrc][data-v=kt]'); await tab('evalkh'); await say('8) ĐÁNH GIÁ KẾ HOẠCH ĐỊNH KỲ: tự chấm độ chính xác kế hoạch KT và kế hoạch hệ thống mỗi lần dữ liệu cập nhật.', 8000, 'Bước 8/10');
  await hl('.kpis'); await say('Điểm càng cao = kế hoạch càng sát thực tế. Lịch sử các lần đánh giá được lưu lại.', 5500);
  await hl(null); await tab('data'); await say('9) CẬP NHẬT DỮ LIỆU HẰNG NGÀY: dùng thư mục dữ liệu trên ổ D.', 6000, 'Bước 9/10');
  await hl('#main .card'); await say('Bấm “Tạo thư mục dữ liệu hằng tuần” (lần đầu) hoặc “Kết nối thư mục Excel” rồi chọn thư mục trên ổ D.', 8000);
  await say('Mỗi ngày: xuất file từ phần mềm kế toán → bỏ vào thư mục → mở app (Chrome/Edge). App tự nhận dạng file, tự tính lại, tự cập nhật 5 phút/lần.', 9500);
  await say('Các file cần có: 131 theo hóa đơn, 131 theo khách, 331 chi tiết, hạn thanh toán NCC, sổ ngân hàng, sổ quỹ, theo dõi vay, kế hoạch dòng tiền của KT.', 9500);
  await hl(null); await p.click('[data-act=ai]'); await p.waitForTimeout(500); await say('10) TRỢ LÝ AI: hỏi bằng tiếng Việt – điểm hụt tiền, khách cần thu gấp, việc nên làm trong tháng…', 6000, 'Bước 10/10');
  await p.fill('#aiin', 'Điểm hụt tiền ở đâu?'); await p.press('#aiin', 'Enter'); await p.waitForTimeout(1500); await say('Trợ lý trả lời trực tiếp từ số liệu trong app (chạy offline).', 6000);
  await p.click('[data-act=ai]'); await tab('home'); await say('TÓM TẮT QUY TRÌNH: Cập nhật dữ liệu → xem cảnh báo hụt tiền → chọn 1 trong 2 phương án đề xuất → giao việc → đối chiếu tuần → đánh giá kế hoạch.', 10000, 'Tổng kết');
  await say('Mọi đề xuất chỉ hỗ trợ phân tích; quyết định thuộc thẩm quyền Ban giám đốc.', 5000);
  await ctx.close(); await b.close();
  console.log('webm:', fs.readdirSync(out).filter(f => f.endsWith('.webm')).join());
})();
