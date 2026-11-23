#!/usr/bin/env python3
"""Ghép src/* + vendor/xlsx thành 1 file HTML chạy offline: python3 build.py"""
import pathlib
r = pathlib.Path(__file__).parent
rd = lambda p: (r / p).read_text(encoding='utf-8')
app = '\n'.join(rd(f'src/{f}') for f in ['engine.js', 'demo.js', 'app1.js', 'app2.js', 'app3.js', 'app4.js', 'app5.js', 'app6.js', 'app7.js', 'app8.js', 'app9.js', 'app10.js', 'app11.js', 'app12.js'])
app = app.replace('</script', '<\\/script')
html = rd('src/index.html').replace('/*STYLE*/', rd('src/style.css')).replace('/*XLSX*/', rd('vendor/xlsx.full.min.js').replace('</script', '<\\/script')).replace('/*APP*/', app)
out = r / 'Quan_tri_dong_tien_Hoang_Gia.html'
out.write_text(html, encoding='utf-8')
print('OK', out, round(out.stat().st_size / 1024), 'KB')
real = r / 'data_real' / 'app_data.json'
if real.exists():      # bản có dữ liệu thật (KHÔNG commit): data_real/ nằm trong .gitignore
    data = real.read_text(encoding='utf-8').replace('</script', '<\\/script')
    h2 = html.replace('<script>\n/*APP*/', '<script>window.__REAL=' + data + ';</script>\n<script>\n/*APP*/') if '/*APP*/' in html else None
    marker = '<script>\n' + app[:40]
    h2 = html.replace(marker, '<script>window.__REAL=' + data + ';</script>\n' + marker, 1)
    o2 = r / 'data_real' / 'Quan_tri_dong_tien_Hoang_Gia_DU_LIEU_THAT.html'
    o2.write_text(h2, encoding='utf-8'); print('OK (dữ liệu thật)', o2, round(o2.stat().st_size / 1024), 'KB')
