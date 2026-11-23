/* =====================================================================
 * APP – Đề xuất tháng (chấm điểm 2 phương án) & Định hướng 12 tháng
 * ===================================================================== */
const LP_LABELS = [
  ['collectUplift', 'L1 · Nâng xác suất thu nợ quá hạn thêm (điểm %)', 'num'], ['collectSuccess', 'L1 · Tỷ lệ khách phản hồi chiến dịch (%)', 'num'], ['collectCost', 'L1 · Chi phí thu hồi (% số thu được)', 'num'],
  ['discPct', 'L2 · Chiết khấu thanh toán sớm (%)', 'num'], ['discTake', 'L2 · Tỷ lệ khách chấp nhận (%)', 'num'],
  ['stretchSuccess', 'L3 · Tỷ lệ NCC đồng ý giãn (%)', 'num'], ['stretchCost', 'L3 · Chi phí giãn nợ (% số giãn)', 'num'],
  ['depositPct', 'L4 · Tỷ lệ đặt cọc đơn mới của khách rủi ro (%)', 'num'],
  ['factorPct', 'L5 · Tỷ lệ ứng vốn trên hóa đơn (%)', 'num'], ['factorRate', 'L5 · Lãi suất ứng vốn (%/năm)', 'num'], ['factorFee', 'L5 · Phí ứng vốn (%)', 'num'], ['factorLimit', 'L5 · Hạn mức ứng vốn (VND; trống = 50% hóa đơn đủ điều kiện)', 'money'],
  ['cutBuy', 'L7 · Giảm mua dự trữ 75 ngày tới (%)', 'num'],
  ['restructureDays', 'L9 · Số ngày gia hạn nợ gốc', 'num'], ['restructureFee', 'L9 · Phí gia hạn (%)', 'num'],
  ['loanRate', 'L10 · Lãi vay VLĐ (%/năm)', 'num'], ['loanDays', 'L10 · Thời hạn vay (ngày)', 'num'], ['loanFee', 'L10 · Phí vay (%)', 'num'], ['loanAmt', 'L10 · Số tiền vay (VND; trống = tự tính)', 'money']
];
const mLabel = (a) => 'Tháng ' + ymd(a).m + '/' + ymd(a).y;

function pickCard(x, i) {
  const S = M.S, w = S.w;
  const tg = x.targets.slice(0, 8).map(t => `${esc(t.name)} <span class="note">(${fm(t.amt)} tr)</span>`).join(' · ');
  return `<div class="pick ${i ? 'p2' : ''}"><div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap">
   <div style="flex:1;min-width:300px"><h2><span class="rk">PHƯƠNG ÁN ${i + 1}</span>${esc(x.name)} <span class="note">(${x.id} · ${HG.LEVER_TYPES[x.type]})</span></h2>
    <div class="scorebar"><div>Tác động<b style="color:${scoreCol(x.sImpact)}">${x.sImpact}</b><span class="note">trọng số ${w.impact}%</span></div><div>Tốc độ ra tiền<b style="color:${scoreCol(x.sSpeed)}">${x.sSpeed}</b><span class="note">~${x.ttc} ngày · ${w.speed}%</span></div><div>Khả thi<b style="color:${scoreCol(x.sFeas)}">${x.sFeas}</b><span class="note">${x.feas}/5 · ${w.feas}%</span></div><div>Chi phí &amp; rủi ro<b style="color:${scoreCol(x.sRisk)}">${x.sRisk}</b><span class="note">rủi ro ${x.risk}/5 · ${w.risk}%</span></div></div></div>
   <div class="hs" style="flex:none"><div class="big" style="width:104px;height:104px;background:${scoreCol(x.score)}"><b style="font-size:32px">${x.score}</b><span>/ 100</span></div></div></div>
   <div class="kpis" style="margin:8px 0">${kpi('Tác động dòng tiền quy đổi', fm(x.impact) + ' tr', 'TB cải thiện số dư 60 ngày + cải thiện điểm thấp nhất')}${kpi('Cải thiện số dư thấp nhất', fm(x.dmin) + ' tr', 'Trong 13 tuần tới')}${kpi('Cải thiện số dư sau 30 / 60 ngày', fm(x.d30) + ' / ' + fm(x.d60) + ' tr', '')}${kpi('Chi phí ròng', fm(x.cost) + ' tr', x.cost && x.impact ? 'bằng ' + pct(x.cost / x.impact) + ' tác động' : 'gần như không tốn chi phí', x.cost > 0.05 * x.impact ? 'warn' : 'good')}</div>
   ${x.annual != null ? `<div class="alert info">Chi phí vốn quy năm của chiết khấu ${S.lp.discPct}% để khách trả sớm ~30 ngày ≈ <b>${f1(x.annual * 100)}%/năm</b> – ${x.annual * 100 > S.lp.loanRate ? '<b>cao hơn</b> lãi vay ngắn hạn, chỉ nên dùng khi thật sự thiếu tiền.' : 'thấp hơn lãi vay ngắn hạn, hợp lý để áp dụng.'}</div>` : ''}
   <h3>Cách làm cụ thể (SOP)</h3><ol class="steps">${x.actions.map(a => `<li>${esc(a)}</li>`).join('')}</ol>
   <h3>Đối tượng ưu tiên</h3><p>${tg || '–'}</p><p class="note"><b>KPI theo dõi:</b> ${esc(x.kpi)}</p></div>`;
}

