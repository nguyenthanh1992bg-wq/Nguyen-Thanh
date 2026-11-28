import { LESSONS } from '../data/lessons';
import { UNITS, getUnit } from '../data/curriculum';
import { QUESTION_BANK } from '../data/questionBank';
import type { AppData, Attempt, UnitId } from '../types';
import { analyzePlacement, buildPath, placementAttempts } from './placement';
import { DAILY_GOAL, dayKey, recentWeeks } from './daily';
import { DAY_MS } from './srs';
import { lessonByUnit } from './lessonFlow';

/**
 * Đánh giá chất lượng ứng dụng theo tháng, tính từ dữ liệu học thực tế:
 * kiểm tra đầu vào → lộ trình → bài học → ôn tập → thói quen. Chỉ dùng số liệu tổng hợp,
 * không chứa tên hay thông tin cá nhân, nên có thể gửi đi để cải tiến ứng dụng.
 * Mỗi nhận định chỉ đưa ra khi có đủ dữ liệu; thiếu thì nói rõ là chưa đủ để kết luận.
 */

export type Severity = 'high' | 'medium' | 'low';
export interface Finding { area: string; text: string; metric: string; action?: string; severity?: Severity }

export interface QualityReport {
  month: string;
  generatedAt: number;
  sample: { studyAttempts: number; activeDays: number; enoughData: boolean };
  funnel: { placementDone: boolean; placementSufficient: boolean; uncertainShare: number | null; pathUnits: number; pathUnitsWithLesson: number; pathLessonsPassed: number };
  pathEffect: { unit: UnitId; pre: number; post: number }[];
  lessons: { id: string; completions: number; passed: boolean; quizFirstTry: number | null }[];
  retention: { reviewAccuracy: number | null; reviewCount: number; overdueShare: number | null };
  engagement: { activeDays: number; avgPerActiveDay: number | null; goalDays: number; weeksReached: number; gamePlays: number; studyDays: number };
  habitsAndUx: { retryFixRate: number | null; retryN: number; rushedWrongShare: number | null };
  questionFlags: { id: string; kind: 'too-hard' | 'too-easy' | 'trap'; n: number; detail: string }[];
  coverageGaps: UnitId[];
  strengths: Finding[];
  improvements: Finding[];
}

export const monthKey = (ts: number): string => dayKey(ts).slice(0, 7);
const pct = (a: number, b: number): number | null => (b === 0 ? null : Math.round((a / b) * 100));
const isStudy = (a: Attempt): boolean => a.context !== 'placement' && a.context !== 'placement-extra';

