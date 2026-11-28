import { useMemo, useRef, useState } from 'react';
import type { Question } from '../types';
import { gradeAnswer, reorderTiles, type GradeResult } from '../logic/grading';
import { ruleBasedTutor } from '../tutor/tutor';
import { speak } from './ui';

export type CardMode = 'placement' | 'practice' | 'quiz' | 'review' | 'guided';

export interface AttemptResult {
  answer: string;
  correct: boolean;
  timeMs: number;
  hints: number;
  retry: boolean;
}

export interface FinishInfo {
  skipped: boolean;
  /** Đúng ngay lần trả lời đầu tiên (có thể đã xem gợi ý). */
  firstTryCorrect: boolean;
  /** Đúng ngay lần đầu, không dùng gợi ý. */
  firstTryClean: boolean;
  finalCorrect: boolean;
}

interface Props {
  q: Question;
  mode: CardMode;
  onAttempt: (r: AttemptResult) => void;
  onNext: (f: FinishInfo) => void;
  nextLabel?: string;
  guidedSteps?: string[];
}

type Phase = 'answering' | 'retry' | 'feedback';

export function QuestionCard({ q, mode, onAttempt, onNext, nextLabel = 'Tiếp tục', guidedSteps }: Props) {
  const [choice, setChoice] = useState('');
  const [picked, setPicked] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>('answering');
  const [hintsShown, setHintsShown] = useState(0);
  const [steps, setSteps] = useState(0);
  const [msg, setMsg] = useState('');
  const [verdict, setVerdict] = useState<GradeResult | null>(null);
  const [firstTryClean, setFirstTryClean] = useState(false);
  const [tries, setTries] = useState(0);
  const [audioFailed, setAudioFailed] = useState(false);
  const start = useRef(Date.now());
  const firstOk = useRef<boolean | null>(null);
  const tiles = useMemo(() => (q.type === 'reorder' ? reorderTiles(q) : []), [q]);

  const canRetry = mode === 'practice' || mode === 'guided';
  const hintAllowed = canRetry;
  const locked = phase === 'feedback';

  const currentAnswer = (): string => (q.type === 'reorder' ? picked.map((i) => tiles[i]).join(' ') : choice.trim());
  const ready = q.type === 'reorder' ? picked.length === tiles.length : choice.trim() !== '';

  const hintsForAttempt = (): number => (mode === 'guided' ? (steps > 0 ? 1 : 0) : hintsShown);

  function submit(answer: string) {
    const g = gradeAnswer(q, answer);
    const timeMs = Date.now() - start.current;
    const retry = tries > 0;
    const hints = hintsForAttempt();
    onAttempt({ answer, correct: g.correct, timeMs, hints, retry });
    setVerdict(g);
    if (firstOk.current === null) firstOk.current = g.correct;
    if (mode === 'placement') {
      // Bài đầu vào chỉ đo, không phản hồi từng câu (xem lại đáp án ở cuối bài).
      onNext({ skipped: false, firstTryCorrect: g.correct, firstTryClean: g.correct && hints === 0, finalCorrect: g.correct });
      return;
    }
    if (g.correct) {
      if (tries === 0) setFirstTryClean(hints === 0);
      setMsg('');
      setPhase('feedback');
      return;
    }
    if (canRetry && tries === 0 && !g.dontKnow) {
      setTries(1);
      setMsg(ruleBasedTutor.nudge(q, g, 0));
      setHintsShown((h) => Math.max(h, 1)); // tự mở gợi ý đầu tiên sau lần sai đầu
      setChoice('');
      setPicked([]);
      start.current = Date.now();
      setPhase('retry');
      return;
    }
    setMsg(ruleBasedTutor.nudge(q, g, tries));
    setPhase('feedback');
  }

  const finalCorrect = verdict?.correct === true;

  return (
    <div className="qcard">
      {q.passage && <blockquote className="passage">{q.passage}</blockquote>}
      {q.audioText && (
        <div className="audio">
          <button type="button" className="btn btn-soft" onClick={() => setAudioFailed(!speak(q.audioText!))}>🔊 Nghe</button>
          <button type="button" className="btn btn-soft" onClick={() => setAudioFailed(!speak(q.audioText!, 0.6))}>🐢 Nghe chậm</button>
          {audioFailed && <p className="muted">Thiết bị này không phát được âm thanh.</p>}
          <button type="button" className="btn btn-link" onClick={() => onNext({ skipped: true, firstTryCorrect: false, firstTryClean: false, finalCorrect: false })}>Em không nghe được – bỏ qua câu này</button>
        </div>
      )}
      <h3 className="prompt" lang="en">{q.prompt}</h3>
      {q.promptVi && <p className="muted">{q.promptVi}</p>}

      {mode === 'guided' && guidedSteps && (
        <div className="steps" aria-live="polite">
          {guidedSteps.slice(0, steps).map((s, i) => (<p key={i} className="step"><b>Bước {i + 1}.</b> {s}</p>))}
          {steps < guidedSteps.length && !locked && (
            <button type="button" className="btn btn-soft" onClick={() => setSteps(steps + 1)}>
              {steps === 0 ? 'Xem hướng dẫn bước 1' : 'Xem bước tiếp theo'}
            </button>
          )}
        </div>
      )}

      {q.type === 'mcq' && (
        <div className="options" role="radiogroup" aria-label="Các lựa chọn">
          {q.options!.map((o, i) => {
            const showRight = locked && q.answers.includes(o);
            const isWrongPick = locked && choice === o && !q.answers.includes(o);
            return (
              <button
                key={o} type="button" role="radio" aria-checked={choice === o} disabled={locked}
                className={`opt ${choice === o ? 'opt-on' : ''} ${showRight ? 'opt-ok' : ''} ${isWrongPick ? 'opt-bad' : ''}`}
                onClick={() => setChoice(o)}
              >
                <span className="opt-key">{String.fromCharCode(65 + i)}</span> <span lang="en">{o}</span>
              </button>
            );
          })}
        </div>
      )}

      {q.type === 'fill' && (
        <input
          className="input" lang="en" value={choice} disabled={locked} placeholder="Gõ đáp án của em"
          autoCapitalize="off" autoCorrect="off" spellCheck={false} aria-label="Đáp án"
          onChange={(e) => setChoice(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && ready && !locked) submit(currentAnswer()); }}
        />
      )}

      {q.type === 'reorder' && (
        <div>
          <div className="tray tray-answer" aria-label="Câu của em" lang="en">
            {picked.length === 0 && <span className="muted">Chạm vào các từ bên dưới theo đúng thứ tự</span>}
            {picked.map((i) => (
              <button key={i} type="button" className="tile tile-on" disabled={locked} onClick={() => setPicked(picked.filter((x) => x !== i))}>{tiles[i]}</button>
            ))}
          </div>
          <div className="tray" aria-label="Các từ" lang="en">
            {tiles.map((t, i) => (
              <button key={i} type="button" className="tile" disabled={locked || picked.includes(i)} onClick={() => setPicked([...picked, i])}>{t}</button>
            ))}
          </div>
          {picked.length > 0 && !locked && <button type="button" className="btn btn-link" onClick={() => setPicked([])}>Xóa làm lại</button>}
        </div>
      )}

      {hintAllowed && hintsShown > 0 && (
        <ul className="hints" aria-live="polite">
          {Array.from({ length: hintsShown }, (_, i) => ruleBasedTutor.hint(q, i)).filter(Boolean).map((h, i) => (<li key={i}>💡 {h}</li>))}
        </ul>
      )}

      <div className={`sheet sheet-${phase === 'feedback' ? (finalCorrect ? 'ok' : 'bad') : phase === 'retry' ? 'retry' : 'idle'}`}>
        {phase === 'retry' && <div className="sheet-msg" role="status"><b>Thử lại nhé.</b> {msg}</div>}
        {phase === 'feedback' && (
          <div className="sheet-msg" role="status">
            {finalCorrect ? (
              <>
                <b className="sheet-title">{tries > 0 ? 'Đúng rồi! Em đã tự sửa được.' : 'Chính xác! ⭐'}</b>
                <p>{q.explanation}</p>
              </>
            ) : (
              <>
                <b className="sheet-title">{verdict?.dontKnow ? 'Mình cùng xem lời giải nhé.' : 'Chưa đúng, không sao cả.'}</b>
                {msg && <p>{msg}</p>}
                <p><b>Đáp án:</b> <span lang="en">{q.answers[0]}</span></p>
                <p>{q.explanation}</p>
                {q.audioText && <p lang="en">Bài nghe: {q.audioText}</p>}
              </>
            )}
          </div>
        )}
        <div className="actions">
          {phase !== 'feedback' && (
            <>
              <button type="button" className="btn btn-primary" disabled={!ready} onClick={() => submit(currentAnswer())}>
                {phase === 'retry' ? 'Kiểm tra lần nữa' : 'Kiểm tra'}
              </button>
              {hintAllowed && (
                <button type="button" className="btn btn-soft" disabled={hintsShown >= q.hints.length} onClick={() => setHintsShown(hintsShown + 1)}>
                  Gợi ý {hintsShown}/{q.hints.length}
                </button>
              )}
              <button type="button" className="btn btn-link" onClick={() => submit('')}>Em chưa biết</button>
            </>
          )}
          {phase === 'feedback' && (
            <button type="button" className={`btn ${finalCorrect ? 'btn-primary' : 'btn-danger'}`} autoFocus
              onClick={() => onNext({ skipped: false, firstTryCorrect: firstOk.current === true, firstTryClean, finalCorrect })}>{nextLabel}</button>
          )}
        </div>
      </div>
    </div>
  );
}
