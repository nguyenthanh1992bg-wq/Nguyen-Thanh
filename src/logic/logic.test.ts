import { describe, expect, it } from 'vitest';
import { QUESTION_BANK, getQuestion, PLACEMENT_IDS } from '../data/questionBank';
import { LESSONS } from '../data/lessons';
import { UNITS, WEEKS } from '../data/curriculum';
import { validateBank } from '../data/validate';
import { gradeAnswer, normalize, reorderTiles } from './grading';
import { applyOutcome, newCard, intervalDays, DAY_MS, dueCards } from './srs';
import { unitStatus, mistakeLog, isRepeatedError } from './progress';
import { analyzePlacement, buildPath, followUpQuestionIds } from './placement';
import { buildWeeklyTest, lockReason, nextActivity, lessonById, PASS_QUIZ_MIN } from './lessonFlow';
import { buildReport } from './report';
import { dailyStats, DAILY_GOAL } from './daily';
import { emptyData, reducer } from '../state/reducer';
import { makeDemoData, sim, simulateLesson, simulatePlacement } from '../state/simulate';
import { LocalStorageStore, MemoryStore } from '../storage/storage';

const NOW = Date.UTC(2026, 9, 21, 12, 0, 0);

describe('ngân hàng câu hỏi', () => {
  it('không có lỗi cấu trúc / nhất quán', () => {
    expect(validateBank()).toEqual([]);
  });
  it('có ≥ 30 câu, gồm 40 câu đầu vào', () => {
    expect(QUESTION_BANK.length).toBeGreaterThanOrEqual(30);
    expect(PLACEMENT_IDS).toHaveLength(40);
  });
  it('mỗi nhóm kiến thức có đúng 2 câu đầu vào (mức 1 và mức 2)', () => {
    for (const u of UNITS) {
      const qs = QUESTION_BANK.filter((q) => q.unit === u.id && q.source === 'placement');
      expect(qs.map((q) => q.level).sort()).toEqual([1, 2]);
    }
  });
  it('mọi đáp án chuẩn đều được chấm đúng, mọi lỗi sai đã biên soạn đều bị chấm sai', () => {
    for (const q of QUESTION_BANK) {
      for (const a of q.answers) expect(gradeAnswer(q, a).correct, q.id).toBe(true);
      for (const m of q.commonMistakes) expect(gradeAnswer(q, m.answer).correct, `${q.id}:${m.answer}`).toBe(false);
    }
  });
  it('câu sắp xếp không hiển thị sẵn đúng thứ tự', () => {
    for (const q of QUESTION_BANK.filter((x) => x.type === 'reorder')) {
      expect(q.answers.map((a) => normalize(a))).not.toContain(normalize(reorderTiles(q).join(' ')));
    }
  });
});

describe('chấm điểm', () => {
  it('chuẩn hóa chữ hoa, dấu câu cuối và nháy cong', () => {
    expect(normalize("  She  Isn’t a teacher. ")).toBe("she isn't a teacher");
  });
  it('"Em chưa biết" là chuỗi rỗng và không phải trả lời sai ngẫu nhiên', () => {
    const r = gradeAnswer(getQuestion('pl-u03-1'), '');
    expect(r.correct).toBe(false);
    expect(r.dontKnow).toBe(true);
  });
  it('nhận diện lỗi sai phổ biến để giải thích đúng nguyên nhân', () => {
    const r = gradeAnswer(getQuestion('pl-u10-2'), 'watchs');
    expect(r.mistake?.reason).toMatch(/-es/);
  });
  it('câu sắp xếp chấp nhận nhiều cách viết đúng', () => {
    const q = getQuestion('pl-u20-2');
    expect(gradeAnswer(q, 'Every evening she does her homework.').correct).toBe(true);
    expect(gradeAnswer(q, 'She does every evening her homework').correct).toBe(false);
  });
});

