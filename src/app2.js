/* =====================================================================
 * APP – các màn hình (VIEWS)
 * ===================================================================== */
const VIEWS = {};
const TABS = [['home', 'Tổng quan'], ['ar', 'Phải thu'], ['ap', 'Phải trả'], ['cash', 'Dòng tiền & điểm hụt'], ['plan', 'Đề xuất tháng (2 phương án)'], ['strat', 'Định hướng 12 tháng'], ['data', 'Dữ liệu & giả định']];
const scoreCol = s => s < 40 ? '#c62828' : s < 60 ? '#d9480f' : s < 80 ? '#2563eb' : '#16803c';
const ACTION_BY_GRADE = { A: 'Duy trì, nhắc lịch T-3.', B: 'Gọi/email trong 24h, chốt NGÀY chuyển tiền.', C: 'Trưởng phòng làm việc; dừng chiết khấu; trả trước một phần cho đơn mới.', D: 'Chặn giao hàng chịu; biên bản + lộ trình ký; xem xét pháp lý.' };

function emptyState() {
  return `<div class="card"><h2>Chưa có dữ liệu</h2><p>Để bắt đầu: vào tab <b>Dữ liệu &amp; giả định</b> → nạp file Excel phải thu / phải trả (xuất từ phần mềm kế toán), nhập số dư tiền và chi phí cố định.</p>
  <p><button class="p" data-act="demo">Nạp dữ liệu MẪU để xem thử toàn bộ chương trình</button> <button data-act="tab" data-v="data">Đi tới tab Dữ liệu</button></p></div>`;
}
const dayLabel = d => { const o = ymd(M.S.asof + d); return String(o.d).padStart(2, '0') + '/' + String(o.m).padStart(2, '0'); };

