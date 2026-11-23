"""Tính kế hoạch dòng tiền T11/2026: thực hiện (sổ NH + quỹ TM) đến 21/11 + dự báo 22–30/11."""
import sys; sys.path.insert(0, '/home/user/Nguyen-Thanh/analysis')
from ar_model import *
import ap_model, bank_model as bm
import openpyxl, collections, datetime as dt

U = '/root/.claude/uploads/79bc319a-108c-5b8f-b18e-02ca38b35d45/'
F_CASH = U + '7922dfb3-So_ke_toan_chi_tiet_quy_tien_mat_T11_den_13-11.xlsx'
CUT_BANK = dt.date(2026, 11, 21); CUT_CASH = dt.date(2026, 11, 13)
WEEKS = [('Tuần 1 (01–08/11)', dt.date(2026,11,1), dt.date(2026,11,8)), ('Tuần 2 (09–15/11)', dt.date(2026,11,9), dt.date(2026,11,15)),
         ('Tuần 3 (16–22/11)', dt.date(2026,11,16), dt.date(2026,11,22)), ('Tuần 4 (23–29/11)', dt.date(2026,11,23), dt.date(2026,11,29)), ('Tuần 5 (30/11)', dt.date(2026,11,30), dt.date(2026,11,30))]
def wk(d):
    for i, (_, a, b) in enumerate(WEEKS):
        if a <= d <= b: return i
LINES_IN = [('thu_kh', 'Thu công nợ khách hàng'), ('thu_khac', 'Thu khác (hoàn ứng, tiền mặt khác)')]
LINES_OUT = [('ncc', 'Chi thanh toán nhà cung cấp'), ('luong', 'Chi lương, thưởng'), ('bh', 'Chi BHXH, BHYT, BHTN'), ('thue', 'Chi thuế (TNCN, GTGT…)'), ('vay', 'Trả gốc vay ngân hàng'), ('lai', 'Trả lãi vay'), ('cp', 'Chi phí vận hành & khác (gồm tạm ứng)')]
def line_of(cat, thu):
    if thu: return 'thu_kh' if cat == 'thu_kh' else 'thu_khac'
    return {'ncc': 'ncc', 'luong': 'luong', 'bh': 'bh', 'thue': 'thue', 'vay': 'vay', 'lai': 'lai'}.get(cat, 'cp')

def load_cash():
    ws = openpyxl.load_workbook(F_CASH, data_only=True, read_only=True).active
    out = []
    for r in ws.iter_rows(min_row=7, values_only=True):
        if not isinstance(r[0], dt.datetime): continue
        tk = str(r[6] or ''); thu = r[7] if isinstance(r[7], (int, float)) else 0; chi = r[8] if isinstance(r[8], (int, float)) else 0
        out.append(dict(d=r[0].date(), desc=r[4], tk=tk, thu=thu, chi=chi, cat=bm.cat_of(tk)))
    return out

def actuals():
    bank, _ = bm.load(bm.F_NOV); cash = load_cash()
    A = {k: [0.0]*5 for k, _ in LINES_IN + LINES_OUT}
    for t in bank:
        if t['d'] > CUT_BANK or t['cat'] == 'noibo': continue
        i = wk(t['d'])
        if t['thu']: A[line_of(t['cat'], True)][i] += t['thu']
        if t['chi']: A[line_of(t['cat'], False)][i] += t['chi']
    for t in cash:
        if t['d'] > CUT_CASH or t['cat'] == 'noibo': continue
        i = wk(t['d'])
        if t['thu']: A[line_of(t['cat'], True)][i] += t['thu']
        if t['chi']: A[line_of(t['cat'], False)][i] += t['chi']
    return A, bank, cash

