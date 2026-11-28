/** Đăng ký service worker để app cài được lên màn hình chính và chạy ngoại tuyến sau lần mở đầu. */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  const secure = window.isSecureContext || location.hostname === 'localhost';
  if (!secure || location.protocol === 'file:') return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* môi trường không cho phép: bỏ qua */ });
  });
}
