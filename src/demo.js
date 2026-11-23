/* Dữ liệu MẪU (hư cấu) để chạy thử chương trình – KHÔNG phải số liệu thật của công ty. */
(function (root) {
'use strict';
const H = root.HG;
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

function makeDemo(asof) {
  const r = rng(20261123), pick = a => a[Math.floor(r() * a.length)], rnd = (a, b) => a + (b - a) * r();
  const S = H.defaultSettings(); S.asof = asof;
  S.cash0 = 2.4e9; S.monthlySales = 9.5e9; S.growth = 1; S.cashSalesPct = 12; S.extraDelay = 8; S.collectRate = 98;
  S.purchasePct = 58; S.inventory = 6.2e9; S.slowStock = 0.9e9; S.targetDSO = 45;
  const custNames = ['Cty TNHH Thực phẩm An Phát', 'Cty CP Bánh kẹo Hải Hà Miền Bắc', 'Cty TNHH Dược phẩm Minh Châu', 'Cty CP Nhựa Tân Tiến', 'Cty TNHH Thủy sản Biển Xanh',
    'Cty CP Điện máy Việt Nhật', 'Cty TNHH May mặc Đông Dương', 'Cty CP Mỹ phẩm Sao Mai', 'Cty TNHH Nông sản Phương Nam', 'Cty CP Cơ khí Hòa Bình',
    'Cty TNHH Đồ uống Sông Hồng', 'Cty CP Logistics Toàn Cầu', 'Cty TNHH Gia dụng Kim Long', 'Cty CP Thương mại Đại Dương', 'Cty TNHH Điện tử Nam Việt',
    'Cty CP Thực phẩm Vinh Hạnh', 'Cty TNHH Đồ chơi Hoàng Long', 'Cty CP Vật liệu Xây dựng Đại Thành', 'Cty TNHH Hóa chất Tân Á', 'Cty CP Phân phối Bình Minh',
    'Cty TNHH In ấn Thành Công', 'Cty CP Xuất nhập khẩu Hưng Thịnh', 'Cty TNHH Dệt Phú Gia', 'Cty CP Bao bì Việt Hà', 'Cty TNHH Cà phê Tây Nguyên Xanh',
    'Cty TNHH Gốm sứ Bát Tràng', 'Cty CP Sữa Núi Cốc', 'Cty TNHH Giày dép Á Châu', 'Cty CP Nội thất Hòa Phát Mới', 'Cty TNHH Y tế Hà Nội',
    'Cửa hàng Văn phòng phẩm Ngọc Lan', 'Cty TNHH Thiết bị Công nghiệp Trường Sơn', 'Cty CP Bia Hà Thành', 'Cty TNHH Mây tre đan Phú Vinh', 'Đại lý Bao bì Minh Hiếu'];
  /* mỗi khách có "tính cách" trả tiền: trễ trung bình (ngày) & quy mô */
  const cprof = custNames.map((n, i) => ({ n, size: i < 4 ? 3.2 : i < 10 ? 1.6 : i < 22 ? 0.8 : 0.35, late: i % 9 === 0 ? 55 : i % 6 === 0 ? 28 : i % 4 === 0 ? 12 : 3, term: pick([15, 30, 30, 45, 45, 60]), owner: pick(['Lan', 'Hùng', 'Mai', 'Tuấn']) }));
  const ar = [], hist = [];
  cprof.forEach(c => {
    /* lịch sử: 10–16 hóa đơn đã thu trong 8 tháng gần đây */
    const nh = 10 + Math.floor(r() * 7);
    for (let k = 0; k < nh; k++) {
      const date = asof - 20 - Math.floor(r() * 230), due = date + c.term, amt = Math.round(rnd(40, 260) * c.size * 1e6 / 1e5) * 1e5;
      const paid = due + Math.round(c.late + rnd(-8, 12));
      if (paid < asof - 3) hist.push({ cust: c.n, due, paid, amt });
    }
    /* hóa đơn đang nợ */
    const no = 2 + Math.floor(r() * 5);
    for (let k = 0; k < no; k++) {
      const age = c.late > 40 ? Math.floor(rnd(20, 230)) : c.late > 20 ? Math.floor(rnd(8, c.term + 45)) : Math.floor(rnd(2, c.term + 12));
      const date = asof - age, amt = Math.round(rnd(60, 380) * c.size * 0.42e6 / 1e5) * 1e5;
      ar.push({ cust: c.n, ref: 'HD' + (24000 + ar.length), date, due: date + c.term, amt, owner: c.owner });
    }
  });
  const supN = [['Cty CP Giấy Việt Trì Mới', 0], ['Cty TNHH Decal Á Châu', 0], ['Cty TNHH Mực in Toyo VN', 0], ['Cty CP Hạt nhựa Hòa Phát', 0], ['Cty TNHH Màng PE Đại Phát', 1],
    ['Cty CP Thùng carton Hải Phòng', 1], ['Cty TNHH Túi PP Minh Anh', 1], ['Cty CP Bao bì Tân Hiệp', 1], ['Cty TNHH Vận tải Hùng Cường', 2], ['Cty CP Dịch vụ Bảo trì Máy Số 1', 2],
    ['Cty TNHH Linh kiện Máy in Kỹ thuật', 3], ['Cty CP Điện lực', 3], ['Cty TNHH Phụ gia Hóa chất Nam Á', 0], ['Cty CP Thương mại Xuất nhập khẩu Giấy', 0], ['Cty TNHH Vật tư Đóng gói Phát Lộc', 1]];
  const ap = [];
  supN.forEach(([n, g]) => {
    const no = 2 + Math.floor(r() * 4), term = pick([30, 45, 45, 60]);
    for (let k = 0; k < no; k++) {
      const date = asof - Math.floor(rnd(0, 50)), amt = Math.round(rnd(80, 650) * (g === 0 ? 1.6 : 1) * 0.5e6 / 1e5) * 1e5;
      ap.push({ sup: n, ref: 'PN' + (7000 + ap.length), date, due: date + term, amt, grp: S.apGroups[g].name });
    }
  });
  const d0 = H.ymd(asof);
  const rec = [
    { name: 'Lương công nhân & nhân viên', cat: 'luong', amt: 1.05e9, day: 8, freq: 'M', start: asof },
    { name: 'BHXH, BHYT, BHTN, công đoàn', cat: 'luong', amt: 0.38e9, day: 28, freq: 'M', start: asof },
    { name: 'Thuê nhà xưởng & kho', cat: 'mb', amt: 0.42e9, day: 5, freq: 'M', start: asof },
    { name: 'Điện, nước, gas', cat: 'mb', amt: 0.33e9, day: 15, freq: 'M', start: asof },
    { name: 'Nhiên liệu, bảo dưỡng đội xe, lương lái xe', cat: 'vh', amt: 0.36e9, day: 20, freq: 'M', start: asof },
    { name: 'Chi phí bán hàng, văn phòng, khác', cat: 'vh', amt: 0.27e9, day: 18, freq: 'M', start: asof },
    { name: 'Thuế GTGT phải nộp (ước tính)', cat: 'thue', amt: 0.62e9, day: 20, freq: 'M', start: asof },
    { name: 'Thuế TNDN tạm nộp quý', cat: 'thue', amt: 0.55e9, day: 30, freq: 'Q', start: H.dn(d0.y, 12, 30) },
    { name: 'Mua máy dán nhãn mới (đợt 2)', cat: 'khac', amt: 0.85e9, day: 12, freq: '1', start: asof + 20, disc: true },
    { name: 'Sửa chữa, nâng cấp kho', cat: 'khac', amt: 0.28e9, day: 12, freq: '1', start: asof + 35, disc: true }
  ];
  const loans = [
    { name: 'Vay VLĐ – Ngân hàng A', balance: 3.0e9, rate: 9.8, principal: 0, day: 25, maturity: asof + 52 },
    { name: 'Vay đầu tư máy in – Ngân hàng B', balance: 3.6e9, rate: 9.2, principal: 0.15e9, day: 10, maturity: null }
  ];
  S.salesOverride = {};
  return { S, ar, ap, hist, rec, loans, snaps: [] };
}
root.HGDemo = { makeDemo };
if (typeof module !== 'undefined' && module.exports) module.exports = root.HGDemo;
})(typeof window !== 'undefined' ? window : globalThis);
