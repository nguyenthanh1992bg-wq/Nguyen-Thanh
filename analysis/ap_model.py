import openpyxl, datetime as dt, collections, re
U = '/root/.claude/uploads/79bc319a-108c-5b8f-b18e-02ca38b35d45/'
F_AP = U + '2c85c555-Chi_tiet_cong_no_phai_tra_nha_cung_cap.xlsx'
F_TERM = U + '0154ef8e-Han_thanh_toan_NCC_12.11.2026.xlsx'
num = lambda x: x if isinstance(x, (int, float)) else 0
D = lambda x: x.date() if isinstance(x, dt.datetime) else None

def parse_term(t):
    """Trả (kiểu, n): 'days' = N ngày sau ngày HĐ; 'eom' = cuối tháng + thanh toán ngày N tháng sau; 'now'= ngay; None = chưa rõ."""
    if isinstance(t, dt.datetime): return ('date', D(t))
    s = (str(t or '')).lower()
    m = re.search(r'cuối tháng.*?ngày\s*(\d{1,2})\s*tháng sau', s)
    if m: return ('eom', int(m.group(1)))
    m = re.search(r'(\d{1,3})\s*ngày', s)
    if m and 'cọc' not in s[:6]: return ('days', int(m.group(1)))
    if re.search(r'ngay sau|thanh toán ngay|tt ngay|ngay khi|tiền mặt|cọc|đặt cọc|trước', s): return ('days', 3)
    return (None, None)

def due_of(inv_date, term, default=30):
    k, n = term
    if k == 'date': return n
    if k == 'eom':
        y, m = inv_date.year, inv_date.month + 1
        if m > 12: y, m = y + 1, 1
        import calendar
        return dt.date(y, m, min(n, calendar.monthrange(y, m)[1]))
    if k == 'days': return inv_date + dt.timedelta(days=n)
    return inv_date + dt.timedelta(days=default)

def load_terms():
    ws = openpyxl.load_workbook(F_TERM, data_only=True, read_only=True).active
    out = {}
    for r in ws.iter_rows(min_row=5, values_only=True):
        if r[1]: out[str(r[1]).strip().upper()] = dict(term=parse_term(r[3]), raw=r[3], owner=r[4], note=r[5])
    return out

def load_ap():
    ws = openpyxl.load_workbook(F_AP, data_only=True, read_only=True).active
    sup = None; name = {}; led = collections.defaultdict(list); opening = {}
    for r in ws.iter_rows(min_row=6, values_only=True):
        a = r[0]
        if a and str(a).startswith('Tên nhà cung cấp:'): name_full = str(a).split(':', 1)[1].strip(); continue
        if not a: continue
        sup = a; name[sup] = name_full
        desc = r[5]
        if desc == 'Số dư đầu kỳ': opening[sup] = num(r[13]) - num(r[12]); continue
        if desc == 'Cộng': continue
        d = D(r[1])
        if d: led[sup].append(dict(d=d, doc=r[2], inv_date=D(r[3]), inv=r[4], desc=r[5], tk=r[7], no=num(r[10]), co=num(r[11])))
    return name, led, opening

def open_ap(asof):
    name, led, opening = load_ap(); terms = load_terms()
    bysup = {}
    for s, L in led.items():
        L.sort(key=lambda x: x['d'])
        # hóa đơn (Có) và thanh toán/điều chỉnh (Nợ). FIFO: Nợ trừ vào số dư đầu kỳ rồi hóa đơn cũ nhất.
        inv = [dict(date=x['inv_date'] or x['d'], ref=x['inv'] or x['doc'], amt=x['co'], rem=x['co']) for x in L if x['co'] > 0]
        pay = sum(x['no'] for x in L)
        ob = opening.get(s, 0)       # >0: còn nợ NCC đầu kỳ
        items = ([dict(date=dt.date(2026, 3, 31), ref='Dư đầu kỳ', amt=ob, rem=ob)] if ob > 0 else []) + inv
        if ob < 0: pay += ob          # NCC đang nợ ta (đã ứng trước) -> bù trừ
        for it in items:
            t = min(it['rem'], max(pay, 0)); it['rem'] -= t; pay -= t
        bysup[s] = [it for it in items if it['rem'] > 1]
        if pay > 1: bysup[s].append(dict(date=None, ref='Ứng trước/âm', amt=-pay, rem=-pay))
    out = []
    for s, L in bysup.items():
        tm = terms.get(name[s].strip().upper(), dict(term=(None, None), raw=None, owner='', note=''))
        for it in L:
            if it['date'] is None: due = asof
            else: due = due_of(it['date'], tm['term'])
            out.append(dict(sup=name[s], code=s, ref=it['ref'], date=it['date'], due=due, rem=it['rem'], term_raw=tm['raw'], owner=tm['owner'], known=tm['term'][0] is not None))
    return out, name, led, opening, terms
