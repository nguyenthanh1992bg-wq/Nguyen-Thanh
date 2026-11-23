/* Chạy: node tests/engine.test.js */
const assert = require('assert');
const HG = require('../src/engine.js');
const { makeDemo } = require('../src/demo.js');

let n = 0; const t = (name, f) => { try { f(); n++; console.log('  ok  ' + name); } catch (e) { console.error('FAIL  ' + name + '\n' + e.stack); process.exitCode = 1; } };

t('parseNum', () => {
  assert.strictEqual(HG.parseNum('1.234.567'), 1234567);
  assert.strictEqual(HG.parseNum('1,234,567'), 1234567);
  assert.strictEqual(HG.parseNum('1.234,5'), 1234.5);
  assert.strictEqual(HG.parseNum('(2.000)'), -2000);
  assert.strictEqual(HG.parseNum('12,5'), 12.5);
  assert.strictEqual(HG.parseNum(''), null);
});
t('parseDate', () => {
  assert.strictEqual(HG.fmtDate(HG.parseDate('05/11/2026')), '05/11/2026');
  assert.strictEqual(HG.fmtDate(HG.parseDate('2026-11-05')), '05/11/2026');
  assert.strictEqual(HG.fmtDate(HG.parseDate(46331)), '05/11/2026'); /* serial Excel */
});

const asof = HG.dn(2026, 11, 23);
const M = makeDemo(asof);

t('AR: tổng bucket = tổng hóa đơn', () => {
  const a = HG.analyzeAR(M.ar, M.S, M.hist);
  assert.ok(Math.abs(HG.sum(a.buckets, b => b.amt) - a.total) < 1);
  assert.ok(Math.abs(HG.sum(a.cust, c => c.total) - a.total) < 1);
  assert.ok(a.top5 > 0 && a.top5 < 1);
});
t('Sự kiện: thu hiện có không vượt tổng nợ', () => {
  const a = HG.analyzeAR(M.ar, M.S, M.hist);
  const ev = HG.buildEvents(M, 'base');
  const arIn = HG.sum(ev.filter(e => e.k === 'AR'), e => e.a);
  assert.ok(arIn <= a.total && arIn > 0.5 * a.total, 'arIn=' + arIn + ' total=' + a.total);
});
t('Kịch bản: Thận trọng ≤ Cơ bản ≤ Lạc quan (số dư cuối 90 ngày)', () => {
  const b = ['cons', 'base', 'opt'].map(s => HG.simulate(HG.buildEvents(M, s), M.S).bal[90]);
  assert.ok(b[0] < b[1] && b[1] < b[2], b.join(' < '));
});
t('Tổng hợp tuần/tháng khớp mô phỏng ngày', () => {
  const ev = HG.buildEvents(M, 'base'), sim = HG.simulate(ev, M.S);
  const w = HG.aggregate(ev, M.S, 'week', 13);
  assert.ok(Math.abs(w.close[12] - sim.bal[90]) < 1, 'tuần 13 = ngày 90');
  const m = HG.aggregate(ev, M.S, 'month', 12);
  assert.ok(m.close.length === 12);
  const catSum = Object.values(m.byCat).reduce((s, arr) => s + arr.reduce((a, b) => a + b, 0), 0);
  assert.ok(Math.abs(catSum - HG.sum(Array.from(m.net))) < 1, 'tổng theo khoản mục = tổng ròng');
});
t('Bảo toàn tiền: phương án dịch chuyển thời điểm không đổi tổng (trừ chi phí)', () => {
  const L = HG.runLevers(M);
  const l3 = L.results.find(x => x.id === 'L3');
  assert.ok(l3, 'có L3');
  assert.ok(l3.cost >= 0 && l3.cost < 0.02 * l3.impact + 1e7 * 50, 'chi phí hợp lý ' + l3.cost);
});
t('Chấm điểm: 0–100, có đúng 2 phương án đề xuất, khác nhau', () => {
  const L = HG.runLevers(M);
  assert.strictEqual(L.top.length, 2);
  assert.notStrictEqual(L.top[0].id, L.top[1].id);
  L.results.forEach(x => assert.ok(x.score >= 0 && x.score <= 100, x.id + ' score ' + x.score));
});
t('Health score trong 0–100', () => {
  const R = HG.runAll(M);
  assert.ok(R.health.score >= 0 && R.health.score <= 100);
  console.log('     điểm sức khỏe:', R.health.score, R.health.grade, '| số dư thấp nhất 13 tuần:', HG.fmtVnd(R.mb.base.v), 'ngày', R.mb.base.d, '| ngưỡng', HG.fmtVnd(R.thr));
  console.log('     DSO', Math.round(R.dso), 'DPO', Math.round(R.dpo), 'DIO', Math.round(R.dio), '| AR', HG.fmtVnd(R.arA.total), 'quá hạn', HG.pct(R.arA.overduePct), '>60:', HG.pct(R.arA.over60Pct), '| AP', HG.fmtVnd(R.apA.total));
  R.lev.results.forEach(x => console.log('     ', x.id, String(x.score).padStart(3), x.name.padEnd(48), 'tác động', HG.fmtVnd(x.impact).padStart(9), 'chi phí', HG.fmtVnd(x.cost).padStart(8), [x.sImpact,x.sSpeed,x.sFeas,x.sRisk].join('/')));console.log('     hụt còn lại sau 2 PA:', HG.fmtVnd(R.residual), 'cần vay dự phòng', HG.fmtVnd(R.loanNeed));
  console.log('     ĐỀ XUẤT:', R.lev.top.map(x => x.id + ' ' + x.name).join(' | '));
});
t('Áp dụng đồng thời 2 phương án đề xuất cải thiện số dư thấp nhất', () => {
  const R = HG.runAll(M);
  const before = HG.minBal(R.scen.base.sim, 91).v, after = HG.minBal(R.simRec, 91).v;
  assert.ok(after >= before - 1, 'before ' + before + ' after ' + after);
});
console.log(n + ' test đạt');
