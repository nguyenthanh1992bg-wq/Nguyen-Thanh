"""Phân tích tình trạng thu tiền T6–T10/2026 và suy ra tỷ lệ để lập kế hoạch T11."""
import openpyxl, collections, statistics, datetime as dt, calendar
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
U = '/root/.claude/uploads/79bc319a-108c-5b8f-b18e-02ca38b35d45/'
wb = openpyxl.load_workbook(U + 'c9bbbcc2-Tong_hop_KH_TH_thu_T6-T10_2026_1_1.xlsx', data_only=True)
num = lambda x: x if isinstance(x, (int, float)) else 0
MON = ['T06', 'T07', 'T08', 'T09', 'T10']
def tot(sheet, row): ws = wb[sheet]; return [num(ws.cell(row, c).value) for c in range(3, 8)]
KH = tot('Tổng hợp theo tháng', 23); TT = tot('Tổng hợp theo tháng', 44); NGOAI = tot('Tổng hợp theo tháng', 107)
DUNG = tot('Tổng hợp theo tháng', 86); CHUA = tot('Tổng hợp theo tháng', 128); DUNGTUAN = tot('Tổng hợp theo tháng', 65)
# tuần / ngày
kh_w = collections.defaultdict(lambda: [0.0] * 5); th_w = collections.defaultdict(lambda: [0.0] * 5); daily = collections.defaultdict(float)
for r in wb['DL Kế hoạch'].iter_rows(min_row=2, values_only=True):
    if isinstance(r[0], (int, float)):
        for i in range(5): kh_w[int(r[0])][i] += num(r[5 + i])
for r in wb['DL Tiền về'].iter_rows(min_row=2, values_only=True):
    if isinstance(r[0], (int, float)):
        w = int(r[2]) if isinstance(r[2], (int, float)) else 0
        if 1 <= w <= 5: th_w[int(r[0])][w - 1] += num(r[7])
        if isinstance(r[1], dt.datetime): daily[r[1].date()] += num(r[7])
def bds(y, m): n = calendar.monthrange(y, m)[1]; return [dt.date(y, m, d) for d in range(1, n + 1) if dt.date(y, m, d).weekday() < 5]
rank = []
for m in range(6, 11):
    L = bds(2026, m)[::-1]; rank.append([daily.get(L[i], 0) for i in range(6)])
last6 = [sum(x) for x in rank]; mean6 = statistics.mean(last6); first = [TT[i] - last6[i] for i in range(5)]
ratio = [TT[i] / KH[i] for i in range(5)]; ratio3 = sum(TT[2:]) / sum(KH[2:])
# NVKD
dg = wb['Đánh giá KH theo NVKD']; nv = []
for r in range(5, 23):
    v = [dg.cell(r, c).value for c in range(1, 14)]
    if v[0] is not None: nv.append(v)
# ---- tỷ lệ cho T11
KT_PLAN = 17503.05e6; MTD = 4620e6
est = [('A. Kế hoạch thu của KT × tỷ lệ thực thu/KH 5 tháng', KT_PLAN * sum(TT) / sum(KH)), ('B. Kế hoạch thu của KT × tỷ lệ 3 tháng gần nhất (T8–T10)', KT_PLAN * ratio3),
       ('C. TB thực thu 3 tháng gần nhất (T8–T10)', statistics.mean(TT[2:])), ('D. TB thực thu 5 tháng', statistics.mean(TT)),
       ('E. Cập nhật: thực thu 01–21/11 + TB 6 ngày làm việc cuối tháng T6–T10', MTD + mean6), ('F. Như E, ở mức thấp nhất lịch sử (8,13 tỷ)', MTD + min(last6)), ('G. Như E, ở mức cao nhất lịch sử (9,03 tỷ)', MTD + max(last6))]
for n, v in est: print(f'{n:78} {v / 1e9:6.2f}')
print('tỷ lệ TT/KH', [round(x, 3) for x in ratio], 'tổng', round(sum(TT) / sum(KH), 3), '3 tháng', round(ratio3, 3))
print('6 ngày cuối', [round(x / 1e9, 2) for x in last6], round(mean6 / 1e9, 2), '| phần còn lại', [round(x / 1e9, 2) for x in first])
# ---- Excel
NAVY = '10264D'; hf = PatternFill('solid', fgColor=NAVY); sf = PatternFill('solid', fgColor='E8EEF7'); good = PatternFill('solid', fgColor='EAF4EA'); bad = PatternFill('solid', fgColor='FDE8E8'); yel = PatternFill('solid', fgColor='FFF9DB')
thin = Side(style='thin', color='C9D1DC'); box = Border(left=thin, right=thin, top=thin, bottom=thin); NUM = '#,##0;[Red](#,##0);"-"'
def put(w, r, c, v, fmt=None, bold=False, fill=None, wrap=False):
    x = w.cell(r, c, v); x.border = box; x.alignment = Alignment(wrap_text=wrap, vertical='top')
    if fmt: x.number_format = fmt
    if bold: x.font = Font(bold=True)
    if fill: x.fill = fill
