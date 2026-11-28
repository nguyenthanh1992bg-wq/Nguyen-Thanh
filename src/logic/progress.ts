import type { Attempt, UnitId } from '../types';
import { DAY_MS } from './srs';

export type UnitStatus = 'no-evidence' | 'needs-work' | 'learning' | 'likely-known' | 'secure' | 'mastered';

export const STATUS_LABEL: Record<UnitStatus, string> = {
  'no-evidence': 'Chưa đủ dữ liệu',
  'needs-work': 'Cần học kỹ',
  learning: 'Đang tiến bộ',
  'likely-known': 'Có vẻ đã biết (cần xác nhận)',
  secure: 'Khá vững',
  mastered: 'Thành thạo',
};

export const isKnown = (s: UnitStatus): boolean => s === 'likely-known' || s === 'secure' || s === 'mastered';

/** Trọng số: đúng không trợ giúp = 1; đúng nhưng có gợi ý/thử lại = 0,5; sai = 0. */
export function weight(a: Attempt): number {
  if (!a.correct) return 0;
  return a.hints > 0 || a.retry ? 0.5 : 1;
}

const unaidedCorrect = (a: Attempt): boolean => a.correct && a.hints === 0 && !a.retry;

/**
 * Đánh giá một đơn vị kiến thức từ lịch sử làm bài.
 * - Dưới 2 lần làm: chưa đủ dữ liệu (không kết luận).
 * - "Thành thạo" đòi hỏi: ≥ 3 câu khác nhau đúng không trợ giúp, độ chính xác gần đây ≥ 80%,
 *   và các lần đúng cách nhau ≥ 3 ngày (chứng tỏ nhớ lâu, không chỉ vừa học xong).
 */
export function unitStatus(all: Attempt[], unit: UnitId): UnitStatus {
  const as = all.filter((a) => a.unit === unit).sort((a, b) => a.ts - b.ts);
  if (as.length < 2) return 'no-evidence';
  const recent = as.slice(-6);
  const acc = recent.reduce((s, a) => s + weight(a), 0) / recent.length;
  const good = as.filter(unaidedCorrect);
  const distinct = new Set(good.map((a) => a.qId)).size;
  const span = good.length > 0 ? good[good.length - 1].ts - good[0].ts : 0;
  if (acc < 0.5) return 'needs-work';
  if (acc >= 0.8 && distinct >= 3 && span >= 3 * DAY_MS) return 'mastered';
  if (acc >= 0.75 && distinct >= 3) return 'secure';
  if (acc >= 0.75 && as.length < 4) return 'likely-known';
  return 'learning';
}

export interface UnitMistake {
  qId: string;
  unit: UnitId;
  wrongAnswer: string;
  ts: number;
  resolved: boolean;
}

/** Lỗi sai được coi là đã khắc phục khi sau đó làm đúng lại chính câu đó mà không cần gợi ý. */
export function mistakeLog(attempts: Attempt[]): UnitMistake[] {
  const byQ = new Map<string, Attempt[]>();
  for (const a of [...attempts].sort((x, y) => x.ts - y.ts)) {
    byQ.set(a.qId, [...(byQ.get(a.qId) ?? []), a]);
  }
  const out: UnitMistake[] = [];
  for (const [qId, list] of byQ) {
    const lastWrongIdx = list.map((a) => !a.correct).lastIndexOf(true);
    if (lastWrongIdx < 0) continue;
    const wrong = list[lastWrongIdx];
    const resolved = list.slice(lastWrongIdx + 1).some(unaidedCorrect);
    out.push({ qId, unit: wrong.unit, wrongAnswer: wrong.answer, ts: wrong.ts, resolved });
  }
  return out.sort((a, b) => b.ts - a.ts);
}

/** Sai lặp lại: ≥ 3 lần sai trong 5 lần làm gần nhất của cùng một đơn vị kiến thức. */
export function isRepeatedError(attempts: Attempt[], unit: UnitId): boolean {
  const recent = attempts.filter((a) => a.unit === unit).sort((a, b) => a.ts - b.ts).slice(-5);
  return recent.filter((a) => !a.correct).length >= 3;
}

/** Thời gian học ước tính (ms): mỗi lần làm tính tối đa 2 phút để không cộng thời gian bỏ máy. */
export function studyMs(attempts: Attempt[], readMs: number): number {
  return attempts.reduce((s, a) => s + Math.min(a.timeMs, 120_000), 0) + readMs;
}
