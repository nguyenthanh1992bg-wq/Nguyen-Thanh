import { LESSONS } from '../data/lessons';
import { UNITS, WEEKS, getUnit, phaseOfWeek } from '../data/curriculum';
import type { AppData, UnitId } from '../types';
import { analyzePlacement, type SkillScore } from './placement';
import { isRepeatedError, mistakeLog, studyMs, unitStatus, type UnitStatus } from './progress';
import { DAY_MS, dueCards } from './srs';
import { nextActivity } from './lessonFlow';
import { dailyStats } from './daily';
import { levelOf } from './game';

export interface UnitLine { unit: UnitId; name: string; status: UnitStatus }

export interface ParentReport {
  nickname: string;
  demo: boolean;
  generatedAt: number;
  placementDone: boolean;
  placementSufficient: boolean;
  placement: { answered: number; total: number; correct: number; bySkill: SkillScore[] } | null;
  lessons: { title: string; passed: boolean; bestScore: number; quizTotal: number }[];
  lessonsPassed: number;
  lessonsAvailable: number;
  strong: UnitLine[];
  progressing: UnitLine[];
  weak: UnitLine[];
  unknown: UnitLine[];
  weekly: { week: number; title: string; score: number; total: number; passed: boolean }[];
  retention: { cards: number; mature: number; reviewAccuracy: number | null; reviewCount: number };
  time: { totalMin: number; last7Min: number; activeDays: number };
  mistakes: { open: number; fixed: number; repeatedUnits: string[] };
  habit: { streak: number; todayAnswered: number; goal: number; totalPoints: number; levelName: string; last7: { label: string; answered: number }[] };
  rewards: { redeemed: { name: string; cost: number; ts: number; done: boolean }[] };
  nextPlan: string[];
  weekEstimate: { week: number; phase: string } | null;
}

export function buildReport(data: AppData, now: number): ParentReport {
  const analysis = analyzePlacement(data.attempts);
  const lines: UnitLine[] = UNITS.map((u) => ({ unit: u.id, name: u.name, status: unitStatus(data.attempts, u.id) }));
  const placementDone = data.placement.status === 'done';

  const last7 = data.attempts.filter((a) => a.ts >= now - 7 * DAY_MS);
  const days = new Set(data.attempts.map((a) => new Date(a.ts).toDateString()));
  const reviewAttempts = data.attempts.filter((a) => a.context === 'review' && a.ts >= now - 30 * DAY_MS);
  const cards = Object.values(data.srs);

  const log = mistakeLog(data.attempts);
  const weekly = Object.entries(data.weeklyTests).flatMap(([w, list]) => {
    const last = list[list.length - 1];
    const plan = WEEKS.find((x) => x.week === Number(w));
    return last && plan ? [{ week: plan.week, title: plan.title, score: last.score, total: last.total, passed: last.total > 0 && last.score / last.total >= 0.7 }] : [];
  }).sort((a, b) => a.week - b.week);

  const next = nextActivity(data, now);
  const due = dueCards(data.srs, now).length;
  const daily = dailyStats(data.attempts, now);
  const plan: string[] = [];
  if (next.kind === 'placement') plan.push(next.resume ? 'Làm tiếp bài kiểm tra đầu vào (có thể làm nhiều buổi).' : 'Làm bài kiểm tra đầu vào để lập hồ sơ năng lực.');
  if (next.kind === 'lesson') plan.push(`Học bài "${next.lesson.title}" (khoảng ${next.lesson.minutes} phút).`);
  if (due > 0) plan.push(`Ôn ${due} nội dung đến hạn (mỗi ngày 5–10 phút là đủ).`);
  if (placementDone && analysis.needFollowUp.length > 0) plan.push('Làm bài đánh giá bổ sung cho các nhóm kiến thức chưa đủ bằng chứng.');
  if (next.kind === 'all-done' && due === 0) plan.push('Hoàn thành các bài hiện có trong bản thử nghiệm. Chờ bổ sung bài học mới.');
  if (!daily.goalReached) plan.push(`Mục tiêu mỗi ngày: ${daily.goal} câu (hôm nay đã làm ${daily.today.answered}).`);
  plan.push('Phụ huynh có thể ngồi cùng em 10 phút mỗi tuần để em đọc to các câu ví dụ.');

  const started = data.placement.startedAt;
  const weekNo = started ? Math.min(12, Math.max(1, Math.floor((now - started) / (7 * DAY_MS)) + 1)) : null;

  return {
    nickname: data.nickname,
    demo: data.demo,
    generatedAt: now,
    placementDone,
    placementSufficient: analysis.sufficient,
    placement: analysis.answered > 0 ? { answered: analysis.answered, total: analysis.totalQuestions, correct: analysis.correct, bySkill: analysis.bySkill } : null,
    lessons: LESSONS.map((l) => ({ title: l.title, passed: data.lessons[l.id]?.passed === true, bestScore: data.lessons[l.id]?.bestScore ?? 0, quizTotal: data.lessons[l.id]?.quizTotal ?? l.quiz.length })),
    lessonsPassed: LESSONS.filter((l) => data.lessons[l.id]?.passed).length,
    lessonsAvailable: LESSONS.length,
    strong: lines.filter((l) => l.status === 'secure' || l.status === 'mastered'),
    progressing: lines.filter((l) => l.status === 'learning' || l.status === 'likely-known'),
    weak: lines.filter((l) => l.status === 'needs-work'),
    unknown: lines.filter((l) => l.status === 'no-evidence'),
    weekly,
    retention: {
      cards: cards.length,
      mature: cards.filter((c) => c.box >= 2).length,
      reviewCount: reviewAttempts.length,
      reviewAccuracy: reviewAttempts.length >= 5 ? Math.round((reviewAttempts.filter((a) => a.correct).length / reviewAttempts.length) * 100) : null,
    },
    time: {
      totalMin: Math.round(studyMs(data.attempts, data.readMs) / 60_000),
      last7Min: Math.round(studyMs(last7, 0) / 60_000),
      activeDays: days.size,
    },
    mistakes: {
      open: log.filter((m) => !m.resolved).length,
      fixed: log.filter((m) => m.resolved).length,
      repeatedUnits: UNITS.filter((u) => isRepeatedError(data.attempts, u.id)).map((u) => getUnit(u.id).name),
    },
    habit: {
      streak: daily.streak, todayAnswered: daily.today.answered, goal: daily.goal, totalPoints: daily.totalPoints,
      levelName: levelOf(daily.totalPoints).name, last7: daily.last7.map((d) => ({ label: d.label, answered: d.answered })),
    },
    rewards: { redeemed: data.game.redeemed.map((r) => ({ name: r.name, cost: r.cost, ts: r.ts, done: r.done })) },
    nextPlan: plan,
    weekEstimate: weekNo ? { week: weekNo, phase: phaseOfWeek(weekNo).id } : null,
  };
}

