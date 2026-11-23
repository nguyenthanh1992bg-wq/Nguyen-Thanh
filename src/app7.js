/* =====================================================================
 * APP – KHUNG HỆ ĐIỀU HÀNH: thanh bên, thanh trạng thái, palette lệnh (Ctrl+K), thông báo, giao diện sáng/tối
 * ===================================================================== */
const NAVG = [['TỔNG QUAN', [['home', '🏠', 'Tổng quan']]], ['VẬN HÀNH', [['ar', '📥', 'Phải thu'], ['ap', '📤', 'Phải trả'], ['cash', '💹', 'Dòng tiền & điểm hụt']]], ['QUẢN TRỊ', [['plan', '🎯', 'Đề xuất tháng'], ['strat', '🧭', 'Định hướng 12 tháng']]], ['HỆ THỐNG', [['data', '⚙️', 'Dữ liệu & giả định']]]];
const TITLE = Object.fromEntries(NAVG.flatMap(g => g[1]).map(x => [x[0], x[2]]));
const TAB_ORDER = ['home', 'ar', 'ap', 'cash', 'plan', 'strat', 'data'];
function paintShell() {
  const n = $('#nav'); if (n) n.innerHTML = NAVG.map(([g, items]) => `<div class="ng">${g}</div>` + items.map(([k, ic, l]) => `<button class="${UI.tab === k ? 'on' : ''}" data-act="tab" data-v="${k}" title="${l}"><span class="ic">${ic}</span><span>${l}</span>${k === 'cash' && R && R.firstNeg != null ? '<span class="bd">!</span>' : ''}${k === 'ar' && R && R.arA.over60Pct * 100 > M.S.targetOver60 ? '<span class="bd">!</span>' : ''}</button>`).join('')).join('');
  const t = $('#ttl'); if (t) t.textContent = TITLE[UI.tab] || '';
  const al = R ? alertsList().filter(a => a[0] === 'bad' || a[0] === 'warn') : [], b = $('#bellN'); if (b) b.textContent = al.length || '';
  const st = $('#status'); if (st) {
    const S = M.S, H = R && R.health;
    st.innerHTML = R ? `<span><span class="dot" style="background:${H.color}"></span>Sức khỏe dòng tiền <b>${H.score}/100</b> (${H.grade})</span><span>Ngày chốt <b>${fmtDate(S.asof)}</b></span><span>Phải thu <b>${M.ar.length}</b> HĐ · Phải trả <b>${M.ap.length}</b> HĐ</span><span>Số dư thấp nhất 13 tuần <b>${fmtVnd(R.mb.base.v)}</b></span><span style="flex:1"></span><span>${esc(SYNC.status)}</span>` : `<span>Chưa có dữ liệu</span><span style="flex:1"></span><span>${esc(SYNC.status)}</span>`;
  }
}
const _render = render; render = function (keep) { const m = $('#main'), y = m ? m.scrollTop : 0; _render(keep); paintShell(); if (keep && $('#main')) $('#main').scrollTop = y; };
const _ps2 = paintSync; paintSync = function () { _ps2(); paintShell(); };
ACT.theme = () => { document.body.classList.toggle('dark'); localStorage.setItem('hg_dark', document.body.classList.contains('dark') ? '1' : '0'); };
ACT.collapse = () => { document.body.classList.toggle('sc'); localStorage.setItem('hg_sc', document.body.classList.contains('sc') ? '1' : '0'); };
ACT.bell = () => { const p = $('#bellp'); p.classList.toggle('on'); if (!p.classList.contains('on')) return; const al = R ? alertsList() : [['info', 'Chưa có dữ liệu.']]; p.innerHTML = '<b>Thông báo &amp; cảnh báo</b>' + al.map(a => `<div class="alert ${a[0]}">${a[1]}</div>`).join(''); };
document.addEventListener('click', e => { if (!e.target.closest('#bellp') && !e.target.closest('[data-act=bell]')) $('#bellp').classList.remove('on'); });

