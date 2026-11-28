import { LESSONS } from '../data/lessons';
import { QUESTION_BANK, getQuestion } from '../data/questionBank';
import { UNITS, WEEKS, getUnit, unitIndex } from '../data/curriculum';
import type { AppData, Attempt, Lesson, Question, UnitId } from '../types';
import { buildPath, analyzePlacement } from './placement';
import { unitStatus } from './progress';
import { dueCards } from './srs';

export const PASS_QUIZ_MIN = 2; // trên 3 câu cuối bài
export const WEEKLY_PASS_RATIO = 0.7;

export const lessonByUnit = (unit: UnitId): Lesson | undefined => LESSONS.find((l) => l.unit === unit);
export const lessonById = (id: string): Lesson | undefined => LESSONS.find((l) => l.id === id);

export const isPassed = (data: AppData, lessonId: string): boolean => data.lessons[lessonId]?.passed === true;

/**
 * Bài bị khóa khi kiến thức tiên quyết còn yếu VÀ bài dạy phần đó đã có mà chưa đạt.
 * Nếu tiên quyết chưa có bài (bản MVP) hoặc chưa đủ dữ liệu thì không khóa, để học sinh không bị kẹt.
 */
export function lockReason(data: AppData, lesson: Lesson): string | null {
  for (const p of getUnit(lesson.unit).prerequisites) {
    const pl = lessonByUnit(p);
    if (!pl || isPassed(data, pl.id)) continue;
    if (unitStatus(data.attempts, p) === 'needs-work') {
      return `Em nên học "${pl.title}" trước, vì bài này cần kiến thức đó.`;
    }
  }
  return null;
}

export type NextActivity =
  | { kind: 'placement'; resume: boolean }
  | { kind: 'lesson'; lesson: Lesson; why: string }
  | { kind: 'review'; count: number }
  | { kind: 'all-done' };

/** Gợi ý hoạt động hôm nay. Không bao giờ đưa học sinh sang bài bị khóa. */
export function nextActivity(data: AppData, now: number): NextActivity {
  if (data.placement.status !== 'done') return { kind: 'placement', resume: data.placement.status === 'in-progress' };
  const analysis = analyzePlacement(data.attempts);
  const path = buildPath(analysis);
  const open = (l: Lesson) => !isPassed(data, l.id) && lockReason(data, l) === null;
  for (const item of path) {
    const l = lessonByUnit(item.unit);
    if (l && open(l)) return { kind: 'lesson', lesson: l, why: item.reason };
  }
  // Không còn bài ưu tiên: học bài tiếp theo theo thứ tự chương trình nếu chưa gặp khó khăn ở phần nền.
  const rest = [...LESSONS].sort((a, b) => unitIndex(a.unit) - unitIndex(b.unit)).find(open);
  if (rest) return { kind: 'lesson', lesson: rest, why: 'Bài tiếp theo trong lộ trình' };
  const due = dueCards(data.srs, now).length;
  if (due > 0) return { kind: 'review', count: due };
  return { kind: 'all-done' };
}

/** 2 câu khởi động: ưu tiên câu cần ôn của kiến thức tiên quyết. */
export function warmupQuestions(data: AppData, lesson: Lesson, now: number): Question[] {
  const pre = getUnit(lesson.unit).prerequisites;
  const dueIds = dueCards(data.srs, now).filter((c) => c.kind === 'q' && pre.includes(c.unit)).map((c) => c.refId);
  const attempted = new Set(data.attempts.map((a) => a.qId));
  const fresh = QUESTION_BANK.filter((q) => pre.includes(q.unit) && q.level === 1 && !attempted.has(q.id) && q.source === 'placement').map((q) => q.id);
  const ids = [...dueIds, ...fresh].slice(0, 2);
  return ids.map(getQuestion);
}

/** Bài kiểm tra tuần: ưu tiên câu ít gặp nhất, xen kẽ các nhóm kiến thức. */
export function buildWeeklyTest(week: number, attempts: Attempt[], size = 8): string[] {
  const plan = WEEKS.find((w) => w.week === week);
  if (!plan) return [];
  const units = plan.testUnits ?? plan.units;
  const count = new Map<string, number>();
  const last = new Map<string, number>();
  for (const a of attempts) {
    count.set(a.qId, (count.get(a.qId) ?? 0) + 1);
    last.set(a.qId, Math.max(last.get(a.qId) ?? 0, a.ts));
  }
  const perUnit = units.map((u) =>
    QUESTION_BANK.filter((q) => q.unit === u).sort((a, b) =>
      (count.get(a.id) ?? 0) - (count.get(b.id) ?? 0) || (last.get(a.id) ?? 0) - (last.get(b.id) ?? 0) || a.level - b.level || a.id.localeCompare(b.id)),
  );
  const out: string[] = [];
  for (let round = 0; out.length < size; round++) {
    let added = false;
    for (const list of perUnit) {
      if (out.length >= size) break;
      if (list[round]) { out.push(list[round].id); added = true; }
    }
    if (!added) break;
  }
  return out;
}

export const weekUnitsWithLessons = (week: number): UnitId[] => {
  const plan = WEEKS.find((w) => w.week === week);
  return (plan?.units ?? []).filter((u) => lessonByUnit(u));
};

export const allUnitIds = (): UnitId[] => UNITS.map((u) => u.id);
