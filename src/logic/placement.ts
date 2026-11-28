import { QUESTION_BANK, findQuestion, PLACEMENT_IDS, PLACEMENT_MIN_ANSWERED } from '../data/questionBank';
import { SKILL_LABEL, UNITS, getUnit, unitIndex } from '../data/curriculum';
import type { Attempt, SkillTag, UnitId } from '../types';

export type DiagStatus = 'no-evidence' | 'insufficient' | 'likely-known' | 'uncertain' | 'gap';
export type ErrorKind = 'not-learned' | 'misconception' | 'rushed' | 'unstable';

export interface UnitDiagnosis {
  unit: UnitId;
  answered: number;
  correct: number;
  status: DiagStatus;
  errorKind?: ErrorKind;
  /** Mô tả ngắn, giọng khích lệ, dành cho học sinh/phụ huynh. */
  note: string;
}

const PLACEMENT_CTX = new Set(['placement', 'placement-extra']);

/** Lấy lần làm gần nhất của mỗi câu trong bài đầu vào. */
export function placementAttempts(attempts: Attempt[]): Attempt[] {
  const latest = new Map<string, Attempt>();
  for (const a of [...attempts].sort((x, y) => x.ts - y.ts)) {
    if (PLACEMENT_CTX.has(a.context)) latest.set(a.qId, a);
  }
  return [...latest.values()];
}

export function diagnoseUnit(unit: UnitId, pa: Attempt[]): UnitDiagnosis {
  const items = pa.filter((a) => a.unit === unit).sort((a, b) => a.level - b.level);
  const n = items.length;
  const correct = items.filter((a) => a.correct).length;
  const base = { unit, answered: n, correct };
  if (n === 0) return { ...base, status: 'no-evidence', note: 'Chưa có câu nào ở nhóm này.' };
  if (n === 1) return { ...base, status: 'insufficient', note: 'Mới có 1 câu nên chưa đủ để kết luận. Cần làm thêm để chắc chắn.' };
  const ratio = correct / n;
  if (ratio >= 0.75) {
    return { ...base, status: 'likely-known', note: 'Em làm tốt phần này. Sẽ kiểm tra lại sau vài ngày để chắc chắn đã nhớ lâu.' };
  }
  const wrong = items.filter((a) => !a.correct);
  const dontKnow = wrong.some((a) => a.answer === '');
  const misconception = wrong.some((a) => {
    const q = findQuestion(a.qId);
    return q ? q.commonMistakes.some((m) => m.answer.toLowerCase() === a.answer.toLowerCase()) : false;
  });
  const rushed = wrong.length > 0 && wrong.every((a) => a.timeMs < 2500 && a.answer !== '');
  if (ratio <= 0.34) {
    const errorKind: ErrorKind = dontKnow ? 'not-learned' : misconception ? 'misconception' : rushed ? 'rushed' : 'not-learned';
    const note = errorKind === 'not-learned'
      ? 'Phần này em chưa gặp hoặc chưa nhớ. Mình sẽ học lại từng bước nhỏ.'
      : errorKind === 'misconception'
        ? 'Em đang nhầm một quy tắc quen thuộc. Bài học sẽ chỉ rõ chỗ dễ nhầm.'
        : 'Em trả lời khá nhanh nên có thể làm vội. Nên làm chậm lại và xem kỹ gợi ý.';
    return { ...base, status: 'gap', errorKind, note };
  }
  const basic = items[0];
  const note = basic && basic.correct
    ? 'Em biết phần cơ bản nhưng chưa vận dụng ổn định ở câu khó hơn.'
    : 'Kết quả chưa ổn định (có thể do đoán). Cần làm thêm câu để biết chắc.';
  return { ...base, status: 'uncertain', errorKind: 'unstable', note };
}

export interface SkillScore { skill: SkillTag; label: string; answered: number; correct: number }

export interface PlacementAnalysis {
  totalQuestions: number;
  answered: number;
  correct: number;
  /** Đã đủ dữ liệu để lập hồ sơ (≥ 30 câu). */
  sufficient: boolean;
  units: Record<UnitId, UnitDiagnosis>;
  bySkill: SkillScore[];
  durationMs: number;
  needFollowUp: UnitId[];
}

