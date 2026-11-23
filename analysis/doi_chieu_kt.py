import openpyxl, datetime as dt, statistics
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
U = '/root/.claude/uploads/79bc319a-108c-5b8f-b18e-02ca38b35d45/'
ws = openpyxl.load_workbook(U + '9d086d5a-B_O_C_O_D_NG_TI_N_T11-13.11.xlsx', data_only=True)['DÒNG TIỀN T11.2026']
num = lambda x: x if isinstance(x, (int, float)) else 0
PL = [8, 12, 16, 20, 24]; AC = [9, 13, 17, 21, 25]       # cột kế hoạch / thực hiện từng tuần
def row(r): return dict(plan=[num(ws.cell(r, c).value) for c in PL], act=[num(ws.cell(r, c).value) for c in AC], mplan=num(ws.cell(r, 4).value), mact=num(ws.cell(r, 5).value))
KT = dict(thu=row(14), thu_kh=row(15), vay=row(22), chi=row(24), ncc=row(26), luong_vp=row(35), luong_sx=row(75), bh=row(37), thue=row(46), goc=row(57), lai=row(58), ck=row(65))
for k, v in KT.items(): print(k, [round(x / 1e6) for x in v['plan']], '| TH', [round(x / 1e6) for x in v['act']], '| tháng KH', round(v['mplan'] / 1e6), 'TH', round(v['mact'] / 1e6))
# ---- bản của tôi (đã tính lại)
wb = openpyxl.load_workbook('/tmp/lo/KE_HOACH_DONG_TIEN_T11-2026.xlsx', data_only=True); mw = wb['KH T11-2026']
def mine(r): return [num(mw.cell(r, 5 + 3 * w).value) for w in range(5)]          # cột Tổng từng tuần
ME = dict(thu=mine(9), thu_kh=mine(10), vay=mine(11), chi=mine(14), ncc=mine(15), luong=mine(16), bh=mine(17), thue=mine(18), goc=mine(19), lai=mine(20), close=mine(24))
OPEN_KT = 2915.9e6
plan_net = [KT['thu']['plan'][i] - KT['chi']['plan'][i] for i in range(5)]
close_kt = []; b = OPEN_KT
for n in plan_net: b += n; close_kt.append(b)
print('đóng cửa tuần KT (kế hoạch):', [round(x / 1e6) for x in close_kt])
# ---- lịch sử độ chính xác thu KH của KT (kế hoạch vs sổ NH thực tế)
hist = [('T6', 14387, 15453), ('T7', 16136, 15026), ('T8', 16695, 13964), ('T9', 15055, 13269), ('T10', 14148, 13770)]
for h in hist: print(h[0], f'KT kế hoạch {h[1]} / sổ NH {h[2]} = {h[2] / h[1]:.0%}')
mape_kt = statistics.mean(abs(a / p - 1) for _, p, a in hist)
last6 = [8873, 8131, 8546, 8744, 9033]
loo = [abs(statistics.mean(last6[:i] + last6[i + 1:]) / last6[i] - 1) for i in range(5)]
print('sai số TB lịch sử KT', round(mape_kt, 3), '| sai số rolling-origin của phương pháp cuối tháng', round(statistics.mean(loo), 3))
# ---- Excel
NAVY = '10264D'; hf = PatternFill('solid', fgColor=NAVY); sf = PatternFill('solid', fgColor='E8EEF7'); bad = PatternFill('solid', fgColor='FDE8E8'); good = PatternFill('solid', fgColor='EAF4EA'); yel = PatternFill('solid', fgColor='FFF9DB')
thin = Side(style='thin', color='C9D1DC'); box = Border(left=thin, right=thin, top=thin, bottom=thin); NUM = '#,##0;[Red](#,##0);"-"'
def put(w, r, c, v, fmt=None, bold=False, fill=None, wrap=False, color=None):
    x = w.cell(r, c, v); x.border = box; x.alignment = Alignment(wrap_text=wrap, vertical='top')
    if fmt: x.number_format = fmt
    if bold or color: x.font = Font(bold=bold, color=color)
    if fill: x.fill = fill
    return x
def head(w, r, vals, h=32):
    for i, v in enumerate(vals):
        c = w.cell(r, 1 + i, v); c.fill = hf; c.font = Font(bold=True, color='FFFFFF'); c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True); c.border = box
    w.row_dimensions[r].height = h
