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

import { pictureRound, matchDeck, speedQuestion, seeded, coinsFor, GAME_DAILY_CAP } from './games';
import { levelOf, coinsOf, badgeStates, chestState, chestKey } from './game';
import { PICTURE_WORDS, AVATARS } from '../data/game';
import { dayKey } from './daily';

describe('trò chơi', () => {
  it('đố hình: mỗi câu có đúng 4 lựa chọn không trùng và chứa đáp án', () => {
    const qs = pictureRound(8, seeded(1));
    expect(qs).toHaveLength(8);
    for (const q of qs) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.options).toContain(q.answer);
      expect(PICTURE_WORDS.find((w) => w.en === q.answer)?.emoji).toBe(q.emoji);
    }
  });
  it('lật thẻ: mỗi cặp có đúng một hình và một từ', () => {
    const deck = matchDeck(6, seeded(2));
    expect(deck).toHaveLength(12);
    for (const pair of new Set(deck.map((c) => c.pair))) {
      const cs = deck.filter((c) => c.pair === pair);
      expect(cs.map((c) => c.kind).sort()).toEqual(['pic', 'word']);
    }
  });
  it('tốc độ: đáp án nằm trong lựa chọn; từ điển hình không trùng nghĩa/hình', () => {
    for (let i = 0; i < 30; i++) {
      const q = speedQuestion(seeded(i));
      expect(q.options).toContain(q.answer);
      expect(new Set(q.options).size).toBe(4);
    }
    expect(new Set(PICTURE_WORDS.map((w) => w.en)).size).toBe(PICTURE_WORDS.length);
    expect(new Set(PICTURE_WORDS.map((w) => w.vi)).size).toBe(PICTURE_WORDS.length);
  });
  it('xu thưởng có giới hạn mỗi ngày', () => {
    let s = emptyData();
    const day = dayKey(NOW);
    s = reducer(s, { type: 'game-result', game: 'picture', score: 6, coins: coinsFor.picture(6), day });
    s = reducer(s, { type: 'game-result', game: 'speed', score: 40, coins: 25, day });
    expect(s.game.gameCoins).toBe(GAME_DAILY_CAP);
    s = reducer(s, { type: 'game-result', game: 'speed', score: 50, coins: 15, day });
    expect(s.game.gameCoins).toBe(GAME_DAILY_CAP);
    s = reducer(s, { type: 'game-result', game: 'speed', score: 50, coins: 15, day: 'ngày-khác' });
    expect(s.game.gameCoins).toBe(GAME_DAILY_CAP + 15);
    expect(s.game.best.speed).toBe(50);
  });
});

describe('phần thưởng', () => {
  it('xu = điểm học/5 + thưởng + trò chơi − đã tiêu; mua nhân vật trừ xu và không mua hai lần', () => {
    let s = emptyData();
    for (let i = 0; i < 20; i++) s = sim(s, 'ls-tobe-p1', true, NOW + i, 'practice'); // 200 điểm = 40 xu
    expect(coinsOf(s, NOW + 100)).toBe(40);
    const panda = AVATARS.find((a) => a.id === 'panda')!;
    s = reducer(s, { type: 'claim', key: 'x', coins: 20 });
    s = reducer(s, { type: 'claim', key: 'x', coins: 20 }); // nhận lặp không có tác dụng
    expect(coinsOf(s, NOW + 100)).toBe(60);
    s = reducer(s, { type: 'buy', itemId: panda.id, cost: panda.cost });
    s = reducer(s, { type: 'buy', itemId: panda.id, cost: panda.cost });
    expect(coinsOf(s, NOW + 100)).toBe(0);
    s = reducer(s, { type: 'avatar', id: 'unicorn' }); // chưa sở hữu nên không đổi được
    expect(s.game.avatar).toBe('cat');
    s = reducer(s, { type: 'avatar', id: 'panda' });
    expect(s.game.avatar).toBe('panda');
  });
  it('đổi phần thưởng của phụ huynh trừ xu và ghi nhận để phụ huynh trao', () => {
    let s = emptyData();
    s = reducer(s, { type: 'claim', key: 'a', coins: 200 });
    s = reducer(s, { type: 'redeem', reward: s.game.rewards[0], ts: NOW });
    expect(coinsOf(s, NOW)).toBe(200 - s.game.rewards[0].cost);
    expect(s.game.redeemed[0].done).toBe(false);
    s = reducer(s, { type: 'redeem-done', ts: NOW });
    expect(s.game.redeemed[0].done).toBe(true);
  });
  it('cấp độ tăng theo điểm; rương ngày chỉ mở khi đủ mục tiêu và chỉ nhận một lần', () => {
    expect(levelOf(0).name).toBe('Hạt giống');
    expect(levelOf(120).level).toBe(2);
    let s = emptyData();
    for (let i = 0; i < DAILY_GOAL - 1; i++) s = sim(s, 'ls-tobe-p1', true, NOW + i, 'practice');
    expect(chestState(s, NOW + 100).reached).toBe(false);
    s = sim(s, 'ls-tobe-p2', true, NOW + 50, 'practice');
    expect(chestState(s, NOW + 100).reached).toBe(true);
    s = reducer(s, { type: 'claim', key: chestKey(NOW + 100), coins: 20 });
    expect(chestState(s, NOW + 100).claimed).toBe(true);
  });
  it('huy hiệu mở đúng điều kiện', () => {
    let s = emptyData();
    expect(badgeStates(s, NOW).every((b) => !b.unlocked)).toBe(true);
    s = simulateLesson(simulatePlacement(s, NOW, () => false), 'lesson-tobe', NOW + 1000, 3);
    const ids = badgeStates(s, NOW + 2000).filter((b) => b.unlocked).map((b) => b.id);
    expect(ids).toEqual(expect.arrayContaining(['start', 'lesson1', 'perfect']));
    expect(ids).not.toContain('streak7');
  });
});

