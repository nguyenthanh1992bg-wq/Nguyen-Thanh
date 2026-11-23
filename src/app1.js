/* =====================================================================
 * APP – phần lõi giao diện: trạng thái, tiện ích, biểu đồ SVG, bảng
 * ===================================================================== */
'use strict';
const { dn, ymd, dim, fmtDate, isoDate, parseDate, parseNum, keyOf, fmtVnd, pct, sum, clamp } = HG;
const LS_KEY = 'hg_cashflow_v1';
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fm = n => (n == null || isNaN(n)) ? '' : (Math.round(n / 1e6) || 0).toLocaleString('vi-VN');          /* triệu đồng */
const ff = n => (n == null || isNaN(n)) ? '' : Math.round(n).toLocaleString('vi-VN');                 /* VND đầy đủ */
const fT = n => (n / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
const f1 = n => n == null ? '–' : n.toLocaleString('vi-VN', { maximumFractionDigits: 1 });
const AGE_COL = ['#2e9e5b', '#d4b106', '#e8890c', '#d9480f', '#c62828', '#7f1d1d'];
const AP_COL = ['#c62828', '#d9480f', '#e8890c', '#d4b106', '#4f9bd9', '#2e9e5b'];

/* ---------------- trạng thái ---------------- */
function blankModel() { return { S: HG.defaultSettings(), ar: [], ap: [], hist: [], rec: [], loans: [], snaps: [] }; }
function deepMerge(base, add) {
  if (add == null || typeof add !== 'object' || Array.isArray(add)) return add === undefined ? base : add;
  const o = Array.isArray(base) ? base.slice() : Object.assign({}, base);
  Object.keys(add).forEach(k => { o[k] = (base && typeof base[k] === 'object' && !Array.isArray(base[k]) && base[k] !== null) ? deepMerge(base[k], add[k]) : add[k]; });
  return o;
}
function loadModel() {
  try {
    const t = localStorage.getItem(LS_KEY); if (!t) return blankModel();
    const j = JSON.parse(t), b = blankModel();
    return { S: deepMerge(b.S, j.S), ar: j.ar || [], ap: j.ap || [], hist: j.hist || [], rec: j.rec || [], loans: j.loans || [], snaps: j.snaps || [] };
  } catch (e) { return blankModel(); }
}
let M = loadModel(), R = null;
const UI = { tab: 'home', scen: 'base', view: 'week', sel: new Set(), q: '', grade: '', seg: '', cust: '', sort: {}, more: {}, apq: '', pending: null, planShow: 'all' };
let saveT = null;
function save() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(LS_KEY, JSON.stringify(M)); } catch (e) { toast('Không lưu được (bộ nhớ trình duyệt đầy) – hãy xuất file sao lưu'); } }, 150); }
function recalc() { R = M.ar.length || M.ap.length || M.S.cash0 ? HG.runAll(M) : null; }
function hasData() { return M.ar.length || M.ap.length; }
function toast(msg) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = msg; document.body.appendChild(d); setTimeout(() => d.remove(), 3200); }

/* ---------------- nhập liệu tiền: chấp nhận "1,5 tỷ", "300tr", "1.250.000" ---------------- */
function pm(v) {
  let s = String(v == null ? '' : v).trim().toLowerCase(); if (!s) return null;
  let mul = 1;
  if (/(tỷ|ty)(?![a-zà-ỹ])/.test(s)) mul = 1e9; else if (/(triệu|trieu|tr)(?![a-zà-ỹ])/.test(s)) mul = 1e6; else if (/(nghìn|ngàn|k)(?![a-zà-ỹ])/.test(s)) mul = 1e3;
  s = s.replace(/[^\d.,\-()]/g, ''); const n = parseNum(s); return n == null ? null : n * mul;
}