/* ---------------------------------------------------------------- TỔNG QUAN */
const fmt0 = n => fmtVnd(+n || 0);
function alertsList() {
  const A = R.arA, P = R.apA, S = M.S, out = [];
  const mb = R.mb.base, thr = R.thr;
  if (R.firstNeg != null) out.push(['bad', `<b>HẾT TIỀN dự kiến ngày ${fmtDate(S.asof + R.firstNeg)}</b> (sau ${R.firstNeg} ngày) nếu không hành động. Số dư thấp nhất ${fmtVnd(mb.v)} vào ${fmtDate(S.asof + mb.d)}.`]);
  else if (R.firstBelowThr != null) out.push(['warn', `Số dư xuống dưới ngưỡng an toàn (${fmtVnd(thr)}) từ ${fmtDate(S.asof + R.firstBelowThr)}; thấp nhất ${fmtVnd(mb.v)} ngày ${fmtDate(S.asof + mb.d)}.`]);
  else out.push(['good', `13 tuần tới không có điểm hụt tiền ở kịch bản Cơ bản (thấp nhất ${fmtVnd(mb.v)}).`]);
  if (R.mb.cons.v < 0 && mb.v >= 0) out.push(['warn', `Kịch bản <b>Thận trọng</b> (khách trả chậm hơn): số dư âm ${fmtVnd(R.mb.cons.v)} – cần phương án dự phòng.`]);
  if (A.over60Pct * 100 > S.targetOver60) out.push(['warn', `Nợ quá hạn >60 ngày = ${pct(A.over60Pct)} dư nợ (${fmtVnd(A.over60)}), vượt mục tiêu ${S.targetOver60}%.`]);
  if (A.cust[0] && A.cust[0].share > 0.2) out.push(['warn', `Khách lớn nhất “${esc(A.cust[0].cust)}” chiếm ${pct(A.cust[0].share)} dư nợ – rủi ro tập trung.`]);
  if (P.overdue > 0) out.push(['warn', `Đang nợ quá hạn NCC ${fmtVnd(P.overdue)} – nguy cơ bị cắt hàng/tăng giá.`]);
  const ln = (M.loans || []).filter(L => L.maturity != null && L.maturity - S.asof >= 0 && L.maturity - S.asof <= 90 && (L.roll || 0) < 100).sort((a, b) => a.maturity - b.maturity);
  ln.filter(L => L.maturity - S.asof <= 10).slice(0, 4).forEach(L => out.push(['info', `Khoản vay “${esc(L.name)}” đáo hạn ${fmtDate(L.maturity)} (còn ${L.maturity - S.asof} ngày) – ${fmt0(L.balance)} cần trả hoặc xin đảo nợ.`]));
  if (ln.length > 4) out.push(['info', `${ln.length} khoản vay phải trả gốc trong 90 ngày tới, tổng ${fmtVnd(sum(ln, L => L.balance))} (chưa tính khoản được đảo nợ).`]);
  if (A.missingDue) out.push(['info', `${A.missingDue} hóa đơn phải thu không có hạn thanh toán – đã tạm tính theo ${R.term} ngày. Nên bổ sung để dự báo chính xác.`]);
  if (!S.monthlySales) out.push(['info', 'Chưa nhập doanh thu bán hàng tháng dự kiến – dòng tiền chỉ phản ánh công nợ hiện có (chưa có bán hàng mới). Vào tab Dữ liệu &amp; giả định.']);
  return out;
}
VIEWS.home = () => {
  if (!R) return emptyState();
  const A = R.arA, P = R.apA, S = M.S, H = R.health, bal = R.scen.base.sim.bal;
  const ccc = R.dso != null && R.dpo != null ? Math.round(R.dso + (R.dio || 0) - R.dpo) : null;
  const n30 = bal[29] - S.cash0;
  const labels = []; for (let d = 0; d < 91; d++) labels.push(dayLabel(d));
  const ser = [
    { name: 'Thận trọng', color: '#c62828', vals: Array.from(R.scen.cons.sim.bal.slice(0, 91)), dash: 1, width: 1.8 },
    { name: 'Cơ bản', color: '#1d4ed8', vals: Array.from(bal.slice(0, 91)), width: 2.6 },
    { name: 'Lạc quan', color: '#16803c', vals: Array.from(R.scen.opt.sim.bal.slice(0, 91)), dash: 1, width: 1.8 }];
  if (R.lev.top.length) ser.push({ name: 'Cơ bản + 2 phương án đề xuất', color: '#0f766e', vals: Array.from(R.simRec.bal.slice(0, 91)), width: 2.8 });
  const chase = A.cust.filter(c => c.overdue > 0).sort((a, b) => b.overdue - a.overdue).slice(0, 6);
  const payNow = P.inv.filter(x => x.left <= 7).sort((a, b) => b.amt - a.amt).slice(0, 6);
  return `<div class="grid2">
  <div class="card"><h2>Điểm sức khỏe dòng tiền</h2><p class="sub">Thang 0–100, tổng hợp 5 nhóm chỉ số (chi tiết cách tính ở tab Đề xuất tháng).</p>
   <div class="hs"><div class="big" style="background:${H.color}"><b>${H.score}</b><span>${H.grade}</span></div>
   <div style="flex:1;min-width:280px">${H.comps.map(c => `<div class="comp"><span>${esc(c.name)} <small style="color:#64748b">(${c.w}%)</small></span><div class="t"><i style="width:${c.s}%;background:${scoreCol(c.s)}"></i></div><b>${c.s}</b><small>${c.note}</small></div>`).join('')}</div></div></div>
  <div class="card"><h2>Cảnh báo &amp; điểm hụt tiền</h2>${alertsList().map(a => `<div class="alert ${a[0]}">${a[1]}</div>`).join('')}</div></div>
  <div class="kpis">
   ${kpi('Số dư tiền hiện tại', fT(S.cash0) + ' tỷ', 'Ngày chốt ' + fmtDate(S.asof))}
   ${kpi('Phải thu', fT(A.total) + ' tỷ', 'Quá hạn ' + pct(A.overduePct) + ' · >60 ngày ' + pct(A.over60Pct), A.over60Pct * 100 > S.targetOver60 ? 'warn' : 'good')}
   ${kpi('Phải trả', fT(P.total) + ' tỷ', 'Đến hạn ≤30 ngày: ' + fT(P.due30) + ' tỷ', P.overdue > 0 ? 'warn' : '')}
   ${kpi('DSO / DPO / chu kỳ tiền', (R.dso != null ? Math.round(R.dso) : '–') + ' / ' + (R.dpo != null ? Math.round(R.dpo) : '–') + ' ngày', ccc != null ? 'Chu kỳ chuyển đổi tiền (CCC) ≈ ' + ccc + ' ngày' : 'Nhập doanh thu tháng để tính')}
   ${kpi('Số dư thấp nhất 13 tuần', fT(R.mb.base.v) + ' tỷ', 'Ngày ' + fmtDate(S.asof + R.mb.base.d) + ' · ngưỡng ' + fT(R.thr) + ' tỷ', R.mb.base.v < 0 ? 'bad' : R.mb.base.v < R.thr ? 'warn' : 'good')}
   ${kpi('Dòng tiền ròng 30 ngày', fT(n30) + ' tỷ', 'Kịch bản Cơ bản', n30 < 0 ? 'bad' : 'good')}
  </div>
  <div class="card"><h2>Số dư tiền dự báo 13 tuần (theo ngày)</h2><p class="sub">Đường màu xanh ngọc = nếu thực hiện 2 phương án đề xuất tháng này. Di chuột để xem số liệu từng ngày.</p>
   ${lineChart({ labels, series: ser, thr: R.thr, title: 'Số dư tiền dự báo' })}</div>
  <div class="grid2">
   <div class="card"><h2>Việc cần làm tuần này – THU nợ</h2><p class="sub">6 khách có số tiền quá hạn lớn nhất.</p>
    ${tbl('home_chase', [{ h: 'Khách hàng', f: c => esc(c.cust) }, { h: 'Phụ trách', f: c => esc(c.owner) }, { h: 'Quá hạn (tr)', c: 'n', f: c => fm(c.overdue) }, { h: 'Ngày trễ', c: 'n', f: c => c.maxOver }, { h: 'Hạng', c: 'c', f: c => gradePill(c.grade) }], chase, { empty: 'Không có khách quá hạn.' })}</div>
   <div class="card"><h2>Việc cần làm tuần này – TRẢ NCC</h2><p class="sub">Hóa đơn phải trả đến hạn ≤7 ngày (hoặc đã quá hạn).</p>
    ${tbl('home_pay', [{ h: 'Nhà cung cấp', f: x => esc(x.sup) }, { h: 'Số HĐ', f: x => esc(x.ref) }, { h: 'Số tiền (tr)', c: 'n', f: x => fm(x.amt) }, { h: 'Còn (ngày)', c: 'n', f: x => x.left, cls: x => x.left < 0 ? 'neg' : '' }], payNow, { empty: 'Không có khoản đến hạn trong 7 ngày.' })}</div></div>`;
};

