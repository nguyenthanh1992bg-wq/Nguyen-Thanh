/* =====================================================================
 * APP – Dữ liệu & giả định, nhập/xuất Excel, hành động, khởi động
 * ===================================================================== */
const SFIELDS = [
  ['asof', 'Ngày chốt số liệu', 'date', 'Ngày xuất báo cáo công nợ từ phần mềm kế toán'],
  ['cash0', 'Số dư tiền (ngân hàng + quỹ) tại ngày chốt', 'money', 'Có thể gõ “2,4 tỷ” hoặc “850tr”'],
  ['minCash', 'Ngưỡng tiền tối thiểu an toàn', 'money', 'Để trống = tự tính bằng 2 tuần chi phí cố định'],
  ['monthlySales', 'Doanh thu bán hàng dự kiến mỗi tháng (gồm VAT)', 'money', 'Dùng cho bán hàng mới, DSO. Có thể chỉnh từng tháng ở bảng dưới'],
  ['growth', 'Tăng trưởng doanh thu mỗi tháng (%)', 'num', ''],
  ['monthEndPay', 'Khách trả tiền theo CHU KỲ CUỐI THÁNG (dồn vào 6 ngày làm việc cuối tháng)', 'check', 'Bật nếu lịch sử thu cho thấy tiền về tập trung cuối tháng'],
  ['cashSalesPct', 'Tỷ lệ doanh thu thu tiền ngay (%)', 'num', 'Bán lẻ/COD/đặt cọc'],
  ['termDays', 'Hạn thanh toán bình quân đơn mới (ngày)', 'num', 'Trống = lấy bình quân gia quyền từ dữ liệu phải thu'],
  ['extraDelay', 'Khách trả trễ bình quân thêm (ngày)', 'num', 'Dùng khi chưa có lịch sử thu của khách'],
  ['collectRate', 'Tỷ lệ thu được trên bán hàng mới (%)', 'num', 'Phần còn lại coi như nợ khó đòi'],
  ['purchasePct', 'Mua hàng/NVL mới (% doanh thu, gồm VAT)', 'num', 'Giấy, decal, mực, hạt nhựa, hàng thương mại…'],
  ['purTermDays', 'Hạn trả NCC đơn mua mới (ngày)', 'num', 'Trống = lấy bình quân từ dữ liệu phải trả'],
  ['apOverduePay', 'Nợ NCC đã quá hạn sẽ trả sau (ngày)', 'num', 'Giả định thanh toán trải đều quanh mốc này'],
  ['inventory', 'Giá trị hàng tồn kho (NVL + thành phẩm)', 'money', 'Để tính DIO / chu kỳ tiền'],
  ['slowStock', 'Trong đó tồn chậm luân chuyển >90 ngày', 'money', 'Để đánh giá phương án thanh lý'],
  ['targetDSO', 'Mục tiêu DSO (ngày)', 'num', ''], ['targetOver60', 'Mục tiêu nợ quá hạn >60 ngày (% phải thu)', 'num', ''], ['targetTop5', 'Trần tập trung Top 5 khách (% phải thu)', 'num', '']
];
const REC_CATS = [['luong', 'Lương & bảo hiểm'], ['mb', 'Mặt bằng, điện nước'], ['vh', 'Vận chuyển & vận hành'], ['thue', 'Thuế & phí'], ['khac', 'Chi khác / đầu tư']];
const FREQS = [['M', 'Hằng tháng'], ['Q', 'Hằng quý'], ['Y', 'Hằng năm'], ['1', 'Một lần']];

