import sys; sys.path.insert(0, '/home/user/Nguyen-Thanh/analysis')
from build_plan import *
f = ar_forecast()          # chi tiết dự báo theo khách (KM) – dùng để PHÂN BỔ số thu cuối tháng cho từng khách
wb = openpyxl.Workbook()
NAVY = '10264D'; hdr_fill = PatternFill('solid', fgColor=NAVY); sub_fill = PatternFill('solid', fgColor='E8EEF7'); inp_fill = PatternFill('solid', fgColor='FFF9DB')
act_fill = PatternFill('solid', fgColor='EAF4EA'); tot_fill = PatternFill('solid', fgColor='DCE6F5'); bad_fill = PatternFill('solid', fgColor='FDE8E8')
thin = Side(style='thin', color='C9D1DC'); box = Border(left=thin, right=thin, top=thin, bottom=thin)
H = Font(bold=True, color='FFFFFF'); B = Font(bold=True); BLUE = Font(color='1F4FD8'); GREY = Font(color='666666', italic=True)
NUM = '#,##0;[Red](#,##0);"-"'
def hdr(ws, r, c1, vals, fill=hdr_fill, font=H, h=None):
    for i, v in enumerate(vals):
        c = ws.cell(r, c1 + i, v); c.fill = fill; c.font = font; c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True); c.border = box
    if h: ws.row_dimensions[r].height = h
def put(ws, r, c, v, fmt=None, font=None, fill=None, wrap=False, border=True, align=None):
    x = ws.cell(r, c, v)
    if fmt: x.number_format = fmt
    if font: x.font = font
    if fill: x.fill = fill
    if border: x.border = box
    x.alignment = Alignment(wrap_text=wrap, vertical='top', horizontal=align)
    return x
def widths(ws, ws_w):
    for k, v in ws_w.items(): ws.column_dimensions[k].width = v

# ===================================================================== SHEET: Dòng tiền ngày
wd = wb.active; wd.title = 'Dòng tiền ngày 22-30.11'
wd['A1'] = 'DÒNG TIỀN NGÀY 22–30/11/2026 (dự báo) – đổi ô vàng để chạy lại'; wd['A1'].font = Font(bold=True, size=14, color=NAVY)
put(wd, 3, 1, 'Hệ số thu cuối tháng so với TB 5 tháng (T6–T10)', border=False); put(wd, 3, 5, 0.9, '0%', BLUE, inp_fill)
put(wd, 4, 1, 'Ngưỡng tiền tối thiểu giữ lại (VND)', border=False); put(wd, 4, 5, 150000000, NUM, BLUE, inp_fill)
put(wd, 5, 1, 'Số dư đầu ngày 22/11 = sổ NH đến 21/11 + quỹ TM đến 13/11', border=False); put(wd, 5, 5, BANK_NOW + CASH_NOW, NUM, BLUE, inp_fill)
put(wd, 6, 1, 'Hệ số: 65% = thận trọng · 90% = cơ bản · 100% = lạc quan. Chi NCC = tiền còn dư sau khi giữ đủ gốc/lãi 3 ngày tới và ngưỡng tối thiểu.', border=False, font=GREY)
hdr(wd, 8, 1, ['Ngày', 'Thứ', 'Tuần', 'Ngày làm việc (1/0)', 'Thu KH – cơ sở (TB 5 tháng)', 'Thu KH dự báo', 'Gốc vay NH', 'Lãi vay', 'Chi phí vận hành & khác', 'Chi bắt buộc 3 ngày tới', 'Chi NCC (khả năng)', 'Số dư đầu ngày', 'Số dư cuối ngày'], h=44)
R0 = 9; WD = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
for i, d in enumerate(days):
    r = R0 + i; w = wk(d) + 1
    g, l = MAND.get(d, (0, 0))
    put(wd, r, 1, d, 'dd/mm/yyyy'); put(wd, r, 2, WD[d.weekday()], align='center'); put(wd, r, 3, w, align='center')
    put(wd, r, 4, 1 if d.weekday() < 5 else 0, '0', BLUE, inp_fill, align='center')
    put(wd, r, 5, base_by_day.get(d, 0), NUM, BLUE, inp_fill)
    put(wd, r, 6, f'=E{r}*$E$3*D{r}', NUM)
    put(wd, r, 7, g, NUM, BLUE, inp_fill); put(wd, r, 8, l, NUM, BLUE, inp_fill)
    put(wd, r, 9, f'=ROUND({CP_DAILY},0)*D{r}', NUM)
    last = R0 + len(days) - 1
    put(wd, r, 10, f'=SUM(G{r+1}:H{min(r+3,last)})' if r < last else 0, NUM)
    put(wd, r, 12, '=E5' if i == 0 else f'=M{r-1}', NUM)
    put(wd, r, 11, f'=IF(D{r}=1,MAX(0,ROUND(L{r}+F{r}-G{r}-H{r}-I{r}-$E$4-J{r},-5)),0)', NUM)
    put(wd, r, 13, f'=L{r}+F{r}-G{r}-H{r}-I{r}-K{r}', NUM, B, tot_fill)