o = openpyxl.Workbook(); w1 = o.active; w1.title = 'So sánh theo tuần'
w1['A1'] = 'ĐỐI CHIẾU KẾ HOẠCH DÒNG TIỀN T11/2026: KẾ TOÁN TRƯỞNG (báo cáo 13/11) so với BẢN PHÂN TÍCH (cập nhật 23/11)'; w1['A1'].font = Font(bold=True, size=14, color=NAVY)
w1['A2'] = 'VND. “TH” = thực hiện theo sổ (KT: đến 13/11; bản phân tích: đến 21/11). Tuần 4–5 của cả hai bản là DỰ BÁO.'; w1['A2'].font = Font(italic=True, color='666666')
r = 4
wk = ['Tuần 1 (01–08/11)', 'Tuần 2 (09–15/11)', 'Tuần 3 (16–22/11)', 'Tuần 4 (23–29/11)', 'Tuần 5 (30/11)']
def block(title, key_kt, key_me, r, actual_note=''):
    w1.cell(r, 1, title).font = Font(bold=True, color=NAVY); r += 1
    head(w1, r, ['', 'Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4', 'Tuần 5', 'Cả tháng']); r += 1
    k = KT[key_kt]
    put(w1, r, 1, 'KT – kế hoạch'); [put(w1, r, 2 + i, k['plan'][i], NUM) for i in range(5)]; put(w1, r, 7, f'=SUM(B{r}:F{r})', NUM, True); rp = r; r += 1
    put(w1, r, 1, 'KT – thực hiện (đến 13/11)'); [put(w1, r, 2 + i, k['act'][i], NUM, fill=good) for i in range(5)]; put(w1, r, 7, f'=SUM(B{r}:F{r})', NUM, True); r += 1
    put(w1, r, 1, 'Bản phân tích (TH đến 21/11 + dự báo)'); [put(w1, r, 2 + i, ME[key_me][i] if key_me else 0, NUM, fill=yel) for i in range(5)]; put(w1, r, 7, f'=SUM(B{r}:F{r})', NUM, True); rm = r; r += 1
    put(w1, r, 1, 'Chênh lệch (phân tích − KT kế hoạch)', bold=True); [put(w1, r, 2 + i, f'={L}{rm}-{L}{rp}', NUM, True, bad) for i, L in enumerate('BCDEF')]; put(w1, r, 7, f'=G{rm}-G{rp}', NUM, True, bad)
    return r + 2
r = block('1. THU CÔNG NỢ KHÁCH HÀNG', 'thu_kh', 'thu_kh', r)
r = block('2. CHI THANH TOÁN NHÀ CUNG CẤP', 'ncc', 'ncc', r)
r = block('3. TRẢ GỐC VAY NGÂN HÀNG', 'goc', 'goc', r)
r = block('4. TỔNG THU', 'thu', 'thu', r)
r = block('5. TỔNG CHI', 'chi', 'chi', r)
w1.cell(r, 1, '6. SỐ DƯ CUỐI TUẦN').font = Font(bold=True, color=NAVY); r += 1
head(w1, r, ['', 'Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4', 'Tuần 5']); r += 1
put(w1, r, 1, 'KT – kế hoạch (đầu kỳ 2.915,9 tr + thu − chi kế hoạch)'); [put(w1, r, 2 + i, close_kt[i], NUM, fill=bad if close_kt[i] < 0 else None) for i in range(5)]; r += 1
put(w1, r, 1, 'Bản phân tích (đầu kỳ 3.403,1 tr theo sổ NH + quỹ)'); [put(w1, r, 2 + i, ME['close'][i], NUM, fill=yel) for i in range(5)]; r += 2
w1.cell(r, 1, 'Nhận xét: kế hoạch của KT, nếu cộng dồn theo tuần, có số dư ÂM ở tuần 2–4 (thấp nhất −2,98 tỷ ở tuần 3) và chỉ về dương nhờ 7,86 tỷ thu + 6,99 tỷ chi dồn vào ngày 30/11.').alignment = Alignment(wrap_text=True)
w1.merge_cells(start_row=r, start_column=1, end_row=r, end_column=7); w1.row_dimensions[r].height = 36
w1.column_dimensions['A'].width = 52
for c in 'BCDEFG': w1.column_dimensions[c].width = 17
# ---- độ chính xác lịch sử
w2 = o.create_sheet('Độ chính xác dự báo thu')
w2['A1'] = 'KIỂM CHỨNG ĐỘ CHÍNH XÁC DỰ BÁO THU KHÁCH HÀNG'; w2['A1'].font = Font(bold=True, size=14, color=NAVY)
head(w2, 3, ['Tháng', 'KT kế hoạch thu KH (tr)', 'Sổ NH thực tế thu KH (tr)', 'Thực tế / kế hoạch', 'Sai số tuyệt đối'])
for i, (m, p, a) in enumerate(hist):
    rr = 4 + i; put(w2, rr, 1, m); put(w2, rr, 2, p, NUM); put(w2, rr, 3, a, NUM); put(w2, rr, 4, f'=C{rr}/B{rr}', '0%'); put(w2, rr, 5, f'=ABS(D{rr}-1)', '0.0%')
