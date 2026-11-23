"""Lập kế hoạch T11/2026 THEO LỊCH SỬ (T6–T10) đúng mẫu kế toán – không dùng số thực tế của tháng 11."""
import openpyxl, statistics, collections, re, json
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
U = '/root/.claude/uploads/79bc319a-108c-5b8f-b18e-02ca38b35d45/'
FILES = {'T6': ('1eec08a6-B_O_C_O_D_NG_TI_N_T6-2906.xlsx', 'KH 6.2026-3006'), 'T7': ('2bb5838d-B_O_C_O_D_NG_TI_N_T7-0308.xlsx', 'KH 7.2026-0607'),
         'T8': ('eaece420-B_O_C_O_D_NG_TI_N_T8_-T4_2208.xlsx', 'KH 8.2026-2208'), 'T9': ('30c56cb0-B_O_C_O_D_NG_TI_N_T9-2609.xlsx', 'KH 9.2026-2009'), 'T10': ('1786d1bf-B_O_C_O_D_NG_TI_N_T10f-3010.xlsx', 'KH 10,26-')}
num = lambda x: x if isinstance(x, (int, float)) else 0
def parse(ws):
    """label -> dict(plan=[5], act=[5], mplan, mact) – cột tuần nhận theo tiêu đề dòng 12."""
    wcols = [c for c in range(1, ws.max_column + 1) if str(ws.cell(12, c).value or '').startswith('Tuần')]
    # cột tháng: 'Kế hoạch','Thực hiện' đầu tiên ở dòng 13
    mk = mt = None
    for c in range(4, 12):
        h = str(ws.cell(13, c).value or '')
        if h == 'Kế hoạch' and mk is None: mk = c
        if h == 'Thực hiện' and mt is None: mt = c
    out = {}; cnt = collections.Counter()
    for r in range(14, ws.max_row + 1):
        lab = ws.cell(r, 3).value
        if lab is None: continue
        lab = re.sub(r'\s+', ' ', str(lab)).strip(); cnt[lab] += 1; lab = (lab, cnt[lab])
        plan, act = [], []
        for c in wcols[:5]:
            # trong từng nhóm tuần: cột đầu = kế hoạch, cột kế tiếp = thực hiện (nhóm T8/T9 có xen cột 'Thời gian')
            hs = [str(ws.cell(13, c + k).value or '') for k in range(4)]
            ip = c + hs.index('Kế hoạch') if 'Kế hoạch' in hs else c; ia = c + hs.index('Thực hiện') if 'Thực hiện' in hs else c + 1
            plan.append(num(ws.cell(r, ip).value)); act.append(num(ws.cell(r, ia).value))
        out.setdefault(lab, dict(plan=plan, act=act, mplan=num(ws.cell(r, mk).value), mact=num(ws.cell(r, mt).value), row=r))
    return out
H = {m: parse(openpyxl.load_workbook(U + f, data_only=True)[s]) for m, (f, s) in FILES.items()}
kt = openpyxl.load_workbook(U + '9d086d5a-B_O_C_O_D_NG_TI_N_T11-13.11.xlsx', data_only=True)['DÒNG TIỀN T11.2026']
KTW = [8, 12, 16, 20, 24]
rows = []; _c = collections.Counter()
for r in range(14, 96):
    lab = kt.cell(r, 3).value
    if lab is None: continue
    _l = re.sub(r'\s+', ' ', str(lab)).strip(); _c[_l] += 1
    rows.append(dict(code=str(kt.cell(r, 2).value or ''), label=_l, key=(_l, _c[_l]), ktplan=[num(kt.cell(r, c).value) for c in KTW], ktm=num(kt.cell(r, 4).value), r=r))
FULL = ['T6', 'T7', 'T10']             # T8, T9 là báo cáo giữa tháng
def hist_vals(label, key='mact'): return [H[m][label][key] for m in FULL if label in H[m]]
def weekly_share(label):
    for m in ('T10', 'T7', 'T6'):
        if label in H[m]:
            a = H[m][label]['act']; t = sum(a)
            if t > 0: return [x / t for x in a]
    return [0.25, 0.25, 0.25, 0.25, 0.0]

# ---------------------------------------------------------------- dựng bảng
LEAF_SKIP = re.compile(r'^(Công nợ quá hạn|Công nợ đến hạn|Công nợ ngoài kế hoạch|Phát sinh|Công nợ p/sinh|Vay giải ngân|Thu - lãi ngân hàng|Thu- xử lý|Tiền gớp vốn)')
HEAD = {'DÒNG THU': 'thu', 'DÒNG CHI': 'chi', 'CHI KHỐI VĂN PHÒNG': 'vp', 'CHI NHÀ MÁY SẢN XUẤT': 'nm'}
# --- Thu KH theo thói quen (KHÔNG dùng số tháng 11): TB thu KH T6–T10 theo sổ NH; 6 ngày cuối tháng TB 8.667 tr
THU_M = statistics.mean([15453, 15026, 13964, 13269, 13770]) * 1e6; LAST6 = 8667e6; FIRST = THU_M - LAST6
thu_w = [FIRST * 8 / 22, FIRST * 7 / 22, FIRST * 7 / 22, (2236 + 825 + 615 + 571 + 804) * 1e6, 3614e6]
# --- NCC: TB 3 tháng báo cáo đầy đủ (T6, T7, T10) và hình dạng tuần của T10
ncc_m = statistics.mean([H[m][('Chi tiền thanh toán NCC', 1)]['mact'] for m in FULL]); ncc_sh = weekly_share(('Chi tiền thanh toán NCC', 1)); ncc_sh = [x if x > 0 else 0 for x in ncc_sh]
tt = sum(ncc_sh) or 1; ncc_w = [ncc_m * x / tt for x in ncc_sh]
LOAN = {('Trả gốc vay - ngân hàng', 1): [0, 994977000, 0, 1104880211, 300805596], ('Trả lãi vay - ngân hàng', 1): [3.2e6, 0, 0, 160e6, 0]}
def weekly_share(k):
    for m in ('T10', 'T7', 'T6'):
        if k in H[m]:
            a = H[m][k]['act']; t = sum(a)
            if t > 0: return [x / t for x in a]
    return [0.25, 0.25, 0.25, 0.25, 0.0]