describe('ôn tập cách quãng', () => {
  it('lịch 1 → 3 → 7 → 14 ngày khi làm đúng liên tục', () => {
    let c = newCard('q', 'x', 'U03');
    const gaps: number[] = [];
    let t = NOW;
    for (let i = 0; i < 5; i++) {
      c = applyOutcome(c, { correct: true, assisted: false }, t);
      gaps.push(Math.round((c.due - t) / DAY_MS));
      t = c.due;
    }
    expect(gaps).toEqual([1, 3, 7, 14, 30]);
  });
  it('sai thì quay về bậc 0 và lần sau ôn dày hơn', () => {
    let c = newCard('q', 'x', 'U03');
    c = applyOutcome(c, { correct: true, assisted: false }, NOW);
    c = applyOutcome(c, { correct: true, assisted: false }, NOW + DAY_MS);
    expect(c.box).toBe(1);
    c = applyOutcome(c, { correct: false, assisted: false }, NOW + 4 * DAY_MS);
    expect(c.box).toBe(0);
    expect(c.lapses).toBe(1);
    expect(intervalDays(2, 2)).toBeLessThan(intervalDays(2, 0));
  });
  it('đúng nhưng cần gợi ý thì không lên bậc', () => {
    let c = newCard('q', 'x', 'U03');
    c = applyOutcome(c, { correct: true, assisted: false }, NOW);
    c = applyOutcome(c, { correct: true, assisted: true }, NOW + DAY_MS);
    expect(c.box).toBe(0);
  });
});

describe('trạng thái kiến thức – không kết luận khi thiếu bằng chứng', () => {
  it('dưới 2 lần làm là chưa đủ dữ liệu', () => {
    let s = emptyData();
    s = sim(s, 'pl-u03-1', true, NOW, 'placement');
    expect(unitStatus(s.attempts, 'U03')).toBe('no-evidence');
  });
  it('đúng 2/2 ở bài đầu vào chỉ là "có vẻ đã biết", chưa phải thành thạo', () => {
    let s = emptyData();
    s = sim(s, 'pl-u03-1', true, NOW, 'placement');
    s = sim(s, 'pl-u03-2', true, NOW + 1000, 'placement');
    expect(unitStatus(s.attempts, 'U03')).toBe('likely-known');
  });
  it('thành thạo chỉ khi đúng nhiều câu khác nhau và nhớ sau ≥ 3 ngày', () => {
    let s = emptyData();
    ['pl-u03-1', 'pl-u03-2', 'ls-tobe-p1'].forEach((id, i) => { s = sim(s, id, true, NOW + i * 1000, 'practice'); });
    expect(unitStatus(s.attempts, 'U03')).toBe('secure');
    s = sim(s, 'ls-tobe-q1', true, NOW + 4 * DAY_MS, 'review');
    expect(unitStatus(s.attempts, 'U03')).toBe('mastered');
  });
  it('đúng nhờ gợi ý không tính là vững', () => {
    let s = emptyData();
    ['pl-u03-1', 'pl-u03-2', 'ls-tobe-p1', 'ls-tobe-p2'].forEach((id, i) => { s = sim(s, id, true, NOW + i * 1000, 'practice', { hints: 2 }); });
    expect(['secure', 'mastered']).not.toContain(unitStatus(s.attempts, 'U03'));
  });
  it('lỗi sai chỉ được tính khắc phục khi làm đúng lại không cần gợi ý', () => {
    let s = emptyData();
    s = sim(s, 'ls-tobe-p1', false, NOW, 'practice');
    expect(mistakeLog(s.attempts)[0].resolved).toBe(false);
    s = sim(s, 'ls-tobe-p1', true, NOW + 1000, 'practice', { hints: 1, retry: true });
    expect(mistakeLog(s.attempts)[0].resolved).toBe(false);
    s = sim(s, 'ls-tobe-p1', true, NOW + DAY_MS, 'review');
    expect(mistakeLog(s.attempts)[0].resolved).toBe(true);
  });
  it('phát hiện sai lặp lại', () => {
    let s = emptyData();
    ['ls-tobe-p1', 'ls-tobe-p2', 'ls-tobe-q1'].forEach((id, i) => { s = sim(s, id, false, NOW + i * 1000, 'practice'); });
    expect(isRepeatedError(s.attempts, 'U03')).toBe(true);
  });
});