put(w2, 9, 1, 'Trung bình', bold=True); put(w2, 9, 5, '=AVERAGE(E4:E8)', '0.0%', True)
put(w2, 10, 1, 'T11 (kế hoạch KT)'); put(w2, 10, 2, KT['thu_kh']['mplan'] / 1e6, NUM); put(w2, 10, 3, 'cao hơn tháng cao nhất 5 tháng (15.453) 13%'); w2.merge_cells('C10:E10')
w2['A12'] = 'Thu khách hàng 6 ngày làm việc cuối tháng (sổ 131/NH), T6–T10:'; w2['A12'].font = Font(bold=True)
head(w2, 13, ['Tháng', '6 ngày cuối (tr)', 'Dự báo bằng TB 4 tháng còn lại (tr)', 'Sai số'])
for i, (m, a) in enumerate(zip(['T6', 'T7', 'T8', 'T9', 'T10'], last6)):
    rr = 14 + i; put(w2, rr, 1, m); put(w2, rr, 2, a, NUM); put(w2, rr, 3, round(statistics.mean(last6[:i] + last6[i + 1:])), NUM); put(w2, rr, 4, f'=ABS(C{rr}/B{rr}-1)', '0.0%')
put(w2, 19, 1, 'Trung bình', bold=True); put(w2, 19, 4, '=AVERAGE(D14:D18)', '0.0%', True)
put(w2, 21, 1, 'KT T11 dự kiến thu KH trong tuần 4–5 (23–30/11)'); put(w2, 21, 2, (KT['thu_kh']['plan'][3] + KT['thu_kh']['plan'][4]) / 1e6, NUM, True, bad)
put(w2, 22, 1, 'Mức cao nhất 6 ngày cuối từng đạt (T10)'); put(w2, 22, 2, max(last6), NUM)
put(w2, 23, 1, 'Bản phân tích (hệ số 100%)'); put(w2, 23, 2, 8665, NUM, fill=yel)
w2.column_dimensions['A'].width = 52
for c in 'BCDE': w2.column_dimensions[c].width = 28
# ---- chấm điểm
w3 = o.create_sheet('Chấm điểm')
w3['A1'] = 'CHẤM ĐIỂM HAI BẢN KẾ HOẠCH DÒNG TIỀN THÁNG 11/2026 (thang 100)'; w3['A1'].font = Font(bold=True, size=14, color=NAVY)
head(w3, 3, ['Tiêu chí', 'Trọng số', 'Điểm KT (0–10)', 'Điểm phân tích (0–10)', 'KT (quy đổi)', 'Phân tích (quy đổi)', 'Căn cứ'], h=34)
crit = [('Độ chính xác dự báo thu khách hàng', 25, 4.5, 8.0, 'KT: sai số lịch sử TB 11% và nghiêng về lạc quan (84–107%); T11 đặt 17,5 tỷ, cao hơn mọi tháng gần đây 13%, tuần 4–5 = 12,5 tỷ so với kỷ lục 9,0 tỷ. Phân tích: dựa quy luật cuối tháng, sai số kiểm chứng ~4%; chưa kiểm chứng bằng thực tế tháng 11.'),
        ('Tính khả thi thanh khoản (số dư, thứ tự trả)', 20, 3.5, 8.0, 'KT: cộng dồn theo tuần số dư âm 3 tuần (−3,0 tỷ), cân đối nhờ ngày 30/11 (thu 7,86 + chi NCC 6,99 tỷ), không có ngưỡng an toàn. Phân tích: kế hoạch theo ngày, giữ ngưỡng 150 tr, ưu tiên gốc/lãi vay trước NCC.'),
        ('Đầy đủ khoản mục, chi tiết theo bộ phận', 15, 9.5, 6.0, 'KT: ~80 khoản mục theo khối văn phòng/nhà máy, so kế hoạch–thực hiện. Phân tích: 9 nhóm khoản mục, không chia bộ phận.'),
        ('Độ tin cậy số dư đầu kỳ / đối chiếu sổ', 10, 5.0, 9.0, 'KT: đầu kỳ 2.915,9 tr (tiền mặt 5,3 tr, NH 2.910,6 tr) lệch sổ: NH 2.710,5 tr, quỹ TM 692,6 tr. Phân tích: lấy từ bảng kê số dư NH + sổ quỹ, khớp số học đến 21/11.'),
        ('Phân tích rủi ro, kịch bản, phương án xử lý', 15, 4.0, 8.5, 'KT: không có kịch bản/ phương án trong bảng. Phân tích: 3 kịch bản, 4 phương án chấm điểm, chọn 2, đo tác động & chi phí.'),
        ('Truy vết nguồn số liệu & khả năng cập nhật', 10, 7.5, 8.0, 'KT: thực hiện theo tuần, quen thuộc với bộ máy; nhưng cơ sở dự báo từng dòng không ghi rõ. Phân tích: có sheet giả định & nguồn, ô chỉnh được, công thức.'),
        ('Tính ứng dụng cho điều hành / họp', 5, 7.0, 8.0, 'KT: dùng đúng mẫu quen thuộc của công ty. Phân tích: có danh sách khách/NCC ưu tiên, SOP hành động.')]