export function reportToText(r: ParentReport): string {
  const names = (xs: UnitLine[]) => (xs.length ? xs.map((x) => x.name).join('; ') : 'chưa có');
  const out: string[] = [];
  out.push(`BÁO CÁO HỌC TẬP – ${r.nickname || 'Học sinh'}${r.demo ? ' (DỮ LIỆU MINH HỌA)' : ''}`);
  out.push(`Bài đã hoàn thành: ${r.lessonsPassed}/${r.lessonsAvailable} bài có trong bản thử nghiệm.`);
  out.push(`Thói quen: ${r.habit.streak} ngày liên tiếp; hôm nay ${r.habit.todayAnswered}/${r.habit.goal} câu; cấp "${r.habit.levelName}" (${r.habit.totalPoints} điểm).`);
  out.push(`Kiến thức khá vững: ${names(r.strong)}`);
  out.push(`Đang tiến bộ / cần xác nhận: ${names(r.progressing)}`);
  out.push(`Cần học kỹ: ${names(r.weak)}`);
  out.push(`Chưa đủ dữ liệu: ${names(r.unknown)}`);
  if (r.placement) out.push(`Kiểm tra đầu vào: ${r.placement.correct}/${r.placement.answered} câu đúng (đã làm ${r.placement.answered}/${r.placement.total} câu).`);
  out.push(`Thời gian học ước tính: ${r.time.totalMin} phút (7 ngày gần nhất: ${r.time.last7Min} phút).`);
  out.push(`Lỗi sai: ${r.mistakes.open} chưa khắc phục, ${r.mistakes.fixed} đã khắc phục.`);
  out.push('Kế hoạch tiếp theo:');
  r.nextPlan.forEach((p) => out.push(`- ${p}`));
  out.push('Lưu ý: đây là đánh giá dựa trên số câu hỏi hạn chế, chỉ mang tính tham khảo.');
  return out.join('\n');
}