/* ---------------------------------------------------------------- màn hình DỮ LIỆU */
VIEWS.data = () => {
  const S = M.S, o = ymd(S.asof), months = [];
  for (let i = 0; i < 12; i++) { const t = ymd(dn(o.y, o.m + i, 1)); months.push(t.y + '-' + String(t.m).padStart(2, '0')); }
  const cnt = (n, l) => `<b>${n.toLocaleString('vi-VN')}</b> ${l}`;
  return `<div class="card"><h2>1. Nạp dữ liệu từ phần mềm kế toán</h2>
   <p class="sub">Chấp nhận file Excel (.xlsx, .xls) hoặc .csv. Chương trình tự nhận dạng dòng tiêu đề &amp; cột; bạn kiểm tra lại ở bước xem trước trước khi nạp. Dữ liệu chỉ lưu trong trình duyệt máy này (không gửi đi đâu).</p>
   <div class="grid3">
    <div class="drop"><b>Phải thu</b><br>${cnt(M.ar.length, 'hóa đơn')}<br><button class="p" data-act="imp" data-v="ar">Nạp file phải thu</button><div class="note">Cột cần: Khách hàng, Số tiền còn nợ, Hạn thanh toán (hoặc Ngày HĐ + số ngày nợ).</div></div>
    <div class="drop"><b>Phải trả</b><br>${cnt(M.ap.length, 'hóa đơn')}<br><button class="p" data-act="imp" data-v="ap">Nạp file phải trả</button><div class="note">Cột cần: Nhà cung cấp, Số tiền còn nợ, Ngày đến hạn.</div></div>
    <div class="drop"><b>Lịch sử thu tiền (tuỳ chọn)</b><br>${cnt(M.hist.length, 'dòng')}<br><button data-act="imp" data-v="hist">Nạp lịch sử thu</button><div class="note">Khách, Ngày đến hạn, Ngày thu thực tế, Số tiền → chương trình tính khách nào hay trả trễ để dự báo chính xác hơn.</div></div></div>
   <p style="margin-top:12px"><button data-act="imp_all">Nạp file mẫu đầy đủ (nhiều sheet)</button> <button data-act="exp_tpl">Tải file Excel MẪU</button> <button data-act="exp_all">Xuất toàn bộ dữ liệu ra Excel</button> <button data-act="backup">Sao lưu (.json)</button> <button data-act="restore">Khôi phục sao lưu</button> <button data-act="demo">Nạp dữ liệu mẫu (hư cấu)</button> <button class="d" data-act="clear">Xóa toàn bộ</button></p>
   <input type="file" id="fileIn" accept=".xlsx,.xls,.csv,.json" hidden></div>
  <div class="card"><h2>2. Thêm nhanh từng hóa đơn</h2><div class="grid2">
   <div><b>Phải thu</b><div class="inp" style="margin-top:6px"><label>Khách hàng<input type="text" id="n_ar_cust"></label><label>Số hóa đơn<input type="text" id="n_ar_ref"></label><label>Ngày HĐ<input type="date" id="n_ar_date"></label><label>Hạn thanh toán<input type="date" id="n_ar_due"></label><label>Số tiền còn nợ<input type="text" id="n_ar_amt"></label><label>Phụ trách<input type="text" id="n_ar_owner"></label></div><p><button data-act="add_ar">+ Thêm phải thu</button></p></div>
   <div><b>Phải trả</b><div class="inp" style="margin-top:6px"><label>Nhà cung cấp<input type="text" id="n_ap_sup"></label><label>Số hóa đơn<input type="text" id="n_ap_ref"></label><label>Ngày HĐ<input type="date" id="n_ap_date"></label><label>Ngày đến hạn<input type="date" id="n_ap_due"></label><label>Số tiền còn nợ<input type="text" id="n_ap_amt"></label><label>Nhóm NCC<select id="n_ap_grp">${S.apGroups.map(g => `<option>${esc(g.name)}</option>`).join('')}</select></label></div><p><button data-act="add_ap">+ Thêm phải trả</button></p></div></div></div>
  <div class="card"><h2>3. Thông số chung &amp; giả định</h2><div class="inp">${SFIELDS.map(([k, l, t, h]) => `<label>${l}${inp('S.' + k, t)}<span class="h">${h}</span></label>`).join('')}</div>
   <h3>Doanh thu từng tháng (ghi đè nếu khác mức bình quân; trống = dùng mức chung × tăng trưởng)</h3>
   <div class="inp" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">${months.map(k => `<label>${k}${inp('S.salesOverride.' + k, 'money')}</label>`).join('')}</div></div>
  <div class="grid2"><div class="card"><h2>4. Xác suất thu nợ &amp; thời gian chờ theo tuổi nợ</h2><p class="sub">Dùng cho phải thu hiện có. Xác suất = khả năng thu được trong vòng 13 tháng; “chờ” = số ngày kể từ ngày chốt đến lúc tiền về (với nợ quá hạn). Nên hiệu chỉnh theo lịch sử thực tế của công ty.</p>
   <div class="tw nomax"><table><thead><tr><th>Nhóm tuổi nợ</th><th>Xác suất thu (%)</th><th>Chờ (ngày)</th></tr></thead><tbody>${HG.BUCKETS.map((b, i) => `<tr><td>${b}</td><td>${inp('S.bucketP.' + i, 'pct')}</td><td>${i ? inp('S.bucketWait.' + i, 'num') : '<span class="note">theo hạn + trễ TB</span>'}</td></tr>`).join('')}</tbody></table></div></div>
  <div class="card"><h2>5. Nhóm nhà cung cấp &amp; khả năng giãn hạn</h2><div class="tw nomax"><table><thead><tr><th>Nhóm</th><th>Giãn được (ngày)</th><th></th></tr></thead><tbody>${S.apGroups.map((g, i) => `<tr><td>${inp('S.apGroups.' + i + '.name', 'text')}</td><td>${inp('S.apGroups.' + i + '.stretch', 'num')}</td><td><button class="s d" data-act="delrow" data-p="S.apGroups" data-i="${i}">Xóa</button></td></tr>`).join('')}</tbody></table></div><p><button class="s" data-act="addrow" data-p="apgroup">+ Thêm nhóm</button></p></div></div>
  <div class="card"><h2>6. Chi phí cố định, thu/chi định kỳ &amp; khoản chi một lần</h2><p class="sub">Lương, thuê, điện nước, vận chuyển, thuế…; khoản đầu tư/chi một lần đánh dấu “hoãn được” để chương trình cân nhắc dời lại khi thiếu tiền.</p>
   <div class="tw nomax"><table><thead><tr><th>Khoản mục</th><th>Loại chi</th><th>Thu/Chi</th><th>Số tiền (VND)</th><th>Ngày trong tháng</th><th>Tần suất</th><th>Bắt đầu / ngày chi</th><th>Kết thúc</th><th>Hoãn được</th><th></th></tr></thead><tbody>
   ${M.rec.map((r, i) => `<tr><td>${inp('rec.' + i + '.name', 'text')}</td><td>${inp('rec.' + i + '.cat', 'select', { opts: REC_CATS })}</td><td>${inp('rec.' + i + '.sign', 'select', { opts: [['chi', 'Chi'], ['thu', 'Thu']] })}</td><td>${inp('rec.' + i + '.amt', 'money')}</td><td>${inp('rec.' + i + '.day', 'num')}</td><td>${inp('rec.' + i + '.freq', 'select', { opts: FREQS })}</td><td>${inp('rec.' + i + '.start', 'date')}</td><td>${inp('rec.' + i + '.end', 'date')}</td><td class="c">${inp('rec.' + i + '.disc', 'check')}</td><td><button class="s d" data-act="delrow" data-p="rec" data-i="${i}">Xóa</button></td></tr>`).join('')}</tbody></table></div><p><button class="s" data-act="addrow" data-p="rec">+ Thêm khoản mục</button></p></div>
  <div class="card"><h2>7. Khoản vay ngân hàng</h2><p class="sub">Lãi = dư nợ × lãi suất / 12 mỗi tháng; gốc trả đều theo “gốc hằng tháng”, đến ngày đáo hạn trả hết dư nợ còn lại (để trống ngày đáo hạn nếu trả dần).</p>
   <div class="tw nomax"><table><thead><tr><th>Khoản vay</th><th>Dư nợ (VND)</th><th>Lãi suất (%/năm)</th><th>Gốc trả hằng tháng</th><th>Ngày trả trong tháng</th><th>Ngày đáo hạn</th><th>Đảo nợ khi đáo hạn (%)</th><th></th></tr></thead><tbody>
   ${M.loans.map((r, i) => `<tr><td>${inp('loans.' + i + '.name', 'text')}</td><td>${inp('loans.' + i + '.balance', 'money')}</td><td>${inp('loans.' + i + '.rate', 'num')}</td><td>${inp('loans.' + i + '.principal', 'money')}</td><td>${inp('loans.' + i + '.day', 'num')}</td><td>${inp('loans.' + i + '.maturity', 'date')}</td><td>${inp('loans.' + i + '.roll', 'num')}</td><td><button class="s d" data-act="delrow" data-p="loans" data-i="${i}">Xóa</button></td></tr>`).join('')}</tbody></table></div><p><button class="s" data-act="addrow" data-p="loan">+ Thêm khoản vay</button></p></div>`;
};

