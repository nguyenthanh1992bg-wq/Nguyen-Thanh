import { getQuestion, PLACEMENT_IDS } from '../data/questionBank';
import { LESSONS } from '../data/lessons';
import { DAY_MS } from '../logic/srs';
import { emptyData, reducer } from './reducer';
import type { AppData, Attempt, Context, Question } from '../types';

let seq = 0;

export function wrongAnswerFor(q: Question): string {
  return q.commonMistakes[0]?.answer ?? '(sai)';
}

export function makeAttempt(q: Question, correct: boolean, ts: number, context: Context, o: { hints?: number; retry?: boolean; timeMs?: number; answer?: string } = {}): Attempt {
  seq += 1;
  return {
    id: `sim-${seq}`, qId: q.id, unit: q.unit, skill: q.skill, level: q.level, correct,
    answer: o.answer ?? (correct ? q.answers[0] : wrongAnswerFor(q)),
    timeMs: o.timeMs ?? 9000, ts, context, hints: o.hints ?? 0, retry: o.retry ?? false,
  };
}

export function sim(state: AppData, qId: string, correct: boolean, ts: number, context: Context, o: Parameters<typeof makeAttempt>[4] = {}): AppData {
  return reducer(state, { type: 'attempt', attempt: makeAttempt(getQuestion(qId), correct, ts, context, o) });
}

/** Mô phỏng bài đầu vào: `knows(q)` quyết định học sinh đúng hay sai từng câu. */
export function simulatePlacement(start: AppData, ts: number, knows: (q: Question) => boolean): AppData {
  let s = reducer(start, { type: 'placement-start', ts });
  PLACEMENT_IDS.forEach((id, i) => {
    const q = getQuestion(id);
    s = sim(s, id, knows(q), ts + i * 20_000, 'placement');
  });
  return reducer(s, { type: 'placement-finish', ts: ts + PLACEMENT_IDS.length * 20_000 });
}

/** Mô phỏng học xong một bài với số câu đúng trong 3 câu cuối bài. */
export function simulateLesson(start: AppData, lessonId: string, ts: number, quizCorrect: number): AppData {
  const l = LESSONS.find((x) => x.id === lessonId);
  if (!l) throw new Error('lesson');
  let s = sim(start, l.guided.questionId, true, ts, 'guided', { hints: 1 });
  l.practice.forEach((id, i) => { s = sim(s, id, true, ts + (i + 1) * 30_000, 'practice'); });
  l.quiz.forEach((id, i) => { s = sim(s, id, i < quizCorrect, ts + (i + 4) * 30_000, 'quiz'); });
  return reducer(s, { type: 'lesson-complete', lessonId, score: quizCorrect, total: l.quiz.length, passed: quizCorrect >= 2, ts: ts + 8 * 30_000 });
}

/** Hồ sơ học sinh minh họa để xem thử báo cáo và ôn tập. Luôn gắn nhãn demo. */
export function makeDemoData(now: number): AppData {
  const known = new Set(['U01', 'U02', 'U06', 'U07', 'U13', 'U14', 'U15', 'U16', 'U18', 'U19']);
  const t0 = now - 12 * DAY_MS;
  let s: AppData = { ...emptyData(), demo: true, nickname: 'Minh An (minh họa)' };
  s = simulatePlacement(s, t0, (q) => known.has(q.unit) || (q.unit === 'U03' && q.level === 1) || (q.unit === 'U17' && q.level === 1));
  // Bài to be: đạt 3/3.
  s = simulateLesson(s, 'lesson-tobe', now - 9 * DAY_MS, 3);
  // Bài số nhiều: sai lặp lại trong luyện tập, được học lại đơn giản rồi đạt 2/3.
  s = sim(s, 'ls-plural-g1', false, now - 8 * DAY_MS, 'guided');
  s = sim(s, 'ls-plural-p1', false, now - 8 * DAY_MS + 30_000, 'practice');
  s = sim(s, 'ls-plural-p1', true, now - 8 * DAY_MS + 60_000, 'practice', { retry: true, hints: 1 });
  s = sim(s, 'ls-plural-p2', false, now - 8 * DAY_MS + 90_000, 'practice');
  s = sim(s, 'ls-plural-r1', true, now - 8 * DAY_MS + 150_000, 'remedial', { hints: 1 });
  ['ls-plural-q1', 'ls-plural-q2', 'ls-plural-q3'].forEach((id, i) => { s = sim(s, id, i !== 0, now - 8 * DAY_MS + 200_000 + i * 30_000, 'quiz'); });
  s = reducer(s, { type: 'lesson-complete', lessonId: 'lesson-plural', score: 2, total: 3, passed: true, ts: now - 8 * DAY_MS + 330_000, repeatedErrorFixed: true });
  // Bài mạo từ: chưa đạt (1/3) để thấy cơ chế học lại.
  s = simulateLesson(s, 'lesson-article', now - 5 * DAY_MS, 1);
  // Một số lần ôn tập.
  s = sim(s, 'ls-tobe-q1', true, now - 6 * DAY_MS, 'review');
  s = sim(s, 'ls-tobe-q2', true, now - 6 * DAY_MS + 20_000, 'review');
  s = sim(s, 'ls-plural-q1', true, now - 4 * DAY_MS, 'review');
  s = sim(s, 'ls-tobe-q3', true, now - 2 * DAY_MS, 'review');
  s = sim(s, 'ls-plural-q2', false, now - 2 * DAY_MS + 20_000, 'review');
  s = sim(s, 'ls-tobe-q1', true, now - 2 * DAY_MS + 40_000, 'review');
  s = reducer(s, { type: 'weekly', week: 3, result: { ts: now - 2 * DAY_MS, score: 5, total: 8, weakUnits: ['U04'] } });
  s = reducer(s, { type: 'read', ms: 6 * 60_000 });
  return s;
}
