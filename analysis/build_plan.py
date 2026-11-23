import sys; sys.path.insert(0, '/home/user/Nguyen-Thanh/analysis')
from plan_calc import *
import ap_model, calendar, statistics, json, openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter as L

OUT = '/home/user/Nguyen-Thanh/KE_HOACH_DONG_TIEN_T11-2026.xlsx'
BANK_NOW, CASH_NOW = 726173271, 699887202           # sổ NH đến 21/11 (2.710.474.258 + thu 8.280.936.753 − chi 10.265.237.740) ; quỹ TM đến 13/11
OPEN_BANK, OPEN_CASH = 2710474258, 692613645          # 01/11
# ---------------------------------------------------------------- 1. THỰC HIỆN
A, bank, cash = actuals()
# vay giải ngân trả thẳng NCC/lương (không qua sổ NH) – lấy từ file theo dõi vay
wbv = openpyxl.load_workbook(U + '89250733-Theo_doi_TK_vay_Ngan_hang.xlsx', data_only=True)
wsv = wbv['DANH SACH TAI KHOAN']; disb = []
for r in range(3, wsv.max_row + 1):
    d = wsv.cell(r, 4).value
    if isinstance(d, dt.datetime) and d.year == 2026 and d.month == 11 and wsv.cell(r, 7).value:
        disb.append((d.date(), wsv.cell(r, 7).value, str(wsv.cell(r, 20).value), wsv.cell(r, 2).value, wsv.cell(r, 3).value))
A['vay_gn'] = [0.0] * 5
for d, amt, who, bk, ctr in disb:
    A['vay_gn'][wk(d)] += amt
    A['luong' if who.strip().lower().startswith('lương') else 'ncc'][wk(d)] += amt
# ---------------------------------------------------------------- 2. CƠ SỞ DỰ BÁO THU CUỐI THÁNG
kh, inv, openbal, rec, by, obs = build(dt.date(2026, 11, 12))
allrec = collections.defaultdict(float)
for Lr in rec.values():
    for d, a in Lr: allrec[d] += a
def bds(y, m):
    n = calendar.monthrange(y, m)[1]; return [dt.date(y, m, d) for d in range(1, n + 1) if dt.date(y, m, d).weekday() < 5]
rank_vals = collections.defaultdict(list); hist_rows = []
for m in (6, 7, 8, 9, 10):
    Ld = bds(2026, m)[::-1]
    for i in range(6): rank_vals[i].append(allrec.get(Ld[i], 0))
    hist_rows.append((m, [allrec.get(Ld[i], 0) for i in range(6)], sum(v for d, v in allrec.items() if d.month == m)))
rank_mean = [statistics.mean(rank_vals[i]) for i in range(6)]
nov_bd = [d for d in bds(2026, 11) if d >= dt.date(2026, 11, 23)][::-1]       # 30,27,26,25,24,23
base_by_day = {d: rank_mean[i] for i, d in enumerate(nov_bd)}
# ---------------------------------------------------------------- 3. NCC: nhu cầu theo hạn
ap_open, apname, apled, apopen_bal, terms = ap_model.open_ap(dt.date(2026, 11, 13))
code2sup = {}
for o in ap_open: code2sup[o['code'].upper()] = o['sup']
paid_ap = collections.defaultdict(float)
for t in bank:
    if t['cat'] == 'ncc' and dt.date(2026, 11, 13) < t['d'] <= CUT_BANK:
        key = code2sup.get(str(t['code']).upper()) or next((o['sup'] for o in ap_open if o['sup'].strip().upper() == str(t['name']).strip().upper()), None)
        paid_ap[key] += t['chi']
aps = [dict(o) for o in ap_open if o['rem'] > 1]
unm = 0.0
for s, amt in paid_ap.items():
    for o in sorted([x for x in aps if x['sup'] == s], key=lambda x: x['due']):
        t = min(o['rem'], amt); o['rem'] -= t; amt -= t
    unm += max(amt, 0)