export function buildQualityReport(data: AppData, now: number, month = monthKey(now)): QualityReport {
  const inMonth = (a: Attempt) => monthKey(a.ts) === month;
  const study = data.attempts.filter((a) => isStudy(a) && inMonth(a));
  const days = new Set(study.map((a) => dayKey(a.ts)));
  const analysis = analyzePlacement(data.attempts);
  const path = data.placement.status === 'done' ? buildPath(analysis) : [];
  const pathWithLesson = path.filter((p) => lessonByUnit(p.unit));
  const passedPath = pathWithLesson.filter((p) => data.lessons[lessonByUnit(p.unit)!.id]?.passed);

  // Hiệu quả lộ trình: độ chính xác của nhóm kiến thức trước (đầu vào) và sau khi học (kiểm tra cuối bài, ôn, kiểm tra tuần).
  const pa = placementAttempts(data.attempts);
  const pathEffect = passedPath.map((p) => {
    const pre = pa.filter((a) => a.unit === p.unit);
    const post = data.attempts.filter((a) => a.unit === p.unit && ['quiz', 'review', 'weekly'].includes(a.context));
    return { unit: p.unit, pre: pct(pre.filter((a) => a.correct).length, pre.length) ?? 0, post: pct(post.filter((a) => a.correct).length, post.length) ?? 0 };
  });

  const lessons = LESSONS.map((l) => {
    const qa = data.attempts.filter((a) => a.context === 'quiz' && l.quiz.includes(a.qId));
    return { id: l.id, completions: data.lessons[l.id]?.completions ?? 0, passed: data.lessons[l.id]?.passed === true, quizFirstTry: pct(qa.filter((a) => a.correct).length, qa.length) };
  });

  const reviews = data.attempts.filter((a) => a.context === 'review' && inMonth(a));
  const cards = Object.values(data.srs);
  const overdue = cards.filter((c) => c.due < now - 3 * DAY_MS).length;

  const goalDays = [...days].filter((k) => study.filter((a) => dayKey(a.ts) === k).length >= DAILY_GOAL).length;
  const weeksReached = recentWeeks(data.attempts, now, 5).filter((w) => w.reached && w.key.slice(0, 7) === month).length;
  const gamePlays = Object.values(data.game.plays ?? {}).reduce((s, n) => s + n, 0);

  const wrongStudy = study.filter((a) => !a.correct);
  const retryFirstWrong = study.filter((a) => a.context === 'practice' && !a.correct && !a.retry);
  const fixed = study.filter((a) => a.context === 'practice' && a.retry && a.correct);

  const byQ = new Map<string, Attempt[]>();
  for (const a of data.attempts.filter(isStudy)) byQ.set(a.qId, [...(byQ.get(a.qId) ?? []), a]);
  const questionFlags: QualityReport['questionFlags'] = [];
  for (const [id, as] of byQ) {
    if (!QUESTION_BANK.some((q) => q.id === id) || as.length < 4) continue;
    const wrong = as.filter((a) => !a.correct);
    if (wrong.length / as.length >= 0.7) questionFlags.push({ id, kind: 'too-hard', n: as.length, detail: `${Math.round((wrong.length / as.length) * 100)}% làm sai` });
    else if (as.length >= 5 && wrong.length === 0) questionFlags.push({ id, kind: 'too-easy', n: as.length, detail: 'đúng 100%' });
    const counts = new Map<string, number>();
    wrong.filter((a) => a.answer !== '').forEach((a) => counts.set(a.answer, (counts.get(a.answer) ?? 0) + 1));
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top && wrong.length >= 3 && top[1] / wrong.length >= 0.6) questionFlags.push({ id, kind: 'trap', n: as.length, detail: `${top[1]}/${wrong.length} lần sai chọn cùng một đáp án` });
  }

  const gapUnits = UNITS.map((u) => u.id).filter((u) => analysis.units[u].status === 'gap' || analysis.units[u].status === 'uncertain');
  const coverageGaps = gapUnits.filter((u) => !lessonByUnit(u));

  const enoughData = study.length >= 30 && days.size >= 5;
  const uncertainShare = data.placement.status === 'done' ? pct(analysis.needFollowUp.length, UNITS.length) : null;
  const r: QualityReport = {
    month, generatedAt: now,
    sample: { studyAttempts: study.length, activeDays: days.size, enoughData },
    funnel: { placementDone: data.placement.status === 'done', placementSufficient: analysis.sufficient, uncertainShare, pathUnits: path.length, pathUnitsWithLesson: pathWithLesson.length, pathLessonsPassed: passedPath.length },
    pathEffect, lessons,
    retention: { reviewAccuracy: reviews.length >= 10 ? pct(reviews.filter((a) => a.correct).length, reviews.length) : null, reviewCount: reviews.length, overdueShare: cards.length >= 10 ? pct(overdue, cards.length) : null },
    engagement: { activeDays: days.size, avgPerActiveDay: days.size ? Math.round(study.length / days.size) : null, goalDays, weeksReached, gamePlays, studyDays: days.size },
    habitsAndUx: {
      retryFixRate: retryFirstWrong.length >= 5 ? pct(fixed.length, retryFirstWrong.length) : null, retryN: retryFirstWrong.length,
      rushedWrongShare: wrongStudy.length >= 10 ? pct(wrongStudy.filter((a) => a.answer !== '' && a.timeMs < 2500).length, wrongStudy.length) : null,
    },
    questionFlags, coverageGaps, strengths: [], improvements: [],
  };
  const { strengths, improvements } = judge(r);
  r.strengths = strengths;
  r.improvements = improvements;
  return r;
}