VIEWS.plan = () => {
  if (!R) return emptyState();
  const S = M.S, L = R.lev, Hh = R.health, mb = R.mb.base;
  const labels = []; for (let d = 0; d < 91; d++) labels.push(dayLabel(d));
  const ser = [{ name: 'Hiện tại (Cơ bản)', color: '#1d4ed8', vals: Array.from(R.scen.base.sim.bal.slice(0, 91)) }];
  if (L.top.length) ser.push({ name: 'Áp dụng 2 phương án đề xuất', color: '#0f766e', vals: Array.from(R.simRec.bal.slice(0, 91)), width: 2.8 });
  let simSel = '';
  if (UI.sel.size) {
    const ev = HG.applyLevers(M, [...UI.sel], 'base'), sim = HG.simulate(ev, S);
    ser.push({ name: 'Tự chọn: ' + [...UI.sel].join('+'), color: '#7c3aed', vals: Array.from(sim.bal.slice(0, 91)), dash: 1 });
    const m2 = HG.minBal(sim, 91);
    simSel = `<div class="alert info">Giả lập <b>${[...UI.sel].join(' + ')}</b>: số dư thấp nhất 13 tuần = <b>${fmtVnd(m2.v)}</b> (ngày ${fmtDate(S.asof + m2.d)}), ${m2.v >= R.thr ? 'đạt ngưỡng an toàn.' : 'vẫn thấp hơn ngưỡng ' + fmtVnd(R.thr) + ' khoảng ' + fmtVnd(R.thr - m2.v) + '.'}</div>`;
  }
  const bk = R.backup, bk9 = L.backups.find(x => x.id === 'L9');
  const snap = M.snaps.find(s => s.key === HG.monthKey(S.asof));
  const rank = L.results;
  return `<div class="card" style="border-color:#1d4ed8"><h2>${mLabel(S.asof)} – Đề xuất 2 phương án nâng cao dòng tiền</h2>
   <p class="sub">Chương trình mô phỏng ${L.results.length} phương án trên đúng dữ liệu công ty, chấm điểm 0–100 theo 4 tiêu chí (trọng số chỉnh được bên dưới), chọn 2 phương án vận hành tốt nhất (ưu tiên khác loại để phân tán rủi ro). Vay/đảo nợ chỉ là dự phòng cho phần còn thiếu.</p>
   <div class="kpis" style="margin:0">${kpi('Điểm sức khỏe dòng tiền', `<span style="color:${Hh.color}">${Hh.score}/100</span>`, Hh.grade)}${kpi('Số dư thấp nhất 13 tuần', fT(mb.v) + ' tỷ', 'Ngày ' + fmtDate(S.asof + mb.d), mb.v < 0 ? 'bad' : mb.v < R.thr ? 'warn' : 'good')}${kpi('Khoản cần bù để đạt ngưỡng an toàn', fT(L.gap) + ' tỷ', 'Ngưỡng ' + fT(R.thr) + ' tỷ', L.gap > 0 ? 'bad' : 'good')}${kpi('Sau 2 phương án đề xuất', fT(R.mbRec.v) + ' tỷ', R.residual > 0 ? 'Còn thiếu ' + fT(R.residual) + ' tỷ' : 'Đạt ngưỡng an toàn', R.residual > 0 ? 'warn' : 'good')}</div></div>
  ${L.top.map((x, i) => pickCard(x, i)).join('') || '<div class="card">Chưa có phương án phù hợp với dữ liệu hiện tại.</div>'}
  <div class="card"><h2>Hiệu quả khi áp dụng đồng thời 2 phương án</h2>
   ${lineChart({ labels, series: ser, thr: R.thr, title: 'So sánh số dư' })}
   ${simSel}
   ${R.residual > 0 ? `<div class="alert bad"><b>Vẫn còn thiếu ${fmtVnd(R.residual)}</b> so với ngưỡng an toàn sau 2 phương án trên. Phương án dự phòng (chỉ dùng sau khi đã thực hiện thu/chi ở trên):
      <ul style="margin:4px 0 0 18px"><li><b>Vay VLĐ ngắn hạn bù hụt</b>: khoảng ${fmtVnd(R.loanNeed)} / ${S.lp.loanDays} ngày, lãi ~${S.lp.loanRate}%/năm → chi phí ước tính ${bk ? fmtVnd(bk.cost) : '–'} (${bk ? 'điểm ' + bk.score : ''}).</li>
      ${bk9 ? `<li><b>Gia hạn/đảo nợ gốc vay đến hạn</b> (L9): cải thiện số dư thấp nhất ${fmtVnd(bk9.dmin)}, chi phí ${fmtVnd(bk9.cost)}. Cần làm việc với ngân hàng sớm ≥30 ngày.</li>` : ''}
      <li>Xem xét kết hợp thêm phương án hạng 3–4 trong bảng xếp hạng dưới đây (tick để giả lập).</li></ul></div>` : '<div class="alert good">Hai phương án đề xuất đủ đưa số dư thấp nhất 13 tuần về trên ngưỡng an toàn.</div>'}</div>
  <div class="card"><h2>Bảng xếp hạng toàn bộ phương án</h2><p class="sub">Tick để giả lập thêm tổ hợp phương án tùy chọn (đường tím trên biểu đồ). Tác động tính trong kịch bản Cơ bản.</p>
   ${tbl('rank', [
    { h: '', f: x => `<input type="checkbox" data-act="selpa" data-v="${x.id}" ${UI.sel.has(x.id) ? 'checked' : ''}>`, c: 'c' },
    { h: 'Mã', f: x => x.id }, { h: 'Phương án', f: x => `${esc(x.name)}${L.top.some(t => t.id === x.id) ? ' <span class="pill" style="background:#1d4ed8">ĐỀ XUẤT</span>' : ''}${x.backup ? ' <span class="pill" style="background:#64748b">DỰ PHÒNG</span>' : ''}`, cls: 'nw' },
    { h: 'Điểm', c: 'c', f: x => `<b style="color:${scoreCol(x.score)};font-size:15px">${x.score}</b>`, v: x => x.score },
    { h: 'Tác động', c: 'n', t: 'Điểm tác động 0–100', f: x => x.sImpact, v: x => x.sImpact }, { h: 'Tốc độ', c: 'n', f: x => x.sSpeed, v: x => x.sSpeed }, { h: 'Khả thi', c: 'n', f: x => x.sFeas, v: x => x.sFeas }, { h: 'CP & rủi ro', c: 'n', f: x => x.sRisk, v: x => x.sRisk },
    { h: 'Tác động (tr)', c: 'n', f: x => fm(x.impact), v: x => x.impact }, { h: 'Cải thiện số dư thấp nhất (tr)', c: 'n', f: x => fm(x.dmin), v: x => x.dmin }, { h: 'Chi phí (tr)', c: 'n', f: x => fm(x.cost), v: x => x.cost }, { h: 'Ra tiền sau (ngày)', c: 'n', f: x => x.ttc, v: x => x.ttc }], rank, { sort: { k: 3, dir: 'desc' }, nomax: 1 })}
   ${L.na.length ? `<p class="note">Không áp dụng được với dữ liệu hiện tại: ${L.na.map(x => x.id + ' ' + x.name).join('; ')}.</p>` : ''}
   <details style="margin-top:10px"><summary><b>Chỉnh trọng số chấm điểm &amp; tham số các phương án</b></summary>
    <div class="inp" style="margin-top:10px">${[['impact', 'Trọng số: Tác động dòng tiền'], ['speed', 'Trọng số: Tốc độ ra tiền'], ['feas', 'Trọng số: Tính khả thi'], ['risk', 'Trọng số: Chi phí & rủi ro']].map(([k, l]) => `<label>${l} (%)${inp('S.w.' + k, 'num')}</label>`).join('')}</div>
    <div class="inp" style="margin-top:10px">${LP_LABELS.map(([k, l, t]) => `<label>${l}${inp('S.lp.' + k, t)}</label>`).join('')}</div></details></div>
  <div class="card"><h2>Chốt đề xuất &amp; theo dõi kết quả</h2><p class="sub">Mỗi tháng sau khi cập nhật dữ liệu: bấm “Chốt” để lưu điểm sức khỏe và 2 phương án đã chọn. Tháng sau nhập số tiền thực tế cải thiện được để đánh giá hiệu quả.</p>
   <p><button class="p" data-act="snap">${snap ? 'Cập nhật bản chốt ' + mLabel(S.asof) : 'Chốt đề xuất ' + mLabel(S.asof)}</button> <span class="note">Dữ liệu lưu trên trình duyệt này – nhớ xuất file sao lưu ở tab Dữ liệu.</span></p>
   ${M.snaps.length ? tbl('snaps', [{ h: 'Tháng', f: s => s.key }, { h: 'Điểm', c: 'c', f: s => `<b style="color:${scoreCol(s.score)}">${s.score}</b>` }, { h: 'Phải thu (tỷ)', c: 'n', f: s => fT(s.ar) }, { h: 'QH>60', c: 'n', f: s => pct(s.over60Pct) }, { h: 'DSO', c: 'n', f: s => s.dso != null ? Math.round(s.dso) : '–' }, { h: 'Số dư thấp nhất (tỷ)', c: 'n', f: s => fT(s.minBal) }, { h: 'Phương án đã chọn', f: s => s.picks.map(p => esc(p.id + ' ' + p.name) + ' (' + p.score + ')').join('<br>') }, { h: 'Kỳ vọng (tr)', c: 'n', f: s => fm(sum(s.picks, p => p.impact)) }, { h: 'Thực tế đạt (VND)', f: s => inp('snaps.' + M.snaps.indexOf(s) + '.actual', 'money') }, { h: 'Ghi chú / bài học', f: s => inp('snaps.' + M.snaps.indexOf(s) + '.note', 'text') }], M.snaps.slice().sort((a, b) => a.key < b.key ? 1 : -1), { nomax: 1 }) : ''}</div>`;
};