aps = [o for o in aps if o['rem'] > 1]
due_end = dt.date(2026, 11, 30)
need_over = sum(o['rem'] for o in aps if o['due'] < dt.date(2026, 11, 23)); need_nov = sum(o['rem'] for o in aps if dt.date(2026, 11, 23) <= o['due'] <= due_end); need_dec = sum(o['rem'] for o in aps if o['due'] > due_end)
# ---------------------------------------------------------------- 4. MÔ HÌNH NGÀY 22–30/11 (python – để chấm điểm phương án)
days = [dt.date(2026, 11, 22) + dt.timedelta(days=k) for k in range(9)]
MAND = {dt.date(2026,11,24): (933480211, 0), dt.date(2026,11,25): (73400000 + 87000000 + 11000000, 180000000), dt.date(2026,11,30): (300805596, 0)}
CP_DAILY = 1.258e9 / 21 * 1.0     # chi phí vận hành & khác: chạy theo tháng 10 (1,26 tỷ/21 ngày làm việc)
def simulate(factor=0.9, buffer=150e6, mod=None):
    mod = mod or {}
    bal = BANK_NOW + CASH_NOW; rows = []; minbal = (1e18, None)
    for i, d in enumerate(days):
        bd = d.weekday() < 5
        thu = base_by_day.get(d, 0) * factor + mod.get('thu', {}).get(d, 0)
        gn = mod.get('vay', {}).get(d, 0)
        g, l = MAND.get(d, (0, 0)); g -= mod.get('hoan_goc', {}).get(d, 0); g += mod.get('tang_goc', {}).get(d, 0)
        cp = CP_DAILY if bd else 0
        nxt = 0
        for j in range(i + 1, min(i + 4, len(days))):
            gg, ll = MAND.get(days[j], (0, 0)); gg -= mod.get('hoan_goc', {}).get(days[j], 0); gg += mod.get('tang_goc', {}).get(days[j], 0); nxt += gg + ll
        ncc_cap = max(0, bal + thu + gn - g - l - cp - buffer - nxt)
        ncc = max(0, round(ncc_cap, -5)) if bd else 0
        ncc_direct = mod.get('ncc_direct', {}).get(d, 0)      # NCC trả thẳng bằng giải ngân
        nb = bal + thu + gn - g - l - cp - ncc
        rows.append(dict(d=d, open=bal, thu=thu, gn=gn, g=g, l=l, cp=cp, ncc=ncc, close=nb, bd=bd))
        bal = nb
    cost = mod.get('cost', 0)
    return rows, cost
def summarize(rows, cost=0):
    return dict(min=min(r['close'] for r in rows), end=rows[-1]['close'], ncc=sum(r['ncc'] for r in rows), thu=sum(r['thu'] for r in rows), cost=cost)
# ---------------------------------------------------------------- 5. PHƯƠNG ÁN
base_rows, _ = simulate(); B = summarize(base_rows)
d24, d27, d30 = dt.date(2026,11,24), dt.date(2026,11,27), dt.date(2026,11,30)
levers = []
def add(id_, name, why, mod, cost, ttc, feas, risk, steps, kpi, who):
    r, c = simulate(mod=mod); S = summarize(r, cost); d_ncc = S['ncc'] - B['ncc']; levers.append(dict(id=id_, name=name, why=why, ncc=d_ncc, cost=cost, ttc=ttc, feas=feas, risk=risk, steps=steps, kpi=kpi, who=who, S=S, d_end=S['end'] - B['end']))
