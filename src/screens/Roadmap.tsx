import { useApp } from '../state/AppContext';
import { PHASES, WEEKS, getUnit, type Phase } from '../data/curriculum';
import { analyzePlacement, buildPath } from '../logic/placement';
import { lessonByUnit, lockReason, WEEKLY_PASS_RATIO } from '../logic/lessonFlow';
import { Card, Note } from '../components/ui';
import type { UnitId } from '../types';

export function Roadmap() {
  const { data, go } = useApp();
  const done = data.placement.status === 'done';
  const analysis = analyzePlacement(data.attempts);
  const path = done ? buildPath(analysis) : [];
  const tag = (u: UnitId): { text: string; cls: string } | null => {
    if (!done) return null;
    const p = path.find((x) => x.unit === u);
    if (p) return p.kind === 'learn' ? { text: 'Ưu tiên học', cls: 'chip-needs-work' } : { text: 'Cần xác nhận', cls: 'chip-learning' };
    if (analysis.units[u].status === 'likely-known') return { text: 'Có vẻ đã biết – có thể rút gọn', cls: 'chip-secure' };
    return null;
  };
  const weekPassed = (w: number): boolean => {
    const list = data.weeklyTests[String(w)] ?? [];
    const last = list[list.length - 1];
    return !!last && last.total > 0 && last.score / last.total >= WEEKLY_PASS_RATIO;
  };

  return (
    <div className="stack">
      <h1>Lộ trình 12 tuần</h1>
      <Note kind="info">Đây là lộ trình <b>dự kiến</b>, không phải cam kết rằng mọi em sẽ lấy lại toàn bộ kiến thức trong 12 tuần. Thứ tự được điều chỉnh theo kết quả đầu vào và tiến bộ thực tế của từng em.</Note>
      {!done && (
        <Note kind="warn">Em chưa làm xong bài kiểm tra đầu vào nên lộ trình đang hiển thị theo thứ tự chuẩn. <button className="btn btn-link" onClick={() => go({ name: 'placement' })}>Làm bài kiểm tra đầu vào</button></Note>
      )}
      {done && path.length > 0 && (
        <Card>
          <h2>Thứ tự ưu tiên của em</h2>
          <ol className="path">{path.map((p) => <li key={p.unit}><b>{getUnit(p.unit).name}</b> <span className="muted small">– {p.kind === 'learn' ? 'học lại' : 'xác nhận'}</span></li>)}</ol>
        </Card>
      )}

      {PHASES.map((ph) => <PhaseBlock key={ph.id} ph={ph} />)}
    </div>
  );

  function PhaseBlock({ ph }: { ph: Phase }) {
    const weeks = WEEKS.filter((w) => w.phase === ph.id);
    const testable = weeks.filter((w) => w.week >= 2);
    const passedCount = testable.filter((w) => weekPassed(w.week)).length;
    return (
      <section className="phase">
        <h2>Giai đoạn {ph.id}: {ph.name}</h2>
        <p className="muted">{ph.description}</p>
        <p className="small"><b>Điều kiện sang giai đoạn tiếp theo:</b> {ph.exit}</p>
        {testable.length > 0 && <p className="small muted">Tiến độ: {passedCount}/{testable.length} bài kiểm tra tuần đã đạt.</p>}
        {weeks.map((w) => (
          <details key={w.week} className="acc" open={false}>
            <summary><b>Tuần {w.week}</b> – {w.title} {weekPassed(w.week) && <span className="chip chip-secure">Đã đạt kiểm tra tuần</span>}</summary>
            <h3>Mục tiêu kiến thức</h3>
            <ul>{w.goals.map((g) => <li key={g}>{g}</li>)}</ul>
            <h3>Danh sách bài học</h3>
            {w.units.length === 0 ? <p>Bài đánh giá đầu vào.</p> : (
              <ul className="plain">
                {w.units.map((u) => {
                  const l = lessonByUnit(u);
                  const t = tag(u);
                  const lock = l ? lockReason(data, l) : null;
                  return (
                    <li key={u}>
                      <b>{getUnit(u).name}</b> {t && <span className={`chip ${t.cls}`}>{t.text}</span>}
                      <div className="small">
                        {l ? (
                          <>
                            Bài “{l.title}” · {l.minutes} phút · {data.lessons[l.id]?.passed ? '✅ đã hoàn thành' : lock ? '🔒 cần học bài nền trước' : 'chưa học'}
                            <div>
                              <button className="btn btn-soft" disabled={!!lock} onClick={() => go({ name: 'lesson', id: l.id, preview: false })}>{data.lessons[l.id] ? 'Học lại' : 'Mở bài học'}</button>
                              {lock && <span className="muted small"> {lock}</span>}
                            </div>
                          </>
                        ) : <span className="muted">Chưa có nội dung bài học trong bản thử nghiệm.</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <h3>Từ vựng trọng tâm</h3>
            <p lang="en" className="vocabline">{w.vocabTheme.map((v) => `${v.en} (${v.vi})`).join(' · ')}</p>
            <h3>Cấu trúc ngữ pháp</h3>
            <ul>{w.structures.map((g) => <li key={g}>{g}</li>)}</ul>
            <h3>Bài luyện tập</h3>
            <ul>{w.practice.map((g) => <li key={g}>{g}</li>)}</ul>
            <h3>Bài kiểm tra cuối tuần</h3>
            <p>{w.weeklyTest}</p>
            {w.week >= 2 && <button className="btn btn-primary" onClick={() => go({ name: 'weekly', week: w.week })}>Làm bài kiểm tra tuần {w.week}</button>}
            <h3>Điều kiện chuyển tiếp</h3>
            <p>{w.advance}</p>
            <h3>Nếu chưa đạt</h3>
            <p>{w.retry}</p>
          </details>
        ))}
      </section>
    );
  }
}