import { dayStars, weekStat, weekStart, recentWeeks, WEEK_GOAL_DAYS, WEEK_GOAL_QUESTIONS } from './daily';
import { chestCoinsFor, weekChestState, dayChest, WEEK_CHEST_COINS, WEEK_EXCELLENT_BONUS } from './game';
import { reminderState, shouldNotify, googleCalendarUrl, icsContent, nextOccurrence, minutesOf } from './reminders';

// Thứ Tư 21/10/2026 12:00 (giữa tuần, tránh biên múi giờ)
const WED = new Date(2026, 9, 21, 20, 0, 0).getTime();

describe('đánh giá theo ngày', () => {
  const mk = (answered: number, accuracy: number | null) => ({ key: 'k', label: 'T2', answered, points: 0, accuracy });
  it('sao: <nửa mục tiêu=0, nửa=1, đủ=2, đủ và đúng ≥85%=3', () => {
    expect(dayStars(mk(0, null))).toBe(0);
    expect(dayStars(mk(4, 100))).toBe(0);
    expect(dayStars(mk(5, 50))).toBe(1);
    expect(dayStars(mk(10, 70))).toBe(2);
    expect(dayStars(mk(10, 85))).toBe(3);
    expect(chestCoinsFor(1)).toBe(0);
    expect(chestCoinsFor(2)).toBe(20);
    expect(chestCoinsFor(3)).toBe(30);
  });
  it('rương ngày: số xu theo sao thực tế từ lịch sử làm bài', () => {
    let s = emptyData();
    for (let i = 0; i < 10; i++) s = sim(s, 'ls-tobe-p1', true, WED + i, 'practice');
    expect(dayChest(s, WED + 100)).toMatchObject({ stars: 3, coins: 30, claimed: false });
    let t = emptyData();
    for (let i = 0; i < 10; i++) t = sim(t, 'ls-tobe-p1', i < 7, WED + i, 'practice');
    expect(dayChest(t, WED + 100)).toMatchObject({ stars: 2, coins: 20 });
  });
});

