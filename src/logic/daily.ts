import type { Attempt } from '../types';
import { weight } from './progress';
import { DAY_MS } from './srs';

/** Số câu mục tiêu mỗi ngày (khoảng 15 phút học). */
export const DAILY_GOAL = 10;
/** Điểm cho một câu đúng không cần gợi ý; đúng nhờ gợi ý/thử lại được một nửa. */
export const POINTS_PER_CORRECT = 10;

const pad = (n: number) => String(n).padStart(2, '0');
/** Khóa ngày theo giờ địa phương của thiết bị. */
export const dayKey = (ts: number): string => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export interface DayStat { key: string; label: string; answered: number; points: number; accuracy: number | null }

export interface DailyStats {
  today: DayStat;
  goal: number;
  goalReached: boolean;
  /** Số ngày học liên tiếp. Tính đến hôm nay, hoặc đến hôm qua nếu hôm nay chưa học (chưa bị đứt). */
  streak: number;
  last7: DayStat[];
  /** Tổng điểm tích lũy từ các hoạt động học (không tính bài đầu vào). */
  totalPoints: number;
}

const isStudy = (a: Attempt): boolean => a.context !== 'placement' && a.context !== 'placement-extra';

function statFor(key: string, label: string, attempts: Attempt[]): DayStat {
  const as = attempts.filter((a) => isStudy(a) && dayKey(a.ts) === key);
  const points = Math.round(as.reduce((s, a) => s + weight(a) * POINTS_PER_CORRECT, 0));
  const acc = as.length === 0 ? null : Math.round((as.reduce((s, a) => s + weight(a), 0) / as.length) * 100);
  return { key, label, answered: as.length, points, accuracy: acc };
}

export function dailyStats(attempts: Attempt[], now: number): DailyStats {
  const days = new Set(attempts.map((a) => dayKey(a.ts)));
  // Dùng mốc giữa trưa để cộng/trừ ngày không bị lệch do đổi giờ.
  const noon = (offset: number) => { const d = new Date(now); d.setHours(12, 0, 0, 0); return d.getTime() - offset * DAY_MS; };
  const wd = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const last7 = Array.from({ length: 7 }, (_, i) => 6 - i).map((off) => statFor(dayKey(noon(off)), wd[new Date(noon(off)).getDay()], attempts));
  const today = last7[6];
  let streak = 0;
  let off = days.has(dayKey(noon(0))) ? 0 : 1;
  while (days.has(dayKey(noon(off)))) { streak += 1; off += 1; }
  return {
    today, goal: DAILY_GOAL, goalReached: today.answered >= DAILY_GOAL, streak, last7,
    totalPoints: attempts.filter(isStudy).reduce((s, a) => s + weight(a) * POINTS_PER_CORRECT, 0),
  };
}

/* ===== Đánh giá theo ngày và theo tuần ===== */

export type Stars = 0 | 1 | 2 | 3;

/** Sao trong ngày: 1 = đã làm ít nhất nửa mục tiêu, 2 = đủ mục tiêu, 3 = đủ mục tiêu và đúng ≥ 85%. */
export function dayStars(d: DayStat, goal = DAILY_GOAL): Stars {
  if (d.answered >= goal && (d.accuracy ?? 0) >= 85) return 3;
  if (d.answered >= goal) return 2;
  if (d.answered >= Math.ceil(goal / 2)) return 1;
  return 0;
}

export function dayComment(d: DayStat, goal = DAILY_GOAL): string {
  const s = dayStars(d, goal);
  if (s === 3) return 'Xuất sắc! Em đủ mục tiêu và làm rất chính xác.';
  if (s === 2) return 'Tốt lắm! Em đã đủ mục tiêu hôm nay. Lần sau thử làm chính xác hơn để được 3 sao.';
  if (s === 1) return `Gần đạt rồi! Làm thêm ${goal - d.answered} câu nữa là đủ mục tiêu.`;
  return d.answered === 0 ? 'Hôm nay em chưa học. Chỉ cần 10–15 phút thôi nhé!' : `Mới làm ${d.answered} câu. Cố lên nào!`;
}

export const WEEK_GOAL_DAYS = 5;
export const WEEK_GOAL_QUESTIONS = 50;

export interface WeekStat {
  /** Khóa tuần = ngày thứ Hai (theo giờ thiết bị). */
  key: string;
  startTs: number;
  daysActive: number;
  answered: number;
  points: number;
  accuracy: number | null;
  reached: boolean;
  /** Thưởng thêm khi đúng ≥ 85%. */
  excellent: boolean;
  grade: 'Xuất sắc' | 'Tốt' | 'Khá' | 'Cần cố gắng hơn' | 'Chưa học';
}

export function weekStart(ts: number): number {
  const d = new Date(ts);
  d.setHours(12, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7; // thứ Hai = 0
  return d.getTime() - dow * DAY_MS;
}

export function weekStat(attempts: Attempt[], ts: number): WeekStat {
  const start = weekStart(ts);
  const keys = new Set(Array.from({ length: 7 }, (_, i) => dayKey(start + i * DAY_MS)));
  const as = attempts.filter((a) => isStudy(a) && keys.has(dayKey(a.ts)));
  const days = new Set(as.map((a) => dayKey(a.ts))).size;
  const acc = as.length === 0 ? null : Math.round((as.reduce((s, a) => s + weight(a), 0) / as.length) * 100);
  const reached = days >= WEEK_GOAL_DAYS && as.length >= WEEK_GOAL_QUESTIONS;
  const excellent = reached && (acc ?? 0) >= 85;
  const grade: WeekStat['grade'] = as.length === 0 ? 'Chưa học' : excellent ? 'Xuất sắc' : reached ? 'Tốt' : days >= 3 ? 'Khá' : 'Cần cố gắng hơn';
  return {
    key: dayKey(start), startTs: start, daysActive: days, answered: as.length, accuracy: acc, reached, excellent, grade,
    points: Math.round(as.reduce((s, a) => s + weight(a) * POINTS_PER_CORRECT, 0)),
  };
}

/** Các tuần gần nhất, tuần mới nhất ở cuối. */
export const recentWeeks = (attempts: Attempt[], now: number, n = 4): WeekStat[] =>
  Array.from({ length: n }, (_, i) => n - 1 - i).map((off) => weekStat(attempts, now - off * 7 * DAY_MS));