rl = R0 + len(days) - 1
put(wd, rl + 1, 1, 'Cộng', font=B, fill=tot_fill)
for c in (6, 7, 8, 9, 11): put(wd, rl + 1, c, f'=SUM({L(c)}{R0}:{L(c)}{rl})', NUM, B, tot_fill)
put(wd, rl + 3, 1, 'Cơ sở cột E: thu KH trung bình của từng ngày làm việc cuối tháng (ngày cuối, kế cuối…) trong T6–T10 – xem sheet “Đối chiếu & rủi ro”.', border=False, font=GREY)
put(wd, rl + 4, 1, 'Gốc vay: BIDV 24/11 = 933,48 tr; 25/11 = 73,4 + 87 + 11 = 171,4 tr (định kỳ); 30/11 = 300,81 tr. Lãi vay ước 180 tr (25/11) theo bảng theo dõi vay 13/11. Giả định KHÔNG đảo nợ.', border=False, font=GREY)
widths(wd, {'A': 13, 'B': 7, 'C': 7, 'D': 11, 'E': 17, 'F': 17, 'G': 16, 'H': 14, 'I': 17, 'J': 16, 'K': 17, 'L': 17, 'M': 17})
DAYRNG = lambda col: f"'Dòng tiền ngày 22-30.11'!${col}${R0}:${col}${rl}"

# ===================================================================== SHEET: KH T11
ws = wb.create_sheet('KH T11-2026', 0)
ws['A1'] = 'BÁO CÁO KẾ HOẠCH DÒNG TIỀN THÁNG 11/2026'; ws['A1'].font = Font(bold=True, size=15, color=NAVY)
ws['A2'] = 'CÔNG TY CP GIẢI PHÁP ĐÓNG GÓI HOÀNG GIA · Cập nhật ngày 23/11/2026 · Đơn vị: VND'; ws['A2'].font = GREY
ws['A3'] = 'Thực hiện = sổ tiền gửi NH (đến 21/11) + sổ quỹ tiền mặt (đến 13/11) + giải ngân vay trả thẳng NCC/lương (file theo dõi vay 13/11). Dự báo = sheet “Dòng tiền ngày” (ô vàng chỉnh được).'; ws['A3'].font = GREY
r = 5
hdr(ws, r, 1, ['Mã', 'Nội dung'], h=34)
for i, (nm, a, b) in enumerate(WEEKS):
    c = 3 + i * 3; hdr(ws, r, c, [nm, '', '']); ws.merge_cells(start_row=r, start_column=c, end_row=r, end_column=c + 2)
    hdr(ws, r + 1, c, ['Thực hiện', 'Dự báo', 'Tổng'], fill=sub_fill, font=B)
hdr(ws, r, 18, ['CẢ THÁNG 11', '', '']); ws.merge_cells(start_row=r, start_column=18, end_row=r, end_column=20); hdr(ws, r + 1, 18, ['Thực hiện', 'Dự báo', 'Tổng T11'], fill=sub_fill, font=B)
hdr(ws, r, 21, ['Cơ sở / ghi chú']); hdr(ws, r + 1, 21, ['']); ws.merge_cells(start_row=r, start_column=21, end_row=r + 1, end_column=21)
hdr(ws, r + 1, 1, ['', ''], fill=sub_fill)

ROW = {}
def line(rr, key, label, notes='', bold=False, forecast=None, actual=None, fill=None):
    ROW[key] = rr
    put(ws, rr, 1, '', fill=fill); put(ws, rr, 2, label, font=B if bold else None, fill=fill)
    for w in range(5):
        c = 3 + w * 3
        put(ws, rr, c, (actual[w] if actual is not None else 0), NUM, BLUE if not bold else B, act_fill if not bold else fill)
        fx = forecast(w) if forecast else 0
        put(ws, rr, c + 1, fx, NUM, None if forecast else BLUE, inp_fill if not forecast and not bold else fill)
        put(ws, rr, c + 2, f'={L(c)}{rr}+{L(c+1)}{rr}', NUM, B, fill or tot_fill)
    put(ws, rr, 18, '=' + '+'.join(f'{L(3+w*3)}{rr}' for w in range(5)), NUM, B, fill or tot_fill)
    put(ws, rr, 19, '=' + '+'.join(f'{L(4+w*3)}{rr}' for w in range(5)), NUM, B, fill or tot_fill)
    put(ws, rr, 20, f'=R{rr}+S{rr}', NUM, B, fill or tot_fill); put(ws, rr, 21, notes, wrap=True, font=GREY)
def fc(col): return lambda w: f'=SUMIFS({DAYRNG(col)},{DAYRNG("C")},{w+1})'
rr = 7
put(ws, rr, 2, 'TIỀN ĐẦU KỲ (NH + quỹ TM)', font=B, fill=tot_fill); ROW['open'] = rr
for w in range(5):
    c = 3 + w * 3
    put(ws, rr, c, OPEN_BANK + OPEN_CASH if w == 0 else '', NUM, B, tot_fill); put(ws, rr, c + 1, '', fill=tot_fill)
    put(ws, rr, c + 2, (OPEN_BANK + OPEN_CASH) if w == 0 else f'={L(c-1)}24', NUM, B, tot_fill)