describe('đánh giá và thưởng theo tuần', () => {
  const studyDays = (days: number[], perDay: number, ok = true) => {
    let s = emptyData();
    for (const d of days) for (let i = 0; i < perDay; i++) s = sim(s, 'ls-tobe-p1', ok, weekStart(WED) + d * DAY_MS + i * 1000, 'practice');
    return s;
  };
  it('tuần bắt đầu từ thứ Hai và gom đúng các ngày trong tuần', () => {
    const ws = weekStart(WED);
    expect(new Date(ws).getDay()).toBe(1);
    const s = studyDays([0, 2], 5);
    const w = weekStat(s.attempts, WED);
    expect(w.daysActive).toBe(2);
    expect(w.answered).toBe(10);
    expect(weekStat(s.attempts, WED + 7 * DAY_MS).answered).toBe(0); // tuần sau
  });
  it('đạt mục tiêu tuần: 5 ngày và 50 câu; đúng ≥ 85% là xuất sắc kèm thưởng thêm', () => {
    const s = studyDays([0, 1, 2, 3, 4], WEEK_GOAL_QUESTIONS / WEEK_GOAL_DAYS);
    const c = weekChestState(s, WED);
    expect(c.week.grade).toBe('Xuất sắc');
    expect(c.reached).toBe(true);
    expect(c.coins).toBe(WEEK_CHEST_COINS + WEEK_EXCELLENT_BONUS);
    const mid = studyDays([0, 1, 2, 3, 4], 10);
    const m = weekStat(mid.attempts, WED);
    expect(m.reached).toBe(true);
    const low = studyDays([0, 1, 2, 3, 4], 10, false);
    const l = weekChestState(low, WED);
    expect(l.reached).toBe(true);
    expect(l.week.grade).toBe('Tốt');
    expect(l.coins).toBe(WEEK_CHEST_COINS);
  });
  it('chưa đủ mục tiêu: không mở được rương; đánh giá theo số ngày', () => {
    expect(weekChestState(studyDays([0, 1, 2], 5), WED).reached).toBe(false);
    expect(weekStat(studyDays([0, 1, 2], 5).attempts, WED).grade).toBe('Khá');
    expect(weekStat(studyDays([0], 5).attempts, WED).grade).toBe('Cần cố gắng hơn');
    expect(weekStat([], WED).grade).toBe('Chưa học');
  });
  it('nhận rương tuần chỉ một lần', () => {
    let s = studyDays([0, 1, 2, 3, 4], 10);
    const c = weekChestState(s, WED);
    s = reducer(s, { type: 'claim', key: c.key, coins: c.coins });
    s = reducer(s, { type: 'claim', key: c.key, coins: c.coins });
    expect(s.game.bonus).toBe(c.coins);
    expect(weekChestState(s, WED).claimed).toBe(true);
    expect(recentWeeks(s.attempts, WED, 4)).toHaveLength(4);
  });
});

describe('nhắc học và ôn tập', () => {
  it('nhắc khi quá giờ mà chưa học; không nhắc khi đã học hoặc tắt nhắc', () => {
    let s = emptyData();
    const early = new Date(2026, 9, 21, 9, 0).getTime();
    const late = new Date(2026, 9, 21, 20, 0).getTime();
    expect(reminderState(s, early).needStudy).toBe(false); // chưa tới 19:00
    expect(reminderState(s, late).needStudy).toBe(true);
    expect(reminderState(s, late).message).toMatch(/Đến giờ học/);
    s = sim(s, 'ls-tobe-p1', true, late - 1000, 'practice');
    expect(reminderState(s, late).needStudy).toBe(false);
    const off = reducer(emptyData(), { type: 'settings', settings: { reminderOn: false } });
    expect(reminderState(off, late).needStudy).toBe(false);
  });
  it('nhắc ôn khi có nội dung đến hạn', () => {
    let s = simulatePlacement(emptyData(), WED, () => false);
    s = simulateLesson(s, 'lesson-alphabet', WED, 3);
    const r = reminderState(s, WED + 3 * DAY_MS);
    expect(r.dueCount).toBeGreaterThan(0);
    expect(r.message).toMatch(/đến hạn ôn/);
  });
  it('thông báo trình duyệt chỉ một lần mỗi ngày', () => {
    const late = new Date(2026, 9, 21, 20, 0).getTime();
    const s = emptyData();
    expect(shouldNotify(s, late, null)).toBe(true);
    expect(shouldNotify(s, late, dayKey(late))).toBe(false);
    expect(shouldNotify(s, late, dayKey(late - DAY_MS))).toBe(true);
  });
  it('lịch nhắc: lần kế tiếp đúng giờ; liên kết Google Calendar và .ics lặp hằng ngày', () => {
    const now = new Date(2026, 9, 21, 20, 0).getTime();
    const n = nextOccurrence('19:00', now);
    expect(n.getDate()).toBe(22);
    expect(n.getHours()).toBe(19);
    expect(nextOccurrence('21:30', now).getDate()).toBe(21);
    expect(minutesOf('07:05')).toBe(7 * 60 + 5);
    const url = googleCalendarUrl('19:00', now);
    expect(url.startsWith('https://calendar.google.com/calendar/render?')).toBe(true);
    expect(decodeURIComponent(url)).toContain('RRULE:FREQ=DAILY');
    const ics = icsContent('19:00', now);
    expect(ics).toContain('BEGIN:VALARM');
    expect(ics).toContain('RRULE:FREQ=DAILY');
    expect(ics).toContain('DTSTART:20261022T190000');
  });
});

