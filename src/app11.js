/* =====================================================================
 * APP – BÁO CÁO QUẢN TRỊ DÒNG TIỀN THEO TUẦN (đúng mẫu phòng kế toán)
 *   Kế hoạch  = lấy từ file kế hoạch của kế toán (sheet “DÒNG TIỀN T..”)  – kế toán cập nhật hằng tuần
 *   Thực hiện = tự tính từ sổ tiền gửi NH + sổ quỹ TM + giải ngân vay (cập nhật mỗi lần có file mới)
 * ===================================================================== */
const KT_LINES = [
  ['thu_kh', /^thu cong no khach hang/], ['thu_vay', /^thu vay/], ['thu_khac', /^thu khac/],
  ['ncc', /^chi tien thanh toan ncc/], ['luong_vp', /^chi luong thuong van phong/], ['luong_sx', /^chi luong thuong tet sx|chi phi luong thuong tet sx/],
  ['thue', /^chi thue le phi/], ['goc', /^tra goc vay ngan hang/], ['lai', /^tra lai vay ngan hang/],
  ['ck', /^chiet khau cho kh/], ['tamung', /^chi tam ung nv/], ['dvnh', /^chi phi dich vu ngan hang/]];
REAL.ktCat = (tk, thu, desc) => {
  tk = String(tk || ''); const s = deacc(desc || '');
  if (/^11[12]/.test(tk)) return 'noibo';
  if (thu) return /^131/.test(tk) ? 'thu_kh' : /^341/.test(tk) ? 'thu_vay' : 'thu_khac';
  if (/^331/.test(tk)) return 'ncc';
  if (/^334/.test(tk)) return /san xuat|\bsx\b|cong nhan/.test(s) ? 'luong_sx' : 'luong_vp';
  if (/^338[345]/.test(tk)) return /san xuat|\bsx\b/.test(s) ? 'bh_sx' : 'bh_vp';
  if (/^333/.test(tk)) return 'thue';
  if (/^341/.test(tk)) return 'goc';
  if (/^635/.test(tk)) return /ngan hang|phi dich vu|phi chuyen/.test(s) && !/lai/.test(s) ? 'dvnh' : 'lai';
  if (/^141/.test(tk)) return 'tamung';
  if (/^521/.test(tk)) return 'ck';
  return 'khac';
};
/** giao dịch từ sổ tiền gửi NH / sổ quỹ TM */
REAL.txs = (rows, kind) => {
  const hi = rows.findIndex(r => r && r[0] === 'Ngày hạch toán'); if (hi < 0) return [];
  const H = rows[hi], col = k => H.findIndex(c => c === k), out = [];
  const cD = col('Diễn giải'), cT = kind === 'bankLed' ? col('TK đối ứng') : col('TK đối ứng'), cName = col('Tên đối tượng trên thông tin ngân hàng') >= 0 ? col('Tên đối tượng trên thông tin ngân hàng') : col('Tên đối tượng');
  let cThu, cChi; if (kind === 'bankLed') { cThu = col('Thu'); cChi = col('Chi'); } else { cThu = col('Số phát sinh'); cChi = cThu + 1; }
  const cDoc = col('Số chứng từ');
  rows.slice(hi + 1).forEach(r => {
    const d = REAL.d(r[0]); if (d == null || (typeof r[0] === 'string' && !/\d/.test(r[0]))) return;
    const thu = REAL.n(r[cThu]), chi = REAL.n(r[cChi]); if (!thu && !chi) return;
    out.push({ d, thu, chi, tk: r[cT], desc: String(r[cD] || ''), name: cName >= 0 ? r[cName] : '', doc: cDoc >= 0 ? r[cDoc] : (r[2] || r[3]), src: kind });
  });
  return out;
};
/** file kế hoạch của kế toán: sheet “DÒNG TIỀN Txx.yyyy” */
REAL.ktPlan = (wb, sheet) => {
  const rows = REAL.rows(wb.Sheets[sheet]), mt = sheet.match(/T(\d{1,2})\.?(\d{4})?/i), month = mt ? +mt[1] : null, year = mt && mt[2] ? +mt[2] : new Date().getFullYear();
  const hr = rows.findIndex(r => r && r[2] === 'Nội dung'); if (hr < 0) return null;
  const H = rows[hr], weeks = [];
  H.forEach((c, i) => { const m = typeof c === 'string' && c.match(/Tuần\s*(\d)\s*\(\s*(\d{1,2})\s*-\s*(\d{1,2})\s*\/\s*(\d{1,2})/); if (m) weeks.push({ n: +m[1], col: i, d1: +m[2], d2: +m[3], m: +m[4], label: c.replace(/\s+/g, ' ') }); });
  const items = [];
  rows.slice(hr + 2).forEach(r => {
    const lab = r[2]; if (lab == null || String(lab).trim() === '') return; const t = String(lab).trim();
    if (/^(TIỀN|TỔNG TIỀN)/i.test(t) && !/^(DÒNG|CHI)/i.test(t)) return;
    items.push({ code: String(r[1] || ''), label: t, plan: weeks.map(w => REAL.n(r[w.col])), mplan: REAL.n(r[3]) });
  });
  const open = (() => { const r = rows.find(x => x && x[2] === 'TIỀN ĐẦU KỲ'); return r ? REAL.n(r[3]) : null; })();
  return { sheet, month: month || (weeks[0] && weeks[0].m), year, weeks, items, openPlan: open };
};
/** tính “thực hiện” theo tuần từ các giao dịch */
REAL.ktActual = (kt, txs, disb) => {
  const A = {}; const add = (k, w, v) => { (A[k] || (A[k] = kt.weeks.map(() => 0)))[w] += v; };
  const wkOf = d => { const o = ymd(d); if (o.m !== kt.month || o.y !== kt.year) return -1; return kt.weeks.findIndex(w => o.d >= w.d1 && o.d <= w.d2); };
  const seen = new Set(); let last = 0;
  txs.forEach(t => {
    const key = [t.d, t.doc, t.thu, t.chi, t.tk].join('|'); if (seen.has(key)) return; seen.add(key);
    const w = wkOf(t.d); if (w < 0) return; last = Math.max(last, t.d);
    if (t.thu) { const c = REAL.ktCat(t.tk, true, t.desc); if (c !== 'noibo') add(c, w, t.thu); }
    if (t.chi) { const c = REAL.ktCat(t.tk, false, t.desc); if (c !== 'noibo') add(c, w, t.chi); }
  });
  (disb || []).forEach(x => { const w = wkOf(x.d); if (w < 0) return; add('thu_vay', w, x.amt); add(x.luong ? 'luong_vp' : 'ncc', w, x.amt); last = Math.max(last, x.d); });
  return { A, last };
};
/** giải ngân vay trả thẳng NCC/lương (file theo dõi vay) */
REAL.disb = rows => {
  const hi = rows.findIndex(r => r && r[1] === 'Ngân hàng' && r.some(c => c === 'Dư nợ hiện tại')); if (hi < 0) return [];
  const H = rows[hi], col = k => H.findIndex(c => c === k), cd = col('Ngày giải ngân \nđầu tiên') >= 0 ? col('Ngày giải ngân \nđầu tiên') : 3, cg = col('Dư nợ gốc'), cn = col('NCC'), out = [];
  rows.slice(hi + 1).forEach(r => { const d = REAL.d(r[cd]), a = REAL.n(r[cg]); if (d != null && a > 0 && r[1]) out.push({ d, amt: a, luong: /^luong/.test(deacc(r[cn])), who: r[cn] }); });
  return out;
};
REAL.ktBuild = parts => {
  const files = parts.ktPlan; if (!files) return null;
  const kt = REAL.ktPlan(files.wb, files.sheet); if (!kt) return null;
  const txs = [].concat(...(parts.bankLeds || []).map(p => REAL.txs(p.rows, 'bankLed')), ...(parts.cashBooks || []).map(p => REAL.txs(p.rows, 'cashBook')));
  const disb = parts.loans ? REAL.disb(REAL.rows(parts.loans.wb.Sheets[parts.loans.sheet])) : [];
  const r = REAL.ktActual(kt, txs, disb);
  return { plan: kt, act: r.A, last: r.last, built: Date.now() };
};

/* ---------------------------------------------------------------- màn hình */
NAVG[2][1].unshift(['ktrep', '📒', 'BC dòng tiền tuần (mẫu KT)']); TITLE.ktrep = 'Báo cáo quản trị dòng tiền theo tuần (mẫu kế toán)'; TAB_ORDER.push('ktrep');
VIEWS.ktrep = () => {
  const K = M.kt; if (!K) return `<div class="card"><h2>Chưa có dữ liệu báo cáo tuần</h2><p>Bỏ vào thư mục dữ liệu hằng tuần: (1) <b>file kế hoạch dòng tiền của kế toán</b> (sheet “DÒNG TIỀN T..”), (2) sổ tiền gửi NH, (3) sổ quỹ TM, (4) file theo dõi vay. App sẽ tự lập báo cáo theo đúng mẫu kế toán.</p><p><button class="p" data-act="tab" data-v="data">Mở khu vực nhập dữ liệu</button></p></div>`;
  const P = K.plan, A = K.act, W = P.weeks, mm = n => (n == null || n === 0) ? '' : fm(n);
  const act = (key, w) => (A[key] ? A[key][w] : 0), sumA = (keys, w) => keys.reduce((s, k) => s + act(k, w), 0);
  const thuKeys = ['thu_kh', 'thu_vay', 'thu_khac'];
  const allChiKeys = Object.keys(A).filter(k => !thuKeys.includes(k));
  const mapped = new Set(); const rowKey = {};
  let bhSeen = 0, luongSeen = 0;
  P.items.forEach((it, i) => { const n = deacc(it.label); const f = KT_LINES.find(([, re]) => re.test(n)); if (f) { rowKey[i] = [f[0]]; mapped.add(f[0]); } else if (/^chi bhxh/.test(n)) { rowKey[i] = [bhSeen++ === 0 ? 'bh_vp' : 'bh_sx']; mapped.add(rowKey[i][0]); } });
  const unmapped = allChiKeys.filter(k => !mapped.has(k));
  const cellsFor = (plan, actW, wi) => { const a = actW, p = plan[wi]; return [p, a, a == null ? '' : p - a, a == null || !p ? '' : a / p]; };
  const isHead = (it, i) => /^(DÒNG THU|DÒNG CHI|CHI KHỐI|CHI NHÀ MÁY)/i.test(it.label) || ['I', 'II', 'A', 'B'].includes(it.code);
  const last = K.last ? fmtDate(K.last) : '';
  const rowsHtml = P.items.map((it, i) => {
    const lab = it.label; let wAct;
    if (/^DÒNG THU/i.test(lab)) wAct = w => sumA(thuKeys, w);
    else if (/^DÒNG CHI/i.test(lab)) wAct = w => sumA(allChiKeys, w);
    else if (/^CHI KHỐI VĂN PHÒNG/i.test(lab)) wAct = w => sumA(allChiKeys.filter(k => !['luong_sx', 'bh_sx'].includes(k)), w);
    else if (/^CHI NHÀ MÁY/i.test(lab)) wAct = w => sumA(['luong_sx', 'bh_sx'], w);
    else if (rowKey[i]) wAct = w => act(rowKey[i][0], w);
    else wAct = null;
    const bold = isHead(it, i), tot = /^(DÒNG THU|DÒNG CHI)/i.test(lab);
    const wc = W.map((w, wi) => { const a = wAct ? wAct(wi) : null, p = it.plan[wi]; return `<td class="n">${mm(p)}</td><td class="n" style="background:${a ? '#eef7ee' : ''}">${a == null ? '' : mm(a)}</td><td class="n">${a == null ? '' : mm(p - a)}</td><td class="n">${a == null || !p ? '' : Math.round(100 * a / p) + '%'}</td>`; }).join('');
    const mA = wAct ? W.reduce((s, w, wi) => s + wAct(wi), 0) : null, mP = it.mplan || it.plan.reduce((s, x) => s + x, 0);
    const mc = `<td class="n">${mm(mP)}</td><td class="n">${mA == null ? '' : mm(mA)}</td><td class="n">${mA == null ? '' : mm(mP - mA)}</td><td class="n">${mA == null || !mP ? '' : Math.round(100 * mA / mP) + '%'}</td>`;
    if (!bold && !mP && !it.plan.some(x => x) && !(mA)) return '';
    return `<tr class="${tot ? 'tot' : bold ? 'sec' : ''}"><td class="nw">${esc(it.code)}</td><td class="nw">${esc(lab)}</td>${mc}${wc}</tr>`;
  }).join('');
  const extra = unmapped.length ? `<tr class="sec"><td></td><td class="nw">Chi khác chưa phân loại theo khoản mục (từ sổ NH/quỹ)</td><td colspan="4"></td>${W.map((w, wi) => `<td></td><td class="n" style="background:#eef7ee">${mm(sumA(unmapped, wi))}</td><td></td><td></td>`).join('')}</tr>` : '';
  const head1 = `<th rowspan="2">Stt</th><th rowspan="2">Nội dung</th><th colspan="4">FC THÁNG ${P.month}</th>` + W.map(w => `<th colspan="4">${esc(w.label)}</th>`).join('');
  const sub = '<th class="n">Kế hoạch</th><th class="n">Thực hiện</th><th class="n">Còn phải TH</th><th class="n">Tỷ lệ</th>';
  const head2 = sub.repeat(W.length + 1);
  const bankNow = M.S.cash0;
  return `<div class="card" style="border-color:#1d4ed8"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px"><div><h2 style="font-size:18px">BÁO CÁO QUẢN TRỊ DÒNG TIỀN – THÁNG ${P.month}/${P.year} (theo tuần)</h2><p class="sub">Kế hoạch: file kế toán (sheet “${esc(P.sheet)}”). Thực hiện: sổ tiền gửi NH + sổ quỹ TM + vay giải ngân trả thẳng NCC/lương, <b>đến ngày ${last}</b>. Đơn vị: triệu đồng. Số dư tiền hiện tại (sổ): <b>${fm(bankNow)}</b>.</p></div><div class="noprint"><button class="p" onclick="window.print()">In / PDF</button> <button data-act="exp_kt">Xuất Excel (mẫu KT)</button></div></div>
  <div class="tw nomax"><table class="sticky1"><thead><tr>${head1}</tr><tr>${head2}</tr></thead><tbody>${rowsHtml}${extra}</tbody></table></div>
  <p class="note">Ô xanh = thực hiện tự động theo sổ. Khoản mục chưa ghép được vào dòng nào của mẫu được dồn vào dòng “Chi khác chưa phân loại” để tổng chi khớp sổ. Kế toán cập nhật file kế hoạch mỗi tuần → app tự lấy kế hoạch mới.</p></div>`;
};
ACT.exp_kt = () => {
  const K = M.kt; if (!K) return; const P = K.plan, A = K.act, W = P.weeks;
  const aoa = [['BÁO CÁO QUẢN TRỊ DÒNG TIỀN THÁNG ' + P.month + '/' + P.year], ['Thực hiện đến ngày ' + (K.last ? fmtDate(K.last) : '')], [], ['Stt', 'Nội dung', 'FC tháng: Kế hoạch', 'Thực hiện', 'Còn phải TH'].concat(...W.map(w => [w.label + ' – KH', 'TH', 'Còn']))];
  P.items.forEach(it => aoa.push([it.code, it.label, it.mplan].concat(...W.map((w, i) => [it.plan[i], '', '']))));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'BC tuần'); XLSX.writeFile(wb, 'BaoCao_DongTien_Tuan_T' + P.month + '_' + P.year + '.xlsx');
};