add('P1', 'Xin BIDV gia hạn/đảo nợ 2 khoản đáo hạn 24/11 (933,5 tr) & 30/11 (300,8 tr)', 'Hai khoản gốc BIDV chiếm 1,23 tỷ trong 7 ngày làm việc cuối tháng, trong khi tiền mặt+NH chỉ ~0,84 tỷ.',
    dict(hoan_goc={d24: 933480211, d30: 300805596}), 1234285807 * 0.003 + 1234285807 * 0.08 * 90 / 365, 2, 3, 3,
    ['Hôm nay (23/11): Phó GĐ + KT trưởng gặp BIDV, nộp phương án dòng tiền (file này) + danh sách khách sẽ trả cuối tháng.', 'Ưu tiên khoản 933,5 tr hạn 24/11: xin dời 3–5 ngày làm việc hoặc đảo nợ 90–180 ngày (hạn mức BIDV còn ~3,17 tỷ theo bảng TSĐB).', 'Khoản 300,8 tr hạn 30/11: đề nghị đảo nợ cùng đợt; chuẩn bị tất toán nếu thu cuối tháng đạt.', 'Không để phát sinh nợ quá hạn ngân hàng (ảnh hưởng CIC).'],
    'Có văn bản chấp thuận trước 24/11; không phát sinh nợ quá hạn NH.', 'Phó GĐ + KT trưởng')
add('P2', 'Giải ngân vay VCB/Vietinbank trả thẳng nhà cung cấp đến hạn (~2,0 tỷ)', 'Công ty đã dùng cách này hàng tháng (T9: 3,95 tỷ; T10: 3,02 tỷ; T11 mới 0,86 tỷ trả lương). Hạn mức còn: Vietinbank ~19,4 tỷ, BIDV ~3,2 tỷ (bảng TSĐB).',
    dict(vay={d27: 2.0e9}, ncc_direct={d27: 2.0e9}, thu={}), 2.0e9 * 0.04 * 179 / 365 + 2.0e9 * 0.002, 3, 4, 3,
    ['Chọn 6–10 NCC có hóa đơn quá hạn/đến hạn lớn nhất (sheet “Chi NCC ưu tiên”) để giải ngân trả thẳng (khế ước theo từng NCC như thực tế đang làm).', 'Ưu tiên VCB (lãi ~4%/năm, 179 ngày); dùng Vietinbank nếu VCB hết hạn mức.', 'Chỉ dùng cho NCC cần giữ quan hệ/giá; không dùng để trả chi phí lặp lại.', 'Theo dõi tổng dư nợ/vốn lưu động: không vượt trần nội bộ.'],
    'Số NCC quá hạn giảm; chi phí tài chính < 3% số giải ngân.', 'KT trưởng')
add('P3', 'Chiến dịch “chốt tiền trước 27/11” với 12 khách lớn thường trả cuối tháng', '5 tháng liên tiếp 8,1–9,0 tỷ (59–69% tiền thu cả tháng) dồn vào 6 ngày làm việc cuối tháng, riêng ngày cuối ~3,6 tỷ; kéo sớm 25% khoản ngày cuối về 24–26/11 giúp qua mốc trả gốc 24/11.',
    dict(thu={dt.date(2026,11,24): 0.25 * base_by_day[d30] * 0.9 * 0.5, dt.date(2026,11,25): 0.25 * base_by_day[d30] * 0.9 * 0.5, d30: -0.25 * base_by_day[d30] * 0.9}), 0, 3, 3, 1,
    ['Hôm nay: lấy danh sách khách (sheet “Thu KH”) → mỗi NVKD gọi chốt NGÀY chuyển tiền bằng email/Zalo, mục tiêu 24–26/11.', 'Phó GĐ gọi trực tiếp các khách ≥ 300 tr (Samju, Marukoh, Bigfun, Toyo Solar…).', 'Gửi sẵn đối chiếu công nợ + hóa đơn VAT để khách không viện lý do thiếu chứng từ.', 'Báo cáo tiền về lúc 11h và 16h mỗi ngày 24–30/11.'],
    'Tiền khách về 24–26/11 ≥ 1,0 tỷ.', 'Phó GĐ + Trưởng phòng KD')
add('P4', 'Chiết khấu thanh toán sớm 1% cho khách lớn không quá hạn', 'Khách tốt ít thanh toán trước hạn; chiết khấu 1% cho trả trong 3 ngày kéo thêm ~1,0 tỷ.',
    dict(thu={dt.date(2026,11,25): 0.6e9, dt.date(2026,11,26): 0.4e9}, cost=0), 1.0e9 * 0.01, 3, 4, 2,
    ['Chọn khách hạng A/B (không quá hạn) có hóa đơn đến hạn trong T12.', 'Gửi thư đề nghị: trả trước 27/11 được CK 1%.', 'Xác nhận cách hạch toán chiết khấu với kế toán trưởng.'], 'Tỷ lệ khách chấp nhận ≥ 35%.', 'KD + KT')