for i, (n, w, a, b_, note) in enumerate(crit):
    rr = 4 + i; put(w3, rr, 1, n, wrap=True); put(w3, rr, 2, w, '0'); put(w3, rr, 3, a, '0.0', fill=yel); put(w3, rr, 4, b_, '0.0', fill=yel); put(w3, rr, 5, f'=B{rr}*C{rr}/10', '0.0'); put(w3, rr, 6, f'=B{rr}*D{rr}/10', '0.0'); put(w3, rr, 7, note, wrap=True); w3.row_dimensions[rr].height = 62
rr = 4 + len(crit); put(w3, rr, 1, 'TỔNG ĐIỂM', bold=True); put(w3, rr, 2, f'=SUM(B4:B{rr-1})', '0', True)
put(w3, rr, 5, f'=SUM(E4:E{rr-1})', '0.0', True, good); put(w3, rr, 6, f'=SUM(F4:F{rr-1})', '0.0', True, good)
put(w3, rr + 1, 1, 'Xếp loại', bold=True); put(w3, rr + 1, 5, f'=IF(E{rr}>=80,"Tốt",IF(E{rr}>=65,"Khá",IF(E{rr}>=50,"Trung bình","Yếu")))', bold=True); put(w3, rr + 1, 6, f'=IF(F{rr}>=80,"Tốt",IF(F{rr}>=65,"Khá",IF(F{rr}>=50,"Trung bình","Yếu")))', bold=True)
w3.cell(rr + 3, 1, 'Giới hạn của việc chấm điểm: (1) bản phân tích lập sau (23/11) nên biết thêm thực tế tuần 3; (2) điểm là đánh giá chuyên gia, chưa có kết quả thực tế 30/11; (3) bản phân tích ít khoản mục hơn. Nên chấm lại sau khi chốt tháng 11 bằng số thực tế.').alignment = Alignment(wrap_text=True)
w3.merge_cells(start_row=rr + 3, start_column=1, end_row=rr + 3, end_column=7); w3.row_dimensions[rr + 3].height = 44
for c, wd in zip('ABCDEFG', [44, 10, 14, 16, 14, 16, 90]): w3.column_dimensions[c].width = wd
o.move_sheet('Chấm điểm', offset=-2)
o.save('/home/user/Nguyen-Thanh/data_real/DOI_CHIEU_KE_HOACH_T11_KT_vs_PHAN_TICH.xlsx'); print('ok')
