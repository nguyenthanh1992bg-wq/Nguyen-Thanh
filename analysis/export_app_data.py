"""Xuất dữ liệu thật (đã xử lý) thành JSON nạp vào app. Kết quả ghi vào data_real/ (KHÔNG đưa lên git)."""
import sys, json; sys.path.insert(0, '/home/user/Nguyen-Thanh/analysis')
from build_plan import *
import write_xlsx_values as wv
E = dt.date(1970, 1, 1); dd = lambda d: (d - E).days if d else None
import refresh_1123 as rf
ar_o, kh_, hist, _st = rf.ar_open(); ap_o, _ = rf.ap_open()
ar = [dict(cust=i['cust'], ref=str(i['no'] or i['doc'] or ''), date=dd(i['date']), due=dd(i['due']), amt=round(i['rem']), owner=(kh_.get(i['cust'], {}) or {}).get('nv', '')) for i in ar_o if i['rem'] > 1]
ap = [dict(sup=o['sup'], ref=str(o['ref'] or ''), date=dd(o['date']), due=dd(o['due']), amt=round(o['rem']), grp='Nhà cung cấp hàng hóa, NVL') for o in ap_o if o['rem'] > 1]
KT2 = json.load(open('/tmp/kt2.json', encoding='utf-8'))
# khoản vay
loans = []
for r in range(3, wsv.max_row + 1):
    bal = wsv.cell(r, 16).value; bank_ = wsv.cell(r, 2).value
    if not bank_ or not isinstance(bal, (int, float)) or bal <= 0: continue
    mat = wsv.cell(r, 5).value; ctr = str(wsv.cell(r, 3).value); ncc = wsv.cell(r, 20).value
    amort = {'404002985072': 73400000, '806007070464': 11000000, '409005377447': 87000000}.get(ctr, 0)
    loans.append(dict(name=f'{bank_} {ctr}' + (f' → {str(ncc).strip()}' if ncc else ''), balance=round(bal), rate=wsv.cell(r, 18).value or 0, principal=amort, day=25,
                      maturity=dd(mat.date()) if isinstance(mat, dt.datetime) else None, roll=0 if bank_ == 'BIDV' else 100))
for nm, b in [('Cá nhân – Cô Đức', 1100000000), ('Cá nhân – Bác Đào Hải Dương', 529720000), ('Cá nhân – Chị Trang Ninh Bình', 150000000)]:
    loans.append(dict(name=nm, balance=b, rate=12, principal=0, day=1, maturity=None, roll=0))
rec = [dict(name='Chi phí vận hành & khác (gồm thuê nhà máy 990 tr, điện nước, vận chuyển…) – chạy theo T10', cat='vh', sign='chi', amt=1260000000, day=15, freq='M', start=KT2['asof'], end=None, disc=False),
       dict(name='BHXH, BHYT, BHTN', cat='luong', sign='chi', amt=87000000, day=4, freq='M', start=KT2['asof'], end=None, disc=False),
       dict(name='Thuế TNCN', cat='thue', sign='chi', amt=337000000, day=5, freq='M', start=KT2['asof'], end=None, disc=False)]
S = dict(asof=KT2['asof'], cash0=KT2['cash0'], minCash=None, monthlySales=14.7e9, growth=0, cashSalesPct=20, termDays=None, extraDelay=45, collectRate=97,
         purchasePct=55, purTermDays=None, apOverduePay=45, inventory=0.84e9, slowStock=0, targetDSO=60, targetOver60=10, targetTop5=40, monthEndPay=True, meShare=70, meHazard=45,
         bucketP=[0.95, 0.85, 0.75, 0.65, 0.45, 0.2], bucketWait=[0, 20, 35, 55, 90, 150],
         apGroups=[dict(name='Nhà cung cấp hàng hóa, NVL', stretch=10), dict(name='NCC chiến lược – không giãn', stretch=0)])
plan = wv.plan_json()
out = dict(ver='2026-11-22-real', model=dict(S=S, ar=ar, ap=ap, hist=hist, rec=rec, loans=loans, snaps=[]), plan11=plan)
json.dump(out, open('/home/user/Nguyen-Thanh/data_real/app_data.json', 'w', encoding='utf-8'), ensure_ascii=False)
print('AR', len(ar), 'AP', len(ap), 'hist', len(hist), 'loans', len(loans), 'JSON KB', round(len(json.dumps(out, ensure_ascii=False)) / 1024))