put(ws, rr, 18, '', fill=tot_fill); put(ws, rr, 19, '', fill=tot_fill); put(ws, rr, 20, '=E7', NUM, B, tot_fill); put(ws, rr, 21, 'Số dư 01/11: NH 2.710.474.258 (bảng kê số dư NH) + quỹ TM 692.613.645 (sổ quỹ).', wrap=True, font=GREY)
ws.cell(8, 2, 'I. DÒNG THU').font = B
line(9, 'thu_tot', 'Tổng thu', bold=True, fill=tot_fill, actual=[0]*5, forecast=None)
line(10, 'thu_kh', '  Thu công nợ khách hàng', 'Thực hiện: sổ NH + quỹ. Dự báo: TB 5 tháng của các ngày làm việc cuối tháng × hệ số 90% (T6–T10: 8,1–9,0 tỷ/6 ngày cuối).', actual=A['thu_kh'], forecast=fc('F'))
line(11, 'vay', '  Vay giải ngân trả thẳng NCC/lương (VCB…)', 'Không qua sổ NH: 10/11 VCB 855,3 tr trả lương. Chưa dự báo giải ngân mới (xem Phương án 1).', actual=A['vay_gn'])
line(12, 'thu_khac', '  Thu khác (hoàn ứng, thu khác)', '', actual=A['thu_khac'])
ws.cell(13, 2, 'II. DÒNG CHI').font = B
line(14, 'chi_tot', 'Tổng chi', bold=True, fill=tot_fill, actual=[0]*5)
line(15, 'ncc', '  Chi thanh toán nhà cung cấp', 'Gồm cả phần trả bằng vay. Dự báo = khả năng chi sau khi giữ gốc/lãi vay & ngưỡng tối thiểu (không phải nhu cầu – xem mục theo dõi bên dưới).', actual=A['ncc'], forecast=fc('K'))
line(16, 'luong', '  Chi lương, thưởng', 'T10 đã trả 10/11 bằng vay VCB 855,3 tr (cột “Vay giải ngân”). Lương T11 trả ~10/12.', actual=A['luong'])
line(17, 'bh', '  Chi BHXH, BHYT, BHTN', 'Đã nộp 87 tr ngày 04/11.', actual=A['bh'])
line(18, 'thue', '  Chi thuế (TNCN, GTGT…)', 'TNCN 337 tr nộp 05/11. LƯU Ý: GTGT còn phải nộp 1,44 tỷ (CPS 30/09) chưa thấy nộp – chưa đưa vào kế hoạch, cần xác nhận.', actual=A['thue'])
line(19, 'vay_goc', '  Trả gốc vay ngân hàng', 'Thực hiện: BIDV 995 tr (10/11). Dự báo: BIDV 933,5 tr (24/11) + định kỳ 171,4 tr (25/11) + BIDV 300,8 tr (30/11). Chưa đảo nợ.', actual=A['vay'], forecast=fc('G'))
line(20, 'lai', '  Trả lãi vay', 'Lãi tháng ước 180 tr (bảng theo dõi vay) trả ~25/11.', actual=A['lai'], forecast=fc('H'))
line(21, 'cp', '  Chi phí vận hành & khác (gồm tạm ứng)', 'Chạy theo mức tháng 10 (≈1,26 tỷ/21 ngày làm việc).', actual=A['cp'], forecast=fc('I'))
for col in range(3, 21):
    cl = L(col)
    ws.cell(9, col).value = f'=SUM({cl}10:{cl}12)'; ws.cell(14, col).value = f'=SUM({cl}15:{cl}21)'
put(ws, 23, 2, 'DÒNG TIỀN RÒNG (thu − chi)', font=B, fill=tot_fill); put(ws, 24, 2, 'TIỀN CUỐI KỲ', font=B, fill=tot_fill)
put(ws, 25, 2, 'Ngưỡng tiền tối thiểu', font=None); put(ws, 26, 2, 'Chênh lệch so với ngưỡng', font=None)
for col in range(3, 21):
    cl = L(col); sub = (col - 3) % 3 if col < 18 else col - 18
    put(ws, 23, col, f'={cl}9-{cl}14', NUM, B, tot_fill)
for w in range(5):
    c = 3 + w * 3
    put(ws, 24, c, f'={L(c)}7+{L(c)}23' if w == 0 else '', NUM, B, tot_fill); put(ws, 24, c + 1, '', fill=tot_fill)
    put(ws, 24, c + 2, f'={L(c+2)}7+{L(c+2)}23', NUM, B, tot_fill)
    put(ws, 25, c + 2, "='Dòng tiền ngày 22-30.11'!$E$4", NUM); put(ws, 26, c + 2, f'={L(c+2)}24-{L(c+2)}25', NUM)
put(ws, 24, 20, '=T7+T23', NUM, B, tot_fill); put(ws, 24, 18, '', fill=tot_fill); put(ws, 24, 19, '', fill=tot_fill)
put(ws, 24, 21, 'Số dư thực tế 21/11 đối chiếu sổ: NH 726.173.271 + quỹ 699.887.202 (quỹ đến 13/11) = 1.426.060.473.', wrap=True, font=GREY)
# mục theo dõi NCC
ws.cell(28, 2, 'III. CHỈ TIÊU THEO DÕI NHÀ CUNG CẤP (sổ 331, chốt 21/11)').font = B
rows_n = [('Nợ NCC đã quá hạn (trước 23/11)', need_over, 'Ước tính từ sổ chi tiết 331 + hạn thanh toán NCC (12/11), đã trừ thanh toán 13–21/11.'),
          ('Nợ NCC đến hạn 23–30/11', need_nov, ''), ('→ Nhu cầu chi NCC để không tăng quá hạn đến 30/11', need_over + need_nov, '')]
