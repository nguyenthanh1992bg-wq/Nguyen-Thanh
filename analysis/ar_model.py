"""Mô hình thu tiền phải thu từ sổ 131 thật: FIFO -> độ trễ thanh toán -> Kaplan-Meier -> dự báo thu theo ngày."""
import openpyxl, datetime as dt, collections, math, pickle, sys
U = '/root/.claude/uploads/79bc319a-108c-5b8f-b18e-02ca38b35d45/'
F_INV = U + '8fdf88aa-Chi_tiet_cong_no_phai_thu_theo_hoa_don.xlsx'
F_TX = U + '949b118f-Chi_tiet_cong_no_phai_thu_khach_hang.xlsx'
F_KH = U + '4f3fb15b-Danh_sach_khach_hang_19.xlsx'
D = lambda x: x.date() if isinstance(x, dt.datetime) else x
num = lambda x: x if isinstance(x, (int, float)) else 0

def load():
    # --- danh sách khách: số ngày nợ, nhân viên
    ws = openpyxl.load_workbook(F_KH, data_only=True, read_only=True).active
    kh = {}
    for r in ws.iter_rows(min_row=4, values_only=True):
        if r[2]: kh[str(r[2]).strip()] = dict(code=r[1], term=r[7], nv=(str(r[9]).split('_')[0] if r[9] else ''))
    # --- hóa đơn
    ws = openpyxl.load_workbook(F_INV, data_only=True, read_only=True).active
    inv, cust, openbal = [], None, {}
    for r in ws.iter_rows(min_row=5, values_only=True):
        a = r[0]
        if a and str(a).startswith('Tên khách hàng:'):
            cust = str(a).split(':', 1)[1].strip(); openbal[cust] = num(r[7]); continue
        if cust and (r[3] or r[4]) and r[0] != 'Tổng cộng':
            inv.append(dict(cust=cust, date=D(r[2]), doc=r[3], no=r[4], due=D(r[6]) if isinstance(r[6], dt.datetime) else None, amt=num(r[8]), ret=num(r[9]), ck=num(r[10]), paid=num(r[11]), rem=num(r[12]), grp=r[0] or r[1], nv=r[1]))
    # --- sổ chi tiết: thu tiền theo ngày
    ws = openpyxl.load_workbook(F_TX, data_only=True, read_only=True).active
    rec = collections.defaultdict(list); cust = None
    for r in ws.iter_rows(min_row=6, values_only=True):
        a = r[0]
        if a and str(a).startswith('Tên khách hàng:'): cust = str(a).split(':', 1)[1].strip(); continue
        if isinstance(r[2], dt.datetime) and num(r[10]) > 0 and str(r[8] or '')[:2] in ('11',):   # Có 131, đối ứng 111/112 = khách trả tiền
            rec[cust].append((D(r[2]), r[10]))
    return kh, inv, openbal, rec

def build(asof):
    kh, inv, openbal, rec = load()
    # ngày đến hạn thiếu -> ngày HĐ + số ngày nợ khách (mặc định 30)
    for i in inv:
        i['due_missing'] = i['due'] is None
        if i['due'] is None and i['date']: i['due'] = i['date'] + dt.timedelta(days=(kh.get(i['cust'], {}).get('term') or 30))
    # FIFO: phân bổ tiền thu cho hóa đơn cũ nhất trước (theo khách) để suy ra ngày trả
    by = collections.defaultdict(list)
    for i in inv:
        if i['amt'] > 0 and i['date']: by[i['cust']].append(i)
    for c, L in by.items():
        L.sort(key=lambda x: (x['date'], str(x['no'])))
        R = sorted(rec.get(c, []))
        ob = openbal.get(c, 0)    # số dư đầu kỳ: trả trước
        pool = collections.deque(R); ob_left = max(0, ob)
        for i in L: i['alloc'] = []
        # tiền thu đầu tiên trả nợ đầu kỳ
        k = 0
        for d, a in R:
            a_left = a
            if ob_left > 0:
                t = min(ob_left, a_left); ob_left -= t; a_left -= t
            while a_left > 1 and k < len(L):
                need = L[k]['amt'] - L[k]['ret'] - sum(x[1] for x in L[k]['alloc'])
                if need <= 1: k += 1; continue
                t = min(need, a_left); L[k]['alloc'].append((d, t)); a_left -= t
                if t >= need - 1: k += 1
    # độ trễ quan sát
    obs = []   # (cust, delay_days, observed:bool, amt)
    for c, L in by.items():
        for i in L:
            net = i['amt'] - i['ret']
            if net <= 1 or i['due'] is None: continue
            got = sum(x[1] for x in i['alloc'])
            if got >= net - 1 and i['alloc']:
                paid = max(x[0] for x in i['alloc'])
                obs.append((c, (paid - i['due']).days, True, net, (paid - i['date']).days, i))
            else:
                age = (asof - i['due']).days
                obs.append((c, age, False, net, (asof - i['date']).days, i))
    return kh, inv, openbal, rec, by, obs

def km(points, lo=-60, hi=400):
    """points: list of (t, observed, weight). Trả S[t] = P(delay > t) trên lưới ngày."""
    ev = collections.Counter(); cen = collections.Counter()
    for t, o, w in points:
        t = max(lo, min(hi, t))
        (ev if o else cen)[t] += w
    S = {}; s = 1.0
    atrisk = sum(w for _, _, w in points)
    for t in range(lo, hi + 1):
        if atrisk > 0 and ev[t] > 0: s *= (1 - ev[t] / atrisk)
        S[t] = s
        atrisk -= ev[t] + cen[t]
    return S