/* ---------------------------------------------------------------- PHẢI THU */
VIEWS.ar = () => {
  if (!R || !M.ar.length) return emptyState();
  const A = R.arA, S = M.S;
  const items = HG.BUCKETS.map((l, i) => ({ l, amt: A.buckets[i].amt }));
  const bk = HG.BUCKETS.map((l, i) => { const b = A.buckets[i], p = S.bucketP[i]; return { l, i, amt: b.amt, n: b.n, p, exp: b.amt * p }; });
  const q = UI.q.trim().toLowerCase();
  let cs = A.cust.filter(c => (!q || c.cust.toLowerCase().includes(q) || (c.owner || '').toLowerCase().includes(q)) && (!UI.grade || c.grade === UI.grade) && (!UI.seg || c.seg === UI.seg));
  const segs = Object.keys(HG.SEGS).map(k => { const cc = A.cust.filter(c => c.seg === k); const tot = sum(cc, c => c.total), ov = sum(cc, c => c.overdue); let pot = sum(A.inv.filter(x => x.b > 0 && cc.some(c => c.key === keyOf(x.cust))), x => x.amt * Math.max(0, 0.9 - S.bucketP[x.b])); if (k === 'S4') pot = sum(A.inv.filter(x => x.b === 0 && x.over >= -60 && cc.some(c => c.key === keyOf(x.cust))), x => x.amt) * 0.35; return { k, n: cc.length, tot, ov, pot }; });
  const invRows = UI.cust ? A.inv.filter(x => keyOf(x.cust) === UI.cust) : A.inv.filter(x => x.over > 0);
  return `<div class="kpis">
   ${kpi('Tổng phải thu', fT(A.total) + ' tỷ', A.n + ' hóa đơn · ' + A.cust.length + ' khách')}
   ${kpi('Quá hạn', fT(A.overdue) + ' tỷ', pct(A.overduePct) + ' dư nợ', A.overduePct > 0.3 ? 'bad' : A.overduePct > 0.15 ? 'warn' : 'good')}
   ${kpi('Quá hạn >60 ngày', fT(A.over60) + ' tỷ', pct(A.over60Pct) + ' · mục tiêu ≤ ' + S.targetOver60 + '%', A.over60Pct * 100 > S.targetOver60 ? 'bad' : 'good')}
   ${kpi('DSO', R.dso != null ? Math.round(R.dso) + ' ngày' : '–', 'Mục tiêu ' + S.targetDSO + ' ngày · 1 ngày DSO ≈ ' + (S.monthlySales ? fm(S.monthlySales * 12 / 365) + ' tr' : '–'), R.dso != null && R.dso > S.targetDSO + 10 ? 'warn' : '')}
   ${kpi('Sắp đến hạn 30 ngày', fT(A.due30) + ' tỷ', 'Cần nhắc lịch T-3')}
   ${kpi('Top 5 khách', pct(A.top5), 'mục tiêu ≤ ' + S.targetTop5 + '%', A.top5 * 100 > S.targetTop5 ? 'warn' : 'good')}</div>
  <div class="grid2"><div class="card"><h2>Cơ cấu tuổi nợ theo hạn thanh toán</h2><p class="sub">Đơn vị: triệu đồng.</p>${stackBar(items, A.total, AGE_COL)}
   <h3>Xác suất thu &amp; tiền thu kỳ vọng (giả định có thể chỉnh ở tab Dữ liệu)</h3>
   ${tbl('arb', [{ h: 'Nhóm tuổi nợ', f: b => `<span style="color:${AGE_COL[b.i]}">●</span> ${b.l}` }, { h: 'Số HĐ', c: 'n', f: b => b.n }, { h: 'Số tiền (tr)', c: 'n', f: b => fm(b.amt) }, { h: 'Xác suất thu', c: 'n', f: b => pct(b.p) }, { h: 'Kỳ vọng thu (tr)', c: 'n', f: b => fm(b.exp) }], bk, { foot: ['Tổng', A.n, fm(A.total), '', fm(sum(bk, b => b.exp))], nomax: 1 })}</div>
  <div class="card"><h2>Nhóm công nợ cần tập trung (phân khúc chiến lược)</h2><p class="sub">Xếp theo tiềm năng kéo thêm tiền về. “Tiềm năng” = tiền nợ quá hạn nếu được nâng xác suất thu lên 90%; riêng nhóm khách lớn tốt = tiền có thể kéo sớm nhờ chiết khấu thanh toán (35% chấp nhận).</p>
   ${tbl('segs', [{ h: 'Nhóm', f: s => `<b style="color:${HG.SEGS[s.k].color}">${HG.SEGS[s.k].name}</b><div class="note">${HG.SEGS[s.k].desc}</div>`, cls: 'nw' }, { h: 'Số khách', c: 'n', f: s => s.n, v: s => s.n }, { h: 'Dư nợ (tr)', c: 'n', f: s => fm(s.tot), v: s => s.tot }, { h: 'Quá hạn (tr)', c: 'n', f: s => fm(s.ov), v: s => s.ov }, { h: 'Tiềm năng (tr)', c: 'n', f: s => '<b>' + fm(s.pot) + '</b>', v: s => s.pot }], segs, { sort: { k: 4, dir: 'desc' }, nomax: 1 })}
   <p class="note">Chính sách chi tiết từng nhóm: xem tab Định hướng 12 tháng.</p></div></div>
  <div class="card"><h2>Công nợ theo khách hàng – chấm điểm tín dụng</h2>
   <p class="sub">Hạng A: không quá hạn · B: quá hạn ≤30 ngày · C: 31–90 · D: &gt;90. Điểm 0–100 (cao = tốt) tính từ số ngày trễ lớn nhất, tỷ lệ quá hạn và lịch sử trả tiền. Quy mô A/B/C theo Pareto dư nợ (70%/90%).</p>
   <div class="noprint" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px"><input type="text" data-filter="q" placeholder="Tìm khách / nhân viên…" value="${esc(UI.q)}">
    <select data-filter="grade"><option value="">Mọi hạng</option>${['A', 'B', 'C', 'D'].map(g => `<option ${UI.grade === g ? 'selected' : ''}>${g}</option>`).join('')}</select>
    <select data-filter="seg"><option value="">Mọi nhóm chiến lược</option>${Object.keys(HG.SEGS).map(k => `<option value="${k}" ${UI.seg === k ? 'selected' : ''}>${HG.SEGS[k].name}</option>`).join('')}</select>
    <button data-act="exp_ar">Xuất Excel</button></div>
   ${tbl('arc', [
    { h: 'Khách hàng', f: c => `<a href="#" data-act="pickcust" data-k="${esc(c.key)}">${esc(c.cust)}</a>`, v: c => c.cust },
    { h: 'Phụ trách', f: c => esc(c.owner), v: c => c.owner || '' },
    { h: 'Dư nợ (tr)', c: 'n', f: c => fm(c.total), v: c => c.total }, { h: '% tổng', c: 'n', f: c => pct(c.share), v: c => c.share },
    { h: 'Quy mô', c: 'c', f: c => c.size, v: c => c.size }, { h: 'Hạng', c: 'c', f: c => gradePill(c.grade), v: c => c.grade },
    { h: 'Chưa đến hạn', c: 'n', f: c => fm(c.b[0]), v: c => c.b[0] }, { h: 'QH 1–30', c: 'n', f: c => fm(c.b[1]), v: c => c.b[1] }, { h: 'QH 31–90', c: 'n', f: c => fm(c.b[2] + c.b[3]), v: c => c.b[2] + c.b[3] }, { h: 'QH >90', c: 'n', f: c => fm(c.b[4] + c.b[5]), v: c => c.b[4] + c.b[5], cls: c => c.b[4] + c.b[5] > 0 ? 'neg' : '' },
    { h: 'Trễ max (ngày)', c: 'n', f: c => c.maxOver > 0 ? c.maxOver : '', v: c => c.maxOver },
    { h: 'Trễ TB lịch sử', c: 'n', t: 'Số ngày trễ bình quân so với hạn (từ lịch sử thu). Cần nạp sheet Lịch sử thu.', f: c => c.hist ? f1(c.hist.delay) : '–', v: c => c.hist ? c.hist.delay : -99 },
    { h: 'Điểm', c: 'c', f: c => `<b style="color:${scoreCol(c.score)}">${c.score}</b>`, v: c => c.score },
    { h: 'Nhóm chiến lược', f: c => `<span style="color:${HG.SEGS[c.seg].color};font-weight:600">${HG.SEGS[c.seg].name}</span>`, v: c => c.seg },
    { h: 'Hành động đề xuất', f: c => ACTION_BY_GRADE[c.grade] }], cs, { sort: { k: 2, dir: 'desc' }, limit: 60, rowAttr: c => UI.cust === c.key ? 'style="outline:2px solid #1d4ed8"' : '' })}</div>
  <div class="card"><h2>Chi tiết hóa đơn ${UI.cust ? '– ' + esc((A.cust.find(c => c.key === UI.cust) || {}).cust) + ' <button class="s" data-act="pickcust" data-k="">Bỏ lọc</button>' : 'quá hạn (nhấn tên khách ở bảng trên để lọc)'}</h2>
   ${tbl('ari', [{ h: 'Khách hàng', f: x => esc(x.cust), v: x => x.cust }, { h: 'Số HĐ', f: x => esc(x.ref), v: x => x.ref }, { h: 'Ngày HĐ', f: x => fmtDate(x.date), v: x => x.date || 0 }, { h: 'Hạn TT', f: x => fmtDate(x.due), v: x => x.due }, { h: 'Số tiền (VND)', c: 'n', f: x => ff(x.amt), v: x => x.amt }, { h: 'Ngày quá hạn', c: 'n', f: x => x.over > 0 ? x.over : '', v: x => x.over, cls: x => x.over > 60 ? 'cellbad' : x.over > 0 ? 'cellwarn' : '' }, { h: 'Nhóm tuổi nợ', f: x => HG.BUCKETS[x.b], v: x => x.b }], invRows, { sort: { k: 5, dir: 'desc' }, limit: 100 })}</div>`;
};

