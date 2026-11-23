import sys; sys.path.insert(0,'.')
from ar_model import *
import statistics
kh, inv, openbal, rec, by, obs = build(dt.date(2026,11,12))
S_g = km([(o[1], o[2], o[3]) for o in obs]); S_inv = km([(o[4], o[2], o[3]) for o in obs], lo=0)
allrec = sorted((d, a) for L in rec.values() for d, a in L)
def forecast(asof, H):
    exp = 0.0
    for L in by.values():
        for i in L:
            if i['date'] > asof: continue
            net = i['amt'] - i['ret']
            paid_to = sum(a for d, a in i['alloc'] if d <= asof)
            rem = net - paid_to
            if rem <= 1 or i['due'] is None: continue
            a = max(-60, min(399, (asof - i['due']).days)); s0 = max(S_g[a], 0.02)
            for k in range(1, H + 1): exp += rem * max(0, S_g[min(399, a + k - 1)] - S_g[min(399, a + k)]) / s0
    per_day = 14.7e9 / 30.4
    for s in range(1, H + 1):       # bán hàng mới trong cửa sổ
        for k in range(s, H + 1):
            age = k - s; exp += per_day * max(0, (S_inv[age - 1] - S_inv[age]) if age >= 1 else 1 - S_inv[0])
    return exp
res = []
for start in [dt.date(2026, m, d) for m, d in [(7,10),(7,25),(8,10),(8,25),(9,10),(9,25),(10,5),(10,20),(11,1)]]:
    H = 9; end = start + dt.timedelta(days=H)
    actual = sum(a for d, a in allrec if start < d <= end); f = forecast(start, H)
    res.append(actual / f); print(start, 'dự báo', round(f/1e6), 'thực tế', round(actual/1e6), 'tỷ lệ', round(actual/f, 2))
print('trung vị tỷ lệ', round(statistics.median(res), 2), 'TB', round(sum(res)/len(res), 2))
