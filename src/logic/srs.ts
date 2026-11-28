import type { Attempt, SrsCard, UnitId } from '../types';

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Lịch ôn ban đầu: sau 1, 3, 7, 14 ngày; sau đó 30 ngày. */
export const BASE_DAYS = [1, 3, 7, 14, 30];

export function intervalDays(box: number, lapses: number): number {
  const base = BASE_DAYS[Math.min(box, BASE_DAYS.length - 1)];
  // Sai nhiều lần ở thẻ này: rút ngắn khoảng cách để ôn dày hơn.
  const factor = lapses >= 2 ? 0.5 : lapses === 1 ? 0.75 : 1;
  return Math.max(1, Math.round(base * factor));
}

export function newCard(kind: 'q' | 'v', refId: string, unit: UnitId): SrsCard {
  return { key: `${kind}:${refId}`, kind, refId, unit, box: 0, lapses: 0, reps: 0, due: 0, lastTs: 0 };
}

export interface ReviewOutcome {
  correct: boolean;
  /** Đúng nhưng cần gợi ý hoặc thử lại. */
  assisted: boolean;
}

/**
 * Cập nhật thẻ sau một lần làm.
 * - Lần đầu gặp (reps = 0): luôn hẹn ôn lại sau 1 ngày.
 * - Đúng không trợ giúp: lên 1 bậc.
 * - Đúng nhưng có gợi ý/thử lại: giữ bậc, ôn lại sớm hơn.
 * - Sai: về bậc 0, tính một lần "lapse".
 */
export function applyOutcome(card: SrsCard, out: ReviewOutcome, now: number): SrsCard {
  const next: SrsCard = { ...card, lastTs: now, reps: card.reps + 1 };
  if (card.reps === 0) {
    next.box = 0;
    if (!out.correct) next.lapses = card.lapses + 1;
  } else if (!out.correct) {
    next.box = 0;
    next.lapses = card.lapses + 1;
  } else if (out.assisted) {
    next.box = card.box;
  } else {
    next.box = card.box + 1;
  }
  const days = out.correct && out.assisted ? Math.max(1, Math.ceil(intervalDays(next.box, next.lapses) / 2)) : intervalDays(next.box, next.lapses);
  next.due = now + days * DAY_MS;
  return next;
}

export function outcomeOf(a: Pick<Attempt, 'correct' | 'hints' | 'retry'>): ReviewOutcome {
  return { correct: a.correct, assisted: a.correct && (a.hints > 0 || a.retry) };
}

export function dueCards(srs: Record<string, SrsCard>, now: number): SrsCard[] {
  return Object.values(srs).filter((c) => c.due <= now).sort((a, b) => a.due - b.due);
}

/** Ngày của 4 lần ôn đầu tiên nếu học sinh làm đúng liên tục (để hiển thị cho học sinh). */
export function plannedSchedule(from: number): number[] {
  let t = from;
  return BASE_DAYS.slice(0, 4).map((d) => (t += d * DAY_MS));
}
