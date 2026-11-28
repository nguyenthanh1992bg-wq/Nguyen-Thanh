import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../state/AppContext';
import { getQuestion } from '../data/questionBank';
import { getUnit } from '../data/curriculum';
import { VOCAB_EMOJI } from '../data/game';
import { lessonById, lockReason, warmupQuestions, PASS_QUIZ_MIN } from '../logic/lessonFlow';
import { isRepeatedError } from '../logic/progress';
import { plannedSchedule } from '../logic/srs';
import { QuestionCard, type AttemptResult, type FinishInfo } from '../components/QuestionCard';
import { Sequence, type SeqItem, type SeqResult } from '../components/Sequence';
import { ExampleClip } from '../components/ExampleClip';
import { Card, Note, Picture, ProgressBar, fmtDate, speak } from '../components/ui';
import { FlowBar } from './Placement';
import type { Attempt, Context, Question } from '../types';

type Step = 'warmup' | 'goal' | 'explain' | 'examples' | 'guided' | 'practice' | 'quiz' | 'summary';
const ORDER: Step[] = ['warmup', 'goal', 'explain', 'examples', 'guided', 'practice', 'quiz', 'summary'];
const STEP_LABEL: Record<Step, string> = {
  warmup: 'Ôn kiến thức cũ', goal: 'Mục tiêu', explain: 'Giải thích', examples: 'Ví dụ',
  guided: 'Làm cùng nhau', practice: 'Tự luyện tập', quiz: 'Kiểm tra cuối bài', summary: 'Tổng kết',
};

export function LessonPlayer({ lessonId, preview }: { lessonId: string; preview: boolean }) {
  const [run, setRun] = useState(0);
  return <LessonRun key={run} lessonId={lessonId} preview={preview} onRestart={() => { setRun((n) => n + 1); window.scrollTo(0, 0); }} />;
}