for i, (lab, v, nt) in enumerate(rows_n):
    put(ws, 29 + i, 2, lab, font=B if i == 2 else None); put(ws, 29 + i, 4, v, NUM, BLUE if i < 2 else B, inp_fill if i < 2 else None); put(ws, 29 + i, 21, nt, wrap=True, font=GREY)
put(ws, 32, 2, 'Khả năng chi NCC giai đoạn 22–30/11 (từ dự báo)'); put(ws, 32, 4, '=S15', NUM)
put(ws, 33, 2, 'THIẾU HỤT NCC chuyển sang tháng 12', font=B, fill=bad_fill); put(ws, 33, 4, '=D31-D32', NUM, B, bad_fill)
put(ws, 33, 21, 'Phần nhu cầu mà dòng tiền chưa đáp ứng → cần phương án vay/giãn (xem sheet “Đề xuất 2 PA”).', wrap=True, font=GREY)
ws.freeze_panes = 'C7'
widths(ws, {'A': 4, 'B': 46, **{L(c): 14 for c in range(3, 21)}, 'U': 60})
for c in range(3, 21):
    if (c - 3) % 3 == 2 or c >= 18: pass
ws.row_dimensions[5].height = 30

# ===================================================================== SHEET: Đề xuất 2 PA
wp = wb.create_sheet('Đề xuất 2 PA', 1)
wp['A1'] = 'ĐỀ XUẤT 2 PHƯƠNG ÁN NÂNG CAO DÒNG TIỀN – THÁNG 11/2026 (chấm điểm 0–100)'; wp['A1'].font = Font(bold=True, size=14, color=NAVY)
wp['A2'] = 'Tiêu chí & trọng số: Tác động dòng tiền 40% · Tốc độ ra tiền 20% · Khả thi 25% · Chi phí & rủi ro 15%. Tác động = số tiền giữ lại/kéo về thêm trong 22–30/11 so với yêu cầu tối thiểu 2,0 tỷ.'; wp['A2'].font = GREY
# chọn 2 PA: điểm cao nhất, ưu tiên khác loại
typ = {'P1': 'Tài trợ vốn', 'P2': 'Tài trợ vốn', 'P3': 'Đẩy nhanh thu', 'P4': 'Đẩy nhanh thu'}
top = levers[:2]
if typ[top[0]['id']] == typ[top[1]['id']]:
    alt = next((x for x in levers[2:] if typ[x['id']] != typ[top[0]['id']]), None)
    if alt and top[1]['score'] - alt['score'] <= 10: top = [top[0], alt]
hdr(wp, 4, 1, ['Mã', 'Phương án', 'Loại', 'ĐIỂM', 'Tác động', 'Tốc độ', 'Khả thi', 'CP & rủi ro', 'Tiền giữ lại/kéo về (VND)', 'Chi phí ước tính (VND)', 'Ra tiền sau (ngày)', 'Đề xuất'], h=40)
for i, lv in enumerate(levers):
    rr = 5 + i
    for c, v in enumerate([lv['id'], lv['name'], typ[lv['id']], lv['score'], lv['sI'], lv['sS'], lv['sF'], lv['sR'], lv['impact_bal'], lv['cost'], lv['ttc'], 'ĐỀ XUẤT' if lv in top else ''], 1):
        put(wp, rr, c, v, NUM if c in (9, 10) else None, B if c in (4, 12) else None, tot_fill if lv in top else None, wrap=(c == 2))
rr = 5 + len(levers) + 1
put(wp, rr, 1, 'Phương án dự phòng chưa chấm điểm: gặp VCB/Vietinbank đăng ký trước hạn mức giải ngân cho tháng 12; rà soát thuế GTGT tồn đọng (1,44 tỷ).', border=False, font=GREY)
rr += 2
for k, lv in enumerate(top):
    wp.cell(rr, 1, f'PHƯƠNG ÁN {k+1}: {lv["name"]}  —  {lv["score"]}/100').font = Font(bold=True, size=12, color='1D4ED8'); rr += 1
    put(wp, rr, 1, 'Vì sao', font=B, border=False); put(wp, rr, 2, lv['why'], wrap=True, border=False); wp.merge_cells(start_row=rr, start_column=2, end_row=rr, end_column=12); wp.row_dimensions[rr].height = 34; rr += 1
    put(wp, rr, 1, 'Cách làm', font=B, border=False)
    for s in lv['steps']:
        put(wp, rr, 2, '• ' + s, wrap=True, border=False); wp.merge_cells(start_row=rr, start_column=2, end_row=rr, end_column=12); wp.row_dimensions[rr].height = 30; rr += 1
    put(wp, rr, 1, 'KPI', font=B, border=False); put(wp, rr, 2, lv['kpi'] + '   · Phụ trách: ' + lv['who'], border=False); rr += 2
widths(wp, {'A': 8, 'B': 64, 'C': 14, 'D': 8, 'E': 10, 'F': 9, 'G': 9, 'H': 11, 'I': 20, 'J': 18, 'K': 12, 'L': 12})

