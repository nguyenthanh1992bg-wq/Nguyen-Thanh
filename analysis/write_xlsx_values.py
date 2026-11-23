"""Đọc kết quả đã tính lại (LibreOffice) của file kế hoạch T11 để đưa vào app."""
import openpyxl
def plan_json(path='/tmp/lo/KE_HOACH_DONG_TIEN_T11-2026.xlsx'):
    wb = openpyxl.load_workbook(path, data_only=True); ws = wb['KH T11-2026']
    rows = []
    for r in range(7, 27):
        lab = ws.cell(r, 2).value
        if not lab: continue
        rows.append(dict(label=str(lab).strip(), bold=not str(lab).startswith('  '), vals=[[ws.cell(r, 3 + w * 3 + k).value for k in range(3)] for w in range(5)], month=[ws.cell(r, c).value for c in (18, 19, 20)], note=ws.cell(r, 21).value))
    track = {str(ws.cell(r, 2).value): ws.cell(r, 4).value for r in range(29, 34) if ws.cell(r, 2).value}
    wp = wb['Đề xuất 2 PA']; lev = []
    for r in range(5, 9):
        if wp.cell(r, 1).value: lev.append(dict(id=wp.cell(r, 1).value, name=wp.cell(r, 2).value, type=wp.cell(r, 3).value, score=wp.cell(r, 4).value, impact=wp.cell(r, 9).value, cost=wp.cell(r, 10).value, ttc=wp.cell(r, 11).value, pick=bool(wp.cell(r, 12).value)))
    wd = wb['Dòng tiền ngày 22-30.11']
    days = [dict(d=str(wd.cell(r, 1).value)[:10], thu=wd.cell(r, 6).value, goc=wd.cell(r, 7).value, lai=wd.cell(r, 8).value, cp=wd.cell(r, 9).value, ncc=wd.cell(r, 11).value, close=wd.cell(r, 13).value) for r in range(9, 18)]
    return dict(weeks=['Tuần 1 (01–08/11)', 'Tuần 2 (09–15/11)', 'Tuần 3 (16–22/11)', 'Tuần 4 (23–29/11)', 'Tuần 5 (30/11)'], rows=rows, track=track, levers=lev, days=days, updated='23/11/2026')