/** Quy tắc nhận định: giữ và phát huy điểm tốt, nêu rõ điểm cần cải thiện kèm hành động nâng cấp. */
export function judge(r: QualityReport): { strengths: Finding[]; improvements: Finding[] } {
  const good: Finding[] = [];
  const bad: Finding[] = [];
  const f = r.funnel;

  if (!f.placementDone) bad.push({ area: 'Kiểm tra đầu vào', severity: 'high', text: 'Học sinh chưa hoàn thành bài kiểm tra đầu vào nên chưa có lộ trình cá nhân hóa.', metric: 'chưa hoàn thành', action: 'Rút ngắn phần 1, nhắc làm tiếp bài đầu vào ngay trên trang chủ.' });
  else {
    if (!f.placementSufficient) bad.push({ area: 'Kiểm tra đầu vào', severity: 'medium', text: 'Bài đầu vào chưa đủ dữ liệu để lập hồ sơ chắc chắn.', metric: 'dưới 30/40 câu', action: 'Cho phép chia nhỏ thành các buổi 10 câu và nhắc hoàn tất.' });
    if (f.uncertainShare !== null && f.uncertainShare >= 40) bad.push({ area: 'Kiểm tra đầu vào', severity: 'medium', text: 'Nhiều nhóm kiến thức chưa đủ bằng chứng (chỉ có 2 câu mỗi nhóm).', metric: `${f.uncertainShare}% nhóm cần xác nhận thêm`, action: 'Thêm ít nhất 3–4 câu đầu vào cho mỗi nhóm và bài đánh giá bổ sung.' });
    else if (f.uncertainShare !== null) good.push({ area: 'Kiểm tra đầu vào', text: 'Kết quả đầu vào đủ rõ để xếp lộ trình.', metric: `${f.uncertainShare}% nhóm cần xác nhận thêm` });
  }

  if (r.coverageGaps.length > 0) bad.push({ area: 'Nội dung bài học', severity: 'high', text: `Có ${r.coverageGaps.length} nhóm kiến thức cần học nhưng chưa có bài dạy: ${r.coverageGaps.map((u) => getUnit(u).name).slice(0, 5).join('; ')}${r.coverageGaps.length > 5 ? '…' : ''}.`, metric: `${r.coverageGaps.length} nhóm thiếu bài`, action: 'Viết bài học và câu hỏi cho các nhóm này, ưu tiên nhóm là kiến thức nền của nhiều nhóm khác.' });
  else if (f.pathUnits > 0) good.push({ area: 'Nội dung bài học', text: 'Mọi nhóm cần học trong lộ trình đều có bài dạy.', metric: `${f.pathUnitsWithLesson}/${f.pathUnits}` });

  const eff = r.pathEffect;
  if (eff.length >= 2) {
    const avg = Math.round(eff.reduce((s, e) => s + (e.post - e.pre), 0) / eff.length);
    if (avg >= 25) good.push({ area: 'Hiệu quả lộ trình', text: 'Sau khi học theo lộ trình, độ chính xác ở các nhóm đã học tăng rõ rệt.', metric: `+${avg} điểm % so với đầu vào (${eff.length} nhóm)` });
    else bad.push({ area: 'Hiệu quả lộ trình', severity: 'high', text: 'Học xong bài nhưng độ chính xác tăng ít so với lúc đầu vào.', metric: `${avg >= 0 ? '+' : ''}${avg} điểm % (${eff.length} nhóm)`, action: 'Xem lại cách giải thích và thêm ví dụ, bài luyện cho các nhóm có mức tăng thấp.' });
  }

  const done = r.lessons.filter((l) => l.completions > 0);
  if (done.length >= 3) {
    const rate = Math.round((done.filter((l) => l.passed).length / done.length) * 100);
    if (rate >= 70) good.push({ area: 'Bài học', text: 'Phần lớn bài học được hoàn thành đạt yêu cầu.', metric: `${rate}% bài đạt` });
    else bad.push({ area: 'Bài học', severity: 'medium', text: 'Nhiều bài chưa đạt ở lần học đầu.', metric: `${rate}% bài đạt`, action: 'Chia nhỏ bài khó, thêm bước khởi động và ví dụ dẫn dắt.' });
  }
  const hard = r.lessons.filter((l) => l.quizFirstTry !== null && l.quizFirstTry < 55);
  if (hard.length) bad.push({ area: 'Bài học', severity: 'medium', text: `Bài có tỉ lệ đúng cuối bài thấp: ${hard.map((l) => l.id.replace('lesson-', '')).join(', ')}.`, metric: hard.map((l) => `${l.quizFirstTry}%`).join(' / '), action: 'Viết lại phần giải thích đơn giản và thêm câu luyện tập cùng dạng.' });

  const h = r.habitsAndUx;
  if (h.retryFixRate !== null) {
    if (h.retryFixRate >= 50) good.push({ area: 'Cơ chế sai → gợi ý → thử lại', text: 'Học sinh thường tự sửa được sau khi có gợi ý, đúng mục tiêu sư phạm.', metric: `${h.retryFixRate}% tự sửa được (${h.retryN} lần sai)` });
    else bad.push({ area: 'Cơ chế sai → gợi ý → thử lại', severity: 'medium', text: 'Gợi ý chưa giúp học sinh tự sửa.', metric: `${h.retryFixRate}% tự sửa được`, action: 'Viết lại gợi ý theo từng bước nhỏ hơn, thêm ví dụ minh họa trong gợi ý.' });
  }
  if (h.rushedWrongShare !== null && h.rushedWrongShare >= 30) bad.push({ area: 'Trải nghiệm làm bài', severity: 'low', text: 'Nhiều câu sai là do trả lời quá nhanh (dưới 2,5 giây).', metric: `${h.rushedWrongShare}% câu sai làm vội`, action: 'Thêm nhắc "đọc kỹ" và làm chậm nút xác nhận ở câu vừa sai.' });

  const rt = r.retention;
  if (rt.reviewAccuracy !== null) {
    if (rt.reviewAccuracy >= 75) good.push({ area: 'Ghi nhớ', text: 'Lịch ôn cách quãng đang giúp nhớ lâu.', metric: `${rt.reviewAccuracy}% đúng khi ôn (${rt.reviewCount} lượt)` });
    else if (rt.reviewAccuracy < 60) bad.push({ area: 'Ghi nhớ', severity: 'high', text: 'Học sinh quên khá nhiều khi ôn lại.', metric: `${rt.reviewAccuracy}% đúng khi ôn`, action: 'Rút ngắn khoảng ôn đầu tiên và thêm phiên ôn ngắn mỗi ngày.' });
  }
  if (rt.overdueShare !== null && rt.overdueShare >= 30) bad.push({ area: 'Nhắc ôn tập', severity: 'medium', text: 'Nhiều nội dung quá hạn ôn từ 3 ngày trở lên, lời nhắc chưa đủ hiệu quả.', metric: `${rt.overdueShare}% thẻ quá hạn`, action: 'Giảm số câu mỗi phiên ôn, nhắc vào giờ học sinh thường học, thêm lịch nhắc thật vào điện thoại.' });
  else if (rt.overdueShare !== null) good.push({ area: 'Nhắc ôn tập', text: 'Học sinh ôn đúng hạn.', metric: `${rt.overdueShare}% thẻ quá hạn` });

  const e = r.engagement;
  if (r.sample.enoughData) {
    if (e.activeDays >= 12) good.push({ area: 'Thói quen', text: 'Học sinh học đều trong tháng.', metric: `${e.activeDays} ngày có học, ${e.goalDays} ngày đủ mục tiêu` });
    else if (e.activeDays < 8) bad.push({ area: 'Thói quen', severity: 'high', text: 'Học sinh học thưa trong tháng.', metric: `${e.activeDays} ngày có học`, action: 'Giảm mục tiêu ngày xuống 5–7 câu, tăng thưởng cho ngày học đầu tiên của tuần, kiểm tra giờ nhắc.' });
    if (e.gamePlays > e.studyDays * 3) bad.push({ area: 'Cân bằng học – chơi', severity: 'medium', text: 'Chơi game nhiều hơn học.', metric: `${e.gamePlays} lượt chơi / ${e.studyDays} ngày học`, action: 'Giảm xu từ game, tăng thưởng khi hoàn thành bài học.' });
    else good.push({ area: 'Cân bằng học – chơi', text: 'Trò chơi hỗ trợ việc học chứ không lấn át.', metric: `${e.gamePlays} lượt chơi / ${e.studyDays} ngày học` });
  }

  const flags = r.questionFlags;
  const tooHard = flags.filter((x) => x.kind === 'too-hard');
  const trap = flags.filter((x) => x.kind === 'trap');
  if (tooHard.length) bad.push({ area: 'Ngân hàng câu hỏi', severity: 'high', text: `Câu có thể quá khó hoặc đáp án/giải thích chưa rõ: ${tooHard.map((x) => x.id).slice(0, 6).join(', ')}.`, metric: tooHard.map((x) => x.detail).slice(0, 3).join('; '), action: 'Giáo viên kiểm tra lại đáp án; nếu đúng thì thêm gợi ý và ví dụ dễ hơn.' });
  if (trap.length) bad.push({ area: 'Ngân hàng câu hỏi', severity: 'low', text: `Câu có "bẫy" phổ biến: ${trap.map((x) => x.id).slice(0, 6).join(', ')}.`, metric: trap.map((x) => x.detail).slice(0, 2).join('; '), action: 'Bổ sung lời giải thích riêng cho đáp án bẫy và đưa thành ví dụ lỗi sai trong bài.' });
  if (r.sample.enoughData && tooHard.length === 0 && trap.length === 0) good.push({ area: 'Ngân hàng câu hỏi', text: 'Chưa phát hiện câu hỏi bất thường (quá khó hoặc đáp án gây nhầm).', metric: 'ổn' });

  if (!r.sample.enoughData) bad.unshift({ area: 'Dữ liệu', severity: 'low', text: 'Tháng này chưa đủ dữ liệu (cần ít nhất 30 câu trong 5 ngày) để kết luận chắc chắn về chất lượng.', metric: `${r.sample.studyAttempts} câu, ${r.sample.activeDays} ngày`, action: 'Tiếp tục học đều rồi xem lại cuối tháng sau.' });

  const order: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
  bad.sort((a, b) => order[a.severity ?? 'low'] - order[b.severity ?? 'low']);
  return { strengths: good, improvements: bad };
}

