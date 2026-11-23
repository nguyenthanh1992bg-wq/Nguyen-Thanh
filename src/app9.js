/* =====================================================================
 * APP – KẾ HOẠCH DÒNG TIỀN T11/2026 (bản do kế toán/đội phân tích lập, nạp cùng dữ liệu thật)
 * ===================================================================== */
if (window.__REAL && window.__REAL.plan11) {
  NAVG[2][1].unshift(['kh11', '🗓', 'Kế hoạch T11/2026']); TITLE.kh11 = 'Kế hoạch dòng tiền tháng 11/2026'; TAB_ORDER.push('kh11');
  VIEWS.kh11 = () => {
    const P = window.__REAL.plan11, rows = P.rows, v = x => (x == null || x === '') ? '' : fm(x);
    const head1 = P.weeks.map(w => `<th colspan="3">${w}</th>`).join('') + '<th colspan="3">CẢ THÁNG 11</th>';
    const head2 = P.weeks.map(() => '<th class="n">Thực hiện</th><th class="n">Dự báo</th><th class="n">Tổng</th>').join('') + '<th class="n">Thực hiện</th><th class="n">Dự báo</th><th class="n">Tổng T11</th>';
    const body = rows.map(r => {
      const tot = /^(Tổng|TIỀN|DÒNG TIỀN|I\.|II\.)/.test(r.label) || r.bold;
      const cells = r.vals.map((t, i) => `<td class="n" style="background:${t[0] ? '#eef7ee' : ''}">${v(t[0])}</td><td class="n" style="background:${t[1] ? '#fffbe6' : ''}">${v(t[1])}</td><td class="n"><b>${v(t[2])}</b></td>`).join('');
      const m = r.month.map((x, i) => `<td class="n">${i === 2 ? '<b>' + v(x) + '</b>' : v(x)}</td>`).join('');
      const neg = r.label.startsWith('TIỀN CUỐI') ? ' style="font-weight:700"' : '';
      return `<tr class="${tot ? 'tot' : ''}"${neg}><td class="nw" title="${esc(r.note || '')}">${esc(r.label)}</td>${cells}${m}</tr>`;
    }).join('');
    const tk = P.track, keys = Object.keys(tk);
    return `<div class="card" style="border-color:#1d4ed8"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px"><div><h2 style="font-size:18px">BÁO CÁO KẾ HOẠCH DÒNG TIỀN THÁNG 11/2026</h2><p class="sub">Cập nhật ${P.updated} · thực hiện từ sổ ngân hàng (đến 21/11), sổ quỹ (đến 13/11), giải ngân vay trả thẳng NCC/lương · dự báo 22–30/11 · Đơn vị: triệu đồng. Rê chuột vào tên dòng để xem cơ sở tính.</p></div><div class="noprint"><button class="p" onclick="window.print()">In / Lưu PDF</button></div></div>
    <div class="tw nomax"><table class="sticky1"><thead><tr><th rowspan="2">Nội dung</th>${head1}</tr><tr>${head2}</tr></thead><tbody>${body}</tbody></table></div>
    <p class="note">Xanh = thực hiện · vàng = dự báo. Hệ số thu cuối tháng (90%) và các giả định chỉnh trong file Excel “KE_HOACH_DONG_TIEN_T11-2026.xlsx”.</p></div>
    <div class="grid2"><div class="card"><h2>Nhà cung cấp: nhu cầu so với khả năng chi</h2>${tbl('k11t', [{ h: 'Chỉ tiêu', f: x => esc(x[0]) }, { h: 'Số tiền (tr)', c: 'n', f: x => '<b>' + fm(x[1]) + '</b>' }], keys.map(k => [k, tk[k]]), { nomax: 1 })}<div class="alert bad">Khả năng chi chỉ đáp ứng khoảng nửa nhu cầu → khoảng ${fT(tk[keys[keys.length - 1]])} tỷ chuyển sang tháng 12. Cần vay trả thẳng NCC / giãn có chọn lọc.</div></div>
    <div class="card"><h2>Dòng tiền theo ngày 22–30/11 (dự báo)</h2>${tbl('k11d', [{ h: 'Ngày', f: d => d.d.split('-').reverse().slice(0, 2).join('/') }, { h: 'Thu KH', c: 'n', f: d => fm(d.thu) }, { h: 'Gốc vay', c: 'n', f: d => fm(d.goc) }, { h: 'Lãi', c: 'n', f: d => fm(d.lai) }, { h: 'Chi NCC', c: 'n', f: d => fm(d.ncc) }, { h: 'Số dư cuối', c: 'n', f: d => '<b>' + fm(d.close) + '</b>', cls: d => d.close < 200e6 ? 'cellwarn' : '' }], P.days, { nomax: 1 })}</div></div>
    <div class="card"><h2>2 phương án đề xuất tháng 11 (chấm điểm /100)</h2>${tbl('k11l', [{ h: 'Mã', f: x => x.id }, { h: 'Phương án', f: x => esc(x.name) + (x.pick ? ' <span class="pill" style="background:#1d4ed8">ĐỀ XUẤT</span>' : '') }, { h: 'Điểm', c: 'c', f: x => `<b style="color:${scoreCol(x.score)}">${x.score}</b>`, v: x => x.score }, { h: 'Tiền giữ lại/kéo về (tr)', c: 'n', f: x => fm(x.impact) }, { h: 'Chi phí (tr)', c: 'n', f: x => fm(x.cost) }, { h: 'Ra tiền sau (ngày)', c: 'n', f: x => x.ttc }], P.levers, { sort: { k: 2, dir: 'desc' }, nomax: 1 })}<p class="note">Cách làm chi tiết từng bước, danh sách khách/NCC ưu tiên: xem sheet “Đề xuất 2 PA”, “Thu KH”, “Chi NCC ưu tiên” trong file Excel.</p></div>`;
  };
}