def head(w, r, vals, h=30):
    for i, v in enumerate(vals):
        c = w.cell(r, 1 + i, v); c.fill = hf; c.font = Font(bold=True, color='FFFFFF'); c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True); c.border = box
    w.row_dimensions[r].height = h
o = openpyxl.Workbook(); w = o.active; w.title = 'Tóm tắt & tỷ lệ T11'
w['A1'] = 'PHÂN TÍCH TÌNH TRẠNG THU TIỀN T6–T10/2026 VÀ TỶ LỆ DÙNG ĐỂ LẬP KẾ HOẠCH THÁNG 11/2026'; w['A1'].font = Font(bold=True, size=14, color=NAVY)
w['A2'] = 'Nguồn: file “Tổng hợp KH–TH thu T6–T10” (kế hoạch thu theo khách/tuần và tiền về theo sổ 131), báo cáo dòng tiền KT T6–T10. Đơn vị VND.'; w['A2'].font = Font(italic=True, color='666666')
r = 4; w.cell(r, 1, '1. KẾ HOẠCH vs THỰC THU THEO THÁNG').font = Font(bold=True, color=NAVY); r += 1
head(w, r, ['Chỉ tiêu'] + MON + ['Cộng 5 tháng']); r += 1
rows = [('Kế hoạch thu', KH), ('Thực thu (sổ 131)', TT), ('Thực thu / Kế hoạch', None), ('Về đúng kế hoạch (theo tháng)', DUNG), ('Thu ngoài kế hoạch', NGOAI), ('Kế hoạch chưa thu', CHUA)]
r0 = r
for lab, v in rows:
    put(w, r, 1, lab, bold=True)
    for i in range(5):
        if v is None: put(w, r, 2 + i, f'={chr(66+i)}{r0+1}/{chr(66+i)}{r0}', '0%', True, yel)
        else: put(w, r, 2 + i, v[i], NUM)
    put(w, r, 7, (f'=G{r0+1}/G{r0}' if v is None else f'=SUM(B{r}:F{r})'), '0%' if v is None else NUM, True, yel if v is None else None); r += 1
put(w, r, 1, 'Ghi chú: thực thu/KH giảm dần 112% → 92%; 29% kế hoạch không về, nhưng có 27% tiền thu nằm ngoài kế hoạch (bù lại).', fill=None); w.merge_cells(start_row=r, start_column=1, end_row=r, end_column=7); r += 2
w.cell(r, 1, '2. NHỊP THU TRONG THÁNG: 6 NGÀY LÀM VIỆC CUỐI THÁNG').font = Font(bold=True, color=NAVY); r += 1
head(w, r, ['Tháng', 'Ngày cuối', 'Kế cuối', '3 từ cuối', '4 từ cuối', '5 từ cuối', '6 từ cuối', 'Tổng 6 ngày cuối', 'Thu cả tháng', '% trong tháng', 'Thu các ngày còn lại']); r += 1
for i, m in enumerate(MON):
    for j, v in enumerate([m] + rank[i] + [last6[i], TT[i], f'=H{r}/I{r}', first[i]], 1): put(w, r, j, v, '0%' if j == 10 else (NUM if j > 1 else None))
    r += 1
put(w, r, 1, 'Trung bình', bold=True)
for j in range(6): put(w, r, 2 + j, statistics.mean(x[j] for x in rank), NUM, True)
put(w, r, 8, mean6, NUM, True, yel); put(w, r, 9, statistics.mean(TT), NUM, True); put(w, r, 11, statistics.mean(first), NUM, True); mrow = r; r += 1
put(w, r, 1, 'Thấp nhất / cao nhất 5 tháng', bold=True); put(w, r, 8, min(last6), NUM); put(w, r, 9, max(last6), NUM); r += 2
w.cell(r, 1, '3. KẾ HOẠCH vs THỰC THU THEO TUẦN (cộng 5 tháng) – kế toán thường đặt kế hoạch quá nhiều vào tuần 4, thực tế dồn sang tuần 5').font = Font(bold=True, color=NAVY); r += 1
head(w, r, ['Tuần', 'Kế hoạch', 'Thực thu', 'Thực/KH', '% trong KH', '% trong thực thu']); r += 1
tk = [sum(kh_w[m][i] for m in kh_w) for i in range(5)]; tth = [sum(th_w[m][i] for m in th_w) for i in range(5)]
for i in range(5):
    put(w, r, 1, f'Tuần {i+1}'); put(w, r, 2, tk[i], NUM); put(w, r, 3, tth[i], NUM); put(w, r, 4, f'=C{r}/B{r}', '0%', True); put(w, r, 5, tk[i] / sum(tk), '0%'); put(w, r, 6, tth[i] / sum(tth), '0%'); r += 1
