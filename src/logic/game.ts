import { AVATARS, LEVELS } from '../data/game';
import { LESSONS } from '../data/lessons';
import type { AppData } from '../types';
import { dailyStats, dayKey, DAILY_GOAL } from './daily';
import { mistakeLog } from './progress';

/** 1 xu cho mỗi 5 điểm học. Xu còn có thể kiếm từ rương ngày, huy hiệu và trò chơi. */
export const POINTS_PER_COIN = 5;
export const CHEST_COINS = 20;
export const BADGE_COINS = 25;

export interface LevelInfo { level: number; name: string; points: number; nextAt: number | null; pct: number }

export function levelOf(points: number): LevelInfo {
  let i = 0;
  LEVELS.forEach((l, idx) => { if (points >= l.min) i = idx; });
  const next = LEVELS[i + 1]?.min ?? null;
  const cur = LEVELS[i].min;
  return { level: i + 1, name: LEVELS[i].name, points, nextAt: next, pct: next === null ? 100 : Math.round(((points - cur) / (next - cur)) * 100) };
}

export const coinsOf = (data: AppData, now: number): number => {
  const d = dailyStats(data.attempts, now);
  return Math.max(0, Math.floor(d.totalPoints / POINTS_PER_COIN) + data.game.bonus + data.game.gameCoins - data.game.spent);
};

export interface BadgeDef { id: string; emoji: string; name: string; desc: string; test: (d: AppData, now: number) => boolean }

const study = (d: AppData) => d.attempts.filter((a) => a.context !== 'placement' && a.context !== 'placement-extra');

export const BADGES: BadgeDef[] = [
  { id: 'start', emoji: '🌱', name: 'Bước đầu tiên', desc: 'Hoàn thành bài kiểm tra đầu vào', test: (d) => d.placement.status === 'done' },
  { id: 'lesson1', emoji: '📘', name: 'Bài học đầu tiên', desc: 'Hoàn thành 1 bài học', test: (d) => LESSONS.some((l) => d.lessons[l.id]?.passed) },
  { id: 'lesson3', emoji: '🎓', name: 'Chăm chỉ', desc: 'Hoàn thành 3 bài học', test: (d) => LESSONS.filter((l) => d.lessons[l.id]?.passed).length >= 3 },
  { id: 'perfect', emoji: '💯', name: 'Điểm tuyệt đối', desc: 'Đúng cả 3 câu kiểm tra cuối bài', test: (d) => Object.values(d.lessons).some((l) => l.bestScore >= l.quizTotal && l.quizTotal > 0) },
  { id: 'q50', emoji: '🎯', name: '50 câu', desc: 'Làm 50 câu luyện tập', test: (d) => study(d).length >= 50 },
  { id: 'fixer', emoji: '🔧', name: 'Sửa lỗi giỏi', desc: 'Khắc phục 3 lỗi sai', test: (d) => mistakeLog(d.attempts).filter((m) => m.resolved).length >= 3 },
  { id: 'streak3', emoji: '🔥', name: '3 ngày liên tiếp', desc: 'Học 3 ngày liên tiếp', test: (d, n) => dailyStats(d.attempts, n).streak >= 3 },
  { id: 'streak7', emoji: '🌟', name: '7 ngày liên tiếp', desc: 'Học 7 ngày liên tiếp', test: (d, n) => dailyStats(d.attempts, n).streak >= 7 },
  { id: 'gamer', emoji: '🎮', name: 'Người chơi', desc: 'Chơi 3 trò chơi khác nhau', test: (d) => Object.keys(d.game.best).length >= 3 },
  { id: 'vocab', emoji: '🔤', name: 'Nhà từ vựng', desc: 'Ôn 10 từ vựng', test: (d) => Object.values(d.srs).filter((c) => c.kind === 'v' && c.reps >= 1).length >= 10 },
];

export interface BadgeState extends BadgeDef { unlocked: boolean; claimed: boolean }

export const badgeStates = (d: AppData, now: number): BadgeState[] =>
  BADGES.map((b) => ({ ...b, unlocked: b.test(d, now), claimed: d.game.claimed.includes(`badge:${b.id}`) }));

export const chestKey = (now: number): string => `chest:${dayKey(now)}`;

export function chestState(d: AppData, now: number): { reached: boolean; claimed: boolean; answered: number; goal: number } {
  const s = dailyStats(d.attempts, now);
  return { reached: s.goalReached, claimed: d.game.claimed.includes(chestKey(now)), answered: s.today.answered, goal: DAILY_GOAL };
}

export const avatarOf = (d: AppData) => AVATARS.find((a) => a.id === d.game.avatar) ?? AVATARS[0];

/* ===== Thưởng theo ngày và tuần ===== */
import { dayStars, weekStat, type Stars } from './daily';

export const chestCoinsFor = (stars: Stars): number => (stars >= 3 ? 30 : stars === 2 ? 20 : 0);
export const WEEK_CHEST_COINS = 60;
export const WEEK_EXCELLENT_BONUS = 20;
export const weekChestKey = (now: number): string => `wchest:${weekStat([], now).key}`;

export function weekChestState(d: AppData, now: number) {
  const w = weekStat(d.attempts, now);
  const key = weekChestKey(now);
  return { week: w, key, reached: w.reached, claimed: d.game.claimed.includes(key), coins: WEEK_CHEST_COINS + (w.excellent ? WEEK_EXCELLENT_BONUS : 0) };
}

export function dayChest(d: AppData, now: number) {
  const day = dailyStats(d.attempts, now).today;
  const stars = dayStars(day);
  return { stars, coins: chestCoinsFor(stars), key: chestKey(now), claimed: d.game.claimed.includes(chestKey(now)) };
}
