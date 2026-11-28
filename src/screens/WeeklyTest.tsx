import { useMemo, useState } from 'react';
import { useApp } from '../state/AppContext';
import { WEEKS, getUnit } from '../data/curriculum';
import { buildWeeklyTest, lessonByUnit, WEEKLY_PASS_RATIO } from '../logic/lessonFlow';
import { Sequence, type SeqResult } from '../components/Sequence';
import { Card } from '../components/ui';
import { FlowBar } from './Placement';
import { getQuestion } from '../data/questionBank';
import type { UnitId } from '../types';

export function WeeklyTest({ week }: { week: number }) {
  const { data, dispatch, go, now } = useApp();
  const plan = WEEKS.find((w) => w.week === week);
  const ids = useMemo(() => buildWeeklyTest(week, data.attempts, week === 12 ? 10 : 8), [week]); // eslint-disable-line react-hooks/exhaustive-deps
  const [result, setResult] = useState<{ score: number; total: number; weak: UnitId[] } | null>(null);
  const [started, setStarted] = useState(false);

  if (!plan) return null;

  function finish(rs: SeqResult[]) {
    const scored = rs.filter((r) => !r.skipped);
    const score = scored.filter((r) => r.firstCorrect).length;
    const weak = [...new Set(scored.filter((r) => !r.firstCorrect).map((r) => r.item.q.unit))];
    dispatch({ type: 'weekly', week, result: { ts: now(), score, total: scored.length, weakUnits: weak } });
    setResult({ score, total: scored.length, weak });
  }

  return (
    <div className="stack">
      <FlowBar title={`Kiểm tra tuần ${week}`} onExit={() => go({ name: 'roadmap' })} />
      {!started && !result && (
        <Card>
          <h1>Tuần {week}: {plan.title}</h1>
          <p>{ids.length} câu, không có gợi ý. Đạt từ {Math.round(WEEKLY_PASS_RATIO * 100)}% là em sẵn sàng sang tuần tiếp theo. Chưa đạt thì mình ôn lại và làm lại, không sao cả.</p>
          {ids.length === 0 ? <p>Tuần này chưa có câu hỏi.</p> : <button className="btn btn-primary btn-lg" onClick={() => setStarted(true)}>Bắt đầu</button>}
        </Card>
      )}
      {started && !result && (
        <Card><Sequence items={ids.map((id) => ({ q: getQuestion(id) }))} mode="quiz"
          onAttempt={(item, r) => dispatch({ type: 'attempt', attempt: { id: `${now()}-${item.q.id}-${Math.random().toString(36).slice(2, 7)}`, qId: item.q.id, unit: item.q.unit, skill: item.q.skill, level: item.q.level, correct: r.correct, answer: r.answer, timeMs: r.timeMs, ts: now(), context: 'weekly', hints: r.hints, retry: r.retry } })}
          onFinish={finish} /></Card>
      )}
      {result && (
        <Card>
          {(() => {
            const ok = result.total > 0 && result.score / result.total >= WEEKLY_PASS_RATIO;
            return (
              <>
                <h1>{ok ? 'Em đã đạt! 🎉' : 'Chưa đạt lần này, mình ôn lại nhé 💪'}</h1>
                <p>Kết quả: <b>{result.score}/{result.total}</b> câu đúng.</p>
                {ok ? <p>{plan.advance}</p> : (
                  <>
                    <p>{plan.retry}</p>
                    {result.weak.length > 0 && (
                      <>
                        <p>Phần nên ôn:</p>
                        <ul className="plain">
                          {result.weak.map((u) => {
                            const l = lessonByUnit(u);
                            return <li key={u}><b>{getUnit(u).name}</b>{l ? <> – <button className="btn btn-link" onClick={() => go({ name: 'lesson', id: l.id, preview: false })}>học lại bài “{l.title}”</button></> : <span className="muted small"> – chưa có bài trong bản thử nghiệm</span>}</li>;
                          })}
                        </ul>
                      </>
                    )}
                  </>
                )}
                <div className="row">
                  <button className="btn btn-primary" onClick={() => go({ name: 'roadmap' })}>Về lộ trình</button>
                  <button className="btn btn-soft" onClick={() => go({ name: 'review' })}>Ôn lỗi sai</button>
                </div>
              </>
            );
          })()}
        </Card>
      )}
    </div>
  );
}
