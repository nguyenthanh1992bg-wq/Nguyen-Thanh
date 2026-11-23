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
    for (const x of items) {
      let wb; try { wb = XLSX.read(await x.f.arrayBuffer(), { type: 'array' }); } catch (e) { log.push(x.name + ': không đọc được'); continue; }
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
    Object.entries(got).forEach(([t, g]) => { commitRows(t, g.items, 'replace'); });
    const stampSrc = got.ar || got.ap; if (stampSrc) { const d = new Date(stampSrc.mod); M.S.asof = dn(d.getFullYear(), d.getMonth() + 1, d.getDate()); }
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
ACT.sync = connectFolder; ACT.unsync = async () => { SYNC.handle = null; SYNC.perm = false; await idb('readwrite', s => s.delete('dir')); SYNC.status = 'Chưa kết nối thư mục'; paintSync(); render(true); };
const _vd = VIEWS.data;
VIEWS.data = () => `<div class="card" style="border-color:#16803c"><h2>0. TỰ ĐỘNG – kết nối thư mục chứa file Excel</h2>
  <p class="sub">Chọn thư mục (ví dụ <b>Du_lieu</b>) một lần. Mỗi khi kế toán lưu file Excel mới vào thư mục, app tự đọc, tự nhận dạng phải thu / phải trả / lịch sử thu (theo tên file &amp; tiêu đề cột), tự cập nhật ngày chốt, tính lại dòng tiền, tự chốt đề xuất tháng. Không cần bấm nạp. File chỉ được đọc tại máy bạn, không gửi đi đâu.</p>
  <p><button class="p" id="syncbtn" data-act="sync">Kết nối thư mục Excel</button> ${SYNC.handle ? '<button data-act="unsync">Ngắt kết nối</button>' : ''} <b id="syncst">${esc(SYNC.status)}</b></p>
  ${SYNC.log.length ? `<ul class="note">${SYNC.log.map(l => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}
  <p class="note">Quy ước tên file (không bắt buộc): chứa “phải thu”/“131” → phải thu; “phải trả”/“331” → phải trả; “lịch sử” → lịch sử thu. Nếu file không có từ khóa, app đoán theo tiêu đề cột. Yêu cầu Chrome/Edge.</p></div>` + _vd();
document.addEventListener('DOMContentLoaded', () => setTimeout(initSync, 50));
