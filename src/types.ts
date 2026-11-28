export type UnitId =
  | 'U01' | 'U02' | 'U03' | 'U04' | 'U05' | 'U06' | 'U07' | 'U08' | 'U09' | 'U10'
  | 'U11' | 'U12' | 'U13' | 'U14' | 'U15' | 'U16' | 'U17' | 'U18' | 'U19' | 'U20';

export type SkillTag =
  | 'alphabet' | 'vocabulary' | 'structure' | 'grammar' | 'reading' | 'listening' | 'writing';

export type QType = 'mcq' | 'fill' | 'reorder';

export interface CommonMistake {
  /** Câu trả lời sai thường gặp (so khớp sau khi chuẩn hóa). */
  answer: string;
  /** Giải thích bằng tiếng Việt vì sao sai. */
  reason: string;
}

export interface Question {
  id: string;
  unit: UnitId;
  skill: SkillTag;
  level: 1 | 2 | 3;
  type: QType;
  prompt: string;
  promptVi?: string;
  passage?: string;
  /** Văn bản đọc bằng giọng đọc của thiết bị (nghe hiểu). */
  audioText?: string;
  options?: string[];
  tokens?: string[];
  /** Các đáp án được chấp nhận. answers[0] là đáp án chuẩn. */
  answers: string[];
  explanation: string;
  commonMistakes: CommonMistake[];
  /** Gợi ý theo từng bước, từ nhẹ đến rõ. Không chứa đáp án. */
  hints: string[];
  prerequisites: UnitId[];
  /** Kỹ năng / đơn vị kiến thức cụ thể mà câu này đo. */
  assesses: string;
  source: 'placement' | 'lesson';
}

export interface UnitDef {
  id: UnitId;
  name: string;
  skill: SkillTag;
  prerequisites: UnitId[];
  summary: string;
}

export interface VocabItem {
  id: string;
  en: string;
  vi: string;
  example: string;
}

export interface LessonBlock {
  heading: string;
  lines: string[];
  table?: string[][];
}

export interface LessonExample {
  en: string;
  vi: string;
  ok: boolean;
  note?: string;
}

export interface Lesson {
  id: string;
  unit: UnitId;
  title: string;
  minutes: number;
  objective: string;
  explain: LessonBlock[];
  examples: LessonExample[];
  guided: { questionId: string; steps: string[] };
  practice: string[];
  quiz: string[];
  remedial: { simpler: string[]; questionId: string };
  vocab: VocabItem[];
}

export type Context =
  | 'placement' | 'placement-extra' | 'warmup' | 'guided' | 'practice'
  | 'quiz' | 'remedial' | 'review' | 'weekly';

export interface Attempt {
  id: string;
  qId: string;
  unit: UnitId;
  skill: SkillTag;
  level: 1 | 2 | 3;
  correct: boolean;
  /** Chuỗi rỗng = học sinh chọn "Em chưa biết". */
  answer: string;
  timeMs: number;
  ts: number;
  context: Context;
  hints: number;
  retry: boolean;
}

export interface SrsCard {
  key: string; // 'q:<id>' hoặc 'v:<id>'
  kind: 'q' | 'v';
  refId: string;
  unit: UnitId;
  box: number;
  lapses: number;
  reps: number;
  due: number;
  lastTs: number;
}

export interface LessonRecord {
  passed: boolean;
  bestScore: number;
  quizTotal: number;
  completions: number;
  lastTs: number;
  repeatedErrorFixed?: boolean;
}

export interface WeeklyResult {
  ts: number;
  score: number;
  total: number;
  weakUnits: UnitId[];
}

export interface ParentReward {
  id: string;
  name: string;
  cost: number;
}

export interface GameState {
  /** Các mốc thưởng đã nhận (rương ngày, huy hiệu) để không nhận hai lần. */
  claimed: string[];
  /** Xu thưởng từ rương/huy hiệu. */
  bonus: number;
  /** Xu kiếm được từ trò chơi nhỏ. */
  gameCoins: number;
  spent: number;
  owned: string[];
  avatar: string;
  best: Record<string, number>;
  rewards: ParentReward[];
  redeemed: { id: string; name: string; cost: number; ts: number; done: boolean }[];
}

export interface AppData {
  version: 1;
  demo: boolean;
  nickname: string;
  attempts: Attempt[];
  placement: { status: 'not-started' | 'in-progress' | 'done'; startedAt?: number; completedAt?: number };
  lessons: Record<string, LessonRecord>;
  srs: Record<string, SrsCard>;
  weeklyTests: Record<string, WeeklyResult[]>;
  /** Thời gian đọc bài giảng (ms), đã giới hạn từng lần ghi. */
  readMs: number;
  game: GameState;
}
