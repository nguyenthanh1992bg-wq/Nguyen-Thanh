/* =====================================================================
 * HG-CASH ENGINE – lõi tính toán (thuần JS, chạy được cả trình duyệt lẫn Node)
 * Hoàng Gia PS – Quản trị công nợ & dòng tiền
 * Mọi số tiền: VND (đã gồm VAT nếu số liệu kế toán gồm VAT). Mọi ngày: số ngày kể từ 1/1/1970 (UTC).
 * ===================================================================== */
(function (root) {
'use strict';

/* ---------------------------------------------------------------- ngày tháng */
const DAY = 864e5;
const dn = (y, m, d) => Math.round(Date.UTC(y, m - 1, d) / DAY);
const ymd = n => { const t = new Date(n * DAY); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }; };
const dim = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const pad = n => String(n).padStart(2, '0');
const fmtDate = n => { if (n == null) return ''; const o = ymd(n); return pad(o.d) + '/' + pad(o.m) + '/' + o.y; };
const isoDate = n => { const o = ymd(n); return o.y + '-' + pad(o.m) + '-' + pad(o.d); };
const todayDn = () => { const t = new Date(); return dn(t.getFullYear(), t.getMonth() + 1, t.getDate()); };
const monthKey = n => { const o = ymd(n); return o.y + '-' + pad(o.m); };

/** Đọc ngày từ: số serial Excel, Date, 'dd/mm/yyyy', 'yyyy-mm-dd'. Trả về null nếu không đọc được. */
function parseDate(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v > 20000 && v < 80000 ? Math.round(v) - 25569 : null;
  if (v instanceof Date) return isNaN(v) ? null : dn(v.getFullYear(), v.getMonth() + 1, v.getDate());
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return dn(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m) { let y = +m[3]; if (y < 100) y += 2000; let d = +m[1], mo = +m[2]; if (mo > 12 && d <= 12) [d, mo] = [mo, d]; if (mo < 1 || mo > 12 || d < 1 || d > 31) return null; return dn(y, mo, d); }
  if (/^\d{5}$/.test(s)) return parseDate(+s);
  return null;
}

/** Đọc số tiền: chấp nhận 1.234.567 / 1,234,567 / (1.234) / -1234 */
function parseNum(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  let s = String(v).trim().replace(/\s|đ|₫|vnd/gi, '');
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  if (s[0] === '-') { neg = true; s = s.slice(1); }
  const dots = (s.match(/\./g) || []).length, commas = (s.match(/,/g) || []).length;
  if (dots && commas) { const lastDot = s.lastIndexOf('.'), lastCom = s.lastIndexOf(','); s = lastDot > lastCom ? s.replace(/,/g, '') : s.replace(/\./g, '').replace(',', '.'); }
  else if (commas > 1 || (commas === 1 && /,\d{3}$/.test(s))) s = s.replace(/,/g, '');
  else if (commas === 1) s = s.replace(',', '.');
  else if (dots > 1 || (dots === 1 && /\.\d{3}$/.test(s))) s = s.replace(/\./g, '');
  const n = parseFloat(s);
  return isFinite(n) ? (neg ? -n : n) : null;
}

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sum = (arr, f) => arr.reduce((s, x) => s + (f ? f(x) : x), 0);
const keyOf = s => String(s == null ? '' : s).normalize('NFC').toUpperCase().replace(/\s+/g, ' ').trim();

/* ---------------------------------------------------------------- cấu hình mặc định */
const BUCKETS = ['Chưa đến hạn', 'Quá hạn 1–30 ngày', 'Quá hạn 31–60', 'Quá hạn 61–90', 'Quá hạn 91–180', 'Quá hạn >180'];
const bucketOf = over => over <= 0 ? 0 : over <= 30 ? 1 : over <= 60 ? 2 : over <= 90 ? 3 : over <= 180 ? 4 : 5;

const AP_BUCKETS = ['Quá hạn', 'Đến hạn 0–7 ngày', '8–14 ngày', '15–30 ngày', '31–60 ngày', '>60 ngày'];
const apBucketOf = left => left < 0 ? 0 : left <= 7 ? 1 : left <= 14 ? 2 : left <= 30 ? 3 : left <= 60 ? 4 : 5;

const CATS = {
  ar: 'Thu nợ phải thu hiện có', sale: 'Thu từ bán hàng mới', thukhac: 'Thu khác / tài trợ',
  ap: 'Trả NCC (công nợ hiện có)', buy: 'Mua hàng/NVL mới', luong: 'Lương & bảo hiểm', mb: 'Mặt bằng, điện nước',
  vh: 'Vận chuyển & vận hành', thue: 'Thuế & phí', lai: 'Lãi vay & chi phí tài chính', goc: 'Trả gốc vay', khac: 'Chi khác / đầu tư'
};
const IN_CATS = ['ar', 'sale', 'thukhac'];
const OUT_CATS = ['ap', 'buy', 'luong', 'mb', 'vh', 'thue', 'lai', 'goc', 'khac'];

const SCENARIOS = {
  cons: { id: 'cons', name: 'Thận trọng', pMul: 0.88, dAdd: 10, salesMul: 0.9 },
  base: { id: 'base', name: 'Cơ bản', pMul: 1, dAdd: 0, salesMul: 1 },
  opt: { id: 'opt', name: 'Lạc quan', pMul: 1.04, dAdd: -4, salesMul: 1.05 }
};

function defaultSettings() {
  return {
    asof: todayDn(),
    cash0: 0, minCash: null,
    monthlySales: 0, growth: 0, salesOverride: {},
    cashSalesPct: 10, termDays: null, extraDelay: 7, collectRate: 98,
    purchasePct: 65, purTermDays: null, apOverduePay: 7,
    inventory: 0, slowStock: 0,
    targetDSO: 45, targetOver60: 5, targetTop5: 40,
    /* xác suất thu & thời gian chờ (ngày kể từ ngày chốt) theo nhóm tuổi nợ quá hạn */
    bucketP: [0.98, 0.93, 0.82, 0.62, 0.35, 0.10],
    bucketWait: [0, 14, 30, 50, 90, 150],
    /* nhóm NCC: số ngày có thể đàm phán giãn hạn */
    apGroups: [
      { name: 'Nguyên liệu (giấy, decal, mực, hạt nhựa)', stretch: 15 },
      { name: 'Hàng thương mại (túi, màng, carton)', stretch: 15 },
      { name: 'Vận chuyển, dịch vụ', stretch: 7 },
      { name: 'Khác', stretch: 0 }
    ],
    /* trọng số chấm điểm phương án */
    w: { impact: 40, speed: 20, feas: 25, risk: 15 },
    /* tham số phương án */
    lp: { collectUplift: 15, collectSuccess: 70, collectCost: 0.3, discPct: 1.5, discTake: 35,
          stretchSuccess: 60, stretchCost: 0.5, depositPct: 40, factorPct: 80, factorRate: 14, factorFee: 0.8, factorLimit: null,
          cutBuy: 12, loanRate: 12, loanFee: 0.5, loanDays: 90, loanAmt: null, restructureDays: 90, restructureFee: 0.3 }
  };
}

const LEVER_TYPES = { thu: 'Đẩy nhanh thu tiền', chi: 'Giãn / giảm chi', von: 'Tài trợ vốn', kho: 'Tồn kho & mua hàng' };

/* ---------------------------------------------------------------- phân tích phải thu */
function custStatsFromHist(hist) {
  const m = {};
  (hist || []).forEach(h => {
    if (h.due == null || h.paid == null) return;
    const k = keyOf(h.cust); const w = Math.max(1, h.amt || 1);
    const late = clamp(h.paid - h.due, -15, 120);
    const o = m[k] || (m[k] = { n: 0, w: 0, wl: 0, ontime: 0 });
    o.n++; o.w += w; o.wl += w * late; if (late <= 3) o.ontime++;
  });
  Object.values(m).forEach(o => { o.delay = o.wl / o.w; o.ontimePct = o.ontime / o.n; });
  return m;
}

function analyzeAR(ar, S, hist) {
  const asof = S.asof;
  const stats = custStatsFromHist(hist);
  const inv = [];
  let missingDue = 0;
  (ar || []).forEach((r, i) => {
    const amt = parseNum(r.amt); if (!amt) return;
    let due = r.due != null ? r.due : (r.date != null && r.term != null ? r.date + r.term : null);
    if (due == null) { missingDue++; due = r.date != null ? r.date + (S.termDays || 30) : asof; }
    const over = asof - due;
    inv.push({ i, cust: r.cust || '(chưa rõ)', ref: r.ref || '', date: r.date, due, amt, over, b: bucketOf(over), owner: r.owner || '' });
  });
  const total = sum(inv, x => x.amt);
  const buckets = BUCKETS.map(() => ({ amt: 0, n: 0 }));
  inv.forEach(x => { buckets[x.b].amt += x.amt; buckets[x.b].n++; });
  const due30 = sum(inv.filter(x => x.over <= 0 && x.over >= -30), x => x.amt);
  const overdue = total - buckets[0].amt;
  const over60 = buckets[3].amt + buckets[4].amt + buckets[5].amt;
  const m = {};
  inv.forEach(x => {
    const k = keyOf(x.cust);
    const c = m[k] || (m[k] = { cust: x.cust, key: k, total: 0, overdue: 0, over60: 0, maxOver: -9999, n: 0, wOver: 0, owner: x.owner, b: BUCKETS.map(() => 0) });
    c.total += x.amt; c.n++; c.b[x.b] += x.amt;
    if (x.over > 0) { c.overdue += x.amt; c.wOver += x.amt * x.over; }
    if (x.over > 60) c.over60 += x.amt;
    c.maxOver = Math.max(c.maxOver, x.over);
    if (!c.owner && x.owner) c.owner = x.owner;
  });
  const cust = Object.values(m).sort((a, b) => b.total - a.total);
  let cum = 0;
  cust.forEach(c => {
    cum += c.total; const share = cum / (total || 1);
    c.share = c.total / (total || 1);
    c.size = share - c.share < 0.70 ? 'A' : share - c.share < 0.90 ? 'B' : 'C';
    c.grade = c.maxOver <= 0 ? 'A' : c.maxOver <= 30 ? 'B' : c.maxOver <= 90 ? 'C' : 'D';
    const st = stats[c.key]; c.hist = st || null;
    c.avgOver = c.overdue ? c.wOver / c.overdue : 0;
    c.score = Math.round(clamp(100 - Math.min(55, Math.max(0, c.maxOver) / 3) - Math.min(25, 25 * c.overdue / c.total) - (st ? Math.min(20, Math.max(0, st.delay) / 3) : 0), 0, 100));
    c.seg = segOf(c);
  });
  const top5 = sum(cust.slice(0, 5), c => c.total) / (total || 1);
  const wAge = total ? sum(inv.filter(x => x.date != null), x => x.amt * (asof - x.date)) / (sum(inv.filter(x => x.date != null), x => x.amt) || 1) : 0;
  return { inv, cust, total, buckets, overdue, over60, due30, top5, wAge, missingDue, stats, n: inv.length,
           over60Pct: total ? over60 / total : 0, overduePct: total ? overdue / total : 0 };
}

const SEGS = {
  S1: { name: 'Thu hồi trọng điểm', desc: 'Khách lớn/vừa đang quá hạn >30 ngày – chiếm nhiều tiền nhất, cần lãnh đạo vào cuộc', policy: 'Biên bản đối chiếu + lộ trình trả nợ có ký; dừng chiết khấu/KM; giao hàng mới phải trả trước một phần; Phó GĐ làm việc trực tiếp.', kpi: 'Thu ≥70% số quá hạn trong 60 ngày', color: '#c0392b' },
  S2: { name: 'Xử lý nợ khó thu / ngừng bán chịu', desc: 'Khách nhỏ quá hạn >30 ngày – chi phí thu cao, rủi ro mất tiền', policy: 'Chỉ bán tiền mặt/COD; thư yêu cầu thanh toán; ủy thác thu hồi hoặc khởi kiện nếu >180 ngày; trích lập dự phòng.', kpi: 'Không phát sinh nợ mới; giảm 50% dư nợ cũ trong 90 ngày', color: '#7f1d1d' },
  S3: { name: 'Nhắc nợ sớm – dễ thu', desc: 'Quá hạn 1–30 ngày – nhóm nhanh ra tiền nhất, chi phí thu thấp', policy: 'Gọi + email trong 24h kể từ ngày quá hạn; chốt ngày chuyển tiền cụ thể; nhắc lịch T-3 cho kỳ sau.', kpi: 'Thu 90% trong 14 ngày', color: '#d68910' },
  S4: { name: 'Khách lớn tốt – giữ & thưởng thanh toán sớm', desc: 'Khách quy mô lớn, không quá hạn – lõi doanh thu, rất nhạy với dịch vụ', policy: 'Giữ hạn mức; thử chiết khấu thanh toán sớm 1–1,5%; ưu tiên giao hàng; xem xét bao thanh toán hóa đơn.', kpi: 'Giữ 0% quá hạn; rút ngắn 5 ngày hạn TT', color: '#1e8449' },
  S5: { name: 'Khách tốt nhỏ – duy trì chuẩn', desc: 'Khách nhỏ/vừa không quá hạn', policy: 'Nhắc lịch tự động T-3; duy trì hạn mức hiện tại; không mở rộng hạn nợ.', kpi: 'Quá hạn <5%', color: '#2e86c1' }
};
function segOf(c) {
  if (c.grade === 'C' || c.grade === 'D') return c.size === 'C' ? 'S2' : 'S1';
  if (c.grade === 'B') return 'S3';
  return c.size === 'A' ? 'S4' : 'S5';
}

/* ---------------------------------------------------------------- phân tích phải trả */
function groupStretch(S, g) {
  const f = (S.apGroups || []).find(x => keyOf(x.name) === keyOf(g));
  return f ? f.stretch : 0;
}
function analyzeAP(ap, S) {
  const asof = S.asof;
  const inv = [];
  let missingDue = 0;
  (ap || []).forEach((r, i) => {
    const amt = parseNum(r.amt); if (!amt) return;
    let due = r.due != null ? r.due : (r.date != null ? r.date + (S.purTermDays || 30) : null);
    if (r.due == null) missingDue++;
    if (due == null) due = asof;
    const left = due - asof;
    inv.push({ i, sup: r.sup || '(chưa rõ)', ref: r.ref || '', date: r.date, due, amt, left, b: apBucketOf(left), grp: r.grp || 'Khác', stretch: r.stretch != null ? r.stretch : groupStretch(S, r.grp || 'Khác'), disc: r.disc || 0 });
  });
  const total = sum(inv, x => x.amt);
  const buckets = AP_BUCKETS.map(() => ({ amt: 0, n: 0 }));
  inv.forEach(x => { buckets[x.b].amt += x.amt; buckets[x.b].n++; });
  const m = {};
  inv.forEach(x => { const k = keyOf(x.sup); const s = m[k] || (m[k] = { sup: x.sup, total: 0, overdue: 0, due14: 0, due30: 0, n: 0, grp: x.grp, stretch: x.stretch }); s.total += x.amt; s.n++; if (x.left < 0) s.overdue += x.amt; if (x.left <= 14) s.due14 += x.amt; if (x.left <= 30) s.due30 += x.amt; });
  const sup = Object.values(m).sort((a, b) => b.total - a.total);
  const grp = {};
  inv.forEach(x => { const g = grp[x.grp] || (grp[x.grp] = { grp: x.grp, total: 0, due30: 0, n: 0 }); g.total += x.amt; g.n++; if (x.left <= 30) g.due30 += x.amt; });
  return { inv, sup, grp: Object.values(grp).sort((a, b) => b.total - a.total), total, buckets, overdue: buckets[0].amt, due14: sum(inv.filter(x => x.left <= 14), x => x.amt), due30: sum(inv.filter(x => x.left <= 30), x => x.amt), missingDue, n: inv.length };
}

/* ---------------------------------------------------------------- dựng sự kiện dòng tiền */
const HORIZON = 400; /* số ngày mô phỏng */

function salesOfMonth(S, y, m, scen) {
  const o = ymd(S.asof);
  const idx = (y - o.y) * 12 + (m - o.m);
  const key = y + '-' + pad(m);
  let base;
  if (S.salesOverride && S.salesOverride[key] != null && S.salesOverride[key] !== '') base = +S.salesOverride[key];
  else base = (S.monthlySales || 0) * Math.pow(1 + (S.growth || 0) / 100, Math.max(0, idx));
  return base * scen.salesMul;
}

/** Số ngày trung bình có trọng số của phải thu / phải trả (để làm mặc định) */
function weightedTerm(rows) {
  const ok = (rows || []).filter(r => r.date != null && r.due != null && parseNum(r.amt) > 0);
  const w = sum(ok, r => parseNum(r.amt));
  return w ? Math.round(sum(ok, r => parseNum(r.amt) * (r.due - r.date)) / w) : null;
}

function effTerm(S, M) { return S.termDays != null && S.termDays !== '' ? +S.termDays : (weightedTerm(M.ar) || 30); }
function effPurTerm(S, M) { return S.purTermDays != null && S.purTermDays !== '' ? +S.purTermDays : (weightedTerm(M.ap) || 30); }

function buildEvents(M, scenId) {
  const S = M.S, sc = SCENARIOS[scenId || 'base'], asof = S.asof, ev = [];
  const stats = custStatsFromHist(M.hist);
  const push = (d, a, c, k, o) => { if (d < 0) d = 0; if (d >= HORIZON || !a) return; ev.push(Object.assign({ d: Math.round(d), a, c, k }, o || {})); };

  /* 1) phải thu hiện có */
  const arA = analyzeAR(M.ar, S, M.hist);
  arA.inv.forEach(x => {
    const bp = S.bucketP[x.b];
    const p = Math.min(0.995, bp * sc.pMul);
    let d, spread;
    if (x.b === 0) {
      const st = stats[keyOf(x.cust)];
      const delay = (st && st.n >= 3 ? Math.max(0, st.delay) : S.extraDelay) + sc.dAdd;
      d = (x.due - asof) + Math.max(0, delay); spread = 5;
    } else { d = S.bucketWait[x.b] + Math.max(0, sc.dAdd); spread = Math.max(5, Math.round(S.bucketWait[x.b] * 0.3)); }
    /* trải đều khoản thu quanh ngày dự kiến (25% – 50% – 25%) để không dồn cục vào một ngày */
    [[-1, 0.25], [0, 0.5], [1, 0.25]].forEach(([k, wgt]) => push(Math.max(1, d + k * spread), x.amt * p * wgt, 'ar', 'AR', { who: x.cust, gross: x.amt * wgt, p, over: x.over, b: x.b, ref: x.ref }));
  });

  /* 2) bán hàng mới */
  const term = effTerm(S, M), purTerm = effPurTerm(S, M);
  const lag = Math.max(1, Math.round(term + S.extraDelay + sc.dAdd));
  for (let s = 0; s < HORIZON; s++) {
    const o = ymd(asof + s);
    const daily = salesOfMonth(S, o.y, o.m, sc) / dim(o.y, o.m);
    if (daily <= 0) continue;
    const cashPart = daily * S.cashSalesPct / 100, credPart = daily - cashPart;
    push(s + 1, cashPart, 'sale', 'SALEC');
    push(s + lag, credPart * S.collectRate / 100, 'sale', 'SALE', { gross: credPart, s });
    push(s + Math.max(1, purTerm), -daily * S.purchasePct / 100, 'buy', 'BUY', { s });
  }

  /* 3) phải trả hiện có */
  const apA = analyzeAP(M.ap, S);
  apA.inv.forEach(x => {
    const o = { who: x.sup, ref: x.ref, stretch: x.stretch, disc: x.disc, over: x.left < 0 };
    if (x.due > asof) push(x.due - asof, -x.amt, 'ap', 'AP', o);
    else { const w = Math.max(2, S.apOverduePay); [[0.5, 0.3], [1, 0.4], [1.6, 0.3]].forEach(([k, wgt]) => push(Math.round(w * k), -x.amt * wgt, 'ap', 'AP', o)); }
  });

  /* 4) chi phí cố định / định kỳ / một lần */
  const o0 = ymd(asof);
  (M.rec || []).forEach(r => {
    const amt = parseNum(r.amt); if (!amt) return;
    const sign = r.sign === 'thu' ? 1 : -1;
    const cat = sign > 0 ? 'thukhac' : (CATS[r.cat] && OUT_CATS.includes(r.cat) ? r.cat : 'khac');
    const startD = r.start != null ? r.start : asof;
    if (r.freq === '1') { push(startD - asof, sign * Math.abs(amt), cat, 'REC', { who: r.name, disc: !!r.disc }); return; }
    const st = ymd(startD);
    for (let k = 0; k < 16; k++) {
      let y = o0.y, m = o0.m + k; y += Math.floor((m - 1) / 12); m = ((m - 1) % 12) + 1;
      if (r.freq === 'Q' && (((y - st.y) * 12 + m - st.m) % 3 + 3) % 3 !== 0) continue;
      if (r.freq === 'Y' && m !== st.m) continue;
      const day = dn(y, m, Math.min(Math.max(1, +r.day || st.d), dim(y, m)));
      if (day < asof || day < startD || (r.end != null && day > r.end)) continue;
      push(day - asof, sign * Math.abs(amt), cat, 'REC', { who: r.name, disc: !!r.disc });
    }
  });

  /* 5) khoản vay: lãi hằng tháng + gốc (kể cả đáo hạn) */
  (M.loans || []).forEach(L => {
    let bal = parseNum(L.balance) || 0; if (bal <= 0) return;
    const rate = (parseNum(L.rate) || 0) / 100, pm = parseNum(L.principal) || 0;
    for (let k = 0; k < 16 && bal > 0; k++) {
      let y = o0.y, m = o0.m + k; y += Math.floor((m - 1) / 12); m = ((m - 1) % 12) + 1;
      const day = dn(y, m, Math.min(Math.max(1, +L.day || 25), dim(y, m)));
      if (day < asof) continue;
      const mature = L.maturity != null && day >= L.maturity;
      const prin = mature ? bal : Math.min(bal, pm);
      push(day - asof, -bal * rate / 12, 'lai', 'LOAN', { who: L.name, rate });
      if (prin > 0) push(day - asof, -prin, 'goc', 'LOANP', { who: L.name, rate, mature });
      bal -= prin;
    }
  });
  return ev;
}

/* ---------------------------------------------------------------- mô phỏng & tổng hợp */
function simulate(events, S) {
  const net = new Float64Array(HORIZON);
  events.forEach(e => { net[e.d] += e.a; });
  const bal = new Float64Array(HORIZON);
  let b = S.cash0 || 0;
  for (let d = 0; d < HORIZON; d++) { b += net[d]; bal[d] = b; }
  return { net, bal };
}

function monthIndexer(asof) {
  const o = ymd(asof);
  return d => { const t = ymd(asof + d); return (t.y - o.y) * 12 + (t.m - o.m); };
}

/** Tổng hợp theo tuần (n tuần) hoặc tháng (n tháng) */
function aggregate(events, S, mode, n) {
  const idx = mode === 'week' ? d => Math.floor(d / 7) : monthIndexer(S.asof);
  const byCat = {}; Object.keys(CATS).forEach(c => { byCat[c] = new Float64Array(n); });
  const inflow = new Float64Array(n), outflow = new Float64Array(n);
  events.forEach(e => { const i = idx(e.d); if (i >= n) return; byCat[e.c][i] += e.a; if (e.a > 0) inflow[i] += e.a; else outflow[i] += e.a; });
  const net = inflow.map((v, i) => v + outflow[i]);
  const open = new Float64Array(n), close = new Float64Array(n);
  let b = S.cash0 || 0;
  for (let i = 0; i < n; i++) { open[i] = b; b += net[i]; close[i] = b; }
  /* số dư thấp nhất trong kỳ (theo ngày) */
  const sim = simulate(events, S); const minIn = new Float64Array(n).fill(Infinity), minDay = new Array(n);
  for (let d = 0; d < HORIZON; d++) { const i = idx(d); if (i < n && sim.bal[d] < minIn[i]) { minIn[i] = sim.bal[d]; minDay[i] = d; } }
  const labels = [], ranges = [];
  for (let i = 0; i < n; i++) {
    if (mode === 'week') { labels.push('T' + (i + 1)); ranges.push([S.asof + i * 7, S.asof + i * 7 + 6]); }
    else { const o = ymd(S.asof), t = ymd(dn(o.y, o.m + i, 1)); labels.push((i === 0 ? '' : '') + 'T' + t.m + '/' + String(t.y).slice(2) + (i === 0 ? '*' : '')); ranges.push(null); }
  }
  return { byCat, inflow, outflow, net, open, close, minIn, minDay, labels, ranges, n, mode };
}

function minBal(sim, days) {
  let mn = Infinity, at = 0;
  for (let d = 0; d < days; d++) if (sim.bal[d] < mn) { mn = sim.bal[d]; at = d; }
  return { v: mn, d: at };
}
function firstBelow(sim, thr, days) { for (let d = 0; d < days; d++) if (sim.bal[d] < thr) return d; return null; }

function autoMinCash(M, ev) {
  const S = M.S; if (S.minCash != null && S.minCash !== '') return +S.minCash;
  const fixed = sum(ev.filter(e => e.d < 90 && e.a < 0 && ['luong', 'mb', 'vh', 'thue', 'lai', 'goc', 'khac'].includes(e.c)), e => -e.a);
  return Math.round(fixed / 3 * 0.5);
}

/* ---------------------------------------------------------------- điểm sức khỏe dòng tiền */
function healthScore(M, ctx) {
  const S = M.S, { arA, apA, sim, thr, evBase } = ctx;
  const comps = [];
  const mb = minBal(sim, 91).v;
  const t = Math.max(thr, 1);
  comps.push({ k: 'liq', name: 'Thanh khoản 13 tuần tới', w: 30, s: clamp(((mb + t) / (2 * t)) * 100, 0, 100), note: 'Số dư thấp nhất ' + fmtVnd(mb) + ' so với ngưỡng an toàn ' + fmtVnd(thr) });
  const s60 = clamp(100 - (arA.over60Pct / 0.20) * 100, 0, 100), sOv = clamp(100 - (arA.overduePct / 0.5) * 100, 0, 100);
  comps.push({ k: 'arq', name: 'Chất lượng phải thu', w: 25, s: 0.6 * s60 + 0.4 * sOv, note: 'Quá hạn ' + pct(arA.overduePct) + ' · quá hạn >60 ngày ' + pct(arA.over60Pct) });
  const dso = dsoOf(S, arA);
  if (dso != null) comps.push({ k: 'dso', name: 'Tốc độ thu tiền (DSO)', w: 15, s: clamp(100 - (dso - S.targetDSO) / 30 * 100, 0, 100), note: 'DSO ' + Math.round(dso) + ' ngày – mục tiêu ' + S.targetDSO });
  const inflow30 = sum(evBase.filter(e => e.d < 30 && e.a > 0), e => e.a);
  const press = inflow30 ? apA.due30 / inflow30 : (apA.due30 ? 2 : 0);
  comps.push({ k: 'app', name: 'Áp lực phải trả 30 ngày', w: 15, s: clamp(100 - (press - 0.6) / 0.6 * 100, 0, 100), note: 'Phải trả đến hạn 30 ngày = ' + pct(press) + ' tiền thu dự kiến 30 ngày' });
  comps.push({ k: 'con', name: 'Tập trung khách hàng', w: 10, s: clamp(100 - (arA.top5 - 0.30) / 0.40 * 100, 0, 100), note: 'Top 5 khách = ' + pct(arA.top5) + ' dư nợ' });
  const wt = sum(comps, c => c.w);
  const score = Math.round(sum(comps, c => c.s * c.w) / wt);
  const grade = score >= 80 ? ['Tốt', '#1e8449'] : score >= 60 ? ['Ổn định', '#2e86c1'] : score >= 40 ? ['Cảnh báo', '#d68910'] : ['Nguy cấp', '#c0392b'];
  return { score, grade: grade[0], color: grade[1], comps: comps.map(c => Object.assign(c, { s: Math.round(c.s) })) };
}
function dsoOf(S, arA) { return S.monthlySales > 0 ? arA.total / (S.monthlySales * 12 / 365) : null; }
function dpoOf(S, apA) { const p = S.monthlySales * S.purchasePct / 100; return p > 0 ? apA.total / (p * 12 / 365) : null; }
function dioOf(S) { const p = S.monthlySales * S.purchasePct / 100; return p > 0 && S.inventory > 0 ? S.inventory / (p * 12 / 365) : null; }
const fmtVnd = n => (n < 0 ? '-' : '') + (Math.abs(n) >= 1e9 ? (Math.abs(n) / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' tỷ' : Math.round(Math.abs(n) / 1e6).toLocaleString('vi-VN') + ' tr');
const pct = x => (100 * x).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + '%';

/* ---------------------------------------------------------------- phương án cải thiện dòng tiền (levers) */
function copyEv(ev) { return ev.map(e => Object.assign({}, e)); }

/** Tách một phần `portion` của sự kiện e sang ngày mới, nhân hệ số mul; trả về [còn lại, phần chuyển] */
function splitEv(e, portion, newD, mul) {
  const rem = Object.assign({}, e, { a: e.a * (1 - portion) });
  const mv = Object.assign({}, e, { a: e.a * portion * (mul == null ? 1 : mul), d: Math.max(0, Math.round(newD)), moved: true });
  return [rem, mv];
}

function leverDefs() {
  return [
    { id: 'L1', type: 'thu', name: 'Chiến dịch thu nợ quá hạn 1–90 ngày', ttc: 10, risk: 2,
      apply(ev, c) {
        const lp = c.S.lp, out = [], tg = {}; let elig = 0;
        const gradeBy = c.gradeBy;
        ev.forEach(e => {
          if (e.k === 'AR' && e.over > 0 && e.over <= 90) {
            const newD = e.over <= 30 ? 10 : e.over <= 60 ? 21 : 30;
            const newP = Math.max(e.p, Math.min(0.95, e.p + lp.collectUplift / 100));
            const [rem, mv] = splitEv(e, lp.collectSuccess / 100, newD, newP / e.p);
            out.push(rem, mv);
            out.push({ d: mv.d, a: -mv.a * lp.collectCost / 100, c: 'khac', k: 'COST', who: 'Chi phí thu hồi' });
            tg[e.who] = (tg[e.who] || 0) + mv.a; elig++;
          } else out.push(e);
        });
        if (!elig) return null;
        c.feas = Object.keys(tg).length <= 10 ? 5 : Object.keys(tg).length <= 25 ? 4 : Object.keys(tg).length <= 50 ? 3 : 2;
        return { ev: out, targets: tg };
      },
      actions: c => ['Trong 3 ngày: Phó GĐ họp KD + kế toán công nợ, giao danh sách khách mục tiêu (bảng bên dưới) cho từng nhân viên, chốt chỉ tiêu tiền theo tuần.',
        'Đối chiếu công nợ & hóa đơn/biên bản giao nhận với từng khách trong 5 ngày; xử lý vướng mắc chứng từ ngay (nguyên nhân chậm thanh toán số 1).',
        'Mỗi khách: chốt NGÀY chuyển tiền bằng văn bản/email; khách lớn quá hạn >30 ngày: Phó GĐ gọi trực tiếp.',
        'Dừng khuyến mại/chiết khấu và yêu cầu trả trước một phần cho đơn mới với khách quá hạn >30 ngày.',
        'Họp chốt kết quả mỗi thứ Hai: tiền đã thu / chỉ tiêu; không đạt → leo thang lên Giám đốc.'],
      kpi: 'Tiền thu từ nợ quá hạn theo tuần ≥ chỉ tiêu; tỷ lệ quá hạn >60 ngày giảm ≥ 20% cuối tháng.' },
    { id: 'L2', type: 'thu', name: 'Chiết khấu thanh toán sớm cho khách tốt', ttc: 10, risk: 2,
      apply(ev, c) {
        const lp = c.S.lp, out = [], tg = {}; let elig = 0;
        ev.forEach(e => {
          if (e.k === 'AR' && e.over <= 0 && e.d >= 15 && e.d <= 60 && ['A', 'B'].includes(c.gradeBy[keyOf(e.who)])) {
            const disc = lp.discPct / 100;
            /* khách chấp nhận chiết khấu trả sớm → chắc chắn thu (xác suất 99%), trừ chiết khấu */
            const [rem, mv] = splitEv(e, lp.discTake / 100, 10, 0.99 * (1 - disc) / e.p);
            out.push(rem, mv); tg[e.who] = (tg[e.who] || 0) + mv.a; elig++;
          } else out.push(e);
        });
        if (!elig) return null;
        c.feas = 4; return { ev: out, targets: tg };
      },
      actions: c => ['Chọn khách hạng A/B (danh sách bên dưới); gửi thư đề nghị: "trả trong 10 ngày kể từ hóa đơn được chiết khấu ' + c.S.lp.discPct + '%".',
        'Tính chi phí vốn quy năm của chiết khấu (xem cột “Chi phí vốn quy năm”): chỉ áp dụng khi RẺ HƠN lãi vay ngắn hạn (~' + c.S.lp.loanRate + '%/năm) hoặc khi đang thiếu tiền.',
        'Áp dụng thử 1 tháng với 5–10 khách lớn nhất, theo dõi tỷ lệ chấp nhận (mục tiêu ≥ ' + c.S.lp.discTake + '%).',
        'Kế toán ghi nhận chiết khấu thanh toán (TK 635) – xác nhận điều kiện hóa đơn/thuế với kế toán trưởng trước khi thực hiện.'],
      kpi: 'Tỷ lệ khách chấp nhận; số ngày thu bình quân của nhóm này giảm ≥ 10 ngày.' },
    { id: 'L3', type: 'chi', name: 'Đàm phán giãn hạn thanh toán với NCC', ttc: 7, risk: 3,
      apply(ev, c) {
        const lp = c.S.lp, out = [], tg = {}; let elig = 0;
        ev.forEach(e => {
          if (e.k === 'AP' && !e.over && e.stretch > 0 && e.d <= 60) {
            const ext = Math.min(e.stretch, 30);
            const [rem, mv] = splitEv(e, lp.stretchSuccess / 100, e.d + ext, 1);
            out.push(rem, mv); out.push({ d: mv.d, a: mv.a * lp.stretchCost / 100, c: 'khac', k: 'COST', who: 'Chi phí giãn nợ NCC' });
            tg[e.who] = (tg[e.who] || 0) + Math.abs(mv.a); elig++;
          } else out.push(e);
        });
        if (!elig) return null;
        c.feas = 3; return { ev: out, targets: tg };
      },
      actions: c => ['Lập danh sách NCC có hóa đơn đến hạn ≤60 ngày và còn “dư địa” giãn (theo bảng nhóm NCC ở tab Giả định).',
        'Gửi đề nghị giãn thêm 7–30 ngày kèm cam kết lịch trả cụ thể; ưu tiên NCC có quan hệ lâu năm/mua nhiều (có vị thế đàm phán).',
        'Đổi lấy: đặt hàng ổn định, trả đúng hẹn các kỳ sau, hoặc thanh toán một phần đúng hạn + phần còn lại giãn.',
        'KHÔNG giãn NCC nguyên liệu độc quyền/khó thay thế; tránh bị cắt hàng hoặc tăng giá.'],
      kpi: 'Số ngày trả NCC bình quân (DPO) tăng ≥ 7 ngày mà không bị cắt hàng/tăng giá.' },
    { id: 'L4', type: 'thu', name: 'Bán trả trước / đặt cọc với khách rủi ro', ttc: 15, risk: 3,
      apply(ev, c) {
        const lp = c.S.lp, out = [];
        const share = c.riskShare; if (!(share > 0)) return null;
        const frac = share * lp.depositPct / 100; let tot = 0;
        ev.forEach(e => {
          if (e.k === 'SALE' && e.s < 90) {
            const [rem, mv] = splitEv(e, frac, e.s + 3, 1); out.push(rem, mv); tot += mv.a;
          } else out.push(e);
        });
        c.feas = 3; return { ev: out, targets: { 'Khách hạng C/D (đơn mới)': tot } };
      },
      actions: c => ['Ban hành chính sách tín dụng: khách hạng C/D (quá hạn >30 ngày) chỉ giao hàng khi đã đặt cọc ' + c.S.lp.depositPct + '% giá trị đơn, còn lại thanh toán khi nhận hàng.',
        'Khách quá hạn >90 ngày (hạng D): dừng bán chịu hoàn toàn cho đến khi có lộ trình trả nợ cũ được ký.',
        'Giao quyền cho Kho/giao hàng chỉ xuất khi có xác nhận của kế toán công nợ (kiểm soát bằng hệ thống).',
        'Chấp nhận có thể mất một phần đơn hàng nhỏ – đo lường tác động doanh thu hằng tháng.'],
      kpi: 'Tỷ lệ doanh số bán trả trước/COD của nhóm rủi ro; không phát sinh thêm nợ quá hạn mới của nhóm này.' },
    { id: 'L5', type: 'von', name: 'Ứng vốn theo hóa đơn / bao thanh toán', ttc: 5, risk: 3,
      apply(ev, c) {
        const lp = c.S.lp, out = [], tg = {};
        let eligAmt = 0;
        ev.forEach(e => { if (e.k === 'AR' && e.over <= 0 && e.d >= 10 && e.d <= 75 && ['A', 'B'].includes(c.gradeBy[keyOf(e.who)])) eligAmt += e.a; });
        if (!(eligAmt > 0)) return null;
        const lim = lp.factorLimit != null && lp.factorLimit !== '' ? +lp.factorLimit : eligAmt * 0.5;
        const portion = Math.min(lp.factorPct / 100, lim / eligAmt);
        ev.forEach(e => {
          if (e.k === 'AR' && e.over <= 0 && e.d >= 10 && e.d <= 75 && ['A', 'B'].includes(c.gradeBy[keyOf(e.who)])) {
            const [rem, mv] = splitEv(e, portion, 5, 1 - lp.factorFee / 100);
            out.push(rem, mv);
            out.push({ d: e.d, a: -e.a * portion * lp.factorRate / 100 * (e.d - 5) / 365, c: 'lai', k: 'COST', who: 'Phí ứng vốn' });
            tg[e.who] = (tg[e.who] || 0) + mv.a;
          } else out.push(e);
        });
        c.feas = 4; return { ev: out, targets: tg };
      },
      actions: c => ['Làm việc với ngân hàng đang vay về hạn mức “tài trợ khoản phải thu”/ứng vốn theo hóa đơn (hồ sơ: hợp đồng, hóa đơn VAT, biên bản giao nhận).',
        'Chỉ đưa hóa đơn của khách hạng A/B (uy tín thanh toán) để được tỷ lệ ứng cao và lãi thấp.',
        'So sánh chi phí: lãi ~' + c.S.lp.factorRate + '%/năm + phí ' + c.S.lp.factorFee + '% so với chiết khấu thanh toán sớm (Phương án L2) và vay vốn lưu động.',
        'Cân nhắc thông báo khách hay không (bao thanh toán có/không truy đòi) – ảnh hưởng quan hệ thương mại.'],
      kpi: 'Chi phí tài chính / tiền huy động; số dư ứng không vượt hạn mức.' },
    { id: 'L6', type: 'kho', name: 'Thanh lý hàng tồn chậm luân chuyển', ttc: 30, risk: 2,
      apply(ev, c) {
        const S = c.S; if (!(S.slowStock > 0)) return null;
        const rec = 0.75, v = S.slowStock * rec;
        c.extraCost = S.slowStock * (1 - rec);
        const out = copyEv(ev);
        out.push({ d: 25, a: v * 0.5, c: 'thukhac', k: 'STOCK', who: 'Thanh lý tồn kho' }, { d: 50, a: v * 0.5, c: 'thukhac', k: 'STOCK', who: 'Thanh lý tồn kho' });
        c.feas = 3; return { ev: out, targets: { 'Hàng tồn chậm luân chuyển': v } };
      },
      actions: c => ['Kiểm kê, phân loại tồn chậm >90 ngày (NVL, decal tồn, bao bì sai quy cách) – chốt danh sách và giá sàn thanh lý.',
        'Bán giảm giá cho khách cũ/đại lý, gộp lô; với nguyên liệu: bán lại cho nhà cung cấp/đơn vị cùng ngành.',
        'Thu tiền ngay (không bán chịu hàng thanh lý); hạch toán lỗ thanh lý (phần chênh lệch với giá vốn).',
        'Đặt định mức tồn tối thiểu/tối đa để không tái phát.'],
      kpi: 'Giá trị tồn >90 ngày giảm ≥ 40%; vòng quay kho tăng.' },
    { id: 'L7', type: 'kho', name: 'Cắt giảm/hoãn mua dự trữ (mua theo đơn – JIT)', ttc: 15, risk: 3,
      apply(ev, c) {
        const lp = c.S.lp, out = []; let n = 0;
        ev.forEach(e => { if (e.k === 'BUY' && e.d <= 75) { out.push(Object.assign({}, e, { a: e.a * (1 - lp.cutBuy / 100) })); n++; } else out.push(e); });
        if (!n) return null;
        c.feas = 4; return { ev: out, targets: { 'Mua hàng/NVL dự trữ': sum(ev.filter(e => e.k === 'BUY' && e.d <= 75), e => -e.a) * lp.cutBuy / 100 } };
      },
      actions: c => ['Rà soát đơn mua 60 ngày tới: loại bỏ phần dự trữ vượt định mức (mục tiêu giảm ' + c.S.lp.cutBuy + '%), gộp đợt mua, dùng tồn có sẵn trước.',
        'Với NVL chính (giấy, decal, mực): giữ mức tồn an toàn tối thiểu; mặt hàng thương mại chạy chậm: mua theo đơn đặt của khách.',
        'Kiểm tra rủi ro đứt hàng/trễ đơn khách (OTIF) trước khi cắt – không cắt mặt hàng chủ lực.'],
      kpi: 'Giá trị mua vào/tháng giảm đúng kế hoạch; OTIF giữ ≥ 95%.' },
    { id: 'L8', type: 'chi', name: 'Hoãn các khoản chi không thiết yếu / đầu tư', ttc: 7, risk: 2,
      apply(ev, c) {
        const out = []; let n = 0, tot = 0;
        ev.forEach(e => { if (e.k === 'REC' && e.disc && e.a < 0 && e.d <= 75) { const [rem, mv] = splitEv(e, 1, e.d + 45, 1); out.push(rem, mv); n++; tot += -e.a; } else out.push(e); });
        if (!n) return null; c.feas = 4; return { ev: out, targets: { 'Khoản chi có thể hoãn': tot } };
      },
      actions: c => ['Rà soát các khoản đánh dấu “hoãn được” trong tab Giả định (đầu tư máy, sửa chữa, thưởng, mua sắm).',
        'Dời 45 ngày; giữ lại khoản an toàn lao động/PCCC và bảo trì máy chính.'],
      kpi: 'Tổng chi hoãn đúng kế hoạch; không ảnh hưởng sản xuất.' },
    { id: 'L9', type: 'von', backup: true, name: 'Tái cơ cấu/gia hạn nợ gốc vay đến hạn', ttc: 30, risk: 3,
      apply(ev, c) {
        const lp = c.S.lp, out = []; let n = 0, tot = 0;
        ev.forEach(e => {
          if (e.k === 'LOANP' && e.d <= 120) {
            const [rem, mv] = splitEv(e, 1, e.d + lp.restructureDays, 1);
            out.push(rem, mv);
            out.push({ d: mv.d, a: mv.a * ((e.rate || 0.1) * lp.restructureDays / 365 + lp.restructureFee / 100), c: 'lai', k: 'COST', who: 'Phí gia hạn nợ' });
            n++; tot += -e.a;
          } else out.push(e);
        });
        if (!n) return null; c.feas = 3; return { ev: out, targets: { 'Gốc vay dời kỳ hạn': tot } };
      },
      actions: c => ['Làm việc với ngân hàng ≥ 30 ngày trước ngày đáo hạn: đề nghị gia hạn/đảo nợ hoặc điều chỉnh lịch trả gốc.',
        'Chuẩn bị hồ sơ: phương án dòng tiền (xuất từ chương trình này), báo cáo công nợ, hợp đồng/đơn hàng đầu ra.',
        'Đàm phán phí gia hạn ≤ ' + c.S.lp.restructureFee + '%; tránh phát sinh nợ quá hạn ngân hàng (ảnh hưởng CIC).'],
      kpi: 'Có văn bản chấp thuận gia hạn trước hạn trả ≥ 15 ngày.' },
    { id: 'L10', type: 'von', backup: true, name: 'Vay vốn lưu động ngắn hạn bù hụt', ttc: 7, risk: 4,
      apply(ev, c) {
        const lp = c.S.lp; if (!(c.gap > 0)) return null;
        const amt = lp.loanAmt != null && lp.loanAmt !== '' ? +lp.loanAmt : Math.ceil(c.gap * 1.15 / 1e8) * 1e8;
        const out = copyEv(ev);
        out.push({ d: 3, a: amt, c: 'thukhac', k: 'LOANIN', who: 'Vay vốn lưu động' });
        const back = Math.min(HORIZON - 1, 3 + lp.loanDays);
        out.push({ d: back, a: -amt, c: 'goc', k: 'LOANOUT', who: 'Trả gốc vay VLĐ' });
        out.push({ d: back, a: -(amt * lp.loanRate / 100 * lp.loanDays / 365 + amt * lp.loanFee / 100), c: 'lai', k: 'COST', who: 'Lãi + phí vay VLĐ' });
        c.feas = 4; c.loanAmt = amt; return { ev: out, targets: { 'Khoản vay VLĐ đề xuất': amt } };
      },
      actions: c => ['Chuẩn bị hạn mức vay ngắn hạn bù hụt khoảng ' + fmtVnd(c.loanAmt || c.gap) + ' trong ' + c.S.lp.loanDays + ' ngày, lãi ~' + c.S.lp.loanRate + '%/năm.',
        'Chỉ dùng như PHƯƠNG ÁN DỰ PHÒNG sau khi đã làm các phương án thu/chi ở trên – tránh “vay đảo nợ” kéo dài.',
        'Gắn nguồn trả nợ cụ thể (khoản phải thu lớn sẽ về) vào hồ sơ vay.'],
      kpi: 'Trả đúng hạn; tổng nợ ngân hàng/tổng vốn lưu động không vượt trần nội bộ.' }
  ];
}

function runLevers(M) {
  const S = M.S;
  const evBase = buildEvents(M, 'base');
  const simBase = simulate(evBase, S);
  const thr = autoMinCash(M, evBase);
  const arA = analyzeAR(M.ar, S, M.hist), apA = analyzeAP(M.ap, S);
  const mb13 = minBal(simBase, 91).v;
  const gap = Math.max(0, thr - mb13);
  const gradeBy = {}; arA.cust.forEach(c => { gradeBy[c.key] = c.grade; });
  const riskShare = arA.total ? sum(arA.cust.filter(c => c.grade === 'C' || c.grade === 'D'), c => c.total) / arA.total : 0;
  const outflow90 = sum(evBase.filter(e => e.d < 90 && e.a < 0), e => -e.a);
  const needAlt = Math.max(0.05 * outflow90 / 3, 1);
  const need = gap > 0 ? gap : needAlt;
  const res = [];
  leverDefs().forEach(L => {
    const ctx = { S, gradeBy, riskShare, gap, feas: 3, extraCost: 0 };
    const r = L.apply(copyEv(evBase), ctx);
    if (!r) { res.push({ id: L.id, name: L.name, type: L.type, na: true }); return; }
    const sim = simulate(r.ev, S);
    const mbN = minBal(sim, 91).v;
    const d60 = sim.bal[59] - simBase.bal[59], d30 = sim.bal[29] - simBase.bal[29], dmin = mbN - mb13;
    const endDiff = simBase.bal[HORIZON - 1] - sim.bal[HORIZON - 1];
    const cost = Math.max(0, endDiff) + ctx.extraCost;
    let meanD = 0; for (let d = 0; d < 60; d++) meanD += sim.bal[d] - simBase.bal[d]; meanD /= 60;
    const gross = gap > 0 ? 0.5 * dmin + 0.5 * meanD : meanD;
    const impactVal = Math.max(0, gross);
    const costRatio = impactVal > 0 ? cost / impactVal : 1;
    const targets = Object.entries(r.targets || {}).map(([name, amt]) => ({ name, amt })).sort((a, b) => b.amt - a.amt);
    let annual = null;
    if (L.id === 'L2') annual = S.lp.discPct / 100 / (1 - S.lp.discPct / 100) * 365 / 30;
    res.push({ id: L.id, name: L.name, type: L.type, backup: !!L.backup, impact: impactVal, d30, d60, dmin, meanD, cost, costRatio, ttc: L.ttc, risk: L.risk,
      feas: ctx.feas || 3, targets, ev: r.ev, sim, annual, actions: L.actions(Object.assign({ S }, ctx)), kpi: L.kpi });
  });
  /* Chấm điểm (0–100):
     Tác động = 60% so với phương án vận hành mạnh nhất + 40% mức bù được khoản hụt;
     Tốc độ = thời gian ra tiền; Khả thi = 1–5 theo số đầu mối/độ phức tạp; Chi phí & rủi ro = tỷ lệ chi phí/tác động + mức rủi ro vận hành. */
  const live = res.filter(x => !x.na);
  const maxOp = Math.max(1, ...live.filter(x => !x.backup).map(x => x.impact));
  const w = S.w, wt = w.impact + w.speed + w.feas + w.risk;
  live.forEach(x => {
    x.sImpact = Math.round(clamp(0.6 * x.impact / maxOp * 100 + 0.4 * clamp(x.impact / need, 0, 1) * 100, 0, 100));
    x.sSpeed = Math.round(clamp(100 - (x.ttc - 7) / 53 * 100, 0, 100));
    x.sFeas = Math.round(x.feas * 20);
    x.sRisk = Math.round(0.5 * clamp(100 - x.costRatio * 1000, 0, 100) + 0.5 * ((5 - x.risk) / 4 * 100));
    x.score = Math.round((x.sImpact * w.impact + x.sSpeed * w.speed + x.sFeas * w.feas + x.sRisk * w.risk) / wt);
  });
  const ok = live.sort((a, b) => b.score - a.score);
  const opOk = ok.filter(x => !x.backup);
  /* 2 phương án đề xuất = 2 phương án VẬN HÀNH điểm cao nhất (thu hồi/giãn chi/tồn kho/ứng vốn theo hóa đơn),
     ưu tiên khác loại nếu điểm chênh ≤ 10 – tránh dồn rủi ro vào một kênh. Vay/đảo nợ chỉ là dự phòng cho phần còn thiếu. */
  let top = opOk.slice(0, 2);
  if (opOk.length > 2 && opOk[0].type === opOk[1].type) {
    const alt = opOk.slice(2).find(x => x.type !== opOk[0].type);
    if (alt && opOk[1].score - alt.score <= 10) top = [opOk[0], alt];
  }
  const opSum = sum(opOk.slice().sort((a, b) => b.impact - a.impact).slice(0, 3), x => x.impact), backupPenalty = 0;
  return { evBase, simBase, thr, gap, mb13, need, opSum, backupPenalty, results: ok, na: res.filter(x => x.na), top, backups: ok.filter(x => x.backup), arA, apA };
}

/** Mô phỏng khi áp dụng nhiều phương án cùng lúc (áp dụng tuần tự lên cùng danh sách sự kiện) */
function applyLevers(M, ids, scenId) {
  let ev = buildEvents(M, scenId || 'base');
  const evBase = buildEvents(M, 'base');
  const S = M.S, arA = analyzeAR(M.ar, S, M.hist);
  const simBase = simulate(evBase, S), thr = autoMinCash(M, evBase);
  const gap = Math.max(0, thr - minBal(simBase, 91).v);
  const gradeBy = {}; arA.cust.forEach(c => { gradeBy[c.key] = c.grade; });
  const riskShare = arA.total ? sum(arA.cust.filter(c => c.grade === 'C' || c.grade === 'D'), c => c.total) / arA.total : 0;
  const defs = leverDefs();
  ids.forEach(id => { const L = defs.find(x => x.id === id); if (!L) return; const r = L.apply(ev, { S, gradeBy, riskShare, gap, feas: 3, extraCost: 0 }); if (r) ev = r.ev; });
  return ev;
}

/* ---------------------------------------------------------------- tổng hợp toàn bộ mô hình */
function runAll(M) {
  const S = M.S;
  const arA = analyzeAR(M.ar, S, M.hist), apA = analyzeAP(M.ap, S);
  const scen = {};
  Object.keys(SCENARIOS).forEach(id => { const ev = buildEvents(M, id); scen[id] = { ev, sim: simulate(ev, S) }; });
  const thr = autoMinCash(M, scen.base.ev);
  const health = healthScore(M, { arA, apA, sim: scen.base.sim, thr, evBase: scen.base.ev });
  const lev = runLevers(M);
  const mb = {}; Object.keys(scen).forEach(id => { mb[id] = minBal(scen[id].sim, 91); });
  const fb = firstBelow(scen.base.sim, 0, 91), ft = firstBelow(scen.base.sim, thr, 91);
  const tgtLev = lev.top.map(x => x.id);
  const evRec = lev.top.length ? applyLevers(M, tgtLev, 'base') : scen.base.ev;
  const simRec = simulate(evRec, S), mbRec = minBal(simRec, 91);
  const residual = Math.max(0, thr - mbRec.v);
  const bk = lev.backups.find(x => x.id === 'L10');
  const loanNeed = residual > 0 ? Math.ceil(residual * 1.15 / 1e8) * 1e8 : 0;
  return { arA, apA, scen, thr, health, lev, mb, firstNeg: fb, firstBelowThr: ft, evRec, simRec, mbRec, residual, loanNeed, backup: bk,
           dso: dsoOf(S, arA), dpo: dpoOf(S, apA), dio: dioOf(S), term: effTerm(S, M), purTerm: effPurTerm(S, M) };
}

root.HG = { dn, ymd, dim, fmtDate, isoDate, todayDn, monthKey, parseDate, parseNum, clamp, sum, keyOf, fmtVnd, pct,
  BUCKETS, AP_BUCKETS, CATS, IN_CATS, OUT_CATS, SCENARIOS, SEGS, LEVER_TYPES, HORIZON,
  defaultSettings, analyzeAR, analyzeAP, buildEvents, simulate, aggregate, minBal, firstBelow, autoMinCash,
  healthScore, runLevers, applyLevers, runAll, weightedTerm, effTerm, effPurTerm, custStatsFromHist, dsoOf, dpoOf, dioOf, leverDefs };
if (typeof module !== 'undefined' && module.exports) module.exports = root.HG;
})(typeof window !== 'undefined' ? window : globalThis);
