/* Kiểm thử đọc file THẬT: node tests/real_sync.js <thư mục chứa file> */
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const dir = process.argv[2]; const files = fs.readdirSync(dir).filter(f => /\.xlsx$/i.test(f) && !/BAO_CAO|B_O_C_O|HOP_DONG|H_P___NG/i.test(f));
  console.log('file:', files.length);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.exposeFunction('readB64', n => fs.readFileSync(path.join(dir, n)).toString('base64'));
  await p.addInitScript(names => { window.showDirectoryPicker = async () => ({ kind: 'directory', name: 'Du_lieu_hang_tuan', queryPermission: async () => 'granted', requestPermission: async () => 'granted',
    entries: async function* () { for (const n of names) yield [n, { kind: 'file', name: n, getFile: async () => { const b64 = await window.readB64(n); const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new File([u], n, { lastModified: Date.now() }); } }]; } }); }, files);
  await p.goto('file:///home/user/Nguyen-Thanh/Quan_tri_dong_tien_Hoang_Gia.html'); await p.waitForSelector('#main .card');
  await p.click('#nav [data-v=data]'); await p.click('#syncbtn'); await p.waitForFunction(() => !SYNC.busy && SYNC.log.length, null, { timeout: 120000 }); await p.waitForTimeout(1500);
  console.log((await p.evaluate(() => SYNC.log)).join('\n'));
  console.log(await p.evaluate(() => JSON.stringify({ ar: M.ar.length, ap: M.ap.length, hist: M.hist.length, loans: M.loans.length, cash0: M.S.cash0, asof: HG.fmtDate(M.S.asof), arTotal: Math.round(M.ar.reduce((s, x) => s + x.amt, 0) / 1e6), apTotal: Math.round(M.ap.reduce((s, x) => s + x.amt, 0) / 1e6) })));
  console.log(errs.length ? errs.join('\n') : 'Không lỗi JS'); await b.close();
})();