/* ---------------------------------------------------------------- PHẢI TRẢ */
VIEWS.ap = () => {
  if (!R || !M.ap.length) return `<div class="card"><h2>Chưa có dữ liệu phải trả</h2><p>Nạp file phải trả ở tab <b>Dữ liệu &amp; giả định</b>. ${hasData() ? '' : '<button class="p" data-act="demo">Nạp dữ liệu mẫu</button>'}</p></div>`;
  const P = R.apA, S = M.S;
  const items = HG.AP_BUCKETS.map((l, i) => ({ l, amt: P.buckets[i].amt }));
  const stretchPot = sum(P.inv.filter(x => x.left >= 0 && x.left <= 30 && x.stretch > 0), x => x.amt);
  const wk = []; for (let w = 0; w < 9; w++) wk.push({ w, l: w === 0 ? 'Quá hạn / tuần 1 (0–7 ngày)' : `Tuần ${w + 1} (${w * 7 + 1}–${w * 7 + 7} ngày)`, amt: sum(P.inv.filter(x => w === 0 ? x.left <= 7 : x.left > w * 7 && x.left <= w * 7 + 7), x => x.amt) });
  const mx = Math.max(...wk.map(x => x.amt), 1);
  const q = UI.apq.trim().toLowerCase();
  const sup = P.sup.filter(s => !q || s.sup.toLowerCase().includes(q));
  return `<div class="kpis">
   ${kpi('Tổng phải trả NCC', fT(P.total) + ' tỷ', P.n + ' hóa đơn · ' + P.sup.length + ' NCC')}
   ${kpi('Đã quá hạn', fT(P.overdue) + ' tỷ', pct(P.total ? P.overdue / P.total : 0), P.overdue > 0 ? 'bad' : 'good')}
   ${kpi('Đến hạn ≤14 ngày', fT(P.due14) + ' tỷ', 'Cần có tiền sẵn', P.due14 > S.cash0 ? 'warn' : '')}
   ${kpi('Đến hạn ≤30 ngày', fT(P.due30) + ' tỷ', 'So với tiền thu dự kiến 30 ngày: ' + pct(sum(R.scen.base.ev.filter(e => e.d < 30 && e.a > 0), e => e.a) ? P.due30 / sum(R.scen.base.ev.filter(e => e.d < 30 && e.a > 0), e => e.a) : 0))}
   ${kpi('DPO', R.dpo != null ? Math.round(R.dpo) + ' ngày' : '–', 'Số ngày trả NCC bình quân')}
   ${kpi('Dư địa đàm phán giãn hạn', fT(stretchPot) + ' tỷ', 'Nợ đến hạn ≤30 ngày thuộc nhóm có thể giãn', 'good')}</div>
  <div class="grid2"><div class="card"><h2>Cơ cấu phải trả theo thời hạn thanh toán</h2><p class="sub">Đơn vị: triệu đồng.</p>${stackBar(items, P.total, AP_COL)}
    <h3>Lịch đến hạn theo tuần</h3><div class="tw nomax"><table>${wk.map(x => `<tr><td class="nw">${x.l}</td><td class="n nw">${fm(x.amt)} tr</td><td style="width:50%"><div style="background:#e8890c;height:12px;border-radius:3px;width:${(100 * x.amt / mx).toFixed(1)}%"></div></td></tr>`).join('')}</table></div></div>
  <div class="card"><h2>Theo nhóm NCC &amp; khả năng giãn hạn</h2><p class="sub">Số ngày có thể đàm phán giãn thêm đặt ở tab Dữ liệu &amp; giả định (bảng nhóm NCC).</p>
   ${tbl('apg', [{ h: 'Nhóm NCC', f: g => esc(g.grp) }, { h: 'Số HĐ', c: 'n', f: g => g.n }, { h: 'Dư nợ (tr)', c: 'n', f: g => fm(g.total) }, { h: 'Đến hạn ≤30 ngày (tr)', c: 'n', f: g => fm(g.due30) }, { h: 'Có thể giãn (ngày)', c: 'n', f: g => HG.leverDefs && (M.S.apGroups.find(x => keyOf(x.name) === keyOf(g.grp)) || { stretch: 0 }).stretch }], P.grp, { nomax: 1 })}</div></div>
  <div class="card"><h2>Công nợ theo nhà cung cấp</h2><div class="noprint" style="margin-bottom:8px"><input type="text" data-filter="apq" placeholder="Tìm NCC…" value="${esc(UI.apq)}"></div>
   ${tbl('aps', [{ h: 'Nhà cung cấp', f: s => esc(s.sup), v: s => s.sup }, { h: 'Nhóm', f: s => esc(s.grp), v: s => s.grp }, { h: 'Dư nợ (tr)', c: 'n', f: s => fm(s.total), v: s => s.total }, { h: 'Quá hạn (tr)', c: 'n', f: s => fm(s.overdue), v: s => s.overdue, cls: s => s.overdue > 0 ? 'neg' : '' }, { h: '≤14 ngày (tr)', c: 'n', f: s => fm(s.due14), v: s => s.due14 }, { h: '≤30 ngày (tr)', c: 'n', f: s => fm(s.due30), v: s => s.due30 }], sup, { sort: { k: 2, dir: 'desc' }, limit: 40 })}</div>
  <div class="card"><h2>Lịch thanh toán chi tiết (sắp theo hạn)</h2>
   ${tbl('api', [{ h: 'NCC', f: x => esc(x.sup), v: x => x.sup }, { h: 'Số HĐ', f: x => esc(x.ref), v: x => x.ref }, { h: 'Ngày HĐ', f: x => fmtDate(x.date), v: x => x.date || 0 }, { h: 'Hạn TT', f: x => fmtDate(x.due), v: x => x.due }, { h: 'Số tiền (VND)', c: 'n', f: x => ff(x.amt), v: x => x.amt }, { h: 'Còn (ngày)', c: 'n', f: x => x.left, v: x => x.left, cls: x => x.left < 0 ? 'cellbad' : x.left <= 7 ? 'cellwarn' : '' }, { h: 'Nhóm', f: x => esc(x.grp), v: x => x.grp }, { h: 'Giãn được', c: 'n', f: x => x.stretch ? x.stretch + ' ngày' : '', v: x => x.stretch }], P.inv, { sort: { k: 3, dir: 'asc' }, limit: 100 })}</div>`;
};

