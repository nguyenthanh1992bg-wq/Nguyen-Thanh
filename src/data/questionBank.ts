import type { Question } from '../types';
import { PLACEMENT_QUESTIONS } from './placement';
import { LESSON_QUESTIONS } from './lessons';

export const QUESTION_BANK: Question[] = [...PLACEMENT_QUESTIONS, ...LESSON_QUESTIONS];

const BY_ID = new Map(QUESTION_BANK.map((q) => [q.id, q]));

export function getQuestion(id: string): Question {
  const q = BY_ID.get(id);
  if (!q) throw new Error(`Question not found: ${id}`);
  return q;
}

export const findQuestion = (id: string): Question | undefined => BY_ID.get(id);

export const PLACEMENT_IDS: string[] = (() => {
  const l1 = PLACEMENT_QUESTIONS.filter((q) => q.level === 1);
  const l2 = PLACEMENT_QUESTIONS.filter((q) => q.level === 2);
  return [...l1, ...l2].map((q) => q.id);
})();

/** Số câu tối thiểu để coi bài đầu vào là đủ dữ liệu (75%). */
export const PLACEMENT_MIN_ANSWERED = 30;
