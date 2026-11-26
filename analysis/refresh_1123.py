"""Cập nhật phải thu / phải trả đến 23/11/2026: hợp nhất file cũ (đến 12/11) với file mới (01–23/11)."""
import sys; sys.path.insert(0, '/home/user/Nguyen-Thanh/analysis')
import openpyxl, datetime as dt, collections
import ar_model, ap_model
U = ar_model.U
F_AR_NEW = U + '0e4e71fa-Chi_tiet_cong_no_phai_thu_khach_hang_tu_01.11_den_23.11.xlsx'
F_AP_NEW = U + '2cc1344a-Chi_tiet_cong_no_phai_tra_cac_tai_khoan_tu_01.11_den_23.11.xlsx'
num = lambda x: x if isinstance(x, (int, float)) else 0
D = lambda x: x.date() if isinstance(x, dt.datetime) else None
CUT_OLD = dt.date(2026, 11, 12)

def ar_open(asof=dt.date(2026, 11, 23)):
    kh, inv, openbal, rec, by, obs = ar_model.build(dt.date(2026, 11, 12))
    old_nos = {(i['cust'], str(i['no'])) for i in inv}
    ws = openpyxl.load_workbook(F_AR_NEW, data_only=True, read_only=True).active
    cust = None; new_inv = []; new_rec = collections.defaultdict(list); seen_rec = {(c, d, round(a)) for c, L in rec.items() for d, a in L}
    for r in ws.iter_rows(min_row=6, values_only=True):
        a = r[0]
        if a and str(a).startswith('Tên khách hàng:'): cust = str(a).split(':', 1)[1].strip(); continue
        d = D(r[2])
        if not d or not cust: continue
        no = str(r[5] or '')
        if num(r[9]) > 0 and no and (cust, no) not in old_nos and d > dt.date(2026, 11, 7):
            term = (kh.get(cust, {}).get('term') or 30)
            new_inv.append(dict(cust=cust, no=no, doc=r[3], date=D(r[4]) or d, due=(D(r[4]) or d) + dt.timedelta(days=term), amt=num(r[9]), rem=num(r[9]), nv=(kh.get(cust, {}).get('nv') or '')))
        if num(r[10]) > 0 and str(r[8] or '')[:2] == '11' and d > CUT_OLD and (cust, d, round(num(r[10]))) not in seen_rec:
            new_rec[cust].append((d, num(r[10])))
    opn = [dict(i) for i in inv if i['rem'] > 1]
    seen_no = set((i['cust'], i['no']) for i in new_inv); uniq = {}
    for i in new_inv: uniq[(i['cust'], i['no'])] = uniq.get((i['cust'], i['no']), 0) or i
    for k, i in uniq.items():
        dup = [x for x in new_inv if (x['cust'], x['no']) == k]
        i['amt'] = i['rem'] = sum(x['amt'] for x in dup)
    pool = opn + list(uniq.values()); unmatched = 0.0
    for c, L in new_rec.items():
        items = sorted([i for i in pool if i['cust'] == c and i['rem'] > 1], key=lambda x: (x['date'] or dt.date(2000, 1, 1)))
        for d, amt in sorted(L):
            for i in items:
                t = min(i['rem'], amt); i['rem'] -= t; amt -= t
                if amt <= 1: break
            unmatched += max(amt, 0)
    out = [i for i in pool if i['rem'] > 1]
    return out, kh, hist_from(obs), dict(new_invoices=len(uniq), new_inv_amt=sum(i['amt'] for i in uniq.values()), receipts=sum(a for L in new_rec.values() for d, a in L), unmatched=unmatched)

def hist_from(obs):
    E = dt.date(1970, 1, 1)
    return [dict(cust=o[0], due=(o[5]['due'] - E).days, paid=(o[5]['due'] + dt.timedelta(days=o[1]) - E).days, amt=round(o[3])) for o in obs if o[2] and o[5]['due']]

def ap_open(asof=dt.date(2026, 11, 23)):
    name, led, opening = ap_model.load_ap(); terms = ap_model.load_terms()
    ws = openpyxl.load_workbook(F_AP_NEW, data_only=True, read_only=True).active
    nm2 = {}; sup = None; added = 0; ex = {(s, x['d'], x['doc'], round(x['no']), round(x['co'])) for s, L in led.items() for x in L}
    for r in ws.iter_rows(min_row=6, values_only=True):
        a = r[0]
        if a and str(a).startswith('Tên nhà cung cấp:'): nm = str(a).split(':', 1)[1].strip(); continue
        if not a: continue
        sup = a; name.setdefault(sup, nm)
        if r[5] in ('Số dư đầu kỳ', 'Cộng'): continue
        d = D(r[1])
        if not d: continue
        key = (sup, d, r[2], round(num(r[10])), round(num(r[11])))
        if d > CUT_OLD and key not in ex:
            led.setdefault(sup, []).append(dict(d=d, doc=r[2], inv_date=D(r[3]), inv=r[4], desc=r[5], tk=r[7], no=num(r[10]), co=num(r[11]))); added += 1
    bysup = {}
    for s, L in led.items():
        L.sort(key=lambda x: x['d'])
        inv = [dict(date=x['inv_date'] or x['d'], ref=x['inv'] or x['doc'], amt=x['co'], rem=x['co']) for x in L if x['co'] > 0]
        pay = sum(x['no'] for x in L); ob = opening.get(s, 0)
        items = ([dict(date=dt.date(2026, 3, 31), ref='Dư đầu kỳ', amt=ob, rem=ob)] if ob > 0 else []) + inv
        if ob < 0: pay += ob
        for it in items:
            t = min(it['rem'], max(pay, 0)); it['rem'] -= t; pay -= t
        bysup[s] = [it for it in items if it['rem'] > 1]
    out = []
    for s, L in bysup.items():
        tm = terms.get(name[s].strip().upper(), dict(term=(None, None), raw=None, owner='', note=''))
        for it in L: out.append(dict(sup=name[s], code=s, ref=it['ref'], date=it['date'], due=ap_model.due_of(it['date'], tm['term']), rem=it['rem'], term_raw=tm['raw'], owner=tm['owner']))
    return out, added

if __name__ == '__main__':
    ar, kh, hist, st = ar_open(); print('AR mở', len(ar), round(sum(i['rem'] for i in ar) / 1e9, 2), 'tỷ | HĐ mới', st['new_invoices'], round(st['new_inv_amt'] / 1e9, 2), '| tiền khách trả 13–23/11', round(st['receipts'] / 1e9, 2), 'chưa khớp', round(st['unmatched'] / 1e6))
    ap, added = ap_open(); print('AP mở', len(ap), 'dòng mới', added, round(sum(i['rem'] for i in ap if i['rem'] > 0) / 1e9, 2), 'tỷ | quá hạn', round(sum(i['rem'] for i in ap if i['rem'] > 0 and i['due'] < dt.date(2026, 11, 24)) / 1e9, 2))
