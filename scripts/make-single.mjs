import { readFileSync, writeFileSync } from 'node:fs';
const js = readFileSync('dist-single/app.js', 'utf8').replace(/<\/script/g, '<\\/script');
const css = readFileSync('dist-single/app.css', 'utf8');
writeFileSync('english-recovery-6.html', `<!doctype html>
<html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>English Recovery 6</title><style>${css}</style></head>
<body><div id="root"></div><script>${js}</script></body></html>
`);
console.log('Đã tạo english-recovery-6.html');
