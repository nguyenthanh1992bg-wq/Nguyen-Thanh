import type { CommonMistake, Question, QType, UnitId } from '../types';
import { getUnit } from './curriculum';

interface Opts {
  vi?: string;
  passage?: string;
  audioText?: string;
  assesses?: string;
  source?: 'placement' | 'lesson';
}

type Mistakes = Record<string, string>;

function toList(m: Mistakes): CommonMistake[] {
  return Object.entries(m).map(([answer, reason]) => ({ answer, reason }));
}

function base(
  type: QType, id: string, unit: UnitId, level: 1 | 2 | 3, prompt: string,
  answers: string[], explanation: string, mistakes: Mistakes, hints: string[], o: Opts,
): Question {
  const u = getUnit(unit);
  return {
    id, unit, skill: u.skill, level, type, prompt,
    promptVi: o.vi, passage: o.passage, audioText: o.audioText,
    answers, explanation, commonMistakes: toList(mistakes), hints,
    prerequisites: u.prerequisites,
    assesses: o.assesses ?? u.name,
    source: o.source ?? 'placement',
  };
}

export function mcq(
  id: string, unit: UnitId, level: 1 | 2 | 3, prompt: string, options: string[], answer: string,
  explanation: string, mistakes: Mistakes, hints: string[], o: Opts = {},
): Question {
  return { ...base('mcq', id, unit, level, prompt, [answer], explanation, mistakes, hints, o), options };
}

export function fill(
  id: string, unit: UnitId, level: 1 | 2 | 3, prompt: string, answers: string[],
  explanation: string, mistakes: Mistakes, hints: string[], o: Opts = {},
): Question {
  return base('fill', id, unit, level, prompt, answers, explanation, mistakes, hints, o);
}

export function reorder(
  id: string, unit: UnitId, level: 1 | 2 | 3, prompt: string, tokens: string[], answers: string[],
  explanation: string, mistakes: Mistakes, hints: string[], o: Opts = {},
): Question {
  return { ...base('reorder', id, unit, level, prompt, answers, explanation, mistakes, hints, o), tokens };
}