function LessonRun({ lessonId, preview, onRestart }: { lessonId: string; preview: boolean; onRestart: () => void }) {
  const { data, dispatch: realDispatch, go, now } = useApp();
  const lesson = lessonById(lessonId);
  const dispatch: typeof realDispatch = preview ? () => undefined : realDispatch;

  const lock = lesson && !preview ? lockReason(data, lesson) : null;
  const warm = useMemo(() => (lesson ? warmupQuestions(data, lesson, now()) : []), [lesson]); // eslint-disable-line react-hooks/exhaustive-deps
  const struggling = lesson ? isRepeatedError(data.attempts, lesson.unit) || ((data.lessons[lesson.id]?.completions ?? 0) > 0 && !data.lessons[lesson.id]?.passed) : false;

  const [step, setStep] = useState<Step>(warm.length > 0 ? 'warmup' : 'goal');
  const [inRemedial, setInRemedial] = useState(false);
  const [remedialShown, setRemedialShown] = useState(false);
  const [remedialFixed, setRemedialFixed] = useState<boolean | undefined>(undefined);
  const [practiceIdx, setPracticeIdx] = useState(0);
  const [stumbles, setStumbles] = useState(0);
  const [quizResults, setQuizResults] = useState<SeqResult[]>([]);
  const [lessonWrong, setLessonWrong] = useState<Question[]>([]);
  const readStart = useRef(Date.now());
  const completed = useRef(false);

  // Ghi thời gian đọc giải thích / ví dụ.
  useEffect(() => {
    readStart.current = Date.now();
    return () => {
      if (step === 'explain' || step === 'examples') dispatch({ type: 'read', ms: Date.now() - readStart.current });
    };
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!lesson) return <Card><p>Không tìm thấy bài học.</p><button className="btn btn-primary" onClick={() => go({ name: 'home' })}>Về trang chủ</button></Card>;
  if (lock) {
    return (
      <div className="stack">
        <FlowBar title={lesson.title} onExit={() => go({ name: 'roadmap' })} />
        <Card><h1>Mình học bài nền trước nhé</h1><p>{lock}</p><button className="btn btn-primary" onClick={() => go({ name: 'roadmap' })}>Về lộ trình</button></Card>
      </div>
    );
  }

  const record = (q: Question, r: AttemptResult, context: Context) => {
    const a: Attempt = {
      id: `${now()}-${q.id}-${Math.random().toString(36).slice(2, 7)}`, qId: q.id, unit: q.unit, skill: q.skill, level: q.level,
      correct: r.correct, answer: r.answer, timeMs: r.timeMs, ts: now(), context, hints: r.hints, retry: r.retry,
    };
    dispatch({ type: 'attempt', attempt: a });
  };

  const stepIdx = ORDER.indexOf(step);
  const goNext = () => setStep(ORDER[stepIdx + 1]);
  const guidedQ = getQuestion(lesson.guided.questionId);
  const pictured = lesson.vocab.filter((v) => VOCAB_EMOJI[v.en]);

  function onPracticeFinish(f: FinishInfo, q: Question) {
    if (!f.firstTryCorrect && !f.skipped) {
      const n = stumbles + 1;
      setStumbles(n);
      if (!f.finalCorrect) setLessonWrong((w) => [...w, q]);
      // Sai nhiều lần: dừng lại, giải thích đơn giản hơn và cho tự làm một câu tương tự trước khi đi tiếp.
      if (n >= 2 && !remedialShown) { setRemedialShown(true); setInRemedial(true); return; }
    }
    advancePractice();
  }
  function advancePractice() {
    if (practiceIdx + 1 >= lesson!.practice.length) goNext();
    else setPracticeIdx(practiceIdx + 1);
  }

  function finishQuiz(results: SeqResult[]) {
    setQuizResults(results);
    const score = results.filter((r) => r.firstCorrect).length;
    if (!completed.current) {
      completed.current = true;
      dispatch({ type: 'lesson-complete', lessonId: lesson!.id, score, total: results.length, passed: score >= PASS_QUIZ_MIN, ts: now(), repeatedErrorFixed: remedialFixed });
    }
    setStep('summary');
  }

  return (
    <div className="stack">
      <FlowBar title={lesson.title} progress={(stepIdx / (ORDER.length - 1)) * 100} onExit={() => go(preview ? { name: 'content' } : { name: 'home' })} exitLabel={preview ? 'Đóng xem trước' : 'Thoát'} />
      {preview && <Note kind="demo">Chế độ xem trước của giáo viên: kết quả không được lưu.</Note>}
      <p className="steplabel">{lesson.title} · {STEP_LABEL[step]}</p>

      {step === 'warmup' && (
        <Card>
          <h2>Ôn nhanh kiến thức cũ</h2>
          <p className="muted small">{warm.length} câu ngắn để khởi động. Làm sai cũng không sao.</p>
          <Sequence items={warm.map((q) => ({ q }))} mode="quiz" onAttempt={(i, r) => record(i.q, r, 'warmup')} onFinish={goNext} lastLabel="Bắt đầu bài học" />
        </Card>
      )}

      {step === 'goal' && (
        <Card>
          <h1>Hôm nay em sẽ học gì?</h1>
          <p className="big">{lesson.objective}</p>
          <p className="muted">Khoảng {lesson.minutes} phút · Nhóm kiến thức: {getUnit(lesson.unit).name}</p>
          {pictured.length > 0 && (
            <>
              <h2>Từ mới trong bài</h2>
              <div className="piclist">
                {pictured.map((v) => (
                  <button key={v.id} type="button" className="piccard" onClick={() => speak(v.en)} aria-label={`Nghe từ ${v.en}`}>
                    <Picture emoji={VOCAB_EMOJI[v.en]} size="lg" label={v.en} />
                    <b lang="en">{v.en}</b>
                    <span className="muted small">{v.vi}</span>
                  </button>
                ))}
              </div>
              <p className="muted small">Chạm vào thẻ để nghe đọc từ.</p>
            </>
          )}
          {lesson.video && <p><a className="btn btn-soft" href={lesson.video.url} target="_blank" rel="noopener noreferrer">▶ Xem video: {lesson.video.title}</a></p>}
          {struggling && <Note kind="info">Lần trước phần này hơi khó với em, nên lần này mình bắt đầu bằng cách giải thích đơn giản hơn. Em cứ thong thả nhé.</Note>}
          <button className="btn btn-primary btn-lg" onClick={goNext}>Bắt đầu</button>
        </Card>
      )}

      {step === 'explain' && (
        <Card>
          {struggling && (
            <div className="simple">
              <h2>Cách nhớ đơn giản</h2>
              <ul>{lesson.remedial.simpler.map((l, i) => <li key={i}>{l}</li>)}</ul>
            </div>
          )}
          {lesson.explain.map((b, i) => (
            <div key={i} className="block">
              <h2>{b.heading}</h2>
              {b.lines.map((l, j) => <p key={j}>{l}</p>)}
              {b.table && (
                <div className="tablewrap"><table className="table"><thead><tr>{b.table[0].map((c) => <th key={c}>{c}</th>)}</tr></thead>
                  <tbody>{b.table.slice(1).map((r, k) => <tr key={k}>{r.map((c, m) => <td key={m} lang={/[A-Za-z]/.test(c) && !/[à-ỹ]/i.test(c) ? 'en' : undefined}>{c}</td>)}</tr>)}</tbody></table></div>
              )}
            </div>
          ))}
          <button className="btn btn-primary btn-lg" onClick={goNext}>Xem ví dụ</button>
        </Card>
      )}

      {step === 'examples' && (
        <Card>
          <h2>Ví dụ đúng và lỗi hay gặp</h2>
          <ExampleClip examples={lesson.examples} />
          <ul className="examples">
            {lesson.examples.map((e, i) => (
              <li key={i} className={e.ok ? 'ex-ok' : 'ex-bad'}>
                <span aria-label={e.ok ? 'Đúng' : 'Sai'}>{e.ok ? '✅' : '❌'}</span>
                <div>
                  <b lang="en">{e.en}</b> <button type="button" className="btn btn-link small" onClick={() => speak(e.en)} aria-label={`Nghe: ${e.en}`}>🔊</button>
                  <div className="muted small">{e.vi}</div>
                  {e.note && <div className="small">{e.note}</div>}
                </div>
              </li>
            ))}
          </ul>
          <button className="btn btn-primary btn-lg" onClick={goNext}>Mình cùng làm thử</button>
        </Card>
      )}

      {step === 'guided' && (
        <Card>
          <h2>Làm cùng nhau</h2>
          <p className="muted small">Em có thể mở từng bước hướng dẫn trước khi trả lời.</p>
          <QuestionCard key={guidedQ.id} q={guidedQ} mode="guided" guidedSteps={lesson.guided.steps}
            onAttempt={(r) => record(guidedQ, r, 'guided')}
            onNext={(f) => { if (!f.firstTryCorrect) setStumbles((n) => n + 1); goNext(); }} nextLabel="Sang phần tự luyện tập" />
        </Card>
      )}

      {step === 'practice' && !inRemedial && (
        <Card>
          <h2>Tự luyện tập</h2>
          <p className="muted small">Câu {practiceIdx + 1}/{lesson.practice.length}. Nếu sai, em sẽ có gợi ý và được thử lại.</p>
          <ProgressBar value={practiceIdx} max={lesson.practice.length} label="Tiến độ luyện tập" />
          {(() => {
            const q = getQuestion(lesson.practice[practiceIdx]);
            return <QuestionCard key={q.id} q={q} mode="practice" onAttempt={(r) => record(q, r, 'practice')}
              onNext={(f) => onPracticeFinish(f, q)} nextLabel={practiceIdx + 1 >= lesson.practice.length ? 'Sang bài kiểm tra cuối bài' : 'Câu tiếp theo'} />;
          })()}
        </Card>
      )}

      {step === 'practice' && inRemedial && (
        <Card>
          <h2>Mình dừng lại một chút nhé 🌱</h2>
          <p>Phần này đang hơi khó nên mình chưa đi tiếp vội. Em đọc cách nhớ đơn giản này rồi tự làm một câu tương tự nhé.</p>
          <div className="simple"><ul>{lesson.remedial.simpler.map((l, i) => <li key={i}>{l}</li>)}</ul></div>
          {(() => {
            const q = getQuestion(lesson.remedial.questionId);
            return <QuestionCard key={q.id} q={q} mode="practice" onAttempt={(r) => record(q, r, 'remedial')}
              onNext={(f) => { setRemedialFixed(f.finalCorrect); setInRemedial(false); advancePractice(); }} nextLabel="Tiếp tục luyện tập" />;
          })()}
        </Card>
      )}

      {step === 'quiz' && (
        <Card>
          <h2>Kiểm tra cuối bài</h2>
          <p className="muted small">3 câu, không có gợi ý. Đúng từ {PASS_QUIZ_MIN}/3 câu là em đã sẵn sàng sang bài sau.</p>
          <Sequence items={lesson.quiz.map((id): SeqItem => ({ q: getQuestion(id) }))} mode="quiz"
            onAttempt={(i, r) => record(i.q, r, 'quiz')} onFinish={finishQuiz} lastLabel="Xem tổng kết" />
        </Card>
      )}

      {step === 'summary' && <Summary />}
    </div>
  );

  function Summary() {
    const score = quizResults.filter((r) => r.firstCorrect).length;
    const passed = score >= PASS_QUIZ_MIN;
    const wrongQs = [...lessonWrong, ...quizResults.filter((r) => !r.firstCorrect).map((r) => r.item.q)];
    const unique = [...new Map(wrongQs.map((q) => [q.id, q])).values()];
    const days = plannedSchedule(now());
    return (
      <>
        <Card>
          <h1>{passed ? 'Em làm tốt lắm! 🎉' : 'Cố lên, mình học lại một chút nhé 💪'}</h1>
          <p className="stars" aria-label={`${score} trên ${quizResults.length} sao`}>{'⭐'.repeat(score)}{'☆'.repeat(Math.max(0, quizResults.length - score))}</p>
          <p>Kiểm tra cuối bài: <b>{score}/{quizResults.length}</b> câu đúng.</p>
          {passed
            ? <p>Em đã đạt yêu cầu của bài này. Mình sẽ hỏi lại sau ít ngày để chắc chắn em nhớ lâu. Vào mục <b>Chơi</b> để nhận rương thưởng khi đủ mục tiêu hôm nay nhé!</p>
            : <p>Chưa đạt yêu cầu ({PASS_QUIZ_MIN}/3), nên mình chưa chuyển sang bài tiếp theo. Em đọc lại các lỗi bên dưới rồi học lại bài, lần này sẽ dễ hơn.</p>}
          {remedialFixed !== undefined && <p className="small">{remedialFixed ? '✅ Em đã tự sửa được phần từng sai nhiều lần.' : '🔁 Phần từng sai nhiều lần vẫn cần luyện thêm – mình sẽ cho ôn lại sớm hơn.'}</p>}
        </Card>
        {unique.length > 0 && (
          <Card>
            <h2>Những câu cần nhớ</h2>
            {unique.map((q) => (
              <details key={q.id} className="acc" open>
                <summary lang="en">{q.prompt}</summary>
                <p><b>Đáp án:</b> <span lang="en">{q.answers[0]}</span></p>
                <p>{q.explanation}</p>
              </details>
            ))}
          </Card>
        )}
        {passed && (
          <Card>
            <h2>Lịch ôn lại</h2>
            <p>Dự kiến ôn lần lượt vào các ngày: {days.map((d) => fmtDate(d)).join(' · ')} (sau 1, 3, 7, 14 ngày; lịch sẽ tự điều chỉnh theo kết quả của em).</p>
            <h2>Từ vựng của bài</h2>
            <ul className="plain">{lesson!.vocab.map((v) => <li key={v.id}>{VOCAB_EMOJI[v.en] ?? ''} <b lang="en">{v.en}</b> – {v.vi}</li>)}</ul>
          </Card>
        )}
        <div className="row">
          {!passed && <button className="btn btn-primary btn-lg" onClick={onRestart}>Học lại bài này</button>}
          <button className={passed ? 'btn btn-primary btn-lg' : 'btn btn-soft'} onClick={() => go({ name: preview ? 'content' : 'home' })}>{passed ? 'Về trang chủ' : 'Để lúc khác'}</button>
        </div>
      </>
    );
  }
}