# ===================================================================== SHEET: Thu KH
wk_ = wb.create_sheet('Thu KH')
wk_['A1'] = 'KHÁCH HÀNG – DỰ KIẾN TRẢ CUỐI THÁNG & DANH SÁCH THU NỢ (sổ 131 chi tiết theo hóa đơn)'; wk_['A1'].font = Font(bold=True, size=14, color=NAVY)
wk_['A2'] = 'Dự kiến trả 22–30/11 = tổng dự báo cuối tháng phân bổ theo xác suất trả của từng khách (mô hình Kaplan–Meier từ lịch sử trả tiền Apr–Nov/2026, FIFO). Hóa đơn đã trừ tiền khách trả 13–21/11.'; wk_['A2'].font = GREY
opn = f['opn']; cust = collections.defaultdict(lambda: dict(rem=0, over30=0, over60=0, maxover=-999, n=0, nv=''))
asof21 = dt.date(2026, 11, 21)
for i in opn:
    if i['rem'] <= 1: continue
    c = cust[i['cust']]; c['rem'] += i['rem']; c['n'] += 1; o = (asof21 - i['due']).days if i['due'] else 0
    c['maxover'] = max(c['maxover'], o); c['over30'] += i['rem'] if o > 30 else 0; c['over60'] += i['rem'] if o > 60 else 0
    c['nv'] = (f['kh'].get(i['cust'], {}) or {}).get('nv', '')
det = f['detail']; totd = sum(det.values()) or 1
fc_total = sum(base_by_day.values()) * 0.9
rows = sorted(cust.items(), key=lambda x: -(det.get(x[0], 0)))
hdr(wk_, 4, 1, ['#', 'Khách hàng', 'NVKD', 'Dư nợ mở (VND)', 'Số HĐ', 'Quá hạn >30 ngày', 'Quá hạn >60 ngày', 'Trễ tối đa (ngày)', 'Dự kiến trả 22–30/11 (VND)', 'Hành động'], h=40)
for i, (nm, c) in enumerate(rows[:40]):
    rr = 5 + i; exp = det.get(nm, 0) / totd * fc_total
    act = 'Phó GĐ gọi trực tiếp, chốt ngày ≤27/11' if exp > 300e6 or c['over60'] > 300e6 else ('NVKD chốt ngày chuyển tiền ≤27/11' if exp > 100e6 else 'Nhắc theo lịch')
    for j, v in enumerate([i + 1, nm, c['nv'], c['rem'], c['n'], c['over30'], c['over60'], c['maxover'] if c['maxover'] > -999 else '', exp, act], 1):
        put(wk_, rr, j, v, NUM if j in (4, 6, 7, 9) else None)
rr = 5 + min(40, len(rows)) + 1
put(wk_, rr, 2, 'Tổng 40 khách đầu', font=B); put(wk_, rr, 4, f'=SUM(D5:D{rr-2})', NUM, B); put(wk_, rr, 9, f'=SUM(I5:I{rr-2})', NUM, B)
rr += 2; wk_.cell(rr, 1, 'TOP 15 KHÁCH QUÁ HẠN >60 NGÀY LỚN NHẤT (nhóm “Thu hồi trọng điểm”)').font = Font(bold=True, color=NAVY); rr += 1
hdr(wk_, rr, 1, ['#', 'Khách hàng', 'NVKD', 'Quá hạn >60 ngày (VND)', 'Dư nợ mở (VND)', 'Trễ tối đa (ngày)']); rr += 1
for i, (nm, c) in enumerate(sorted(cust.items(), key=lambda x: -x[1]['over60'])[:15]):
    for j, v in enumerate([i + 1, nm, c['nv'], c['over60'], c['rem'], c['maxover']], 1): put(wk_, rr + i, j, v, NUM if j in (4, 5) else None)
widths(wk_, {'A': 5, 'B': 58, 'C': 16, 'D': 18, 'E': 8, 'F': 18, 'G': 18, 'H': 12, 'I': 22, 'J': 44})

# ===================================================================== SHEET: Chi NCC ưu tiên
wn = wb.create_sheet('Chi NCC ưu tiên')
wn['A1'] = 'NHÀ CUNG CẤP – ƯU TIÊN THANH TOÁN (sổ chi tiết 331 + kỳ hạn thanh toán NCC 12/11)'; wn['A1'].font = Font(bold=True, size=14, color=NAVY)
wn['A2'] = 'Phân bổ “khả năng chi” cho NCC theo hạn cũ nhất trước (FIFO theo ngày đến hạn). Cột “Đề xuất trả” chỉ là gợi ý – KT trưởng điều chỉnh theo mức độ chiến lược của NCC.'; wn['A2'].font = GREY
cap = sum(r_['ncc'] for r_ in base_rows)
sup = collections.defaultdict(lambda: dict(over=0, nov=0, dec=0, term='', owner='', oldest=None))
for o in aps:
    s = sup[o['sup']]; s['term'] = str(o['term_raw'] or '')[:70]; s['owner'] = o['owner']
    if o['due'] < dt.date(2026, 11, 23): s['over'] += o['rem']; s['oldest'] = min(s['oldest'] or o['due'], o['due'])
    elif o['due'] <= due_end: s['nov'] += o['rem']
    else: s['dec'] += o['rem']
order = sorted([x for x in sup.items() if x[1]['over'] + x[1]['nov'] > 0], key=lambda x: (x[1]['oldest'] or dt.date(2099, 1, 1), -x[1]['over']))
left = cap; alloc = {}
for nm, s in order:
    need_ = s['over'] + s['nov']; t = min(need_, left); alloc[nm] = t; left -= t
