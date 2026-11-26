import openpyxl, datetime as dt, collections
U = '/root/.claude/uploads/79bc319a-108c-5b8f-b18e-02ca38b35d45/'
F_NOV = U + 'c10dd27b-So_tien_gui_ngan_hang_tu_01.11_den_23.11.xlsx'
F_OCT = U + '7c4301e3-So_tien_gui_ngan_hang.xlsx'
num = lambda x: x if isinstance(x, (int, float)) else 0
CATMAP = [('1311', 'thu_kh'), ('131', 'thu_kh'), ('3311', 'ncc'), ('331', 'ncc'), ('3341', 'luong'), ('334', 'luong'), ('3383', 'bh'), ('3384', 'bh'), ('3385', 'bh'), ('338', 'bh'),
          ('3411', 'vay'), ('341', 'vay'), ('635', 'lai'), ('33311', 'thue'), ('333', 'thue'), ('642', 'cp'), ('641', 'cp'), ('627', 'cp'), ('242', 'cp'), ('211', 'dautu'), ('153', 'cp'), ('152', 'ncc'), ('156', 'ncc'), ('141', 'tamung'), ('112', 'noibo'), ('111', 'noibo'), ('3388', 'khac')]
def cat_of(tk):
    tk = str(tk or '')
    for k, c in CATMAP:
        if tk.startswith(k): return c
    return 'khac'
def load(path):
    ws = openpyxl.load_workbook(path, data_only=True, read_only=True).active
    tx = []; acct = None; opening = {}
    for r in ws.iter_rows(min_row=5, values_only=True):
        a = r[0]
        if isinstance(a, str) and a.startswith('Tài khoản ngân hàng'): acct = a.split(':', 1)[1].strip(); continue
        desc_i = 5 if len(r) > 11 and path == F_NOV else 4
        if not isinstance(a, dt.datetime):
            if (r[desc_i] == 'Số dư đầu kỳ'): opening[acct] = num(r[9 if path == F_NOV else 8])
            continue
        if path == F_NOV: tk, thu, chi, name, desc, code = r[6], num(r[7]), num(r[8]), r[4], r[5], r[3]
        else: tk, thu, chi, name, desc, code = r[5], num(r[6]), num(r[7]), r[3], r[4], r[3]
        tx.append(dict(d=a.date(), acct=acct, code=code, name=name, desc=desc, tk=tk, thu=thu, chi=chi, cat=cat_of(tk), doc=r[2]))
    return tx, opening
