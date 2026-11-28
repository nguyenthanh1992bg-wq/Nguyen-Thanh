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