hdr(wn, 4, 1, ['#', 'Nhà cung cấp', 'Phụ trách', 'Quá hạn (VND)', 'Đến hạn 23–30/11', 'Đến hạn tháng 12+', 'Hạn cũ nhất', 'Đề xuất trả đến 30/11', 'Còn thiếu', 'Điều khoản thanh toán'], h=40)
for i, (nm, s) in enumerate(order[:60]):
    rr = 5 + i
    for j, v in enumerate([i + 1, nm, s['owner'], s['over'], s['nov'], s['dec'], s['oldest'], alloc[nm], s['over'] + s['nov'] - alloc[nm], s['term']], 1):
        put(wn, rr, j, v, 'dd/mm/yyyy' if j == 7 else (NUM if j in (4, 5, 6, 8, 9) else None))
rr = 5 + min(60, len(order)) + 1
put(wn, rr, 2, f'Tổng {len(order)} NCC có nợ đến hạn ≤30/11', font=B)
for c in (4, 5, 8, 9): put(wn, rr, c, sum([sup[n][['over', 'nov'][c - 4]] for n, _ in order]) if c in (4, 5) else (sum(alloc.values()) if c == 8 else sum(sup[n]['over'] + sup[n]['nov'] - alloc[n] for n, _ in order)), NUM, B)
widths(wn, {'A': 5, 'B': 56, 'C': 14, 'D': 17, 'E': 17, 'F': 17, 'G': 12, 'H': 19, 'I': 17, 'J': 70})

# ===================================================================== SHEET: Vay NH
wv = wb.create_sheet('Vay NH')
wv['A1'] = 'KHOẢN VAY NGÂN HÀNG – LỊCH TRẢ & HẠN MỨC CÒN LẠI (file theo dõi vay 13/11)'; wv['A1'].font = Font(bold=True, size=14, color=NAVY)
ws_t = wbv['Theo doi tra no']; loans = []
for r_ in range(3, ws_t.max_row + 1):
    if str(ws_t.cell(r_, 12).value) == '11' and ws_t.cell(r_, 2).value:
        loans.append(dict(bank=ws_t.cell(r_, 2).value, ctr=ws_t.cell(r_, 3).value, mat=ws_t.cell(r_, 5).value, rate=ws_t.cell(r_, 8).value, bal=ws_t.cell(r_, 13).value, prin=ws_t.cell(r_, 14).value, intr=ws_t.cell(r_, 15).value))
tot_int = sum(l['intr'] or 0 for l in loans); tot_bal = sum(l['bal'] or 0 for l in loans)
put(wv, 3, 1, f'Tổng dư nợ gốc đầu kỳ T11: {tot_bal:,.0f} · Lãi phải trả kỳ T11: {tot_int:,.0f}', border=False, font=B)
hdr(wv, 5, 1, ['Ngân hàng', 'Số khế ước', 'Ngày đáo hạn', 'Lãi suất %', 'Dư nợ gốc đầu kỳ', 'Gốc phải trả kỳ', 'Lãi phải trả kỳ', 'Ghi chú'], h=32)
rr = 6
for l in sorted(loans, key=lambda x: x['mat'] if isinstance(x['mat'], dt.datetime) else dt.datetime(2099, 1, 1)):
    near = isinstance(l['mat'], dt.datetime) and l['mat'] <= dt.datetime(2026, 12, 31)
    for j, v in enumerate([l['bank'], l['ctr'], l['mat'].date() if isinstance(l['mat'], dt.datetime) else '', l['rate'], l['bal'], l['prin'], l['intr'], 'Đáo hạn trong 2 tháng tới' if near else ''], 1):
        put(wv, rr, j, v, 'dd/mm/yyyy' if j == 3 else (NUM if j in (5, 6, 7) else None), fill=bad_fill if near else None)
    rr += 1
rr += 1; wv.cell(rr, 1, 'GIẢI NGÂN VAY TRẢ THẲNG NCC/LƯƠNG THEO THÁNG (cột “NCC” trong file theo dõi vay)').font = Font(bold=True, color=NAVY); rr += 1
mon = collections.defaultdict(float); lst = []
for r_ in range(3, wsv.max_row + 1):
    d = wsv.cell(r_, 4).value; a = wsv.cell(r_, 7).value
    if isinstance(d, dt.datetime) and d.year == 2026 and wsv.cell(r_, 20).value and a and wsv.cell(r_, 2).value != 'BIDV' or (isinstance(d, dt.datetime) and d.year == 2026 and wsv.cell(r_, 20).value and a and wsv.cell(r_, 2).value == 'BIDV' and d.month >= 8):
        mon[d.strftime('%Y-%m')] += a
hdr(wv, rr, 1, ['Tháng giải ngân', 'Số tiền (VND)']); rr += 1
for k in sorted(mon): put(wv, rr, 1, k); put(wv, rr, 2, mon[k], NUM); rr += 1
rr += 1; wv.cell(rr, 1, 'HẠN MỨC CÒN LẠI THEO BẢNG TÀI SẢN ĐẢM BẢO').font = Font(bold=True, color=NAVY); rr += 1
hdr(wv, rr, 1, ['Ngân hàng', 'Tổng giá trị cho vay (VND)', 'Đã giải ngân', 'Còn được giải ngân', 'Hạn mức giải ngân']); rr += 1
for v in [('Vietinbank (ngắn hạn)', 22698300000, 3331506364, 19366793636, 28800000000), ('BIDV (ngắn hạn)', 7385000000, 4211000000, 3174000000, 8000000000)]:
    for j, x in enumerate(v, 1): put(wv, rr, j, x, NUM if j > 1 else None)
    rr += 1
