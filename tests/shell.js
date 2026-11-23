const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + path.resolve(__dirname, '../Quan_tri_dong_tien_Hoang_Gia.html')); await p.waitForSelector('#main .card');
  await p.click('[data-act=demo]'); await p.waitForSelector('.hs .big');
  await p.keyboard.press('Control+k'); await p.keyboard.type('khach'); await p.waitForTimeout(200); console.log('palette items', await p.$$eval('#pal li', l => l.length)); await p.keyboard.press('Escape');
  await p.keyboard.press('Alt+3'); console.log('Alt+3 ->', await p.textContent('#ttl'));
  await p.click('[data-act=bell]'); console.log('bell items', await p.$$eval('#bellp .alert', l => l.length)); await p.click('#ttl');
  await p.click('[data-act=theme]');
  await p.click('#nav [data-v=home]'); await p.screenshot({ path: process.argv[2] });
  console.log(errs.length ? errs.join('\n') : 'Không lỗi JS'); await b.close();
})();