describe('kiểm tra đầu vào và lộ trình', () => {
  const unitsKnown = new Set(['U01', 'U02']);
  it('phân loại: biết / hổng / chưa chắc, và đề xuất lộ trình bắt đầu từ nền tảng', () => {
    const s = simulatePlacement(emptyData(), NOW, (q) => unitsKnown.has(q.unit) || (q.unit === 'U05' && q.level === 1));
    const a = analyzePlacement(s.attempts);
    expect(a.sufficient).toBe(true);
    expect(a.units.U01.status).toBe('likely-known');
    expect(a.units.U03.status).toBe('gap');
    expect(a.units.U05.status).toBe('uncertain');
    expect(a.needFollowUp).toContain('U05');
    const path = buildPath(a).map((p) => p.unit);
    expect(path).not.toContain('U01');
    expect(path.indexOf('U03')).toBeLessThan(path.indexOf('U08'));
  });
  it('học sinh hổng nền được đưa vào bài nền tảng trước, không vào bài khó', () => {
    const s = simulatePlacement(emptyData(), NOW, () => false);
    const next = nextActivity(s, NOW);
    expect(next.kind).toBe('lesson');
    if (next.kind === 'lesson') expect(next.lesson.unit).toBe('U01');
  });
  it('chưa làm đủ câu thì báo chưa đủ dữ liệu và yêu cầu làm thêm', () => {
    let s = emptyData();
    PLACEMENT_IDS.slice(0, 10).forEach((id, i) => { s = sim(s, id, false, NOW + i, 'placement'); });
    const a = analyzePlacement(s.attempts);
    expect(a.sufficient).toBe(false);
    expect(a.units.U03.status).toBe('insufficient');
    expect(buildPath(a).some((p) => p.unit === 'U03')).toBe(true);
  });
  it('đề xuất câu hỏi bổ sung cho nhóm chưa chắc và nói rõ nhóm chưa có câu bổ sung', () => {
    const s = simulatePlacement(emptyData(), NOW, (q) => q.level === 1);
    const a = analyzePlacement(s.attempts);
    const f = followUpQuestionIds(s.attempts, a);
    expect(f.ids.length).toBeGreaterThan(0);
    expect(f.ids.every((id) => !s.attempts.some((x) => x.qId === id))).toBe(true);
    expect(f.unitsWithoutExtra.length).toBeGreaterThan(0);
  });
  it('phân biệt "chưa biết" với "nhầm quy tắc"', () => {
    let s = emptyData();
    s = sim(s, 'pl-u03-1', false, NOW, 'placement', { answer: '' });
    s = sim(s, 'pl-u03-2', false, NOW + 1, 'placement', { answer: '' });
    s = sim(s, 'pl-u04-1', false, NOW + 2, 'placement', { answer: 'bookes' });
    s = sim(s, 'pl-u04-2', false, NOW + 3, 'placement', { answer: 'babys' });
    const a = analyzePlacement(s.attempts);
    expect(a.units.U03.errorKind).toBe('not-learned');
    expect(a.units.U04.errorKind).toBe('misconception');
  });
});