def ar_forecast(asof_model=dt.date(2026, 11, 12), cut=CUT_BANK, end=dt.date(2026, 11, 30), mult=1.0, shift=0):
    """Dự báo thu KH ngày (cut+1 .. end): hóa đơn đang mở (đã trừ tiền khách đã trả sau asof_model theo sổ NH) + bán hàng mới."""
    kh, inv, openbal, rec, by, obs = build(asof_model)
    S_g = km([(o[1], o[2], o[3]) for o in obs])
    S_inv = km([(o[4], o[2], o[3]) for o in obs], lo=0)       # thời gian từ HĐ đến ngày thu
    perc = collections.defaultdict(list)
    for o in obs: perc[o[0]].append(o)
    S_c = {c: km([(o[1], o[2], o[3]) for o in L]) for c, L in perc.items() if len(L) >= 10 and sum(1 for o in L if o[2]) >= 6}
    code2name = {v['code']: k for k, v in kh.items()}
    by_up = {k.strip().upper(): k for k in by}
    # trừ tiền khách đã trả từ asof_model+1 .. cut (theo sổ NH) – FIFO hóa đơn cũ nhất
    bank, _ = bm.load(bm.F_NOV)
    paid_after = collections.defaultdict(float)
    for t in bank:
        if t['cat'] == 'thu_kh' and asof_model < t['d'] <= cut:
            nm = by_up.get(str(t['name']).strip().upper()) or code2name.get(t.get('code')) or code2name.get(t['name'])
            paid_after[nm] += t['thu']
    opn = [dict(i) for i in inv if i['rem'] > 1]
    unmatched = 0.0
    for c, amt in paid_after.items():
        L = sorted([i for i in opn if i['cust'] == c], key=lambda x: (x['date'] or dt.date(2000, 1, 1)))
        for i in L:
            t = min(i['rem'], amt); i['rem'] -= t; amt -= t
        if c is None or amt > 1: unmatched += amt
    days = [(cut + dt.timedelta(days=k)) for k in range(1, (end - cut).days + 1)]
    daily = collections.defaultdict(float); detail = collections.defaultdict(float); bycust_over = collections.defaultdict(float)
    for i in opn:
        if i['rem'] <= 1 or i['due'] is None: continue
        S = S_c.get(i['cust'], S_g); a = (cut - i['due']).days
        a = max(-60, min(399, a)); s0 = S[a]
        if s0 < 0.02: s0 = max(S[a], 0.02) ; 
        for d in days:
            k = (d - cut).days; a1 = min(400, a + k)
            p = max(0, (S[min(399, a + k - 1)] - S[min(399, a1 if a1 <= 399 else 399)])) / s0
            amt = i['rem'] * p * mult
            daily[d] += amt; detail[i['cust']] += amt
    # bán hàng mới (chưa vào sổ): từ 08/11 đến end, bình quân 3 tháng gần nhất
    sales_m = 14.7e9; per_day = sales_m / 30.4
    for s in range(0, (end - dt.date(2026, 11, 8)).days + 1):
        sd = dt.date(2026, 11, 8) + dt.timedelta(days=s)
        for d in days:
            age = (d - sd).days
            if age < 0 or age > 399: continue
            p = (S_inv[age - 1] - S_inv[age]) if age >= 1 else (1 - S_inv[0])
            daily[d] += per_day * max(0, p) * mult
    return dict(opn=opn, kh=kh, daily=daily, detail=detail, unmatched=unmatched, S_g=S_g, n_open=len(opn), open_total=sum(i['rem'] for i in opn))

if __name__ == '__main__':
    A, bank, cash = actuals()
    print('THỰC HIỆN theo tuần (triệu):')
    for k, l in LINES_IN + LINES_OUT: print(f'{l[:38]:40}', [round(x/1e6) for x in A[k]], round(sum(A[k])/1e6))
    # backtest: mô hình tại 12/11 dự báo 13–21/11 vs thực tế
    f = ar_forecast(asof_model=dt.date(2026, 11, 5), cut=dt.date(2026, 11, 12), end=dt.date(2026, 11, 21))
    tx = [t for t in bank if t['cat'] == 'thu_kh' and dt.date(2026, 11, 13) <= t['d'] <= dt.date(2026, 11, 21)]
    print('BACKTEST (mốc 5/11→ dự báo 13–21/11): dự báo', round(sum(f['daily'].values())/1e6), 'thực tế', round(sum(t['thu'] for t in tx)/1e6))
    f = ar_forecast()
    tot = sum(f['daily'].values()); print('DỰ BÁO thu KH 22–30/11:', round(tot/1e6), 'mở', f['n_open'], round(f['open_total']/1e9, 2), 'chưa khớp', round(f['unmatched']/1e6))
    for w in range(2, 5):
        print(WEEKS[w][0], round(sum(v for d, v in f['daily'].items() if wk(d) == w)/1e6))
    for k, v in sorted(f['detail'].items(), key=lambda x: -x[1])[:8]: print(' ', str(k)[:44], round(v/1e6))