/* ---------------------------------------------------------------- NHẬP FILE */
const deacc = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const IMP = {
  ar: { name: 'Phải thu', req: ['cust', 'amt'], fields: [['ref', 'Số hóa đơn', ['so hoa don', 'so hd', 'so ct', 'so chung tu', 'invoice', 'so phieu']], ['date', 'Ngày hóa đơn', ['ngay hoa don', 'ngay hd', 'ngay ct', 'ngay chung tu', 'ngay lap', 'ngay']], ['due', 'Hạn thanh toán / ngày đến hạn', ['han thanh toan', 'ngay den han', 'den han', 'han tt', 'ngay dao han', 'due']], ['term', 'Số ngày được nợ', ['so ngay no', 'so ngay duoc no', 'han no', 'so ngay']], ['owner', 'Nhân viên phụ trách', ['nhan vien', 'phu trach', 'nvkd', 'sale', 'nguoi phu trach']], ['cust', 'Khách hàng', ['khach hang', 'ten khach', 'ten doi tuong', 'doi tuong', 'customer', 'ma khach', 'ten kh']], ['amt', 'Số tiền còn nợ', ['so tien con no', 'con no', 'con lai', 'du no', 'no cuoi', 'phai thu', 'so tien', 'gia tri', 'amount']]] },
  ap: { name: 'Phải trả', req: ['sup', 'amt'], fields: [['ref', 'Số hóa đơn', ['so hoa don', 'so hd', 'so ct', 'so chung tu', 'invoice', 'so phieu']], ['date', 'Ngày hóa đơn', ['ngay hoa don', 'ngay hd', 'ngay ct', 'ngay chung tu', 'ngay lap', 'ngay']], ['due', 'Ngày đến hạn', ['han thanh toan', 'ngay den han', 'den han', 'han tt', 'ngay dao han', 'due']], ['grp', 'Nhóm NCC', ['nhom ncc', 'nhom nha cung cap', 'nhom', 'loai']], ['sup', 'Nhà cung cấp', ['nha cung cap', 'ncc', 'ten ncc', 'ten doi tuong', 'doi tuong', 'supplier']], ['amt', 'Số tiền còn nợ', ['so tien con no', 'con no', 'con lai', 'du no', 'no cuoi', 'phai tra', 'so tien', 'gia tri', 'amount']]] },
  hist: { name: 'Lịch sử thu', req: ['cust', 'due', 'paid'], fields: [['due', 'Ngày đến hạn', ['ngay den han', 'han thanh toan', 'den han', 'han tt']], ['paid', 'Ngày thu thực tế', ['ngay thu thuc te', 'ngay thu', 'ngay thanh toan', 'ngay tra', 'ngay tien ve']], ['cust', 'Khách hàng', ['khach hang', 'ten khach', 'doi tuong', 'customer']], ['amt', 'Số tiền', ['so tien', 'gia tri', 'amount']]] },
  rec: { name: 'Chi phí', req: ['name', 'amt'], fields: [['cat', 'Loại', ['loai chi', 'loai', 'nhom']], ['sign', 'Thu/Chi', ['thu chi', 'chieu']], ['amt', 'Số tiền', ['so tien', 'gia tri']], ['day', 'Ngày trong tháng', ['ngay trong thang', 'ngay tra', 'ngay chi']], ['freq', 'Tần suất', ['tan suat', 'ky']], ['start', 'Bắt đầu', ['bat dau', 'tu ngay', 'ngay chi', 'tu']], ['end', 'Kết thúc', ['ket thuc', 'den ngay']], ['disc', 'Hoãn được', ['hoan duoc', 'co the hoan', 'hoan']], ['name', 'Khoản mục', ['khoan muc', 'ten khoan', 'noi dung', 'ten']]] },
  loans: { name: 'Khoản vay', req: ['name', 'balance'], fields: [['balance', 'Dư nợ', ['du no', 'so du']], ['rate', 'Lãi suất', ['lai suat', 'lai']], ['principal', 'Gốc hằng tháng', ['goc hang thang', 'goc tra hang thang', 'goc']], ['day', 'Ngày trả', ['ngay tra', 'ngay tra trong thang']], ['maturity', 'Ngày đáo hạn', ['ngay dao han', 'dao han', 'ket thuc']], ['name', 'Khoản vay', ['ten khoan vay', 'khoan vay', 'ten']]] }
};
const SHEETKEY = { phaithu: 'ar', phaitra: 'ap', lichsuthu: 'hist', chiphi: 'rec', khoanvay: 'loans', caidat: 'set' };
const SHEETNAME = { ar: 'PhaiThu', ap: 'PhaiTra', hist: 'LichSuThu', rec: 'ChiPhi', loans: 'KhoanVay' };

