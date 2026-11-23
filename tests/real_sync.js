/* Kiểm thử đọc file THẬT: node tests/real_sync.js <thư mục chứa file> */
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const dir = process.argv[2]; const files = fs.readdirSync(dir).filter(f => /\.xlsx$/i.test(f) && !/HOP_DONG|H_P___NG|1eec08a6|2bb5838d|eaece420|30c56cb0|1786d1bf/i.test(f));
  console.log('file:', files.length);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.exposeFunction('readB64', n => fs.readFileSync(path.join(dir, n)).toString('base64'));
  await p.addInitScript(names => { window.showDirectoryPicker = async () => ({ kind: 'directory', name: 'Du_lieu_hang_tuan', queryPermission: async () => 'granted', requestPermission: async () => 'granted',
    entries: async function* () { for (const n of names) yield [n, { kind: 'file', name: n, getFile: async () => { const b64 = await window.readB64(n); const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new File([u], n, { lastModified: Date.now() }); } }]; } }); }, files);
  await p.goto('file:///home/user/Nguyen-Thanh/Quan_tri_dong_tien_Hoang_Gia.html'); await p.waitForSelector('#main .card');
  await p.click('#nav [data-v=data]'); await p.click('#syncbtn'); await p.waitForFunction(() => !SYNC.busy && SYNC.log.length, null, { timeout: 120000 }); await p.waitForTimeout(1500);
  console.log((await p.evaluate(() => SYNC.log)).join('\n'));
  console.log(await p.evaluate(() => JSON.stringify({ ar: M.ar.length, ap: M.ap.length, hist: M.hist.length, loans: M.loans.length, cash0: M.S.cash0, asof: HG.fmtDate(M.S.asof), arTotal: Math.round(M.ar.reduce((s, x) => s + x.amt, 0) / 1e6), apTotal: Math.round(M.ap.reduce((s, x) => s + x.amt, 0) / 1e6) })));
  if (process.argv[3]) { const kt = await p.evaluate(() => JSON.stringify(M.kt)); fs.writeFileSync(process.argv[3], kt); console.log('đã ghi M.kt', kt.length); }
  console.log(await p.evaluate(() => { const K = M.kt; if (!K) return 'KHÔNG có M.kt'; const a = K.act, w = K.plan.weeks.length; const s = k => (a[k] || []).map(x => Math.round(x / 1e6)); return JSON.stringify({ tuan: K.plan.weeks.map(x => x.label), last: HG.fmtDate(K.last), thu_kh: s('thu_kh'), thu_vay: s('thu_vay'), ncc: s('ncc'), luong: s('luong_vp'), goc: s('goc'), lai: s('lai'), bh: s('bh_vp'), thue: s('thue'), khac: s('khac'), tamung: s('tamung'), ck: s('ck') }); }));
  await p.click('#nav [data-v=ktrep]'); await p.waitForTimeout(500); await p.screenshot({ path: '/tmp/claude-0/-home-user-Nguyen-Thanh/79bc319a-108c-5b8f-b18e-02ca38b35d45/scratchpad/shots/ktrep.png' });
  console.log(errs.length ? errs.join('\n') : 'Không lỗi JS'); await b.close();
})();