describe('luồng bài học', () => {
  it('khóa bài khi kiến thức tiên quyết còn yếu và đã có bài dạy phần đó', () => {
    let s = emptyData();
    s = sim(s, 'pl-u03-1', false, NOW, 'placement');
    s = sim(s, 'pl-u03-2', false, NOW + 1, 'placement');
    expect(lockReason(s, lessonById('lesson-havehas')!)).toMatch(/Tôi là/);
    s = simulateLesson(s, 'lesson-tobe', NOW + 1000, 3);
    expect(lockReason(s, lessonById('lesson-havehas')!)).toBeNull();
  });
  it('chưa đạt cuối bài thì bài không được tính là hoàn thành và vẫn được gợi ý học lại', () => {
    let s = simulatePlacement(emptyData(), NOW, () => false);
    s = simulateLesson(s, 'lesson-alphabet', NOW + DAY_MS, PASS_QUIZ_MIN - 1);
    expect(s.lessons['lesson-alphabet'].passed).toBe(false);
    const next = nextActivity(s, NOW + DAY_MS);
    expect(next.kind === 'lesson' && next.lesson.id).toBe('lesson-alphabet');
  });
  it('đạt bài thì tạo thẻ ôn từ vựng và câu hỏi đến hạn sau 1 ngày', () => {
    let s = simulatePlacement(emptyData(), NOW, () => false);
    s = simulateLesson(s, 'lesson-alphabet', NOW + DAY_MS, 3);
    expect(dueCards(s.srs, NOW + DAY_MS + 1000)).toHaveLength(0);
    const due = dueCards(s.srs, NOW + 3 * DAY_MS);
    expect(due.some((c) => c.kind === 'q')).toBe(true);
    expect(due.some((c) => c.kind === 'v')).toBe(true);
  });
  it('bài kiểm tra tuần lấy câu thuộc đúng nhóm, ưu tiên câu chưa gặp', () => {
    let s = emptyData();
    s = sim(s, 'pl-u03-1', true, NOW, 'placement');
    const ids = buildWeeklyTest(3, s.attempts, 8);
    expect(ids).toHaveLength(8);
    expect(ids.every((id) => ['U03', 'U04'].includes(getQuestion(id).unit))).toBe(true);
    expect(ids).not.toContain('pl-u03-1');
  });
  it('mỗi tuần có đủ các mục theo yêu cầu', () => {
    expect(WEEKS).toHaveLength(12);
    for (const w of WEEKS) {
      expect(w.goals.length).toBeGreaterThan(0);
      expect(w.vocabTheme.length).toBeGreaterThan(0);
      expect(w.structures.length).toBeGreaterThan(0);
      expect(w.practice.length).toBeGreaterThan(0);
      expect(w.weeklyTest && w.advance && w.retry).toBeTruthy();
    }
    for (const w of WEEKS.slice(1)) expect(buildWeeklyTest(w.week, [], 8).length).toBeGreaterThanOrEqual(2);
  });
  it('mỗi bài có đủ 8 thành phần dữ liệu', () => {
    for (const l of LESSONS) {
      expect(l.explain.length).toBeGreaterThan(0);
      expect(l.examples.some((e) => !e.ok)).toBe(true);
      expect(l.guided.steps.length).toBeGreaterThan(1);
      expect(l.practice.length).toBe(2);
      expect(l.quiz.length).toBe(3);
    }
  });
});

describe('báo cáo phụ huynh phản ánh đúng dữ liệu', () => {
  it('hồ sơ trống: không bịa số liệu', () => {
    const r = buildReport(emptyData(), NOW);
    expect(r.lessonsPassed).toBe(0);
    expect(r.placement).toBeNull();
    expect(r.time.totalMin).toBe(0);
    expect(r.retention.reviewAccuracy).toBeNull();
    expect(r.strong).toHaveLength(0);
    expect(r.habit.streak).toBe(0);
  });
  it('hồ sơ minh họa: số liệu khớp với lịch sử làm bài', () => {
    const d = makeDemoData(NOW);
    const r = buildReport(d, NOW);
    expect(r.demo).toBe(true);
    expect(r.lessonsPassed).toBe(Object.values(d.lessons).filter((l) => l.passed).length);
    expect(r.placement?.answered).toBe(40);
    expect(r.placement?.correct).toBe(d.attempts.filter((a) => a.context === 'placement' && a.correct).length);
    expect(r.mistakes.open + r.mistakes.fixed).toBe(mistakeLog(d.attempts).length);
    expect(r.retention.cards).toBe(Object.keys(d.srs).length);
    const known = new Set([...r.strong, ...r.progressing, ...r.weak, ...r.unknown].map((x) => x.unit));
    expect(known.size).toBe(UNITS.length);
    expect(r.weekly[0]).toMatchObject({ week: 3, score: 5, total: 8, passed: false });
  });
});

