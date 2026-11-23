/* =====================================================================
 * APP – ĐỌC TRỰC TIẾP CÁC FILE XUẤT TỪ PHẦN MỀM KẾ TOÁN (định dạng thật của Hoàng Gia)
 * Bỏ file vào thư mục Du_lieu_hang_tuan → app tự nhận dạng theo TIÊU ĐỀ file, tự tính lại.
 * ===================================================================== */
const REAL = {
  cell: v => (v instanceof Date ? dn(v.getFullYear(), v.getMonth() + 1, v.getDate()) : v),
  rows(ws) { return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: false, cellDates: false }); },
  n: v => (typeof v === 'number' ? v : (parseNum(v) || 0)),
  d: v => (typeof v === 'number' && v > 20000 ? Math.round(v) - 25569 : parseDate(v)),
  title(rows) { return deacc((rows[0] && rows[0][0]) || ''); },
  /** nhận dạng loại file theo tiêu đề dòng 1 (và sheet) */
  detect(wb) {
    const names = wb.SheetNames.map(deacc);
    const ktI = names.findIndex(n => /^dong tien t\d/.test(n)); if (ktI >= 0) return { kind: 'ktPlan', sheet: wb.SheetNames[ktI] };
    if (names.includes('danh sach tai khoan') && names.includes('theo doi tra no')) return { kind: 'loans', sheet: wb.SheetNames[names.indexOf('danh sach tai khoan')] };
    const sh = wb.SheetNames[0], rows = REAL.rows(wb.Sheets[sh]), t = REAL.title(rows);
    if (t.startsWith('danh sach khach hang')) return { kind: 'khList', rows };
    if (t.startsWith('chi tiet cong no phai thu theo hoa don')) return { kind: 'arInv', rows };
    if (t.startsWith('chi tiet cong no phai thu khach hang') || t.startsWith('chi tiet cong no phai thu khac')) return { kind: 'arTx', rows };
    if (t.startsWith('chi tiet cong no phai tra')) return { kind: 'apTx', rows };
    if (t.startsWith('tong hop han thanh toan')) return { kind: 'apTerm', rows };
    if (t.startsWith('bang ke so du ngan hang')) return { kind: 'bankBal', rows };
    if (t.startsWith('so tien gui ngan hang')) return { kind: 'bankLed', rows };
    if (t.startsWith('so ke toan chi tiet quy tien mat')) return { kind: 'cashBook', rows };
    return null;
  },
  /* ---- 131 theo hóa đơn: hóa đơn còn nợ + hạn thanh toán ---- */
  arInv(rows, kh) {
    const out = [], all = []; let cust = null;
    rows.slice(4).forEach(r => {
      const a = r[0];
      if (typeof a === 'string' && a.startsWith('Tên khách hàng:')) { cust = a.split(':').slice(1).join(':').trim(); return; }
      if (!cust || a === 'Tổng cộng' || !(r[3] || r[4])) return;
      const date = REAL.d(r[2]), amt = REAL.n(r[8]) - REAL.n(r[9]), rem = REAL.n(r[12]);
      let due = REAL.d(r[6]); const term = (kh[keyOf(cust)] || {}).term;
      if (due == null && date != null) due = date + (term || 30);
      const nv = (kh[keyOf(cust)] || {}).nv || '';
      const o = { cust, ref: String(r[4] || r[3] || ''), date, due, amt, rem, owner: nv };
      all.push(o); if (rem > 1) out.push(o);
    });
    return { open: out, all };
  },
  /* ---- 131 theo khách: các khoản khách trả tiền (Có 131, đối ứng 111/112) ---- */
  arTx(rows) {
    const rec = {}; let cust = null;
    rows.slice(5).forEach(r => {
      const a = r[0];
      if (typeof a === 'string' && a.startsWith('Tên khách hàng:')) { cust = a.split(':').slice(1).join(':').trim(); return; }
      if (!cust) return; const d = REAL.d(r[2]); if (d == null) return;
      const co = REAL.n(r[10]); if (co > 0 && /^11[12]/.test(String(r[8] || ''))) (rec[cust] || (rec[cust] = [])).push([d, co]);
    });
    return rec;
  },
  /* FIFO: phân bổ tiền thu cho hóa đơn cũ nhất → ngày trả thực tế → lịch sử trễ của từng khách */
  hist(all, rec) {
    const by = {}; all.forEach(i => { if (i.amt > 0 && i.date != null && i.due != null) (by[i.cust] || (by[i.cust] = [])).push(i); });
    const out = [];
    Object.keys(by).forEach(c => {
      const L = by[c].sort((x, y) => x.date - y.date), R = (rec[c] || []).slice().sort((x, y) => x[0] - y[0]); let k = 0; const got = L.map(() => 0), last = L.map(() => 0);
      R.forEach(([d, a]) => { let left = a; while (left > 1 && k < L.length) { const need = L[k].amt - got[k]; if (need <= 1) { k++; continue; } const t = Math.min(need, left); got[k] += t; last[k] = d; left -= t; if (t >= need - 1) k++; } });
      L.forEach((i, j) => { if (got[j] >= i.amt - 1 && last[j]) out.push({ cust: c, due: i.due, paid: last[j], amt: Math.round(i.amt) }); });
    });
    return out;
  },
  /* ---- 331 chi tiết + hạn thanh toán NCC: nợ còn lại theo hóa đơn (FIFO) ---- */
  term(t) {
    if (t == null) return [null, null]; if (t instanceof Date || (typeof t === 'number' && t > 40000)) return ['date', REAL.d(t)];
    const s = String(t).toLowerCase(); let m = s.match(/cuối tháng.*?ngày\s*(\d{1,2})\s*tháng sau/); if (m) return ['eom', +m[1]];
    m = s.match(/(\d{1,3})\s*ngày/); if (m) return ['days', +m[1]];
    if (/ngay sau|thanh toán ngay|tt ngay|tiền mặt|cọc|trước/.test(s)) return ['days', 3]; return [null, null];
  },
  dueOf(d, tm) {
    if (tm[0] === 'date') return tm[1]; if (tm[0] === 'days') return d + tm[1];
    if (tm[0] === 'eom') { const o = ymd(d); let y = o.y, m = o.m + 1; if (m > 12) { y++; m = 1; } return dn(y, m, Math.min(tm[1], dim(y, m))); }
    return d + 30;
  },
  apTerms(rows) { const m = {}; rows.slice(4).forEach(r => { if (r[1]) m[keyOf(r[1])] = REAL.term(r[3]); }); return m; },
  apOpen(rows, terms) {
    const led = {}, name = {}, opn = {}; let nm = null;
    rows.slice(5).forEach(r => {
      const a = r[0]; if (typeof a === 'string' && a.startsWith('Tên nhà cung cấp:')) { nm = a.split(':').slice(1).join(':').trim(); return; }
      if (!a) return; name[a] = nm; const desc = r[5];
      if (desc === 'Số dư đầu kỳ') { opn[a] = REAL.n(r[13]) - REAL.n(r[12]); return; } if (desc === 'Cộng') return;
      const d = REAL.d(r[1]); if (d != null) (led[a] || (led[a] = [])).push({ d, inv: REAL.d(r[3]), ref: r[4] || r[2], no: REAL.n(r[10]), co: REAL.n(r[11]) });
    });
    const out = []; let asof = 0;
    Object.keys(led).forEach(c => {
      const L = led[c].sort((x, y) => x.d - y.d); L.forEach(x => { asof = Math.max(asof, x.d); });
      const items = L.filter(x => x.co > 0).map(x => ({ date: x.inv || x.d, ref: String(x.ref || ''), rem: x.co })); let pay = L.reduce((s, x) => s + x.no, 0), ob = opn[c] || 0;
      if (ob > 0) items.unshift({ date: dn(2026, 3, 31), ref: 'Dư đầu kỳ', rem: ob }); else pay += ob;
      items.forEach(it => { const t = Math.min(it.rem, Math.max(pay, 0)); it.rem -= t; pay -= t; });
      const tm = terms[keyOf(name[c])] || [null, null];
      items.filter(it => it.rem > 1).forEach(it => out.push({ sup: name[c], ref: it.ref, date: it.date, due: REAL.dueOf(it.date, tm), amt: Math.round(it.rem), grp: 'Nhà cung cấp hàng hóa, NVL' }));
    });
    return { ap: out, asof };
  },
  /* ---- số dư tiền ---- */
  bankBal(rows) { const t = rows.find(r => r[0] === 'Tổng cộng'); return t ? REAL.n(t[5]) : null; },
  bankLed(rows) { let bal = null, last = 0; rows.forEach(r => { if (r[5] === 'Số dư đầu kỳ' || r[4] === 'Số dư đầu kỳ') bal = bal == null ? REAL.n(r[9] != null ? r[9] : r[8]) : bal; }); let b = bal || 0; rows.forEach(r => { const d = REAL.d(r[0]); if (d != null && d > 20000 || (typeof r[0] === 'number' && r[0] > 40000)) { const hasN = rows[3] && rows[3][5] === 'Diễn giải' ? 0 : 0; } }); return null; },
  cashBook(rows) { let last = null, d0 = 0; rows.forEach(r => { const d = REAL.d(r[0]); if (d != null && typeof r[0] !== 'string' || (typeof r[0] === 'string' && parseDate(r[0]) != null)) { const v = r[9]; if (v != null) { last = REAL.n(v); d0 = REAL.d(r[0]); } } else if (r[4] === 'Số dư đầu kỳ' && last == null) last = REAL.n(r[9]); }); return last; },
  /* ---- khoản vay ---- */
  loans(rows) {
    const hi = rows.findIndex(r => r && r[1] === 'Ngân hàng' && r.some(c => c === 'Dư nợ hiện tại')); if (hi < 0) return [];
    const H = rows[hi], col = k => H.findIndex(c => c === k), cb = 1, cc = col('Số khế ước vay'), cm = col('Ngày đáo hạn'), cbal = col('Dư nợ hiện tại'), cr = col('Lãi suất (%)'), cn = col('NCC');
    const out = []; const amort = { '404002985072': 73400000, '806007070464': 11000000, '409005377447': 87000000 };
    rows.slice(hi + 1).forEach(r => {
      const bank = r[cb], bal = REAL.n(r[cbal]); if (!bank || bal <= 0) return; const ctr = String(r[cc] || ''), ncc = cn >= 0 ? r[cn] : '';
      out.push({ name: bank + ' ' + ctr + (ncc ? ' → ' + String(ncc).trim() : ''), balance: Math.round(bal), rate: REAL.n(r[cr]), principal: amort[ctr] || 0, day: 25, maturity: REAL.d(r[cm]), roll: bank === 'BIDV' ? 0 : 100 });
    });
    return out;
  }
};
/** sổ tiền gửi NH: số dư cuối = số dư đầu kỳ + Σ thu − Σ chi (cả file) ; cột theo tiêu đề */
REAL.bankLed = rows => {
  const hi = rows.findIndex(r => r && r[0] === 'Ngày hạch toán'); if (hi < 0) return null; const H = rows[hi];
  const cT = H.findIndex(c => c === 'Thu'), cC = H.findIndex(c => c === 'Chi'), cS = H.findIndex(c => c === 'Tồn');
  let open = null, thu = 0, chi = 0, last = null;
  rows.slice(hi + 1).forEach(r => { if (r.some(c => c === 'Số dư đầu kỳ')) { if (open == null) open = REAL.n(r[cS]); return; } const d = REAL.d(r[0]); if (d == null || typeof r[0] === 'string' && r[0].startsWith('Tài khoản')) return; thu += REAL.n(r[cT]); chi += REAL.n(r[cC]); last = Math.max(last || 0, d); });
  return open == null ? null : { bal: open + thu - chi, asof: last };
};
/** gom các file đã đọc & cập nhật mô hình */
REAL.apply = parts => {
  const log = [], kh = {};
  if (parts.khList) parts.khList.rows.slice(3).forEach(r => { if (r[2]) kh[keyOf(r[2])] = { term: REAL.n(r[7]) || null, nv: r[9] ? String(r[9]).split('_')[0] : '' }; });
  if (parts.arInv) {
    const r = REAL.arInv(parts.arInv.rows, kh); M.ar = r.open.map(i => ({ cust: i.cust, ref: i.ref, date: i.date, due: i.due, amt: Math.round(i.rem), owner: i.owner })); log.push('Phải thu: ' + M.ar.length + ' hóa đơn còn nợ');
    if (parts.arTx) { M.hist = REAL.hist(r.all, REAL.arTx(parts.arTx.rows)); log.push('Lịch sử thu: ' + M.hist.length + ' hóa đơn đã thu'); }
  }
  let asof = 0;
  if (parts.apTx) { const t = parts.apTerm ? REAL.apTerms(parts.apTerm.rows) : {}; const r = REAL.apOpen(parts.apTx.rows, t); M.ap = r.ap; asof = Math.max(asof, r.asof); log.push('Phải trả: ' + M.ap.length + ' hóa đơn' + (parts.apTerm ? ' (có kỳ hạn NCC)' : ' (chưa có file hạn thanh toán NCC → mặc định 30 ngày)')); }
  if (parts.loans) { M.loans = REAL.loans(REAL.rows(parts.loans.wb.Sheets[parts.loans.sheet])); log.push('Khoản vay: ' + M.loans.length); }
  let cash = 0, hasCash = false;
  if (parts.bankLeds && parts.bankLeds.length > 1) parts.bankLed = parts.bankLeds.map(p => ({ p, b: REAL.bankLed(p.rows) })).filter(x => x.b).sort((a, b) => (b.b.asof || 0) - (a.b.asof || 0))[0].p;
  if (parts.bankLed) { const b = REAL.bankLed(parts.bankLed.rows); if (b) { cash += b.bal; hasCash = true; asof = Math.max(asof, b.asof || 0); log.push('Số dư NH (sổ NH): ' + fmtVnd(b.bal)); } }
  else if (parts.bankBal) { const b = REAL.bankBal(parts.bankBal.rows); if (b != null) { cash += b; hasCash = true; log.push('Số dư NH (bảng kê): ' + fmtVnd(b)); } }
  if (parts.cashBooks && parts.cashBooks.length > 1) parts.cashBook = parts.cashBooks.map(p => ({ p, d: Math.max(0, ...REAL.txs(p.rows, 'cashBook').map(t => t.d)) })).sort((a, b) => b.d - a.d)[0].p;
  if (parts.cashBook) { const c = REAL.cashBook(parts.cashBook.rows); if (c != null) { cash += c; hasCash = true; log.push('Quỹ tiền mặt: ' + fmtVnd(c)); } }
  if (hasCash) M.S.cash0 = Math.round(cash);
  if (parts.ktPlan && typeof REAL.ktBuild === 'function') { const kb = REAL.ktBuild(parts); if (kb) { M.kt = kb; log.push('Báo cáo tuần: kế hoạch KT tháng ' + kb.plan.month + '/' + kb.plan.year + ', thực hiện đến ' + fmtDate(kb.last)); } }
  if (asof) M.S.asof = asof;
  return log;
};