export function analyzePlacement(attempts: Attempt[]): PlacementAnalysis {
  const pa = placementAttempts(attempts);
  const units = Object.fromEntries(UNITS.map((u) => [u.id, diagnoseUnit(u.id, pa)])) as Record<UnitId, UnitDiagnosis>;
  const bySkillMap = new Map<SkillTag, SkillScore>();
  for (const a of pa) {
    const cur = bySkillMap.get(a.skill) ?? { skill: a.skill, label: SKILL_LABEL[a.skill], answered: 0, correct: 0 };
    cur.answered += 1;
    if (a.correct) cur.correct += 1;
    bySkillMap.set(a.skill, cur);
  }
  const answered = pa.length;
  return {
    totalQuestions: PLACEMENT_IDS.length,
    answered,
    correct: pa.filter((a) => a.correct).length,
    sufficient: answered >= PLACEMENT_MIN_ANSWERED,
    units,
    bySkill: [...bySkillMap.values()],
    durationMs: pa.reduce((s, a) => s + Math.min(a.timeMs, 120_000), 0),
    needFollowUp: UNITS.map((u) => u.id).filter((id) => ['uncertain', 'insufficient'].includes(units[id].status)),
  };
}

/** Chọn thêm câu chưa làm cho các nhóm chưa đủ bằng chứng (tối đa 2 câu/nhóm). */
export function followUpQuestionIds(attempts: Attempt[], analysis: PlacementAnalysis): { ids: string[]; unitsWithoutExtra: UnitId[] } {
  const seen = new Set(attempts.map((a) => a.qId));
  const ids: string[] = [];
  const unitsWithoutExtra: UnitId[] = [];
  for (const unit of analysis.needFollowUp) {
    const extra = QUESTION_BANK.filter((q) => q.unit === unit && !seen.has(q.id)).sort((a, b) => a.level - b.level).slice(0, 2);
    if (extra.length === 0) unitsWithoutExtra.push(unit);
    ids.push(...extra.map((q) => q.id));
  }
  return { ids, unitsWithoutExtra };
}

export interface PathItem {
  unit: UnitId;
  kind: 'learn' | 'confirm';
  reason: string;
}

const isOk = (s: DiagStatus): boolean => s === 'likely-known';

/**
 * Lộ trình cá nhân hóa: chỉ đưa các nhóm cần học/cần xác nhận, kèm kiến thức tiên quyết còn thiếu,
 * sắp xếp theo thứ tự chương trình (tiên quyết luôn đứng trước).
 */
export function buildPath(analysis: PlacementAnalysis): PathItem[] {
  const picked = new Map<UnitId, PathItem>();
  const add = (unit: UnitId, kind: PathItem['kind'], reason: string) => {
    const cur = picked.get(unit);
    if (!cur || (cur.kind === 'confirm' && kind === 'learn')) picked.set(unit, { unit, kind, reason });
  };
  for (const u of UNITS) {
    const d = analysis.units[u.id];
    if (d.status === 'gap') add(u.id, 'learn', 'Cần học lại từ bước nhỏ');
    else if (d.status === 'uncertain' || d.status === 'insufficient') add(u.id, 'confirm', 'Cần xác nhận bằng bài học và câu hỏi thêm');
  }
  if (analysis.sufficient) {
    const visit = (id: UnitId, from: UnitId) => {
      for (const p of getUnit(id).prerequisites) {
        const pd = analysis.units[p];
        if (!isOk(pd.status) && pd.status !== 'no-evidence') {
          add(p, pd.status === 'gap' ? 'learn' : 'confirm', `Là nền tảng cho "${getUnit(from).name}"`);
          visit(p, p);
        }
      }
    };
    for (const item of [...picked.values()]) visit(item.unit, item.unit);
  }
  return [...picked.values()].sort((a, b) => unitIndex(a.unit) - unitIndex(b.unit));
}
