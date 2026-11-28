import type { AppData } from '../types';
import { dailyStats, dayKey } from './daily';
import { dueCards } from './srs';

export interface ReminderState {
  studiedToday: boolean;
  /** Đã quá giờ nhắc trong ngày. */
  pastTime: boolean;
  dueCount: number;
  /** Cần nhắc học bài hôm nay. */
  needStudy: boolean;
  message: string | null;
}

export function minutesOf(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return 19 * 60;
  return Math.min(23, Number(m[1])) * 60 + Math.min(59, Number(m[2]));
}

export function reminderState(d: AppData, now: number): ReminderState {
  const today = dailyStats(d.attempts, now).today;
  const studiedToday = today.answered >= 1;
  const date = new Date(now);
  const pastTime = date.getHours() * 60 + date.getMinutes() >= minutesOf(d.settings.reminderTime);
  const dueCount = dueCards(d.srs, now).length;
  const needStudy = d.settings.reminderOn && !studiedToday && pastTime;
  let message: string | null = null;
  if (needStudy) message = `⏰ Đến giờ học rồi! Mục tiêu hôm nay là ${dailyStats(d.attempts, now).goal} câu.${dueCount > 0 ? ` Có ${dueCount} nội dung đến hạn ôn.` : ''}`;
  else if (dueCount > 0) message = `🔁 Có ${dueCount} nội dung đến hạn ôn. Ôn ngay để nhớ lâu hơn!`;
  return { studiedToday, pastTime, dueCount, needStudy, message };
}

/** Chỉ thông báo một lần mỗi ngày, và chỉ khi chưa học hôm nay. */
export function shouldNotify(d: AppData, now: number, lastNotifiedDay: string | null): boolean {
  const r = reminderState(d, now);
  return (r.needStudy || (d.settings.reminderOn && r.pastTime && r.dueCount > 0 && !r.studiedToday)) && lastNotifiedDay !== dayKey(now);
}

const pad = (n: number) => String(n).padStart(2, '0');
const stamp = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

/** Lần nhắc kế tiếp (hôm nay nếu chưa qua giờ, nếu không thì ngày mai). */
export function nextOccurrence(hhmm: string, now: number): Date {
  const m = minutesOf(hhmm);
  const d = new Date(now);
  d.setHours(Math.floor(m / 60), m % 60, 0, 0);
  if (d.getTime() <= now) d.setDate(d.getDate() + 1);
  return d;
}

const TITLE = 'Học tiếng Anh 15 phút';
const DETAIL = 'Làm bài hôm nay và ôn các nội dung đến hạn trong ứng dụng English Recovery 6.';

/** Liên kết thêm sự kiện lặp hằng ngày vào Google Calendar (mở trong tab mới). */
export function googleCalendarUrl(hhmm: string, now: number): string {
  const start = nextOccurrence(hhmm, now);
  const end = new Date(start.getTime() + 15 * 60_000);
  const q = new URLSearchParams({ action: 'TEMPLATE', text: TITLE, details: DETAIL, dates: `${stamp(start)}/${stamp(end)}`, recur: 'RRULE:FREQ=DAILY' });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

/** Nội dung tệp .ics (Apple/Outlook/Google): sự kiện lặp hằng ngày có chuông báo đúng giờ. */
export function icsContent(hhmm: string, now: number): string {
  const start = nextOccurrence(hhmm, now);
  const end = new Date(start.getTime() + 15 * 60_000);
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//English Recovery 6//VI', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:er6-daily-${stamp(start)}@english-recovery-6`, `DTSTAMP:${stamp(new Date(now))}`,
    `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`, 'RRULE:FREQ=DAILY', `SUMMARY:${TITLE}`, `DESCRIPTION:${DETAIL}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${TITLE}`, 'TRIGGER:PT0M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}