/* ---- palette lệnh ---- */
function cmdList() {
  const cmds = NAVG.flatMap(g => g[1]).map(([k, ic, l]) => ({ t: ic + ' Mở: ' + l, h: 'Alt+' + (TAB_ORDER.indexOf(k) + 1), run: () => { UI.tab = k; render(); } }));
  [['🔄 Đồng bộ thư mục Excel', 'sync'], ['📌 Chốt đề xuất tháng', 'snap'], ['📊 Xuất dòng tiền ra Excel', 'exp_cash'], ['👥 Xuất phải thu ra Excel', 'exp_ar'], ['🗂 Xuất toàn bộ dữ liệu', 'exp_all'], ['💾 Sao lưu (.json)', 'backup'], ['🤖 Mở Trợ lý AI', 'ai'], ['🌓 Đổi giao diện sáng/tối', 'theme'], ['🖨 In / PDF', 'print'], ['📥 Nạp file phải thu', 'imp:ar'], ['📥 Nạp file phải trả', 'imp:ap']].forEach(([t, a]) => { const [act, v] = a.split(':'); cmds.push({ t, run: () => ACT[act]({ dataset: { v } }, { preventDefault() { } }) }); });
  if (R) { R.arA.cust.slice(0, 200).forEach(c => cmds.push({ t: '👤 ' + c.cust, h: 'Hạng ' + c.grade + ' · ' + fm(c.total) + ' tr', run: () => { UI.tab = 'ar'; UI.cust = c.key; render(); } })); R.apA.sup.slice(0, 100).forEach(s => cmds.push({ t: '🏭 ' + s.sup, h: fm(s.total) + ' tr', run: () => { UI.tab = 'ap'; UI.apq = s.sup; render(); } })); }
  return cmds;
}
let PAL = { i: 0, list: [] };
function palDraw(q) {
  const ql = deacc(q); PAL.list = cmdList().filter(c => !ql || deacc(c.t).includes(ql)).slice(0, 12); PAL.i = Math.min(PAL.i, Math.max(0, PAL.list.length - 1));
  $('#pal ul').innerHTML = PAL.list.map((c, i) => `<li class="${i === PAL.i ? 'on' : ''}" data-i="${i}">${esc(c.t)}<small>${esc(c.h || '')}</small></li>`).join('') || '<li>Không có kết quả</li>';
}
ACT.cmd = () => { if ($('#pal')) return; const d = document.createElement('div'); d.id = 'pal'; d.innerHTML = '<div><input type="text" placeholder="Gõ lệnh, tên khách hàng, nhà cung cấp…"><ul></ul></div>'; document.body.appendChild(d); PAL.i = 0; palDraw(''); const i = d.querySelector('input'); i.focus(); i.oninput = () => { PAL.i = 0; palDraw(i.value); }; };
const palClose = () => { const d = $('#pal'); if (d) d.remove(); };
document.addEventListener('click', e => { const d = $('#pal'); if (!d) return; const li = e.target.closest('#pal li[data-i]'); if (li) { const c = PAL.list[+li.dataset.i]; palClose(); c && c.run(); } else if (!e.target.closest('#pal>div')) palClose(); });
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#pal') ? palClose() : ACT.cmd(); return; }
  if (e.altKey && /^[1-7]$/.test(e.key)) { e.preventDefault(); UI.tab = TAB_ORDER[+e.key - 1]; render(); return; }
  if (!$('#pal')) return;
  if (e.key === 'Escape') palClose();
  else if (e.key === 'ArrowDown') { e.preventDefault(); PAL.i = Math.min(PAL.list.length - 1, PAL.i + 1); palDraw($('#pal input').value); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); PAL.i = Math.max(0, PAL.i - 1); palDraw($('#pal input').value); }
  else if (e.key === 'Enter') { const c = PAL.list[PAL.i]; palClose(); c && c.run(); }
});
document.addEventListener('DOMContentLoaded', () => { if (localStorage.getItem('hg_dark') === '1') document.body.classList.add('dark'); if (localStorage.getItem('hg_sc') === '1') document.body.classList.add('sc'); paintShell(); });
