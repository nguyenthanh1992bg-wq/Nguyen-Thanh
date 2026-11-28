import { useState } from 'react';
import { useApp } from '../state/AppContext';
import { buildReport, reportToText, type UnitLine } from '../logic/report';
import { STATUS_LABEL } from '../logic/progress';
import { Card, Note, ProgressBar, fmtDate } from '../components/ui';
import { WEEKS, phaseOfWeek } from '../data/curriculum';
import { dailyStats, dayComment, dayStars, recentWeeks, WEEK_GOAL_DAYS, WEEK_GOAL_QUESTIONS } from '../logic/daily';

export function ParentReport() {
  const { data, go, now } = useApp();
  const t = now();
  const r = buildReport(data, t);
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(reportToText(r));
      setCopied('ok');
    } catch {
      setCopied('fail');
    }
  }

  const list = (xs: UnitLine[], empty: string) => xs.length === 0
    ? <p className="muted small">{empty}</p>
    : <ul className="plain">{xs.map((x) => <li key={x.unit}>{x.name} <span className="muted small">· {STATUS_LABEL[x.status]}</span></li>)}</ul>;

  const empty = data.attempts.length === 0;
  const maxDay = Math.max(1, ...r.habit.last7.map((d) => d.answered));

  return (
    <div className="stack report">
      <h1>Báo cáo dành cho phụ huynh</h1>
      {r.demo && <Note kind="demo"><b>Dữ liệu minh họa</b> – không phải kết quả của học sinh thật.</Note>}
      <p className="muted small">Học sinh: <b>{r.nickname || 'chưa đặt tên'}</b> · Ngày lập báo cáo: {fmtDate(r.generatedAt)}{r.weekEstimate && <> · Khoảng tuần {r.weekEstimate.week}/12 kể từ khi bắt đầu (giai đoạn {r.weekEstimate.phase})</>}</p>

      {new Date(t).getDate() >= 25 && <Note kind="warn"><b>Sắp hết tháng.</b> Xem <button className="btn btn-link" onClick={() => go({ name: 'quality' })}>đánh giá chất lượng tháng này</button> và gửi số liệu để nâng cấp ứng dụng.</Note>}

      {empty && <Note kind="info">Chưa có dữ liệu học tập. Báo cáo sẽ có số liệu sau khi học sinh làm bài kiểm tra đầu vào hoặc bài học đầu tiên.</Note>}

      <Card>
        <h2>Tóm tắt</h2>
        <ul className="plain">
          <li>📘 Bài đã hoàn thành: <b>{r.lessonsPassed}/{r.lessonsAvailable}</b> bài (bản thử nghiệm chỉ có {r.lessonsAvailable} bài mẫu)</li>
          <li>⏱️ Thời gian học ước tính: <b>{r.time.totalMin} phút</b> (7 ngày gần nhất: {r.time.last7Min} phút · {r.time.activeDays} ngày có học)</li>
          <li>📝 Lỗi sai: <b>{r.mistakes.open}</b> chưa khắc phục · <b>{r.mistakes.fixed}</b> đã khắc phục</li>
        </ul>
        <ProgressBar value={r.lessonsPassed} max={r.lessonsAvailable} label="Bài đã hoàn thành" />
        {r.mistakes.repeatedUnits.length > 0 && <p className="small">⚠️ Phần em đang sai lặp lại: {r.mistakes.repeatedUnits.join('; ')}. Hệ thống đã tạm không tăng độ khó ở phần này và dùng cách giải thích đơn giản hơn.</p>}
      </Card>

      <Card>
        <h2>Thói quen học hằng ngày</h2>
        <p>🔥 <b>{r.habit.streak}</b> ngày liên tiếp · Hôm nay <b>{r.habit.todayAnswered}/{r.habit.goal}</b> câu · Cấp <b>{r.habit.levelName}</b> ({r.habit.totalPoints} điểm)</p>
        <div className="week" role="img" aria-label="Số câu làm trong 7 ngày gần nhất">
          {r.habit.last7.map((d, i) => (
            <div key={i} className="week-col">
              <div className="week-bar" style={{ height: `${Math.round((d.answered / maxDay) * 100)}%` }} title={`${d.answered} câu`} />
              <span className="small muted">{d.label}</span>
            </div>
          ))}
        </div>
        {r.rewards.redeemed.length > 0 && (
          <>
            <h3>Phần thưởng em đã đổi</h3>
            <ul className="plain">{r.rewards.redeemed.map((x) => <li key={x.ts}>🎁 {x.name} ({x.cost} xu) · {fmtDate(x.ts)} · {x.done ? '✅ đã trao' : '⏳ chờ phụ huynh trao'}</li>)}</ul>
            <button className="btn btn-soft" onClick={() => go({ name: 'play', tab: 'rewards' })}>Quản lý phần thưởng</button>
          </>
        )}
      </Card>

      <Card>
        <h2>Đánh giá theo ngày và tuần</h2>
        {(() => {
          const day = dailyStats(data.attempts, t).today;
          const weeks = recentWeeks(data.attempts, t, 4);
          return (
            <>
              <p><b>Hôm nay:</b> {'⭐'.repeat(dayStars(day))}{'☆'.repeat(3 - dayStars(day))} – {dayComment(day)}</p>
              <div className="tablewrap"><table className="table">
                <thead><tr><th>Tuần bắt đầu</th><th>Ngày học</th><th>Số câu</th><th>Đúng</th><th>Đánh giá</th></tr></thead>
                <tbody>{[...weeks].reverse().map((w) => (
                  <tr key={w.key}><td>{w.key.slice(8)}/{w.key.slice(5, 7)}</td><td>{w.daysActive}/{WEEK_GOAL_DAYS}</td><td>{w.answered}/{WEEK_GOAL_QUESTIONS}</td><td>{w.accuracy === null ? '–' : `${w.accuracy}%`}</td><td>{w.grade}</td></tr>
                ))}</tbody>
              </table></div>
              <p className="small muted">Mục tiêu ngày: {day.answered}/{10} câu. Mục tiêu tuần: học {WEEK_GOAL_DAYS} ngày và làm {WEEK_GOAL_QUESTIONS} câu. Nhắc học: {data.settings.reminderOn ? `bật lúc ${data.settings.reminderTime}` : 'đang tắt'}.</p>
            </>
          );
        })()}
      </Card>

      <Card>
        <h2>Kiến thức đã học và còn yếu</h2>
        <h3>🌟 Khá vững / thành thạo</h3>
        {list(r.strong, 'Chưa có nhóm nào đủ bằng chứng để xếp vào mức vững. “Thành thạo” cần làm đúng nhiều câu khác nhau và nhớ lại sau ít nhất 3 ngày.')}
        <h3>🌱 Đang tiến bộ / có vẻ đã biết (cần xác nhận)</h3>
        {list(r.progressing, 'Chưa có.')}
        <h3>🧩 Cần học kỹ</h3>
        {list(r.weak, 'Chưa phát hiện nhóm nào cần học kỹ theo dữ liệu hiện có.')}
        {r.unknown.length > 0 && (<><h3>❔ Chưa đủ dữ liệu để kết luận</h3><p className="small muted">{r.unknown.map((x) => x.name).join('; ')}</p></>)}
      </Card>

      <Card>
        <h2>Điểm kiểm tra</h2>
        {r.placement ? (
          <>
            <p>Kiểm tra đầu vào: <b>{r.placement.correct}/{r.placement.answered}</b> câu đúng (đã làm {r.placement.answered}/{r.placement.total} câu){!r.placementSufficient && <> – <b>chưa đủ dữ liệu</b> để lập hồ sơ chắc chắn</>}.</p>
            {r.placement.bySkill.map((s) => (
              <div key={s.skill} className="skillrow"><span>{s.label}</span><span className="muted small">{s.correct}/{s.answered}</span><ProgressBar value={s.correct} max={Math.max(1, s.answered)} label={s.label} /></div>
            ))}
          </>
        ) : <p className="muted">Chưa làm bài kiểm tra đầu vào.</p>}
        <h3>Kiểm tra cuối bài</h3>
        <ul className="plain">{r.lessons.filter((l) => l.passed || l.bestScore > 0).map((l) => <li key={l.title}>{l.title}: {l.bestScore}/{l.quizTotal} {l.passed ? '✅ đạt' : '🔁 chưa đạt, đang học lại'}</li>)}</ul>
        {r.lessons.every((l) => !l.passed && l.bestScore === 0) && <p className="muted small">Chưa có bài kiểm tra cuối bài nào.</p>}
        <h3>Kiểm tra tuần</h3>
        {r.weekly.length === 0 ? <p className="muted small">Chưa có.</p> : <ul className="plain">{r.weekly.map((w) => <li key={w.week}>Tuần {w.week} ({w.title}): {w.score}/{w.total} {w.passed ? '✅ đạt' : '🔁 cần ôn thêm'}</li>)}</ul>}
      </Card>

      <Card>
        <h2>Mức độ ghi nhớ</h2>
        <ul className="plain">
          <li>Nội dung đang theo dõi ôn tập: <b>{r.retention.cards}</b> (đã nhớ qua từ 2 lần ôn: <b>{r.retention.mature}</b>)</li>
          <li>Độ chính xác khi ôn lại (30 ngày): {r.retention.reviewAccuracy === null ? <span className="muted">chưa đủ dữ liệu (cần ít nhất 5 lần ôn, hiện có {r.retention.reviewCount})</span> : <b>{r.retention.reviewAccuracy}%</b>}</li>
        </ul>
      </Card>

      <Card>
        <h2>Kế hoạch học tiếp theo</h2>
        <ul>{r.nextPlan.map((p) => <li key={p}>{p}</li>)}</ul>
        <p className="small muted">Lộ trình 12 tuần là dự kiến ({WEEKS.length} tuần, hiện ở giai đoạn {r.weekEstimate ? phaseOfWeek(r.weekEstimate.week).name : 'chưa bắt đầu'}), không phải cam kết kết quả.</p>
      </Card>

      <Note kind="info">Báo cáo dựa trên một số lượng câu hỏi hạn chế nên chỉ mang tính tham khảo. Hệ thống không gắn nhãn tiêu cực cho học sinh; mục đích là chọn bài phù hợp để em tiến bộ từng bước. Ứng dụng chưa đánh giá được phát âm.</Note>

      <div className="row">
        <button className="btn btn-primary" onClick={() => void copy()}>Sao chép báo cáo</button>
        <button className="btn btn-soft" onClick={() => go({ name: 'quality' })}>Đánh giá chất lượng tháng</button>
        <button className="btn btn-soft" onClick={() => go({ name: 'content' })}>Quản lý nội dung</button>
        <button className="btn btn-link" onClick={() => go({ name: 'home' })}>Về trang chủ</button>
      </div>
      {copied === 'ok' && <p role="status" className="small">✅ Đã sao chép nội dung báo cáo.</p>}
      {copied === 'fail' && <p role="status" className="small">Không sao chép tự động được trên thiết bị này. Hãy chọn và chép nội dung bằng tay.</p>}
    </div>
  );
}