describe('lưu trữ', () => {
  it('MemoryStore lưu và đọc lại đúng', async () => {
    const st = new MemoryStore();
    const d = makeDemoData(NOW);
    await st.save(d);
    expect(await st.load()).toEqual(d);
    await st.clear();
    expect((await st.load()).attempts).toHaveLength(0);
  });
  it('LocalStorageStore không làm hỏng ứng dụng khi dữ liệu lưu bị hỏng, và nâng cấp dữ liệu cũ', async () => {
    const mem = new Map<string, string>();
    (globalThis as unknown as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    } as unknown as Storage;
    const st = new LocalStorageStore();
    mem.set('english-recovery-6:v1', '{not json');
    expect((await st.load()).attempts).toEqual([]);
    mem.set('english-recovery-6:v1', JSON.stringify({ version: 2 }));
    expect((await st.load()).attempts).toEqual([]);
    const old = { ...emptyData() } as Partial<ReturnType<typeof emptyData>>;
    delete old.game; // dữ liệu từ bản cũ chưa có game
    mem.set('english-recovery-6:v1', JSON.stringify(old));
    expect((await st.load()).game.owned).toContain('cat');
    const d = makeDemoData(NOW);
    await st.save(d);
    expect((await st.load()).attempts).toHaveLength(d.attempts.length);
  });
});

describe('học hằng ngày: điểm và chuỗi ngày', () => {
  it('đếm câu, điểm và độ chính xác của hôm nay; bài đầu vào không tính điểm', () => {
    let s = emptyData();
    s = sim(s, 'pl-u03-1', true, NOW, 'placement');
    s = sim(s, 'ls-tobe-p1', true, NOW, 'practice');
    s = sim(s, 'ls-tobe-p2', true, NOW + 1, 'practice', { hints: 1 });
    s = sim(s, 'ls-tobe-q1', false, NOW + 2, 'quiz');
    const d = dailyStats(s.attempts, NOW + 1000);
    expect(d.today.answered).toBe(3);
    expect(d.today.points).toBe(15);
    expect(d.today.accuracy).toBe(50);
    expect(d.goalReached).toBe(false);
    expect(d.goal).toBe(DAILY_GOAL);
  });
  it('chuỗi ngày: liên tiếp thì tăng, hôm nay chưa học thì chưa đứt, bỏ 2 ngày thì đứt', () => {
    let s = emptyData();
    for (const off of [3, 2, 1]) s = sim(s, 'ls-tobe-p1', true, NOW - off * DAY_MS, 'practice');
    expect(dailyStats(s.attempts, NOW).streak).toBe(3);
    s = sim(s, 'ls-tobe-p1', true, NOW, 'practice');
    expect(dailyStats(s.attempts, NOW).streak).toBe(4);
    expect(dailyStats(s.attempts, NOW + 2 * DAY_MS).streak).toBe(0);
  });
  it('đạt mục tiêu khi làm đủ số câu', () => {
    let s = emptyData();
    for (let i = 0; i < DAILY_GOAL; i++) s = sim(s, 'ls-tobe-p1', i % 2 === 0, NOW + i, 'review');
    const d = dailyStats(s.attempts, NOW + 100);
    expect(d.goalReached).toBe(true);
    expect(d.last7).toHaveLength(7);
    expect(d.last7[6].answered).toBe(DAILY_GOAL);
  });
});

describe('reducer', () => {
  it('thay thế dữ liệu cũ thiếu trường game vẫn an toàn', () => {
    const old = { ...emptyData() } as Partial<ReturnType<typeof emptyData>>;
    delete old.game;
    const s = reducer(emptyData(), { type: 'replace', data: old as ReturnType<typeof emptyData> });
    expect(s.game.avatar).toBe('cat');
  });
});
