// Mở app cho điện thoại/máy tính bảng cùng mạng wifi: npm run wifi
import { networkInterfaces } from 'node:os';
import { spawn } from 'node:child_process';

const ips = Object.values(networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
const port = 4173;
console.log('\nMở trình duyệt trên điện thoại (cùng wifi) và vào một trong các địa chỉ:');
for (const ip of ips) console.log(`   http://${ip}:${port}`);
console.log('\nGhi chú: muốn "Cài lên màn hình chính" và dùng ngoại tuyến, cần địa chỉ https (xem README).\n');

const build = spawn('npm', ['run', 'build'], { stdio: 'inherit', shell: true });
build.on('exit', (code) => {
  if (code !== 0) process.exit(code ?? 1);
  spawn('npx', ['vite', 'preview', '--host', '0.0.0.0', '--port', String(port), '--strictPort'], { stdio: 'inherit', shell: true });
});
