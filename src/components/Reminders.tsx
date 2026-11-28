import { useEffect, useState } from 'react';
import { useApp } from '../state/AppContext';
import { googleCalendarUrl, icsContent, reminderState, shouldNotify } from '../logic/reminders';
import { dayKey } from '../logic/daily';
import { Note } from './ui';

const NOTIFIED_KEY = 'english-recovery-6:notified';

/** Banner nhắc học / ôn tập ở đầu Trang chủ. */
export function ReminderBanner() {
  const { data, go, now } = useApp();
  const r = reminderState(data, now());
  if (!r.message) return null;
  return (
    <Note kind="warn">
      <b>{r.message}</b>
      <div className="row">
        {r.needStudy && <button className="btn btn-primary" onClick={() => go({ name: 'home' })}>Học ngay</button>}
        {r.dueCount > 0 && <button className="btn btn-soft" onClick={() => go({ name: 'review', mode: 'due' })}>Ôn {r.dueCount} nội dung</button>}
      </div>
    </Note>
  );
}

/** Gửi thông báo của trình duyệt (khi app đang mở hoặc chạy nền) một lần mỗi ngày. */
export function useReminderNotifier(): void {
  const { data, now } = useApp();
  useEffect(() => {
    const tick = () => {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
      let last: string | null = null;
      try { last = localStorage.getItem(NOTIFIED_KEY); } catch { /* bỏ qua */ }
      const t = now();
      if (!shouldNotify(data, t, last)) return;
      const r = reminderState(data, t);
      const body = r.message ?? 'Đến giờ học tiếng Anh rồi!';
      try { localStorage.setItem(NOTIFIED_KEY, dayKey(t)); } catch { /* bỏ qua */ }
      const show = () => { new Notification('English Recovery 6', { body, icon: './icon-192.png' }); };
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then((reg) => { if (reg) return reg.showNotification('English Recovery 6', { body, icon: './icon-192.png' }); show(); }, show);
      } else show();
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [data, now]);
}

/** Cài đặt nhắc học hằng ngày. */
export function ReminderSettings() {
  const { data, dispatch, now } = useApp();
  const s = data.settings;
  const inArtifact = typeof window !== 'undefined' && 'claude' in window; // khung Artifact chặn tải tệp
  const [perm, setPerm] = useState<string>(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);

  async function ask() {
    if (typeof Notification === 'undefined') return;
    try { setPerm(await Notification.requestPermission()); } catch { setPerm('denied'); }
  }
  function downloadIcs() {
    const blob = new Blob([icsContent(s.reminderTime, now())], { type: 'text/calendar' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'nhac-hoc-tieng-anh.ics';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  return (
    <div>
      <label className="field row" htmlFor="rem-on">
        <input id="rem-on" type="checkbox" checked={s.reminderOn} onChange={(e) => dispatch({ type: 'settings', settings: { reminderOn: e.target.checked } })} />
        <span>Nhắc em học mỗi ngày</span>
      </label>
      <label className="field" htmlFor="rem-time">Giờ nhắc
        <input id="rem-time" className="input" type="time" value={s.reminderTime} onChange={(e) => e.target.value && dispatch({ type: 'settings', settings: { reminderTime: e.target.value } })} />
      </label>
      <p className="small muted">Trong ứng dụng, em sẽ thấy lời nhắc khi mở app sau giờ này mà chưa học, và chấm đỏ trên mục Ôn tập khi có nội dung đến hạn.</p>

      <h3>Thông báo trên thiết bị</h3>
      {perm === 'unsupported' && <p className="small muted">Trình duyệt này không hỗ trợ thông báo.</p>}
      {perm === 'granted' && <p className="small">✅ Đã bật thông báo. App sẽ báo một lần mỗi ngày khi đến giờ mà chưa học, <b>nhưng chỉ khi app đang mở hoặc chạy nền</b>.</p>}
      {perm === 'denied' && <p className="small">Thông báo đang bị chặn. Bật lại trong cài đặt trình duyệt của trang này.</p>}
      {perm === 'default' && <button className="btn btn-soft" onClick={() => void ask()}>Cho phép thông báo</button>}

      <h3>Nhắc đúng giờ ngay cả khi không mở app</h3>
      <p className="small muted">Cách đáng tin cậy nhất là thêm lịch nhắc lặp hằng ngày vào lịch của điện thoại (ứng dụng web không tự báo được khi đã đóng).</p>
      <div className="row">
        <a className="btn btn-soft" href={googleCalendarUrl(s.reminderTime, now())} target="_blank" rel="noopener noreferrer">📅 Thêm vào Google Calendar</a>
        {!inArtifact && <button type="button" className="btn btn-soft" onClick={downloadIcs}>⬇ Tải tệp lịch (.ics)</button>}
      </div>
    </div>
  );
}