put(wv, rr + 1, 1, 'Lưu ý: số “đã giải ngân” trong bảng TSĐB (3,3 tỷ Vietinbank) nhỏ hơn dư nợ thực tế trên bảng theo dõi → cần KT xác nhận lại số liệu hạn mức với ngân hàng trước khi đề xuất vay thêm.', border=False, font=GREY)
widths(wv, {'A': 26, 'B': 24, 'C': 14, 'D': 11, 'E': 22, 'F': 20, 'G': 18, 'H': 28})

# ===================================================================== SHEET: Đối chiếu & rủi ro
wr = wb.create_sheet('Đối chiếu & rủi ro')
wr['A1'] = 'ĐỐI CHIẾU SỐ LIỆU, QUY LUẬT THU TIỀN & RỦI RO'; wr['A1'].font = Font(bold=True, size=14, color=NAVY)
rr = 3; wr.cell(rr, 1, 'A. Quy luật thu tiền cuối tháng (từ sổ 131/NH): 6 ngày làm việc cuối mỗi tháng').font = Font(bold=True, color=NAVY); rr += 1
hdr(wr, rr, 1, ['Tháng', 'Ngày cuối', 'Kế cuối', '3 từ cuối', '4 từ cuối', '5 từ cuối', '6 từ cuối', 'Tổng 6 ngày cuối', 'Thu cả tháng', '% trong tháng']); rr += 1
for m, vals, tot in hist_rows:
    for j, v in enumerate([f'T{m}/2026'] + vals + [sum(vals), tot, sum(vals) / tot], 1): put(wr, rr, j, v, '0%' if j == 10 else (NUM if j > 1 else None))
    rr += 1
put(wr, rr, 1, 'Trung bình', font=B)
for i in range(6): put(wr, rr, 2 + i, rank_mean[i], NUM, B)
put(wr, rr, 8, sum(rank_mean), NUM, B); rr += 2
wr.cell(rr, 1, 'B. Kiểm định mô hình (backtest 9 ngày cuối tháng, T6–T10)').font = Font(bold=True, color=NAVY); rr += 1
for t in ['Mô hình theo từng hóa đơn (tuổi nợ → xác suất trả) chỉ dự báo 2,3–3,6 lần THẤP hơn thực tế ở 9 ngày cuối tháng: khách hàng trả theo CHU KỲ cuối tháng (chốt công nợ/thanh toán tập trung), không rải đều theo hạn hóa đơn.',
          'Vì vậy kế hoạch dùng quy luật thực nghiệm (TB 6 ngày làm việc cuối tháng của 5 tháng, nhân hệ số 90%) cho tổng thu; mô hình hóa đơn chỉ dùng để phân bổ tiền cho từng khách và xếp hạng thu nợ.',
          'Thu 01–21/11 đúng quy luật (4,6 tỷ ≈ mức cùng kỳ T10: 4,1–4,7 tỷ) → chưa có dấu hiệu xấu đi, nhưng 100% kế hoạch phụ thuộc 2 ngày 27/11 và 30/11.']:
    put(wr, rr, 1, '• ' + t, wrap=True, border=False); wr.merge_cells(start_row=rr, start_column=1, end_row=rr, end_column=10); wr.row_dimensions[rr].height = 32; rr += 1
rr += 1; wr.cell(rr, 1, 'C. Chênh lệch giữa báo cáo kế toán và sổ sách (cần kế toán trưởng giải trình)').font = Font(bold=True, color=NAVY); rr += 1
hdr(wr, rr, 1, ['Chỉ tiêu', 'Báo cáo KT T10', 'Sổ sách (NH + quỹ)', 'Chênh lệch', 'Ghi chú']); rr += 1
for lab, a_, b_, nt in [('Tiền cuối kỳ 31/10', 4516608137, OPEN_BANK + OPEN_CASH, 'Báo cáo KT 4,52 tỷ; bảng kê số dư NH 1/11 = 2,71 tỷ + quỹ TM 0,69 tỷ = 3,40 tỷ.'),
                        ('Thu công nợ KH T10', 7564311971, 13636000000, 'Sổ NH T10 ghi thu KH 13,64 tỷ; báo cáo KT chỉ 7,56 tỷ (có thể chỉ tính khoản “đúng kế hoạch”).'),
                        ('Chi NCC T10', 5745330270, 10220000000, 'Sổ NH T10 chi NCC 10,22 tỷ (chưa gồm phần vay VCB trả thẳng ~3,0 tỷ).')]:
    for j, v in enumerate([lab, a_, b_, a_ - b_, nt], 1): put(wr, rr, j, v, NUM if j in (2, 3, 4) else None, wrap=(j == 5))
    wr.row_dimensions[rr].height = 30; rr += 1
