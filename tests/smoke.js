/* Chạy: node tests/smoke.js [thư_mục_ảnh]  – mở app bằng Chromium, nạp dữ liệu mẫu, duyệt mọi tab, báo lỗi JS */
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const out = process.argv[2];
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '../Quan_tri_dong_tien_Hoang_Gia.html'));
  await p.waitForSelector('#main .card');
  p.on('dialog', d => d.accept());
  await p.click('[data-act=demo]');
  await p.waitForSelector('.hs .big');
  const tabs = ['home', 'ar', 'ap', 'cash', 'plan', 'strat', 'rep', 'data'];
  for (const t of tabs) {
    await p.click(`#nav [data-v=${t}]`); await p.waitForTimeout(150);
    const bad = await p.$$eval('#main .card h2', h => h.filter(x => x.textContent.includes('Lỗi')).length);
    console.log(t, 'cards', await p.$$eval('#main .card', c => c.length), bad ? 'LỖI HIỂN THỊ' : 'ok');
    if (out) await p.screenshot({ path: path.join(out, t + '.png'), fullPage: true });
  }
  // thử đổi kịch bản và kỳ
  await p.click('#nav [data-v=cash]'); await p.click('[data-act=scen][data-v=cons]'); await p.click('[data-act=view][data-v=month]');
  // giả lập chọn phương án
  await p.click('#nav [data-v=plan]'); await p.click('[data-act=selpa][data-v=L1]'); await p.click('[data-act=snap]');
  // sửa 1 thông số
  await p.click('#nav [data-v=data]'); await p.fill('[data-bind="S.cash0"]', '3,5 tỷ'); await p.press('[data-bind="S.cash0"]', 'Tab'); await p.waitForTimeout(400);
  console.log('cash0 =', await p.inputValue('[data-bind="S.cash0"]'));
  console.log(errs.length ? 'LỖI JS:\n' + errs.join('\n') : 'Không có lỗi JS');
  await b.close();
  process.exitCode = errs.length ? 1 : 0;
})();