r += 1; w.cell(r, 1, '4. CÁC CÁCH ƯỚC TÍNH THU KHÁCH HÀNG THÁNG 11/2026 (triệu đồng → tỷ đồng)').font = Font(bold=True, color=NAVY); r += 1
head(w, r, ['Cách tính', 'Thu KH T11 (VND)', 'Ghi chú']); r += 1
nts = ['Cùng cách tính của KT nhưng điều chỉnh theo tỷ lệ lịch sử', 'Tỷ lệ gần đây thấp hơn (thực thu/KH = 90%)', 'Không dùng kế hoạch, chỉ dùng mức thu thực', 'Mức thu bình quân từ T6', 'Dùng khi đã biết thực thu đến 21/11 – CHỌN LÀM KẾ HOẠCH CẬP NHẬT', 'Kịch bản thận trọng', 'Kịch bản lạc quan']
for (n, v), nt in zip(est, nts):
    put(w, r, 1, n, fill=yel if n.startswith('E.') else None); put(w, r, 2, v, NUM, True, yel if n.startswith('E.') else None); put(w, r, 3, nt, wrap=True); r += 1
put(w, r, 1, 'Kế hoạch của kế toán trưởng (17,5 tỷ) cao hơn mọi cách ước tính từ lịch sử ít nhất 1,7 tỷ.', bold=True); w.merge_cells(start_row=r, start_column=1, end_row=r, end_column=3)
for c, wd in zip('ABCDEFGHIJK', [66, 18, 40, 14, 14, 14, 14, 18, 16, 14, 18]): w.column_dimensions[c].width = wd
# NVKD
w2 = o.create_sheet('Theo NVKD – Phòng'); w2['A1'] = 'CHẤT LƯỢNG KẾ HOẠCH THU THEO NVKD (T6–T10)'; w2['A1'].font = Font(bold=True, size=14, color=NAVY)
head(w2, 3, ['Phòng', 'NVKD', 'KH 5 tháng', 'Thực thu', 'KH chưa thu', 'Thực thu/KH', 'Độ chính xác KH (tuần)', '% KH không thực hiện', '% thu ngoài KH', 'Số khách có KH', 'Khách Tốt', 'Khách TB', 'Khách Kém'], h=40)
for i, v in enumerate(nv):
    for j, x in enumerate(v, 1): put(w2, 4 + i, j, x, NUM if j in (3, 4, 5) else ('0%' if j in (6, 7, 8, 9) else None), bold=str(v[1] or v[0]).startswith(('Cộng', 'TỔNG')) or v[0] == 'TỔNG CÔNG TY')
for c, wd in zip('ABCDEFGHIJKLM', [10, 24, 16, 16, 16, 12, 14, 14, 14, 12, 10, 10, 10]): w2.column_dimensions[c].width = wd
# khách
w3 = o.create_sheet('Khách hàng'); w3['A1'] = 'KHÁCH HÀNG: KẾ HOẠCH CHƯA THU & THU NGOÀI KẾ HOẠCH (T6–T10)'; w3['A1'].font = Font(bold=True, size=14, color=NAVY)
ls = wb['Lịch sử TT khách hàng']; cu = []
for r_ in range(5, ls.max_row):
    code = ls.cell(r_, 1).value
    if not code or str(code).startswith('TỔNG'): continue
    cu.append(dict(code=code, nv=ls.cell(r_, 2).value, ph=ls.cell(r_, 3).value, kh=num(ls.cell(r_, 14).value), tt=num(ls.cell(r_, 16).value), ng=num(ls.cell(r_, 17).value), pct=ls.cell(r_, 19).value, xl=ls.cell(r_, 24).value))
head(w3, 3, ['Mã KH', 'NVKD', 'Phòng', 'KH 5 tháng', 'Thực thu', 'Thu ngoài KH', '% đạt KH', 'Xếp loại']); rr = 4
w3.cell(2, 1, 'Top 25 khách có kế hoạch lớn nhưng thu chưa tương xứng (KH − thực thu):').font = Font(italic=True)
for c in sorted(cu, key=lambda x: -(x['kh'] - x['tt']))[:25]:
    for j, v in enumerate([c['code'], c['nv'], c['ph'], c['kh'], c['tt'], c['ng'], c['pct'], c['xl']], 1): put(w3, rr, j, v, NUM if j in (4, 5, 6) else ('0%' if j == 7 else None))
    rr += 1
xl = collections.Counter(c['xl'] for c in cu); rr += 1; w3.cell(rr, 1, 'Phân bố xếp loại thanh toán: ' + ', '.join(f'{k} {v}' for k, v in xl.most_common())).font = Font(bold=True)
for c, wd in zip('ABCDEFGH', [26, 22, 8, 16, 16, 16, 10, 22]): w3.column_dimensions[c].width = wd
o.save('/home/user/Nguyen-Thanh/data_real/PHAN_TICH_TINH_TRANG_THU_TIEN_T6-T10.xlsx'); print('đã lưu')