/* ---------------------------------------------------------------- ĐỊNH HƯỚNG 12 THÁNG */
VIEWS.strat = () => {
  if (!R) return emptyState();
  const A = R.arA, P = R.apA, S = M.S, dso = R.dso, tgt = S.targetDSO;
  const daily = S.monthlySales * 12 / 365;
  const segs = Object.keys(HG.SEGS).map(k => {
    const cc = A.cust.filter(c => c.seg === k), keys = new Set(cc.map(c => c.key));
    const inv = A.inv.filter(x => keys.has(keyOf(x.cust)));
    let pot = sum(inv.filter(x => x.b > 0), x => x.amt * Math.max(0, 0.9 - S.bucketP[x.b]));
    if (k === 'S4') pot = sum(inv.filter(x => x.b === 0 && x.over >= -60), x => x.amt) * 0.35;
    return { k, n: cc.length, tot: sum(cc, c => c.total), ov: sum(cc, c => c.overdue), pot, top: cc.slice(0, 3).map(c => c.cust).join(', ') };
  }).sort((a, b) => b.pot - a.pot);
  const rows = [
    ['DSO – số ngày thu tiền', dso != null ? Math.round(dso) : null, tgt, 'ngày', true],
    ['Nợ quá hạn >60 ngày / phải thu', A.over60Pct * 100, S.targetOver60, '%', true],
    ['Top 5 khách / phải thu', A.top5 * 100, S.targetTop5, '%', true]];
  const freed = dso != null && dso > tgt ? (dso - tgt) * daily : 0;
  const rel60 = Math.max(0, A.over60 - A.total * S.targetOver60 / 100);
  const q = [1, 2, 3, 4].map(i => ({ i, dso: dso != null ? (dso > tgt ? dso + (tgt - dso) * i / 4 : dso) : null, o60: A.over60Pct * 100 + (S.targetOver60 - A.over60Pct * 100) * i / 4, t5: A.top5 * 100 + (S.targetTop5 - A.top5 * 100) * i / 4 }));
  const QACT = ['Dọn nền tảng: đối chiếu 100% khách quá hạn >30 ngày, ban hành chính sách tín dụng (hạn mức – hạn nợ – điều kiện ngừng giao), xử lý nhóm “Thu hồi trọng điểm”, kích hoạt nhắc lịch T-3.',
    'Tối ưu thu & chi: thưởng thanh toán sớm cho khách lớn tốt, đàm phán giãn hạn NCC theo nhóm, thanh lý tồn chậm, chuẩn hóa điều khoản “lãi phạt chậm trả” trong hợp đồng mới.',
    'Tối ưu cấu trúc vốn: ứng vốn theo hóa đơn/bao thanh toán có chọn lọc, cân đối vay ngắn–dài hạn (vốn lưu động thường xuyên không nên vay đảo ngắn hạn), bảo hiểm tín dụng cho khách lớn.',
    'Bền vững: chấm điểm tín dụng khách mới trước khi cấp hạn mức, gắn KPI thu tiền/DSO vào thưởng kinh doanh, rà soát danh mục khách – ngừng nhóm kém hiệu quả.'];
  const snaps = M.snaps.slice().sort((a, b) => a.key > b.key ? 1 : -1);
  return `<div class="card"><h2>Mục tiêu dài hạn & khoảng cách hiện tại</h2><p class="sub">Mục tiêu chỉnh ở tab Dữ liệu &amp; giả định. “Tiền giải phóng” là số tiền mặt được giải phóng nếu đạt mục tiêu (không tăng vay).</p>
   ${tbl('goal', [{ h: 'Chỉ tiêu', f: r => r[0] }, { h: 'Hiện tại', c: 'n', f: r => r[1] != null ? f1(r[1]) + ' ' + r[3] : '–' }, { h: 'Mục tiêu 12 tháng', c: 'n', f: r => r[2] + ' ' + r[3] }, { h: 'Khoảng cách', c: 'n', f: r => r[1] != null ? f1(r[1] - r[2]) + ' ' + r[3] : '–', cls: r => r[1] != null && r[1] > r[2] ? 'neg' : '' }, { h: 'Trạng thái', c: 'c', f: r => r[1] == null ? '–' : r[1] <= r[2] ? pill('Đạt', '#16803c') : pill('Chưa đạt', '#c62828') }], rows, { nomax: 1 })}
   <div class="kpis" style="margin-top:12px">${kpi('Mỗi 1 ngày DSO', fm(daily) + ' tr', 'tiền mặt bị chôn trong phải thu')}${kpi('Tiền giải phóng nếu đạt DSO mục tiêu', fT(freed) + ' tỷ', dso != null ? 'từ ' + Math.round(dso) + ' xuống ' + tgt + ' ngày' : 'cần nhập doanh thu tháng', freed > 0 ? 'good' : '')}${kpi('Nợ >60 ngày cần thu để đạt mục tiêu', fT(rel60) + ' tỷ', 'mục tiêu ≤ ' + S.targetOver60 + '% dư nợ')}${kpi('Chu kỳ chuyển đổi tiền (CCC)', R.dso != null && R.dpo != null ? Math.round(R.dso + (R.dio || 0) - R.dpo) + ' ngày' : '–', 'DSO ' + (dso != null ? Math.round(dso) : '–') + ' + DIO ' + (R.dio != null ? Math.round(R.dio) : '–') + ' − DPO ' + (R.dpo != null ? Math.round(R.dpo) : '–'))}</div></div>
  <div class="card"><h2>Nên tập trung vào nhóm công nợ nào?</h2><p class="sub">Xếp theo tiềm năng kéo thêm tiền về (cao → thấp). Nhóm đầu bảng là nơi mỗi giờ công của lãnh đạo/kinh doanh tạo ra nhiều tiền nhất.</p>
   ${tbl('focus', [{ h: 'Ưu tiên', c: 'c', f: (r) => '#' + (segs.indexOf(r) + 1) }, { h: 'Nhóm', f: r => `<b style="color:${HG.SEGS[r.k].color}">${HG.SEGS[r.k].name}</b><div class="note">${esc(r.top)}</div>`, cls: 'nw' }, { h: 'Khách', c: 'n', f: r => r.n }, { h: 'Dư nợ (tr)', c: 'n', f: r => fm(r.tot) }, { h: 'Quá hạn (tr)', c: 'n', f: r => fm(r.ov) }, { h: 'Tiềm năng (tr)', c: 'n', f: r => '<b>' + fm(r.pot) + '</b>' }, { h: 'Chính sách áp dụng', f: r => HG.SEGS[r.k].policy }, { h: 'KPI nhóm', f: r => HG.SEGS[r.k].kpi }], segs, { nomax: 1 })}
   <h3>Phía phải trả: nhóm NCC cần chủ động</h3>
   ${tbl('apfocus', [{ h: 'Nhóm NCC', f: g => esc(g.grp) }, { h: 'Dư nợ (tr)', c: 'n', f: g => fm(g.total) }, { h: 'Đến hạn ≤30 ngày (tr)', c: 'n', f: g => fm(g.due30) }, { h: 'Khuyến nghị', f: g => { const st = (S.apGroups.find(x => keyOf(x.name) === keyOf(g.grp)) || { stretch: 0 }).stretch; return st ? `Đàm phán giãn thêm ${st} ngày; đổi lấy đặt hàng ổn định/lịch trả cam kết.` : 'Giữ đúng hạn để duy trì quan hệ & giá tốt.'; } }], P.grp, { nomax: 1 })}</div>
  <div class="card"><h2>Lộ trình 4 quý (tự sinh từ khoảng cách hiện tại)</h2>
   ${tbl('road', [{ h: 'Quý', f: r => 'Q' + r.i + ' (đến ' + mLabel(dn(ymd(S.asof).y, ymd(S.asof).m + r.i * 3, 1) - 1) + ')', cls: 'nw' }, { h: 'DSO mục tiêu', c: 'n', f: r => r.dso != null ? Math.round(r.dso) : '–' }, { h: 'Nợ >60 ngày', c: 'n', f: r => f1(r.o60) + '%' }, { h: 'Top 5 khách', c: 'n', f: r => f1(r.t5) + '%' }, { h: 'Trọng tâm hành động', f: r => QACT[r.i - 1] }], q, { nomax: 1 })}</div>
  ${snaps.length >= 2 ? `<div class="card"><h2>Xu hướng theo tháng (từ các bản chốt)</h2>${lineChart({ labels: snaps.map(s => s.key), series: [{ name: 'Điểm sức khỏe dòng tiền', color: '#0f766e', vals: snaps.map(s => s.score) }], title: 'Xu hướng', maxX: 12, yDiv: 1, unit: 'điểm (0–100)', fmt: v => String(v) })}</div>` : ''}
  <div class="card"><h2>Quy trình quản trị hằng tháng (SOP 5 bước – 2 giờ/tháng)</h2><ol class="steps">
   <li><b>Ngày 1–2:</b> Kế toán xuất 3 báo cáo từ phần mềm kế toán: (1) công nợ phải thu chi tiết theo hóa đơn, (2) công nợ phải trả chi tiết, (3) số dư tiền ngân hàng + quỹ. Nạp vào chương trình (tab Dữ liệu), chỉnh ngày chốt.</li>
   <li><b>Ngày 2:</b> Rà soát cảnh báo dữ liệu (thiếu hạn thanh toán, khách chưa phân phụ trách), cập nhật doanh thu dự kiến, lịch chi cố định, lịch trả vay.</li>
   <li><b>Ngày 3:</b> Xem tab Dòng tiền để thấy điểm hụt; xem tab Đề xuất tháng để nhận 2 phương án + điểm; chỉnh tham số nếu thực tế khác giả định (ví dụ tỷ lệ NCC đồng ý giãn).</li>
   <li><b>Ngày 4:</b> Họp điều hành (Giám đốc, Phó GĐ, KT trưởng, Trưởng phòng KD): chốt 2 phương án, giao người – hạn – chỉ tiêu tiền. Bấm “Chốt đề xuất tháng”.</li>
   <li><b>Hằng tuần (15 phút, thứ Hai):</b> đối chiếu tiền thực thu/thực chi với dự báo tuần; cập nhật dữ liệu nếu lệch &gt;10%; cuối tháng nhập “kết quả thực tế” của phương án để hiệu chỉnh mô hình.</li></ol></div>`;
};
