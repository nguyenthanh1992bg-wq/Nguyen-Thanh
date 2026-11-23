/* =====================================================================
 * APP – TỰ ĐỘNG ĐỒNG BỘ từ thư mục Excel (File System Access API: Chrome/Edge)
 * Chọn thư mục 1 lần → app tự đọc file mới/đổi mỗi 5 phút & mỗi lần mở.
 * ===================================================================== */
const SYNC = { handle: null, status: 'Chưa kết nối thư mục', log: [], busy: false, perm: false };
const idb = (mode, fn) => new Promise((res, rej) => { const q = indexedDB.open('hg_cash', 1); q.onupgradeneeded = () => q.result.createObjectStore('kv'); q.onerror = () => rej(q.error); q.onsuccess = () => { let tx, r; try { tx = q.result.transaction('kv', mode); r = fn(tx.objectStore('kv')); } catch (e) { return rej(e); } tx.oncomplete = () => res(r && r.result); tx.onerror = () => rej(tx.error); }; });
const FILE_HINT = [[/phai\s*thu|cong\s*no\s*kh|131|receiv/, 'ar'], [/phai\s*tra|cong\s*no\s*ncc|331|payab/, 'ap'], [/lich\s*su|thu\s*tien|collection/, 'hist'], [/chi\s*phi/, 'rec'], [/khoan\s*vay|vay/, 'loans']];
function classify(fname, sheetName, rows) {
  const hint = deacc(fname + ' ' + sheetName); const tmpl = SHEETKEY[deacc(sheetName).replace(/ /g, '')];
  if (tmpl) return tmpl;
  const byName = FILE_HINT.find(([re]) => re.test(hint)); if (byName) return byName[1];
  let best = null, bs = 0;
  ['ar', 'ap', 'hist'].forEach(t => { const h = detectHeader(rows, t), m = guessMap(rows[h] || [], t); if (IMP[t].req.every(k => m[k] >= 0)) { const sc = Object.values(m).filter(i => i >= 0).length; if (sc > bs) { bs = sc; best = t; } } });
  return best;
}
async function listFiles(dir) { const out = []; for await (const [name, h] of dir.entries()) if (h.kind === 'file' && /\.(xlsx|xls|csv)$/i.test(name) && !name.startsWith('~$')) out.push(h); return out; }
async function syncFolder(force) {
  if (!SYNC.handle || SYNC.busy) return; SYNC.busy = true;
  try {
    const files = await listFiles(SYNC.handle), got = {}, log = [], seen = M.sync || (M.sync = {});
    const items = [];
    for (const h of files) { const f = await h.getFile(); items.push({ f, name: h.name, key: h.name + '|' + f.lastModified + '|' + f.size }); }
    const changed = force || items.some(x => !seen[x.name] || seen[x.name] !== x.key) || Object.keys(seen).some(n => !items.some(x => x.name === n));
    if (!changed) { SYNC.status = 'Đã đồng bộ ' + new Date().toLocaleTimeString('vi-VN') + ' – không có file mới'; SYNC.busy = false; paintSync(); return; }
    items.sort((a, b) => a.f.lastModified - b.f.lastModified);          /* file mới nhất ghi đè file cũ cùng loại */
    const parts = {};
    for (const x of items) {
      let wb; try { wb = XLSX.read(await x.f.arrayBuffer(), { type: 'array' }); } catch (e) { log.push(x.name + ': không đọc được'); continue; }
      const rd = typeof REAL !== 'undefined' ? REAL.detect(wb) : null;
      if (rd) { const pp = Object.assign({ wb, name: x.name }, rd); parts[rd.kind] = pp; if (rd.kind === 'bankLed' || rd.kind === 'cashBook') (parts[rd.kind + 's'] || (parts[rd.kind + 's'] = [])).push(pp); log.push(x.name + ' → ' + rd.kind); seen[x.name] = x.key; continue; }
      for (const sn of wb.SheetNames) {
        const rows = sheetRows(wb.Sheets[sn]); if (rows.length < 2) continue;
        const t = classify(x.name, sn, rows);
        if (t === 'set') { importSettings(rows); log.push(x.name + ' → Cài đặt'); continue; }
        if (!t) { log.push(x.name + ' [' + sn + ']: chưa nhận dạng'); continue; }
        const hdr = detectHeader(rows, t), map = guessMap(rows[hdr] || [], t);
        if (!IMP[t].req.every(k => map[k] >= 0)) { log.push(x.name + ' [' + sn + ']: thiếu cột bắt buộc (' + IMP[t].req.filter(k => map[k] < 0).join(',') + ')'); continue; }
        const parsed = parseRows(t, rows, hdr, map); got[t] = { items: parsed, name: x.name, mod: x.f.lastModified }; log.push(x.name + ' → ' + IMP[t].name + ' (' + parsed.length + ' dòng)');
      }
      seen[x.name] = x.key;
    }
    Object.keys(seen).forEach(n => { if (!items.some(x => x.name === n)) delete seen[n]; });
    if (Object.keys(parts).length) {
      try { const lg = REAL.apply(parts); lg.forEach(l => log.push('✔ ' + l)); got.real = { items: [] }; } catch (e) { log.push('Lỗi đọc file kế toán: ' + e.message); console.error(e); }
    }
    Object.entries(got).forEach(([t, g]) => { commitRows(t, g.items, 'replace'); });
    const stampSrc = (got.ar || got.ap) && !got.real; if (stampSrc && (got.ar || got.ap)) { const g0 = got.ar || got.ap; const d = new Date(g0.mod); M.S.asof = dn(d.getFullYear(), d.getMonth() + 1, d.getDate()); }
    SYNC.log = log; SYNC.status = 'Đã đồng bộ ' + new Date().toLocaleTimeString('vi-VN') + ' – ' + Object.keys(got).length + ' loại dữ liệu từ ' + items.length + ' file';
    save(); recalc();
    if (R && !M.snaps.some(s => s.key === HG.monthKey(M.S.asof))) snapshot();
    render(true);
  } catch (e) { SYNC.status = 'Lỗi đồng bộ: ' + e.message; }
  SYNC.busy = false; paintSync();
}
function paintSync() { const el = $('#syncst'); if (el) el.textContent = SYNC.status; const b = $('#syncbtn'); if (b) b.textContent = SYNC.handle ? (SYNC.perm ? 'Đồng bộ ngay' : 'Cấp quyền đọc thư mục') : 'Kết nối thư mục Excel'; }
async function connectFolder() {
  if (!window.showDirectoryPicker) return toast('Trình duyệt này chưa hỗ trợ – hãy dùng Chrome hoặc Edge');
  if (SYNC.handle && !SYNC.perm) { SYNC.perm = (await SYNC.handle.requestPermission({ mode: 'read' })) === 'granted'; if (SYNC.perm) { await syncFolder(true); paintSync(); return; } }
  if (SYNC.handle && SYNC.perm) return syncFolder(true);
  try { SYNC.handle = await window.showDirectoryPicker({ mode: 'read' }); SYNC.perm = true; try { await idb('readwrite', s => s.put(SYNC.handle, 'dir')); } catch (e) { } await syncFolder(true); toast('Đã kết nối – app sẽ tự cập nhật khi có file Excel mới'); } catch (e) { if (e.name !== 'AbortError') toast('Không kết nối được: ' + e.message); }
  paintSync();
}
async function initSync() {
  paintSync(); if (!window.indexedDB) return;
  try { SYNC.handle = await idb('readonly', s => s.get('dir')); } catch (e) { }
  if (SYNC.handle) { SYNC.perm = (await SYNC.handle.queryPermission({ mode: 'read' })) === 'granted'; SYNC.status = SYNC.perm ? 'Đang đồng bộ…' : 'Đã nhớ thư mục – bấm “Cấp quyền đọc thư mục” (1 lần mỗi lần mở trình duyệt)'; paintSync(); if (SYNC.perm) syncFolder(); }
  setInterval(() => { if (SYNC.perm && !document.hidden) syncFolder(); }, 300000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && SYNC.perm) syncFolder(); });
}
async function createFolder() {
  if (!window.showDirectoryPicker) return toast('Cần Chrome hoặc Edge');
  try {
    const parent = await window.showDirectoryPicker({ mode: 'readwrite' });
    const dir = await parent.getDirectoryHandle('Du_lieu_hang_tuan', { create: true });
    const w = await (await dir.getFileHandle('HUONG_DAN.txt', { create: true })).createWritable();
    await w.write('THƯ MỤC DỮ LIỆU HÀNG TUẦN – Hoàng Gia PS\r\n\r\nBỎ VÀO ĐÂY (giữ nguyên tên file xuất từ phần mềm kế toán, file mới hơn tự ghi đè file cũ cùng loại):\r\n1. Chi_tiet_cong_no_phai_thu_theo_hoa_don.xlsx   (131 theo hóa đơn – BẮT BUỘC)\r\n2. Chi_tiet_cong_no_phai_thu_khach_hang.xlsx      (131 theo khách – lịch sử thu tiền)\r\n3. Chi_tiet_cong_no_phai_tra_nha_cung_cap.xlsx    (331 chi tiết – BẮT BUỘC)\r\n4. Han_thanh_toan_NCC_<ngày>.xlsx                 (kỳ hạn thanh toán NCC)\r\n5. So_tien_gui_ngan_hang_*.xlsx                   (sổ ngân hàng – số dư tiền)\r\n6. So_ke_toan_chi_tiet_quy_tien_mat_*.xlsx        (quỹ tiền mặt)\r\n7. Theo_doi_TK_vay_Ngan_hang.xlsx                  (lịch trả nợ vay)\r\n8. Danh_sach_khach_hang_*.xlsx                     (số ngày được nợ, nhân viên)\r\n\r\nSau khi bỏ file: mở app Finance OS (Chrome/Edge) → tự đọc và cập nhật (mỗi 5 phút hoặc bấm Đồng bộ).\r\n');
    await w.close();
    SYNC.handle = dir; SYNC.perm = true; try { await idb('readwrite', st => st.put(dir, 'dir')); } catch (e) { }
    toast('Đã tạo thư mục “Du_lieu_hang_tuan” – hãy bỏ file Excel vào đó'); SYNC.status = 'Đã tạo thư mục Du_lieu_hang_tuan – chưa có file'; paintSync(); render(true);
  } catch (e) { if (e.name !== 'AbortError') toast('Không tạo được thư mục: ' + e.message); }
}
ACT.mkdir = createFolder;
ACT.sync = connectFolder; ACT.unsync = async () => { SYNC.handle = null; SYNC.perm = false; await idb('readwrite', s => s.delete('dir')); SYNC.status = 'Chưa kết nối thư mục'; paintSync(); render(true); };
const _vd = VIEWS.data;
VIEWS.data = () => `<div class="card" style="border-color:#16803c"><h2>0. TỰ ĐỘNG – kết nối thư mục chứa file Excel</h2>
  <p class="sub">Chọn thư mục (ví dụ <b>Du_lieu</b>) một lần. Mỗi khi kế toán lưu file Excel mới vào thư mục, app tự đọc, tự nhận dạng phải thu / phải trả / lịch sử thu (theo tên file &amp; tiêu đề cột), tự cập nhật ngày chốt, tính lại dòng tiền, tự chốt đề xuất tháng. Không cần bấm nạp. File chỉ được đọc tại máy bạn, không gửi đi đâu.</p>
  <p><button class="p" data-act="mkdir">Tạo thư mục dữ liệu hằng tuần</button> <button class="p" id="syncbtn" data-act="sync">Kết nối thư mục Excel</button> ${SYNC.handle ? '<button data-act="unsync">Ngắt kết nối</button>' : ''} <b id="syncst">${esc(SYNC.status)}</b></p>
  ${SYNC.log.length ? `<ul class="note">${SYNC.log.map(l => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}
  <p class="note">Quy ước tên file (không bắt buộc): chứa “phải thu”/“131” → phải thu; “phải trả”/“331” → phải trả; “lịch sử” → lịch sử thu. Nếu file không có từ khóa, app đoán theo tiêu đề cột. Yêu cầu Chrome/Edge.</p></div>` + _vd();
document.addEventListener('DOMContentLoaded', () => setTimeout(initSync, 50));
