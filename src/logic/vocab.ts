import { LESSONS } from '../data/lessons';
import { stableShuffle } from './grading';
import type { Question, UnitId, VocabItem } from '../types';

export interface VocabEntry extends VocabItem { unit: UnitId; lessonId: string }

export const ALL_VOCAB: VocabEntry[] = LESSONS.flatMap((l) => l.vocab.map((v) => ({ ...v, unit: l.unit, lessonId: l.id })));

export const findVocab = (id: string): VocabEntry | undefined => ALL_VOCAB.find((v) => v.id === id);

/** Câu trắc nghiệm nghĩa từ, sinh từ danh sách từ vựng đã biên soạn (không do AI sinh). */
export function vocabQuestion(v: VocabEntry): Question {
  const others = stableShuffle(ALL_VOCAB.filter((x) => x.vi !== v.vi), v.id).slice(0, 3);
  const options = stableShuffle([v.vi, ...others.map((o) => o.vi)], `${v.id}:opts`);
  return {
    id: `vocab-${v.id}`, unit: v.unit, skill: 'vocabulary', level: 1, type: 'mcq',
    prompt: `What does "${v.en}" mean?`, promptVi: 'Chọn nghĩa tiếng Việt đúng.',
    options, answers: [v.vi],
    explanation: `"${v.en}" nghĩa là ${v.vi}. Ví dụ: ${v.example}`,
    commonMistakes: others.map((o) => ({ answer: o.vi, reason: `"${o.vi}" là nghĩa của từ "${o.en}", không phải "${v.en}".` })),
    hints: [`Ví dụ: ${v.example}`, 'Đọc cả câu ví dụ để đoán nghĩa của từ.'],
    prerequisites: [], assesses: 'Nghĩa của từ vựng', source: 'lesson',
  };
}
