import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../state/AppContext';
import { getQuestion, findQuestion } from '../data/questionBank';
import { getUnit } from '../data/curriculum';
import { VOCAB_EMOJI } from '../data/game';
import { mistakeLog } from '../logic/progress';
import { dueCards } from '../logic/srs';
import { lessonByUnit } from '../logic/lessonFlow';
import { ALL_VOCAB, findVocab, vocabQuestion } from '../logic/vocab';
import { Sequence, type SeqItem, type SeqResult } from '../components/Sequence';
import { Card, Picture, fmtDate, speak } from '../components/ui';
import { FlowBar } from './Placement';

type Mode = 'due' | 'mistakes' | 'vocab';

export function Review({ initial }: { initial?: Mode }) {
  const { data, dispatch, go, now } = useApp();
  const t = now();
  const [session, setSession] = useState<{ mode: Mode; items: SeqItem[]; n: number } | null>(null);
  const [summary, setSummary] = useState<{ mode: Mode; results: SeqResult[] } | null>(null);

  const due = dueCards(data.srs, t);
  const log = mistakeLog(data.attempts);
  const open = log.filter((m) => !m.resolved);
  const fixed = log.filter((m) => m.resolved);
  const learnedVocab = ALL_VOCAB.filter((v) => data.srs[`v:${v.id}`]);
  const nextDue = Object.values(data.srs).filter((c) => c.due > t).sort((a, b) => a.due - b.due)[0];

  /** Lỗi sai nào ôn lại được ngay: bài dạy phần đó đã đạt, hoặc chưa có bài (bản thử nghiệm). */
  const reviewable = useMemo(() => open.filter((m) => {
    const l = lessonByUnit(m.unit);
    return !l || data.lessons[l.id]?.passed === true;
  }), [open, data.lessons]);

  const itemsFor = (mode: Mode): SeqItem[] => {
    if (mode === 'due') {
      return due.slice(0, 10).flatMap((c): SeqItem[] => {
        if (c.kind === 'q') { const q = findQuestion(c.refId); return q ? [{ q, kind: 'q', refId: c.refId }] : []; }
        const v = findVocab(c.refId);
        return v ? [{ q: vocabQuestion(v), tag: 'Từ vựng', kind: 'v', refId: v.id }] : [];
      });
    }
    if (mode === 'mistakes') return reviewable.slice(0, 10).map((m) => ({ q: getQuestion(m.qId), kind: 'q' as const, refId: m.qId }));
    const dueV = due.filter((c) => c.kind === 'v').map((c) => c.refId);
    const pool = [...new Set([...dueV, ...learnedVocab.map((v) => v.id)])].slice(0, 10);
    return pool.flatMap((id): SeqItem[] => { const v = findVocab(id); return v ? [{ q: vocabQuestion(v), tag: 'Từ vựng', kind: 'v', refId: v.id }] : []; });
  };

  function begin(mode: Mode) {
    const items = itemsFor(mode);
    if (items.length === 0) return;
    setSummary(null);
    setSession({ mode, items, n: (session?.n ?? 0) + 1 });
  }

  // Mở thẳng một phiên khi vào từ liên kết (ví dụ nút "Ôn ngay" ở trang chủ).
  useEffect(() => {
    if (!initial) return;
    const items = itemsFor(initial);
    if (items.length > 0) setSession({ mode: initial, items, n: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onAttempt(item: SeqItem, r: { answer: string; correct: boolean; timeMs: number; hints: number; retry: boolean }) {
    if (item.kind === 'v') {
      const v = findVocab(item.refId!);
      if (v) dispatch({ type: 'vocab', id: v.id, unit: v.unit, correct: r.correct, ts: now() });
      return;
    }
    const q = item.q;
    dispatch({ type: 'attempt', attempt: { id: `${now()}-${q.id}-${Math.random().toString(36).slice(2, 7)}`, qId: q.id, unit: q.unit, skill: q.skill, level: q.level, correct: r.correct, answer: r.answer, timeMs: r.timeMs, ts: now(), context: 'review', hints: r.hints, retry: r.retry } });
  }

  if (session) {
    return (
      <div className="stack">
        <FlowBar title={session.mode === 'due' ? 'Ôn tập đến hạn' : session.mode === 'mistakes' ? 'Ôn lỗi sai' : 'Luyện từ vựng'} onExit={() => { setSession(null); go({ name: 'review' }); }} />
        <Card><Sequence key={session.n} items={session.items} mode="review" onAttempt={onAttempt}
          onFinish={(results) => { setSummary({ mode: session.mode, results }); setSession(null); }} /></Card>
      </div>
    );
  }

  if (summary) {
    const good = summary.results.filter((r) => r.firstCorrect).length;
    const again = summary.results.filter((r) => !r.firstCorrect);
    return (
      <div className="stack">
        <Card>
          <h1>Ôn xong rồi! 👏</h1>
          <p>Em nhớ đúng <b>{good}/{summary.results.length}</b> câu. Những câu chưa nhớ sẽ được hẹn ôn lại sớm hơn (sau 1 ngày).</p>
          {again.length > 0 && (
            <>
              <h2>Cần nhớ thêm</h2>
              {again.map((r, i) => (
                <details key={i} className="acc" open>
                  <summary lang="en">{r.item.q.prompt}</summary>
                  <p><b>Đáp án:</b> <span lang="en">{r.item.q.answers[0]}</span></p>
                  <p>{r.item.q.explanation}</p>
                </details>
              ))}
            </>
          )}
          <button className="btn btn-primary" onClick={() => setSummary(null)}>Quay lại trang ôn tập</button>
        </Card>
      </div>
    );
  }

  return (
    <div className="stack">
      <h1>Ôn tập</h1>
      <Card>
        <h2>Đến hạn ôn hôm nay</h2>
        {due.length > 0
          ? <><p><b>{due.length}</b> nội dung đến hạn. Mỗi lượt ôn tối đa 10 câu (khoảng 5 phút).</p><button className="btn btn-primary btn-lg" onClick={() => begin('due')}>Ôn ngay</button></>
          : <p>Hôm nay chưa có gì đến hạn. {nextDue ? `Lần ôn kế tiếp: ${fmtDate(nextDue.due)}.` : 'Hoàn thành một bài học để bắt đầu có lịch ôn.'}</p>}
        <p className="small muted">Lịch ôn ban đầu: sau 1, 3, 7, 14 ngày. Làm sai thì ôn dày hơn, làm đúng thì giãn ra.</p>
      </Card>

      <Card>
        <h2>Lỗi sai ({open.length} chưa khắc phục · {fixed.length} đã khắc phục)</h2>
        {open.length === 0 ? <p>Không có lỗi sai nào đang chờ. Tuyệt vời!</p> : (
          <>
            {reviewable.length > 0 && <button className="btn btn-primary" onClick={() => begin('mistakes')}>Ôn {Math.min(10, reviewable.length)} lỗi sai</button>}
            {open.slice(0, 12).map((m) => {
              const q = getQuestion(m.qId);
              const l = lessonByUnit(m.unit);
              const wait = l && !data.lessons[l.id]?.passed;
              const reason = q.commonMistakes.find((x) => x.answer.toLowerCase() === m.wrongAnswer.toLowerCase())?.reason;
              return (
                <details key={m.qId} className="acc">
                  <summary>❌ <span lang="en">{q.prompt}</span> <span className="muted small">({getUnit(m.unit).name})</span></summary>
                  <p><b>Em chọn:</b> <span lang="en">{m.wrongAnswer || '(chưa biết)'}</span> · <b>Đáp án:</b> <span lang="en">{q.answers[0]}</span></p>
                  {reason && <p>{reason}</p>}
                  <p>{q.explanation}</p>
                  {wait && l && <p className="small">Nên học bài “{l.title}” trước. <button className="btn btn-link" onClick={() => go({ name: 'lesson', id: l.id, preview: false })}>Mở bài</button></p>}
                </details>
              );
            })}
          </>
        )}
        {fixed.length > 0 && <p className="small muted">✅ Đã khắc phục: {fixed.length} lỗi (làm đúng lại mà không cần gợi ý).</p>}
      </Card>

      <Card>
        <h2>Từ vựng đã học ({learnedVocab.length})</h2>
        {learnedVocab.length === 0 ? <p>Hoàn thành một bài học để mở từ vựng của bài đó.</p> : (
          <>
            <button className="btn btn-primary" onClick={() => begin('vocab')}>Luyện từ vựng</button>
            <ul className="vocab">
              {learnedVocab.map((v) => (
                <li key={v.id}>
                  {VOCAB_EMOJI[v.en] && <Picture emoji={VOCAB_EMOJI[v.en]} size="sm" label={v.en} />}
                  <div>
                    <b lang="en">{v.en}</b> – {v.vi}
                    <button type="button" className="btn btn-link" onClick={() => speak(v.en)} aria-label={`Nghe từ ${v.en}`}>🔊</button>
                    <div className="small muted" lang="en">{v.example}</div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
