const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + path.resolve(__dirname, '../Quan_tri_dong_tien_Hoang_Gia.html')); await p.waitForSelector('#main .card');
  await p.click('[data-act=demo]'); await p.waitForSelector('.hs .big');
  await p.click('#ribbon [data-act=ai]');
  for (const q of ['Điểm hụt tiền ở đâu?', 'Khách nào cần thu gấp?', 'Tháng này nên làm 2 việc gì?', 'Cty TNHH Thực phẩm An Phát thế nào']) { await p.fill('#aiin', q); await p.press('#aiin', 'Enter'); await p.waitForTimeout(150); }
  console.log((await p.$$eval('.aim .m.bot', m => m.map(x => x.textContent.slice(0, 110)))).join('\n'));
  // mock Claude
  await p.evaluate(() => { AI.use = true; AI.key = 'x'; window.fetch = async (u, o) => { window.__body = JSON.parse(o.body); return { ok: true, json: async () => ({ content: [{ text: '**Ok** KH1 cần gọi' }] }) }; }; });
  await p.fill('#aiin', 'soạn thư nhắc nợ'); await p.press('#aiin', 'Enter'); await p.waitForTimeout(300);
  console.log('claude reply:', await p.$eval('.aim .m.bot:last-child', e => e.textContent), '| ctx has real name?', await p.evaluate(() => /Cty/.test(window.__body.system)));
  await p.screenshot({ path: process.argv[2] || '/tmp/ai.png' });
  console.log(errs.length ? errs.join('\n') : 'Không lỗi JS'); await b.close();
})();