out = []
for it in rows:
    L, k = it['label'], it['key']
    t = HEAD.get(L)
    if t or it['code'] in ('I', 'II', 'A', 'B'): out.append(dict(it, kind='head', t=HEAD.get(L, 'x'))); continue
    if LEAF_SKIP.match(L): out.append(dict(it, kind='blank', plan=[0] * 5, note='mục con / tài trợ – không lập')); continue
    if L.startswith('Thu - công nợ khách hàng'): out.append(dict(it, kind='leaf', side='thu', plan=thu_w, note='TB thu KH T6–T10 theo sổ NH (14,2 tỷ); 6 ngày làm việc cuối tháng = 8,67 tỷ')); continue
    if L.startswith('Thu - vay') or L.startswith('Thu - khác'): out.append(dict(it, kind='leaf', side='thu', plan=[0] * 5, note='không lập (phát sinh ngoài kế hoạch)')); continue
    if L.startswith('Chi tiền thanh toán NCC'): out.append(dict(it, kind='leaf', side='chi', plan=ncc_w, note='TB 3 tháng đầy đủ T6,T7,T10 (báo cáo KT); hình dạng tuần của T10')); continue
    if k in LOAN: out.append(dict(it, kind='leaf', side='chi', plan=LOAN[k], note='theo lịch trả vay (file theo dõi vay)')); continue
    vals = [v for v in hist_vals(k) if v > 0]
    if len(vals) >= 2: base = statistics.median(vals); note = f'trung vị {len(vals)}/3 tháng đầy đủ'
    elif len(vals) == 1 and H['T10'].get(k, {}).get('mact', 0) > 0: base = vals[0] * 0.5; note = 'phát sinh 1/3 tháng → 50%'
    else: base = 0; note = 'không phát sinh đều'
    sh = weekly_share(k); out.append(dict(it, kind='leaf', side='chi', plan=[base * x for x in sh], note=note))
blk = 'thu'
for r in out:
    if r['label'] == 'DÒNG CHI': blk = 'vp'
    if r['label'] == 'CHI KHỐI VĂN PHÒNG': blk = 'vp'
    if r['label'] == 'CHI NHÀ MÁY SẢN XUẤT': blk = 'nm'
    r['block'] = blk
leaf = [r for r in out if r['kind'] == 'leaf']
sumb = lambda f: [sum(r['plan'][i] for r in leaf if f(r)) for i in range(5)]
HT = {'DÒNG THU': sumb(lambda r: r['side'] == 'thu'), 'DÒNG CHI': sumb(lambda r: r['side'] == 'chi'), 'CHI KHỐI VĂN PHÒNG': sumb(lambda r: r['side'] == 'chi' and r['block'] == 'vp'), 'CHI NHÀ MÁY SẢN XUẤT': sumb(lambda r: r['side'] == 'chi' and r['block'] == 'nm')}
sys_plan = {}
for r in out:
    if r['kind'] == 'head': sys_plan[r['label'] + '|1'] = HT.get(r['label'], [0] * 5)
    elif r.get('plan') is not None: sys_plan[r['label'] + '|' + str(r['key'][1])] = [round(x) for x in r['plan']]
print('THU', [round(x / 1e6) for x in HT['DÒNG THU']], round(sum(HT['DÒNG THU']) / 1e6), '| CHI', [round(x / 1e6) for x in HT['DÒNG CHI']], round(sum(HT['DÒNG CHI']) / 1e6), '| VP', round(sum(HT['CHI KHỐI VĂN PHÒNG']) / 1e6), 'NM', round(sum(HT['CHI NHÀ MÁY SẢN XUẤT']) / 1e6))
big = sorted([(r['label'], sum(r['plan'])) for r in leaf if r['side'] == 'chi'], key=lambda x: -x[1])[:10]
for l, v in big: print('  ', l[:48].ljust(50), round(v / 1e6))
bal = 3403.1e6; cl = []
for i in range(5): bal += HT['DÒNG THU'][i] - HT['DÒNG CHI'][i]; cl.append(round(bal))
print('số dư cuối tuần (đầu kỳ 3.403 tr):', [round(x / 1e6) for x in cl])
json.dump(dict(sys=sys_plan, close=cl, thu_m=THU_M, ncc_m=ncc_m), open('/tmp/kh_ls.json', 'w'), ensure_ascii=False)
