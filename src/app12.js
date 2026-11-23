/* =====================================================================
 * APP – ĐÁNH GIÁ KẾ HOẠCH ĐỊNH KỲ: so sánh kế hoạch KT, kế hoạch hệ thống và thực hiện theo từng tuần;
 * tự lưu bản đánh giá mỗi lần dữ liệu cập nhật; gợi ý tỷ lệ hiệu chỉnh cho tháng sau.
 * ===================================================================== */
const HIST_RATIO = { labels: ['T06', 'T07', 'T08', 'T09', 'T10'], kh: [14005, 15064, 16618, 15338, 15550], tt: [15695, 15870, 14788, 13610, 14275] };   /* triệu đồng – file KH/TH thu T6–T10 */
function ktEvalCalc(K) {
  if (!K) return null;
  const P = K.plan, A = K.act, W = P.weeks, items = P.items, occ = {};
  items.forEach(it => { occ[it.label] = (occ[it.label] || 0) + 1; it._o = occ[it.label]; });
  const find = re => items.find(it => re.test(deacc(it.label)));
  const rowThuKH = find(/^thu cong no khach hang/), rowNcc = find(/^chi tien thanh toan ncc/), rowThu = find(/^dong thu/), rowChi = find(/^dong chi/);
  const thuK = ['thu_kh', 'thu_vay', 'thu_khac'], act = (k, w) => (A[k] ? A[k][w] : 0);
  const aThuKH = w => act('thu_kh', w), aNcc = w => act('ncc', w), aThu = w => thuK.reduce((s, k) => s + act(k, w), 0), aChi = w => Object.keys(A).filter(k => !thuK.includes(k)).reduce((s, k) => s + act(k, w), 0);
  const lines = [['Thu công nợ khách hàng', rowThuKH, aThuKH, 3], ['Chi thanh toán NCC', rowNcc, aNcc, 3], ['Tổng thu', rowThu, aThu, 2], ['Tổng chi', rowChi, aChi, 2]];
  const sysOf = (it, w) => (K.sys && it && K.sys[it.label + '|' + it._o]) ? K.sys[it.label + '|' + it._o][w] : null;
  const acc = (a, p) => p == null ? null : Math.max(0, 1 - Math.abs(a - p) / Math.max(a, p, 1));
  const res = []; let sk = 0, ss = 0, sw = 0;
  W.forEach((w, wi) => {
    if (!(K.last >= dn(P.year, P.month, w.d2))) return;               /* chỉ đánh giá tuần đã kết thúc */
    lines.forEach(([name, it, f, wt]) => { if (!it) return; const a = f(wi), pk = it.plan[wi], ps = sysOf(it, wi); const ak = acc(a, pk), as = acc(a, ps); res.push({ week: w.label, name, a, pk, ps, ak, as, wt }); sk += (ak || 0) * wt; if (as != null) ss += as * wt; sw += wt; });
  });
  return { rows: res, scoreKT: sw ? Math.round(100 * sk / sw) : null, scoreSys: sw && K.sys ? Math.round(100 * ss / sw) : null, weeks: new Set(res.map(r => r.week)).size };
}
function ktEvalSave() {   /* lưu bản đánh giá mỗi khi dữ liệu mới (theo ngày cập nhật) */
  if (!M.kt) return; const e = ktEvalCalc(M.kt); if (!e || e.scoreKT == null) return;
  M.evals = M.evals || []; const key = M.kt.plan.year + '-' + M.kt.plan.month + '@' + M.kt.last;
  if (!M.evals.some(x => x.key === key)) { M.evals.push({ key, month: M.kt.plan.month + '/' + M.kt.plan.year, last: M.kt.last, weeks: e.weeks, scoreKT: e.scoreKT, scoreSys: e.scoreSys }); save(); }
}
NAVG[2][1].push(['evalkh', '📏', 'Đánh giá kế hoạch định kỳ']); TITLE.evalkh = 'Đánh giá chất lượng kế hoạch dòng tiền (định kỳ)'; TAB_ORDER.push('evalkh');
VIEWS.evalkh = () => {
  const K = M.kt, hr = HIST_RATIO; if (K) ktEvalSave();
  const e = ktEvalCalc(K), rat = hr.tt.map((t, i) => t / hr.kh[i]), r3 = (hr.tt.slice(2).reduce((s, x) => s + x, 0) / hr.kh.slice(2).reduce((s, x) => s + x, 0));
  const cur = K && K.plan.items.find(it => /^thu cong no khach hang/.test(deacc(it.label)));
  const best = e && e.scoreSys != null ? (e.scoreSys >= e.scoreKT ? 'Kế hoạch hệ thống' : 'Kế hoạch của KT') : null;
  const scoreBadge = s => s == null ? '–' : `<b style="font-size:22px;color:${scoreCol(s)}">${s}</b>/100`;
  return `<div class="card" style="border-color:#1d4ed8"><h2>Điểm chất lượng kế hoạch tháng này</h2><p class="sub">Điểm độ chính xác = 100 × (1 − |thực hiện − kế hoạch| / max(thực hiện, kế hoạch)), trung bình có trọng số cho thu khách, chi NCC (trọng số 3) và tổng thu, tổng chi (trọng số 2); chỉ tính tuần đã kết thúc. Mỗi lần dữ liệu được cập nhật, app tự đánh giá lại và lưu vết.</p>
   ${e ? `<div class="kpis"><div class="kpi"><div class="l">Kế hoạch của kế toán</div><div class="v">${scoreBadge(e.scoreKT)}</div><div class="s">${e.weeks} tuần đã kết thúc</div></div><div class="kpi good"><div class="l">Kế hoạch hệ thống (lịch sử)</div><div class="v">${scoreBadge(e.scoreSys)}</div><div class="s">${best ? 'Sát thực tế hơn: ' + best : ''}</div></div><div class="kpi"><div class="l">Thực hiện đến ngày</div><div class="v">${K.last ? fmtDate(K.last) : '–'}</div><div class="s">tuần chưa kết thúc chưa tính</div></div></div>
   ${tbl('evk', [{ h: 'Tuần', f: r => esc(r.week) }, { h: 'Khoản mục', f: r => esc(r.name) }, { h: 'Thực hiện (tr)', c: 'n', f: r => fm(r.a) }, { h: 'KH của KT (tr)', c: 'n', f: r => fm(r.pk) }, { h: 'Độ chính xác KT', c: 'n', f: r => pct(r.ak), cls: r => r.ak < 0.6 ? 'cellbad' : '' }, { h: 'KH hệ thống (tr)', c: 'n', f: r => r.ps == null ? '' : fm(r.ps) }, { h: 'Độ chính xác HT', c: 'n', f: r => r.as == null ? '' : pct(r.as), cls: r => r.as != null && r.as < 0.6 ? 'cellbad' : '' }], e.rows, { nomax: 1 })}` : '<div class="alert info">Chưa có tuần nào kết thúc kèm kế hoạch để đánh giá. Hãy nạp file kế hoạch của kế toán và sổ ngân hàng/quỹ.</div>'}</div>
  <div class="grid2"><div class="card"><h2>Tỷ lệ thực thu / kế hoạch thu (lịch sử → hiệu chỉnh tháng sau)</h2>${tbl('evr', [{ h: 'Tháng', f: (r, i) => r[0] }, { h: 'Kế hoạch (tr)', c: 'n', f: r => ff(r[1]) }, { h: 'Thực thu (tr)', c: 'n', f: r => ff(r[2]) }, { h: 'Thực/KH', c: 'n', f: r => `<b>${pct(r[3])}</b>`, cls: r => r[3] < 0.95 ? 'cellwarn' : '' }], hr.labels.map((l, i) => [l, hr.kh[i], hr.tt[i], rat[i]]), { nomax: 1 })}
   <div class="alert info">Tỷ lệ 3 tháng gần nhất = <b>${pct(r3)}</b> → khi kế toán lập kế hoạch thu tháng sau, nên nhân kế hoạch theo hạn thanh toán với hệ số này (ví dụ KH 17,5 tỷ → ${(17.5 * r3).toFixed(1)} tỷ). Cuối mỗi tháng thêm số liệu mới vào bảng để hệ số được cập nhật.</div></div>
  <div class="card"><h2>Lịch sử các lần đánh giá</h2>${(M.evals || []).length ? tbl('evh', [{ h: 'Tháng', f: x => x.month }, { h: 'Đến ngày', f: x => fmtDate(x.last) }, { h: 'Số tuần', c: 'n', f: x => x.weeks }, { h: 'Điểm KT', c: 'n', f: x => x.scoreKT }, { h: 'Điểm hệ thống', c: 'n', f: x => x.scoreSys == null ? '' : x.scoreSys }], M.evals.slice().reverse(), { nomax: 1 }) : '<p class="note">Chưa có bản đánh giá nào được lưu.</p>'}<p class="note">Lịch đánh giá: tự động mỗi lần app đọc dữ liệu mới (khuyến nghị cập nhật hằng ngày); chốt điểm tháng vào ngày làm việc cuối tháng.</p></div></div>`;
};