export function qualityToText(r: QualityReport): string {
  const L: string[] = [];
  L.push(`ĐÁNH GIÁ CHẤT LƯỢNG ỨNG DỤNG – THÁNG ${r.month}`);
  L.push(`Dữ liệu: ${r.sample.studyAttempts} câu, ${r.sample.activeDays} ngày học${r.sample.enoughData ? '' : ' (chưa đủ để kết luận chắc chắn)'}`);
  L.push('', 'ĐIỂM TỐT – GIỮ VÀ PHÁT HUY:');
  (r.strengths.length ? r.strengths : [{ area: '-', text: 'Chưa có điểm nổi bật đủ dữ liệu.', metric: '' }]).forEach((x) => L.push(`+ [${x.area}] ${x.text} (${x.metric})`));
  L.push('', 'CẦN CẢI THIỆN – KẾ HOẠCH NÂNG CẤP:');
  (r.improvements.length ? r.improvements : [{ area: '-', text: 'Chưa phát hiện vấn đề.', metric: '' }]).forEach((x) => { L.push(`- [${x.area}] ${x.text} (${x.metric})`); if (x.action) L.push(`    → ${x.action}`); });
  return L.join('\n');
}

/** Dữ liệu gửi đi: chỉ số liệu tổng hợp, không có tên hay nội dung cá nhân. */
export const anonymousPayload = (r: QualityReport) => ({ ...r, strengths: r.strengths, improvements: r.improvements });