/* ---------------- liên kết ô nhập với dữ liệu ---------------- */
function getPath(path) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), M); }
function setPath(path, val) { const p = path.split('.'), last = p.pop(); const o = p.reduce((o, k) => o[k], M); o[last] = val; }
function inp(path, type, o = {}) {
  const v = getPath(path); let val = '';
  if (type === 'money') val = v == null || v === '' ? '' : ff(v);
  else if (type === 'date') val = v == null ? '' : isoDate(v);
  else if (type === 'pct') val = v == null ? '' : Math.round(v * 1000) / 10;
  else val = v == null ? '' : v;
  const attr = `data-bind="${path}" data-t="${type}" ${o.ph ? `placeholder="${esc(o.ph)}"` : ''} ${o.title ? `title="${esc(o.title)}"` : ''}`;
  if (type === 'date') return `<input type="date" ${attr} value="${val}">`;
  if (type === 'check') return `<input type="checkbox" ${attr} ${v ? 'checked' : ''}>`;
  if (type === 'select') return `<select ${attr}>${o.opts.map(([k, l]) => `<option value="${esc(k)}" ${String(v) === String(k) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  return `<input type="text" class="${type === 'money' || type === 'num' || type === 'pct' ? 'num' : ''}" ${attr} value="${esc(val)}">`;
}
function onBind(el) {
  const path = el.dataset.bind, t = el.dataset.t; let v;
  if (t === 'money') v = el.value.trim() === '' ? null : pm(el.value);
  else if (t === 'num') { v = el.value.trim() === '' ? null : parseNum(el.value); }
  else if (t === 'pct') { v = el.value.trim() === '' ? null : parseNum(el.value); if (v != null) v /= 100; }
  else if (t === 'date') v = parseDate(el.value);
  else if (t === 'check') v = el.checked;
  else v = el.value;
  setPath(path, v); save(); recalc(); render(true);
}

/* ---------------- bảng ---------------- */
function tbl(id, cols, rows, o = {}) {
  const st = UI.sort[id] || o.sort || null;
  let data = rows.slice();
  if (st) { const c = cols[st.k]; if (c && c.v) { data.sort((a, b) => { const x = c.v(a), y = c.v(b); return (x > y ? 1 : x < y ? -1 : 0) * (st.dir === 'asc' ? 1 : -1); }); } }
  const lim = o.limit || 100, shown = UI.more[id] ? data : data.slice(0, lim);
  const head = cols.map((c, i) => `<th class="${c.v ? 'sort' : ''} ${c.c === 'n' ? 'n' : ''}" ${c.v ? `data-act="sort" data-id="${id}" data-k="${i}"` : ''} ${c.t ? `title="${esc(c.t)}"` : ''}>${c.h}${st && st.k === i ? (st.dir === 'asc' ? ' ▲' : ' ▼') : ''}</th>`).join('');
  const body = shown.map(r => `<tr ${o.rowAttr ? o.rowAttr(r) : ''}>${cols.map(c => { const cls = typeof c.cls === 'function' ? c.cls(r) : (c.cls || ''); return `<td class="${c.c || ''} ${cls}">${c.f(r)}</td>`; }).join('')}</tr>`).join('');
  const foot = o.foot ? `<tr class="tot">${o.foot.map((x, i) => `<td class="${cols[i].c || ''}">${x}</td>`).join('')}</tr>` : '';
  const more = data.length > shown.length ? `<div style="padding:6px"><button class="s" data-act="more" data-id="${id}">Hiện tất cả ${data.length} dòng</button></div>` : '';
  if (!data.length) return `<p class="note">${o.empty || 'Chưa có dữ liệu.'}</p>`;
  return `<div class="tw ${o.nomax ? 'nomax' : ''}"><table class="${o.cls || ''}"><thead><tr>${head}</tr></thead><tbody>${body}${foot}</tbody></table>${more}</div>`;
}

/* ---------------- biểu đồ SVG ---------------- */
function niceTicks(mn, mx, n = 5) {
  if (mx - mn < 1) { mx = mn + 1; }
  const raw = (mx - mn) / n, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
  const step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
  const a = Math.floor(mn / step) * step, b = Math.ceil(mx / step) * step, t = [];
  for (let v = a; v <= b + step / 2; v += step) t.push(v);
  return t;
}
function lineChart(o) {
  const W = o.w || 940, H = o.h || 300, L = 54, Rr = 14, T = 14, B = 34, n = o.labels.length, yd = o.yDiv || 1e9, vf = o.fmt || fmtVnd;
  let all = [0]; o.series.forEach(s => s.vals.forEach(v => all.push(v))); if (o.thr != null) all.push(o.thr);
  const ticks = niceTicks(Math.min(...all), Math.max(...all)), mn = ticks[0], mx = ticks[ticks.length - 1];
  const X = i => L + (n <= 1 ? 0 : i * (W - L - Rr) / (n - 1)), Y = v => T + (mx - v) / (mx - mn) * (H - T - B);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.title || 'Biểu đồ')}">`;
  ticks.forEach(t => { s += `<line x1="${L}" x2="${W - Rr}" y1="${Y(t)}" y2="${Y(t)}" stroke="${t === 0 ? '#475569' : '#e2e8f0'}" stroke-width="${t === 0 ? 1.4 : 1}"/><text x="${L - 6}" y="${Y(t) + 4}" text-anchor="end" font-size="11" fill="#64748b">${(t / yd).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}</text>`; });
  if (mn < 0) s += `<rect x="${L}" y="${Y(0)}" width="${W - L - Rr}" height="${Y(mn) - Y(0)}" fill="#c62828" opacity=".06"/>`;
  if (o.thr != null) s += `<line x1="${L}" x2="${W - Rr}" y1="${Y(o.thr)}" y2="${Y(o.thr)}" stroke="#d9480f" stroke-dasharray="6 4" stroke-width="1.4"/><text x="${W - Rr - 4}" y="${Y(o.thr) - 4}" text-anchor="end" font-size="11" fill="#d9480f">Ngưỡng an toàn ${fmtVnd(o.thr)}</text>`;
  const every = Math.max(1, Math.ceil(n / (o.maxX || 14)));
  o.labels.forEach((l, i) => { if (i % every === 0) s += `<text x="${X(i)}" y="${H - B + 15}" text-anchor="middle" font-size="11" fill="#64748b">${esc(l)}</text>`; });
  o.series.forEach(se => {
    const pts = se.vals.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
    s += `<polyline points="${pts}" fill="none" stroke="${se.color}" stroke-width="${se.width || 2.2}" ${se.dash ? 'stroke-dasharray="7 4"' : ''} stroke-linejoin="round"/>`;
    if (n <= 16) se.vals.forEach((v, i) => { s += `<circle cx="${X(i)}" cy="${Y(v)}" r="3" fill="${se.color}"/>`; });
  });
  const cw = (W - L - Rr) / Math.max(1, n - 1);
  o.labels.forEach((l, i) => { s += `<rect x="${X(i) - cw / 2}" y="${T}" width="${cw}" height="${H - T - B}" fill="transparent"><title>${esc(o.tips ? o.tips[i] : l)}: ${o.series.map(se => se.name + ' ' + vf(se.vals[i])).join(' · ')}</title></rect>`; });
  s += '</svg>';
  s += `<div class="legend"><span style="--c:transparent">Đơn vị: ${o.unit || 'tỷ đồng'}</span>${o.series.map(se => `<span class="${se.dash ? 'dash' : ''}" style="--c:${se.color}">${esc(se.name)}</span>`).join('')}${o.thr != null ? '<span class="dash" style="--c:#d9480f">Ngưỡng an toàn</span>' : ''}</div>`;
  return s;
}
function barChart(o) {
  const W = o.w || 940, H = o.h || 260, L = 54, Rr = 10, T = 12, B = 30, n = o.labels.length;
  const all = [0]; o.ins.forEach((v, i) => { all.push(v); all.push(o.outs[i]); });
  const ticks = niceTicks(Math.min(...all), Math.max(...all)), mn = ticks[0], mx = ticks[ticks.length - 1];
  const Y = v => T + (mx - v) / (mx - mn) * (H - T - B), cw = (W - L - Rr) / n, bw = Math.min(26, cw * 0.36);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.title || '')}">`;
  ticks.forEach(t => { s += `<line x1="${L}" x2="${W - Rr}" y1="${Y(t)}" y2="${Y(t)}" stroke="${t === 0 ? '#475569' : '#e2e8f0'}"/><text x="${L - 6}" y="${Y(t) + 4}" text-anchor="end" font-size="11" fill="#64748b">${(t / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}</text>`; });
  o.labels.forEach((l, i) => {
    const cx = L + cw * (i + 0.5);
    s += `<rect x="${cx - bw - 1}" y="${Y(Math.max(o.ins[i], 0))}" width="${bw}" height="${Math.abs(Y(o.ins[i]) - Y(0))}" fill="#2563eb"><title>${esc(l)} – Thu ${fmtVnd(o.ins[i])}</title></rect>`;
    s += `<rect x="${cx + 1}" y="${Y(0)}" width="${bw}" height="${Math.abs(Y(o.outs[i]) - Y(0))}" fill="#e8890c"><title>${esc(l)} – Chi ${fmtVnd(o.outs[i])}</title></rect>`;
    s += `<text x="${cx}" y="${H - B + 15}" text-anchor="middle" font-size="11" fill="#64748b">${esc(l)}</text>`;
  });
  s += '</svg><div class="legend"><span class="box" style="--c:#2563eb">Tiền thu</span><span class="box" style="--c:#e8890c">Tiền chi</span></div>';
  return s;
}
function stackBar(items, total, colors) {
  const t = total || 1;
  return `<div class="bar">${items.map((x, i) => x.amt > 0 ? `<i style="width:${(100 * x.amt / t).toFixed(2)}%;background:${colors[i]}" title="${esc(x.l)}: ${fm(x.amt)} tr (${pct(x.amt / t)})"></i>` : '').join('')}</div>
  <div class="leg">${items.map((x, i) => `<span><b style="background:${colors[i]}"></b>${esc(x.l)}: <strong>${fm(x.amt)}</strong> tr (${pct(x.amt / t)})</span>`).join('')}</div>`;
}
const kpi = (l, v, s, cls) => `<div class="kpi ${cls || ''}"><div class="l">${l}</div><div class="v">${v}</div><div class="s">${s || ''}</div></div>`;
const pill = (t, c) => `<span class="pill" style="background:${c}">${t}</span>`;
const GRADE_COL = { A: '#1e8449', B: '#d4a017', C: '#e8890c', D: '#c62828' };
const gradePill = g => pill('Hạng ' + g, GRADE_COL[g]);
