import { useMemo, useState } from 'react';
import { useApp } from '../state/AppContext';
import { PLACEMENT_IDS, PLACEMENT_MIN_ANSWERED, getQuestion } from '../data/questionBank';
import { UNITS, getUnit } from '../data/curriculum';
import { analyzePlacement, buildPath, followUpQuestionIds, placementAttempts, type DiagStatus } from '../logic/placement';
import { lessonByUnit } from '../logic/lessonFlow';
import { Sequence, type SeqItem } from '../components/Sequence';
import { Card, Note, ProgressBar, fmtMin } from '../components/ui';
import type { Attempt, Context } from '../types';

type View = 'intro' | 'part' | 'break' | 'summary';

const STATUS_TEXT: Record<DiagStatus, string> = {
  'likely-known': 'Em làm tốt',
  uncertain: 'Cần xác nhận thêm',
  insufficient: 'Chưa đủ dữ liệu',
  'no-evidence': 'Chưa làm',
  gap: 'Mình sẽ học cùng nhau',
};

export function Placement() {
  const { data, dispatch, go, now } = useApp();
  const analysis = useMemo(() => analyzePlacement(data.attempts), [data.attempts]);
  const answeredIds = useMemo(() => new Set(placementAttempts(data.attempts).map((a) => a.qId)), [data.attempts]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [part, setPart] = useState<{ ids: string[]; extra: boolean; n: number } | null>(null);
  const [view, setView] = useState<View>(data.placement.status === 'done' ? 'summary' : 'intro');

  const pendingMain = PLACEMENT_IDS.filter((id) => !answeredIds.has(id) && !skipped.includes(id));
  const follow = followUpQuestionIds(data.attempts, analysis);

  /** Đóng băng danh sách câu của một phần để việc trả lời không làm đổi chuỗi câu đang làm. */
  function enterPart(ids: string[], extra: boolean) {
    setPart({ ids, extra, n: (part?.n ?? 0) + 1 });
    setView('part');
  }
  function startMain() {
    const l1 = pendingMain.filter((id) => getQuestion(id).level === 1);
    enterPart(l1.length > 0 ? l1 : pendingMain, false);
  }

  function onAttempt(item: SeqItem, r: { answer: string; correct: boolean; timeMs: number; hints: number; retry: boolean }) {
    const q = item.q;
    const ctx: Context = part?.extra ? 'placement-extra' : 'placement';
    const a: Attempt = {
      id: `${now()}-${q.id}-${Math.random().toString(36).slice(2, 7)}`, qId: q.id, unit: q.unit, skill: q.skill, level: q.level,
      correct: r.correct, answer: r.answer, timeMs: r.timeMs, ts: now(), context: ctx, hints: r.hints, retry: r.retry,
    };
    dispatch({ type: 'attempt', attempt: a });
  }

  function onFinish(results: { item: SeqItem; skipped: boolean }[]) {
    const sk = results.filter((r) => r.skipped).map((r) => r.item.q.id);
    const allSkipped = [...skipped, ...sk];
    if (sk.length) setSkipped(allSkipped);
    if (part?.extra) { setView('summary'); return; }
    const wasPart1 = (part?.ids ?? []).every((id) => getQuestion(id).level === 1);
    const l2 = PLACEMENT_IDS.filter((id) => getQuestion(id).level === 2 && !answeredIds.has(id) && !allSkipped.includes(id));
    if (wasPart1 && l2.length > 0) { setView('break'); return; }
    dispatch({ type: 'placement-finish', ts: now() });
    setView('summary');
  }

  function start() {
    dispatch({ type: 'placement-start', ts: now() });
    if (pendingMain.length === 0) { dispatch({ type: 'placement-finish', ts: now() }); setView('summary'); return; }
    startMain();
  }

  if (view === 'intro') {
    const resume = data.placement.status === 'in-progress' && answeredIds.size > 0;
    return (
      <div className="stack">
        <FlowBar title="Kiểm tra đầu vào" onExit={() => go({ name: 'home' })} />
        <Card>
          <h1>Mình cùng xem em đã biết gì nhé</h1>
          <ul className="plain">
            <li>Có 40 câu, chia làm 2 phần, khoảng 20–25 phút. Em có thể dừng và làm tiếp lúc khác.</li>
            <li>Câu nào chưa biết, em bấm <b>“Em chưa biết”</b> – đừng đoán bừa, vì như vậy giúp mình hiểu em rõ hơn.</li>
            <li>Đây không phải bài thi lấy điểm. Kết quả chỉ dùng để chọn bài học phù hợp cho em.</li>
            <li>Một bài kiểm tra ngắn chưa đủ để kết luận mọi thứ, nên nếu cần mình sẽ hỏi thêm vài câu.</li>
            <li>Có 2 câu nghe: thiết bị sẽ đọc to bằng giọng tiếng Anh. Nếu không nghe được, em có thể bỏ qua.</li>
          </ul>
          {resume && <p className="muted">Em đã làm {answeredIds.size}/{PLACEMENT_IDS.length} câu. Mình làm tiếp nhé.</p>}
          <button className="btn btn-primary btn-lg" onClick={start}>{resume ? 'Làm tiếp' : 'Bắt đầu'}</button>
        </Card>
      </div>
    );
  }

  if (view === 'part' && part) {
    const first = getQuestion(part.ids[0]);
    const title = part.extra ? 'Bài đánh giá bổ sung' : first.level === 1 ? 'Phần 1: Kiến thức nền tảng' : 'Phần 2: Vận dụng';
    return (
      <div className="stack">
        <FlowBar title={title} onExit={() => go({ name: 'home' })} exitLabel="Lưu và nghỉ" />
        <Card>
          <Sequence key={part.n} items={part.ids.map((id) => ({ q: getQuestion(id) }))} mode="placement" onAttempt={onAttempt} onFinish={onFinish} lastLabel="Hoàn thành" />
        </Card>
      </div>
    );
  }

  if (view === 'break') {
    return (
      <div className="stack">
        <FlowBar title="Nghỉ một chút" onExit={() => go({ name: 'home' })} exitLabel="Lưu và nghỉ" />
        <Card>
          <h1>Em đã xong phần 1 🎉</h1>
          <p>Em làm rất tốt khi đã kiên trì. Phần 2 gồm các câu vận dụng hơn một chút. Em có thể nghỉ rồi làm tiếp bất cứ lúc nào.</p>
          <div className="row">
            <button className="btn btn-primary btn-lg" onClick={startMain}>Làm phần 2</button>
            <button className="btn btn-soft" onClick={() => go({ name: 'home' })}>Để lúc khác</button>
          </div>
        </Card>
      </div>
    );
  }

  // ===== Tổng kết / hồ sơ năng lực =====
  const path = buildPath(analysis);
  const groups: { title: string; hint: string; ids: typeof UNITS }[] = [
    { title: '✅ Em làm tốt', hint: 'Sẽ được kiểm tra lại sau vài ngày để chắc chắn đã nhớ lâu.', ids: UNITS.filter((u) => analysis.units[u.id].status === 'likely-known') },
    { title: '🔍 Cần xác nhận thêm', hint: 'Kết quả chưa ổn định hoặc còn ít câu, nên chưa kết luận được.', ids: UNITS.filter((u) => ['uncertain', 'insufficient', 'no-evidence'].includes(analysis.units[u.id].status)) },
    { title: '🌱 Mình sẽ học cùng nhau', hint: 'Học lại từng bước nhỏ, có ví dụ và luyện tập.', ids: UNITS.filter((u) => analysis.units[u.id].status === 'gap') },
  ];
  const needMore = !analysis.sufficient;
  const remaining = PLACEMENT_IDS.filter((id) => !answeredIds.has(id));

  return (
    <div className="stack">
      <FlowBar title="Hồ sơ năng lực" onExit={() => go({ name: 'home' })} exitLabel="Về trang chủ" />
      {data.demo && <Note kind="demo">Dữ liệu minh họa.</Note>}
      <Card>
        <h1>Cảm ơn em đã hoàn thành! 👏</h1>
        <p>Em trả lời đúng <b>{analysis.correct}</b>/<b>{analysis.answered}</b> câu đã làm (thời gian khoảng {fmtMin(analysis.durationMs)}). Con số này chỉ là điểm xuất phát, không phải đánh giá về em.</p>
        <ProgressBar value={analysis.answered} max={analysis.totalQuestions} label="Số câu đã làm" />
        {needMore && (
          <Note kind="warn">
            Mới làm {analysis.answered}/{analysis.totalQuestions} câu (cần ít nhất {PLACEMENT_MIN_ANSWERED} câu) nên <b>chưa đủ dữ liệu</b> để lập hồ sơ chắc chắn. Mình nên làm thêm.
            {remaining.length > 0 && (
              <p><button className="btn btn-primary" onClick={() => { setSkipped([]); enterPart(remaining, false); }}>Làm tiếp {remaining.length} câu còn lại</button></p>
            )}
          </Note>
        )}
      </Card>

      <Card>
        <h2>Theo từng kỹ năng</h2>
        {analysis.bySkill.map((s) => (
          <div key={s.skill} className="skillrow">
            <span>{s.label}</span>
            <span className="muted small">{s.correct}/{s.answered} câu đúng</span>
            <ProgressBar value={s.correct} max={Math.max(1, s.answered)} label={s.label} />
          </div>
        ))}
      </Card>

      {groups.map((g) => g.ids.length > 0 && (
        <Card key={g.title}>
          <h2>{g.title}</h2>
          <p className="muted small">{g.hint}</p>
          <ul className="plain">
            {g.ids.map((u) => {
              const d = analysis.units[u.id];
              return <li key={u.id}><b>{u.name}</b> <span className="muted small">({STATUS_TEXT[d.status]} · {d.correct}/{d.answered})</span><br /><span className="small">{d.note}</span></li>;
            })}
          </ul>
        </Card>
      ))}

      {analysis.needFollowUp.length > 0 && (
        <Card>
          <h2>Bài đánh giá bổ sung</h2>
          {follow.ids.length > 0 ? (
            <>
              <p>Có {analysis.needFollowUp.length} nhóm kiến thức chưa đủ bằng chứng. Mình có thêm {follow.ids.length} câu để hỏi thêm.</p>
              <button className="btn btn-primary" onClick={() => enterPart(follow.ids, true)}>Làm {follow.ids.length} câu bổ sung</button>
            </>
          ) : <p>Chưa có câu bổ sung cho các nhóm này trong bản thử nghiệm.</p>}
          {follow.unitsWithoutExtra.length > 0 && (
            <p className="muted small">Chưa có câu bổ sung cho: {follow.unitsWithoutExtra.map((u) => getUnit(u).name).join('; ')}. Các nhóm này sẽ được xác nhận khi có bài học tương ứng.</p>
          )}
        </Card>
      )}

      <Card>
        <h2>Lộ trình đề xuất cho em</h2>
        {path.length === 0 ? <p>Chưa có nhóm nào cần học thêm theo dữ liệu hiện tại.</p> : (
          <ol className="path">
            {path.map((p) => {
              const l = lessonByUnit(p.unit);
              return (
                <li key={p.unit}>
                  <b>{getUnit(p.unit).name}</b> <span className="chip">{p.kind === 'learn' ? 'Học lại' : 'Xác nhận'}</span><br />
                  <span className="small muted">{p.reason}{l ? '' : ' · chưa có bài trong bản thử nghiệm'}</span>
                  {l && <div><button className="btn btn-link" onClick={() => go({ name: 'lesson', id: l.id, preview: false })}>Mở bài “{l.title}”</button></div>}
                </li>
              );
            })}
          </ol>
        )}
        <div className="row">
          <button className="btn btn-soft" onClick={() => go({ name: 'roadmap' })}>Xem lộ trình 12 tuần</button>
          <button className="btn btn-soft" onClick={() => go({ name: 'report' })}>Báo cáo phụ huynh</button>
        </div>
      </Card>

      <ReviewAnswers attempts={placementAttempts(data.attempts)} />
    </div>
  );
}

function ReviewAnswers({ attempts }: { attempts: Attempt[] }) {
  if (attempts.length === 0) return null;
  const sorted = [...attempts].sort((a, b) => PLACEMENT_IDS.indexOf(a.qId) - PLACEMENT_IDS.indexOf(b.qId));
  return (
    <Card>
      <details>
        <summary><b>Xem lại đáp án ({sorted.length} câu)</b></summary>
        <p className="muted small">Mở từng câu để xem lời giải. Câu đã sai sẽ được ôn lại sau khi em học bài tương ứng.</p>
        {sorted.map((a) => {
          const q = getQuestion(a.qId);
          const g = q.commonMistakes.find((m) => m.answer.toLowerCase() === a.answer.toLowerCase());
          return (
            <details key={a.qId} className="acc">
              <summary>{a.correct ? '✅' : '❌'} <span lang="en">{q.prompt}</span></summary>
              <p><b>Đáp án:</b> <span lang="en">{q.answers[0]}</span>{!a.correct && <> · Em chọn: <span lang="en">{a.answer || '(chưa biết)'}</span></>}</p>
              {!a.correct && g && <p>{g.reason}</p>}
              <p>{q.explanation}</p>
            </details>
          );
        })}
      </details>
    </Card>
  );
}

export function FlowBar({ title, onExit, exitLabel = 'Thoát' }: { title: string; onExit: () => void; exitLabel?: string }) {
  return (
    <div className="flowbar">
      <strong>{title}</strong>
      <button className="btn btn-link" onClick={onExit}>{exitLabel}</button>
    </div>
  );
}
