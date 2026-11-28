import { PICTURE_WORDS, type PictureWord } from '../data/game';
import type { GameState } from '../types';

/** Xu tối đa kiếm được từ trò chơi mỗi ngày: chơi vui nhưng không thay việc học. */
export const GAME_DAILY_CAP = 30;

export type Rng = () => number;

/** Bộ sinh số ngẫu nhiên có hạt giống (để kiểm thử). */
export function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], rnd: Rng = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface PictureQ { emoji: string; answer: string; vi: string; options: string[] }

/** Đố hình: nhìn hình, chọn từ tiếng Anh đúng. */
export function pictureRound(n = 6, rnd: Rng = Math.random, pool: PictureWord[] = PICTURE_WORDS): PictureQ[] {
  return shuffle(pool, rnd).slice(0, n).map((w) => {
    const others = shuffle(pool.filter((x) => x.en !== w.en), rnd).slice(0, 3);
    return { emoji: w.emoji, answer: w.en, vi: w.vi, options: shuffle([w.en, ...others.map((o) => o.en)], rnd) };
  });
}

export interface MatchCard { id: number; pair: string; kind: 'pic' | 'word'; text: string }

/** Lật thẻ: ghép hình với từ tiếng Anh. */
export function matchDeck(pairs = 6, rnd: Rng = Math.random, pool: PictureWord[] = PICTURE_WORDS): MatchCard[] {
  const words = shuffle(pool, rnd).slice(0, pairs);
  const cards: Omit<MatchCard, 'id'>[] = words.flatMap((w) => [
    { pair: w.en, kind: 'pic' as const, text: w.emoji },
    { pair: w.en, kind: 'word' as const, text: w.en },
  ]);
  return shuffle(cards, rnd).map((c, i) => ({ ...c, id: i }));
}

export interface SpeedQ { en: string; emoji: string; answer: string; options: string[] }

/** Tốc độ: từ tiếng Anh → nghĩa tiếng Việt. */
export function speedQuestion(rnd: Rng = Math.random, pool: PictureWord[] = PICTURE_WORDS): SpeedQ {
  const w = pool[Math.floor(rnd() * pool.length)];
  const others = shuffle(pool.filter((x) => x.vi !== w.vi), rnd).slice(0, 3);
  return { en: w.en, emoji: w.emoji, answer: w.vi, options: shuffle([w.vi, ...others.map((o) => o.vi)], rnd) };
}

/** Xu thưởng theo kết quả mỗi trò (trước khi áp giới hạn ngày). */
export const coinsFor = {
  picture: (correct: number) => correct * 2,
  match: (pairs: number, moves: number) => pairs + Math.min(pairs, Math.max(0, pairs * 2 + 4 - moves)), // ít lượt lật hơn thì thêm xu
  speed: (score: number) => Math.min(15, Math.floor(score / 2)),
};

export const gameCoinsLeft = (g: GameState, day: string): number =>
  Math.max(0, GAME_DAILY_CAP - (g.dayCoins?.day === day ? g.dayCoins.coins : 0));