function sheetRows(ws) { return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: false }); }
function detectHeader(rows, target) {
  let best = 0, bi = 0; const syn = IMP[target].fields.flatMap(f => f[2]);
  for (let i = 0; i < Math.min(rows.length, 30); i++) { const sc = (rows[i] || []).filter(c => c != null && syn.some(s => deacc(c) === s || deacc(c).includes(s))).length; if (sc > best) { best = sc; bi = i; } }
  return bi;
}
function guessMap(headers, target) {
  const used = new Set(), map = {}, H = headers.map(deacc);
  IMP[target].fields.forEach(([k, , syn]) => {
    let idx = -1;
    for (const s of syn) { idx = H.findIndex((h, i) => !used.has(i) && h === s); if (idx >= 0) break; }
    if (idx < 0) for (const s of syn) { idx = H.findIndex((h, i) => !used.has(i) && h && h.includes(s)); if (idx >= 0) break; }
    map[k] = idx; if (idx >= 0) used.add(idx);
  });
  return map;
}
const cell = (r, i) => (i == null || i < 0 || !r) ? null : r[i];
const txt = v => v == null ? '' : String(v).trim();
function parseCat(v) { const s = deacc(v); if (['luong', 'mb', 'vh', 'thue', 'khac'].includes(s)) return s; if (/luong|bao hiem|bhxh/.test(s)) return 'luong'; if (/mat bang|thue nha|thue xuong|thue kho|dien|nuoc|gas/.test(s)) return 'mb'; if (/van chuyen|xe|van hanh|nhien lieu|ban hang/.test(s)) return 'vh'; if (/thue|phi/.test(s)) return 'thue'; return 'khac'; }
function parseFreq(v) { const s = deacc(v); if (!s) return 'M'; if (/^(m|hang thang|thang)/.test(s)) return 'M'; if (/^(q|quy|hang quy)/.test(s)) return 'Q'; if (/^(y|nam|hang nam)/.test(s)) return 'Y'; if (/^(1|mot lan|1 lan)/.test(s)) return '1'; return 'M'; }
function parseRows(target, rows, hdr, map) {
  const out = [];
  rows.slice(hdr + 1).forEach(r => {
    if (!r || r.every(c => c == null || c === '')) return;
    const g = k => cell(r, map[k]);
    if (target === 'ar' || target === 'ap') {
      const nm = txt(g(target === 'ar' ? 'cust' : 'sup')), amt = parseNum(g('amt'));
      if (!nm || amt == null || amt === 0 || /^(tong|cong|total)/.test(deacc(nm))) return;
      const o = { ref: txt(g('ref')), date: parseDate(g('date')), due: parseDate(g('due')), amt };
      if (target === 'ar') { o.cust = nm; o.owner = txt(g('owner')); const t = parseNum(g('term')); if (o.due == null && o.date != null && t != null) o.due = o.date + t; }
      else { o.sup = nm; o.grp = txt(g('grp')) || 'Khác'; }
      out.push(o);
    } else if (target === 'hist') {
      const c = txt(g('cust')), due = parseDate(g('due')), paid = parseDate(g('paid'));
      if (c && due != null && paid != null) out.push({ cust: c, due, paid, amt: parseNum(g('amt')) || 1 });
    } else if (target === 'rec') {
      const nm = txt(g('name')), amt = parseNum(g('amt')); if (!nm || !amt) return;
      const freq = parseFreq(g('freq')), sg = deacc(g('sign'));
      out.push({ name: nm, cat: parseCat(g('cat')), sign: /^thu/.test(sg) ? 'thu' : 'chi', amt: Math.abs(amt), day: parseNum(g('day')) || null, freq, start: parseDate(g('start')), end: parseDate(g('end')), disc: /^(x|c|co|1|true|yes|y)/.test(deacc(g('disc'))) });
    } else if (target === 'loans') {
      const nm = txt(g('name')), b = parseNum(g('balance')); if (!nm || !b) return;
      out.push({ name: nm, balance: b, rate: parseNum(g('rate')) || 0, principal: parseNum(g('principal')) || 0, day: parseNum(g('day')) || 25, maturity: parseDate(g('maturity')) });
    }
  });
  return out;
}
function commitRows(target, items, mode) {
  if (target === 'ap') items.forEach(x => { if (!M.S.apGroups.some(g => keyOf(g.name) === keyOf(x.grp))) M.S.apGroups.push({ name: x.grp, stretch: 0 }); });
  M[target] = mode === 'append' ? M[target].concat(items) : items;
}
function pickFile(accept, cb) {
  const i = $('#fileIn'); if (!i) return; i.accept = accept; i.onchange = () => { const f = i.files[0]; i.value = ''; if (f) cb(f); };
  i.click();
}
function readBook(file, cb) {
  const fr = new FileReader();
  fr.onload = () => { try { const wb = XLSX.read(fr.result, { type: 'array' }); cb(wb); } catch (e) { toast('Không đọc được file: ' + e.message); } };
  fr.readAsArrayBuffer(file);
}
function startImport(target) {
  pickFile('.xlsx,.xls,.csv', f => readBook(f, wb => {
    const want = Object.keys(SHEETKEY).find(k => SHEETKEY[k] === target);
    let sheet = wb.SheetNames.find(n => deacc(n).replace(/ /g, '') === want) || wb.SheetNames.reduce((b, n) => sheetRows(wb.Sheets[n]).length > sheetRows(wb.Sheets[b]).length ? n : b, wb.SheetNames[0]);
    UI.pending = { target, file: f.name, wb, mode: 'replace' }; loadSheet(sheet); renderModal();
  }));
}
function loadSheet(name) {
  const p = UI.pending; p.sheet = name; p.rows = sheetRows(p.wb.Sheets[name]); p.hdr = detectHeader(p.rows, p.target);
  p.map = guessMap(p.rows[p.hdr] || [], p.target);
}
function renderModal() {
  let m = $('#modal'); const p = UI.pending;
  if (!p) { if (m) m.remove(); return; }
  if (!m) { m = document.createElement('div'); m.id = 'modal'; m.className = 'modal'; document.body.appendChild(m); }
  const I = IMP[p.target], headers = p.rows[p.hdr] || [], items = parseRows(p.target, p.rows, p.hdr, p.map);
  const ok = I.req.every(k => p.map[k] >= 0) && items.length > 0;
  const opt = k => `<option value="-1">(không có)</option>` + headers.map((h, i) => `<option value="${i}" ${p.map[k] === i ? 'selected' : ''}>${esc(txt(h) || 'Cột ' + (i + 1))}</option>`).join('');
  const prev = items.slice(0, 5).map(x => '<tr>' + I.fields.map(([k]) => { const key = k; let v = x[key === 'cust' && p.target === 'ap' ? 'sup' : key]; if (v != null && ['date', 'due', 'paid', 'start', 'end', 'maturity'].includes(k)) v = fmtDate(v); else if (typeof v === 'number') v = ff(v); return `<td>${esc(v == null ? '' : v)}</td>`; }).join('') + '</tr>').join('');
  m.innerHTML = `<div><h2>Nạp ${I.name} – ${esc(p.file)}</h2>
   <div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:8px"><label>Sheet: <select data-m="sheet">${p.wb.SheetNames.map(n => `<option ${n === p.sheet ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label><label>Dòng tiêu đề: <input type="number" min="1" style="width:70px" data-m="hdr" value="${p.hdr + 1}"></label><span class="note">${p.rows.length} dòng trong sheet</span></div>
   <p class="sub">Kiểm tra ghép cột (chọn lại nếu chưa đúng). Cột có dấu * là bắt buộc.</p>
   <div class="inp">${I.fields.map(([k, l]) => `<label>${l}${I.req.includes(k) ? ' *' : ''}<select data-m="map" data-k="${k}">${opt(k)}</select></label>`).join('')}</div>
   <h3>Xem trước (${items.length} dòng hợp lệ)</h3>${items.length ? `<div class="tw nomax"><table><thead><tr>${I.fields.map(f => `<th>${f[1]}</th>`).join('')}</tr></thead><tbody>${prev}</tbody></table></div>` : '<div class="alert bad">Chưa đọc được dòng dữ liệu nào – kiểm tra dòng tiêu đề và cột.</div>'}
   <p style="margin-top:10px"><label><input type="radio" name="mm" data-m="mode" value="replace" ${p.mode === 'replace' ? 'checked' : ''}> Thay thế dữ liệu cũ</label> &nbsp; <label><input type="radio" name="mm" data-m="mode" value="append" ${p.mode === 'append' ? 'checked' : ''}> Thêm vào dữ liệu cũ</label></p>
   <p><button class="p" data-act="m_ok" ${ok ? '' : 'disabled'}>Nạp ${items.length} dòng</button> <button data-act="m_cancel">Hủy</button></p></div>`;
}
document.addEventListener('change', e => {
  const t = e.target; if (!t.dataset || !t.dataset.m) return; const p = UI.pending; if (!p) return;
  if (t.dataset.m === 'sheet') loadSheet(t.value);
  else if (t.dataset.m === 'hdr') { p.hdr = Math.max(0, (+t.value || 1) - 1); p.map = guessMap(p.rows[p.hdr] || [], p.target); }
  else if (t.dataset.m === 'map') p.map[t.dataset.k] = +t.value;
  else if (t.dataset.m === 'mode') p.mode = t.value;
  renderModal();
});

function importAll() {
  pickFile('.xlsx,.xls', f => readBook(f, wb => {
    const log = [];
    wb.SheetNames.forEach(n => {
      const key = SHEETKEY[deacc(n).replace(/ /g, '')]; if (!key) return;
      const rows = sheetRows(wb.Sheets[n]);
      if (key === 'set') { const k = importSettings(rows); log.push('Cài đặt: ' + k + ' thông số'); return; }
      const hdr = detectHeader(rows, key), map = guessMap(rows[hdr] || [], key), items = parseRows(key, rows, hdr, map);
      commitRows(key, items, 'replace'); log.push(IMP[key].name + ': ' + items.length);
    });
    if (!log.length) { toast('Không thấy sheet đúng tên (PhaiThu, PhaiTra, LichSuThu, ChiPhi, KhoanVay, CaiDat). Hãy tải file Excel MẪU.'); return; }
    save(); recalc(); render(); toast('Đã nạp – ' + log.join(' · '));
  }));
}
function importSettings(rows) {
  let n = 0;
  rows.forEach(r => { if (!r || r[0] == null) return; const f = SFIELDS.find(x => deacc(x[1]) === deacc(r[0])); if (!f) return; const [k, , t] = f; let v = r[1]; if (v == null || v === '') { if (t === 'money' || t === 'num') M.S[k] = null; return; } v = t === 'date' ? parseDate(v) : t === 'money' ? pm(v) : parseNum(v); if (v != null) { M.S[k] = v; n++; } });
  return n;
}

/* ---------------------------------------------------------------- XUẤT FILE */
function stamp() { const o = ymd(M.S.asof); return o.y + String(o.m).padStart(2, '0') + String(o.d).padStart(2, '0'); }
function buildWorkbook(blank) {
  const wb = XLSX.utils.book_new(), add = (name, aoa, w) => { const ws = XLSX.utils.aoa_to_sheet(aoa); ws['!cols'] = (w || []).map(x => ({ wch: x })); XLSX.utils.book_append_sheet(wb, ws, name); };
  const d = x => x == null ? '' : fmtDate(x);
  const ex = blank;
  add('HuongDan', [['HƯỚNG DẪN'], ['1. Điền dữ liệu vào các sheet PhaiThu, PhaiTra, LichSuThu (tuỳ chọn), ChiPhi, KhoanVay, CaiDat. Giữ nguyên dòng tiêu đề.'], ['2. Ngày nhập dạng dd/mm/yyyy. Số tiền là VND, không cần định dạng.'], ['3. Trong app: tab Dữ liệu → “Nạp file mẫu đầy đủ”. Có thể nạp riêng từng sheet bằng nút tương ứng (app tự nhận cột nên file xuất thẳng từ phần mềm kế toán cũng dùng được).'], ['4. Loại chi (ChiPhi): luong, mb, vh, thue, khac. Tần suất: M (tháng), Q (quý), Y (năm), 1 (một lần). Hoãn được: x']], [120]);
  add('PhaiThu', [['Khách hàng', 'Số hóa đơn', 'Ngày hóa đơn', 'Hạn thanh toán', 'Số tiền còn nợ', 'Nhân viên phụ trách']].concat(ex ? [['Cty ABC (ví dụ)', 'HD0001', '01/11/2026', '01/12/2026', 120000000, 'Lan']] : M.ar.map(r => [r.cust, r.ref, d(r.date), d(r.due), r.amt, r.owner])), [34, 14, 14, 14, 18, 18]);
  add('PhaiTra', [['Nhà cung cấp', 'Số hóa đơn', 'Ngày hóa đơn', 'Ngày đến hạn', 'Số tiền còn nợ', 'Nhóm NCC']].concat(ex ? [['Cty Giấy XYZ (ví dụ)', 'PN0001', '05/11/2026', '05/12/2026', 250000000, 'Nguyên liệu (giấy, decal, mực, hạt nhựa)']] : M.ap.map(r => [r.sup, r.ref, d(r.date), d(r.due), r.amt, r.grp])), [34, 14, 14, 14, 18, 40]);
  add('LichSuThu', [['Khách hàng', 'Ngày đến hạn', 'Ngày thu thực tế', 'Số tiền']].concat(ex ? [['Cty ABC (ví dụ)', '01/10/2026', '10/10/2026', 90000000]] : M.hist.map(r => [r.cust, d(r.due), d(r.paid), r.amt])), [34, 14, 16, 18]);
  add('ChiPhi', [['Khoản mục', 'Loại chi', 'Thu/Chi', 'Số tiền', 'Ngày trong tháng', 'Tần suất', 'Bắt đầu', 'Kết thúc', 'Hoãn được']].concat(ex ? [['Lương công nhân (ví dụ)', 'luong', 'chi', 1000000000, 8, 'M', '', '', '']] : M.rec.map(r => [r.name, r.cat, r.sign || 'chi', r.amt, r.day, r.freq, d(r.start), d(r.end), r.disc ? 'x' : ''])), [36, 10, 8, 16, 12, 10, 12, 12, 10]);
  add('KkhoanVay'.replace('KkhoanVay', 'KhoanVay'), [['Khoản vay', 'Dư nợ', 'Lãi suất', 'Gốc hằng tháng', 'Ngày trả', 'Ngày đáo hạn']].concat(ex ? [['Vay VLĐ ngân hàng A (ví dụ)', 3000000000, 9.8, 0, 25, '31/01/2027']] : M.loans.map(r => [r.name, r.balance, r.rate, r.principal, r.day, d(r.maturity)])), [36, 16, 10, 16, 10, 14]);
  add('CaiDat', [['Thông số', 'Giá trị']].concat(SFIELDS.map(([k, l, t]) => [l, ex ? '' : (M.S[k] == null ? '' : t === 'date' ? fmtDate(M.S[k]) : M.S[k])])), [56, 22]);
  return wb;
}
function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
function writeBook(wb, name) { XLSX.writeFile(wb, name); }

function exportAR() {
  const A = R.arA, aoa = [['Khách hàng', 'Phụ trách', 'Dư nợ', '% tổng', 'Quy mô', 'Hạng', 'Chưa đến hạn', 'QH 1–30', 'QH 31–60', 'QH 61–90', 'QH 91–180', 'QH >180', 'Trễ tối đa (ngày)', 'Điểm', 'Nhóm chiến lược', 'Hành động']];
  A.cust.forEach(c => aoa.push([c.cust, c.owner, Math.round(c.total), +(c.share * 100).toFixed(2), c.size, c.grade].concat(c.b.map(Math.round), [c.maxOver > 0 ? c.maxOver : 0, c.score, HG.SEGS[c.seg].name, ACTION_BY_GRADE[c.grade]])));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'PhaiThu_KhachHang');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Khách hàng', 'Số HĐ', 'Ngày HĐ', 'Hạn TT', 'Số tiền', 'Ngày quá hạn', 'Nhóm tuổi nợ']].concat(A.inv.map(x => [x.cust, x.ref, fmtDate(x.date), fmtDate(x.due), x.amt, Math.max(0, x.over), HG.BUCKETS[x.b]]))), 'ChiTiet_HoaDon');
  writeBook(wb, 'HoangGia_PhaiThu_' + stamp() + '.xlsx');
}
function exportCash() {
  const n = UI.view === 'week' ? 13 : 12, ag = HG.aggregate(R.scen[UI.scen].ev, M.S, UI.view, n);
  const aoa = [['Khoản mục (VND) – kịch bản ' + HG.SCENARIOS[UI.scen].name].concat(ag.labels, ['Cộng']), ['Số dư đầu kỳ'].concat(Array.from(ag.open).map(Math.round), [''])];
  const line = (l, arr, neg) => aoa.push([l].concat(Array.from(arr).map(v => Math.round(neg ? -v : v)), [Math.round(sum(Array.from(arr)) * (neg ? -1 : 1))]));
  HG.IN_CATS.forEach(c => line(HG.CATS[c], ag.byCat[c])); line('Tổng thu', ag.inflow);
  HG.OUT_CATS.forEach(c => line(HG.CATS[c], ag.byCat[c], 1)); line('Tổng chi', ag.outflow, 1); line('Dòng tiền ròng', ag.net);
  aoa.push(['Số dư cuối kỳ'].concat(Array.from(ag.close).map(Math.round), [''])); aoa.push(['Số dư thấp nhất trong kỳ'].concat(Array.from(ag.minIn).map(Math.round), ['']));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'DongTien');
  const L = R.lev.results.map(x => [x.id, x.name, x.score, x.sImpact, x.sSpeed, x.sFeas, x.sRisk, Math.round(x.impact), Math.round(x.cost), x.ttc]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Mã', 'Phương án', 'Điểm', 'Tác động', 'Tốc độ', 'Khả thi', 'CP & rủi ro', 'Tác động (VND)', 'Chi phí (VND)', 'Ra tiền sau (ngày)']].concat(L)), 'PhuongAn');
  writeBook(wb, 'HoangGia_DongTien_' + stamp() + '.xlsx');
}

/* ---------------------------------------------------------------- HÀNH ĐỘNG */
function newRec() { return { name: '', cat: 'khac', sign: 'chi', amt: 0, day: 1, freq: 'M', start: M.S.asof, end: null, disc: false }; }
function addInvoice(kind) {
  const g = id => { const e = $('#' + id); return e ? e.value : ''; };
  if (kind === 'ar') { const amt = pm(g('n_ar_amt')); if (!g('n_ar_cust').trim() || !amt) return toast('Cần tên khách và số tiền'); M.ar.push({ cust: g('n_ar_cust').trim(), ref: g('n_ar_ref'), date: parseDate(g('n_ar_date')), due: parseDate(g('n_ar_due')), amt, owner: g('n_ar_owner') }); }
  else { const amt = pm(g('n_ap_amt')); if (!g('n_ap_sup').trim() || !amt) return toast('Cần tên NCC và số tiền'); M.ap.push({ sup: g('n_ap_sup').trim(), ref: g('n_ap_ref'), date: parseDate(g('n_ap_date')), due: parseDate(g('n_ap_due')), amt, grp: g('n_ap_grp') }); }
  save(); recalc(); render(true); toast('Đã thêm');
}
function snapshot() {
  const A = R.arA, key = HG.monthKey(M.S.asof), old = M.snaps.find(s => s.key === key);
  const s = { key, asof: M.S.asof, score: R.health.score, grade: R.health.grade, ar: A.total, ap: R.apA.total, over60Pct: A.over60Pct, dso: R.dso, minBal: R.mb.base.v, picks: R.lev.top.map(x => ({ id: x.id, name: x.name, score: x.score, impact: x.impact })), actual: old ? old.actual : null, note: old ? old.note : '' };
  M.snaps = M.snaps.filter(x => x.key !== key).concat(s).sort((a, b) => a.key > b.key ? 1 : -1); save(); render(true); toast('Đã chốt đề xuất ' + key);
}
const ACT = {
  tab: t => { UI.tab = t.dataset.v; render(); window.scrollTo(0, 0); },
  sort: t => { const id = t.dataset.id, k = +t.dataset.k, s = UI.sort[id]; UI.sort[id] = { k, dir: s && s.k === k && s.dir === 'desc' ? 'asc' : 'desc' }; render(true); },
  more: t => { UI.more[t.dataset.id] = true; render(true); },
  pickcust: (t, e) => { e.preventDefault(); UI.cust = t.dataset.k; if (t.dataset.goto) UI.tab = t.dataset.goto; render(true); if (UI.cust) setTimeout(() => { const h = [...document.querySelectorAll('.card h2')].find(x => x.textContent.startsWith('Chi tiết hóa đơn')); if (h) h.scrollIntoView({ behavior: 'smooth' }); }, 50); },
  scen: t => { UI.scen = t.dataset.v; render(true); }, view: t => { UI.view = t.dataset.v; render(true); },
  selpa: t => { const v = t.dataset.v; UI.sel.has(v) ? UI.sel.delete(v) : UI.sel.add(v); render(true); },
  snap: snapshot,
  demo: () => { if ((M.ar.length || M.ap.length) && !confirm('Thay toàn bộ dữ liệu hiện tại bằng dữ liệu MẪU (hư cấu)?')) return; M = Object.assign(blankModel(), HGDemo.makeDemo(HG.todayDn())); M.snaps = []; save(); recalc(); UI.tab = 'home'; render(); toast('Đã nạp dữ liệu mẫu hư cấu – chỉ để xem thử'); },
  clear: () => { if (!confirm('Xóa TOÀN BỘ dữ liệu và cài đặt trên trình duyệt này? (nên sao lưu trước)')) return; M = blankModel(); save(); recalc(); render(); },
  imp: t => startImport(t.dataset.v), imp_all: importAll, exp_tpl: () => writeBook(buildWorkbook(true), 'HoangGia_File_Mau_Nhap_Lieu.xlsx'), exp_all: () => writeBook(buildWorkbook(false), 'HoangGia_DuLieu_' + stamp() + '.xlsx'),
  exp_ar: () => R && exportAR(), exp_cash: () => R && exportCash(),
  backup: () => download(new Blob([JSON.stringify(M)], { type: 'application/json' }), 'HoangGia_SaoLuu_' + stamp() + '.json'),
  restore: () => pickFile('.json', f => { const fr = new FileReader(); fr.onload = () => { try { const j = JSON.parse(fr.result), b = blankModel(); M = { S: deepMerge(b.S, j.S), ar: j.ar || [], ap: j.ap || [], hist: j.hist || [], rec: j.rec || [], loans: j.loans || [], snaps: j.snaps || [] }; save(); recalc(); render(); toast('Đã khôi phục'); } catch (e) { toast('File sao lưu không hợp lệ'); } }; fr.readAsText(f); }),
  add_ar: () => addInvoice('ar'), add_ap: () => addInvoice('ap'),
  addrow: t => { const p = t.dataset.p; if (p === 'rec') M.rec.push(newRec()); else if (p === 'loan') M.loans.push({ name: '', balance: 0, rate: 9, principal: 0, day: 25, maturity: null }); else M.S.apGroups.push({ name: 'Nhóm mới', stretch: 0 }); save(); recalc(); render(true); },
  delrow: t => { getPath(t.dataset.p).splice(+t.dataset.i, 1); save(); recalc(); render(true); },
  m_ok: () => { const p = UI.pending, items = parseRows(p.target, p.rows, p.hdr, p.map); commitRows(p.target, items, p.mode); UI.pending = null; renderModal(); save(); recalc(); render(true); toast('Đã nạp ' + items.length + ' dòng ' + IMP[p.target].name); },
  m_cancel: () => { UI.pending = null; renderModal(); }
};
document.addEventListener('click', e => { const t = e.target.closest('[data-act]'); if (!t || !ACT[t.dataset.act]) return; ACT[t.dataset.act](t, e); });
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset && t.dataset.bind) { setTimeout(() => onBind(t), 0); }
  else if (t.dataset && t.dataset.filter) { UI[t.dataset.filter] = t.value; setTimeout(() => render(true), 0); }
});

/* ---------------------------------------------------------------- KHUNG TRANG & KHỞI ĐỘNG */
function render(keep) {
  const ae = document.activeElement, bind = ae && ae.dataset && (ae.dataset.bind || ae.dataset.filter) ? [ae.dataset.bind ? 'bind' : 'filter', ae.dataset.bind || ae.dataset.filter] : null;
  const y = window.scrollY;
  $('#nav').innerHTML = TABS.map(([k, l]) => `<button class="${UI.tab === k ? 'on' : ''}" data-act="tab" data-v="${k}">${l}</button>`).join('');
  const ai = $('#asof'); if (ai && document.activeElement !== ai) ai.value = isoDate(M.S.asof);
  let html;
  try { html = VIEWS[UI.tab](); } catch (e) { console.error(e); html = `<div class="card"><h2>Lỗi hiển thị</h2><pre>${esc(e.stack)}</pre></div>`; }
  $('#main').innerHTML = html;
  if (keep) window.scrollTo(0, y);
  if (bind) { const el = document.querySelector(`[data-${bind[0]}="${bind[1]}"]`); if (el && el !== ae) { el.focus(); if (el.select && el.type === 'text') try { el.setSelectionRange(el.value.length, el.value.length); } catch (x) { } } }
}
function boot() {
  $('#asof').addEventListener('change', e => { const v = parseDate(e.target.value); if (v != null) { M.S.asof = v; save(); recalc(); render(true); } });
  recalc(); render();
}
window.addEventListener('error', e => { const d = document.createElement('div'); d.className = 'toast'; d.style.background = '#c62828'; d.textContent = 'Lỗi: ' + e.message; document.body.appendChild(d); setTimeout(() => d.remove(), 8000); });
document.addEventListener('DOMContentLoaded', boot);
