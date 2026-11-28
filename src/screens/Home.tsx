import { useState } from 'react';
import { useApp } from '../state/AppContext';
import { LESSONS } from '../data/lessons';
import { UNITS, getUnit } from '../data/curriculum';
import { nextActivity, lessonByUnit } from '../logic/lessonFlow';
import { mistakeLog, unitStatus } from '../logic/progress';
import { dueCards } from '../logic/srs';
import { makeDemoData } from '../state/simulate';
import { Card, Note, ProgressBar } from '../components/ui';
import { DailyGoal, PlayerBar } from '../components/Rewards';
import { LearningPath } from '../components/LearningPath';

export function Home() {
  const { data, dispatch, go, now, reset, syncState } = useApp();
  const t = now();
  const next = nextActivity(data, t);
  const due = dueCards(data.srs, t).length;
  const open = mistakeLog(data.attempts).filter((m) => !m.resolved);
  const passed = LESSONS.filter((l) => data.lessons[l.id]?.passed).length;
  const [name, setName] = useState(data.nickname);
  const [confirming, setConfirming] = useState<'demo' | 'clear' | null>(null);

  const weakUnits = UNITS.filter((u) => unitStatus(data.attempts, u.id) === 'needs-work').slice(0, 3);

  function loadDemo() {
    if (data.attempts.length > 0 && confirming !== 'demo') { setConfirming('demo'); return; }
    setConfirming(null);
    dispatch({ type: 'replace', data: makeDemoData(now()) });
  }
  async function clearAll() {
    if (confirming !== 'clear') { setConfirming('clear'); return; }
    setConfirming(null);
    await reset();
  }

  return (
    <div className="stack">
      {data.demo && <Note kind="demo"><b>Đang xem hồ sơ minh họa.</b> Đây không phải dữ liệu của em. Bấm “Xóa dữ liệu” ở cuối trang để bắt đầu thật.</Note>}

      <Card><PlayerBar /></Card>

      <Card className="hero">
        <h1>Bài học hôm nay</h1>
        {next.kind === 'placement' && (
          <>
            <p>Trước khi học, mình làm một bài kiểm tra ngắn để biết em đã biết gì và cần ôn gì. Không tính điểm, không sao nếu em chưa biết câu nào – cứ chọn “Em chưa biết”.</p>
            {data.placement.status === 'not-started' && (
              <label className="field">Em muốn được gọi là gì? (không bắt buộc)
                <input id="nickname" className="input" value={name} maxLength={30} placeholder="Ví dụ: An"
                  onChange={(e) => setName(e.target.value)} onBlur={() => dispatch({ type: 'nickname', name: name.trim() })} />
              </label>
            )}
            <button className="btn btn-primary btn-lg" onClick={() => { dispatch({ type: 'nickname', name: name.trim() }); go({ name: 'placement' }); }}>
              {next.resume ? 'Làm tiếp bài kiểm tra đầu vào' : 'Bắt đầu kiểm tra đầu vào'}
            </button>
          </>
        )}
        {next.kind === 'lesson' && (
          <>
            <h2>{next.lesson.title}</h2>
            <p>{next.lesson.objective}</p>
            <p className="muted">Khoảng {next.lesson.minutes} phút · {next.why}</p>
            <button className="btn btn-primary btn-lg" onClick={() => go({ name: 'lesson', id: next.lesson.id, preview: false })}>
              {data.lessons[next.lesson.id] ? 'Học lại bài này' : 'Bắt đầu học'}
            </button>
          </>
        )}
        {next.kind === 'review' && (
          <>
            <p>Em đã hoàn thành các bài hiện có. Hôm nay mình ôn lại những phần đến hạn để nhớ lâu hơn.</p>
            <button className="btn btn-primary btn-lg" onClick={() => go({ name: 'review', mode: 'due' })}>Ôn {next.count} nội dung</button>
          </>
        )}
        {next.kind === 'all-done' && <p>🎉 Em đã hoàn thành tất cả bài có trong bản thử nghiệm và không còn nội dung nào đến hạn ôn. Em có thể chơi game để ôn từ vựng nhé!</p>}
      </Card>

      <Card><LearningPath /></Card>

      <Card>
        <h2>Mục tiêu hôm nay</h2>
        <DailyGoal />
      </Card>

      <Card>
        <h2>Tiến độ học</h2>
        <p><b>{passed}</b>/{LESSONS.length} bài đã hoàn thành <span className="muted">(bản thử nghiệm có {LESSONS.length} bài mẫu)</span></p>
        <ProgressBar value={passed} max={LESSONS.length} label="Số bài hoàn thành" />
        {data.placement.status === 'done' && (
          <p><button className="btn btn-link" onClick={() => go({ name: 'placement' })}>Xem hồ sơ năng lực từ bài đầu vào</button></p>
        )}
      </Card>

      <Card>
        <h2>Kiến thức cần ôn</h2>
        <ul className="plain">
          <li>🔁 <b>{due}</b> nội dung đến hạn ôn</li>
          <li>📝 <b>{open.length}</b> lỗi sai chưa khắc phục</li>
          {weakUnits.length > 0 && <li>🌱 Đang cần luyện thêm: {weakUnits.map((u) => getUnit(u.id).name).join('; ')}{weakUnits.some((u) => lessonByUnit(u.id)) ? '' : ' (chưa có bài trong bản thử nghiệm)'}</li>}
        </ul>
        <button className="btn btn-soft" onClick={() => go({ name: 'review' })}>Mở trang ôn tập</button>
      </Card>

      <Card className="muted-card">
        <h2>Dữ liệu</h2>
        <p className="small">{syncState === 'local'
          ? 'Dữ liệu lưu trong trình duyệt của thiết bị này, không đồng bộ giữa các máy.'
          : syncState === 'saving' ? '☁️ Đang đồng bộ với tài khoản…'
            : syncState === 'saved' ? '☁️ Đã đồng bộ với tài khoản của bạn: mở trên thiết bị nào cũng thấy cùng tiến độ.'
              : '⚠️ Chưa đồng bộ được. Dữ liệu vẫn được giữ trên thiết bị này; thử lại khi có mạng.'}</p>
        {confirming && (
          <Note kind="warn">
            {confirming === 'demo' ? 'Hồ sơ minh họa sẽ thay thế dữ liệu hiện có.' : 'Xóa toàn bộ dữ liệu học tập? Không thể hoàn tác.'}
            <div className="row">
              <button className="btn btn-primary" onClick={() => (confirming === 'demo' ? loadDemo() : void clearAll())}>Đồng ý</button>
              <button className="btn btn-soft" onClick={() => setConfirming(null)}>Hủy</button>
            </div>
          </Note>
        )}
        <div className="row">
          <button className="btn btn-soft" onClick={loadDemo}>Xem hồ sơ minh họa</button>
          <button className="btn btn-link" onClick={() => void clearAll()}>Xóa dữ liệu</button>
        </div>
      </Card>
    </div>
  );
}