for lv in levers:
    if lv['id'] == 'P2': lv['impact_bal'] = 2.0e9       # NCC được trả thẳng bằng vay -> tiền giữ lại
    elif lv['id'] == 'P1': lv['impact_bal'] = 1234285807
    elif lv['id'] == 'P3': lv['impact_bal'] = 0.25 * base_by_day[d30] * 0.9
    elif lv['id'] == 'P4': lv['impact_bal'] = 1.0e9 * 0.99 * 0.6
# chấm điểm
W = dict(impact=40, speed=20, feas=25, risk=15)
need = 2.0e9
for lv in levers:
    lv['sI'] = round(min(100, lv['impact_bal'] / need * 100))
    lv['sS'] = round(max(0, min(100, 100 - (lv['ttc'] - 1) / 6 * 100)))
    lv['sF'] = lv['feas'] * 20
    ratio = lv['cost'] / max(lv['impact_bal'], 1)
    lv['sR'] = round(0.5 * max(0, min(100, 100 - ratio * 1000)) + 0.5 * ((5 - lv['risk']) / 4 * 100))
    lv['score'] = round((lv['sI'] * W['impact'] + lv['sS'] * W['speed'] + lv['sF'] * W['feas'] + lv['sR'] * W['risk']) / 100)
levers.sort(key=lambda x: -x['score'])
# ---------------------------------------------------------------- 6. LỊCH SỬ T6–T10 (báo cáo kế toán)
hist = json.load(open('/tmp/claude-0/-home-user-Nguyen-Thanh/79bc319a-108c-5b8f-b18e-02ca38b35d45/scratchpad/hist.json'))
if __name__ == '__main__':
    print('ACTUAL tuần (tr):'); 
    for k, l in LINES_IN + LINES_OUT + [('vay_gn', 'Vay GN')]: print(f'  {l[:36]:38}', [round(x/1e6) for x in A[k]])
    thu = sum(A['thu_kh']) + sum(A['thu_khac']) + sum(A['vay_gn']); chi = sum(sum(A[k]) for k, _ in LINES_OUT)
    print('  tổng thu', round(thu/1e6), 'chi', round(chi/1e6), '=> số dư cuối 21/11 theo tổng hợp', round((OPEN_BANK+OPEN_CASH+thu-chi)/1e6), 'so với sổ', round((BANK_NOW+CASH_NOW)/1e6))
    print('hạng ngày cuối tháng (TB):', [round(x/1e6) for x in rank_mean], '→ Nov', {d.strftime('%d/%m'): round(v/1e6) for d, v in base_by_day.items()})
    print('NCC nhu cầu: quá hạn', round(need_over/1e9, 2), 'đến hạn 23–30/11', round(need_nov/1e9, 2), 'T12+', round(need_dec/1e9, 2), 'chưa khớp thanh toán', round(unm/1e6))
    for f in (0.65, 0.9, 1.0):
        r, _ = simulate(f); s = summarize(r); print(f'KB hệ số {f}: min {s["min"]/1e6:.0f} cuối {s["end"]/1e6:.0f} NCC trả {s["ncc"]/1e6:.0f}', [round(x['close']/1e6) for x in r])
    r, _ = simulate(0.9)
    for x in r: print(x['d'], round(x['open']/1e6), '+', round(x['thu']/1e6), 'gốc', round(x['g']/1e6), 'lãi', round(x['l']/1e6), 'cp', round(x['cp']/1e6), 'NCC', round(x['ncc']/1e6), '=', round(x['close']/1e6))
    for lv in levers: print(lv['id'], lv['score'], lv['name'][:60], [lv['sI'], lv['sS'], lv['sF'], lv['sR']], 'impact', round(lv['impact_bal']/1e6), 'cost', round(lv['cost']/1e6))