import { buildQualityReport, qualityToText, monthKey } from './quality';

describe('đánh giá chất lượng ứng dụng theo tháng', () => {
  it('chưa có dữ liệu: không kết luận bừa, nêu rõ cần làm đầu vào và chưa đủ dữ liệu', () => {
    const r = buildQualityReport(emptyData(), WED);
    expect(r.sample.enoughData).toBe(false);
    expect(r.strengths).toHaveLength(0);
    expect(r.improvements.some((x) => x.area === 'Kiểm tra đầu vào' && x.severity === 'high')).toBe(true);
    expect(r.improvements.some((x) => x.area === 'Dữ liệu')).toBe(true);
    expect(monthKey(WED)).toBe('2026-10');
  });
  it('học sinh học theo lộ trình: ghi nhận hiệu quả lộ trình (điểm tốt) và nhóm thiếu bài (cần cải thiện)', () => {
    let s = simulatePlacement(emptyData(), WED - 20 * DAY_MS, () => false);
    // học và đạt 3 bài nền, mỗi bài làm đúng nhiều lần trong nhiều ngày
    ['lesson-alphabet', 'lesson-tobe', 'lesson-plural'].forEach((id, i) => { s = simulateLesson(s, id, WED - (15 - i * 3) * DAY_MS, 3); });
    for (let d = 0; d < 8; d++) for (const q of ['ls-tobe-q1', 'ls-plural-q1', 'ls-alpha-q1', 'ls-tobe-q2']) s = sim(s, q, true, WED - d * DAY_MS, 'review');
    const r = buildQualityReport(s, WED);
    expect(r.sample.enoughData).toBe(true);
    expect(r.pathEffect.length).toBeGreaterThanOrEqual(2);
    expect(r.strengths.some((x) => x.area === 'Hiệu quả lộ trình')).toBe(true);
    expect(r.strengths.some((x) => x.area === 'Ghi nhớ')).toBe(true);
    expect(r.coverageGaps.length).toBeGreaterThan(0);
    const gap = r.improvements.find((x) => x.area === 'Nội dung bài học');
    expect(gap?.severity).toBe('high');
    expect(gap?.action).toBeTruthy();
    expect(r.improvements[0].severity).toBe('high'); // vấn đề nặng nhất đứng đầu
  });
  it('phát hiện câu hỏi quá khó và đáp án bẫy', () => {
    let s = emptyData();
    for (let i = 0; i < 5; i++) s = sim(s, 'ls-tobe-p1', false, WED + i, 'practice', { answer: 'am' });
    const r = buildQualityReport(s, WED + 1000);
    expect(r.questionFlags.map((f) => f.kind)).toEqual(expect.arrayContaining(['too-hard', 'trap']));
    expect(r.improvements.some((x) => x.area === 'Ngân hàng câu hỏi')).toBe(true);
  });
  it('nhận định về gợi ý/thử lại, thói quen học thưa, chơi game nhiều hơn học', () => {
    let s = emptyData();
    for (let i = 0; i < 6; i++) { s = sim(s, 'ls-tobe-p1', false, WED + i, 'practice'); s = sim(s, 'ls-tobe-p1', true, WED + i + 1, 'practice', { retry: true, hints: 1 }); }
    for (let i = 0; i < 30; i++) s = sim(s, 'ls-tobe-q1', true, WED + 100 + i - (i % 6) * DAY_MS, 'quiz'); // trải trên 6 ngày
    s = { ...s, game: { ...s.game, plays: { picture: 12, speed: 8 } } };
    const r = buildQualityReport(s, WED + 1000);
    expect(r.habitsAndUx.retryFixRate).toBe(100);
    expect(r.strengths.some((x) => x.area === 'Cơ chế sai → gợi ý → thử lại')).toBe(true);
    expect(r.improvements.some((x) => x.area === 'Cân bằng học – chơi')).toBe(true);
  });
  it('báo cáo văn bản có đủ hai phần và kế hoạch nâng cấp; payload ẩn danh không chứa tên', () => {
    const d = { ...makeDemoData(WED), nickname: 'Tên-Riêng-Tư' };
    const r = buildQualityReport(d, WED);
    const txt = qualityToText(r);
    expect(txt).toMatch(/GIỮ VÀ PHÁT HUY/);
    expect(txt).toMatch(/KẾ HOẠCH NÂNG CẤP/);
    expect(JSON.stringify(r)).not.toContain('Tên-Riêng-Tư');
  });
});