rr += 1; wr.cell(rr, 1, 'D. Rủi ro chính cần theo dõi').font = Font(bold=True, color=NAVY); rr += 1
for t in ['Phụ thuộc thu cuối tháng: nếu 27/11 và 30/11 không có tiền, số dư chỉ còn ~0,5 tỷ sau trả gốc BIDV 24/11 và không có tiền trả NCC.',
          'Nợ NCC quá hạn ~9,2 tỷ + đến hạn 23–30/11 ~6,4 tỷ nhưng khả năng chi chỉ ~7,1 tỷ → thiếu hụt ~8,5 tỷ chuyển sang T12; rủi ro bị cắt hàng/tăng giá.',
          'Thuế GTGT còn phải nộp 1,44 tỷ (CPS 30/09) – chưa thấy nộp trong sổ NH T10–T11 → có thể phát sinh phạt chậm nộp; chưa đưa vào kế hoạch.',
          'Dư nợ vay ~29,9 tỷ; lịch đáo hạn tập trung 02–03/2027 (nhiều khế ước VCB 179 ngày) – cần kế hoạch tái tài trợ từ T1/2027.',
          'Thu nợ: AR mở 36,6 tỷ (~2,5 tháng doanh số), quá hạn >60 ngày tập trung ở nhóm khách lớn (xem sheet Thu KH).']:
    put(wr, rr, 1, '• ' + t, wrap=True, border=False); wr.merge_cells(start_row=rr, start_column=1, end_row=rr, end_column=10); wr.row_dimensions[rr].height = 32; rr += 1
widths(wr, {'A': 24, 'B': 18, 'C': 18, 'D': 16, 'E': 16, 'F': 16, 'G': 16, 'H': 18, 'I': 16, 'J': 14})

# ===================================================================== SHEET: Lịch sử T6-T10
wh = wb.create_sheet('Lịch sử T6-T10')
wh['A1'] = 'LỊCH SỬ KẾ HOẠCH vs THỰC HIỆN T6–T10/2026 (báo cáo quản trị dòng tiền của phòng KT) – VND'; wh['A1'].font = Font(bold=True, size=14, color=NAVY)
wh['A2'] = 'T8, T9 là báo cáo giữa tháng (18/08, 19/09) nên “thực hiện” chưa trọn tháng.'; wh['A2'].font = GREY
months = list(hist.keys()); labs = []
for k in months:
    for r_, b_, l_, a_, t_ in hist[k]:
        if l_ not in labs: labs.append(l_)
hdr(wh, 4, 1, ['Khoản mục'] + sum([[f'{m} KH', f'{m} TH'] for m in months], []), h=30)
for i, l_ in enumerate(labs):
    vals = []
    for k in months:
        m_ = [x for x in hist[k] if x[2] == l_]
        vals += [m_[0][3] if m_ else None, m_[0][4] if m_ else None]
    if not any(v for v in vals): continue
    rr = 5 + i
    put(wh, rr, 1, l_, font=B if l_.isupper() else None)
    for j, v in enumerate(vals, 2): put(wh, rr, j, v, NUM)
widths(wh, {'A': 56, **{L(c): 15 for c in range(2, 12)}}); wh.freeze_panes = 'B5'

# ===================================================================== SHEET: Giả định
wg = wb.create_sheet('Giả định & nguồn')
wg['A1'] = 'GIẢ ĐỊNH & NGUỒN DỮ LIỆU'; wg['A1'].font = Font(bold=True, size=14, color=NAVY)
txt = ['NGUỒN: sổ tiền gửi NH 01/10–21/11 (2 file), bảng kê số dư NH, sổ quỹ TM (đến 13/11), chi tiết 131 theo hóa đơn & theo khách (01/04–12/11), chi tiết 331 theo NCC + hạn thanh toán NCC (12/11), theo dõi vay NH (13/11), hợp đồng bán ra 2026, danh sách khách hàng, báo cáo dòng tiền T6–T10 của phòng KT.',
       'Thực hiện 01–21/11 lấy từ sổ NH (loại bỏ chuyển nội bộ giữa các TK) + sổ quỹ đến 13/11 + giải ngân vay trả thẳng NCC/lương. Sổ quỹ 14–21/11 chưa có → giả định số dư TM không đổi 699,9 tr.',
       'Thu KH 23–30/11 = TB các ngày làm việc cuối tháng T6–T10 × hệ số (mặc định 90%). Nov 28–29 (T7, CN) không thu.',
       'Chi NCC 22–30/11 = phần tiền còn dư sau khi giữ đủ gốc/lãi vay 3 ngày tới, chi phí vận hành và ngưỡng 150 tr (không phải nhu cầu).',
       'Vay: giả định KHÔNG đảo nợ, trả đúng lịch (BIDV 24/11, 25/11, 30/11). Không có giải ngân vay mới 22–30/11 (xem Phương án 2).',
       'Chi phí vận hành & khác chạy theo T10 (1,26 tỷ/tháng). Chưa tính GTGT tồn đọng 1,44 tỷ và các khoản đầu tư ngoài kế hoạch.',
       'Nhu cầu NCC: FIFO số dư 331 với điều khoản trong file “Hạn thanh toán NCC” (chốt cuối tháng + ngày N tháng sau; N ngày kể từ hóa đơn; mặc định 30 ngày khi chưa rõ). ~7% NCC chưa có kỳ hạn rõ.',
       'Số liệu kế toán (131/331) có thể còn sai lệch phân bổ FIFO; kết quả là ước tính phục vụ điều hành, cần đối chiếu thực tế hằng tuần.']
for i, t in enumerate(txt): put(wg, 3 + i, 1, '• ' + t, wrap=True, border=False); wg.row_dimensions[3 + i].height = 48
widths(wg, {'A': 150})
for _ws in wb.worksheets:
    _ws.page_setup.orientation = 'landscape'; _ws.page_setup.fitToWidth = 1; _ws.page_setup.fitToHeight = 0; _ws.sheet_properties.pageSetUpPr = openpyxl.worksheet.properties.PageSetupProperties(fitToPage=True)
wb.save(OUT); print('đã lưu', OUT)
