const { chromium } = require('playwright'); const XLSX = require('../vendor/xlsx.full.min.js'); const path = require('path');
const wbArr = a => Array.from(XLSX.write(XLSX.utils.book_append_sheet(XLSX.utils.book_new(), XLSX.utils.aoa_to_sheet(a), 'Sheet1') || 0, { type: 'array', bookType: 'xlsx' }));
function mk(a) { const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(a), 'Sheet1'); return Array.from(new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }))); }
(async () => {
  const files = {
    'Cong no phai thu 131.xlsx': mk([['CÔNG TY HOÀNG GIA'], ['Báo cáo công nợ'], ['Tên khách hàng', 'Số chứng từ', 'Ngày chứng từ', 'Hạn thanh toán', 'Còn nợ'], ['Cty A', 'HD1', '01/10/2026', '30/10/2026', '1.200.000.000'], ['Cty B', 'HD2', '10/11/2026', '10/12/2026', 500000000], ['Tổng', '', '', '', 1700000000]]),
    'Phai tra 331.xlsx': mk([['Nhà cung cấp', 'Số HĐ', 'Ngày HĐ', 'Ngày đến hạn', 'Số tiền còn nợ'], ['NCC X', 'PN1', '05/11/2026', '05/12/2026', 800000000]])
  };
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(f => { window.showDirectoryPicker = async () => ({ kind: 'directory', name: 'Du_lieu', queryPermission: async () => 'granted', requestPermission: async () => 'granted',
    entries: async function* () { for (const [n, a] of Object.entries(f)) yield [n, { kind: 'file', name: n, getFile: async () => new File([new Uint8Array(a)], n, { lastModified: Date.now() }) }]; } }); }, files);
  await p.goto('file://' + path.resolve(__dirname, '../Quan_tri_dong_tien_Hoang_Gia.html')); await p.waitForSelector('#main .card');
  await p.click('nav [data-v=data]'); await p.click('#syncbtn'); await p.waitForTimeout(1500);
  console.log(await p.textContent('#syncst')); console.log((await p.$$eval('.card.note li, ul.note li', l => l.map(x => x.textContent))).join('\n'));
  console.log(await p.evaluate(async () => { const d = await window.showDirectoryPicker(); const o=[]; for await (const [n,h] of d.entries()) { const f = await h.getFile(); const wb = XLSX.read(await f.arrayBuffer(), {type:'array'}); o.push(n+':'+wb.SheetNames+':'+sheetRows(wb.Sheets[wb.SheetNames[0]]).length+':'+(typeof classify)); } return o.join('|'); }));console.log('AR', await p.evaluate(() => M.ar.length), 'AP', await p.evaluate(() => M.ap.length), 'snaps', await p.evaluate(() => M.snaps.length));
  console.log(errs.length ? errs.join('\n') : 'Không lỗi JS'); await b.close();
})();
