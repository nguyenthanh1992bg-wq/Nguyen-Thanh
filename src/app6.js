/* =====================================================================
 * APP – THANH CÔNG CỤ (ribbon) & TRỢ LÝ AI TÀI CHÍNH (AI agent)
 * Chế độ 1: Trợ lý nội bộ – chạy offline, trả lời từ số liệu trong app.
 * Chế độ 2: Claude (tuỳ chọn) – cần API key, gửi dữ liệu TÓM TẮT (ẩn tên được) ra Internet.
 * ===================================================================== */
const RIBBON = [
  ['Dữ liệu', [['🔄', 'Đồng bộ', 'sync', 'Kết nối/đọc lại thư mục Excel'], ['📥', 'Nạp phải thu', 'imp:ar'], ['📥', 'Nạp phải trả', 'imp:hist'.replace('hist', 'ap')], ['📜', 'Lịch sử thu', 'imp:hist']]],
  ['Báo cáo', [['📊', 'Xuất dòng tiền', 'exp_cash'], ['👥', 'Xuất phải thu', 'exp_ar'], ['🗂', 'Xuất toàn bộ', 'exp_all'], ['🖨', 'In / PDF', 'print']]],
  ['Quản trị', [['📌', 'Chốt tháng', 'snap'], ['🎯', 'Đề xuất tháng', 'tab:plan'], ['🧭', 'Định hướng', 'tab:strat'], ['⚙️', 'Giả định', 'tab:data']]],
  ['Trợ lý', [['🤖', 'Trợ lý AI', 'ai'], ['💾', 'Sao lưu', 'backup']]]
];
function buildRibbon() {
  const r = $('#ribbon'); if (!r) return;
  r.innerHTML = RIBBON.map(([g, bs]) => `<div class="rg">${bs.map(([ic, l, a, t]) => { const [act, v] = a.split(':'); return `<button class="rb" title="${esc(t || l)}" data-act="${act === 'tab' ? 'tab' : act === 'imp' ? 'imp' : act}" ${v ? `data-v="${v}"` : ''}><span>${ic}</span>${l}</button>`; }).join('')}<div class="rl">${g}</div></div>`).join('') + `<div style="flex:1"></div><div class="rg" style="border:0"><span id="syncst2" class="note" style="max-width:280px"></span></div>`;
}
ACT.print = () => window.print();
ACT.ai = () => { document.body.classList.toggle('aiopen'); if (document.body.classList.contains('aiopen')) { AI.render(); const i = $('#aiin'); if (i) i.focus(); } };

