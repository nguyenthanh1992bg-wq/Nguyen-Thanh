import type { CommonMistake, Question } from '../types';

/** Chuẩn hóa để so khớp: không phân biệt hoa/thường, dấu nháy cong, khoảng trắng, dấu câu cuối. */
export function normalize(s: string): string {
  return s
    .replace(/[‘’]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*([.!?])+\s*$/, '')
    .trim();
}

export interface GradeResult {
  correct: boolean;
  /** Lý do cụ thể nếu câu trả lời trùng một lỗi sai phổ biến đã biên soạn. */
  mistake?: CommonMistake;
  /** Học sinh chọn "Em chưa biết". */
  dontKnow: boolean;
}

export function gradeAnswer(q: Question, answer: string): GradeResult {
  const a = normalize(answer);
  if (a === '') return { correct: false, dontKnow: true };
  const correct = q.answers.some((x) => normalize(x) === a);
  if (correct) return { correct: true, dontKnow: false };
  const mistake = q.commonMistakes.find((m) => normalize(m.answer) === a);
  return { correct: false, mistake, dontKnow: false };
}

/** Xáo trộn ổn định theo id để bố cục không đổi mỗi lần hiển thị. */
export function stableShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const rnd = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Thứ tự các thẻ từ cho câu sắp xếp: không trùng đáp án đúng để không "lộ" sẵn. */
export function reorderTiles(q: Question): string[] {
  const tokens = q.tokens ?? [];
  const correctOrder = q.answers[0].split(' ');
  let out = stableShuffle(tokens, q.id);
  let salt = 0;
  while (out.join(' ') === correctOrder.join(' ') && salt < 5) {
    salt += 1;
    out = stableShuffle(tokens, `${q.id}#${salt}`);
  }
  return out;
}