/* ---------------------------------------------------------------- DÒNG TIỀN */
function periodDays(mode, i) {
  if (mode === 'week') return [i * 7, i * 7 + 6];
  const o = ymd(M.S.asof), s = dn(o.y, o.m + i, 1), e = dn(o.y, o.m + i + 1, 1) - 1;
  return [Math.max(0, s - M.S.asof), Math.min(HG.HORIZON - 1, e - M.S.asof)];
}
VIEWS.cash = () => {
  if (!R) return emptyState();
  const S = M.S, sc = UI.scen, n = UI.view === 'week' ? 13 : 12;
  const ev = R.scen[sc].ev, ag = HG.aggregate(ev, S, UI.view, n), thr = R.thr;
  const scBtns = Object.values(HG.SCENARIOS).map(s => `<button class="${UI.scen === s.id ? 'on' : ''}" data-act="scen" data-v="${s.id}">${s.name}</button>`).join('');
  const vBtns = [['week', '13 tuần'], ['month', '12 tháng']].map(([k, l]) => `<button class="${UI.view === k ? 'on' : ''}" data-act="view" data-v="${k}">${l}</button>`).join('');
  const row = (label, arr, o = {}) => `<tr class="${o.cls || ''}"><td class="nw">${label}</td>${Array.from(arr).map(v => `<td class="n ${o.cell ? o.cell(v) : ''}">${o.neg ? (v ? fm(-v) : '–') : (v ? fm(v) : '–')}</td>`).join('')}<td class="n"><b>${o.noTot ? '' : fm(sum(Array.from(arr)) * (o.neg ? -1 : 1))}</b></td></tr>`;
  let rows = `<tr class="tot"><td>Số dư đầu kỳ</td>${Array.from(ag.open).map(v => `<td class="n">${fm(v)}</td>`).join('')}<td></td></tr>`;
  rows += `<tr class="sec"><td colspan="${n + 2}">TIỀN THU</td></tr>`;
  HG.IN_CATS.forEach(c => { if (sum(Array.from(ag.byCat[c]), Math.abs) > 0) rows += row(HG.CATS[c], ag.byCat[c]); });
  rows += row('Tổng thu', ag.inflow, { cls: 'tot' });
  rows += `<tr class="sec"><td colspan="${n + 2}">TIỀN CHI</td></tr>`;
  HG.OUT_CATS.forEach(c => { if (sum(Array.from(ag.byCat[c]), Math.abs) > 0) rows += row(HG.CATS[c], ag.byCat[c], { neg: 1 }); });
  rows += row('Tổng chi', ag.outflow, { cls: 'tot', neg: 1 });
  rows += row('Dòng tiền ròng (thu − chi)', ag.net, { cls: 'tot', cell: v => v < 0 ? 'neg' : '' });
  rows += `<tr class="tot"><td>SỐ DƯ CUỐI KỲ</td>${Array.from(ag.close).map(v => `<td class="n ${v < 0 ? 'cellbad' : v < thr ? 'cellwarn' : ''}">${fm(v)}</td>`).join('')}<td></td></tr>`;
  rows += `<tr><td class="nw">Số dư thấp nhất trong kỳ</td>${Array.from(ag.minIn).map(v => `<td class="n ${v < 0 ? 'cellbad' : v < thr ? 'cellwarn' : ''}">${fm(v)}</td>`).join('')}<td></td></tr>`;
  /* nguyên nhân điểm hụt */
  const causes = [];
  for (let i = 0; i < n && causes.length < 4; i++) {
    if (ag.minIn[i] >= thr) continue;
    const [a, b] = periodDays(UI.view, i), g = {};
    ev.forEach(e => { if (e.d >= a && e.d <= b && e.a < 0) { const k = e.who || HG.CATS[e.c]; g[k] = (g[k] || 0) + e.a; } });
    const top = Object.entries(g).sort((x, y) => x[1] - y[1]).slice(0, 3).map(([k, v]) => `${esc(k)} ${fmtVnd(-v)}`).join('; ');
    const inn = sum(ev.filter(e => e.d >= a && e.d <= b && e.a > 0), e => e.a);
    causes.push(`<div class="alert ${ag.minIn[i] < 0 ? 'bad' : ''}"><b>${ag.labels[i]}</b> (${fmtDate(S.asof + a)} – ${fmtDate(S.asof + b)}): thấp nhất <b>${fmtVnd(ag.minIn[i])}</b>, ${ag.minIn[i] < 0 ? 'thiếu' : 'thấp hơn ngưỡng'} ${fmtVnd(Math.abs(Math.min(ag.minIn[i], 0)) || thr - ag.minIn[i])}. Tiền thu trong kỳ ${fmtVnd(inn)}; khoản chi lớn nhất: ${top || '–'}.</div>`);
  }
  const cmp = Object.values(HG.SCENARIOS).map(s => ({ s, mb: R.mb[s.id], end: R.scen[s.id].sim.bal[90], arIn: sum(R.scen[s.id].ev.filter(e => e.d < 91 && e.a > 0), e => e.a) }));
  return `<div class="card"><h2>Dự báo dòng tiền</h2>
   <div class="tabs2 noprint"><span class="note" style="align-self:center">Kịch bản:</span>${scBtns}<span style="width:20px"></span><span class="note" style="align-self:center">Kỳ:</span>${vBtns}<span style="flex:1"></span><button data-act="exp_cash">Xuất Excel</button><button onclick="window.print()">In / PDF</button></div>
   <p class="sub">Nguyên tắc: <b>thu</b> = công nợ phải thu hiện có × xác suất thu × thời điểm dự kiến (theo tuổi nợ &amp; lịch sử trả tiền từng khách) + bán hàng mới; <b>chi</b> = phải trả NCC theo hạn + mua hàng mới + chi phí cố định + vay. T11* = phần còn lại của tháng hiện tại. Đơn vị: triệu đồng.</p>
   ${UI.view === 'week' ? lineChart({ labels: ag.labels.map((l, i) => l + ' (' + dayLabel(i * 7) + ')'), tips: ag.labels.map((l, i) => 'Cuối ' + l), series: [{ name: 'Số dư cuối tuần', color: '#1d4ed8', vals: Array.from(ag.close) }, { name: 'Số dư thấp nhất trong tuần', color: '#e8890c', vals: Array.from(ag.minIn), dash: 1, width: 1.6 }], thr, maxX: 13 }) : lineChart({ labels: ag.labels, series: [{ name: 'Số dư cuối tháng', color: '#1d4ed8', vals: Array.from(ag.close) }, { name: 'Số dư thấp nhất trong tháng', color: '#e8890c', vals: Array.from(ag.minIn), dash: 1, width: 1.6 }], thr, maxX: 12 })}
   ${barChart({ labels: ag.labels, ins: Array.from(ag.inflow), outs: Array.from(ag.outflow), h: 210 })}
   <div class="tw nomax" style="margin-top:10px"><table class="sticky1"><thead><tr><th>Khoản mục</th>${ag.labels.map(l => `<th class="n">${l}</th>`).join('')}<th class="n">Cộng</th></tr></thead><tbody>${rows}</tbody></table></div></div>
  <div class="grid2"><div class="card"><h2>Điểm hụt &amp; nguyên nhân (${HG.SCENARIOS[sc].name})</h2><p class="sub">Ngưỡng an toàn: ${fmtVnd(thr)} ${M.S.minCash != null && M.S.minCash !== '' ? '(nhập tay)' : '(tự tính = 2 tuần chi phí cố định)'}.</p>${causes.join('') || '<div class="alert good">Không có kỳ nào xuống dưới ngưỡng an toàn.</div>'}
   ${causes.length ? '<p><button class="p noprint" data-act="tab" data-v="plan">Xem phương án xử lý → Đề xuất tháng</button></p>' : ''}</div>
  <div class="card"><h2>So sánh 3 kịch bản (13 tuần)</h2>${tbl('scen', [{ h: 'Kịch bản', f: x => `<b>${x.s.name}</b><div class="note">Khách trả chậm ${x.s.dAdd >= 0 ? '+' : ''}${x.s.dAdd} ngày · xác suất thu ×${x.s.pMul} · doanh số ×${x.s.salesMul}</div>` }, { h: 'Tổng thu (tr)', c: 'n', f: x => fm(x.arIn) }, { h: 'Số dư thấp nhất (tr)', c: 'n', f: x => fm(x.mb.v), cls: x => x.mb.v < 0 ? 'cellbad' : x.mb.v < thr ? 'cellwarn' : '' }, { h: 'Ngày thấp nhất', f: x => fmtDate(S.asof + x.mb.d) }, { h: 'Số dư ngày 90 (tr)', c: 'n', f: x => fm(x.end) }], cmp, { nomax: 1 })}
   <p class="note">Lưu ý: dự báo là mô hình có giả định – cần đối chiếu thực tế mỗi tuần và cập nhật dữ liệu (xem quy trình ở tab Định hướng).</p></div></div>`;
};
