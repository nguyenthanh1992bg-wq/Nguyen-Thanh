import { LESSONS } from '../data/lessons';
import { GAME_DAILY_CAP } from '../logic/games';
import { applyOutcome, newCard, outcomeOf, DAY_MS } from '../logic/srs';
import type { AppData, Attempt, Context, GameState, ParentReward, Settings, UnitId, WeeklyResult } from '../types';

export const DEFAULT_REWARDS: ParentReward[] = [
  { id: 'r-ice', name: 'Một cây kem', cost: 150 },
  { id: 'r-movie', name: 'Chọn phim tối cuối tuần', cost: 300 },
  { id: 'r-trip', name: 'Đi chơi công viên cùng bố mẹ', cost: 600 },
];

export const emptyGame = (): GameState => ({
  claimed: [], bonus: 0, gameCoins: 0, spent: 0, owned: ['cat', 'dog'], avatar: 'cat',
  best: {}, rewards: DEFAULT_REWARDS, redeemed: [],
});

export const emptySettings = (): Settings => ({ reminderOn: true, reminderTime: '19:00' });

export const emptyData = (): AppData => ({
  version: 1,
  demo: false,
  nickname: '',
  attempts: [],
  placement: { status: 'not-started' },
  lessons: {},
  srs: {},
  weeklyTests: {},
  readMs: 0,
  game: emptyGame(),
  settings: emptySettings(),
});

/** Chỉ các hoạt động học/ôn mới đưa câu hỏi vào lịch ôn cách quãng. Bài đầu vào chỉ là đo lường. */
const SRS_CONTEXTS: Context[] = ['warmup', 'guided', 'practice', 'quiz', 'remedial', 'review', 'weekly'];

export type Action =
  | { type: 'attempt'; attempt: Attempt }
  | { type: 'vocab'; id: string; unit: UnitId; correct: boolean; ts: number }
  | { type: 'placement-start'; ts: number }
  | { type: 'placement-finish'; ts: number }
  | { type: 'lesson-complete'; lessonId: string; score: number; total: number; passed: boolean; ts: number; repeatedErrorFixed?: boolean }
  | { type: 'weekly'; week: number; result: WeeklyResult }
  | { type: 'read'; ms: number }
  | { type: 'nickname'; name: string }
  | { type: 'settings'; settings: Partial<Settings> }
  | { type: 'claim'; key: string; coins: number }
  | { type: 'game-result'; game: string; score: number; coins: number; day: string }
  | { type: 'buy'; itemId: string; cost: number }
  | { type: 'avatar'; id: string }
  | { type: 'rewards'; rewards: ParentReward[] }
  | { type: 'redeem'; reward: ParentReward; ts: number }
  | { type: 'redeem-done'; ts: number }
  | { type: 'replace'; data: AppData }
  | { type: 'reset' };

export function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'attempt': {
      const a = action.attempt;
      let srs = state.srs;
      if (SRS_CONTEXTS.includes(a.context)) {
        const key = `q:${a.qId}`;
        const card = state.srs[key] ?? newCard('q', a.qId, a.unit);
        srs = { ...state.srs, [key]: applyOutcome(card, outcomeOf(a), a.ts) };
      }
      return { ...state, attempts: [...state.attempts, a], srs };
    }
    case 'vocab': {
      const key = `v:${action.id}`;
      const card = state.srs[key] ?? newCard('v', action.id, action.unit);
      return { ...state, srs: { ...state.srs, [key]: applyOutcome(card, { correct: action.correct, assisted: false }, action.ts) } };
    }
    case 'placement-start':
      return state.placement.status === 'not-started'
        ? { ...state, placement: { status: 'in-progress', startedAt: action.ts } }
        : state;
    case 'placement-finish':
      return { ...state, placement: { ...state.placement, status: 'done', completedAt: action.ts } };
    case 'lesson-complete': {
      const prev = state.lessons[action.lessonId];
      const lesson = LESSONS.find((l) => l.id === action.lessonId);
      let srs = state.srs;
      if (lesson && action.passed) {
        // Từ vựng của bài đi vào lịch ôn (lần đầu sau 1 ngày).
        srs = { ...srs };
        for (const v of lesson.vocab) {
          const key = `v:${v.id}`;
          if (!srs[key]) srs[key] = { ...newCard('v', v.id, lesson.unit), due: action.ts + DAY_MS, lastTs: action.ts };
        }
      }
      return {
        ...state,
        srs,
        lessons: {
          ...state.lessons,
          [action.lessonId]: {
            passed: (prev?.passed ?? false) || action.passed,
            bestScore: Math.max(prev?.bestScore ?? 0, action.score),
            quizTotal: action.total,
            completions: (prev?.completions ?? 0) + 1,
            lastTs: action.ts,
            repeatedErrorFixed: action.repeatedErrorFixed ?? prev?.repeatedErrorFixed,
          },
        },
      };
    }
    case 'weekly': {
      const k = String(action.week);
      return { ...state, weeklyTests: { ...state.weeklyTests, [k]: [...(state.weeklyTests[k] ?? []), action.result] } };
    }
    case 'read':
      return { ...state, readMs: state.readMs + Math.min(Math.max(action.ms, 0), 5 * 60_000) };
    case 'nickname':
      return { ...state, nickname: action.name.slice(0, 30) };
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.settings } };
    case 'claim':
      if (state.game.claimed.includes(action.key)) return state;
      return { ...state, game: { ...state.game, claimed: [...state.game.claimed, action.key], bonus: state.game.bonus + action.coins } };
    case 'game-result': {
      const best = Math.max(state.game.best[action.game] ?? 0, action.score);
      const used = state.game.dayCoins?.day === action.day ? state.game.dayCoins.coins : 0;
      const granted = Math.max(0, Math.min(action.coins, GAME_DAILY_CAP - used));
      return { ...state, game: { ...state.game, gameCoins: state.game.gameCoins + granted, best: { ...state.game.best, [action.game]: best }, plays: { ...(state.game.plays ?? {}), [action.game]: (state.game.plays?.[action.game] ?? 0) + 1 }, dayCoins: { day: action.day, coins: used + granted } } };
    }
    case 'buy':
      if (state.game.owned.includes(action.itemId)) return state;
      return { ...state, game: { ...state.game, owned: [...state.game.owned, action.itemId], spent: state.game.spent + action.cost } };
    case 'avatar':
      return state.game.owned.includes(action.id) ? { ...state, game: { ...state.game, avatar: action.id } } : state;
    case 'rewards':
      return { ...state, game: { ...state.game, rewards: action.rewards } };
    case 'redeem':
      return { ...state, game: { ...state.game, spent: state.game.spent + action.reward.cost, redeemed: [...state.game.redeemed, { id: action.reward.id, name: action.reward.name, cost: action.reward.cost, ts: action.ts, done: false }] } };
    case 'redeem-done':
      return { ...state, game: { ...state.game, redeemed: state.game.redeemed.map((r) => (r.ts === action.ts ? { ...r, done: true } : r)) } };
    case 'replace':
      return { ...emptyData(), ...action.data, game: { ...emptyGame(), ...(action.data.game ?? {}) }, settings: { ...emptySettings(), ...(action.data.settings ?? {}) } };
    case 'reset':
      return emptyData();
  }
}
