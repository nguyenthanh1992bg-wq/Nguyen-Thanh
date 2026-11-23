#!/usr/bin/env python3
"""Ghép src/* + vendor/xlsx thành 1 file HTML chạy offline: python3 build.py"""
import pathlib
r = pathlib.Path(__file__).parent
rd = lambda p: (r / p).read_text(encoding='utf-8')
app = '\n'.join(rd(f'src/{f}') for f in ['engine.js', 'demo.js', 'app1.js', 'app2.js', 'app3.js', 'app4.js', 'app5.js', 'app6.js', 'app7.js'])
app = app.replace('</script', '<\\/script')
html = rd('src/index.html').replace('/*STYLE*/', rd('src/style.css')).replace('/*XLSX*/', rd('vendor/xlsx.full.min.js').replace('</script', '<\\/script')).replace('/*APP*/', app)
out = r / 'Quan_tri_dong_tien_Hoang_Gia.html'
out.write_text(html, encoding='utf-8')
print('OK', out, round(out.stat().st_size / 1024), 'KB')
