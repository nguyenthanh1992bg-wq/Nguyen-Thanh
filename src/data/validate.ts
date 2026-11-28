import { UNITS } from './curriculum';
import { LESSONS } from './lessons';
import { QUESTION_BANK } from './questionBank';
import { normalize } from '../logic/grading';
import type { Question } from '../types';

const unitIds = new Set<string>(UNITS.map((u) => u.id));

export function validateQuestion(q: Question): string[] {
  const e: string[] = [];
  const p = (m: string) => e.push(`${q.id}: ${m}`);
  if (!unitIds.has(q.unit)) p('nhóm kiến thức không tồn tại');
  if (!q.prompt.trim()) p('thiếu nội dung câu hỏi');
  if (!q.explanation.trim()) p('thiếu giải thích');
  if (q.hints.length < 2) p('cần ít nhất 2 gợi ý theo bậc');
  if (q.answers.length === 0 || q.answers.some((a) => !a.trim())) p('thiếu đáp án');
  if (!q.assesses.trim()) p('thiếu mô tả kỹ năng được đánh giá');
  q.prerequisites.forEach((x) => { if (!unitIds.has(x)) p(`kiến thức tiên quyết ${x} không tồn tại`); });
  // Gợi ý không được chứa nguyên đáp án (tránh lộ đáp án khi đang luyện tập).
  q.hints.forEach((h) => {
    if (q.type === 'fill' && q.answers.some((a) => normalize(h).split(/\W+/).includes(normalize(a)) && normalize(a).length > 3)) p('gợi ý có thể lộ đáp án');
  });
  if (q.type === 'mcq') {
    const o = q.options ?? [];
    if (o.length < 3 || o.length > 4) p('trắc nghiệm cần 3–4 lựa chọn');
    if (new Set(o.map(normalize)).size !== o.length) p('các lựa chọn bị trùng');
    if (q.answers.length !== 1 || !o.includes(q.answers[0])) p('đáp án phải là đúng một lựa chọn');
    const wrong = o.filter((x) => x !== q.answers[0]);
    wrong.forEach((w) => { if (!q.commonMistakes.some((m) => m.answer === w)) p(`lựa chọn sai "${w}" chưa có giải thích lỗi`); });
    q.commonMistakes.forEach((m) => { if (!o.includes(m.answer)) p(`lỗi sai "${m.answer}" không nằm trong lựa chọn`); if (m.answer === q.answers[0]) p('lỗi sai trùng đáp án đúng'); });
  }
  if (q.type === 'fill') {
    q.commonMistakes.forEach((m) => { if (q.answers.some((a) => normalize(a) === normalize(m.answer))) p('lỗi sai trùng đáp án đúng'); });
  }
  if (q.type === 'reorder') {
    const tok = (s: string) => s.split(' ').map((x) => x.toLowerCase()).sort().join('|');
    const t = (q.tokens ?? []).map((x) => x.toLowerCase()).sort().join('|');
    if (!q.tokens || q.tokens.length < 3) p('câu sắp xếp cần ít nhất 3 từ');
    q.answers.forEach((a) => { if (tok(a) !== t) p(`đáp án "${a}" không dùng đúng các từ đã cho`); });
  }
  if (q.skill === 'listening' && !q.audioText) p('câu nghe cần audioText');
  if (q.skill === 'reading' && !q.passage) p('câu đọc hiểu cần đoạn văn');
  return e;
}

export function validateBank(): string[] {
  const e: string[] = [];
  const ids = new Set<string>();
  const prompts = new Set<string>();
  for (const q of QUESTION_BANK) {
    if (ids.has(q.id)) e.push(`${q.id}: trùng ID`);
    ids.add(q.id);
    const key = normalize(q.prompt + '|' + (q.options ? [...q.options].sort().join(',') : '') + '|' + (q.passage ?? '') + '|' + (q.audioText ?? '') + '|' + (q.tokens ? [...q.tokens].sort().join(',') : ''));
    if (prompts.has(key)) e.push(`${q.id}: trùng nội dung với câu khác`);
    prompts.add(key);
    e.push(...validateQuestion(q));
  }
  for (const l of LESSONS) {
    const refs = [l.guided.questionId, ...l.practice, ...l.quiz, l.remedial.questionId];
    if (new Set(refs).size !== refs.length) e.push(`${l.id}: câu hỏi bị dùng lặp trong cùng bài`);
    for (const r of refs) {
      const q = QUESTION_BANK.find((x) => x.id === r);
      if (!q) e.push(`${l.id}: không tìm thấy câu ${r}`);
      else if (q.unit !== l.unit) e.push(`${l.id}: câu ${r} thuộc nhóm ${q.unit}, khác nhóm của bài`);
    }
    if (l.quiz.length !== 3) e.push(`${l.id}: bài kiểm tra cuối bài cần 3 câu`);
    if (!l.examples.some((x) => x.ok) || !l.examples.some((x) => !x.ok)) e.push(`${l.id}: cần cả ví dụ đúng và ví dụ sai thường gặp`);
    if (l.remedial.simpler.length < 2) e.push(`${l.id}: thiếu phần giải thích đơn giản hơn`);
  }
  return e;
}