/* ---------------------------------------------------------------- trợ lý nội bộ (agent công cụ) */
const AI = { msgs: [], key: localStorage.getItem('hg_ai_key') || '', use: localStorage.getItem('hg_ai_use') === '1', anon: localStorage.getItem('hg_ai_anon') !== '0', busy: false };
const tr = (rows, heads) => `<table style="font-size:12px"><thead><tr>${heads.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td class="${i ? 'n' : ''}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const TOOLS = [
  { re: /(hụt|thiếu tiền|hết tiền|điểm hụt|thanh khoản|dòng tiền)/i, run: () => {
    const mb = R.mb.base, S = M.S, wk = HG.aggregate(R.scen.base.ev, S, 'week', 13);
    return `Kịch bản Cơ bản: số dư thấp nhất <b>${fmtVnd(mb.v)}</b> vào ${fmtDate(S.asof + mb.d)} (ngưỡng an toàn ${fmtVnd(R.thr)}). ${R.firstNeg != null ? '<b class="neg">Hết tiền từ ' + fmtDate(S.asof + R.firstNeg) + '.</b>' : 'Chưa âm tiền trong 13 tuần.'} Kịch bản Thận trọng: ${fmtVnd(R.mb.cons.v)}.` +
      tr(Array.from(wk.close).map((v, i) => [wk.labels[i], fm(wk.inflow[i]), fm(-wk.outflow[i]), fm(v)]), ['Tuần', 'Thu (tr)', 'Chi (tr)', 'Cuối kỳ (tr)']) + 'Xem nguyên nhân từng kỳ ở tab <i>Dòng tiền</i>.'; } },
  { re: /(quá hạn|thu nợ|đòi nợ|khách nào|nợ xấu|công nợ phải thu|phải thu)/i, run: () => {
    const c = R.arA.cust.filter(x => x.overdue > 0).sort((a, b) => b.overdue - a.overdue).slice(0, 8);
    return `Phải thu ${fmtVnd(R.arA.total)}, quá hạn ${pct(R.arA.overduePct)}, quá hạn &gt;60 ngày ${pct(R.arA.over60Pct)}. 8 khách cần xử lý trước:` + tr(c.map(x => [esc(x.cust) + ' <i>(' + esc(x.owner || '–') + ')</i>', fm(x.overdue), x.maxOver, 'Hạng ' + x.grade]), ['Khách', 'Quá hạn (tr)', 'Ngày trễ', 'Hạng']) + 'Hành động: hạng B gọi trong 24h; C trưởng phòng làm việc + trả trước một phần; D chặn giao hàng.'; } },
  { re: /(phải trả|ncc|nhà cung cấp|trả nợ|trả tiền)/i, run: () => {
    const x = R.apA.inv.filter(i => i.left <= 14).sort((a, b) => a.left - b.left).slice(0, 8);
    return `Phải trả ${fmtVnd(R.apA.total)}; quá hạn ${fmtVnd(R.apA.overdue)}; đến hạn ≤14 ngày ${fmtVnd(R.apA.due14)}.` + tr(x.map(i => [esc(i.sup), fm(i.amt), i.left, i.stretch ? i.stretch + 'ng' : '–']), ['NCC', 'Số tiền (tr)', 'Còn (ngày)', 'Giãn được']); } },
  { re: /(đề xuất|phương án|nên làm|làm gì|giải pháp|cải thiện)/i, run: () => R.lev.top.map((x, i) => `<b>PA${i + 1}: ${esc(x.name)}</b> – điểm ${x.score}/100, tác động ${fmtVnd(x.impact)}, chi phí ${fmtVnd(x.cost)}, ra tiền sau ~${x.ttc} ngày.<br>• ${x.actions.slice(0, 2).map(esc).join('<br>• ')}`).join('<br><br>') + `<br><br>Sau 2 phương án: số dư thấp nhất ${fmtVnd(R.mbRec.v)}${R.residual > 0 ? ', còn thiếu ' + fmtVnd(R.residual) + ' → cần dự phòng (vay VLĐ/gia hạn nợ).' : ' – đạt ngưỡng an toàn.'}` },
  { re: /(điểm|sức khỏe|đánh giá)/i, run: () => `Điểm sức khỏe dòng tiền <b>${R.health.score}/100 – ${R.health.grade}</b>.` + tr(R.health.comps.map(c => [esc(c.name), c.s, c.w + '%']), ['Thành phần', 'Điểm', 'Trọng số']) },
  { re: /(dso|dpo|dio|chu kỳ|vòng quay)/i, run: () => `DSO ${R.dso != null ? Math.round(R.dso) : '–'} ngày (mục tiêu ${M.S.targetDSO}); DPO ${R.dpo != null ? Math.round(R.dpo) : '–'}; DIO ${R.dio != null ? Math.round(R.dio) : '–'}. ${R.dso != null && R.dso > M.S.targetDSO ? 'Đạt DSO mục tiêu sẽ giải phóng ~' + fmtVnd((R.dso - M.S.targetDSO) * M.S.monthlySales * 12 / 365) + ' tiền mặt.' : ''}` },
  { re: /(tháng sau|hằng tháng|theo tháng|12 tháng|6 tháng)/i, run: () => { const a = HG.aggregate(R.scen.base.ev, M.S, 'month', 6); return tr(Array.from(a.close).map((v, i) => [a.labels[i], fm(a.inflow[i]), fm(-a.outflow[i]), fm(v)]), ['Tháng', 'Thu (tr)', 'Chi (tr)', 'Cuối kỳ (tr)']); } }
];
function customerCard(q) {
  const c = R.arA.cust.find(x => q.includes(x.cust.toLowerCase())) || R.arA.cust.find(x => x.cust.toLowerCase().split(/\s+/).slice(-2).join(' ').length > 5 && q.includes(x.cust.toLowerCase().split(/\s+/).slice(-2).join(' ')));
  if (!c) return null;
  return `<b>${esc(c.cust)}</b> – hạng ${c.grade}, điểm ${c.score}/100, nhóm “${HG.SEGS[c.seg].name}”.<br>Dư nợ ${fmtVnd(c.total)} (${pct(c.share)} tổng), quá hạn ${fmtVnd(c.overdue)}, trễ tối đa ${Math.max(0, c.maxOver)} ngày${c.hist ? ', trễ TB lịch sử ' + f1(c.hist.delay) + ' ngày' : ''}.<br><i>Chính sách:</i> ${esc(HG.SEGS[c.seg].policy)}`;
}
function localAnswer(q) {
  if (!R) return 'Chưa có dữ liệu. Hãy kết nối thư mục Excel hoặc nạp file ở tab Dữ liệu.';
  const l = q.toLowerCase(), cc = customerCard(l); if (cc) return cc;
  const t = TOOLS.filter(x => x.re.test(l)); if (t.length) return t.slice(0, 2).map(x => x.run()).join('<hr>');
  return 'Tôi trả lời được về: <b>điểm hụt tiền</b>, <b>khách quá hạn / thu nợ</b>, <b>phải trả NCC</b>, <b>đề xuất 2 phương án</b>, <b>điểm sức khỏe</b>, <b>DSO/DPO</b>, <b>dòng tiền theo tháng</b>, hoặc gõ <b>tên khách hàng</b>. Muốn hỏi tự do (phân tích sâu, soạn thư nhắc nợ, kế hoạch…), bật chế độ <b>Claude</b> ở phần cài đặt phía dưới.';
}

/* ---------------------------------------------------------------- chế độ Claude (tuỳ chọn) */
function agentContext() {
  const A = R.arA, P = R.apA, S = M.S, map = {}, cnt = { KH: 0, NCC: 0 };
  const nm = (s, p) => AI.anon ? (map[s] || (map[s] = p + (++cnt[p]))) : s;
  const wk = HG.aggregate(R.scen.base.ev, S, 'week', 13), mo = HG.aggregate(R.scen.base.ev, S, 'month', 6);
  const ctx = { ngay_chot: fmtDate(S.asof), don_vi: 'VND', so_du_tien: S.cash0, nguong_an_toan: R.thr, diem_suc_khoe: R.health.score, thanh_phan_diem: R.health.comps.map(c => ({ ten: c.name, diem: c.s, ghi_chu: c.note })),
    phai_thu: { tong: A.total, qua_han: A.overdue, qua_han_tren_60: A.over60, dso: R.dso, top_khach: A.cust.slice(0, 15).map(c => ({ ten: nm(c.cust, 'KH'), du_no: Math.round(c.total), qua_han: Math.round(c.overdue), tre_max_ngay: c.maxOver, hang: c.grade, nhom: HG.SEGS[c.seg].name })) },
    phai_tra: { tong: P.total, qua_han: P.overdue, den_han_14: P.due14, den_han_30: P.due30, dpo: R.dpo, top_ncc: P.sup.slice(0, 10).map(s => ({ ten: nm(s.sup, 'NCC'), du_no: Math.round(s.total), den_han_30: Math.round(s.due30) })) },
    dong_tien_13_tuan: Array.from(wk.close).map((v, i) => ({ tuan: wk.labels[i], thu: Math.round(wk.inflow[i]), chi: Math.round(-wk.outflow[i]), so_du_cuoi: Math.round(v) })),
    dong_tien_6_thang: Array.from(mo.close).map((v, i) => ({ thang: mo.labels[i], thu: Math.round(mo.inflow[i]), chi: Math.round(-mo.outflow[i]), so_du_cuoi: Math.round(v) })),
    so_du_thap_nhat: { co_ban: R.mb.base.v, than_trong: R.mb.cons.v, lac_quan: R.mb.opt.v },
    phuong_an: R.lev.results.map(x => ({ ma: x.id, ten: x.name, diem: x.score, tac_dong: Math.round(x.impact), chi_phi: Math.round(x.cost), ra_tien_sau_ngay: x.ttc })), de_xuat_2_phuong_an: R.lev.top.map(x => x.id) };
  return { ctx: JSON.stringify(ctx), map };
}
async function askClaude(q) {
  const { ctx, map } = agentContext(), rev = Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k]));
  const sys = 'Bạn là chuyên gia tư vấn tài chính – dòng tiền cho Phó Giám đốc Công ty CP Giải pháp Đóng gói Hoàng Gia (sản xuất tem nhãn/decal, phân phối bao bì B2B, có xe tải và kho riêng, tại Việt Nam). Chỉ dùng số liệu trong DỮ LIỆU; nếu thiếu thì nói rõ, không bịa. Trả lời ngắn gọn, đi thẳng giải pháp, nêu rủi ro/chi phí trước khi đề xuất, ưu tiên bảng và số cụ thể (đơn vị tỷ/triệu đồng). Tiếng Việt.\n\nDỮ LIỆU (JSON):\n' + ctx;
  const hist = AI.msgs.filter(m => m.role !== 'sys').slice(-8).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.raw || m.text }));
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': AI.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify({ model: 'claude-sonnet-5-5', max_tokens: 1500, system: sys, messages: hist.concat([{ role: 'user', content: q }]) }) });
  const j = await r.json(); if (!r.ok) throw new Error((j.error && j.error.message) || r.status);
  let t = j.content.map(c => c.text || '').join(''); const raw = t;
  Object.keys(rev).sort((a, b) => b.length - a.length).forEach(k => { t = t.split(k).join(rev[k]); });
  return { html: mdLite(t), raw };
}
const mdLite = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/^#{1,4}\s*(.+)$/gm, '<b>$1</b>').replace(/^\s*[-*]\s+/gm, '• ').replace(/\n/g, '<br>');
AI.render = () => {
  const p = $('#aipanel'); if (!p) return;
  const chips = ['Điểm hụt tiền ở đâu?', 'Khách nào cần thu gấp?', 'Tuần này phải trả NCC những gì?', 'Tháng này nên làm 2 việc gì?', 'Điểm sức khỏe dòng tiền?'];
  p.innerHTML = `<div class="aih"><b>🤖 Trợ lý tài chính Hoàng Gia</b><button class="s" data-act="ai">✕</button></div>
  <div class="aim" id="aim">${AI.msgs.length ? AI.msgs.map(m => `<div class="m ${m.role}">${m.html || esc(m.text)}</div>`).join('') : `<div class="m bot">Xin chào Phó GĐ. Tôi đọc trực tiếp số liệu công nợ & dòng tiền trong chương trình. ${AI.use ? '<i>(Chế độ Claude đang bật)</i>' : ''} Hãy hỏi hoặc chọn gợi ý bên dưới.</div>`}${AI.busy ? '<div class="m bot">Đang phân tích…</div>' : ''}</div>
  <div class="aic">${chips.map(c => `<button class="s" data-act="aiq" data-v="${esc(c)}">${c}</button>`).join('')}</div>
  <div class="aif"><input type="text" id="aiin" placeholder="Hỏi về công nợ, dòng tiền, tên khách…"><button class="p" data-act="aisend">Gửi</button></div>
  <details class="ais"><summary>Cài đặt trợ lý (Claude)</summary>
   <label><input type="checkbox" data-ai="use" ${AI.use ? 'checked' : ''}> Dùng Claude cho câu hỏi tự do (cần Internet + API key)</label>
   <input type="text" data-ai="key" placeholder="API key (sk-ant-…) – lưu trên máy này" value="${esc(AI.key)}" style="width:100%;margin:4px 0">
   <label><input type="checkbox" data-ai="anon" ${AI.anon ? 'checked' : ''}> Ẩn tên khách/NCC khi gửi (KH1, KH2…)</label>
   <div class="note">Khi bật Claude, bản <b>tóm tắt</b> số liệu (top khách, dòng tiền, phương án) được gửi tới Anthropic để trả lời. Không gửi hóa đơn chi tiết. Tắt chế độ này thì mọi thứ chạy hoàn toàn offline.</div></details>`;
  const a = $('#aim'); if (a) a.scrollTop = a.scrollHeight;
};
async function aiSend(q) {
  q = (q || '').trim(); if (!q || AI.busy) return;
  AI.msgs.push({ role: 'user', text: q }); AI.busy = true; AI.render();
  try {
    if (AI.use && AI.key) { const r = await askClaude(q); AI.msgs.push({ role: 'bot', html: r.html, raw: r.raw }); }
    else { AI.msgs.push({ role: 'bot', html: localAnswer(q) }); if (AI.use && !AI.key) AI.msgs.push({ role: 'bot', html: '<i>Chưa nhập API key nên tôi trả lời bằng chế độ nội bộ.</i>' }); }
  } catch (e) { AI.msgs.push({ role: 'bot', html: 'Lỗi gọi Claude: ' + esc(e.message) + '. Đang dùng chế độ nội bộ:<hr>' + localAnswer(q) }); }
  AI.busy = false; AI.render();
}
ACT.aiq = t => aiSend(t.dataset.v); ACT.aisend = () => { const i = $('#aiin'); aiSend(i.value); };
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'aiin') aiSend(e.target.value); });
document.addEventListener('change', e => { const k = e.target.dataset && e.target.dataset.ai; if (!k) return; if (k === 'key') { AI.key = e.target.value.trim(); localStorage.setItem('hg_ai_key', AI.key); } else { AI[k] = e.target.checked; localStorage.setItem('hg_ai_' + k, AI[k] ? '1' : '0'); } });
document.addEventListener('DOMContentLoaded', () => { buildRibbon(); });
const _sp = paintSync; paintSync = function () { _sp(); const e = $('#syncst2'); if (e) e.textContent = SYNC.status; };
